/* eslint-disable react-refresh/only-export-components, react-hooks/set-state-in-effect */
import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { apiRequest, resolveApiAssetUrl } from "../lib/api";

const PlayerContext = createContext();

export const PlayerProvider = ({ children }) => {
  const [songs, setSongs] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState(false);
  const [loadingSongs, setLoadingSongs] = useState(true);
  const [queue, setQueue] = useState([]);
  const [continueSongs, setContinueSongs] = useState([]);
  const [recentSongs, setRecentSongs] = useState([]);

  const normalizeSong = useCallback((song) => {
    if (!song || typeof song !== "object") {
      return null;
    }

    const id = song.id ?? song.songId;
    if (!id) {
      return null;
    }

    return {
      ...song,
      id,
      title: song.title || "Untitled Song",
      artist: song.artist || "Unknown Artist",
      image: resolveApiAssetUrl(song.image || song.cover || "https://picsum.photos/300/300"),
      src: resolveApiAssetUrl(song.src || song.audioUrl || ""),
      duration: Number(song.duration) || 0,
      sourcePlatform: song.sourcePlatform || "uploaded",
    };
  }, []);

  const fetchSongs = useCallback(async () => {
    setLoadingSongs(true);
    try {
      const data = await apiRequest("/songs?sort=likes&limit=100");
      const nextSongs = (data.songs || []).map(normalizeSong).filter(Boolean);
      setSongs(nextSongs);
      setCurrentIndex((prevIndex) => {
        const currentSongId = songs[prevIndex]?.id;
        if (!currentSongId) {
          return 0;
        }

        const nextIndex = nextSongs.findIndex((song) => song.id === currentSongId);
        return nextIndex >= 0 ? nextIndex : 0;
      });
    } catch {
      setSongs([]);
    } finally {
      setLoadingSongs(false);
    }
  }, [normalizeSong, songs]);

  const fetchContinueSongs = useCallback(async () => {
    try {
      const data = await apiRequest("/songs/continue");
      setContinueSongs((data.songs || []).map(normalizeSong).filter(Boolean));
    } catch {
      setContinueSongs([]);
    }
  }, [normalizeSong]);

  const fetchRecentSongs = useCallback(async () => {
    try {
      const data = await apiRequest("/songs/recent");
      setRecentSongs((data.recent || []).map(normalizeSong).filter(Boolean));
    } catch {
      setRecentSongs([]);
    }
  }, [normalizeSong]);

  useEffect(() => {
    void fetchSongs();
  }, [fetchSongs]);

  const ensureSongInState = useCallback((song) => {
    const normalizedSong = normalizeSong(song);
    if (!normalizedSong) {
      return null;
    }

    const existingIndex = songs.findIndex((item) => item.id === normalizedSong.id);
    if (existingIndex >= 0) {
      setSongs((prev) =>
        prev.map((item, index) =>
          index === existingIndex ? { ...item, ...normalizedSong } : item
        )
      );

      return {
        id: normalizedSong.id,
        index: existingIndex,
      };
    }

    setSongs((prev) => [normalizedSong, ...prev]);
    return {
      id: normalizedSong.id,
      index: 0,
    };
  }, [normalizeSong, songs]);

  const resolveSongEntry = useCallback((identifier) => {
    if (typeof identifier === "object") {
      return ensureSongInState(identifier);
    }

    if (typeof identifier === "string") {
      const index = songs.findIndex((song) => song.id === identifier);
      if (index >= 0) {
        return { id: identifier, index };
      }
    }

    return null;
  }, [ensureSongInState, songs]);

  const playSong = useCallback((identifier) => {
    if (typeof identifier === "number") {
      if (!songs.length) return;
      setCurrentIndex(identifier);
      setIsPlaying(true);
      return;
    }

    const resolvedSong = resolveSongEntry(identifier);
    if (resolvedSong) {
      setCurrentIndex(resolvedSong.index);
      setIsPlaying(true);
    }
  }, [resolveSongEntry, songs.length]);

  const addToQueue = useCallback((identifier) => {
    const resolvedSong = resolveSongEntry(identifier);
    if (!resolvedSong) return;
    setQueue((prev) => [...prev, resolvedSong.id]);
  }, [resolveSongEntry]);

  const playNextInQueue = useCallback((identifier) => {
    const resolvedSong = resolveSongEntry(identifier);
    if (!resolvedSong) return;
    setQueue((prev) => [resolvedSong.id, ...prev]);
  }, [resolveSongEntry]);

  const removeFromQueue = useCallback((songId) => {
    setQueue((prev) => prev.filter((id) => id !== songId));
  }, []);

  const clearQueue = useCallback(() => {
    setQueue([]);
  }, []);

  const consumeQueuedSong = useCallback(() => {
    if (!queue.length) return null;
    const [nextId, ...rest] = queue;
    setQueue(rest);
    return nextId;
  }, [queue]);

  const markListeningProgress = useCallback(async ({ songId, position, duration, completed }) => {
    try {
      await apiRequest(`/songs/${songId}/progress`, {
        method: "POST",
        body: JSON.stringify({ position, duration, completed }),
      });
    } catch {
      // Ignore progress write errors on UI
    }
  }, []);

  const createSong = useCallback(async (payload) => {
    const data = await apiRequest("/songs", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    await fetchSongs();
    return normalizeSong(data.song);
  }, [fetchSongs, normalizeSong]);

  return (
    <PlayerContext.Provider
      value={{
        songs,
        loadingSongs,
        currentIndex,
        setCurrentIndex,
        isPlaying,
        setIsPlaying,
        shuffle,
        setShuffle,
        repeat,
        setRepeat,
        queue,
        addToQueue,
        playNextInQueue,
        removeFromQueue,
        clearQueue,
        consumeQueuedSong,
        playSong,
        fetchSongs,
        createSong,
        markListeningProgress,
        continueSongs,
        recentSongs,
        fetchContinueSongs,
        fetchRecentSongs,
      }}
    >
      {children}
    </PlayerContext.Provider>
  );
};

export const usePlayer = () => useContext(PlayerContext);
