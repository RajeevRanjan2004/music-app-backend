const express = require("express");
const { getAudiusTrackStreamUrl } = require("../utils/audius");

const router = express.Router();

router.get("/audius/tracks/:trackId/stream", async (req, res, next) => {
  try {
    const streamUrl = await getAudiusTrackStreamUrl(req.params.trackId);

    if (!streamUrl) {
      return res.status(404).json({ message: "Track stream unavailable" });
    }

    return res.redirect(302, streamUrl);
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
