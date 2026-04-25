const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    avatar: {
      type: String,
      default: "",
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ["user", "artist"],
      default: "user",
      required: true,
    },
    library: {
      type: [String],
      default: [],
    },
    likes: {
      type: [String],
      default: [],
    },
    resetOtpHash: {
      type: String,
      default: null,
    },
    resetOtpExpiry: {
      type: Date,
      default: null,
    },
    recentPlays: {
      type: [
        {
          songId: { type: String, required: true },
          lastPosition: { type: Number, default: 0 },
          duration: { type: Number, default: 0 },
          completed: { type: Boolean, default: false },
          playedAt: { type: Date, default: Date.now },
        },
      ],
      default: [],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
