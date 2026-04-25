import { Link, useLocation } from "react-router-dom";
import { FaHome, FaSearch, FaBookOpen, FaHeart, FaListUl, FaUserEdit } from "react-icons/fa";
import musicfyLogo from "../assets/musicfy.png";

const Sidebar = () => {
  const location = useLocation();

  const links = [
    { to: "/", label: "Home", icon: FaHome },
    { to: "/search", label: "Search", icon: FaSearch },
    { to: "/library", label: "Your Library", icon: FaBookOpen },
    { to: "/liked-songs", label: "Liked Songs", icon: FaHeart },
    { to: "/playlists", label: "Playlists", icon: FaListUl },
    { to: "/profile", label: "Profile", icon: FaUserEdit },
  ];

  const renderLink = (item, compact = false) => {
    const Icon = item.icon;
    const isActive = location.pathname === item.to;

    return (
      <Link
        key={item.to}
        to={item.to}
        className={`flex items-center gap-3 rounded-lg transition ${
          compact
            ? `min-w-max px-4 py-2 text-sm font-semibold ${
                isActive
                  ? "bg-zinc-800 text-white"
                  : "bg-zinc-900/70 text-zinc-300 hover:bg-zinc-800 hover:text-white"
              }`
            : `mb-1 px-3 py-2 text-sm font-medium ${
                isActive
                  ? "bg-zinc-800 text-white"
                  : "text-zinc-400 hover:bg-zinc-800/60 hover:text-white"
              }`
        }`}
      >
        <Icon className={isActive ? "text-green-500" : ""} />
        {item.label}
      </Link>
    );
  };

  return (
    <>
      <aside className="mb-3 flex flex-col gap-3 md:hidden">
        <div className="rounded-2xl bg-zinc-950/90 p-4">
          <div className="flex items-center gap-3">
            <img
              src={musicfyLogo}
              alt="Musicfy"
              className="h-10 w-10 rounded-lg object-contain"
            />
            <h1 className="text-2xl font-extrabold tracking-tight text-white">
              Musicfy
            </h1>
          </div>
        </div>

        <nav className="flex gap-2 overflow-x-auto rounded-2xl bg-zinc-950/90 p-2">
          {links.map((item) => renderLink(item, true))}
        </nav>
      </aside>

      <aside className="hidden w-64 flex-col gap-3 rounded-2xl bg-zinc-950/90 p-3 md:flex">
        <div className="rounded-xl bg-zinc-900/80 p-5">
          <div className="flex items-center gap-3">
            <img
              src={musicfyLogo}
              alt="Musicfy"
              className="h-10 w-10 rounded-lg object-contain"
            />
            <h1 className="text-2xl font-extrabold tracking-tight text-white">
              Musicfy
            </h1>
          </div>
        </div>

        <nav className="rounded-xl bg-zinc-900/70 p-2">
          {links.map((item) => renderLink(item))}
        </nav>
      </aside>
    </>
  );
};

export default Sidebar;
