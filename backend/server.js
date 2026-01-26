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
 * Helper function to generate a single image
 */
async function generateSingleImage(browser, template, elements, size, frontendUrlForRender) {
  const page = await browser.newPage();
  
  try {
    // LOG BROWSER ERRORS TO TERMINAL
    page.on('console', msg => console.log('🌐 BROWSER LOG:', msg.text()));
    page.on('pageerror', err => console.error('❌ BROWSER ERROR:', err.message));

    // Set viewport to the requested size
    await page.setViewport({ width: size.width, height: size.height });

    // Ensure the frontend URL has the protocol for Puppeteer
    const rendererUrl = frontendUrlForRender.startsWith('http') 
      ? `${frontendUrlForRender}/render-headless`
      : `https://${frontendUrlForRender}/render-headless`;
    
    console.log(`🌐 Navigating to: ${rendererUrl}`);
    
    await page.goto(rendererUrl, { waitUntil: 'networkidle0' });

    // WAIT FOR THE RENDER FUNCTION TO BE READY
    await page.waitForFunction(() => typeof window.renderDesign === 'function');

    console.log('🎨 Starting render process...');

    // Inject the design data into the headless page
    await page.evaluate((config, overwrites, w, h) => {
      window.renderDesign(config, overwrites, w, h);
    }, template.configuration, elements || {}, size.width, size.height);

    // Wait for the renderer to signal completion and provide the image
    console.log('⏳ Waiting for signal: window.renderComplete === true');
    await page.waitForFunction(() => window.renderComplete === true && window.renderedImage, { timeout: 20000 });
    
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
  } finally {
    await page.close();
  }
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
        
        // Process variations in parallel for better performance
        // Limit concurrency to avoid overwhelming the system (max 5 parallel)
        const MAX_CONCURRENT = 5;
        const variationPromises = [];
        
        for (let i = 0; i < variations.length; i++) {
          const variation = variations[i];
          const variationSizes = variation.sizes || sizes || [{ width: 1080, height: 1080 }];
          const variationElements = variation.elements || elements || {};
          
          // For each variation, generate all requested sizes
          for (const size of variationSizes) {
            const promise = generateSingleImage(browser, template, variationElements, size, frontendUrlForRender)
              .then(result => ({ ...result, variationIndex: i }))
              .catch(err => ({
                size: size,
                success: false,
                error: err.message,
                variationIndex: i
              }));
            
            variationPromises.push(promise);
            
            // Limit concurrent operations
            if (variationPromises.length >= MAX_CONCURRENT) {
              const results = await Promise.all(variationPromises);
              allResults.push(...results);
              variationPromises.length = 0; // Clear array
            }
          }
        }
        
        // Process remaining promises
        if (variationPromises.length > 0) {
          const results = await Promise.all(variationPromises);
          allResults.push(...results);
        }
        
        console.log(`✅ Batch generation complete: ${allResults.length} images generated`);
      } else {
        // SINGLE MODE: Backward compatible with existing API
        console.log('🔄 Single mode: Processing one set of elements...');
        const targetSizes = sizes || [{ width: 1080, height: 1080 }];
        
        for (const size of targetSizes) {
          const result = await generateSingleImage(browser, template, elements, size, frontendUrlForRender);
          allResults.push(result);
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
