const mongoose = require("mongoose");

const songSchema = new mongoose.Schema(
  {
    songId: {
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
    image: {
      type: String,
      required: true,
      trim: true,
    },
    src: {
      type: String,
      required: true,
      trim: true,
    },
    duration: {
      type: Number,
      default: 0,
    },
    language: {
      type: String,
      default: "unknown",
      trim: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
    createdByName: {
      type: String,
      default: "",
    },
    likesCount: {
      type: Number,
      default: 0,
    },
    catalogScore: {
      type: Number,
      default: 0,
    },
    albumId: {
      type: String,
      default: null,
      trim: true,
    },
    sourcePlatform: {
      type: String,
      default: "uploaded",
      trim: true,
    },
    sourceRefId: {
      type: String,
      default: null,
      trim: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Song", songSchema);
