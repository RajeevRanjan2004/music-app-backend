/* eslint-disable react-refresh/only-export-components, react-hooks/set-state-in-effect */
import { createContext, useContext, useMemo, useState, useEffect, useCallback } from "react";
import { apiRequest } from "../lib/api";

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

  const fetchSongs = useCallback(async () => {
    setLoadingSongs(true);
    try {
      const data = await apiRequest("/songs?sort=likes&limit=100");
      setSongs(data.songs || []);
      setCurrentIndex(0);
    } catch {
      setSongs([]);
    } finally {
      setLoadingSongs(false);
    }
  }, []);

  const fetchContinueSongs = useCallback(async () => {
    try {
      const data = await apiRequest("/songs/continue");
      setContinueSongs(data.songs || []);
    } catch {
      setContinueSongs([]);
    }
  }, []);

  const fetchRecentSongs = useCallback(async () => {
    try {
      const data = await apiRequest("/songs/recent");
      setRecentSongs(data.recent || []);
    } catch {
      setRecentSongs([]);
    }
  }, []);

  useEffect(() => {
    void fetchSongs();
  }, [fetchSongs]);

  const songMap = useMemo(() => {
    return new Map(songs.map((song) => [song.id, song]));
  }, [songs]);

  const playSong = useCallback((identifier) => {
    if (!songs.length) return;

    if (typeof identifier === "number") {
      setCurrentIndex(identifier);
      setIsPlaying(true);
      return;
    }

    const index = songs.findIndex((song) => song.id === identifier);
    if (index >= 0) {
      setCurrentIndex(index);
      setIsPlaying(true);
    }
  }, [songs]);

  const addToQueue = useCallback((songId) => {
    if (!songMap.has(songId)) return;
    setQueue((prev) => [...prev, songId]);
  }, [songMap]);

  const playNextInQueue = useCallback((songId) => {
    if (!songMap.has(songId)) return;
    setQueue((prev) => [songId, ...prev]);
  }, [songMap]);

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
    return data.song;
  }, [fetchSongs]);

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
