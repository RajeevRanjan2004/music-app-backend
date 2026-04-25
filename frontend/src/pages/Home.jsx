import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Card from "../components/Card";
import { usePlayer } from "../context/PlayerContext";
import { useAuth } from "../context/AuthContext";
import { apiRequest } from "../lib/api";

const Home = () => {
  const {
    songs,
    playSong,
    loadingSongs,
    continueSongs,
    recentSongs,
    fetchContinueSongs,
    fetchRecentSongs,
  } = usePlayer();
  const { user } = useAuth();
  const [albums, setAlbums] = useState([]);

  useEffect(() => {
    if (user) {
      void fetchContinueSongs();
      void fetchRecentSongs();
    }
  }, [fetchContinueSongs, fetchRecentSongs, user]);

  useEffect(() => {
    const fetchAlbums = async () => {
      try {
        const data = await apiRequest("/albums");
        setAlbums(data.albums || []);
      } catch {
        setAlbums([]);
      }
    };
    void fetchAlbums();
  }, []);

  return (
    <div className="space-y-10">
      <section className="rounded-2xl bg-gradient-to-r from-emerald-700/50 via-emerald-500/20 to-transparent p-6 md:p-8">
        <p className="text-sm font-semibold uppercase tracking-wider text-emerald-200">
          Curated For You
        </p>
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight md:text-5xl">
          Discover your next favorite track
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-zinc-300 md:text-base">
          Fresh playlists, trending hits, and chill sessions in one place.
        </p>
      </section>

      {user && continueSongs.length > 0 && (
        <section>
          <h2 className="mb-4 text-2xl font-bold">Continue listening</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {continueSongs.slice(0, 4).map((song) => (
              <button
                key={`${song.id}-continue`}
                onClick={() => playSong(song.id)}
                className="flex items-center gap-4 rounded-lg bg-zinc-800/70 p-2 text-left transition hover:bg-zinc-700/80"
              >
                <img
                  src={song.image}
                  alt={song.title}
                  className="h-14 w-14 rounded object-cover"
                />
                <div>
                  <p className="font-semibold">{song.title}</p>
                  <p className="text-sm text-zinc-400">{song.artist}</p>
                  <p className="text-xs text-zinc-500">Resume at {Math.floor(song.lastPosition)}s</p>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-5 text-2xl font-bold">Trending now</h2>
        {loadingSongs && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {Array.from({ length: 5 }).map((_, idx) => (
              <div key={idx} className="h-64 animate-pulse rounded-xl bg-zinc-800/70" />
            ))}
          </div>
        )}
        {!loadingSongs && songs.length === 0 && (
          <p className="text-sm text-zinc-400">No songs available right now.</p>
        )}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {songs.map((song) => (
            <Card key={song.id} {...song} desc={song.artist} />
          ))}
        </div>
      </section>

      {albums.length > 0 && (
        <section>
          <h2 className="mb-5 text-2xl font-bold">Latest albums</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {albums.slice(0, 8).map((album) => (
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
                <p className="text-xs text-zinc-500">{album.totalSongs || 0} songs</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {user && recentSongs.length > 0 && (
        <section>
          <h2 className="mb-4 text-2xl font-bold">Recently played</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {recentSongs.slice(0, 6).map((song) => (
              <button
                key={`${song.id}-recent`}
                onClick={() => playSong(song.id)}
                className="flex items-center gap-4 rounded-lg bg-zinc-900/60 p-2 text-left transition hover:bg-zinc-800/80"
              >
                <img
                  src={song.image}
                  alt={song.title}
                  className="h-12 w-12 rounded object-cover"
                />
                <div>
                  <p className="font-semibold">{song.title}</p>
                  <p className="text-sm text-zinc-400">{song.artist}</p>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default Home;
