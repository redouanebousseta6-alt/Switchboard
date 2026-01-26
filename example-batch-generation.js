/**
 * Example: Generate 20+ images in one API call using batch mode
 * 
 * Run with: node example-batch-generation.js
 */

const API_URL = process.env.API_URL || 'https://backend-production-d92b.up.railway.app/api/v1/generate';
const TEMPLATE_NAME = 'untitledstemplate';

async function generateBatchImages() {
  // Create 20 variations with different configurations
  const variations = [];
  
  // Example 1: Generate 20 images with different rotation angles
  for (let i = 0; i < 20; i++) {
    variations.push({
      sizes: [{ width: 600, height: 1200 }],
      elements: {
        "image-1": {
          url: "https://switchboard-production.up.railway.app/b3182b63-2a4f-4e46-b4d5-341d56084372",
          backgroundColor: "transparent",
          backgroundOpacity: 1,
          contain: false,
          horizontalAlignment: "center",
          verticalAlignment: "middle",
          opacity: 1,
          angle: i * 18 // Rotate 0, 18, 36, 54, ... 342 degrees
        }
      }
    });
  }

  console.log(`🚀 Generating ${variations.length} images in batch mode...`);
  const startTime = Date.now();

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        template: TEMPLATE_NAME,
        variations: variations
      })
    });

    const result = await response.json();
    const duration = Date.now() - startTime;

    if (result.success) {
      console.log(`✅ Success! Generated ${result.count} images in ${duration}ms`);
      console.log(`📊 Average time per image: ${Math.round(duration / result.count)}ms`);
      console.log('\n📸 Generated Image URLs:');
      result.sizes.forEach((item, index) => {
        if (item.success) {
          console.log(`  ${index + 1}. ${item.url}`);
        } else {
          console.log(`  ${index + 1}. ❌ Failed: ${item.error}`);
        }
      });
    } else {
      console.error('❌ Generation failed:', result.error);
    }
  } catch (error) {
    console.error('❌ Request failed:', error.message);
  }
}

// Run the example
generateBatchImages();
