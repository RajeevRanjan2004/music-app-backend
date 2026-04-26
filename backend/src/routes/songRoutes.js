const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const requireRole = require("../middleware/roleMiddleware");
const User = require("../models/User");
const Song = require("../models/Song");
const { sanitizeText, parseNumber } = require("../utils/validation");
const { DEFAULT_SONG_IMAGE, resolveAssetUrl, resolveSongImageUrl } = require("../utils/assets");
const { searchAudiusTracks, syncTrendingAudiusTracks } = require("../utils/audius");

const router = express.Router();

function mapSong(song, req) {
  return {
    id: song.songId,
    title: song.title,
    artist: song.artist,
    image: resolveSongImageUrl(song.image, req),
    src: resolveAssetUrl(song.src, req),
    duration: song.duration,
    language: song.language,
    likesCount: song.likesCount || 0,
    albumId: song.albumId || null,
    createdBy: song.createdBy ? String(song.createdBy) : null,
    createdByName: song.createdByName || "",
    createdAt: song.createdAt,
    sourcePlatform: song.sourcePlatform || "uploaded",
  };
}

function buildSongQuery(query) {
  const filters = {};

  if (query.language) {
    filters.language = { $regex: String(query.language), $options: "i" };
  }
  if (query.artist) {
    filters.artist = { $regex: String(query.artist), $options: "i" };
  }
  if (query.albumId) {
    filters.albumId = String(query.albumId);
  }

  return filters;
}

function buildSort(sort) {
  if (sort === "likes") return { catalogScore: -1, likesCount: -1, createdAt: -1 };
  if (sort === "title") return { title: 1 };
  if (sort === "recent") return { createdAt: -1 };
  return { createdAt: -1 };
}

function selectProjection() {
  return "songId title artist image src duration language likesCount albumId createdBy createdByName createdAt sourcePlatform sourceRefId catalogScore";
}

router.get("/", async (req, res) => {
  const filters = buildSongQuery(req.query);
  const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 100));

  if (
    req.query.sort === "likes" &&
    !req.query.albumId &&
    !req.query.artist &&
    !req.query.language
  ) {
    await syncTrendingAudiusTracks({ limit }).catch(() => {});
  }

  const songs = await Song.find(filters)
    .select(selectProjection())
    .sort(buildSort(req.query.sort))
    .limit(limit)
    .lean();

  return res.status(200).json({ songs: songs.map((song) => mapSong(song, req)) });
});

router.get("/artist/my", authMiddleware, requireRole("artist"), async (req, res) => {
  const songs = await Song.find({ createdBy: req.user.id })
    .select(selectProjection())
    .sort({ createdAt: -1 })
    .lean();
  return res.status(200).json({ songs: songs.map((song) => mapSong(song, req)) });
});

router.get("/search", async (req, res) => {
  const q = String(req.query.q || "").trim();
  const regionHint = String(req.query.region || "").trim();
  const filters = buildSongQuery(req.query);
  const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 100));

  if (q) {
    await searchAudiusTracks({
      query: q,
      regionHint,
      limit: Math.min(limit, 80),
    }).catch(() => {});
  } else if (
    req.query.sort === "likes" &&
    !req.query.albumId &&
    !req.query.artist &&
    !req.query.language
  ) {
    await syncTrendingAudiusTracks({ limit }).catch(() => {});
  }

  if (q) {
    filters.$or = [
      { title: { $regex: q, $options: "i" } },
      { artist: { $regex: q, $options: "i" } },
      { language: { $regex: q, $options: "i" } },
    ];
  }

  const filteredSongs = await Song.find(filters)
    .select(selectProjection())
    .sort(buildSort(req.query.sort))
    .limit(limit)
    .lean();

  return res.status(200).json({ songs: filteredSongs.map((song) => mapSong(song, req)) });
});

router.get("/library", authMiddleware, async (req, res) => {
  const currentUser = await User.findById(req.user.id).lean();

  if (!currentUser) {
    return res.status(404).json({ message: "User not found" });
  }

  const librarySongs = await Song.find({ songId: { $in: currentUser.library } })
    .select(selectProjection())
    .lean();

  return res.status(200).json({ songs: librarySongs.map((song) => mapSong(song, req)) });
});

router.post("/library/:songId", authMiddleware, async (req, res) => {
  const { songId } = req.params;
  const currentUser = await User.findById(req.user.id);

  if (!currentUser) {
    return res.status(404).json({ message: "User not found" });
  }

  const songExists = await Song.exists({ songId });
  if (!songExists) {
    return res.status(404).json({ message: "Song not found" });
  }

  if (!currentUser.library.includes(songId)) {
    currentUser.library.push(songId);
    await currentUser.save();
  }

  return res.status(200).json({ message: "Song added to library" });
});

router.delete("/library/:songId", authMiddleware, async (req, res) => {
  const { songId } = req.params;
  const currentUser = await User.findById(req.user.id);

  if (!currentUser) {
    return res.status(404).json({ message: "User not found" });
  }

  currentUser.library = currentUser.library.filter((id) => id !== songId);
  await currentUser.save();

  return res.status(200).json({ message: "Song removed from library" });
});

router.get("/recent", authMiddleware, async (req, res) => {
  const currentUser = await User.findById(req.user.id).lean();
  if (!currentUser) {
    return res.status(404).json({ message: "User not found" });
  }

  const plays = (currentUser.recentPlays || [])
    .slice()
    .sort((a, b) => new Date(b.playedAt) - new Date(a.playedAt))
    .slice(0, 30);

  if (!plays.length) {
    return res.status(200).json({ recent: [] });
  }

  const songs = await Song.find({ songId: { $in: plays.map((play) => play.songId) } })
    .select(selectProjection())
    .lean();
  const songMap = new Map(songs.map((song) => [song.songId, song]));

  const recent = plays
    .map((play) => {
      const song = songMap.get(play.songId);
      if (!song) return null;
      return {
        ...mapSong(song, req),
        lastPosition: play.lastPosition || 0,
        playedAt: play.playedAt,
        completed: Boolean(play.completed),
      };
    })
    .filter(Boolean);

  return res.status(200).json({ recent });
});

router.get("/continue", authMiddleware, async (req, res) => {
  const currentUser = await User.findById(req.user.id).lean();
  if (!currentUser) {
    return res.status(404).json({ message: "User not found" });
  }

  const plays = (currentUser.recentPlays || [])
    .filter((play) => (play.lastPosition || 0) > 0 && !play.completed)
    .sort((a, b) => new Date(b.playedAt) - new Date(a.playedAt))
    .slice(0, 12);

  if (!plays.length) {
    return res.status(200).json({ songs: [] });
  }

  const songs = await Song.find({ songId: { $in: plays.map((play) => play.songId) } })
    .select(selectProjection())
    .lean();
  const songMap = new Map(songs.map((song) => [song.songId, song]));

  const continueSongs = plays
    .map((play) => {
      const song = songMap.get(play.songId);
      if (!song) return null;
      return {
        ...mapSong(song, req),
        lastPosition: play.lastPosition || 0,
        completed: Boolean(play.completed),
      };
    })
    .filter(Boolean);

  return res.status(200).json({ songs: continueSongs });
});

router.post("/:songId/progress", authMiddleware, async (req, res) => {
  const { songId } = req.params;
  const position = Math.max(0, parseNumber(req.body.position, 0));
  const duration = Math.max(0, parseNumber(req.body.duration, 0));
  const completed = Boolean(req.body.completed) || (duration > 0 && position >= duration - 2);

  const currentUser = await User.findById(req.user.id);
  if (!currentUser) {
    return res.status(404).json({ message: "User not found" });
  }

  const song = await Song.findOne({ songId }).select("songId");
  if (!song) {
    return res.status(404).json({ message: "Song not found" });
  }

  const index = currentUser.recentPlays.findIndex((play) => play.songId === songId);
  const payload = {
    songId,
    lastPosition: position,
    duration,
    completed,
    playedAt: new Date(),
  };

  if (index >= 0) {
    currentUser.recentPlays[index] = payload;
  } else {
    currentUser.recentPlays.push(payload);
  }

  if (currentUser.recentPlays.length > 100) {
    currentUser.recentPlays = currentUser.recentPlays
      .sort((a, b) => new Date(b.playedAt) - new Date(a.playedAt))
      .slice(0, 100);
  }

  await currentUser.save();
  return res.status(200).json({ message: "Progress saved" });
});

router.post("/", authMiddleware, requireRole("artist"), async (req, res) => {
  const { title, artist, image, src, duration, language } = req.body;

  if (!title || !artist || !src) {
    return res
      .status(400)
      .json({ message: "title, artist and src are required" });
  }

  const songId = `song-${Date.now()}`;

  const newSong = await Song.create({
    songId,
    title: sanitizeText(title, 120),
    artist: sanitizeText(artist, 120),
    image: image ? sanitizeText(image, 500) : DEFAULT_SONG_IMAGE,
    src: sanitizeText(src, 500),
    duration: Math.max(0, parseNumber(duration, 0)),
    language: language ? sanitizeText(language, 40) : "unknown",
    createdBy: req.user.id,
    createdByName: req.user.name || "",
    sourcePlatform: "uploaded",
  });

  return res.status(201).json({
    message: "Song created successfully",
    song: mapSong(newSong, req),
  });
});

router.put("/:songId", authMiddleware, requireRole("artist"), async (req, res) => {
  const { songId } = req.params;
  const { title, artist, image, src, duration, language } = req.body;

  const song = await Song.findOne({ songId });
  if (!song) {
    return res.status(404).json({ message: "Song not found" });
  }

  if (song.sourcePlatform === "audius") {
    return res.status(403).json({ message: "Online catalog songs cannot be edited" });
  }

  if (song.createdBy && song.createdBy.toString() !== req.user.id) {
    return res.status(403).json({ message: "Only creator can update this song" });
  }

  if (title) song.title = sanitizeText(title, 120);
  if (artist) song.artist = sanitizeText(artist, 120);
  if (image) song.image = sanitizeText(image, 500);
  if (src) song.src = sanitizeText(src, 500);
  if (duration !== undefined) song.duration = Math.max(0, parseNumber(duration, song.duration));
  if (language) song.language = sanitizeText(language, 40);

  await song.save();

  return res.status(200).json({
    message: "Song updated successfully",
    song: mapSong(song, req),
  });
});

router.delete("/:songId", authMiddleware, requireRole("artist"), async (req, res) => {
  const { songId } = req.params;

  const song = await Song.findOne({ songId });
  if (!song) {
    return res.status(404).json({ message: "Song not found" });
  }

  if (song.sourcePlatform === "audius") {
    return res.status(403).json({ message: "Online catalog songs cannot be deleted" });
  }

  if (song.createdBy && song.createdBy.toString() !== req.user.id) {
    return res.status(403).json({ message: "Only creator can delete this song" });
  }

  await Song.deleteOne({ songId });

  return res.status(200).json({ message: "Song deleted successfully" });
});

router.post("/:songId/like", authMiddleware, async (req, res) => {
  const { songId } = req.params;
  const currentUser = await User.findById(req.user.id);

  if (!currentUser) {
    return res.status(404).json({ message: "User not found" });
  }

  const song = await Song.findOne({ songId });
  if (!song) {
    return res.status(404).json({ message: "Song not found" });
  }

  if (!currentUser.likes.includes(songId)) {
    currentUser.likes.push(songId);
    song.likesCount = (song.likesCount || 0) + 1;
    await currentUser.save();
    await song.save();
  }

  return res.status(200).json({ message: "Song liked successfully" });
});

router.delete("/:songId/like", authMiddleware, async (req, res) => {
  const { songId } = req.params;
  const currentUser = await User.findById(req.user.id);

  if (!currentUser) {
    return res.status(404).json({ message: "User not found" });
  }

  const song = await Song.findOne({ songId });
  if (!song) {
    return res.status(404).json({ message: "Song not found" });
  }

  const likedIndex = currentUser.likes.indexOf(songId);
  if (likedIndex > -1) {
    currentUser.likes.splice(likedIndex, 1);
    song.likesCount = Math.max(0, (song.likesCount || 1) - 1);
    await currentUser.save();
    await song.save();
  }

  return res.status(200).json({ message: "Song unliked successfully" });
});

router.get("/:songId/likes", authMiddleware, async (req, res) => {
  const { songId } = req.params;
  const currentUser = await User.findById(req.user.id);

  if (!currentUser) {
    return res.status(404).json({ message: "User not found" });
  }

  const song = await Song.findOne({ songId });
  if (!song) {
    return res.status(404).json({ message: "Song not found" });
  }

  return res.status(200).json({
    songId,
    isLiked: currentUser.likes.includes(songId),
    likesCount: song.likesCount || 0,
  });
});

router.get("/liked/songs", authMiddleware, async (req, res) => {
  const currentUser = await User.findById(req.user.id).lean();

  if (!currentUser) {
    return res.status(404).json({ message: "User not found" });
  }

  const likedSongs = await Song.find({ songId: { $in: currentUser.likes } })
    .select(selectProjection())
    .lean();

  return res.status(200).json({ songs: likedSongs.map((song) => mapSong(song, req)) });
});

module.exports = router;
