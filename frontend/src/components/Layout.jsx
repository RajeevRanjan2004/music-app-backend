import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import Player from "./Player";
import { Outlet } from "react-router-dom";

const Layout = () => {
  return (
    <div className="h-screen bg-black text-white">
      <div className="flex h-[calc(100vh-96px)] overflow-hidden p-2 md:p-3">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden rounded-2xl bg-gradient-to-b from-zinc-800/70 via-zinc-900 to-black">
          <Navbar />
          <div className="flex-1 overflow-y-auto px-4 pb-10 pt-4 md:px-6">
            <Outlet />
          </div>
        </div>
      </div>
      <Player />
    </div>
  );
};

export default Layout;