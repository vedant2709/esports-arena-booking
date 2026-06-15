import Booking from "../models/Booking.js";
import { cacheDel } from "../services/cache.service.js";
import { availabilityKey } from "../services/availability.service.js";
import { checkInBooking, addWalkInStamp, adjustStamps } from "../services/loyalty.service.js";

// GET /api/admin/bookings?status=&date=&page=&limit=   (owner only)
// Lists ALL bookings, paginated and optionally filtered.
export async function listAllBookings(req, res) {
  // PAGINATION: never return the whole table — return one "page" at a time.
  // page 1, limit 20 → skip 0;  page 2 → skip 20;  etc.
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, parseInt(req.query.limit) || 20); // cap at 100
  const skip = (page - 1) * limit;

  // Optional filters (uses the {status, createdAt} index when filtering by status).
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.date) filter.date = req.query.date;

  // Run the page query and the total count together (Promise.all = parallel).
  const [bookings, total] = await Promise.all([
    Booking.find(filter)
      .sort({ createdAt: -1 }) // newest first
      .skip(skip)
      .limit(limit)
      .populate("station", "name type")
      .populate("user", "name email"),
    Booking.countDocuments(filter),
  ]);

  return res.json({
    bookings,
    page,
    limit,
    total,
    pages: Math.ceil(total / limit), // how many pages exist
  });
}

// PATCH /api/admin/bookings/:id   (owner only)
// Body: { status: "confirmed" | "cancelled" | "expired" }
export async function updateBookingStatus(req,res){
  const {status} = req.body;
  const allowed = ["confirmed", "cancelled", "expired"];
  if (!allowed.includes(status)) {
    return res.status(400).json({ message: "Invalid status" });
  }

  const booking = await Booking.findById(req.params.id);
  if (!booking) return res.status(404).json({ message: "Booking not found" });

  booking.status = status;
  await booking.save();

  // Cancelling/expiring FREES the slot → invalidate the availability cache so
  // it shows open again immediately. (Same invalidation pattern as creating one —
  // any change to an active booking must refresh that station/date's cache.)
  await cacheDel(availabilityKey(booking.station.toString(), booking.date));
  
  return res.json({ booking });
}

// POST /api/admin/bookings/:id/checkin   (owner only)
// Marks a confirmed booking as ATTENDED → awards one loyalty stamp (once).
// This is the moment a stamp is earned in the check-in model.
export async function checkIn(req,res) {
  try {
     // req.user.id is the admin (set by requireAuth) — recorded as who checked in.
    const result = await checkInBooking(req.params.id, req.user.id);
    return res.json(result); // { booking, summary, awarded / alreadyCheckedIn }
  } catch (error) {
    if (e.status) return res.status(e.status).json({ message: e.message });
    console.error("Check-in error:", e);
    return res.status(500).json({ message: "Something went wrong" });
  }
}

// POST /api/admin/loyalty/walkin   (owner only)
// Body: { phone, note? } — add a stamp for an in-person session/extension
// (the "user extended at the arena" case). Logged with the admin's id.
export async function walkIn(req, res) {
  try {
    const { phone, note } = req.body;
    const result = await addWalkInStamp({ phone, adminId: req.user.id, note });
    return res.json(result); // { user, summary }
  } catch (e) {
    if (e.status) return res.status(e.status).json({ message: e.message });
    console.error("Walk-in error:", e);
    return res.status(500).json({ message: "Something went wrong" });
  }
}

 // POST /api/admin/loyalty/adjust   (owner only)
// Body: { userId, delta, note? } — a manual correction (e.g. fix a wrong stamp).
export async function adjust(req, res) {
  try {
    const { userId, delta, note } = req.body;
    const result = await adjustStamps({ userId, delta, adminId: req.user.id, note });
    return res.json(result); // { summary }
  } catch (e) {
    if (e.status) return res.status(e.status).json({ message: e.message });
    console.error("Adjust error:", e);
    return res.status(500).json({ message: "Something went wrong" });
  }
}