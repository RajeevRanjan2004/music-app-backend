import { useEffect, useMemo, useRef, useState } from "react";
import { usePlayer } from "../context/PlayerContext";
import {
  FaPlay,
  FaPause,
  FaStepForward,
  FaStepBackward,
  FaRandom,
  FaRedo,
  FaVolumeUp,
} from "react-icons/fa";

const SAVE_EVERY_SECONDS = 10;

const Player = () => {
  const {
    songs,
    currentIndex,
    setCurrentIndex,
    isPlaying,
    setIsPlaying,
    shuffle,
    setShuffle,
    repeat,
    setRepeat,
    queue,
    removeFromQueue,
    clearQueue,
    consumeQueuedSong,
    playSong,
    markListeningProgress,
  } = usePlayer();

  const audioRef = useRef(null);
  const [progress, setProgress] = useState(0);
  const [volume, setVolume] = useState(0.5);
  const [showQueue, setShowQueue] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const lastSavedSecondRef = useRef(-1);

  const hasSongs = songs.length > 0;
  const currentSong = hasSongs ? songs[currentIndex] : null;
  const upNextSongs = useMemo(
    () =>
      queue
        .map((songId) => songs.find((song) => song.id === songId))
        .filter(Boolean),
    [queue, songs]
  );

  const formatTime = (time) => {
    if (!time || Number.isNaN(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60)
      .toString()
      .padStart(2, "0");
    return `${minutes}:${seconds}`;
  };

  const saveProgress = (completed = false) => {
    if (!audioRef.current || !currentSong?.id) return;
    const nextCurrentTime = audioRef.current.currentTime || 0;
    const nextDuration = audioRef.current.duration || currentSong.duration || 0;
    markListeningProgress({
      songId: currentSong.id,
      position: nextCurrentTime,
      duration: nextDuration,
      completed,
    });
  };

  const togglePlay = () => {
    if (!hasSongs || !audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      saveProgress(false);
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const nextSong = () => {
    if (!hasSongs) return;
    const queued = consumeQueuedSong();
    if (queued) {
      playSong(queued);
      return;
    }
    if (shuffle) {
      setCurrentIndex(Math.floor(Math.random() * songs.length));
    } else {
      setCurrentIndex((prev) => (prev + 1) % songs.length);
    }
  };

  const prevSong = () => {
    if (!hasSongs) return;
    setCurrentIndex((prev) => (prev === 0 ? songs.length - 1 : prev - 1));
  };

  const handleTimeUpdate = () => {
    if (!audioRef.current) return;
    const current = audioRef.current.currentTime;
    const nextDuration = audioRef.current.duration || 0;
    setCurrentTime(current);
    setDuration(nextDuration);
    if (nextDuration > 0) {
      setProgress((current / nextDuration) * 100);
    }

    const currentSecond = Math.floor(current);
    if (currentSecond > 0 && currentSecond % SAVE_EVERY_SECONDS === 0) {
      if (lastSavedSecondRef.current !== currentSecond) {
        lastSavedSecondRef.current = currentSecond;
        saveProgress(false);
      }
    }
  };

  const handleSeek = (e) => {
    if (!audioRef.current) return;
    const value = Number(e.target.value);
    audioRef.current.currentTime = (value / 100) * (audioRef.current.duration || 0);
    setProgress(value);
  };

  const handleVolume = (e) => {
    const value = Number(e.target.value);
    setVolume(value);
    if (audioRef.current) {
      audioRef.current.volume = value;
    }
  };

  const handleEnded = () => {
    if (!audioRef.current) return;
    saveProgress(true);
    if (repeat) {
      audioRef.current.currentTime = 0;
      audioRef.current.play();
    } else {
      nextSong();
    }
  };

  useEffect(() => {
    if (!hasSongs || !audioRef.current) return;
    lastSavedSecondRef.current = -1;
    setCurrentTime(0);
    setDuration(audioRef.current.duration || currentSong?.duration || 0);
    setProgress(0);
    if (isPlaying) audioRef.current.play();
  }, [currentIndex, currentSong?.duration, isPlaying, hasSongs]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  if (!hasSongs) {
    return (
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-zinc-800 bg-zinc-950/95 px-4 py-3 text-white backdrop-blur-md">
        <div className="mx-auto w-full max-w-[1400px]">
          <p className="text-sm text-zinc-400">Loading player...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-zinc-800 bg-zinc-950/95 px-4 py-3 text-white backdrop-blur-md">
      <div className="mx-auto grid w-full max-w-[1400px] grid-cols-1 items-center gap-3 md:grid-cols-3">
        <div className="flex items-center gap-3">
          <img
            src={currentSong.image}
            alt={currentSong.title}
            className="h-12 w-12 rounded-md object-cover"
          />
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold">{currentSong.title}</h3>
            <p className="truncate text-xs text-zinc-400">{currentSong.artist}</p>
          </div>
        </div>

        <div className="flex flex-col items-center">
          <div className="mb-2 flex items-center gap-5 text-lg">
            <button onClick={() => setShuffle(!shuffle)} aria-label="Toggle shuffle">
              <FaRandom className={shuffle ? "text-green-500" : "text-zinc-300"} />
            </button>
            <button onClick={prevSong} aria-label="Previous song">
              <FaStepBackward />
            </button>
            <button
              onClick={togglePlay}
              className="grid h-9 w-9 place-items-center rounded-full bg-white text-black"
              aria-label={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? <FaPause /> : <FaPlay className="ml-0.5" />}
            </button>
            <button onClick={nextSong} aria-label="Next song">
              <FaStepForward />
            </button>
            <button onClick={() => setRepeat(!repeat)} aria-label="Toggle repeat">
              <FaRedo className={repeat ? "text-green-500" : "text-zinc-300"} />
            </button>
          </div>
          <div className="flex w-full items-center gap-2">
            <span className="w-10 text-right text-xs text-zinc-400">
              {formatTime(currentTime)}
            </span>
            <input
              type="range"
              value={progress}
              onChange={handleSeek}
              className="w-full accent-green-500"
            />
            <span className="w-10 text-xs text-zinc-400">
              {formatTime(duration)}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-start gap-3 md:justify-end">
          <button
            onClick={() => setShowQueue((prev) => !prev)}
            className="rounded bg-zinc-800 px-2 py-1 text-xs hover:bg-zinc-700"
          >
            Up Next ({queue.length})
          </button>
          <FaVolumeUp className="text-zinc-400" />
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={handleVolume}
            className="w-28 accent-green-500"
          />
        </div>
      </div>

      {showQueue && (
        <div className="mx-auto mt-3 w-full max-w-[1400px] rounded-lg border border-zinc-800 bg-zinc-900/80 p-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-semibold">Up Next</p>
            <button
              onClick={clearQueue}
              className="text-xs text-zinc-400 hover:text-white"
              disabled={!queue.length}
            >
              Clear queue
            </button>
          </div>
          {!upNextSongs.length ? (
            <p className="text-xs text-zinc-400">Queue is empty.</p>
          ) : (
            <div className="space-y-2">
              {upNextSongs.slice(0, 6).map((song) => (
                <div key={`${song.id}-queue`} className="flex items-center justify-between gap-2">
                  <button
                    onClick={() => playSong(song.id)}
                    className="truncate text-left text-sm hover:text-green-400"
                  >
                    {song.title}
                    <span className="ml-2 text-xs text-zinc-400">{song.artist}</span>
                  </button>
                  <button
                    onClick={() => removeFromQueue(song.id)}
                    className="text-xs text-zinc-400 hover:text-white"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <audio
        ref={audioRef}
        src={currentSong.src}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
      />
    </div>
  );
};

export default Player;
