const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");
const connectDb = require("../config/db");
const { uploadsDir } = require("../config/paths");
const Song = require("../models/Song");
const Album = require("../models/Album");
const User = require("../models/User");
const {
  extractLegacyUploadFilename,
  isLegacyUploadPath,
  isPersistentAssetPath,
  persistFileFromPath,
} = require("../utils/storage");

dotenv.config({ path: path.join(__dirname, "..", "..", ".env") });

const targets = [
  { label: "songs", Model: Song, fields: ["src", "image"] },
  { label: "albums", Model: Album, fields: ["cover"] },
  { label: "users", Model: User, fields: ["avatar"] },
];

function buildLegacyQuery(fields) {
  return {
    $or: fields.map((field) => ({
      [field]: { $regex: "(^/uploads/|^https?://[^/]+/uploads/)" },
    })),
  };
}

async function migrateDocuments() {
  const migratedFiles = new Map();
  const summary = {
    documentsUpdated: 0,
    fieldsUpdated: 0,
    missingFiles: [],
  };

  for (const target of targets) {
    const documents = await target.Model.find(buildLegacyQuery(target.fields));

    for (const document of documents) {
      let changed = false;

      for (const field of target.fields) {
        const currentValue = document[field];
        if (!currentValue || isPersistentAssetPath(currentValue) || !isLegacyUploadPath(currentValue)) {
          continue;
        }

        const filename = extractLegacyUploadFilename(currentValue);
        if (!filename) {
          continue;
        }

        if (migratedFiles.has(filename)) {
          document[field] = migratedFiles.get(filename);
          changed = true;
          summary.fieldsUpdated += 1;
          continue;
        }

        const localFilePath = path.join(uploadsDir, filename);
        if (!fs.existsSync(localFilePath)) {
          summary.missingFiles.push({
            model: target.label,
            id: String(document._id),
            field,
            filename,
          });
          continue;
        }

        const assetPath = await persistFileFromPath(localFilePath, {
          filename,
          metadata: {
            migratedFrom: currentValue,
            sourceModel: target.label,
            sourceField: field,
          },
        });

        migratedFiles.set(filename, assetPath);
        document[field] = assetPath;
        changed = true;
        summary.fieldsUpdated += 1;
      }

      if (changed) {
        await document.save();
        summary.documentsUpdated += 1;
      }
    }
  }

  return summary;
}

async function run() {
  try {
    await connectDb();
    const summary = await migrateDocuments();
    console.log(JSON.stringify(summary, null, 2));
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

void run();
