import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FaExternalLinkAlt, FaSearch, FaYoutube } from "react-icons/fa";
import { usePlayer } from "../context/PlayerContext";
import { apiRequest } from "../lib/api";
import { openExternalUrl } from "../lib/externalBrowser";

const REGION_OPTIONS = [
  { label: "All", value: "all" },
  { label: "Hindi", value: "hindi" },
  { label: "Bhojpuri", value: "bhojpuri" },
  { label: "Haryanvi", value: "haryanvi" },
  { label: "Punjabi", value: "punjabi" },
];

const Search = () => {
  const { playSong, addToQueue, playNextInQueue } = usePlayer();
  const [query, setQuery] = useState("");
  const [region, setRegion] = useState("all");
  const [filters, setFilters] = useState({
    albumId: "",
    language: "",
    artist: "",
    sort: "likes",
  });
  const [albums, setAlbums] = useState([]);
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (region !== "all") params.set("region", region);
    if (filters.albumId) params.set("albumId", filters.albumId);
    if (filters.language.trim()) params.set("language", filters.language.trim());
    if (filters.artist.trim()) params.set("artist", filters.artist.trim());
    if (filters.sort) params.set("sort", filters.sort);
    params.set("limit", "200");
    return params.toString();
  }, [filters, query, region]);

  const expandedQuery = useMemo(() => {
    return [query.trim(), region !== "all" ? region : ""].filter(Boolean).join(" ").trim();
  }, [query, region]);

  const externalTargets = useMemo(
    () => [
      {
        label: "YouTube Music",
        icon: FaYoutube,
        url: expandedQuery
          ? `https://music.youtube.com/search?q=${encodeURIComponent(expandedQuery)}`
          : "https://music.youtube.com",
      },
      {
        label: "YouTube",
        icon: FaExternalLinkAlt,
        url: expandedQuery
          ? `https://www.youtube.com/results?search_query=${encodeURIComponent(expandedQuery)}`
          : "https://www.youtube.com",
      },
    ],
    [expandedQuery]
  );

  useEffect(() => {
    const fetchAlbums = async () => {
      try {
        const data = await apiRequest("/albums");
        setAlbums(data.albums || []);
      } catch {
        setAlbums([]);
      }
    };
    fetchAlbums();
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const run = async () => {
        setLoading(true);
        setStatus("");
        try {
          const data = await apiRequest(`/songs/search?${queryString}`);
          setSongs(data.songs || []);
          if (!data.songs?.length) {
            setStatus("No matching songs found.");
          }
        } catch (error) {
          setStatus(error.message);
          setSongs([]);
        } finally {
          setLoading(false);
        }
      };

      void run();
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [queryString]);

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-[28px] border border-zinc-800 bg-[radial-gradient(circle_at_top_left,_rgba(245,158,11,0.18),_transparent_40%),linear-gradient(135deg,_rgba(24,24,27,0.98),_rgba(9,9,11,0.96))] p-5 md:p-7">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-300">
          Search Everywhere
        </p>
        <h1 className="mt-3 text-3xl font-black tracking-tight text-white md:text-5xl">
          Hindi, Bhojpuri, Haryanvi aur jo bhi gaana chaho
        </h1>
        <p className="mt-3 max-w-3xl text-sm text-zinc-300 md:text-base">
          In-app songs yahin milenge, aur agar aur zyada catalog chahiye to same query ko direct
          music websites par bhi khol sakte ho.
        </p>

        <div className="mt-6 flex flex-col gap-4">
          <div className="flex items-center gap-3 rounded-2xl border border-zinc-700/80 bg-black/30 px-4 py-3 shadow-[0_20px_60px_rgba(0,0,0,0.25)]">
            <FaSearch className="shrink-0 text-amber-300" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full bg-transparent text-base text-white outline-none placeholder:text-zinc-500 md:text-lg"
              placeholder="Song, singer ya album search karo..."
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {REGION_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => setRegion(option.value)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  region === option.value
                    ? "bg-amber-300 text-black"
                    : "bg-zinc-900/80 text-zinc-200 hover:bg-zinc-800"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {externalTargets.map((target) => {
              const Icon = target.icon;
              return (
                <button
                  key={target.label}
                  onClick={() => openExternalUrl(target.url)}
                  className="flex items-center justify-between rounded-2xl border border-zinc-700/80 bg-zinc-950/70 px-4 py-4 text-left transition hover:border-zinc-500 hover:bg-zinc-900"
                >
                  <div>
                    <p className="text-sm font-semibold text-white">{target.label}</p>
                    <p className="mt-1 text-xs text-zinc-400">
                      {expandedQuery
                        ? `Open "${expandedQuery}" on ${target.label}`
                        : `Open ${target.label} website`}
                    </p>
                  </div>
                  <Icon className="text-lg text-amber-300" />
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <div className="grid gap-3 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]">
        <input
          value={filters.artist}
          onChange={(e) => setFilters((prev) => ({ ...prev, artist: e.target.value }))}
          className="rounded-2xl bg-zinc-900/70 px-4 py-3 outline-none ring-1 ring-zinc-800 placeholder:text-zinc-500 focus:ring-amber-300/60"
          placeholder="Artist filter"
        />
        <input
          value={filters.language}
          onChange={(e) => setFilters((prev) => ({ ...prev, language: e.target.value }))}
          className="rounded-2xl bg-zinc-900/70 px-4 py-3 outline-none ring-1 ring-zinc-800 placeholder:text-zinc-500 focus:ring-amber-300/60"
          placeholder="Language / genre filter"
        />
        <select
          value={filters.albumId}
          onChange={(e) => setFilters((prev) => ({ ...prev, albumId: e.target.value }))}
          className="rounded-2xl bg-zinc-900/70 px-4 py-3 text-sm outline-none ring-1 ring-zinc-800 focus:ring-amber-300/60"
        >
          <option value="">All albums</option>
          {albums.map((album) => (
            <option key={album.albumId} value={album.albumId}>
              {album.title}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/40 px-4 py-3">
        <p className="text-sm text-zinc-400">
          {loading ? "Searching..." : `${songs.length} songs visible`}
        </p>
        <label className="text-sm text-zinc-400">Sort:</label>
        <select
          value={filters.sort}
          onChange={(e) => setFilters((prev) => ({ ...prev, sort: e.target.value }))}
          className="rounded-xl bg-zinc-800 px-3 py-2 text-sm outline-none"
        >
          <option value="likes">Trending</option>
          <option value="recent">Newest</option>
          <option value="title">Title A-Z</option>
        </select>
      </div>

      {!!albums.length && (
        <div className="mt-6">
          <h2 className="mb-3 text-lg font-bold text-white">Albums</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {albums
              .filter((album) => {
                const q = query.trim().toLowerCase();
                if (!q) return true;
                return (
                  album.title?.toLowerCase().includes(q) ||
                  album.artist?.toLowerCase().includes(q)
                );
              })
              .slice(0, 8)
              .map((album) => (
                <Link
                  key={album.albumId}
                  to={`/albums/${album.albumId}`}
                  className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-3 transition hover:border-zinc-700 hover:bg-zinc-800/70"
                >
                  <img
                    src={album.cover}
                    alt={album.title}
                    className="aspect-square w-full rounded object-cover"
                  />
                  <h3 className="mt-3 font-semibold text-white">{album.title}</h3>
                  <p className="text-sm text-zinc-400">{album.artist}</p>
                </Link>
              ))}
          </div>
        </div>
      )}

      <div className="space-y-2">
        {loading && (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div key={idx} className="h-20 animate-pulse rounded-2xl bg-zinc-800/70" />
            ))}
          </div>
        )}
        {!loading &&
          songs.map((song) => (
            <div
              key={song.id}
              className="flex w-full items-center justify-between rounded-2xl border border-zinc-800 bg-zinc-900/70 px-4 py-3 text-left transition hover:border-zinc-700 hover:bg-zinc-800"
            >
              <button onClick={() => playSong(song)} className="flex items-center gap-3 text-left">
                <img
                  src={song.image}
                  alt={song.title}
                  className="h-12 w-12 rounded object-cover"
                />
                <div>
                  <p className="font-medium">{song.title}</p>
                  <p className="text-sm text-zinc-400">
                    {song.artist} - {song.language || "Unknown"}
                  </p>
                  {song.sourcePlatform === "audius" && (
                    <p className="text-xs uppercase tracking-wide text-emerald-400">
                      Online via Audius
                    </p>
                  )}
                </div>
              </button>
              <div className="flex items-center gap-3 text-sm">
                <button onClick={() => playNextInQueue(song)} className="text-zinc-300 hover:text-white">
                  Play next
                </button>
                <button onClick={() => addToQueue(song)} className="text-zinc-300 hover:text-white">
                  Queue
                </button>
              </div>
            </div>
          ))}
        {!loading && status && (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 px-4 py-4 text-sm text-zinc-400">
            <p>{status}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {externalTargets.map((target) => (
                <button
                  key={`${target.label}-empty`}
                  onClick={() => openExternalUrl(target.url)}
                  className="rounded-full bg-zinc-800 px-3 py-2 text-xs font-semibold text-white hover:bg-zinc-700"
                >
                  Open on {target.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Search;

