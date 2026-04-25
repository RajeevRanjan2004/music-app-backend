/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const Profile = () => {
  const { user, updateProfile, loading } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    email: "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [avatarFile, setAvatarFile] = useState(null);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/login");
      return;
    }
    if (user) {
      setForm((prev) => ({
        ...prev,
        name: user.name || "",
        email: user.email || "",
      }));
    }
  }, [loading, navigate, user]);

  const previewAvatar = useMemo(() => {
    if (avatarFile) return URL.createObjectURL(avatarFile);
    return user?.avatar || "";
  }, [avatarFile, user?.avatar]);

  useEffect(() => {
    return () => {
      if (avatarFile && previewAvatar?.startsWith("blob:")) {
        URL.revokeObjectURL(previewAvatar);
      }
    };
  }, [avatarFile, previewAvatar]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setStatus("");

    if (form.newPassword && form.newPassword !== form.confirmPassword) {
      setError("New password and confirm password do not match");
      return;
    }

    try {
      setSaving(true);
      const payload = new FormData();
      payload.append("name", form.name);
      payload.append("email", form.email);
      if (form.currentPassword) payload.append("currentPassword", form.currentPassword);
      if (form.newPassword) payload.append("newPassword", form.newPassword);
      if (avatarFile) payload.append("avatar", avatarFile);

      await updateProfile(payload);
      setStatus("Profile updated successfully");
      setForm((prev) => ({
        ...prev,
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      }));
      setAvatarFile(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return <div className="text-zinc-400">Loading profile...</div>;
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white">Edit Profile</h1>
        <p className="mt-2 text-zinc-400">Update your account details and display picture.</p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-700 bg-red-900/30 px-4 py-3 text-red-300">
          {error}
        </div>
      )}
      {status && (
        <div className="rounded-lg border border-green-700 bg-green-900/30 px-4 py-3 text-green-300">
          {status}
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid gap-8 lg:grid-cols-[280px_1fr]">
        <section className="space-y-4 rounded-lg border border-zinc-800 bg-zinc-900/50 p-5">
          <div className="flex flex-col items-center gap-4">
            <div className="grid h-40 w-40 place-items-center overflow-hidden rounded-full border border-zinc-700 bg-zinc-800">
              {previewAvatar ? (
                <img
                  src={previewAvatar}
                  alt={user.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-5xl font-bold text-zinc-400">
                  {(user.name || "U").slice(0, 1).toUpperCase()}
                </span>
              )}
            </div>
            <label className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-3 text-center text-sm font-medium text-white transition hover:bg-zinc-700">
              Choose DP
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => setAvatarFile(e.target.files?.[0] || null)}
              />
            </label>
          </div>
        </section>

        <section className="space-y-6 rounded-lg border border-zinc-800 bg-zinc-900/50 p-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-300">Name</label>
              <input
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-white outline-none focus:border-green-500"
                required
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-300">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-white outline-none focus:border-green-500"
                required
              />
            </div>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-4">
            <h2 className="text-lg font-semibold text-white">Change Password</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <input
                type="password"
                placeholder="Current password"
                value={form.currentPassword}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, currentPassword: e.target.value }))
                }
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-white outline-none focus:border-green-500"
              />
              <input
                type="password"
                placeholder="New password"
                value={form.newPassword}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, newPassword: e.target.value }))
                }
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-white outline-none focus:border-green-500"
              />
              <input
                type="password"
                placeholder="Confirm new password"
                value={form.confirmPassword}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, confirmPassword: e.target.value }))
                }
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-white outline-none focus:border-green-500 md:col-span-2"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-green-600 px-6 py-3 font-semibold text-white transition hover:bg-green-700 disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </section>
      </form>
    </div>
  );
};

export default Profile;
