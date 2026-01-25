# Switchboard API Backend Setup

This backend enables professional image generation via a REST API, similar to Switchboard Canvas. It uses Puppeteer for headless rendering and AWS S3 for image storage.

## Prerequisites

1.  **Node.js** installed on your server.
2.  **AWS Account** with an S3 bucket.
3.  **Frontend** (Angular app) deployed or running.

## Installation

1.  Navigate to the `backend` folder:
    ```bash
    cd backend
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Configure environment variables:
    *   Rename `.env.example` to `.env`.
    *   Fill in your AWS credentials and S3 bucket details.
    *   Set `FRONTEND_URL` to your Angular app's URL (e.g., `http://localhost:4200`).

## Running the Server

Start the API server:
```bash
node server.js
```
The server will start at `http://localhost:3000`.

## API Usage

### 1. Syncing a Template
Before you can generate images, you must "Publish" your template from the Editor UI. This sends the design JSON to the backend's SQLite database.

### 2. Finding Element Names
Before generating images, you need to know the exact API names of elements in your template.

**List all templates:**
```bash
curl http://localhost:3000/api/templates
```

**Get template details with element names:**
```bash
curl http://localhost:3000/api/templates/YOUR_TEMPLATE_NAME
```

**Or use the HTML testing tool:**
Open `test-api.html` in your browser for a visual interface to test your API.

### 3. Generating an Image
Send a `POST` request to `http://localhost:3000/api/v1/generate`:

**Payload:**
```json
{
  "template": "my_template_api_name",
  "sizes": [
    { "width": 1080, "height": 1080 }
  ],
  "elements": {
    "text-1": {
      "text": "Dynamic Content from n8n",
      "textColor": "#FF5733"
    },
    "image-1": {
      "url": "https://images.unsplash.com/photo-12345"
    }
  }
}
```

**Response:**
```json
{
  "duration": 2450,
  "usage": true,
  "success": true,
  "sizes": [
    {
      "size": { "width": 1080, "height": 1080 },
      "success": true,
      "url": "https://your-bucket.s3.amazonaws.com/unique-id.png"
    }
  ]
}
```

## Debugging & Testing

### Using the Test Tool
Open `test-api.html` in your browser to:
- List all available templates
- View element names in each template
- Test image generation with a visual interface

### Common Issues
If your generated images are blank/white, see `TROUBLESHOOTING.md` for solutions.

## Available API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/templates/sync` | Publish template from editor |
| GET | `/api/templates` | List all templates |
| GET | `/api/templates/:apiName` | Get template details and element names |
| POST | `/api/v1/generate` | Generate images |

## S3 Lifecycle Policy (Recommended)
To match the 24-hour lifespan of images, configure a **Lifecycle Rule** in your AWS S3 Bucket settings:
1.  Go to S3 Bucket > Management > Lifecycle rules.
2.  Create a rule to "Expire current versions of objects".
3.  Set "Days after object creation" to **1**.
