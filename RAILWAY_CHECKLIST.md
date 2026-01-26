# Railway deployment checklist

Use this checklist to fix common errors.

---

## 1. "Resolved credential object is not valid" (S3/R2)

**Cause:** Backend can generate the image but fails when uploading to Cloudflare R2. AWS/R2 credentials in Railway are missing, wrong, or misconfigured.

**Fix – set these in Backend → Variables:**

| Variable | Example | Notes |
|----------|---------|--------|
| `AWS_ACCESS_KEY_ID` | Your R2 Access Key ID | From Cloudflare R2 → Manage R2 API Tokens |
| `AWS_SECRET_ACCESS_KEY` | Your R2 Secret | From same token |
| `AWS_REGION` | `auto` | Use `auto` for R2 |
| `AWS_S3_BUCKET_NAME` | `switchboard` | Your R2 bucket name |
| `AWS_ENDPOINT` | `https://xxxx.r2.cloudflarestorage.com` | R2 S3 API endpoint (no bucket in URL) |
| `AWS_PUBLIC_URL` | `https://pub-xxxx.r2.dev` | Optional; public URL for your bucket |

**How to get R2 keys:**

1. Cloudflare Dashboard → R2 → your bucket (or Overview).
2. **Manage R2 API Tokens** → Create API token.
3. Copy **Access Key ID** → `AWS_ACCESS_KEY_ID`.
4. Copy **Secret Access Key** → `AWS_SECRET_ACCESS_KEY`.
5. Use the **S3 API** endpoint as `AWS_ENDPOINT` (e.g. `https://<account-id>.r2.cloudflarestorage.com`).

**In Railway:** no quotes, no extra spaces. Redeploy after changing variables.

---

## 2. "Template not found"

**Cause:** The `template` in your request doesn’t match any published template. Names are **case-sensitive**.

**Fix:**

1. In the editor, open your template.
2. Click **Publish**.
3. Note the exact **API name** in the success message (e.g. `untitled_template` or `untitledstemplate`).
4. Use that **exact** string in your API request as `"template": "..."`.

**Example:** If the app says `API Name: "untitledstemplate"`, your curl must use `"template": "untitledstemplate"` (same spelling and case).

---

## 3. "Cannot navigate to invalid URL" (Puppeteer)

**Cause:** `FRONTEND_URL` is set without `https://`, so the render URL is invalid.

**Fix:** In Backend → Variables, set:

```
FRONTEND_URL=https://switchboard-production.up.railway.app
```

Include `https://`, no trailing slash.

---

## 4. CORS / "Failed to sync to API"

**Cause:** Backend CORS doesn’t allow your frontend origin.

**Fix:**

1. `FRONTEND_URL` = `https://switchboard-production.up.railway.app` (with `https://`).
2. Redeploy backend.
3. Hard-refresh the frontend (Ctrl+F5).

---

## 5. "libXfixes.so.3" or similar Chrome errors

**Cause:** Missing system libraries for Puppeteer/Chrome in the Docker image.

**Fix:** Use the Dockerfile that installs `libxfixes3` and other Chrome deps. Rebuild and redeploy. If you still see library errors, we may need to add more packages to the Dockerfile.

---

## Quick test after fixing credentials

```cmd
curl -X POST https://backend-production-d92b.up.railway.app/api/v1/generate -H "Content-Type: application/json" -d "{\"template\":\"YOUR_EXACT_API_NAME\",\"sizes\":[{\"width\":600,\"height\":1200}],\"elements\":{}}"
```

Replace `YOUR_EXACT_API_NAME` with the exact API name from the Publish success message.

---

## Summary: Required backend variables

| Variable | Required |
|----------|----------|
| `PORT` | Yes (usually `3000`) |
| `FRONTEND_URL` | Yes, with `https://` |
| `AWS_ACCESS_KEY_ID` | Yes, for R2 |
| `AWS_SECRET_ACCESS_KEY` | Yes, for R2 |
| `AWS_REGION` | Yes (`auto` for R2) |
| `AWS_S3_BUCKET_NAME` | Yes |
| `AWS_ENDPOINT` | Yes, R2 S3 endpoint |
| `AWS_PUBLIC_URL` | Recommended for public image URLs |
