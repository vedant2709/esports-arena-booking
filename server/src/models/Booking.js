import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema(
  {
    // Human-friendly reference shown on the confirmation/pass, e.g. "ESA-7F3K9".
    // unique → no two bookings share a ref (enforced by a DB index).
    bookingRef: { type: String, required: true, unique: true },

    // WHO booked. ref:"User" links to the User collection (a foreign key).
    // Required in the MVP (login-to-book); becomes optional when we add guests.
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    // WHICH station. ref:"Station" links to the Station collection.
    station: { type: mongoose.Schema.Types.ObjectId, ref: "Station", required: true },

    // WHEN — split into a calendar date + an hourly slot.
    // date is a STRING "YYYY-MM-DD" (venue-local), NOT a JS Date — see explanation.
    date: { type: String, required: true },        // "2026-06-20"
    slotStart: { type: String, required: true },   // "19:00" (hourly slot start)

    // How many players, and which pricing package was chosen.
    squadSize: { type: Number, required: true, min: 1 },
    packageType: {
      type: String,
      enum: ["solo", "duo", "squad", "hourly"],
      required: true,
    },

    // The final total in ₹. ALWAYS computed on the server (never trusted from
    // the client) — this is a core payment-security rule.
    price: { type: Number, required: true, min: 0 },

    // Contact SNAPSHOT, copied from the user's account at booking time.
    // We snapshot (rather than always join the User) so the booking is a stable
    // historical record even if the user later changes their name/phone — and
    // so guest bookings (no account) work the same way later.
    customerName: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String, required: true },
    gamerTag: { type: String, default: "" },
    notes: { type: String, default: "" },

    // Lifecycle of a booking:
    //   pending   → created, awaiting payment (holds the slot)
    //   confirmed → paid & verified
    //   cancelled → cancelled by user/admin
    //   expired   → pending hold lapsed without payment
    status: {
      type: String,
      enum: ["pending", "confirmed", "cancelled", "expired"],
      default: "pending",
    },

    // For pending bookings: when the temporary hold expires if unpaid.
    holdExpiresAt: { type: Date },

    // Razorpay payment details, filled in during checkout (Step 6).
    payment: {
      orderId: { type: String },
      paymentId: { type: String },
      status: {
        type: String,
        enum: ["created", "paid", "failed"],
        default: "created",
      },
    },
  },
  { timestamps: true }
);

// ────────────────────────────── INDEXES ──────────────────────────────

// 1. ⭐ RACE-SAFETY — the heart of the booking system.
//    Enforces: at most ONE active booking per (station, date, slot).
//    "partial" via partialFilterExpression → the uniqueness rule applies ONLY to
//    pending/confirmed bookings. Cancelled/expired ones are ignored, so a freed
//    slot can be booked again. (Full deep-dive on HOW this stops double-booking
//    under concurrent requests comes in Step 5.)
bookingSchema.index(
  { station: 1, date: 1, slotStart: 1 },
  {
    unique: true,
    partialFilterExpression: { status: { $in: ["pending", "confirmed"] } },
  }
);

// 2. Fast availability queries: "which slots on this station/date are taken?"
bookingSchema.index({ station: 1, date: 1, status: 1 });

// 3. "My Bookings" — a user's own bookings, newest first.
bookingSchema.index({ user: 1, createdAt: -1 });

// 4. Helps the cleanup job find expired pending holds quickly.
bookingSchema.index({ holdExpiresAt: 1 });

const Booking = mongoose.model("Booking", bookingSchema);
export default Booking;
