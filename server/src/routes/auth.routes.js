import { Router } from "express";
import { register, login, refresh, me, logout } from "../controllers/auth.controller.js";
import { requireAuth } from "../middleware/auth.js";
import { rateLimit } from "../middleware/rateLimit.js";

// All routes here are mounted under "/api/auth" (see app.js).
const router = Router();

// Strict limiters on auth endpoints to stop brute-force / spam signups.
const loginLimiter = rateLimit({ name: "login", limit: 5, windowSec: 60 });
const registerLimiter = rateLimit({ name: "register", limit: 5, windowSec: 60 });

// POST /api/auth/register
router.post("/register", registerLimiter, register);

// POST /api/auth/login
router.post("/login", loginLimiter, login);

// POST /api/auth/refresh  — rotate access+refresh tokens (reuse-detection inside)
router.post("/refresh", refresh);

// GET /api/auth/me  — protected: requireAuth runs first; only valid sessions pass.
router.get("/me", requireAuth, me);

// POST /api/auth/logout
router.post("/logout", logout);

export default router;
