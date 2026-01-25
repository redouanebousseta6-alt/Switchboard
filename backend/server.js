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
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:4200',
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
 * Generate endpoint: The core Switchboard-style API
 */
app.post('/api/v1/generate', async (req, res) => {
  const startTime = Date.now();
  const { template: apiName, sizes, elements } = req.body;

  if (!apiName) {
    return res.status(400).json({ success: false, error: 'Template apiName is required' });
  }

  try {
    // 1. Get template from database
    const template = templates.getByApiName(apiName);
    if (!template) {
      return res.status(404).json({ success: false, error: `Template "${apiName}" not found` });
    }

    // 2. Launch Headless Browser
    const browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox', 
        '--disable-setuid-sandbox',
        '--disable-web-security', // BYPASS CORS: Allows loading images from any domain
        '--allow-file-access-from-files'
      ]
    });

    const results = [];
    const targetSizes = sizes || [{ width: 1080, height: 1080 }];

    for (const size of targetSizes) {
      const page = await browser.newPage();
      
      // LOG BROWSER ERRORS TO TERMINAL
      page.on('console', msg => console.log('🌐 BROWSER LOG:', msg.text()));
      page.on('pageerror', err => console.error('❌ BROWSER ERROR:', err.message));

      // Set viewport to the requested size
      await page.setViewport({ width: size.width, height: size.height });

      const rendererUrl = `${process.env.FRONTEND_URL}/render-headless`;
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
      
      // 4. Upload to S3
      const s3Url = await uploadToS3(screenshotBuffer);

      results.push({
        size: { width: size.width, height: size.height },
        success: true,
        url: s3Url
      });

      await page.close();
    }

    await browser.close();

    const duration = Date.now() - startTime;

    // 5. Return Switchboard-compatible response
    res.json({
      duration,
      usage: true,
      success: true,
      warnings: [],
      sizes: results
    });

  } catch (err) {
    console.error('❌ Generation Error:', err);
    res.status(500).json({
      success: false,
      error: err.message,
      duration: Date.now() - startTime
    });
  }
});

app.listen(port, () => {
  console.log(`🚀 Switchboard API Backend running at http://localhost:${port}`);
});
