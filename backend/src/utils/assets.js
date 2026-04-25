function getBaseUrl(req) {
  return `${req.protocol}://${req.get("host")}`;
}

function buildUploadPath(filename) {
  if (!filename) {
    return "";
  }

  return `/uploads/${filename}`;
}

function normalizeUploadPath(value) {
  const asset = String(value || "").trim();

  if (!asset) {
    return "";
  }

  if (asset.startsWith("/")) {
    return asset;
  }

  try {
    const parsed = new URL(asset);
    if (parsed.pathname.startsWith("/")) {
      return parsed.pathname;
    }
  } catch {
    return asset;
  }

  return asset;
}

function resolveAssetUrl(value, req) {
  const asset = normalizeUploadPath(value);

  if (!asset) {
    return "";
  }

  if (asset.startsWith("/")) {
    return `${getBaseUrl(req)}${asset}`;
  }

  return asset;
}

module.exports = {
  buildUploadPath,
  resolveAssetUrl,
};
