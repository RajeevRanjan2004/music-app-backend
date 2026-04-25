import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import musicfyLogo from "../assets/musicfy.png";

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(form);
      navigate("/");
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
          Musicfy Login
        </h1>

        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <input
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
            className="p-3 rounded bg-zinc-800 outline-none"
            required
          />

          <input
            type="password"
            placeholder="Password"
            value={form.password}
            onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
            className="p-3 rounded bg-zinc-800 outline-none"
            required
          />

          <button
            disabled={loading}
            className="bg-green-500 text-black py-2 rounded font-semibold disabled:opacity-70"
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>
        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

        <p className="text-sm text-center mt-4 text-gray-400">
          Don't have an account?{" "}
          <Link to="/register" className="text-green-500">
            Register
          </Link>
        </p>

        <p className="text-sm text-center mt-3 text-gray-400">
          <Link to="/forgot-password" className="text-green-500 hover:underline">
            Forgot Password?
          </Link>
        </p>

      </div>
    </div>
  );
};

export default Login;