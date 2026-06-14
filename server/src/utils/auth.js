import jwt from "jsonwebtoken";
import crypto from "crypto";

export const ACCESS_TOKEN_TTL = process.env.ACCESS_TOKEN_TTL || "15m";
export const REFRESH_TTL_DAYS = Number(process.env.REFRESH_TOKEN_TTL_DAYS || 30);
const REFRESH_TTL_MS = REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000;

// Cross-site cookies: in production the frontend (Vercel) and API (Render) are
// different sites, so cookies must be SameSite=None + Secure to be sent at all.
// In dev (same-origin via the Vite proxy), strict + non-secure works.
const isProd = process.env.NODE_ENV === "production";
const crossSite = {
  secure: isProd, // HTTPS-only in prod (required for SameSite=None)
  sameSite: isProd ? "none" : "strict",
};

// ---------- ACCESS TOKEN (short-lived JWT) ----------

// Create a signed JWT identifying the user. Now short-lived (15m by default).
export function signAccessToken(user) {
  return jwt.sign(
    { sub: user._id.toString(), role: user.role }, // "sub" = subject = user id
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: ACCESS_TOKEN_TTL }
  );
}

// Access cookie: sent to ALL routes (path "/"), short maxAge to match the JWT.
export const accessCookieOptions = {
  httpOnly: true,
  ...crossSite,
  maxAge: 15 * 60 * 1000, // 15 minutes
};
export function setAuthCookie(res, token) {
  res.cookie("accessToken", token, accessCookieOptions);
}
export function clearAuthCookie(res) {
  res.clearCookie("accessToken", { ...accessCookieOptions, maxAge: undefined });
}

// ---------- REFRESH TOKEN (long-lived, opaque, DB-backed) ----------

// A refresh token is just random bytes — NOT a JWT. It carries no data;
// it's only a lookup key into the RefreshToken collection.
export function generateRefreshToken() {
  return crypto.randomBytes(40).toString("hex");
}

// We store only a HASH of the refresh token (like a password), never the raw value.
// On /refresh, we hash the incoming token and look it up by this hash.
export function hashToken(raw) {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

export function refreshExpiryDate() {
  return new Date(Date.now() + REFRESH_TTL_MS);
}

// Refresh cookie: restricted to the auth routes (path "/api/auth"), so it isn't
// attached to every API request — only sent where it's actually used.
export const refreshCookieOptions = {
  httpOnly: true,
  ...crossSite,
  path: "/api/auth",
  maxAge: REFRESH_TTL_MS,
};
export function setRefreshCookie(res, raw) {
  res.cookie("refreshToken", raw, refreshCookieOptions);
}
export function clearRefreshCookie(res) {
  res.clearCookie("refreshToken", { ...refreshCookieOptions, maxAge: undefined });
}
