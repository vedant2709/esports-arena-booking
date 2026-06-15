import { Router } from "express";
import { listAllBookings, updateBookingStatus, checkIn, walkIn, adjust } from "../controllers/admin.controller.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

// Mounted under "/api/admin" (see app.js).
const router = Router();

// router.use(...) applies these to EVERY route below — so all admin routes
// require a valid token (requireAuth) AND the owner role (requireRole). Cleaner
// than repeating the guards on each route.
router.use(requireAuth, requireRole("owner"));

router.get("/bookings", listAllBookings); // GET  /api/admin/bookings
router.patch("/bookings/:id", updateBookingStatus); // PATCH /api/admin/bookings/:id
router.post("/bookings/:id/checkin", checkIn); // POST /api/admin/bookings/:id/checkin
router.post("/loyalty/walkin", walkIn);        // POST /api/admin/loyalty/walkin
router.post("/loyalty/adjust", adjust);        // POST /api/admin/loyalty/adjust

export default router;
