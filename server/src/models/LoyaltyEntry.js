import mongoose from "mongoose";

// ───────────────────────── THE LOYALTY LEDGER ─────────────────────────
// One document = ONE thing that changed a user's stamp balance. Think of it
// like a bank statement: we never just overwrite a "points" number, we append
// an immutable line describing what happened, when, and who did it. The user's
// balance is the consequence of these lines — so it is always explainable, and
// disputes ("why do I have 7 stamps?") are answered by reading the history.
const loyaltyEntrySchema = new mongoose.Schema(
  {
    // WHOSE card this affects.
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // The change to the balance, for human-readable history:
    //   +1   → earned a stamp (checked in / walk-in)
    //   -10  → redeemed a free reward (consumed a full card)
    //   ±n   → a manual admin correction
    delta: { type: Number, required: true },

    // WHY it changed — lets us filter and explain the history.
    //   checkin       → admin marked an online booking as attended
    //   auto          → system auto-awarded after the slot's time finished
    //   walk_in       → admin added an in-person session/extension (no booking)
    //   admin_adjust  → a manual correction
    //   redeemed      → user spent a full card on a free solo session
    reason: {
      type: String,
      enum: ["checkin", "auto", "walk_in", "admin_adjust", "redeemed"],
      required: true,
    },

    // The booking this entry relates to, when there is one (checkin/redeemed).
    // Walk-in and adjust entries have no booking.
    booking: { type: mongoose.Schema.Types.ObjectId, ref: "Booking" },

    // WHICH admin performed the action (null for a user-driven redemption).
    admin: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

    // Optional free-text reason, e.g. "extended 1hr, paid cash".
    note: { type: String, default: "" },
  },
  { timestamps: true } // createdAt = when it happened
);

// A user's history, newest first — for the "card history" view and audits.
loyaltyEntrySchema.index({ user: 1, createdAt: -1 });

const LoyaltyEntry = mongoose.model("LoyaltyEntry", loyaltyEntrySchema);
export default LoyaltyEntry;
