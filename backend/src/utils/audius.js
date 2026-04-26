const Song = require("../models/Song");

const AUDIUS_API_BASE_URL =
  process.env.AUDIUS_API_BASE_URL || "https://api.audius.co/v1";
const AUDIUS_TRENDING_CACHE_MS = Math.max(
  60 * 1000,
  Number(process.env.AUDIUS_TRENDING_CACHE_MS) || 30 * 60 * 1000
);

let lastTrendingSyncAt = 0;
let trendingSyncPromise = null;

function buildAudiusUrl(pathname, params = {}) {
  const normalizedBase = AUDIUS_API_BASE_URL.replace(/\/+$/, "");
  const normalizedPath = String(pathname || "").replace(/^\/+/, "");
  const url = new URL(`${normalizedBase}/${normalizedPath}`);

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") {
      return;
    }

    url.searchParams.set(key, String(value));
  });

  if (process.env.AUDIUS_API_KEY) {
    url.searchParams.set("api_key", process.env.AUDIUS_API_KEY);
  }

  return url;
}

function getAudiusHeaders() {
  const headers = {
    Accept: "application/json",
  };

  if (process.env.AUDIUS_BEARER_TOKEN) {
    headers.Authorization = `Bearer ${process.env.AUDIUS_BEARER_TOKEN}`;
  }

  return headers;
}

async function fetchAudiusJson(pathname, params = {}) {
  const response = await fetch(buildAudiusUrl(pathname, params), {
    headers: getAudiusHeaders(),
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || `Audius request failed (${response.status})`);
  }

  return data;
}

function pickFirstNonEmpty(values, fallback = "") {
  const match = values.find((value) => typeof value === "string" && value.trim());
  return match ? match.trim() : fallback;
}

function normalizeAudiusTrack(track) {
  if (!track?.id || !track?.is_streamable || track?.access?.stream === false) {
    return null;
  }

  return {
    songId: `audius-${track.id}`,
    title: String(track.title || "Untitled Song").trim(),
    artist: pickFirstNonEmpty(
      [track.user?.name, track.user?.handle, track.user?.handle_lc],
      "Audius Artist"
    ),
    image: pickFirstNonEmpty(
      [
        track.artwork?.["480x480"],
        track.artwork?.["1000x1000"],
        track.artwork?.["150x150"],
        track.user?.profile_picture?.["480x480"],
        track.user?.profile_picture?.["150x150"],
      ],
      "https://picsum.photos/300/300"
    ),
    src: `/api/external/audius/tracks/${encodeURIComponent(track.id)}/stream`,
    duration: Number(track.duration) || 0,
    language: String(track.genre || "Audius").trim(),
    catalogScore: Math.max(
      0,
      Number(track.favorite_count) || 0,
      Number(track.play_count) || 0
    ),
    sourcePlatform: "audius",
    sourceRefId: String(track.id),
  };
}

async function upsertAudiusTracks(tracks) {
  const docs = tracks.map(normalizeAudiusTrack).filter(Boolean);

  if (!docs.length) {
    return [];
  }

  await Song.bulkWrite(
    docs.map((song) => ({
      updateOne: {
        filter: { songId: song.songId },
        update: {
          $set: {
            title: song.title,
            artist: song.artist,
            image: song.image,
            src: song.src,
            duration: song.duration,
            language: song.language,
            catalogScore: song.catalogScore,
            sourcePlatform: song.sourcePlatform,
            sourceRefId: song.sourceRefId,
          },
          $setOnInsert: {
            likesCount: 0,
            albumId: null,
            createdBy: null,
            createdByName: "",
          },
        },
        upsert: true,
      },
    })),
    { ordered: false }
  );

  return Song.find({ songId: { $in: docs.map((song) => song.songId) } })
    .select(
      "songId title artist image src duration language likesCount albumId createdBy createdByName createdAt sourcePlatform sourceRefId catalogScore"
    )
    .lean();
}

async function syncTrendingAudiusTracks({ force = false, limit = 24 } = {}) {
  const shouldReuseCache =
    !force &&
    Date.now() - lastTrendingSyncAt < AUDIUS_TRENDING_CACHE_MS &&
    !trendingSyncPromise;

  if (shouldReuseCache) {
    return [];
  }

  if (trendingSyncPromise) {
    return trendingSyncPromise;
  }

  trendingSyncPromise = (async () => {
    try {
      const data = await fetchAudiusJson("/tracks/trending", {
        limit: Math.max(1, Math.min(50, Number(limit) || 24)),
      });

      const syncedSongs = await upsertAudiusTracks(data.data || []);
      lastTrendingSyncAt = Date.now();
      return syncedSongs;
    } finally {
      trendingSyncPromise = null;
    }
  })();

  return trendingSyncPromise;
}

async function searchAudiusTracks({ query, limit = 20 } = {}) {
  const trimmedQuery = String(query || "").trim();
  if (!trimmedQuery) {
    return [];
  }

  const data = await fetchAudiusJson("/tracks/search", {
    query: trimmedQuery,
    limit: Math.max(1, Math.min(50, Number(limit) || 20)),
  });

  return upsertAudiusTracks(data.data || []);
}

async function getAudiusTrackStreamUrl(trackId) {
  const data = await fetchAudiusJson(`/tracks/${encodeURIComponent(trackId)}/stream`, {
    no_redirect: "true",
  });

  return String(data.data || "").trim();
}

module.exports = {
  getAudiusTrackStreamUrl,
  searchAudiusTracks,
  syncTrendingAudiusTracks,
};
