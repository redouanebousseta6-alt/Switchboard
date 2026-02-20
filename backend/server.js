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

console.log('CORS configured for frontend:', frontendOrigin);

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

// =============================================================================
// PERSISTENT BROWSER POOL
// =============================================================================
// Instead of launching a new browser for every request (expensive, ~300-500MB),
// we keep ONE browser alive and reuse it. Pages are created and destroyed per job.
// =============================================================================

let browserInstance = null;
let browserLaunching = false;
let browserLaunchPromise = null;

const CHROME_ARGS = [
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-web-security',            // Bypass CORS for loading images from any domain
  '--allow-file-access-from-files',
  '--disable-dev-shm-usage',           // CRITICAL for Docker: uses /tmp instead of /dev/shm
  '--disable-gpu',                     // No GPU in containers
  '--disable-extensions',
  '--disable-background-networking',
  '--disable-background-timer-throttling',
  '--disable-backgrounding-occluded-windows',
  '--disable-breakpad',
  '--disable-component-update',
  '--disable-default-apps',
  '--disable-domain-reliability',
  '--disable-hang-monitor',
  '--disable-ipc-flooding-protection',
  '--disable-popup-blocking',
  '--disable-prompt-on-repost',
  '--disable-renderer-backgrounding',
  '--disable-sync',
  '--disable-translate',
  '--metrics-recording-only',
  '--no-first-run',
  '--safebrowsing-disable-auto-update',
  '--single-process',                  // Reduce memory by running in single process
  '--no-zygote',                       // Reduce memory on Linux containers
];

/**
 * Get or launch the persistent browser instance.
 * If the browser has crashed, it will be relaunched automatically.
 */
async function getBrowser() {
  // If browser exists and is connected, return it
  if (browserInstance && browserInstance.connected) {
    return browserInstance;
  }

  // If another call is already launching, wait for it
  if (browserLaunching && browserLaunchPromise) {
    return browserLaunchPromise;
  }

  // Launch a new browser
  browserLaunching = true;
  browserLaunchPromise = (async () => {
    try {
      console.log('[Browser] Launching persistent browser...');
      browserInstance = await puppeteer.launch({
        headless: 'new',
        args: CHROME_ARGS,
        protocolTimeout: 120000, // 2 min protocol timeout
      });

      // Auto-recover if browser disconnects
      browserInstance.on('disconnected', () => {
        console.warn('[Browser] Browser disconnected! Will relaunch on next request.');
        browserInstance = null;
      });

      console.log('[Browser] Persistent browser ready (PID:', browserInstance.process()?.pid, ')');
      return browserInstance;
    } catch (err) {
      console.error('[Browser] Failed to launch browser:', err.message);
      browserInstance = null;
      throw err;
    } finally {
      browserLaunching = false;
      browserLaunchPromise = null;
    }
  })();

  return browserLaunchPromise;
}

// =============================================================================
// REQUEST QUEUE
// =============================================================================
// Ensures only ONE batch is processed at a time, preventing memory spikes
// from multiple concurrent browser operations.
// =============================================================================

class RequestQueue {
  constructor() {
    this.queue = [];
    this.processing = false;
  }

  enqueue(task) {
    return new Promise((resolve, reject) => {
      this.queue.push({ task, resolve, reject });
      this._processNext();
    });
  }

  async _processNext() {
    if (this.processing || this.queue.length === 0) return;

    this.processing = true;
    const { task, resolve, reject } = this.queue.shift();

    try {
      const result = await task();
      resolve(result);
    } catch (err) {
      reject(err);
    } finally {
      this.processing = false;
      // Process next item in queue
      this._processNext();
    }
  }

  get length() {
    return this.queue.length;
  }
}

const generateQueue = new RequestQueue();

// =============================================================================
// RENDERER PAGE MANAGEMENT
// =============================================================================

const RENDER_TIMEOUT = parseInt(process.env.RENDER_TIMEOUT || '60000');
const NAV_TIMEOUT = parseInt(process.env.NAV_TIMEOUT || '45000');
const MAX_NAV_RETRIES = 3;
const WORKER_COUNT = parseInt(process.env.WORKER_COUNT || '2');

function getMemoryMB() {
  return Math.round(process.memoryUsage().rss / 1024 / 1024);
}

/**
 * Create and initialize a Puppeteer page for rendering.
 * Includes retry logic for navigation failures.
 */
async function createRendererPage(browser, frontendUrlForRender) {
  const rendererUrl = frontendUrlForRender.startsWith('http') 
    ? `${frontendUrlForRender}/render-headless`
    : `https://${frontendUrlForRender}/render-headless`;

  let lastError = null;

  for (let attempt = 1; attempt <= MAX_NAV_RETRIES; attempt++) {
    let page = null;
    try {
      page = await browser.newPage();

      // Limit page memory usage
      await page.setCacheEnabled(false);

      // Log browser errors for debugging
      page.on('console', msg => {
        if (msg.type() === 'error') {
          console.log('[Page Console Error]', msg.text());
        }
      });
      page.on('pageerror', err => console.error('[Page Error]', err.message));

      console.log(`[Page] Navigating to ${rendererUrl} (attempt ${attempt}/${MAX_NAV_RETRIES})...`);
      
      await page.goto(rendererUrl, { 
        waitUntil: 'networkidle0',
        timeout: NAV_TIMEOUT 
      });

      // Wait for the Angular render function to be available
      await page.waitForFunction(
        () => typeof window.renderDesign === 'function',
        { timeout: 15000 }
      );

      console.log('[Page] Renderer page ready');
      return page;

    } catch (err) {
      lastError = err;
      console.warn(`[Page] Navigation attempt ${attempt} failed: ${err.message}`);
      
      // Close the failed page to free memory
      if (page) {
        try { await page.close(); } catch (_) {}
      }

      // Wait a bit before retrying (exponential backoff)
      if (attempt < MAX_NAV_RETRIES) {
        const delay = attempt * 2000;
        console.log(`[Page] Retrying in ${delay}ms...`);
        await new Promise(r => setTimeout(r, delay));
      }
    }
  }

  throw new Error(`Failed to create renderer page after ${MAX_NAV_RETRIES} attempts: ${lastError?.message}`);
}

/**
 * Render a single image on an already-initialized page.
 * Resets state between renders so the same page can be reused.
 */
async function renderImageOnPage(page, template, elements, size) {
  // Set viewport to the requested size
  await page.setViewport({ width: size.width, height: size.height });

  // Reset global flags before each render
  await page.evaluate(() => {
    window.renderComplete = false;
    window.renderedImage = null;
  });

  console.log(`[Render] Starting render ${size.width}x${size.height}...`);

  // Inject the design data into the headless page
  await page.evaluate((config, overwrites, w, h) => {
    window.renderDesign(config, overwrites, w, h);
  }, template.configuration, elements || {}, size.width, size.height);

  // Wait for the renderer to signal completion
  await page.waitForFunction(
    () => window.renderComplete === true && window.renderedImage,
    { timeout: RENDER_TIMEOUT }
  );
  
  const dataUrl = await page.evaluate(() => window.renderedImage);
  
  if (!dataUrl) {
    throw new Error('Failed to retrieve rendered image from canvas');
  }

  // Convert Base64 Data URL to Buffer
  const base64Data = dataUrl.replace(/^data:image\/png;base64,/, "");
  const screenshotBuffer = Buffer.from(base64Data, 'base64');
  
  // Upload to S3
  const s3Url = await uploadToS3(screenshotBuffer);

  console.log(`[Render] Done ${size.width}x${size.height} -> ${s3Url}`);

  return {
    size: { width: size.width, height: size.height },
    success: true,
    url: s3Url
  };
}

// =============================================================================
// API ROUTES
// =============================================================================

/**
 * Sync endpoint: Design app sends current template here to "publish" it
 */
app.post('/api/templates/sync', (req, res) => {
  try {
    const template = req.body;
    if (!template.id || !template.apiName) {
      return res.status(400).json({ success: false, error: 'Missing template data' });
    }
    templates.save(template);
    console.log(`Template synced: ${template.apiName}`);
    res.json({ success: true, message: 'Template synced to API backend' });
  } catch (err) {
    console.error('Sync Error:', err);
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
    console.error('Error:', err);
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
    console.error('Error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Health check endpoint
 */
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    browserConnected: browserInstance?.connected || false,
    queueLength: generateQueue.length,
    workerCount: WORKER_COUNT,
    uptime: process.uptime(),
    memoryUsage: getMemoryMB() + 'MB'
  });
});

/**
 * Generate endpoint: The core Switchboard-style API
 * 
 * Supports two modes:
 * 1. Single generation (backward compatible):
 *    { template: "name", sizes: [...], elements: {...} }
 * 
 * 2. Batch generation:
 *    { template: "name", variations: [
 *      { sizes: [...], elements: {...} },
 *      { sizes: [...], elements: {...} },
 *      ...
 *    ]}
 * 
 * Jobs are distributed across WORKER_COUNT parallel pages for speed.
 * Requests are queued so only one batch runs at a time.
 */
app.post('/api/v1/generate', async (req, res) => {
  const startTime = Date.now();
  const { template: apiName, sizes, elements, variations } = req.body;

  if (!apiName) {
    return res.status(400).json({ success: false, error: 'Template apiName is required' });
  }

  // Check template exists BEFORE entering the queue (fast fail)
  const template = templates.getByApiName(apiName);
  if (!template) {
    return res.status(404).json({ success: false, error: `Template "${apiName}" not found` });
  }

  const queuePos = generateQueue.length;
  if (queuePos > 0) {
    console.log(`[Queue] Request queued at position ${queuePos}`);
  }

  try {
    // All generation work happens inside the queue (one at a time)
    const result = await generateQueue.enqueue(async () => {
      return await processGenerateRequest(template, sizes, elements, variations);
    });

    const duration = Date.now() - startTime;

    res.json({
      duration,
      usage: true,
      success: true,
      warnings: [],
      sizes: result,
      count: result.length
    });

  } catch (err) {
    console.error('Generation Error:', err.message);
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

/**
 * Process a chunk of jobs sequentially on a single page.
 * Each worker runs one of these in parallel with other workers.
 */
async function workerProcessChunk(workerId, browser, frontendUrlForRender, template, jobs, hasVariations) {
  const results = [];
  let page = null;

  try {
    page = await createRendererPage(browser, frontendUrlForRender);
    console.log(`[Worker ${workerId}] Page ready, processing ${jobs.length} jobs`);

    for (let i = 0; i < jobs.length; i++) {
      const job = jobs[i];

      try {
        const result = await renderImageOnPage(page, template, job.elements, job.size);
        results.push({
          originalIndex: job.originalIndex,
          ...result,
          ...(hasVariations ? { variationIndex: job.variationIndex } : {})
        });
      } catch (err) {
        console.error(`[Worker ${workerId}] Job ${i + 1}/${jobs.length} failed: ${err.message}`);
        results.push({
          originalIndex: job.originalIndex,
          size: job.size,
          success: false,
          error: err.message || 'Generation failed',
          ...(hasVariations ? { variationIndex: job.variationIndex } : {})
        });

        // If the page crashed, try to recover
        if (err.message.includes('Target closed') || 
            err.message.includes('Session closed') ||
            err.message.includes('Protocol error') ||
            err.message.includes('Navigation failed')) {
          console.warn(`[Worker ${workerId}] Page crashed, creating a fresh one...`);
          try { await page.close(); } catch (_) {}
          const freshBrowser = await getBrowser();
          page = await createRendererPage(freshBrowser, frontendUrlForRender);
        }
      }
    }
  } finally {
    if (page) {
      try { await page.close(); } catch (_) {}
    }
    console.log(`[Worker ${workerId}] Done (${results.filter(r => r.success).length}/${results.length} succeeded)`);
  }

  return results;
}

/**
 * Core generation logic with parallel worker pool.
 * Distributes jobs across WORKER_COUNT pages running in parallel.
 */
async function processGenerateRequest(template, sizes, elements, variations) {
  const browser = await getBrowser();
  const frontendUrlForRender = process.env.FRONTEND_URL || 'http://localhost:4200';

  // Build flat list of jobs
  const jobs = [];
  const hasVariations = variations && Array.isArray(variations);
  if (hasVariations) {
    console.log(`[Generate] Batch mode: ${variations.length} variations`);
    for (let i = 0; i < variations.length; i++) {
      const variation = variations[i];
      const variationSizes = variation.sizes || sizes || [{ width: 1080, height: 1080 }];
      const variationElements = variation.elements || elements || {};
      for (const size of variationSizes) {
        jobs.push({ originalIndex: jobs.length, variationIndex: i, size, elements: variationElements });
      }
    }
  } else {
    console.log('[Generate] Single mode');
    const targetSizes = sizes || [{ width: 1080, height: 1080 }];
    for (const size of targetSizes) {
      jobs.push({ originalIndex: jobs.length, variationIndex: 0, size, elements: elements || {} });
    }
  }

  // Use fewer workers if there are fewer jobs than workers
  const workerCount = Math.min(WORKER_COUNT, jobs.length);
  console.log(`[Generate] ${jobs.length} jobs across ${workerCount} workers | Memory: ${getMemoryMB()}MB`);

  // Distribute jobs round-robin across workers
  const chunks = Array.from({ length: workerCount }, () => []);
  for (let i = 0; i < jobs.length; i++) {
    chunks[i % workerCount].push(jobs[i]);
  }

  // Launch all workers in parallel
  const workerPromises = chunks.map((chunk, i) =>
    workerProcessChunk(i + 1, browser, frontendUrlForRender, template, chunk, hasVariations)
  );

  const workerResults = await Promise.all(workerPromises);

  // Merge and sort results back to original order
  const allResults = workerResults
    .flat()
    .sort((a, b) => a.originalIndex - b.originalIndex)
    .map(({ originalIndex, ...rest }) => rest);

  const succeeded = allResults.filter(r => r.success).length;
  console.log(`[Generate] Complete: ${succeeded}/${allResults.length} succeeded | Memory: ${getMemoryMB()}MB`);
  return allResults;
}

// =============================================================================
// GLOBAL ERROR HANDLING - Prevent server crashes
// =============================================================================

process.on('uncaughtException', (err) => {
  console.error('[FATAL] Uncaught Exception:', err.message);
  console.error(err.stack);
  // Don't exit - try to keep serving
});

process.on('unhandledRejection', (reason) => {
  console.error('[FATAL] Unhandled Rejection:', reason);
  // Don't exit - try to keep serving
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('[Shutdown] SIGTERM received, closing browser...');
  if (browserInstance) {
    try { await browserInstance.close(); } catch (_) {}
  }
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('[Shutdown] SIGINT received, closing browser...');
  if (browserInstance) {
    try { await browserInstance.close(); } catch (_) {}
  }
  process.exit(0);
});

// =============================================================================
// START SERVER & PRE-WARM BROWSER
// =============================================================================

app.listen(port, async () => {
  console.log(`Switchboard API Backend running at http://localhost:${port} (${WORKER_COUNT} parallel workers)`);
  
  // Pre-warm the browser on startup so the first request is fast
  try {
    await getBrowser();
    console.log('[Startup] Browser pre-warmed and ready');
  } catch (err) {
    console.warn('[Startup] Browser pre-warm failed (will retry on first request):', err.message);
  }
});
