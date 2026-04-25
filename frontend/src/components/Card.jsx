/* eslint-disable react-hooks/set-state-in-effect */
import { usePlayer } from "../context/PlayerContext";
import { useAuth } from "../context/AuthContext";
import { FaPlay, FaHeart, FaListOl } from "react-icons/fa";
import { useState, useEffect, useCallback } from "react";
import { apiRequest } from "../lib/api";

const Card = ({ id, title, desc, image }) => {
  const { playSong, addToQueue, playNextInQueue } = usePlayer();
  const { user } = useAuth();
  const [isLiked, setIsLiked] = useState(false);
  const [likes, setLikes] = useState(0);

  const fetchLikeStatus = useCallback(async () => {
    try {
      const response = await apiRequest(`/songs/${id}/likes`);
      setIsLiked(response.isLiked);
      setLikes(response.likesCount);
    } catch {
      setIsLiked(false);
      setLikes(0);
    }
  }, [id]);

  useEffect(() => {
    if (user && id) {
      void fetchLikeStatus();
    }
  }, [fetchLikeStatus, id, user]);

  const handleLikeClick = async (e) => {
    e.stopPropagation();
    if (!user) return;

    try {
      if (isLiked) {
        await apiRequest(`/songs/${id}/like`, { method: "DELETE" });
        setIsLiked(false);
        setLikes((prev) => Math.max(0, prev - 1));
      } else {
        await apiRequest(`/songs/${id}/like`, { method: "POST" });
        setIsLiked(true);
        setLikes((prev) => prev + 1);
      }
    } catch {
      // Ignore toggle error in card UI
    }
  };

  const displayedIsLiked = user ? isLiked : false;
  const displayedLikes = user ? likes : 0;

  return (
    <div className="group cursor-pointer rounded-xl bg-zinc-900/70 p-4 transition duration-300 hover:bg-zinc-800">
      <div className="relative">
        <img src={image} alt={title} className="h-40 w-full rounded-lg object-cover" />
        <button
          onClick={() => playSong(id)}
          className="absolute bottom-3 right-3 grid h-11 w-11 place-items-center rounded-full bg-green-500 text-black opacity-0 shadow-lg transition group-hover:opacity-100"
          title="Play now"
        >
          <FaPlay className="ml-0.5 text-sm" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            playNextInQueue(id);
          }}
          className="absolute bottom-3 right-16 grid h-11 w-11 place-items-center rounded-full bg-zinc-700 text-white opacity-0 shadow-lg transition group-hover:opacity-100"
          title="Play next"
        >
          <FaListOl className="text-sm" />
        </button>
        <button
          onClick={handleLikeClick}
          className="absolute bottom-3 left-3 grid h-11 w-11 place-items-center rounded-full bg-zinc-700 opacity-0 shadow-lg transition group-hover:opacity-100"
          title={displayedIsLiked ? "Unlike" : "Like"}
        >
          <FaHeart className={`text-lg ${displayedIsLiked ? "text-red-500" : "text-white"}`} />
        </button>
      </div>
      <h3 className="mt-3 truncate font-semibold">{title}</h3>
      <div className="mt-1 flex items-center justify-between">
        <p className="truncate text-sm text-zinc-400">{desc}</p>
        {displayedLikes > 0 && <span className="text-xs text-zinc-400">{displayedLikes} likes</span>}
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          addToQueue(id);
        }}
        className="mt-2 text-xs text-zinc-400 hover:text-white"
      >
        Add to queue
      </button>
    </div>
  );
};

export default Card;
