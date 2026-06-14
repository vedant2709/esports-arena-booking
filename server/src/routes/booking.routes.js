import { Router } from "express";
import { create, myBookings, getBookingByRef } from "../controllers/booking.controller.js";
import { requireAuth } from "../middleware/auth.js";
import { rateLimit } from "../middleware/rateLimit.js";

// Mounted under "/api/bookings" (see app.js). All routes require login (MVP).
const router = Router();

// Moderate limiter to stop booking spam (20 attempts/min per IP).
const bookingLimiter = rateLimit({ name: "booking", limit: 20, windowSec: 60 });

router.post("/", bookingLimiter, requireAuth, create); // POST /api/bookings
router.get("/mine", requireAuth, myBookings); // GET /api/bookings/mine
router.get("/:ref", requireAuth, getBookingByRef); // GET /api/bookings/:ref  (must be AFTER /mine)

export default router;
