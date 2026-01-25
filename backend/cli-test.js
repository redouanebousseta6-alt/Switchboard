#!/usr/bin/env node

/**
 * Quick CLI tool to test Switchboard API
 * Usage: node cli-test.js <command> [options]
 */

const API_BASE = 'http://localhost:3000';

const commands = {
  list: async () => {
    console.log('📋 Fetching all templates...\n');
    const response = await fetch(`${API_BASE}/api/templates`);
    const data = await response.json();
    
    if (data.success) {
      if (data.templates.length === 0) {
        console.log('⚠️  No templates found. Please publish a template from the editor first.');
      } else {
        console.log(`✓ Found ${data.templates.length} template(s):\n`);
        data.templates.forEach(t => {
          console.log(`  • ${t.api_name}`);
          console.log(`    Display: ${t.display_name}`);
          console.log(`    Created: ${t.created_at}\n`);
        });
      }
    } else {
      console.error('❌ Error:', data.error);
    }
  },

  inspect: async (templateName) => {
    if (!templateName) {
      console.error('❌ Please provide a template name: node cli-test.js inspect <template-name>');
      process.exit(1);
    }

    console.log(`🔍 Inspecting template: ${templateName}\n`);
    const response = await fetch(`${API_BASE}/api/templates/${templateName}`);
    const data = await response.json();

    if (data.success) {
      console.log(`✓ Template: ${data.displayName}`);
      console.log(`  API Name: ${data.apiName}`);
      console.log(`  Elements: ${data.elements.length}\n`);

      if (data.elements.length === 0) {
        console.log('  No elements found in template.');
      } else {
        console.log('  Available elements (use these names in API calls):\n');
        data.elements.forEach(el => {
          console.log(`  📦 ${el.name}`);
          console.log(`     Type: ${el.type}`);
          if (el.hasText) console.log(`     Has text: true`);
          if (el.hasSrc) console.log(`     Has image: true`);
          console.log();
        });

        console.log('  Example API call:\n');
        const exampleElements = {};
        data.elements.slice(0, 2).forEach(el => {
          if (el.type === 'switchboard-image') {
            exampleElements[el.name] = {
              url: "https://images.unsplash.com/photo-1234567890"
            };
          } else if (el.type === 'switchboard-textbox') {
            exampleElements[el.name] = {
              text: "Hello World",
              textColor: "#FF0000"
            };
          }
        });

        console.log(JSON.stringify({
          template: templateName,
          sizes: [{ width: 1080, height: 1080 }],
          elements: exampleElements
        }, null, 2));
      }
    } else {
      console.error('❌ Error:', data.error);
    }
  },

  generate: async (templateName, elementsJson) => {
    if (!templateName) {
      console.error('❌ Usage: node cli-test.js generate <template-name> \'{"element-name": {...}}\'');
      process.exit(1);
    }

    let elements = {};
    if (elementsJson) {
      try {
        elements = JSON.parse(elementsJson);
      } catch (e) {
        console.error('❌ Invalid JSON for elements');
        process.exit(1);
      }
    }

    console.log(`🎨 Generating image for template: ${templateName}`);
    console.log(`⏱️  This may take 10-30 seconds...\n`);

    const startTime = Date.now();
    const response = await fetch(`${API_BASE}/api/v1/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        template: templateName,
        elements: elements
      })
    });

    const data = await response.json();
    const duration = Date.now() - startTime;

    if (data.success) {
      console.log(`✅ Success! Generated in ${data.duration}ms (total: ${duration}ms)\n`);
      data.sizes.forEach((img, idx) => {
        console.log(`  Image ${idx + 1}:`);
        console.log(`  Size: ${img.size.width}x${img.size.height}`);
        console.log(`  URL: ${img.url}\n`);
      });
    } else {
      console.error('❌ Generation failed:', data.error);
    }
  },

  help: () => {
    console.log(`
Switchboard API CLI Test Tool
==============================

Commands:

  list
    List all available templates

  inspect <template-name>
    Show details and element names for a template

  generate <template-name> [elements-json]
    Generate an image
    
Examples:

  node cli-test.js list

  node cli-test.js inspect template1

  node cli-test.js generate template1

  node cli-test.js generate template1 '{"image-1":{"url":"https://..."}}'

For a visual interface, open test-api.html in your browser.
`);
  }
};

// Main execution
const [,, command, ...args] = process.argv;

if (!command || !commands[command]) {
  commands.help();
  process.exit(0);
}

commands[command](...args).catch(err => {
  console.error('❌ Error:', err.message);
  console.error('\nIs the backend running? Start it with: node server.js');
  process.exit(1);
});
