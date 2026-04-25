import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { apiRequest } from "../lib/api";
import { usePlayer } from "../context/PlayerContext";

const AlbumDetail = () => {
  const { albumId } = useParams();
  const { playSong, playNextInQueue, addToQueue } = usePlayer();
  const [album, setAlbum] = useState(null);
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchAlbum = async () => {
      try {
        setLoading(true);
        setError("");
        const data = await apiRequest(`/albums/${albumId}`);
        setAlbum(data.album || null);
        setSongs(data.songs || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (albumId) {
      void fetchAlbum();
    }
  }, [albumId]);

  const totalDuration = useMemo(() => {
    const seconds = songs.reduce((sum, song) => sum + (song.duration || 0), 0);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = String(seconds % 60).padStart(2, "0");
    return `${minutes}:${remainingSeconds}`;
  }, [songs]);

  const handlePlayAll = () => {
    if (!songs.length) return;
    playSong(songs[0].id);
    songs.slice(1).forEach((song) => addToQueue(song.id));
  };

  const handleShuffleAll = () => {
    if (!songs.length) return;
    const shuffled = [...songs].sort(() => Math.random() - 0.5);
    playSong(shuffled[0].id);
    shuffled.slice(1).forEach((song) => addToQueue(song.id));
  };

  if (loading) {
    return <div className="text-zinc-400">Loading album...</div>;
  }

  if (error || !album) {
    return <div className="text-red-300">{error || "Album not found"}</div>;
  }

  return (
    <div className="space-y-8">
      <section className="grid gap-8 md:grid-cols-[280px_1fr]">
        <img
          src={album.cover}
          alt={album.title}
          className="aspect-square w-full max-w-[320px] rounded-lg object-cover"
        />
        <div className="flex flex-col justify-end">
          <p className="text-sm uppercase tracking-wide text-zinc-400">Album</p>
          <h1 className="mt-2 text-4xl font-extrabold text-white md:text-5xl">{album.title}</h1>
          <p className="mt-3 text-lg text-zinc-300">{album.artist}</p>
          {album.description && <p className="mt-4 max-w-2xl text-zinc-400">{album.description}</p>}
          <p className="mt-4 text-sm text-zinc-500">
            {songs.length} songs - Total duration {totalDuration}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              onClick={handlePlayAll}
              className="rounded-lg bg-green-600 px-5 py-3 font-semibold text-white transition hover:bg-green-700"
            >
              Play All
            </button>
            <button
              onClick={handleShuffleAll}
              className="rounded-lg bg-zinc-800 px-5 py-3 font-semibold text-white transition hover:bg-zinc-700"
            >
              Shuffle
            </button>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-zinc-800">
        {songs.map((song, index) => (
          <div
            key={song.id}
            className="grid grid-cols-[40px_1fr_auto] items-center gap-3 border-b border-zinc-800/80 bg-zinc-900/30 px-4 py-3 last:border-b-0 hover:bg-zinc-800/60"
          >
            <span className="text-zinc-400">{String(index + 1).padStart(2, "0")}</span>
            <button onClick={() => playSong(song.id)} className="flex items-center gap-3 text-left">
              <img src={song.image} alt={song.title} className="h-10 w-10 rounded object-cover" />
              <div>
                <p className="font-medium text-white">{song.title}</p>
                <p className="text-sm text-zinc-400">
                  {song.artist} - {song.language || "Unknown"}
                </p>
              </div>
            </button>
            <div className="flex items-center gap-3">
              <button
                onClick={() => playNextInQueue(song.id)}
                className="text-xs text-zinc-300 hover:text-white"
              >
                Next
              </button>
              <button
                onClick={() => addToQueue(song.id)}
                className="text-xs text-zinc-300 hover:text-white"
              >
                Queue
              </button>
            </div>
          </div>
        ))}
      </section>

      <Link to="/search" className="inline-block text-sm text-green-400 hover:text-green-300">
        Back to Search
      </Link>
    </div>
  );
};

export default AlbumDetail;

