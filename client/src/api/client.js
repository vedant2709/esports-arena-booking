import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
  withCredentials: true, // send/receive the httpOnly auth cookies
});

// ─────────────────── Silent refresh-on-401 interceptor ───────────────────
// When the access token expires, a request returns 401. We transparently call
// /auth/refresh to get a new one, then retry the original request — so the user
// never sees the hiccup. (Frontend half of the refresh-token system.)

let isRefreshing = false;
let waiters = []; // requests parked while a refresh is in flight

const releaseWaiters = () => {
  waiters.forEach((resolve) => resolve());
  waiters = [];
};

api.interceptors.response.use(
  (res) => res, // success → pass through
  async (error) => {
    const original = error.config;
    const status = error.response?.status;

    // Skip the auth endpoints: a 401 from /login is "wrong password", not
    // "expired token" — refreshing there would be wrong.
    const isAuthCall = /\/auth\/(login|register|refresh)/.test(original?.url || "");

    // Only act on a 401 we haven't already retried.
    if (status !== 401 || original._retry || isAuthCall) {
      return Promise.reject(error);
    }
    original._retry = true;

    // If a refresh is already running, wait for it, then retry this request.
    if (isRefreshing) {
      await new Promise((resolve) => waiters.push(resolve));
      return api(original);
    }

    // Otherwise, perform the single refresh.
    isRefreshing = true;
    try {
      await api.post("/auth/refresh");
      isRefreshing = false;
      releaseWaiters(); // let parked requests proceed
      return api(original); // retry the original request with the new token
    } catch (refreshErr) {
      isRefreshing = false;
      waiters = [];
      // Refresh failed → session is genuinely over. Tell the app to log out.
      window.dispatchEvent(new Event("auth:logout"));
      return Promise.reject(refreshErr);
    }
  }
);

export default api;
