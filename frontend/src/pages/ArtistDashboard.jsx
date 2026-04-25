/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { usePlayer } from "../context/PlayerContext";
import { apiRequest } from "../lib/api";

export default function ArtistDashboard() {
  const { user } = useAuth();
  const {
    fetchSongs: refreshGlobalSongs,
    playSong,
    playNextInQueue,
    addToQueue,
  } = usePlayer();
  const [songs, setSongs] = useState([]);
  const [albums, setAlbums] = useState([]);
  const [activeTab, setActiveTab] = useState("songs");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingSong, setEditingSong] = useState(null);
  const [editingAlbum, setEditingAlbum] = useState(null);
  const [songUploadMode, setSongUploadMode] = useState("single");

  const [formData, setFormData] = useState({
    title: "",
    artist: "",
    language: "",
    duration: 0,
  });

  const [albumFormData, setAlbumFormData] = useState({
    title: "",
    artist: "",
    cover: "",
    description: "",
  });
  const [albumFiles, setAlbumFiles] = useState({
    coverImage: null,
    audioFiles: [],
    metadata: null,
  });

  const [uploadFiles, setUploadFiles] = useState({
    audio: null,
    image: null,
    audioFiles: [],
    metadata: null,
  });

  const fetchSongs = useCallback(async () => {
    const response = await apiRequest("/songs/artist/my");
    setSongs(response.songs || []);
  }, []);

  const fetchAlbums = useCallback(async () => {
    const response = await apiRequest("/albums/artist/all");
    setAlbums(response.albums || []);
  }, []);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      setSuccess("");
      if (activeTab === "songs") {
        await Promise.all([fetchSongs(), fetchAlbums()]);
      } else {
        await fetchAlbums();
      }
    } catch {
      setError("Failed to fetch data");
    } finally {
      setLoading(false);
    }
  }, [activeTab, fetchAlbums, fetchSongs]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "duration" ? parseInt(value || 0, 10) : value,
    }));
  };

  const handleAlbumFormChange = (e) => {
    const { name, value } = e.target;
    setAlbumFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleAlbumFileChange = (e) => {
    const { name, files } = e.target;
    if (!files?.length) return;
    if (name === "audioFiles") {
      setAlbumFiles((prev) => ({ ...prev, audioFiles: Array.from(files) }));
      return;
    }
    setAlbumFiles((prev) => ({ ...prev, [name]: files[0] }));
  };

  const handleFileChange = (e) => {
    const { name, files } = e.target;
    if (!files?.length) return;
    if (name === "audioFiles") {
      setUploadFiles((prev) => ({ ...prev, audioFiles: Array.from(files) }));
      return;
    }
    setUploadFiles((prev) => ({ ...prev, [name]: files[0] }));
  };

  const resetSongForm = () => {
    setFormData({ title: "", artist: "", language: "", duration: 0 });
    setUploadFiles({ audio: null, image: null, audioFiles: [], metadata: null });
    setSongUploadMode("single");
    setEditingSong(null);
  };

  const resetAlbumForm = () => {
    setAlbumFormData({ title: "", artist: "", cover: "", description: "" });
    setAlbumFiles({ coverImage: null, audioFiles: [], metadata: null });
    setEditingAlbum(null);
  };

  const handleCreateOrUpdateSong = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      if (editingSong) {
        const response = await apiRequest(`/songs/${editingSong.id}`, {
          method: "PUT",
          body: JSON.stringify({
            title: formData.title || editingSong.title,
            artist: formData.artist || editingSong.artist,
            language: formData.language || editingSong.language,
            duration: formData.duration || editingSong.duration,
          }),
        });

        setSongs((prev) => prev.map((song) => (song.id === editingSong.id ? response.song : song)));
        setSuccess("Song updated successfully");
      } else {
        if (songUploadMode === "bulk") {
          if (!uploadFiles.audioFiles.length) {
            setError("Select at least one audio file");
            setLoading(false);
            return;
          }

          const data = new FormData();
          data.append("artist", formData.artist);
          data.append("language", formData.language);
          uploadFiles.audioFiles.forEach((file) => {
            data.append("audioFiles", file);
          });
          if (uploadFiles.image) data.append("image", uploadFiles.image);
          if (uploadFiles.metadata) data.append("metadata", uploadFiles.metadata);

          const response = await apiRequest("/uploads/create-songs-bulk", {
            method: "POST",
            body: data,
          });

          setSongs((prev) => [...response.songs, ...prev]);
          setSuccess(`${response.songs.length} songs created successfully`);
        } else {
          if (!uploadFiles.audio) {
            setError("Audio file is required");
            setLoading(false);
            return;
          }

          const data = new FormData();
          data.append("title", formData.title);
          data.append("artist", formData.artist);
          data.append("language", formData.language);
          data.append("duration", String(formData.duration || 0));
          data.append("audio", uploadFiles.audio);
          if (uploadFiles.image) data.append("image", uploadFiles.image);

          const response = await apiRequest("/uploads/create-song", {
            method: "POST",
            body: data,
          });

          setSongs((prev) => [response.song, ...prev]);
          setSuccess("Song created successfully");
        }
      }

      resetSongForm();
      setShowForm(false);
      await fetchSongs();
      await refreshGlobalSongs();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOrUpdateAlbum = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      if (editingAlbum) {
        const response = await apiRequest(`/albums/${editingAlbum.albumId}`, {
          method: "PUT",
          body: JSON.stringify({
            title: albumFormData.title || editingAlbum.title,
            artist: albumFormData.artist || editingAlbum.artist,
            cover: albumFormData.cover || editingAlbum.cover,
            description: albumFormData.description || editingAlbum.description,
          }),
        });
        setAlbums((prev) =>
          prev.map((album) =>
            album.albumId === editingAlbum.albumId ? response.album : album
          )
        );
        setSuccess("Album updated successfully");
      } else {
        if (albumFiles.audioFiles.length > 0) {
          const data = new FormData();
          data.append("title", albumFormData.title);
          data.append("artist", albumFormData.artist);
          data.append("cover", albumFormData.cover);
          data.append("description", albumFormData.description);
          albumFiles.audioFiles.forEach((file) => {
            data.append("audioFiles", file);
          });
          if (albumFiles.coverImage) data.append("coverImage", albumFiles.coverImage);
          if (albumFiles.metadata) data.append("metadata", albumFiles.metadata);

          const response = await apiRequest("/albums/create-with-songs", {
            method: "POST",
            body: data,
          });
          setAlbums((prev) => [response.album, ...prev]);
          setSongs((prev) => [...response.songs, ...prev]);
          setSuccess(`Album created with ${response.songs.length} songs`);
          await refreshGlobalSongs();
        } else {
          const response = await apiRequest("/albums", {
            method: "POST",
            body: JSON.stringify({
              title: albumFormData.title,
              artist: albumFormData.artist,
              cover: albumFormData.cover,
              description: albumFormData.description,
            }),
          });
          setAlbums((prev) => [response.album, ...prev]);
          setSuccess("Album created successfully");
        }
      }

      resetAlbumForm();
      setShowForm(false);
      await fetchAlbums();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSong = async (songId) => {
    if (!window.confirm("Delete this song?")) return;
    try {
      setLoading(true);
      await apiRequest(`/songs/${songId}`, { method: "DELETE" });
      setSongs((prev) => prev.filter((song) => song.id !== songId));
      setSuccess("Song deleted successfully");
      await refreshGlobalSongs();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAlbum = async (albumId) => {
    if (!window.confirm("Delete this album?")) return;
    try {
      setLoading(true);
      await apiRequest(`/albums/${albumId}`, { method: "DELETE" });
      setAlbums((prev) => prev.filter((album) => album.albumId !== albumId));
      setSuccess("Album deleted successfully");
      await fetchSongs();
      await refreshGlobalSongs();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSongToAlbum = async (albumId, songId) => {
    try {
      await apiRequest(`/albums/${albumId}/songs/${songId}`, {
        method: "POST",
      });
      setSuccess("Song added to album");
      await fetchAlbums();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleEditSong = (song) => {
    setEditingSong(song);
    setFormData({
      title: song.title || "",
      artist: song.artist || "",
      language: song.language || "",
      duration: song.duration || 0,
    });
    setShowForm(true);
  };

  const handleEditAlbum = (album) => {
    setEditingAlbum(album);
    setAlbumFormData({
      title: album.title || "",
      artist: album.artist || "",
      cover: album.cover || "",
      description: album.description || "",
    });
    setShowForm(true);
  };

  if (user?.role !== "artist") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white">Access Denied</h1>
          <p className="mt-2 text-zinc-400">Only artists can access this dashboard.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-1 md:p-4">
      <div className="mx-auto max-w-6xl">
        <h1 className="text-4xl font-bold text-white">Artist Dashboard</h1>
        <p className="mb-8 mt-1 text-zinc-400">Welcome, {user?.name}</p>

        <div className="mb-8 flex gap-4">
          <button
            onClick={() => setActiveTab("songs")}
            className={`rounded-lg px-6 py-2 font-bold transition ${
              activeTab === "songs"
                ? "bg-green-600 text-white"
                : "bg-zinc-700 text-zinc-300 hover:bg-zinc-600"
            }`}
          >
            Songs
          </button>
          <button
            onClick={() => setActiveTab("albums")}
            className={`rounded-lg px-6 py-2 font-bold transition ${
              activeTab === "albums"
                ? "bg-green-600 text-white"
                : "bg-zinc-700 text-zinc-300 hover:bg-zinc-600"
            }`}
          >
            Albums
          </button>
        </div>

        {error && <div className="mb-6 rounded-lg border border-red-700 bg-red-900/30 px-4 py-3 text-red-300">{error}</div>}
        {success && <div className="mb-6 rounded-lg border border-green-700 bg-green-900/30 px-4 py-3 text-green-300">{success}</div>}

        <div className="mb-8">
          <button
            onClick={() => {
              const opening = !showForm;
              setShowForm(opening);
              if (!opening) {
                resetSongForm();
                resetAlbumForm();
                return;
              }
              if (activeTab === "songs") resetSongForm();
              else resetAlbumForm();
            }}
            className="rounded-lg bg-green-600 px-6 py-2 font-bold text-white transition hover:bg-green-700"
          >
            {showForm ? "Cancel" : activeTab === "songs" ? "Upload New Song" : "Create Album"}
          </button>
        </div>

        {showForm && activeTab === "songs" && (
          <div className="mb-8 rounded-lg border border-zinc-700 bg-zinc-800 p-6">
            <h2 className="mb-6 text-2xl font-bold text-white">
              {editingSong ? "Edit Song" : "Upload New Song"}
            </h2>

            <form onSubmit={handleCreateOrUpdateSong} className="space-y-6">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                {(!editingSong && songUploadMode === "bulk") ? (
                  <div className="rounded-lg border border-zinc-700 bg-zinc-900/60 px-4 py-3 text-sm text-zinc-300">
                    Titles will be created from file names.
                  </div>
                ) : (
                  <input
                    type="text"
                    name="title"
                    required
                    value={formData.title}
                    onChange={handleFormChange}
                    placeholder="Song title"
                    className="w-full rounded-lg border border-zinc-600 bg-zinc-700 px-4 py-2 text-white placeholder-zinc-400 outline-none focus:border-green-500"
                  />
                )}

                <input
                  type="text"
                  name="artist"
                  required
                  value={formData.artist}
                  onChange={handleFormChange}
                  placeholder="Artist name"
                  className="w-full rounded-lg border border-zinc-600 bg-zinc-700 px-4 py-2 text-white placeholder-zinc-400 outline-none focus:border-green-500"
                />

                <input
                  type="text"
                  name="language"
                  value={formData.language}
                  onChange={handleFormChange}
                  placeholder="Language"
                  className="w-full rounded-lg border border-zinc-600 bg-zinc-700 px-4 py-2 text-white placeholder-zinc-400 outline-none focus:border-green-500"
                />

                {(!editingSong && songUploadMode === "bulk") ? (
                  <div className="rounded-lg border border-zinc-700 bg-zinc-900/60 px-4 py-3 text-sm text-zinc-400">
                    Duration will default to 0 and can be edited later.
                  </div>
                ) : (
                  <input
                    type="number"
                    name="duration"
                    value={formData.duration}
                    onChange={handleFormChange}
                    placeholder="Duration (seconds)"
                    className="w-full rounded-lg border border-zinc-600 bg-zinc-700 px-4 py-2 text-white placeholder-zinc-400 outline-none focus:border-green-500"
                  />
                )}
              </div>

              {!editingSong && (
                <>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setSongUploadMode("single")}
                      className={`rounded px-4 py-2 text-sm font-semibold ${
                        songUploadMode === "single"
                          ? "bg-green-600 text-white"
                          : "bg-zinc-700 text-zinc-300"
                      }`}
                    >
                      Single
                    </button>
                    <button
                      type="button"
                      onClick={() => setSongUploadMode("bulk")}
                      className={`rounded px-4 py-2 text-sm font-semibold ${
                        songUploadMode === "bulk"
                          ? "bg-green-600 text-white"
                          : "bg-zinc-700 text-zinc-300"
                      }`}
                    >
                      Bulk
                    </button>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    {songUploadMode === "bulk" ? (
                      <div className="space-y-4 md:col-span-2">
                        <div className="rounded-lg border border-zinc-600 bg-zinc-700 px-4 py-2 text-zinc-300">
                          <input
                            type="file"
                            name="audioFiles"
                            accept="audio/*"
                            multiple
                            onChange={handleFileChange}
                            className="w-full"
                          />
                          {uploadFiles.audioFiles.length > 0 && (
                            <p className="mt-2 text-xs text-zinc-400">
                              {uploadFiles.audioFiles.length} audio files selected
                            </p>
                          )}
                        </div>
                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="rounded-lg border border-zinc-600 bg-zinc-700 px-4 py-2 text-zinc-300">
                            <input
                              type="file"
                              name="metadata"
                              accept=".csv,.tsv,.xlsx,.xls"
                              onChange={handleFileChange}
                              className="w-full"
                            />
                            <p className="mt-2 text-xs text-zinc-400">
                              Optional metadata file: `filename`, `title`, `artist`, `language`, `duration`, `image`
                            </p>
                            {uploadFiles.metadata && (
                              <p className="mt-1 text-xs text-zinc-400">
                                Metadata: {uploadFiles.metadata.name}
                              </p>
                            )}
                          </div>
                          <div className="rounded-lg border border-zinc-700 bg-zinc-900/60 px-4 py-3 text-sm text-zinc-300">
                            <p>Match spreadsheet `filename` with audio file names.</p>
                            <a
                              href="/bulk-song-template.csv"
                              target="_blank"
                              rel="noreferrer"
                              className="mt-2 inline-block text-sm text-green-400 hover:text-green-300"
                            >
                              Download sample CSV
                            </a>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <input
                        type="file"
                        name="audio"
                        accept="audio/*"
                        onChange={handleFileChange}
                        className="w-full rounded-lg border border-zinc-600 bg-zinc-700 px-4 py-2 text-zinc-300"
                      />
                    )}
                    {songUploadMode !== "bulk" && (
                      <input
                        type="file"
                        name="image"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="w-full rounded-lg border border-zinc-600 bg-zinc-700 px-4 py-2 text-zinc-300"
                      />
                    )}
                  </div>
                  {songUploadMode === "bulk" && (
                    <input
                      type="file"
                      name="image"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="w-full rounded-lg border border-zinc-600 bg-zinc-700 px-4 py-2 text-zinc-300"
                    />
                  )}
                </>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-green-600 py-2 font-bold text-white transition hover:bg-green-700 disabled:opacity-50"
              >
                {loading
                  ? "Processing..."
                  : editingSong
                    ? "Update Song"
                    : songUploadMode === "bulk"
                      ? "Upload Songs"
                      : "Upload Song"}
              </button>
            </form>
          </div>
        )}

        {showForm && activeTab === "albums" && (
          <div className="mb-8 rounded-lg border border-zinc-700 bg-zinc-800 p-6">
            <h2 className="mb-6 text-2xl font-bold text-white">
              {editingAlbum ? "Edit Album" : "Create Album"}
            </h2>

            <form onSubmit={handleCreateOrUpdateAlbum} className="space-y-6">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <input
                  type="text"
                  name="title"
                  required
                  value={albumFormData.title}
                  onChange={handleAlbumFormChange}
                  placeholder="Album title"
                  className="w-full rounded-lg border border-zinc-600 bg-zinc-700 px-4 py-2 text-white placeholder-zinc-400 outline-none focus:border-green-500"
                />
                <input
                  type="text"
                  name="artist"
                  required
                  value={albumFormData.artist}
                  onChange={handleAlbumFormChange}
                  placeholder="Artist name"
                  className="w-full rounded-lg border border-zinc-600 bg-zinc-700 px-4 py-2 text-white placeholder-zinc-400 outline-none focus:border-green-500"
                />
              </div>
              <input
                type="url"
                name="cover"
                value={albumFormData.cover}
                onChange={handleAlbumFormChange}
                placeholder="Cover URL (optional if you upload image)"
                className="w-full rounded-lg border border-zinc-600 bg-zinc-700 px-4 py-2 text-white placeholder-zinc-400 outline-none focus:border-green-500"
              />
              <textarea
                name="description"
                value={albumFormData.description}
                onChange={handleAlbumFormChange}
                placeholder="Description"
                rows={4}
                className="w-full rounded-lg border border-zinc-600 bg-zinc-700 px-4 py-2 text-white placeholder-zinc-400 outline-none focus:border-green-500"
              />
              {!editingAlbum && (
                <div className="space-y-4 rounded-lg border border-zinc-700 bg-zinc-900/50 p-4">
                  <p className="text-sm font-medium text-zinc-200">
                    Upload movie cover and all album songs together
                  </p>
                  <div className="grid gap-4 md:grid-cols-2">
                    <input
                      type="file"
                      name="coverImage"
                      accept="image/*"
                      onChange={handleAlbumFileChange}
                      className="w-full rounded-lg border border-zinc-600 bg-zinc-700 px-4 py-2 text-zinc-300"
                    />
                    <div className="rounded-lg border border-zinc-600 bg-zinc-700 px-4 py-2 text-zinc-300">
                      <input
                        type="file"
                        name="audioFiles"
                        accept="audio/*"
                        multiple
                        onChange={handleAlbumFileChange}
                        className="w-full"
                      />
                      {albumFiles.audioFiles.length > 0 && (
                        <p className="mt-2 text-xs text-zinc-400">
                          {albumFiles.audioFiles.length} song files selected
                        </p>
                      )}
                    </div>
                    <div className="rounded-lg border border-zinc-600 bg-zinc-700 px-4 py-2 text-zinc-300">
                      <input
                        type="file"
                        name="metadata"
                        accept=".csv,.tsv,.xlsx,.xls"
                        onChange={handleAlbumFileChange}
                        className="w-full"
                      />
                      <p className="mt-2 text-xs text-zinc-400">
                        Optional metadata file for song names, language and duration
                      </p>
                      {albumFiles.metadata && (
                        <p className="mt-1 text-xs text-zinc-400">
                          Metadata: {albumFiles.metadata.name}
                        </p>
                      )}
                    </div>
                    <div className="rounded-lg border border-zinc-700 bg-zinc-950/60 px-4 py-3 text-sm text-zinc-300">
                      <p>Audio file names can be matched from the metadata sheet.</p>
                      <a
                        href="/bulk-song-template.csv"
                        target="_blank"
                        rel="noreferrer"
                        className="mt-2 inline-block text-sm text-green-400 hover:text-green-300"
                      >
                        Download sample CSV
                      </a>
                    </div>
                  </div>
                </div>
              )}
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-green-600 py-2 font-bold text-white transition hover:bg-green-700 disabled:opacity-50"
              >
                {loading
                  ? "Processing..."
                  : editingAlbum
                    ? "Update Album"
                    : albumFiles.audioFiles.length > 0
                      ? "Create Album With Songs"
                      : "Create Album"}
              </button>
            </form>
          </div>
        )}

        {activeTab === "songs" && (
          <div>
            <h2 className="mb-6 text-2xl font-bold text-white">Your Songs</h2>
            {loading && !showForm ? (
              <p className="text-zinc-400">Loading songs...</p>
            ) : songs.length === 0 ? (
              <p className="text-zinc-400">No songs yet. Upload your first song.</p>
            ) : (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                {songs.map((song) => (
                  <div
                    key={song.id}
                    className="overflow-hidden rounded-lg border border-zinc-700 bg-zinc-800 transition hover:border-zinc-600"
                  >
                    {song.image && (
                      <img src={song.image} alt={song.title} className="h-40 w-full object-cover" />
                    )}
                    <div className="p-4">
                      <h3 className="mb-1 text-lg font-bold text-white">{song.title}</h3>
                      <p className="mb-1 text-sm text-zinc-400">{song.artist}</p>
                      <p className="mb-4 text-xs text-zinc-500">
                        {song.language || "Unknown"} • {Math.floor((song.duration || 0) / 60)}:
                        {((song.duration || 0) % 60).toString().padStart(2, "0")}
                      </p>
                      <div className="mb-3 flex gap-2">
                        <button
                          onClick={() => playSong(song)}
                          className="flex-1 rounded bg-green-600 px-3 py-2 text-sm font-bold text-white transition hover:bg-green-700"
                        >
                          Play
                        </button>
                        <button
                          onClick={() => handleEditSong(song)}
                          className="flex-1 rounded bg-blue-600 px-3 py-2 text-sm font-bold text-white transition hover:bg-blue-700"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteSong(song.id)}
                          className="flex-1 rounded bg-red-600 px-3 py-2 text-sm font-bold text-white transition hover:bg-red-700"
                        >
                          Delete
                        </button>
                      </div>
                      <div className="mb-3 flex gap-2">
                        <button
                          onClick={() => playNextInQueue(song)}
                          className="flex-1 rounded bg-zinc-700 px-3 py-2 text-xs font-semibold text-white transition hover:bg-zinc-600"
                        >
                          Play Next
                        </button>
                        <button
                          onClick={() => addToQueue(song)}
                          className="flex-1 rounded bg-zinc-700 px-3 py-2 text-xs font-semibold text-white transition hover:bg-zinc-600"
                        >
                          Queue
                        </button>
                      </div>
                      <select
                        onChange={(e) => {
                          if (e.target.value) {
                            handleAddSongToAlbum(e.target.value, song.id);
                            e.target.value = "";
                          }
                        }}
                        className="w-full rounded border border-zinc-600 bg-zinc-700 px-2 py-1 text-sm text-white outline-none focus:border-green-500"
                      >
                        <option value="">Add to album...</option>
                        {albums.map((album) => (
                          <option key={album.albumId} value={album.albumId}>
                            {album.title}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "albums" && (
          <div>
            <h2 className="mb-6 text-2xl font-bold text-white">Your Albums</h2>
            {loading && !showForm ? (
              <p className="text-zinc-400">Loading albums...</p>
            ) : albums.length === 0 ? (
              <p className="text-zinc-400">No albums yet. Create your first album.</p>
            ) : (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                {albums.map((album) => (
                  <div
                    key={album.albumId}
                    className="overflow-hidden rounded-lg border border-zinc-700 bg-zinc-800 transition hover:border-zinc-600"
                  >
                    {album.cover && (
                      <img src={album.cover} alt={album.title} className="h-40 w-full object-cover" />
                    )}
                    <div className="p-4">
                      <h3 className="mb-1 text-lg font-bold text-white">{album.title}</h3>
                      <p className="mb-1 text-sm text-zinc-400">{album.artist}</p>
                      <p className="mb-2 text-xs text-zinc-500">{album.totalSongs} songs</p>
                      {album.description && (
                        <p className="mb-4 line-clamp-2 text-xs text-zinc-400">{album.description}</p>
                      )}
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEditAlbum(album)}
                          className="flex-1 rounded bg-blue-600 px-3 py-2 text-sm font-bold text-white transition hover:bg-blue-700"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteAlbum(album.albumId)}
                          className="flex-1 rounded bg-red-600 px-3 py-2 text-sm font-bold text-white transition hover:bg-red-700"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
