const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
const authRoutes = require("./routes/authRoutes");
const songRoutes = require("./routes/songRoutes");
const uploadRoutes = require("./routes/uploadRoutes");
const albumRoutes = require("./routes/albumRoutes");
const playlistRoutes = require("./routes/playlistRoutes");
const assetRoutes = require("./routes/assetRoutes");
const connectDb = require("./config/db");
const { uploadsDir, ensureUploadsDir } = require("./config/paths");
const seedSongsIfEmpty = require("./utils/seedSongs");

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

app.set("trust proxy", 1);

// CORS configuration - allow multiple localhost ports for development
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl requests)
    if (!origin) return callback(null, true);

    // Allow any localhost port in development
    if (origin.includes("localhost") || origin.includes("127.0.0.1")) {
      return callback(null, true);
    }

    // Also allow origins from CLIENT_ORIGIN env variable
    const clientOrigins = (process.env.CLIENT_ORIGIN || "")
      .split(",")
      .map((o) => o.trim())
      .filter(Boolean);

    if (clientOrigins.includes(origin)) {
      return callback(null, true);
    }

    callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));
app.use(express.json());
app.use("/uploads", express.static(uploadsDir));

app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    message: "Spotify backend running",
    timestamp: new Date().toISOString(),
  });
});

app.use("/api/assets", assetRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/songs", songRoutes);
app.use("/api/uploads", uploadRoutes);
app.use("/api/albums", albumRoutes);
app.use("/api/playlists", playlistRoutes);

app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error("Global error handler:", err);
  const status = err.status || 500;
  const message = err.message || "Internal server error";
  res.status(status).json({ message });
});

async function startServer() {
  try {
    ensureUploadsDir();
    await connectDb();
    await seedSongsIfEmpty();

    app.listen(port, () => {
      console.log(`Backend server running at http://localhost:${port}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error.message);
    process.exit(1);
  }
}

startServer();
