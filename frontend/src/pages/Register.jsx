import { Link } from "react-router-dom";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import musicfyLogo from "../assets/musicfy.png";

const Register = () => {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "user",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const newUser = await register(form);
      navigate(newUser?.role === "artist" ? "/library" : "/");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen flex items-center justify-center bg-black text-white">
      <div className="bg-zinc-900 p-8 rounded-lg w-[350px] shadow-lg">
        <div className="mb-4 flex items-center justify-center">
          <img src={musicfyLogo} alt="Musicfy" className="h-14 w-14 object-contain" />
        </div>

        <h1 className="text-2xl font-bold mb-6 text-center text-green-500">
          Create your Musicfy account
        </h1>

        <form onSubmit={handleRegister} className="flex flex-col gap-4">
          <input
            type="text"
            placeholder="Full Name"
            value={form.name}
            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
            className="p-3 rounded bg-zinc-800 outline-none focus:ring-2 focus:ring-green-500"
            required
          />

          <input
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
            className="p-3 rounded bg-zinc-800 outline-none focus:ring-2 focus:ring-green-500"
            required
          />

          <input
            type="password"
            placeholder="Password"
            value={form.password}
            onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
            className="p-3 rounded bg-zinc-800 outline-none focus:ring-2 focus:ring-green-500"
            required
          />

          <select
            value={form.role}
            onChange={(e) => setForm((prev) => ({ ...prev, role: e.target.value }))}
            className="p-3 rounded bg-zinc-800 outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value="user">Register as User</option>
            <option value="artist">Register as Artist</option>
          </select>

          <button
            disabled={loading}
            className="bg-green-500 text-black py-2 rounded font-semibold hover:scale-105 transition disabled:opacity-70"
          >
            {loading ? "Registering..." : "Register"}
          </button>
        </form>
        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

        <p className="text-sm text-center mt-4 text-gray-400">
          Already have an account?{" "}
          <Link to="/login" className="text-green-500 hover:underline">
            Login
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Register;