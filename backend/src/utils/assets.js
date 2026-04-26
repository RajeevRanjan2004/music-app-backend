const DEFAULT_SONG_IMAGE = "https://picsum.photos/seed/musicfy-cover/600/600";

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
    const isKnownLocalHost = ["localhost", "127.0.0.1", "10.0.2.2"].includes(
      parsed.hostname
    );
    const isKnownLocalAssetPath =
      parsed.pathname.startsWith("/uploads/") ||
      parsed.pathname.startsWith("/api/assets/") ||
      parsed.pathname.startsWith("/api/external/");

    if (isKnownLocalHost && isKnownLocalAssetPath) {
      return parsed.pathname;
    }

    return parsed.toString();
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

function resolveSongImageUrl(value, req) {
  return resolveAssetUrl(value, req) || DEFAULT_SONG_IMAGE;
}

module.exports = {
  DEFAULT_SONG_IMAGE,
  buildUploadPath,
  resolveAssetUrl,
  resolveSongImageUrl,
};
