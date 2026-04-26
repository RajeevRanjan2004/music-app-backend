const express = require("express");
const fs = require("fs/promises");
const path = require("path");
const multer = require("multer");
const XLSX = require("xlsx");
const authMiddleware = require("../middleware/authMiddleware");
const requireRole = require("../middleware/roleMiddleware");
const { uploadsDir } = require("../config/paths");
const Album = require("../models/Album");
const Song = require("../models/Song");
const { sanitizeText, parseNumber } = require("../utils/validation");
const { DEFAULT_SONG_IMAGE, resolveAssetUrl, resolveSongImageUrl } = require("../utils/assets");
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
  if (file.fieldname === "audioFiles") {
    if (file.mimetype?.startsWith("audio/")) return cb(null, true);
    return cb(new Error("Invalid audio file type"));
  }

  if (file.fieldname === "coverImage") {
    if (file.mimetype?.startsWith("image/")) return cb(null, true);
    return cb(new Error("Invalid cover image type"));
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

function mapAlbum(album, req) {
  return {
    albumId: album.albumId,
    title: album.title,
    artist: album.artist,
    cover: resolveAssetUrl(album.cover, req),
    description: album.description,
    songs: album.songs,
    totalSongs: album.totalSongs,
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

// Get all albums
router.get("/", async (req, res) => {
  try {
    const albums = await Album.find({})
      .select("albumId title artist cover description songs totalSongs")
      .lean();
    return res.status(200).json({ albums: albums.map((album) => mapAlbum(album, req)) });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

// Get artist's albums (MUST be before /:albumId)
router.get("/artist/all", authMiddleware, requireRole("artist"), async (req, res) => {
  try {
    const albums = await Album.find({ createdBy: req.user.id })
      .select("albumId title artist cover description songs totalSongs")
      .lean();

    return res.status(200).json({ albums: albums.map((album) => mapAlbum(album, req)) });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

// Get album by ID with songs
router.get("/:albumId", async (req, res) => {
  try {
    const { albumId } = req.params;
    const album = await Album.findOne({ albumId }).lean();

    if (!album) {
      return res.status(404).json({ message: "Album not found" });
    }

    const songs = await Song.find({ songId: { $in: album.songs } })
      .select("songId title artist image src duration language likesCount sourcePlatform")
      .lean();

    return res.status(200).json({
      album: mapAlbum(album, req),
      songs: songs.map((song) => ({
        id: song.songId,
        title: song.title,
        artist: song.artist,
        image: resolveSongImageUrl(song.image, req),
        src: resolveAssetUrl(song.src, req),
        duration: song.duration,
        language: song.language,
        likesCount: song.likesCount,
        sourcePlatform: song.sourcePlatform || "uploaded",
      })),
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

// Create album (Artist only)
router.post("/", authMiddleware, requireRole("artist"), async (req, res) => {
  try {
    const { title, artist, cover, description } = req.body;

    if (!title || !artist) {
      return res
        .status(400)
        .json({ message: "title and artist are required" });
    }

    const albumId = `album-${Date.now()}`;

    const newAlbum = await Album.create({
      albumId,
      title: sanitizeText(title, 120),
      artist: sanitizeText(artist, 120),
      cover: cover ? sanitizeText(cover, 500) : "",
      description: description ? sanitizeText(description, 500) : "",
      songs: [],
      createdBy: req.user.id,
      createdByName: req.user.name || "",
      totalSongs: 0,
    });

    return res.status(201).json({
      message: "Album created successfully",
      album: mapAlbum(newAlbum, req),
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.post(
  "/create-with-songs",
  authMiddleware,
  requireRole("artist"),
  upload.fields([
    { name: "audioFiles", maxCount: 30 },
    { name: "coverImage", maxCount: 1 },
    { name: "metadata", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const { title, artist, description, cover } = req.body;
      const audioFiles = req.files?.audioFiles || [];
      const coverImage = req.files?.coverImage?.[0];
      const metadataFile = req.files?.metadata?.[0];

      if (!title || !artist) {
        return res.status(400).json({ message: "title and artist are required" });
      }

      if (!audioFiles.length) {
        return res.status(400).json({ message: "At least one audio file is required" });
      }

      const albumId = `album-${Date.now()}`;
      const coverUrl = coverImage
        ? await persistUploadedFile(coverImage, {
            kind: "album-cover",
            albumTitle: title,
            artist,
            uploadedBy: req.user.id,
          })
        : cover
          ? sanitizeText(cover, 500)
          : DEFAULT_SONG_IMAGE;
      const metadataMap = await parseMetadataFile(metadataFile);
      const audioPaths = [];

      for (const audio of audioFiles) {
        const persistedPath = await persistUploadedFile(audio, {
          kind: "album-song-audio",
          albumTitle: title,
          artist,
          uploadedBy: req.user.id,
        });
        audioPaths.push(persistedPath);
      }

      const album = await Album.create({
        albumId,
        title: sanitizeText(title, 120),
        artist: sanitizeText(artist, 120),
        cover: coverUrl,
        description: description ? sanitizeText(description, 500) : "",
        songs: [],
        createdBy: req.user.id,
        createdByName: req.user.name || "",
        totalSongs: 0,
      });

      const songsToCreate = audioFiles.map((audio, index) => {
        const metadata =
          metadataMap.get(normalizeKey(audio.originalname)) ||
          metadataMap.get(normalizeKey(audio.filename)) ||
          null;

        return {
          songId: `song-${Date.now()}-${index}`,
          title: metadata?.title || sanitizeText(titleFromFilename(audio.originalname), 120),
          artist: metadata?.artist || sanitizeText(artist, 120),
          image: metadata?.image || coverUrl,
          src: audioPaths[index],
          duration: metadata?.duration || 0,
          language: metadata?.language || "unknown",
          createdBy: req.user.id,
          createdByName: req.user.name || "",
          albumId,
          sourcePlatform: "uploaded",
        };
      });

      const newSongs = await Song.insertMany(songsToCreate);
      album.songs = newSongs.map((song) => song.songId);
      album.totalSongs = newSongs.length;
      await album.save();

      return res.status(201).json({
        message: "Album and songs created successfully",
        album: mapAlbum(album, req),
        songs: newSongs.map((song) => ({
          id: song.songId,
          title: song.title,
          artist: song.artist,
          image: resolveSongImageUrl(song.image, req),
          src: resolveAssetUrl(song.src, req),
          duration: song.duration,
          language: song.language,
          sourcePlatform: song.sourcePlatform || "uploaded",
        })),
      });
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  }
);

// Update album (Artist only)
router.put("/:albumId", authMiddleware, requireRole("artist"), async (req, res) => {
  try {
    const { albumId } = req.params;
    const { title, artist, cover, description } = req.body;

    const album = await Album.findOne({ albumId });

    if (!album) {
      return res.status(404).json({ message: "Album not found" });
    }

    if (album.createdBy.toString() !== req.user.id) {
      return res
        .status(403)
        .json({ message: "Only creator can update this album" });
    }

    if (title) album.title = sanitizeText(title, 120);
    if (artist) album.artist = sanitizeText(artist, 120);
    if (cover) album.cover = sanitizeText(cover, 500);
    if (description) album.description = sanitizeText(description, 500);

    await album.save();

    return res.status(200).json({
      message: "Album updated successfully",
      album: mapAlbum(album, req),
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

// Delete album (Artist only)
router.delete("/:albumId", authMiddleware, requireRole("artist"), async (req, res) => {
  try {
    const { albumId } = req.params;

    const album = await Album.findOne({ albumId });

    if (!album) {
      return res.status(404).json({ message: "Album not found" });
    }

    if (album.createdBy.toString() !== req.user.id) {
      return res
        .status(403)
        .json({ message: "Only creator can delete this album" });
    }

    // Delete all songs in the album
    await Song.deleteMany({ albumId: albumId });

    // Delete the album
    await Album.deleteOne({ albumId });

    return res.status(200).json({ message: "Album deleted successfully" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

// Add song to album
router.post("/:albumId/songs/:songId", authMiddleware, requireRole("artist"), async (req, res) => {
  try {
    const { albumId, songId } = req.params;

    const album = await Album.findOne({ albumId });

    if (!album) {
      return res.status(404).json({ message: "Album not found" });
    }

    if (album.createdBy.toString() !== req.user.id) {
      return res
        .status(403)
        .json({ message: "Only creator can add songs to this album" });
    }

    const song = await Song.findOne({ songId });

    if (!song) {
      return res.status(404).json({ message: "Song not found" });
    }

    if (!album.songs.includes(songId)) {
      album.songs.push(songId);
      album.totalSongs += 1;
      song.albumId = albumId;
      await album.save();
      await song.save();
    }

    return res.status(200).json({
      message: "Song added to album",
      album: mapAlbum(album, req),
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

// Remove song from album
router.delete("/:albumId/songs/:songId", authMiddleware, requireRole("artist"), async (req, res) => {
  try {
    const { albumId, songId } = req.params;

    const album = await Album.findOne({ albumId });

    if (!album) {
      return res.status(404).json({ message: "Album not found" });
    }

    if (album.createdBy.toString() !== req.user.id) {
      return res
        .status(403)
        .json({ message: "Only creator can remove songs from this album" });
    }

    const songIndex = album.songs.indexOf(songId);
    if (songIndex > -1) {
      album.songs.splice(songIndex, 1);
      album.totalSongs = Math.max(0, album.totalSongs - 1);

      const song = await Song.findOne({ songId });
      if (song) {
        song.albumId = null;
        await song.save();
      }

      await album.save();
    }

    return res.status(200).json({
      message: "Song removed from album",
      album: mapAlbum(album, req),
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

module.exports = router;
