const fs = require("fs");
const path = require("path");

const uploadsDir =
  process.env.UPLOADS_DIR || path.join(__dirname, "..", "..", "uploads");

function ensureUploadsDir() {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

module.exports = {
  uploadsDir,
  ensureUploadsDir,
};
