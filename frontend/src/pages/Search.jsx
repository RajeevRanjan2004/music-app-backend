import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { usePlayer } from "../context/PlayerContext";
import { apiRequest } from "../lib/api";

const Search = () => {
  const { playSong, addToQueue, playNextInQueue } = usePlayer();
  const [query, setQuery] = useState("");
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
    if (filters.albumId) params.set("albumId", filters.albumId);
    if (filters.language.trim()) params.set("language", filters.language.trim());
    if (filters.artist.trim()) params.set("artist", filters.artist.trim());
    if (filters.sort) params.set("sort", filters.sort);
    params.set("limit", "100");
    return params.toString();
  }, [query, filters]);

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
    run();
  }, [queryString]);

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">Search</h1>

      <div className="grid gap-3 md:grid-cols-4">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full rounded-lg bg-zinc-800 p-3 outline-none ring-1 ring-zinc-700 placeholder:text-zinc-400 focus:ring-zinc-500 md:col-span-2"
          placeholder="Search by title, artist, language"
        />
        <input
          value={filters.artist}
          onChange={(e) => setFilters((prev) => ({ ...prev, artist: e.target.value }))}
          className="rounded-lg bg-zinc-800 p-3 outline-none ring-1 ring-zinc-700 placeholder:text-zinc-400 focus:ring-zinc-500"
          placeholder="Filter artist"
        />
        <input
          value={filters.language}
          onChange={(e) => setFilters((prev) => ({ ...prev, language: e.target.value }))}
          className="rounded-lg bg-zinc-800 p-3 outline-none ring-1 ring-zinc-700 placeholder:text-zinc-400 focus:ring-zinc-500"
          placeholder="Filter language"
        />
      </div>
      <div className="mt-3">
        <select
          value={filters.albumId}
          onChange={(e) => setFilters((prev) => ({ ...prev, albumId: e.target.value }))}
          className="rounded bg-zinc-800 px-3 py-2 text-sm outline-none"
        >
          <option value="">All albums</option>
          {albums.map((album) => (
            <option key={album.albumId} value={album.albumId}>
              {album.title}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <label className="text-sm text-zinc-400">Sort:</label>
        <select
          value={filters.sort}
          onChange={(e) => setFilters((prev) => ({ ...prev, sort: e.target.value }))}
          className="rounded bg-zinc-800 px-3 py-2 text-sm outline-none"
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

      <div className="mt-6 space-y-2">
        {loading && (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, idx) => (
              <div key={idx} className="h-16 animate-pulse rounded-lg bg-zinc-800/70" />
            ))}
          </div>
        )}
        {!loading &&
          songs.map((song) => (
            <div
              key={song.id}
              className="flex w-full items-center justify-between rounded-lg bg-zinc-900/70 px-4 py-3 text-left transition hover:bg-zinc-800"
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
        {!loading && status && <p className="text-sm text-zinc-400">{status}</p>}
      </div>
    </div>
  );
};

export default Search;

