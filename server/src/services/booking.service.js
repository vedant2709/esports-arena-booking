import Booking from "../models/Booking.js";
import Station from "../models/Station.js";
import User from "../models/User.js";
import { computePrice } from "./pricing.service.js";
import { genBookingRef } from "../utils/ref.js";
import { SLOTS } from "../config/constants.js";
import { cacheDel } from "./cache.service.js";
import { availabilityKey } from "./availability.service.js";

const HOLD_MINUTES = 10; // a pending booking holds the slot this long awaiting payment

// Small helper to throw an error carrying an HTTP status the controller can use.
function httpError(status, message) {
    const err = new Error(message);
    err.status = status;
    return err;
}

// Creates a PENDING booking for a user. Race-safe: the unique partial index on
// {station, date, slotStart} guarantees only one active booking per slot, even
// under concurrent requests. Payment (Step 6) later flips pending → confirmed.
export async function createBooking(userId, input) {
    const { stationId, date, slotStart, squadSize, packageType, gamerTag = "", notes = "" } = input;

    // 1. Station must exist and be active.
    const station = await Station.findById(stationId);
    if (!station || !station.isActive) throw httpError(404, "Station not found");

    // 2. Slot must be a real venue slot, and squad size must fit the station.
    if (!SLOTS.includes(slotStart)) throw httpError(400, "Invalid time slot");
    if (squadSize < 1 || squadSize > station.capacity) {
      throw httpError(400, `Squad size must be between 1 and ${station.capacity}`);
    }

    // 3. Snapshot the user's contact details onto the booking.
    const user = await User.findById(userId);
    if (!user) throw httpError(401, "User not found");

    // 4. Compute the price on the SERVER (never trust the client).
    const price = computePrice(station, packageType, squadSize);

    // 5. Try to create the booking. We DON'T check "is the slot free?" first —
    //    we just insert, and let the unique index be the referee.
    try {
        const booking = await Booking.create({
            bookingRef: genBookingRef(),
            user: userId,
            station: stationId,
            date,
            slotStart,
            squadSize,
            packageType,
            price,
            customerName: user.name,
            phone: user.phone,
            email: user.email,
            gamerTag,
            notes,
            status: "pending",
            holdExpiresAt: new Date(Date.now() + HOLD_MINUTES * 60 * 1000)
        });

        // 🔑 INVALIDATE: this booking changed availability for this station+date,
        // so delete the cached copy. The next availability check will be a MISS
        // and recompute fresh — reflecting this booking immediately.
        await cacheDel(availabilityKey(stationId, date));
        
        return booking;
    } catch (e) {
        // 11000 = duplicate key. Here it means an active booking already holds this
      // slot → the slot was taken (possibly milliseconds ago by a concurrent request).
      if (e.code === 11000) {
        throw httpError(409, "That slot was just taken. Please pick another.");
      }
      throw e; // anything else bubbles up as a 500
    }
}