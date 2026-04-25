/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useMemo, useState, useCallback } from "react";
import { apiRequest } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { usePlayer } from "../context/PlayerContext";

const initialForm = {
  name: "",
  description: "",
  cover: "",
  isPublic: false,
};

const Playlists = () => {
  const { user } = useAuth();
  const { songs, playSong } = usePlayer();
  const [ownPlaylists, setOwnPlaylists] = useState([]);
  const [publicPlaylists, setPublicPlaylists] = useState([]);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState("");
  const [playlistDetail, setPlaylistDetail] = useState(null);
  const [playlistSongs, setPlaylistSongs] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  const selectedPlaylist = useMemo(
    () => ownPlaylists.find((playlist) => playlist.playlistId === selectedPlaylistId) || null,
    [ownPlaylists, selectedPlaylistId]
  );

  const fetchPlaylists = useCallback(async () => {
    if (!user) return;
    try {
      const data = await apiRequest("/playlists");
      setOwnPlaylists(data.own || []);
      setPublicPlaylists(data.public || []);
      if (!selectedPlaylistId && data.own?.[0]) {
        setSelectedPlaylistId(data.own[0].playlistId);
      }
    } catch (error) {
      setStatus(error.message);
    }
  }, [selectedPlaylistId, user]);

  const fetchPlaylistDetail = useCallback(async (playlistId) => {
    if (!playlistId) {
      setPlaylistDetail(null);
      setPlaylistSongs([]);
      return;
    }
    try {
      const data = await apiRequest(`/playlists/${playlistId}`);
      setPlaylistDetail(data.playlist || null);
      setPlaylistSongs(data.songs || []);
    } catch (error) {
      setStatus(error.message);
    }
  }, []);

  useEffect(() => {
    void fetchPlaylists();
  }, [fetchPlaylists]);

  useEffect(() => {
    void fetchPlaylistDetail(selectedPlaylistId);
  }, [fetchPlaylistDetail, selectedPlaylistId]);

  const createPlaylist = async (e) => {
    e.preventDefault();
    if (!user) return;
    try {
      setLoading(true);
      setStatus("");
      await apiRequest("/playlists", {
        method: "POST",
        body: JSON.stringify(form),
      });
      setForm(initialForm);
      setStatus("Playlist created");
      await fetchPlaylists();
    } catch (error) {
      setStatus(error.message);
    } finally {
      setLoading(false);
    }
  };

  const addSongToPlaylist = async (songId) => {
    if (!selectedPlaylistId) return;
    try {
      await apiRequest(`/playlists/${selectedPlaylistId}/songs/${songId}`, {
        method: "POST",
      });
      await fetchPlaylistDetail(selectedPlaylistId);
    } catch (error) {
      setStatus(error.message);
    }
  };

  const removeSongFromPlaylist = async (songId) => {
    if (!selectedPlaylistId) return;
    try {
      await apiRequest(`/playlists/${selectedPlaylistId}/songs/${songId}`, {
        method: "DELETE",
      });
      await fetchPlaylistDetail(selectedPlaylistId);
    } catch (error) {
      setStatus(error.message);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Playlists</h1>
        <p className="mt-2 text-zinc-400">Create, manage and play your own playlists.</p>
      </div>

      {!user && <p className="text-sm text-zinc-400">Login required to manage playlists.</p>}

      {user && (
        <>
          <form
            onSubmit={createPlaylist}
            className="grid gap-3 rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 md:grid-cols-2"
          >
            <input
              required
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Playlist name"
              className="rounded bg-zinc-800 px-3 py-2 outline-none"
            />
            <input
              value={form.cover}
              onChange={(e) => setForm((prev) => ({ ...prev, cover: e.target.value }))}
              placeholder="Cover image URL"
              className="rounded bg-zinc-800 px-3 py-2 outline-none"
            />
            <input
              value={form.description}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="Description"
              className="rounded bg-zinc-800 px-3 py-2 outline-none md:col-span-2"
            />
            <label className="flex items-center gap-2 text-sm text-zinc-300">
              <input
                type="checkbox"
                checked={form.isPublic}
                onChange={(e) => setForm((prev) => ({ ...prev, isPublic: e.target.checked }))}
              />
              Make public
            </label>
            <button
              type="submit"
              disabled={loading}
              className="rounded bg-green-500 px-4 py-2 font-semibold text-black"
            >
              {loading ? "Creating..." : "Create playlist"}
            </button>
          </form>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
              <h2 className="text-lg font-bold">Your Playlists</h2>
              <div className="mt-3 space-y-2">
                {!ownPlaylists.length && <p className="text-sm text-zinc-400">No playlists yet.</p>}
                {ownPlaylists.map((playlist) => (
                  <button
                    key={playlist.playlistId}
                    onClick={() => setSelectedPlaylistId(playlist.playlistId)}
                    className={`w-full rounded-lg px-3 py-2 text-left ${
                      selectedPlaylistId === playlist.playlistId
                        ? "bg-zinc-700 text-white"
                        : "bg-zinc-800/70 text-zinc-300 hover:bg-zinc-700/80"
                    }`}
                  >
                    <p className="font-medium">{playlist.name}</p>
                    <p className="text-xs text-zinc-400">
                      {playlist.songs?.length || 0} songs {playlist.isPublic ? "• Public" : "• Private"}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
              <h2 className="text-lg font-bold">Public Playlists</h2>
              <div className="mt-3 space-y-2">
                {!publicPlaylists.length && (
                  <p className="text-sm text-zinc-400">No public playlists available.</p>
                )}
                {publicPlaylists.map((playlist) => (
                  <div key={playlist.playlistId} className="rounded-lg bg-zinc-800/70 px-3 py-2">
                    <p className="font-medium">{playlist.name}</p>
                    <p className="text-xs text-zinc-400">
                      by {playlist.createdByName || "Artist"} • {playlist.songs?.length || 0} songs
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {selectedPlaylist && (
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
                <h3 className="text-lg font-bold">{playlistDetail?.name || selectedPlaylist.name}</h3>
                <p className="mt-1 text-sm text-zinc-400">
                  {(playlistSongs || []).length} songs in playlist
                </p>
                <div className="mt-3 space-y-2">
                  {!playlistSongs.length && (
                    <p className="text-sm text-zinc-400">No songs in this playlist.</p>
                  )}
                  {playlistSongs.map((song) => (
                    <div key={`${song.id}-playlist`} className="flex items-center justify-between gap-2">
                      <button
                        onClick={() => playSong(song.id)}
                        className="truncate text-left text-sm hover:text-green-400"
                      >
                        {song.title}
                        <span className="ml-2 text-xs text-zinc-400">{song.artist}</span>
                      </button>
                      <button
                        onClick={() => removeSongFromPlaylist(song.id)}
                        className="text-xs text-zinc-400 hover:text-white"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
                <h3 className="text-lg font-bold">Add Songs</h3>
                <div className="mt-3 space-y-2">
                  {songs.map((song) => (
                    <div key={`${song.id}-all`} className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm">
                        {song.title}
                        <span className="ml-2 text-xs text-zinc-400">{song.artist}</span>
                      </p>
                      <button
                        onClick={() => addSongToPlaylist(song.id)}
                        className="text-xs text-zinc-300 hover:text-white"
                      >
                        Add
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {status && <p className="text-sm text-zinc-400">{status}</p>}
        </>
      )}
    </div>
  );
};

export default Playlists;
