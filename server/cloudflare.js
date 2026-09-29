// Cloudflare R2 storage helpers (S3-compatible API).
// When R2 env vars are absent, the app transparently falls back to local disk.
const {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} = require("@aws-sdk/client-s3");

function isConfigured() {
  return !!(
    process.env.R2_ACCOUNT_ID &&
    process.env.R2_ACCESS_KEY_ID &&
    process.env.R2_SECRET_ACCESS_KEY &&
    process.env.R2_BUCKET
  );
}

let client = null;

function getClient() {
  if (!isConfigured()) return null;
  if (!client) {
    client = new S3Client({
      region: "auto",
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
      },
    });
  }
  return client;
}

async function putObject(key, body, contentType) {
  const c = getClient();
  if (!c) throw new Error("R2_NOT_CONFIGURED");
  await c.send(
    new PutObjectCommand({
      Bucket: process.env.R2_BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType || "application/octet-stream",
    })
  );
}

async function getObjectText(key) {
  const bytes = await getObjectBuffer(key);
  return bytes.toString("utf8");
}

async function getObjectBuffer(key) {
  const c = getClient();
  if (!c) throw new Error("R2_NOT_CONFIGURED");
  const res = await c.send(new GetObjectCommand({ Bucket: process.env.R2_BUCKET, Key: key }));
  const bytes = await res.Body.transformToByteArray();
  return Buffer.from(bytes);
}

async function deleteObject(key) {
  const c = getClient();
  if (!c) return;
  try {
    await c.send(new DeleteObjectCommand({ Bucket: process.env.R2_BUCKET, Key: key }));
  } catch {
    // best-effort
  }
}

module.exports = { isConfigured, putObject, getObjectText, getObjectBuffer, deleteObject };
