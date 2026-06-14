import Booking from "../models/Booking.js";
import { createBooking } from "../services/booking.service.js";

// POST /api/bookings  (auth required) — create a pending booking.
export async function create(req, res) {
  try {
    const booking = await createBooking(req.user.id, req.body);
    return res.status(201).json({ booking });
  } catch (e) {
    // Errors thrown by the service carry an HTTP status; everything else is 500.
    if (e.status) return res.status(e.status).json({ message: e.message });
    console.error("Create booking error:", e);
    return res.status(500).json({ message: "Something went wrong" });
  }
}

// GET /api/bookings/mine  (auth required) — the logged-in user's bookings.
export async function myBookings(req, res) {
  const bookings = await Booking.find({ user: req.user.id })
    .sort({ createdAt: -1 }) // newest first — uses the {user, createdAt:-1} index
    .populate("station", "name type"); // pull in station name/type for display
  return res.json({ bookings });
}

// GET /api/bookings/:ref  (auth required) — fetch one booking by its reference
// (for the confirmation page). Ownership-checked so you only see your own.
export async function getBookingByRef(req, res) {
  const booking = await Booking.findOne({ bookingRef: req.params.ref }).populate(
    "station",
    "name type"
  );
  if (!booking) return res.status(404).json({ message: "Booking not found" });
  if (booking.user.toString() !== req.user.id) {
    return res.status(403).json({ message: "Not your booking" });
  }
  return res.json({ booking });
}
