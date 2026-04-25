import { useEffect, useState } from "react";
import { apiRequest } from "../lib/api";
import { usePlayer } from "../context/PlayerContext";
import { useAuth } from "../context/AuthContext";

const LikedSongs = () => {
  const { playSong, addToQueue } = usePlayer();
  const { user } = useAuth();
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");

  useEffect(() => {
    const fetchLiked = async () => {
      if (!user) {
        setSongs([]);
        setStatus("Login to view liked songs.");
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const data = await apiRequest("/songs/liked/songs");
        setSongs(data.songs || []);
        if (!data.songs?.length) setStatus("No liked songs yet.");
      } catch (error) {
        setStatus(error.message);
      } finally {
        setLoading(false);
      }
    };
    void fetchLiked();
  }, [user]);

  return (
    <div>
      <h1 className="text-2xl font-bold">Liked Songs</h1>
      <p className="mt-2 text-zinc-400">Songs you have liked appear here.</p>

      <div className="mt-6 space-y-2">
        {loading && (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div key={idx} className="h-16 animate-pulse rounded bg-zinc-800/70" />
            ))}
          </div>
        )}
        {!loading &&
          songs.map((song, index) => (
            <div
              key={song.id}
              className="grid grid-cols-[40px_1fr_auto] items-center gap-3 rounded-lg bg-zinc-900/50 px-4 py-3"
            >
              <span className="text-zinc-400">{String(index + 1).padStart(2, "0")}</span>
              <button onClick={() => playSong(song.id)} className="flex items-center gap-3 text-left">
                <img src={song.image} alt={song.title} className="h-10 w-10 rounded object-cover" />
                <div>
                  <p className="font-medium">{song.title}</p>
                  <p className="text-sm text-zinc-400">{song.artist}</p>
                </div>
              </button>
              <button onClick={() => addToQueue(song.id)} className="text-sm text-zinc-300 hover:text-white">
                Queue
              </button>
            </div>
          ))}
        {!loading && status && <p className="text-sm text-zinc-400">{status}</p>}
      </div>
    </div>
  );
};

export default LikedSongs;
