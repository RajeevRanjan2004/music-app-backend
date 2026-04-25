/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect } from "react";
import { apiRequest, resolveApiAssetUrl } from "../lib/api";

const AuthContext = createContext();

function normalizeUser(user) {
  if (!user) {
    return null;
  }

  return {
    ...user,
    avatar: resolveApiAssetUrl(user.avatar),
  };
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const bootstrapAuth = async () => {
      const token = localStorage.getItem("token");
      const savedUser = localStorage.getItem("user");

      if (!token || !savedUser) {
        setLoading(false);
        return;
      }

      try {
        const me = await apiRequest("/auth/me");
        setUser(normalizeUser(me.user));
      } catch {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    bootstrapAuth();
  }, []);

  const login = async ({ email, password }) => {
    const data = await apiRequest("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    const nextUser = normalizeUser(data.user);

    setUser(nextUser);
    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(nextUser));
    return nextUser;
  };

  const register = async ({ name, email, password, role }) => {
    const endpoint = role === "artist" ? "/auth/register/artist" : "/auth/register/user";
    const data = await apiRequest(endpoint, {
      method: "POST",
      body: JSON.stringify({ name, email, password }),
    });
    const nextUser = normalizeUser(data.user);

    setUser(nextUser);
    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(nextUser));
    return nextUser;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  };

  const updateProfile = async (payload) => {
    const data = await apiRequest("/auth/profile", {
      method: "PUT",
      body: payload,
    });
    const nextUser = normalizeUser(data.user);

    setUser(nextUser);
    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(nextUser));
    return nextUser;
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
