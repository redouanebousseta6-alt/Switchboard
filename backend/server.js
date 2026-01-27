const express = require('express');
const puppeteer = require('puppeteer');
const cors = require('cors');
const bodyParser = require('body-parser');
const { templates } = require('./db');
const { uploadToS3 } = require('./s3-service');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Update CORS to allow requests from the frontend
// Handle both with and without protocol in FRONTEND_URL
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4200';
const frontendOrigin = frontendUrl.startsWith('http') 
  ? frontendUrl 
  : `https://${frontendUrl}`;

console.log('🌐 CORS configured for frontend:', frontendOrigin);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Allow the configured frontend URL
    if (origin === frontendOrigin || origin === frontendUrl || origin === `https://${frontendUrl}` || origin === `http://${frontendUrl}`) {
      return callback(null, true);
    }
    
    // Also allow localhost for development
    if (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
      return callback(null, true);
    }
    
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(bodyParser.json({ limit: '50mb' }));

// --- API ROUTES ---

/**
 * Sync endpoint:Design app sends current template here to "publish" it to the API
 */
app.post('/api/templates/sync', (req, res) => {
  try {
    const template = req.body;
    if (!template.id || !template.apiName) {
      return res.status(400).json({ success: false, error: 'Missing template data' });
    }
    templates.save(template);
    console.log(`✅ Template synced: ${template.apiName}`);
    res.json({ success: true, message: 'Template synced to API backend' });
  } catch (err) {
    console.error('❌ Sync Error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * List all available templates
 */
app.get('/api/templates', (req, res) => {
  try {
    const allTemplates = templates.getAll();
    res.json({ success: true, templates: allTemplates });
  } catch (err) {
    console.error('❌ Error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Get template details - helps debug API names
 */
app.get('/api/templates/:apiName', (req, res) => {
  try {
    const template = templates.getByApiName(req.params.apiName);
    if (!template) {
      return res.status(404).json({ success: false, error: 'Template not found' });
    }
    
    // Extract object names from the template
    const objects = template.configuration.objects || [];
    const elementNames = objects
      .filter(obj => !obj.isCanvasFrame && obj.name)
      .map(obj => ({
        name: obj.name,
        type: obj.type,
        hasText: !!obj.text,
        hasSrc: !!obj.src
      }));
    
    res.json({
      success: true,
      apiName: template.api_name,
      displayName: template.display_name,
      elements: elementNames
    });
  } catch (err) {
    console.error('❌ Error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Helper: create and initialize a Puppeteer page that is ready to render designs.
 * We navigate to /render-headless ONCE per page and reuse it for multiple renders.
 */
async function createRendererPage(browser, frontendUrlForRender) {
  const page = await browser.newPage();

  // LOG BROWSER ERRORS TO TERMINAL
  page.on('console', msg => console.log('🌐 BROWSER LOG:', msg.text()));
  page.on('pageerror', err => console.error('❌ BROWSER ERROR:', err.message));

  // Ensure the frontend URL has the protocol for Puppeteer
  const rendererUrl = frontendUrlForRender.startsWith('http') 
    ? `${frontendUrlForRender}/render-headless`
    : `https://${frontendUrlForRender}/render-headless`;
  
  console.log(`🌐 Navigating to: ${rendererUrl}`);
  
  // Set navigation timeout to 30 seconds
  await page.goto(rendererUrl, { 
    waitUntil: 'networkidle0',
    timeout: 30000 
  });

  // WAIT FOR THE RENDER FUNCTION TO BE READY
  await page.waitForFunction(() => typeof window.renderDesign === 'function');

  console.log('🎨 Renderer page ready');
  return page;
}

/**
 * Helper: render a single image on an already initialized page.
 * This function is safe to call many times on the same page.
 */
async function renderImageOnPage(page, template, elements, size) {
  // Set viewport to the requested size for this render
  await page.setViewport({ width: size.width, height: size.height });

  // Reset global flags before each render to avoid leaking state between runs
  await page.evaluate(() => {
    window.renderComplete = false;
    window.renderedImage = null;
  });

  console.log(`🎨 Starting render process for ${size.width}x${size.height}...`);

  // Inject the design data into the headless page
  await page.evaluate((config, overwrites, w, h) => {
    window.renderDesign(config, overwrites, w, h);
  }, template.configuration, elements || {}, size.width, size.height);

  // Wait for the renderer to signal completion and provide the image
  // Increased timeout to 60 seconds for batch operations and slow image loading
  console.log('⏳ Waiting for signal: window.renderComplete === true');
  const RENDER_TIMEOUT = parseInt(process.env.RENDER_TIMEOUT || '60000'); // Default 60 seconds
  await page.waitForFunction(() => window.renderComplete === true && window.renderedImage, { timeout: RENDER_TIMEOUT });
  
  console.log('📸 Retrieval complete, extracting image data...');
  const dataUrl = await page.evaluate(() => window.renderedImage);
  
  if (!dataUrl) {
    throw new Error('Failed to retrieve rendered image from canvas');
  }

  // Convert Base64 Data URL to Buffer
  const base64Data = dataUrl.replace(/^data:image\/png;base64,/, "");
  const screenshotBuffer = Buffer.from(base64Data, 'base64');
  
  // Upload to S3
  const s3Url = await uploadToS3(screenshotBuffer);

  return {
    size: { width: size.width, height: size.height },
    success: true,
    url: s3Url
  };
}

/**
 * Generate endpoint: The core Switchboard-style API
 * 
 * Supports two modes:
 * 1. Single generation (backward compatible):
 *    { template: "name", sizes: [...], elements: {...} }
 * 
 * 2. Batch generation (new):
 *    { template: "name", variations: [
 *      { sizes: [...], elements: {...} },
 *      { sizes: [...], elements: {...} },
 *      ...
 *    ]}
 * 
 * Batch mode allows generating 20+ images in one call by processing variations in parallel.
 * 
 * NOTE: Railway has a default HTTP timeout of 30 seconds. For large batches (>10 images),
 * consider processing in smaller batches or increasing Railway's timeout in settings.
 */
app.post('/api/v1/generate', async (req, res) => {
  const startTime = Date.now();
  const { template: apiName, sizes, elements, variations } = req.body;

  if (!apiName) {
    return res.status(400).json({ success: false, error: 'Template apiName is required' });
  }

  try {
    // 1. Get template from database
    const template = templates.getByApiName(apiName);
    if (!template) {
      return res.status(404).json({ success: false, error: `Template "${apiName}" not found` });
    }

    // 2. Launch Headless Browser (reused for all generations)
    const browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox', 
        '--disable-setuid-sandbox',
        '--disable-web-security', // BYPASS CORS: Allows loading images from any domain
        '--allow-file-access-from-files'
      ]
    });

    const frontendUrlForRender = process.env.FRONTEND_URL || 'http://localhost:4200';
    const allResults = [];

    try {
      // Check if this is batch mode (variations array) or single mode (backward compatible)
      if (variations && Array.isArray(variations)) {
        // BATCH MODE: Process multiple variations
        console.log(`🔄 Batch mode: Processing ${variations.length} variations...`);

        // Prepare flat list of jobs (variationIndex + size + elements)
        const jobs = [];
        for (let i = 0; i < variations.length; i++) {
          const variation = variations[i];
          const variationSizes = variation.sizes || sizes || [{ width: 1080, height: 1080 }];
          const variationElements = variation.elements || elements || {};
          for (const size of variationSizes) {
            jobs.push({
              variationIndex: i,
              size,
              elements: variationElements
            });
          }
        }

        // Process jobs in parallel using a small pool of reusable pages
        const MAX_CONCURRENT = parseInt(process.env.MAX_CONCURRENT_GENERATIONS || '3');
        const workerCount = Math.min(MAX_CONCURRENT, jobs.length);
        let jobIndex = 0;

        const workers = [];
        for (let w = 0; w < workerCount; w++) {
          const workerPromise = (async () => {
            const page = await createRendererPage(browser, frontendUrlForRender);
            try {
              // Each worker pulls jobs from the shared queue
              // until there are no more jobs left
              while (true) {
                const currentIndex = jobIndex++;
                if (currentIndex >= jobs.length) break;

                const job = jobs[currentIndex];
                try {
                  const result = await renderImageOnPage(page, template, job.elements, job.size);
                  allResults.push({ ...result, variationIndex: job.variationIndex });
                } catch (err) {
                  console.error(`❌ Error generating image for variation ${job.variationIndex}:`, err.message);
                  allResults.push({
                    size: job.size,
                    success: false,
                    error: err.message || 'Generation failed',
                    variationIndex: job.variationIndex
                  });
                }
              }
            } finally {
              await page.close();
            }
          })();
          workers.push(workerPromise);
        }

        await Promise.all(workers);

        console.log(`✅ Batch generation complete: ${allResults.length} images generated`);
      } else {
        // SINGLE MODE: Backward compatible with existing API
        console.log('🔄 Single mode: Processing one set of elements...');
        const targetSizes = sizes || [{ width: 1080, height: 1080 }];

        // Use a single reusable page for all sizes in this request
        const page = await createRendererPage(browser, frontendUrlForRender);
        try {
          for (const size of targetSizes) {
            const result = await renderImageOnPage(page, template, elements, size);
            allResults.push(result);
          }
        } finally {
          await page.close();
        }
      }
    } finally {
      await browser.close();
    }

    const duration = Date.now() - startTime;

    // 5. Return Switchboard-compatible response
    res.json({
      duration,
      usage: true,
      success: true,
      warnings: [],
      sizes: allResults,
      count: allResults.length
    });

  } catch (err) {
    console.error('❌ Generation Error:', err);
    let message = err.message || String(err);
    if (message.includes('credential') || message.includes('Credentials')) {
      message = 'R2 credentials invalid. Set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY in Railway (Backend Variables). Use Cloudflare R2 API token. See RAILWAY_CHECKLIST.md.';
    }
    res.status(500).json({
      success: false,
      error: message,
      duration: Date.now() - startTime
    });
  }
});

app.listen(port, () => {
  console.log(`🚀 Switchboard API Backend running at http://localhost:${port}`);
});
