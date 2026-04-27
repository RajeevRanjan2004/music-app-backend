const Album = require("../models/Album");
const Playlist = require("../models/Playlist");
const Song = require("../models/Song");
const User = require("../models/User");
const { syncTrendingAudiusTracks } = require("./audius");

const LEGACY_SEED_IDS = ["song-1", "song-2", "song-3", "song-4", "song-5"];

async function cleanupLegacyDemoSongs() {
  const demoSongs = await Song.find({
    $or: [
      { songId: { $in: LEGACY_SEED_IDS } },
      { src: { $regex: "soundhelix", $options: "i" } },
    ],
  })
    .select("songId")
    .lean();

  if (!demoSongs.length) {
    return 0;
  }

  const songIds = demoSongs.map((song) => song.songId);

  await Song.deleteMany({ songId: { $in: songIds } });
  await User.updateMany(
    {},
    {
      $pull: {
        library: { $in: songIds },
        likes: { $in: songIds },
        recentPlays: { songId: { $in: songIds } },
      },
    }
  );
  await Playlist.updateMany({}, { $pull: { songs: { $in: songIds } } });

  const albums = await Album.find({ songs: { $in: songIds } });
  for (const album of albums) {
    const filteredSongs = album.songs.filter((songId) => !songIds.includes(songId));
    if (filteredSongs.length === album.songs.length) {
      continue;
    }

    album.songs = filteredSongs;
    album.totalSongs = filteredSongs.length;
    await album.save();
  }

  return songIds.length;
}

async function initializeSongCatalog() {
  await cleanupLegacyDemoSongs();

  try {
    await syncTrendingAudiusTracks({ force: true, limit: 24 });
  } catch (error) {
    console.warn("Audius catalog sync failed:", error.message);
  }
}

module.exports = initializeSongCatalog;
