const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'auto',
  endpoint: process.env.AWS_ENDPOINT, // Added for R2 support
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
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
    await s3Client.send(command);
    
    // IF YOU HAVE A PUBLIC URL CONFIGURED (Cloudflare R2 Public Bucket)
    if (process.env.AWS_PUBLIC_URL) {
      return `${process.env.AWS_PUBLIC_URL}/${fileName}`;
    }

    // For R2 or custom endpoints, the URL structure might be different
    if (process.env.AWS_ENDPOINT && process.env.AWS_ENDPOINT.includes('r2.cloudflarestorage.com')) {
      return `${process.env.AWS_ENDPOINT}/${bucketName}/${fileName}`;
    }

    return `https://${bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileName}`;
  } catch (error) {
    console.error('❌ S3 Upload Error:', error);
    throw error;
  }
}

module.exports = { uploadToS3 };
