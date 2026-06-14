import Booking from "../models/Booking.js";
import { cacheDel } from "./cache.service.js";
import { availabilityKey } from "./availability.service.js";

// Finds pending bookings whose 10-minute payment hold has lapsed and marks them
// "expired" — which frees the slot (the partial unique index ignores "expired").
// Run periodically by a background interval (see index.js). Returns how many it
// expired (useful for logging).
export async function expireStaleHolds() {
  const now = new Date();

  // 1. Find lapsed holds. We pull station+date because we need them to invalidate
  //    each freed slot's availability cache afterward.
  const stale = await Booking.find({
    status: "pending",
    holdExpiresAt: { $lt: now }, // hold time is in the past
  }).select("station date");

  if (stale.length === 0) return 0;

  // 2. Expire them all in one bulk update. The slots are now free, because the
  //    race-safety index only counts pending/confirmed — not expired.
  await Booking.updateMany(
    { _id: { $in: stale.map((b) => b._id) } },
    { $set: { status: "expired" } }
  );

  // 3. Invalidate the availability cache for each affected station+date so the
  //    freed slots show as open immediately (instead of waiting for the TTL).
  for (const b of stale) {
    await cacheDel(availabilityKey(b.station.toString(), b.date));
  }

  return stale.length;
}
