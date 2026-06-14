import { createContext, useContext, useEffect, useState } from "react";
import api from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // true until we've checked the session

  // On first load, ask the server "who am I?" using the cookie. If the cookie is
  // valid we get the user; otherwise we're logged out. This restores the session
  // across page refreshes (the cookie persists; React state doesn't).
  useEffect(() => {
    api
      .get("/auth/me")
      .then((res) => setUser(res.data.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  // The API client fires "auth:logout" when a token refresh fails (session truly
  // expired). Clear the user → ProtectedRoute will redirect to login.
  useEffect(() => {
    const handler = () => setUser(null);
    window.addEventListener("auth:logout", handler);
    return () => window.removeEventListener("auth:logout", handler);
  }, []);

  const login = async (email, password) => {
    const res = await api.post("/auth/login", { email, password });
    setUser(res.data.user);
    return res.data.user;
  };

  const register = async (data) => {
    await api.post("/auth/register", data);
    return login(data.email, data.password); // auto-login after signup
  };

  const logout = async () => {
    await api.post("/auth/logout");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

// Convenience hook so components do `const { user } = useAuth()`.
export function useAuth() {
  return useContext(AuthContext);
}
