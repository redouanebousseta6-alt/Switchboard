# Batch Image Generation API

The API now supports generating **multiple images (20+) in a single API call** using batch mode.

## Two Modes

### 1. Single Mode (Backward Compatible)
Generate one or more sizes with the same element configuration:

```json
{
  "template": "untitledstemplate",
  "sizes": [
    { "width": 600, "height": 1200 },
    { "width": 1080, "height": 1080 }
  ],
  "elements": {
    "image-1": {
      "url": "https://example.com/image.jpg",
      "opacity": 1,
      "angle": 0
    }
  }
}
```

This generates 2 images (one for each size) with the same elements.

### 2. Batch Mode (New - Supports 20+ Images)
Generate multiple variations, each with different element configurations:

```json
{
  "template": "untitledstemplate",
  "variations": [
    {
      "sizes": [{ "width": 600, "height": 1200 }],
      "elements": {
        "image-1": { "url": "https://example.com/img1.jpg", "angle": 0 }
      }
    },
    {
      "sizes": [{ "width": 600, "height": 1200 }],
      "elements": {
        "image-1": { "url": "https://example.com/img2.jpg", "angle": 45 }
      }
    },
    {
      "sizes": [{ "width": 600, "height": 1200 }],
      "elements": {
        "image-1": { "url": "https://example.com/img3.jpg", "angle": 90 }
      }
    }
    // ... add as many variations as needed (20, 50, 100+)
  ]
}
```

This generates 3 images (one for each variation). You can add 20, 50, or even 100+ variations in one call!

## Example: Generate 20 Images

```javascript
const variations = [];

// Generate 20 images with different angles
for (let i = 0; i < 20; i++) {
  variations.push({
    sizes: [{ width: 600, height: 1200 }],
    elements: {
      "image-1": {
        url: "https://example.com/image.jpg",
        angle: i * 18, // 0, 18, 36, 54, ... 342 degrees
        opacity: 1
      }
    }
  });
}

const response = await fetch('https://your-api.com/api/v1/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    template: "untitledstemplate",
    variations: variations
  })
});

const result = await response.json();
console.log(`Generated ${result.count} images`);
console.log('URLs:', result.sizes.map(s => s.url));
```

## Response Format

```json
{
  "success": true,
  "duration": 15234,
  "usage": true,
  "warnings": [],
  "count": 20,
  "sizes": [
    { "size": { "width": 600, "height": 1200 }, "success": true, "url": "https://..." },
    { "size": { "width": 600, "height": 1200 }, "success": true, "url": "https://..." },
    // ... 18 more results
  ]
}
```

## Performance

- **Parallel Processing**: Variations are processed in parallel (max 5 concurrent) for better performance
- **Single Browser**: One browser instance is reused for all generations (more efficient)
- **Scalable**: Can handle 20, 50, 100+ images in one call

## Notes

- Each variation can have different `elements` and `sizes`
- If a variation fails, it will be marked with `success: false` and include an `error` field
- The `count` field shows the total number of images generated
- Processing time scales with the number of variations, but parallel processing helps
