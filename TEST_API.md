# How to Test Your Switchboard API

## Step 1: Get Your Backend URL

1. Go to Railway Dashboard
2. Click on your **Backend** service
3. Go to **Settings** -> **Networking**
4. Copy the **Public Domain** (e.g., `https://backend-production.up.railway.app`)
   - If you don't see one, click **"Generate Domain"**

## Step 2: Test with cURL (Terminal/Command Prompt)

Replace `YOUR_BACKEND_URL` with the URL you copied above:

```bash
curl --request POST \
  --url https://YOUR_BACKEND_URL/api/v1/generate \
  --header 'Content-Type: application/json' \
  --data '{
    "template": "untitled_template",
    "sizes": [
      {
        "width": 600,
        "height": 1200
      }
    ],
    "elements": {
      "rect-1": {
        "fillColor": "#ff0000",
        "opacity": 1,
        "angle": 0
      }
    }
  }'
```

### What a Successful Response Looks Like:

```json
{
  "duration": 2345,
  "usage": true,
  "success": true,
  "warnings": [],
  "sizes": [
    {
      "size": {
        "width": 600,
        "height": 1200
      },
      "success": true,
      "url": "https://pub-c567e07170e84119aa9d0b73567bbf94.r2.dev/..."
    }
  ]
}
```

The `url` field contains your generated image!

## Step 3: Test in Your App (Easiest)

1. Open your live frontend: `https://switchboard-production.up.railway.app`
2. Create or open a template
3. Click **"Publish"** button (top right) to sync the template to the backend
4. Click **"API Runner"** button
5. Fill in any element overwrites (optional)
6. Click **"Generate"**

## Step 4: Check Backend Logs (If Something Fails)

1. Go to Railway Dashboard
2. Click **Backend** service
3. Click **"Logs"** tab
4. Look for error messages in red

## Common Issues:

- **404 Not Found**: Template name doesn't match. Check the template name in your editor.
- **500 Internal Server Error**: Check Railway logs for Puppeteer/Chrome errors
- **CORS Error**: Make sure `FRONTEND_URL` in backend variables matches your frontend URL
