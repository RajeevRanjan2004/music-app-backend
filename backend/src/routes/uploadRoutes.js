const express = require("express");
const path = require("path");
const fs = require("fs/promises");
const multer = require("multer");
const XLSX = require("xlsx");
const authMiddleware = require("../middleware/authMiddleware");
const requireRole = require("../middleware/roleMiddleware");
const { uploadsDir } = require("../config/paths");
const Song = require("../models/Song");
const { sanitizeText, parseNumber } = require("../utils/validation");
const { buildUploadPath, resolveAssetUrl } = require("../utils/assets");
const { persistUploadedFile } = require("../utils/storage");

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const safeOriginal = String(file.originalname || "file")
      .replaceAll(" ", "_")
      .replaceAll(/[^a-zA-Z0-9._-]/g, "");
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}-${safeOriginal}`);
  },
});

function fileFilter(req, file, cb) {
  if (file.fieldname === "audio" || file.fieldname === "audioFiles") {
    if (file.mimetype?.startsWith("audio/")) return cb(null, true);
    return cb(new Error("Invalid audio file type"));
  }

  if (file.fieldname === "image") {
    if (file.mimetype?.startsWith("image/")) return cb(null, true);
    return cb(new Error("Invalid image file type"));
  }

  if (file.fieldname === "metadata") {
    const ext = path.extname(file.originalname || "").toLowerCase();
    if ([".csv", ".tsv", ".xlsx", ".xls"].includes(ext)) return cb(null, true);
    return cb(new Error("Invalid metadata file type"));
  }

  return cb(new Error("Unexpected upload field"));
}

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024,
  },
});

function mapSong(song, req) {
  return {
    id: song.songId,
    title: song.title,
    artist: song.artist,
    image: resolveAssetUrl(song.image, req),
    src: resolveAssetUrl(song.src, req),
    duration: song.duration,
    language: song.language,
  };
}

function titleFromFilename(filename) {
  return String(filename || "Untitled Song")
    .replace(/\.[^.]+$/, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\.[^.]+$/, "");
}

async function parseMetadataFile(file) {
  if (!file) return new Map();

  try {
    const ext = path.extname(file.originalname || file.filename || "").toLowerCase();
    let workbook;

    if (ext === ".csv" || ext === ".tsv") {
      const fileContent = await fs.readFile(file.path, "utf8");
      workbook = XLSX.read(fileContent, {
        type: "string",
        FS: ext === ".tsv" ? "\t" : ",",
      });
    } else {
      workbook = XLSX.readFile(file.path);
    }

    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
    const metadataMap = new Map();

    rows.forEach((row) => {
      const rowKey =
        row.filename ||
        row.fileName ||
        row.file ||
        row.audio ||
        row.song ||
        row.track ||
        "";
      const normalized = normalizeKey(rowKey);
      if (!normalized) return;

      metadataMap.set(normalized, {
        title: sanitizeText(row.title || row.songTitle || titleFromFilename(rowKey), 120),
        artist: sanitizeText(row.artist || "", 120),
        language: sanitizeText(row.language || "", 40),
        duration: Math.max(0, parseNumber(row.duration, 0)),
        image: sanitizeText(row.image || row.cover || "", 500),
      });
    });

    return metadataMap;
  } finally {
    await fs.unlink(file.path).catch(() => {});
  }
}

router.post(
  "/",
  authMiddleware,
  requireRole("artist"),
  upload.fields([
    { name: "audio", maxCount: 1 },
    { name: "image", maxCount: 1 },
  ]),
  async (req, res) => {
    const audio = req.files?.audio?.[0];
    const image = req.files?.image?.[0];

    if (!audio) {
      return res.status(400).json({ message: "audio file is required" });
    }

    const audioPath = await persistUploadedFile(audio, {
      kind: "standalone-upload",
      uploadedBy: req.user.id,
    });
    const imagePath = image
      ? await persistUploadedFile(image, {
          kind: "standalone-image",
          uploadedBy: req.user.id,
        })
      : "";

    return res.status(201).json({
      message: "Uploaded",
      audioUrl: resolveAssetUrl(audioPath, req),
      imageUrl: resolveAssetUrl(imagePath, req),
    });
  }
);

// Create song directly from file upload
router.post(
  "/create-song",
  authMiddleware,
  requireRole("artist"),
  upload.fields([
    { name: "audio", maxCount: 1 },
    { name: "image", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const { title, artist, language, duration } = req.body;
      const audio = req.files?.audio?.[0];
      const image = req.files?.image?.[0];

      if (!audio) {
        return res.status(400).json({ message: "audio file is required" });
      }

      if (!title || !artist) {
        return res.status(400).json({ message: "title and artist are required" });
      }

      const audioPath = await persistUploadedFile(audio, {
        kind: "song-audio",
        songTitle: title,
        artist,
        uploadedBy: req.user.id,
      });
      const imagePath = image
        ? await persistUploadedFile(image, {
            kind: "song-cover",
            songTitle: title,
            artist,
            uploadedBy: req.user.id,
          })
        : "";

      const songId = `song-${Date.now()}`;

      const newSong = await Song.create({
        songId,
        title: sanitizeText(title, 120),
        artist: sanitizeText(artist, 120),
        image: imagePath,
        src: audioPath,
        duration: Math.max(0, parseNumber(duration, 0)),
        language: language ? sanitizeText(language, 40) : "unknown",
        createdBy: req.user.id,
        createdByName: req.user.name || "",
      });

      return res.status(201).json({
        message: "Song created successfully",
        song: mapSong(newSong, req),
      });
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  }
);

router.post(
  "/create-songs-bulk",
  authMiddleware,
  requireRole("artist"),
  upload.fields([
    { name: "audioFiles", maxCount: 25 },
    { name: "image", maxCount: 1 },
    { name: "metadata", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const { artist, language } = req.body;
      const audioFiles = req.files?.audioFiles || [];
      const image = req.files?.image?.[0];
      const metadataFile = req.files?.metadata?.[0];

      if (!artist) {
        return res.status(400).json({ message: "artist is required" });
      }

      if (!audioFiles.length) {
        return res.status(400).json({ message: "At least one audio file is required" });
      }

      const imagePath = image
        ? await persistUploadedFile(image, {
            kind: "bulk-song-cover",
            artist,
            uploadedBy: req.user.id,
          })
        : "https://picsum.photos/300/300";
      const metadataMap = await parseMetadataFile(metadataFile);
      const audioPaths = [];

      for (const audio of audioFiles) {
        const persistedPath = await persistUploadedFile(audio, {
          kind: "bulk-song-audio",
          artist,
          uploadedBy: req.user.id,
        });
        audioPaths.push(persistedPath);
      }

      const songsToCreate = audioFiles.map((audio, index) => {
        const metadata =
          metadataMap.get(normalizeKey(audio.originalname)) ||
          metadataMap.get(normalizeKey(audio.filename)) ||
          null;

        return {
          songId: `song-${Date.now()}-${index}`,
          title: metadata?.title || sanitizeText(titleFromFilename(audio.originalname), 120),
          artist: metadata?.artist || sanitizeText(artist, 120),
          image: metadata?.image || imagePath,
          src: audioPaths[index],
          duration: metadata?.duration || 0,
          language:
            metadata?.language || (language ? sanitizeText(language, 40) : "unknown"),
          createdBy: req.user.id,
          createdByName: req.user.name || "",
        };
      });

      const newSongs = await Song.insertMany(songsToCreate);

      return res.status(201).json({
        message: `${newSongs.length} songs created successfully`,
        songs: newSongs.map((song) => mapSong(song, req)),
      });
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  }
);

module.exports = router;
