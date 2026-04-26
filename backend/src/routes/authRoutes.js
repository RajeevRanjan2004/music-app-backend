const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const path = require("path");
const multer = require("multer");
const authMiddleware = require("../middleware/authMiddleware");
const createRateLimiter = require("../middleware/rateLimit");
const { uploadsDir } = require("../config/paths");
const User = require("../models/User");
const {
  normalizeEmail,
  isValidEmail,
  isStrongPassword,
  sanitizeText,
} = require("../utils/validation");
const { sendPasswordResetOtpEmail } = require("../utils/email");
const { resolveAssetUrl } = require("../utils/assets");
const { persistUploadedFile } = require("../utils/storage");

const router = express.Router();
const authLimiter = createRateLimiter({ windowMs: 60_000, max: 15 });
const forgotLimiter = createRateLimiter({ windowMs: 15 * 60_000, max: 5 });

const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const safeOriginal = String(file.originalname || "avatar")
      .replaceAll(" ", "_")
      .replaceAll(/[^a-zA-Z0-9._-]/g, "");
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}-${safeOriginal}`);
  },
});

const avatarUpload = multer({
  storage: avatarStorage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype?.startsWith("image/")) return cb(null, true);
    return cb(new Error("Invalid avatar file type"));
  },
  limits: { fileSize: 10 * 1024 * 1024 },
});

function serializeUser(user, req) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    avatar: resolveAssetUrl(user.avatar, req),
  };
}

async function registerUser(req, res, forcedRole) {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return res
        .status(400)
        .json({ message: "name, email and password are required" });
    }

    const roleFromRequest = forcedRole || role;
    const normalizedRole = roleFromRequest === "artist" ? "artist" : "user";

    const normalizedEmail = normalizeEmail(email);
    if (!isValidEmail(normalizedEmail)) {
      return res.status(400).json({ message: "Invalid email address" });
    }
    if (!isStrongPassword(password)) {
      return res
        .status(400)
        .json({ message: "Password must be at least 6 characters" });
    }

    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser) {
      return res.status(409).json({ message: "Email already registered" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      name: sanitizeText(name, 80),
      email: normalizedEmail,
      password: hashedPassword,
      role: normalizedRole,
      library: [],
    });

    const token = jwt.sign(
      { id: user._id.toString(), email: user.email, name: user.name, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.status(201).json({
      message: "Registration successful",
      token,
      user: serializeUser(user, req),
    });
  } catch (error) {
    console.error("Registration error:", error);
    return res.status(500).json({ message: error.message || "Registration failed" });
  }
}

router.post("/register", authLimiter, async (req, res) => registerUser(req, res, null));
router.post("/register/user", authLimiter, async (req, res) => registerUser(req, res, "user"));
router.post("/register/artist", authLimiter, async (req, res) => registerUser(req, res, "artist"));

router.post("/login", authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "email and password are required" });
    }

    const normalizedEmail = normalizeEmail(email);
    if (!isValidEmail(normalizedEmail)) {
      return res.status(400).json({ message: "Invalid email address" });
    }
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const passwordMatched = await bcrypt.compare(password, user.password);
    if (!passwordMatched) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: user._id.toString(), email: user.email, name: user.name, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.status(200).json({
      token,
      user: serializeUser(user, req),
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ message: error.message || "Login failed" });
  }
});

router.get("/me", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("name email role avatar");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({
      user: serializeUser(user, req),
    });
  } catch (error) {
    console.error("Get user error:", error);
    return res.status(500).json({ message: error.message || "Failed to fetch user" });
  }
});

router.put("/profile", authMiddleware, avatarUpload.single("avatar"), async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const { name, email, currentPassword, newPassword } = req.body;

    if (name) {
      user.name = sanitizeText(name, 80);
    }

    if (email) {
      const normalizedEmail = normalizeEmail(email);
      if (!isValidEmail(normalizedEmail)) {
        return res.status(400).json({ message: "Invalid email address" });
      }

      const existingUser = await User.findOne({
        email: normalizedEmail,
        _id: { $ne: user._id },
      });
      if (existingUser) {
        return res.status(409).json({ message: "Email already registered" });
      }

      user.email = normalizedEmail;
    }

    if (req.file) {
      user.avatar = await persistUploadedFile(req.file, {
        kind: "avatar",
        userId: req.user.id,
      });
    }

    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({ message: "Current password is required" });
      }
      if (!isStrongPassword(newPassword)) {
        return res.status(400).json({ message: "Password must be at least 6 characters" });
      }

      const passwordMatched = await bcrypt.compare(currentPassword, user.password);
      if (!passwordMatched) {
        return res.status(401).json({ message: "Current password is incorrect" });
      }

      user.password = await bcrypt.hash(newPassword, 10);
    }

    await user.save();

    const token = jwt.sign(
      { id: user._id.toString(), email: user.email, name: user.name, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.status(200).json({
      message: "Profile updated successfully",
      token,
      user: serializeUser(user, req),
    });
  } catch (error) {
    console.error("Profile update error:", error);
    return res.status(500).json({ message: error.message || "Failed to update profile" });
  }
});

function createOtpCode() {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
}

// Forgot Password - Generate OTP and send email
router.post("/forgot-password", forgotLimiter, async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const normalizedEmail = normalizeEmail(email);
    if (!isValidEmail(normalizedEmail)) {
      return res.status(400).json({ message: "Invalid email address" });
    }
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(200).json({
        message: "If this email is registered, an OTP has been sent.",
      });
    }

    const otpCode = createOtpCode();
    const resetOtpHash = crypto
      .createHash("sha256")
      .update(otpCode)
      .digest("hex");
    const resetOtpExpiry = new Date(Date.now() + 10 * 60 * 1000);

    user.resetOtpHash = resetOtpHash;
    user.resetOtpExpiry = resetOtpExpiry;
    await user.save();

    await sendPasswordResetOtpEmail({
      toEmail: user.email,
      userName: user.name,
      otpCode,
    });

    return res.status(200).json({
      message: "If this email is registered, an OTP has been sent.",
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    return res.status(500).json({ message: error.message || "Failed to send OTP" });
  }
});

// Reset Password - Verify OTP and update password
router.post("/reset-password", forgotLimiter, async (req, res) => {
  try {
    const { otp, newPassword } = req.body;

    if (!otp || !newPassword) {
      return res.status(400).json({ message: "OTP and new password are required" });
    }
    if (!isStrongPassword(newPassword)) {
      return res
        .status(400)
        .json({ message: "Password must be at least 6 characters" });
    }

    const resetOtpHash = crypto.createHash("sha256").update(String(otp)).digest("hex");
    const user = await User.findOne({
      resetOtpHash,
      resetOtpExpiry: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    user.resetOtpHash = null;
    user.resetOtpExpiry = null;
    await user.save();

    return res.status(200).json({ message: "Password reset successful" });
  } catch (error) {
    console.error("Reset password error:", error);
    return res.status(500).json({ message: error.message || "Password reset failed" });
  }
});

module.exports = router;
