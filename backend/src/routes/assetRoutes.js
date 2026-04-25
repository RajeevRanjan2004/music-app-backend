const express = require("express");
const {
  findAssetById,
  inferMimeType,
  isValidAssetId,
  openAssetDownloadStream,
} = require("../utils/storage");

const router = express.Router();

router.get("/:assetId", async (req, res) => {
  try {
    const { assetId } = req.params;

    if (!isValidAssetId(assetId)) {
      return res.status(404).json({ message: "Asset not found" });
    }

    const asset = await findAssetById(assetId);
    if (!asset) {
      return res.status(404).json({ message: "Asset not found" });
    }

    const filename = String(asset.filename || assetId).replaceAll('"', "");
    res.setHeader("Content-Type", asset.contentType || inferMimeType(filename));
    res.setHeader("Content-Length", String(asset.length || 0));
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    res.setHeader("Content-Disposition", `inline; filename="${filename}"`);

    const downloadStream = openAssetDownloadStream(assetId);
    downloadStream.on("error", () => {
      if (!res.headersSent) {
        res.status(404).json({ message: "Asset not found" });
        return;
      }

      res.end();
    });

    downloadStream.pipe(res);
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to stream asset" });
  }
});

module.exports = router;
