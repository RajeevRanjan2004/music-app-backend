/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useMemo, useState, useCallback } from "react";
import { usePlayer } from "../context/PlayerContext";
import { useAuth } from "../context/AuthContext";
import { apiRequest } from "../lib/api";

const Library = () => {
  const { songs, playSong, playNextInQueue, addToQueue, createSong, fetchSongs } = usePlayer();
  const { user } = useAuth();
  const [status, setStatus] = useState("");
  const [savedSongs, setSavedSongs] = useState([]);
  const [view, setView] = useState("all"); // all | saved
  const [form, setForm] = useState({
    title: "",
    artist: user?.name || "",
    image: "",
    src: "",
    duration: "",
    language: "Hindi",
  });
  const [files, setFiles] = useState({ audio: null, image: null });

  const canSave = Boolean(user);
  const canCreate = user?.role === "artist";

  const visibleSongs = useMemo(() => {
    return view === "saved" ? savedSongs : songs;
  }, [view, savedSongs, songs]);

  const refreshSaved = useCallback(async () => {
    if (!user) {
      setSavedSongs([]);
      return;
    }
    try {
      const data = await apiRequest("/songs/library");
      setSavedSongs(data.songs || []);
    } catch {
      setSavedSongs([]);
    }
  }, [user]);

  useEffect(() => {
    void refreshSaved();
  }, [refreshSaved]);

  const handleAddToLibrary = async (songId) => {
    if (!user) {
      setStatus("Login required to save library.");
      return;
    }

    try {
      await apiRequest(`/songs/library/${songId}`, { method: "POST" });
      setStatus("Added to library");
      await refreshSaved();
    } catch (error) {
      setStatus(error.message);
    }
  };

  const handleRemoveFromLibrary = async (songId) => {
    if (!user) return;

    try {
      await apiRequest(`/songs/library/${songId}`, { method: "DELETE" });
      setStatus("Removed from library");
      await refreshSaved();
    } catch (error) {
      setStatus(error.message);
    }
  };

  const handleCreateSong = async (event) => {
    event.preventDefault();
    setStatus("");

    try {
      let payload = {
        ...form,
        duration: Number(form.duration) || 0,
      };

      if (files.audio) {
        const fd = new FormData();
        fd.append("audio", files.audio);
        if (files.image) fd.append("image", files.image);

        const uploaded = await apiRequest("/uploads", {
          method: "POST",
          body: fd,
        });

        payload = {
          ...payload,
          src: uploaded.audioUrl,
          image: uploaded.imageUrl || payload.image,
        };
      }

      await createSong(payload);
      setForm({
        title: "",
        artist: user?.name || "",
        image: "",
        src: "",
        duration: "",
        language: "Hindi",
      });
      setFiles({ audio: null, image: null });
      setStatus("Song created successfully");
      await fetchSongs();
    } catch (error) {
      setStatus(error.message);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold">Your Library</h1>
      <p className="mt-2 text-zinc-400">
        {user?.role === "artist"
          ? "Create songs and listen to music"
          : "Listen to songs and save them to your library"}
      </p>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <button
          onClick={() => setView("all")}
          className={`rounded-full px-4 py-1.5 text-sm font-semibold ${
            view === "all" ? "bg-white text-black" : "bg-zinc-800 text-zinc-200"
          }`}
        >
          All songs
        </button>
        <button
          onClick={() => setView("saved")}
          disabled={!user}
          className={`rounded-full px-4 py-1.5 text-sm font-semibold disabled:opacity-60 ${
            view === "saved" ? "bg-white text-black" : "bg-zinc-800 text-zinc-200"
          }`}
        >
          Saved
        </button>
      </div>

      {canCreate && (
        <form
          onSubmit={handleCreateSong}
          className="mt-6 grid gap-3 rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 md:grid-cols-2"
        >
          <input
            placeholder="Song title"
            value={form.title}
            onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
            className="rounded bg-zinc-800 px-3 py-2 outline-none"
            required
          />
          <input
            placeholder="Artist name"
            value={form.artist}
            onChange={(e) => setForm((prev) => ({ ...prev, artist: e.target.value }))}
            className="rounded bg-zinc-800 px-3 py-2 outline-none"
            required
          />
          <input
            placeholder="Image URL"
            value={form.image}
            onChange={(e) => setForm((prev) => ({ ...prev, image: e.target.value }))}
            className="rounded bg-zinc-800 px-3 py-2 outline-none"
          />
          <input
            placeholder="Audio URL (.mp3)"
            value={form.src}
            onChange={(e) => setForm((prev) => ({ ...prev, src: e.target.value }))}
            className="rounded bg-zinc-800 px-3 py-2 outline-none"
          />
          <div className="rounded border border-zinc-800 bg-zinc-950/40 p-3 md:col-span-2">
            <p className="text-sm font-semibold">Upload files (optional)</p>
            <p className="mt-1 text-xs text-zinc-400">
              If you upload an audio file, it will be used instead of the audio URL.
            </p>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <label className="text-sm text-zinc-200">
                Audio file (mp3)
                <input
                  type="file"
                  accept="audio/*"
                  onChange={(e) =>
                    setFiles((prev) => ({ ...prev, audio: e.target.files?.[0] || null }))
                  }
                  className="mt-2 block w-full text-sm text-zinc-300 file:mr-3 file:rounded file:border-0 file:bg-zinc-800 file:px-3 file:py-2 file:text-zinc-100 hover:file:bg-zinc-700"
                />
              </label>
              <label className="text-sm text-zinc-200">
                Cover image (png/jpg)
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) =>
                    setFiles((prev) => ({ ...prev, image: e.target.files?.[0] || null }))
                  }
                  className="mt-2 block w-full text-sm text-zinc-300 file:mr-3 file:rounded file:border-0 file:bg-zinc-800 file:px-3 file:py-2 file:text-zinc-100 hover:file:bg-zinc-700"
                />
              </label>
            </div>
          </div>
          <input
            type="number"
            min="0"
            placeholder="Duration (seconds)"
            value={form.duration}
            onChange={(e) => setForm((prev) => ({ ...prev, duration: e.target.value }))}
            className="rounded bg-zinc-800 px-3 py-2 outline-none"
          />
          <select
            value={form.language}
            onChange={(e) => setForm((prev) => ({ ...prev, language: e.target.value }))}
            className="rounded bg-zinc-800 px-3 py-2 outline-none"
          >
            <option>Hindi</option>
            <option>Bhojpuri</option>
            <option>Punjabi</option>
            <option>English</option>
            <option>Other</option>
          </select>
          <button
            type="submit"
            className="rounded bg-green-500 px-4 py-2 font-semibold text-black"
          >
            Add Song
          </button>
        </form>
      )}

      {status && <p className="mt-3 text-sm text-emerald-400">{status}</p>}

      <div className="mt-6 overflow-hidden rounded-xl border border-zinc-800">
        {visibleSongs.map((song, index) => (
          <div
            key={song.id}
            className="grid w-full grid-cols-[40px_1fr_auto] items-center gap-3 border-b border-zinc-800/80 bg-zinc-900/30 px-4 py-3 text-left last:border-b-0 hover:bg-zinc-800/60"
          >
            <span className="text-zinc-400">{String(index + 1).padStart(2, "0")}</span>
            <div className="flex items-center gap-3">
              <img
                src={song.image}
                alt={song.title}
                className="h-10 w-10 rounded object-cover"
              />
              <div>
                <p className="font-medium">{song.title}</p>
                <p className="text-sm text-zinc-400">{song.artist}</p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => playSong(song)}
                className="text-sm text-zinc-300 hover:text-white"
              >
                Play
              </button>
              <button
                onClick={() => playNextInQueue(song)}
                className="text-xs text-zinc-400 hover:text-white"
              >
                Next
              </button>
              <button
                onClick={() => addToQueue(song)}
                className="text-xs text-zinc-400 hover:text-white"
              >
                Queue
              </button>
              {view === "all" && canSave && (
                <button
                  onClick={() => handleAddToLibrary(song.id)}
                  className="rounded bg-zinc-700 px-2 py-1 text-xs text-zinc-100 hover:bg-zinc-600"
                >
                  Save
                </button>
              )}
              {view === "saved" && canSave && (
                <button
                  onClick={() => handleRemoveFromLibrary(song.id)}
                  className="rounded bg-zinc-700 px-2 py-1 text-xs text-zinc-100 hover:bg-zinc-600"
                >
                  Remove
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Library;
