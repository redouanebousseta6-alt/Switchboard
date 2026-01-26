const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

function checkS3Config() {
  const missing = [];
  if (!process.env.AWS_ACCESS_KEY_ID || String(process.env.AWS_ACCESS_KEY_ID).trim() === '') missing.push('AWS_ACCESS_KEY_ID');
  if (!process.env.AWS_SECRET_ACCESS_KEY || String(process.env.AWS_SECRET_ACCESS_KEY).trim() === '') missing.push('AWS_SECRET_ACCESS_KEY');
  if (!process.env.AWS_S3_BUCKET_NAME || String(process.env.AWS_S3_BUCKET_NAME).trim() === '') missing.push('AWS_S3_BUCKET_NAME');
  if (!process.env.AWS_ENDPOINT || String(process.env.AWS_ENDPOINT).trim() === '') missing.push('AWS_ENDPOINT');
  return missing;
}

const missingVars = checkS3Config();
if (missingVars.length > 0) {
  console.warn('⚠️ S3/R2 config incomplete. Missing:', missingVars.join(', '));
  console.warn('   Set these in Railway Variables. Image upload will fail until fixed.');
}

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'auto',
  endpoint: process.env.AWS_ENDPOINT || undefined,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

/**
 * Upload an image buffer to S3 and return the public URL
 */
async function uploadToS3(buffer, mimeType = 'image/png') {
  const fileName = `${uuidv4()}.png`;
  const bucketName = process.env.AWS_S3_BUCKET_NAME;

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: fileName,
    Body: buffer,
    ContentType: mimeType,
  });

  try {
    const missing = checkS3Config();
    if (missing.length > 0) {
      throw new Error(`S3/R2 credentials missing. Set in Railway Variables: ${missing.join(', ')}. See RAILWAY_CHECKLIST.md`);
    }

    await s3Client.send(command);
    
    if (process.env.AWS_PUBLIC_URL) {
      return `${process.env.AWS_PUBLIC_URL}/${fileName}`;
    }
    if (process.env.AWS_ENDPOINT && process.env.AWS_ENDPOINT.includes('r2.cloudflarestorage.com')) {
      return `${process.env.AWS_ENDPOINT}/${bucketName}/${fileName}`;
    }
    return `https://${bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileName}`;
  } catch (error) {
    console.error('❌ S3 Upload Error:', error.message || error);
    const msg = (error.message || String(error));
    if (msg.includes('credential') || msg.includes('Credentials')) {
      throw new Error('R2 credentials invalid. In Railway, set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY to your Cloudflare R2 API token (Access Key ID + Secret). No quotes, no spaces.');
    }
    throw error;
  }
}

module.exports = { uploadToS3 };
