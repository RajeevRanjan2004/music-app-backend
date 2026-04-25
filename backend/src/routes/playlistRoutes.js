const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const Playlist = require("../models/Playlist");
const Song = require("../models/Song");
const { sanitizeText } = require("../utils/validation");

const router = express.Router();

function mapPlaylist(playlist) {
  return {
    playlistId: playlist.playlistId,
    name: playlist.name,
    description: playlist.description || "",
    cover: playlist.cover || "",
    isPublic: Boolean(playlist.isPublic),
    songs: playlist.songs || [],
    createdBy: playlist.createdBy,
    createdByName: playlist.createdByName || "",
    createdAt: playlist.createdAt,
    updatedAt: playlist.updatedAt,
  };
}

router.get("/", authMiddleware, async (req, res) => {
  const own = await Playlist.find({ createdBy: req.user.id }).sort({ updatedAt: -1 }).lean();
  const published = await Playlist.find({ isPublic: true, createdBy: { $ne: req.user.id } })
    .sort({ updatedAt: -1 })
    .limit(30)
    .lean();

  return res.status(200).json({
    own: own.map(mapPlaylist),
    public: published.map(mapPlaylist),
  });
});

router.post("/", authMiddleware, async (req, res) => {
  const { name, description, cover, isPublic } = req.body;
  if (!name) {
    return res.status(400).json({ message: "Playlist name is required" });
  }

  const playlist = await Playlist.create({
    playlistId: `playlist-${Date.now()}`,
    name: sanitizeText(name, 80),
    description: sanitizeText(description, 300),
    cover: sanitizeText(cover, 500),
    isPublic: Boolean(isPublic),
    songs: [],
    createdBy: req.user.id,
    createdByName: req.user.name || "",
  });

  return res.status(201).json({ playlist: mapPlaylist(playlist) });
});

router.put("/:playlistId", authMiddleware, async (req, res) => {
  const { playlistId } = req.params;
  const playlist = await Playlist.findOne({ playlistId });

  if (!playlist) {
    return res.status(404).json({ message: "Playlist not found" });
  }
  if (playlist.createdBy.toString() !== req.user.id) {
    return res.status(403).json({ message: "Only creator can update this playlist" });
  }

  const { name, description, cover, isPublic } = req.body;
  if (name !== undefined) playlist.name = sanitizeText(name, 80);
  if (description !== undefined) playlist.description = sanitizeText(description, 300);
  if (cover !== undefined) playlist.cover = sanitizeText(cover, 500);
  if (isPublic !== undefined) playlist.isPublic = Boolean(isPublic);

  await playlist.save();
  return res.status(200).json({ playlist: mapPlaylist(playlist) });
});

router.delete("/:playlistId", authMiddleware, async (req, res) => {
  const { playlistId } = req.params;
  const playlist = await Playlist.findOne({ playlistId });

  if (!playlist) {
    return res.status(404).json({ message: "Playlist not found" });
  }
  if (playlist.createdBy.toString() !== req.user.id) {
    return res.status(403).json({ message: "Only creator can delete this playlist" });
  }

  await Playlist.deleteOne({ playlistId });
  return res.status(200).json({ message: "Playlist deleted successfully" });
});

router.post("/:playlistId/songs/:songId", authMiddleware, async (req, res) => {
  const { playlistId, songId } = req.params;
  const playlist = await Playlist.findOne({ playlistId });
  if (!playlist) {
    return res.status(404).json({ message: "Playlist not found" });
  }
  if (playlist.createdBy.toString() !== req.user.id) {
    return res.status(403).json({ message: "Only creator can update this playlist" });
  }

  const song = await Song.findOne({ songId }).select("songId");
  if (!song) {
    return res.status(404).json({ message: "Song not found" });
  }

  if (!playlist.songs.includes(songId)) {
    playlist.songs.push(songId);
    await playlist.save();
  }

  return res.status(200).json({ playlist: mapPlaylist(playlist) });
});

router.delete("/:playlistId/songs/:songId", authMiddleware, async (req, res) => {
  const { playlistId, songId } = req.params;
  const playlist = await Playlist.findOne({ playlistId });
  if (!playlist) {
    return res.status(404).json({ message: "Playlist not found" });
  }
  if (playlist.createdBy.toString() !== req.user.id) {
    return res.status(403).json({ message: "Only creator can update this playlist" });
  }

  playlist.songs = playlist.songs.filter((id) => id !== songId);
  await playlist.save();
  return res.status(200).json({ playlist: mapPlaylist(playlist) });
});

router.get("/:playlistId", authMiddleware, async (req, res) => {
  const { playlistId } = req.params;
  const playlist = await Playlist.findOne({ playlistId }).lean();

  if (!playlist) {
    return res.status(404).json({ message: "Playlist not found" });
  }
  if (!playlist.isPublic && String(playlist.createdBy) !== req.user.id) {
    return res.status(403).json({ message: "Private playlist" });
  }

  const songs = await Song.find({ songId: { $in: playlist.songs || [] } })
    .select("songId title artist image src duration language likesCount createdByName")
    .lean();

  return res.status(200).json({
    playlist: mapPlaylist(playlist),
    songs: songs.map((song) => ({
      id: song.songId,
      title: song.title,
      artist: song.artist,
      image: song.image,
      src: song.src,
      duration: song.duration,
      language: song.language,
      likesCount: song.likesCount || 0,
      createdByName: song.createdByName || "",
    })),
  });
});

module.exports = router;
