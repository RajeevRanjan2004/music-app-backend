import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";
import {
  browserCanNavigateBack,
  canNavigateBack,
  consumeNavigationBackTarget,
} from "../lib/navigation";

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const handleBack = () => {
    if (browserCanNavigateBack()) {
      navigate(-1);
      return;
    }

    const previousPath = consumeNavigationBackTarget(location);
    if (previousPath) {
      navigate(previousPath, { replace: true });
      return;
    }

    if (location.pathname !== "/") {
      navigate("/");
    }
  };

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center justify-between bg-black/20 px-4 backdrop-blur-lg md:px-6">
      <div className="flex items-center gap-3">
        <button
          onClick={handleBack}
          className="rounded-full bg-black/70 p-2 text-sm hover:bg-zinc-800"
          disabled={!canNavigateBack() && location.pathname === "/"}
        >
          <FaChevronLeft />
        </button>
        <button
          onClick={() => navigate(1)}
          className="rounded-full bg-black/70 p-2 text-sm hover:bg-zinc-800"
        >
          <FaChevronRight />
        </button>
      </div>

      <div className="flex items-center gap-4">
        {!user ? (
          <>
            <Link
              to="/register"
              className="text-sm font-semibold text-zinc-300 hover:text-white"
            >
              Sign up
            </Link>

            <Link
              to="/login"
              className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-black"
            >
              Log in
            </Link>
          </>
        ) : (
          <>
            <button
              onClick={() => navigate("/profile")}
              className="flex items-center gap-2 rounded-full bg-zinc-800 px-3 py-1 transition hover:bg-zinc-700"
            >
              <div className="grid h-8 w-8 place-items-center overflow-hidden rounded-full bg-green-500">
                {user.avatar ? (
                  <img
                    src={user.avatar}
                    alt={user.name || "User"}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-xs font-bold text-black">
                    {(user.name || "U").slice(0, 1).toUpperCase()}
                  </span>
                )}
              </div>
              <span className="text-sm font-medium">
                {user.name || "User"} ({user.role || "user"})
              </span>
            </button>

            {user.role === "artist" && (
              <Link
                to="/artist-dashboard"
                className="rounded-full bg-blue-600 hover:bg-blue-700 px-4 py-1.5 text-sm font-semibold text-white transition"
              >
                Dashboard
              </Link>
            )}

            <button
              onClick={handleLogout}
              className="rounded-full bg-zinc-100 px-4 py-1.5 text-sm font-semibold text-black hover:bg-white"
            >
              Logout
            </button>
          </>
        )}
      </div>
    </header>
  );
};

export default Navbar;
