const buckets = new Map();

function now() {
  return Date.now();
}

function createRateLimiter({ windowMs = 60_000, max = 30, keyFn } = {}) {
  return (req, res, next) => {
    const key = (keyFn ? keyFn(req) : req.ip) || "anonymous";
    const currentTime = now();

    if (!buckets.has(key)) {
      buckets.set(key, []);
    }

    const timestamps = buckets.get(key).filter((t) => currentTime - t < windowMs);
    timestamps.push(currentTime);
    buckets.set(key, timestamps);

    if (timestamps.length > max) {
      return res.status(429).json({
        message: "Too many requests. Please try again later.",
      });
    }

    return next();
  };
}

module.exports = createRateLimiter;
