import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import Search from "./pages/Search";
import Library from "./pages/Library";
import LikedSongs from "./pages/LikedSongs";
import Playlists from "./pages/Playlists";
import Profile from "./pages/Profile";
import AlbumDetail from "./pages/AlbumDetail";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ArtistDashboard from "./pages/ArtistDashboard";

function App() {
  return (
    <BrowserRouter>
      <Routes>

        {}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />

        {}
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="search" element={<Search />} />
          <Route path="library" element={<Library />} />
          <Route path="liked-songs" element={<LikedSongs />} />
          <Route path="playlists" element={<Playlists />} />
          <Route path="profile" element={<Profile />} />
          <Route path="albums/:albumId" element={<AlbumDetail />} />
          <Route path="artist-dashboard" element={<ArtistDashboard />} />
        </Route>

      </Routes>
    </BrowserRouter>
  );
}

export default App;

