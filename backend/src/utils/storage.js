const fs = require("fs");
const fsPromises = require("fs/promises");
const path = require("path");
const mongoose = require("mongoose");
const { GridFSBucket, ObjectId } = require("mongodb");

const ASSET_BUCKET_NAME = process.env.ASSET_BUCKET_NAME || "musicfyAssets";

const MIME_BY_EXTENSION = {
  ".aac": "audio/aac",
  ".avif": "image/avif",
  ".gif": "image/gif",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".m4a": "audio/mp4",
  ".mp3": "audio/mpeg",
  ".mp4": "video/mp4",
  ".ogg": "audio/ogg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".tsv": "text/tab-separated-values",
  ".wav": "audio/wav",
  ".webm": "audio/webm",
  ".webp": "image/webp",
  ".xls": "application/vnd.ms-excel",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};

function sanitizeFilename(filename) {
  return String(filename || "file")
    .trim()
    .replaceAll(" ", "_")
    .replaceAll(/[^a-zA-Z0-9._-]/g, "");
}

function inferMimeType(filename, fallback = "application/octet-stream") {
  const extension = path.extname(String(filename || "")).toLowerCase();
  return MIME_BY_EXTENSION[extension] || fallback;
}

function getAssetBucket() {
  if (!mongoose.connection?.db) {
    throw new Error("Database connection is not ready");
  }

  return new GridFSBucket(mongoose.connection.db, {
    bucketName: ASSET_BUCKET_NAME,
  });
}

function buildAssetPath(assetId) {
  if (!assetId) {
    return "";
  }

  return `/api/assets/${assetId}`;
}

function extractServerAssetPath(value) {
  const asset = String(value || "").trim();

  if (!asset) {
    return "";
  }

  if (asset.startsWith("/")) {
    return asset;
  }

  try {
    const parsed = new URL(asset);
    return parsed.pathname || "";
  } catch {
    return "";
  }
}

function isPersistentAssetPath(value) {
  return extractServerAssetPath(value).startsWith("/api/assets/");
}

function isLegacyUploadPath(value) {
  return extractServerAssetPath(value).startsWith("/uploads/");
}

function extractLegacyUploadFilename(value) {
  const assetPath = extractServerAssetPath(value);
  if (!assetPath.startsWith("/uploads/")) {
    return "";
  }

  return path.basename(assetPath);
}

function isValidAssetId(value) {
  return ObjectId.isValid(String(value || ""));
}

async function uploadFileStream(readStream, { filename, contentType, metadata = {} }) {
  return new Promise((resolve, reject) => {
    const safeFilename = sanitizeFilename(filename);
    const uploadStream = getAssetBucket().openUploadStream(safeFilename, {
      contentType: contentType || inferMimeType(safeFilename),
      metadata,
    });

    readStream.on("error", reject);
    uploadStream.on("error", reject);
    uploadStream.on("finish", () => {
      resolve(buildAssetPath(uploadStream.id.toString()));
    });

    readStream.pipe(uploadStream);
  });
}

async function persistFileFromPath(filePath, options = {}) {
  const safeFilename = sanitizeFilename(options.filename || path.basename(filePath));
  const readStream = fs.createReadStream(filePath);

  try {
    return await uploadFileStream(readStream, {
      filename: safeFilename,
      contentType: options.contentType || inferMimeType(safeFilename),
      metadata: options.metadata || {},
    });
  } finally {
    await fsPromises.unlink(filePath).catch(() => {});
  }
}

async function persistUploadedFile(file, metadata = {}) {
  if (!file?.path) {
    return "";
  }

  return persistFileFromPath(file.path, {
    filename: file.originalname || file.filename || path.basename(file.path),
    contentType: file.mimetype || inferMimeType(file.originalname || file.filename),
    metadata,
  });
}

async function findAssetById(assetId) {
  if (!isValidAssetId(assetId)) {
    return null;
  }

  const files = await getAssetBucket()
    .find({ _id: new ObjectId(assetId) })
    .limit(1)
    .toArray();

  return files[0] || null;
}

function openAssetDownloadStream(assetId) {
  return getAssetBucket().openDownloadStream(new ObjectId(assetId));
}

module.exports = {
  buildAssetPath,
  extractLegacyUploadFilename,
  extractServerAssetPath,
  findAssetById,
  inferMimeType,
  isLegacyUploadPath,
  isPersistentAssetPath,
  isValidAssetId,
  openAssetDownloadStream,
  persistFileFromPath,
  persistUploadedFile,
};
