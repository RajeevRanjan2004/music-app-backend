function normalizeEmail(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function isValidEmail(value) {
  const email = normalizeEmail(value);
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isStrongPassword(value) {
  const password = String(value || "");
  return password.length >= 6;
}

function sanitizeText(value, maxLength = 200) {
  return String(value || "").trim().slice(0, maxLength);
}

function parseNumber(value, fallback = 0) {
  const parsed = Number(value);
  if (Number.isFinite(parsed)) return parsed;
  return fallback;
}

module.exports = {
  normalizeEmail,
  isValidEmail,
  isStrongPassword,
  sanitizeText,
  parseNumber,
};
