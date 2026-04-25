const Song = require("../models/Song");
const songs = require("../data/songs");

async function seedSongsIfEmpty() {
  const songsCount = await Song.countDocuments();
  if (songsCount > 0) {
    return;
  }

  const docs = songs.map((song) => ({
    songId: song.id,
    title: song.title,
    artist: song.artist,
    image: song.image,
    src: song.src,
    duration: song.duration || 0,
  }));

  await Song.insertMany(docs);
  console.log("Default songs seeded");
}

module.exports = seedSongsIfEmpty;
