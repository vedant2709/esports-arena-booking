import User from "../models/User.js";
import Booking from "../models/Booking.js";
import LoyaltyEntry from "../models/LoyaltyEntry.js";
import { STAMPS_PER_REWARD, venueNow } from "../config/constants.js";

// Small helper to throw an error carrying an HTTP status the controller can use.
// (Same pattern as booking.service.js so controllers handle errors uniformly.)
function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

// ─────────────────────────── DERIVED NUMBERS ───────────────────────────
// Everything the card shows is computed from the two cached counters on the
// user. Keeping this in ONE function means the rule lives in exactly one place.
//
//   rewardsAvailable = how many free sessions are unlocked but not yet taken
//   progress         = filled stamps on the CURRENT card (0..STAMPS_PER_REWARD)
//
// Example (STAMPS_PER_REWARD = 10):
//   earned 13, redeemed 1  → available = floor(13/10) - 1 = 0
//                            progress  = 13 - 1*10        = 3   → "3 / 10"
//   earned 20, redeemed 1  → available = 2 - 1 = 1  (reward ready!)
//                            progress  = 20 - 10 = 10  → shown as a full card
export function summarize(user) {
  const stampsEarned = user.stampsEarned || 0;
  const rewardsRedeemed = user.rewardsRedeemed || 0;

  const rewardsAvailable =
    Math.floor(stampsEarned / STAMPS_PER_REWARD) - rewardsRedeemed;

  // Stamps toward the card the user is currently filling. Clamp to [0, MAX] so
  // the UI never has to think about overflow/underflow.
  const raw = stampsEarned - rewardsRedeemed * STAMPS_PER_REWARD;
  const progress = Math.max(0, Math.min(STAMPS_PER_REWARD, raw));

  return {
    stampsEarned,
    rewardsRedeemed,
    rewardsAvailable: Math.max(0, rewardsAvailable),
    progress,
    target: STAMPS_PER_REWARD,
    rewardReady: rewardsAvailable > 0,
  };
}

// ─────────────────────── THE ONE WRITE PATH ───────────────────────
// Every balance change goes through here: append a ledger line AND update the
// cached counter on the user, together. The ledger is the source of truth; the
// counters are a fast cache kept in step with it.
//
//   reason "redeemed" → bumps rewardsRedeemed by 1 (delta is the cosmetic -10)
//   any other reason  → adds `delta` to stampsEarned (e.g. +1 for a stamp)
//
// Returns the fresh summary so callers can hand it straight back to the client.
async function recordEntry({ userId, delta, reason, bookingId, adminId, note }) {
  // 1. Append the immutable history line first (the audit record).
  await LoyaltyEntry.create({
    user: userId,
    delta,
    reason,
    booking: bookingId,
    admin: adminId,
    note: note || "",
  });

  // 2. Update the matching cached counter atomically with $inc (so concurrent
  //    updates can't clobber each other — each just adds to the field).
  const inc =
    reason === "redeemed"
      ? { rewardsRedeemed: 1 }
      : { stampsEarned: delta };

  const user = await User.findByIdAndUpdate(
    userId,
    { $inc: inc },
    { new: true } // return the post-update document so we can summarize it
  );

  return summarize(user);
}

// ─────────────────────── CHECK-IN (earns a stamp) ───────────────────────
// Called when the admin marks a booking as attended. This is THE moment a stamp
// is earned. Designed to be safe to call twice (idempotent) and to never award
// a stamp for a free-reward booking.
export async function checkInBooking(bookingId, adminId) {
  const booking = await Booking.findById(bookingId);
  if (!booking) throw httpError(404, "Booking not found");

  // Only a paid (confirmed) session can be checked in. Pending/cancelled/expired
  // bookings never happened from the arena's point of view.
  if (booking.status !== "confirmed") {
    throw httpError(400, "Only confirmed bookings can be checked in");
  }

  // Already done? Return the current state instead of erroring — clicking
  // "Check in" again is harmless and must NOT add a second stamp.
  if (booking.checkedIn) {
    const user = await User.findById(booking.user);
    return { booking, summary: summarize(user), alreadyCheckedIn: true };
  }

  // A free-reward session: mark attendance but award NO stamp.
  if (booking.isFreeReward) {
    booking.checkedIn = true;
    booking.checkedInAt = new Date();
    booking.checkedInBy = adminId;
    await booking.save();
    const user = await User.findById(booking.user);
    return { booking, summary: summarize(user), awarded: false };
  }

  // 🔑 ATOMIC CLAIM: flip checkedIn + loyaltyAwarded in one guarded update that
  //    only matches if the stamp has NOT already been awarded. If two admin
  //    clicks race, exactly one update matches — so the stamp is given once.
  const claimed = await Booking.findOneAndUpdate(
    // $ne:true matches both `false` AND missing (old bookings created before
    // this field existed have no `loyaltyAwarded` key in the DB at all). Using
    // `false` would skip those old docs — so we use "not yet true" instead.
    { _id: bookingId, loyaltyAwarded: { $ne: true } },
    {
      $set: {
        checkedIn: true,
        checkedInAt: new Date(),
        checkedInBy: adminId,
        loyaltyAwarded: true,
      },
    },
    { new: true }
  );

  // Lost the race (another request already claimed it) → no double stamp.
  if (!claimed) {
    const user = await User.findById(booking.user);
    return { booking, summary: summarize(user), alreadyCheckedIn: true };
  }

  // We won the claim → record the +1 stamp.
  const summary = await recordEntry({
    userId: claimed.user,
    delta: 1,
    reason: "checkin",
    bookingId: claimed._id,
    adminId,
  });

  return { booking: claimed, summary, awarded: true };
}

// ───────────── AUTO-AWARD (stamp every finished session, no admin) ─────────────
// Run periodically by the background job (see index.js). Finds confirmed,
// non-reward bookings whose slot time has already PASSED and that haven't been
// stamped yet, and awards each a stamp — so the normal online flow needs no
// manual check-in. Returns how many stamps were awarded (for logging).
export async function awardCompletedSessions() {
  // 1. "Now", in the VENUE's timezone (slots are venue-local strings).
  const { date: today, hour } = venueNow();
  // Slots are 1 hour; the "HH:00" slot finishes at hour HH+1. So a slot today is
  // finished iff its start hour < the current hour. We compare as zero-padded
  // strings ("11:00".."22:00"), which sort correctly. e.g. now 14:xx → finished
  // slots are those with slotStart < "14:00" (i.e. 11/12/13:00).
  const curHourStr = String(hour).padStart(2, "0") + ":00";

  // 2. Candidates: paid, not a free reward, not yet awarded, slot has elapsed
  //    (any past date, OR today with an earlier start hour).
  const candidates = await Booking.find({
    status: "confirmed",
    isFreeReward: { $ne: true },
    loyaltyAwarded: { $ne: true },
    $or: [
      { date: { $lt: today } },
      { date: today, slotStart: { $lt: curHourStr } },
    ],
  }).select("_id user");

  if (candidates.length === 0) return 0;

  let awarded = 0;
  for (const c of candidates) {
    // 3. ATOMIC CLAIM — same guard as the admin check-in. Only the request that
    //    flips loyaltyAwarded false→true wins, so a concurrent admin click and
    //    this sweep can never both stamp the same booking. checkedInBy stays
    //    null to mark it as a system (auto) check-in.
    const claimed = await Booking.findOneAndUpdate(
      { _id: c._id, loyaltyAwarded: { $ne: true } },
      { $set: { checkedIn: true, checkedInAt: new Date(), loyaltyAwarded: true } },
      { new: true }
    );
    if (!claimed) continue; // someone else just claimed it

    await recordEntry({
      userId: claimed.user,
      delta: 1,
      reason: "auto",
      bookingId: claimed._id,
    });
    awarded++;
  }

  return awarded;
}

// ─────────────────── WALK-IN (in-person session/extension) ───────────────────
// The fix for "user extended at the arena and the system never saw it". The
// admin looks the user up by phone and adds a stamp by hand — fully logged.
export async function addWalkInStamp({ phone, adminId, note }) {
  if (!phone) throw httpError(400, "Phone number is required");

  const user = await User.findOne({ phone: phone.trim() });
  if (!user) throw httpError(404, "No user found with that phone number");

  const summary = await recordEntry({
    userId: user._id,
    delta: 1,
    reason: "walk_in",
    adminId,
    note,
  });

  return { user: { id: user._id, name: user.name, phone: user.phone }, summary };
}

// ─────────────────────── MANUAL ADJUSTMENT (correction) ───────────────────────
// Rare escape hatch for fixing mistakes (e.g. a wrong walk-in). Always logged
// with a note so the history stays honest.
export async function adjustStamps({ userId, delta, adminId, note }) {
  if (!Number.isInteger(delta) || delta === 0) {
    throw httpError(400, "Adjustment must be a non-zero whole number");
  }
  const user = await User.findById(userId);
  if (!user) throw httpError(404, "User not found");

  const summary = await recordEntry({
    userId,
    delta,
    reason: "admin_adjust",
    adminId,
    note,
  });

  return { summary };
}

// ─────────────────────── CONSUME (spend a full card) ───────────────────────
// Atomically spends ONE reward if (and only if) the user genuinely has an
// unredeemed one — checked at the DATABASE level with $expr, so:
//   • a tampered client can never fake a free booking, and
//   • two fast clicks can't double-spend (only one $inc can match).
// Returns true if a reward was consumed, false if none was available.
export async function consumeReward({ userId, bookingId }) {
  // $expr lets the query compare two fields of the SAME document:
  //   floor(stampsEarned / 10) > rewardsRedeemed   ⇒ a reward is unredeemed.
  // Only then do we increment rewardsRedeemed — in the same atomic operation.
  const consumed = await User.findOneAndUpdate(
    {
      _id: userId,
      $expr: {
        $gt: [
          { $floor: { $divide: ["$stampsEarned", STAMPS_PER_REWARD] } },
          "$rewardsRedeemed",
        ],
      },
    },
    { $inc: { rewardsRedeemed: 1 } },
    { new: true }
  );

  if (!consumed) return false; // no reward available (or lost a concurrent race)

  // Log the redemption for the audit/history (the -10 delta is cosmetic).
  await LoyaltyEntry.create({
    user: userId,
    delta: -STAMPS_PER_REWARD,
    reason: "redeemed",
    booking: bookingId,
  });

  return true;
}

// ─────────────────────── READ: a user's card + history ───────────────────────
// Powers GET /api/loyalty/me (the card UI). Returns the summary plus the most
// recent ledger lines for a little "history" list.
export async function getLoyaltyForUser(userId) {
  const user = await User.findById(userId);
  if (!user) throw httpError(404, "User not found");

  const history = await LoyaltyEntry.find({ user: userId })
    .sort({ createdAt: -1 })
    .limit(20)
    .select("delta reason note createdAt");

  return { ...summarize(user), history };
}
