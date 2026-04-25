const mongoose = require("mongoose");

const albumSchema = new mongoose.Schema(
  {
    albumId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    artist: {
      type: String,
      required: true,
      trim: true,
    },
    cover: {
      type: String,
      required: false,
      trim: true,
    },
    description: {
      type: String,
      default: "",
      trim: true,
    },
    songs: {
      type: [String], // Array of song IDs
      default: [],
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    createdByName: {
      type: String,
      default: "",
    },
    totalSongs: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Album", albumSchema);
