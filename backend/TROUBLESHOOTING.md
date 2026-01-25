# Troubleshooting: White/Blank Images

## The Problem
Your generated images are coming out completely white even though your template has images.

## Root Cause
The API call is trying to override elements with names that don't exist in your template. Looking at the browser console logs:

```
⚠️ Object with API name "image-1" not found on canvas
⚠️ Object with API name "rect-1" not found on canvas
⚠️ Object with API name "image-2" not found on canvas
```

This happens because:
1. Your template objects have different API names than what you're using in the generate request
2. When objects aren't found, they're not rendered
3. The result is a white canvas

## Solution Steps

### Step 1: Find Your Template's Actual Element Names

**Option A: Use the New Debugging Endpoint**

1. Start your backend: `node server.js`
2. Open `test-api.html` in your browser (double-click the file)
3. Enter your template name in Section 2
4. Click "Get Details"
5. You'll see all available element names with their types

**Option B: Use curl/Postman**

```bash
curl http://localhost:3000/api/templates/YOUR_TEMPLATE_NAME
```

Response will show:
```json
{
  "success": true,
  "apiName": "your_template",
  "displayName": "Your Template",
  "elements": [
    {
      "name": "image-3",  // ← Use THIS name in your API call
      "type": "switchboard-image",
      "hasText": false,
      "hasSrc": true
    },
    {
      "name": "text-5",   // ← Use THIS name
      "type": "switchboard-textbox",
      "hasText": true,
      "hasSrc": false
    }
  ]
}
```

### Step 2: Update Your API Call

Once you know the correct names, update your generate request:

**WRONG (causes white images):**
```json
{
  "template": "template1",
  "elements": {
    "image-1": {  // ← This doesn't exist!
      "url": "https://example.com/image.jpg"
    }
  }
}
```

**CORRECT:**
```json
{
  "template": "template1",
  "elements": {
    "image-3": {  // ← Use the actual name from Step 1
      "url": "https://example.com/image.jpg"
    },
    "text-5": {
      "text": "My Custom Text"
    }
  }
}
```

### Step 3: Test with the HTML Tool

1. Open `test-api.html` in your browser
2. Go to Section 3 (Generate Image)
3. Enter your template name
4. Use the correct element names from Step 1
5. Click "Generate Image"

## Why This Happens

When you copy/paste elements in the editor, or delete and recreate them, Fabric.js assigns new sequential names:
- First image → `image-1`
- Second image → `image-2`
- If you delete `image-1` and add another, it becomes `image-3`

The API name is assigned **when the element is added to the canvas**, not by its visual position.

## Quick Fix: Rename Elements in Editor

To have predictable API names:

1. Open your template in the editor
2. Select each element
3. In the Properties panel, you should see a "Name" or "API Name" field
4. Rename them to something memorable:
   - `hero_image`
   - `title_text`
   - `background_rect`
5. Publish the template again
6. Now your API calls can use these friendly names

## Testing Checklist

- [ ] Backend is running (`node server.js`)
- [ ] Template is published from the editor
- [ ] Used debugging endpoint to find correct element names
- [ ] Updated API payload with correct names
- [ ] Tested with `test-api.html` tool
- [ ] Images load correctly (check browser console for CORS errors)

## Common Issues

### Issue: "Template not found"
- Make sure you clicked "Publish" in the editor
- Check the template name matches exactly (case-sensitive)

### Issue: Images still white
- Check browser console in headless renderer for errors
- Verify image URLs are accessible (not localhost, no CORS issues)
- Make sure images use HTTPS (not HTTP)

### Issue: "Failed to load resource"
- Image URL might be invalid or blocked by CORS
- Try using images from Unsplash or similar CDN

## Need More Help?

Check the backend terminal logs when generating - they show:
- Which template is being loaded
- Browser console logs from the headless renderer
- Any errors during image loading
- Screenshot confirmation

Example good output:
```
🌐 Navigating to: http://localhost:4200/render-headless
🎨 Starting render process...
⏳ Waiting for signal: window.renderComplete === true
📸 Render complete, taking screenshot...
```

Example bad output (indicates problem):
```
⚠️ Object with API name "image-1" not found on canvas
❌ Failed to load image from URL: ...
```
