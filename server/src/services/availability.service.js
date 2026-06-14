import Booking from "../models/Booking.js";
import { SLOTS } from "../config/constants.js";
import { cacheGet, cacheSet } from "./cache.service.js";

// Build the cache key for a station+date. EXPORTED so the booking service can
// invalidate the SAME key when a booking changes this slot. (One source of
// truth for the key format — no risk of the two files disagreeing.)
export function availabilityKey(stationId, date){
    return `availability:${stationId}:${date}`;
}

// Returns every hourly slot for a station on a date, each marked available or not.
export async function getAvailability(stationId, date) {
    const key = availabilityKey(stationId, date);

    // 1. Cache check — HIT returns instantly, no DB query.
    const cached = await cacheGet(key);
    if (cached) return cached;

    // 2. Find ACTIVE bookings (pending/confirmed) for this station + date.
    //    ← this is the query that uses the {station, date, status} index.
    //    .select("slotStart") = a "projection": fetch ONLY the slotStart field,
    //    not the whole document, since that's all we need here.
    const taken = await Booking.find({
        station: stationId,
        date,
        status: { $in: ["pending", "confirmed"] }
    }).select("slotStart");

    // 3. Put taken slot times in a Set → O(1) membership checks
    //    (Set.has is constant-time; array.includes would be O(n) per slot).
    const takenSet = new Set(taken.map((b) => b.slotStart));

    // 4. Return ALL slots with a flag. We return every slot (not just free ones)
    //    so the frontend can show the full grid and grey out the taken ones.
    const slots = SLOTS.map((slotStart) => ({
        slotStart,
        available: !takenSet.has(slotStart)
    }))

    // 5. Cache for 60s. Short TTL is a safety net; the real accuracy comes from
    //    active invalidation (Change 2) deleting this key when a booking happens.
    await cacheSet(key, slots, 60);
    return slots;
}