import Booking from "../models/Booking.js";
import Station from "../models/Station.js";
import User from "../models/User.js";
import { computePrice } from "./pricing.service.js";
import { genBookingRef } from "../utils/ref.js";
import { SLOTS } from "../config/constants.js";
import { cacheDel } from "./cache.service.js";
import { availabilityKey } from "./availability.service.js";
import { summarize, consumeReward } from "./loyalty.service.js";

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
    const { stationId, date, slotStart, squadSize, packageType, gamerTag = "", notes = "", useReward = false } = input;

    // 1. Station must exist and be active.
    const station = await Station.findById(stationId);
    if (!station || !station.isActive) throw httpError(404, "Station not found");

    // 2. Slot must be a real venue slot.
    if (!SLOTS.includes(slotStart)) throw httpError(400, "Invalid time slot");

    // 3. Load the user (needed for the contact snapshot AND loyalty checks).
    const user = await User.findById(userId);
    if (!user) throw httpError(401, "User not found");

    // 4. FREE-REWARD PATH: redeem a loyalty card instead of paying. This forces
    //    a solo, ₹0, instantly-confirmed booking and is handled separately.
    if (useReward) {
      return createRewardBooking({ user, station, date, slotStart, gamerTag, notes });
    }

    // 5. PAID PATH: squad size must fit the station.
    if (squadSize < 1 || squadSize > station.capacity) {
      throw httpError(400, `Squad size must be between 1 and ${station.capacity}`);
    }

    // 6. Compute the price on the SERVER (never trust the client).
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

// Creates a FREE booking by redeeming a loyalty reward. Unlike a paid booking,
// this is CONFIRMED immediately (no payment/hold), always solo, and ₹0. The
// order of operations is deliberate — see the inline notes.
async function createRewardBooking({ user, station, date, slotStart, gamerTag, notes }) {
    // 1. Fast, friendly pre-check. The atomic consume in step 3 is the REAL
    //    guard; this just lets us fail early with a clear message in the common
    //    "you don't have a reward" case (before touching any slot).
    if (summarize(user).rewardsAvailable < 1) {
      throw httpError(400, "You don't have a free session to redeem");
    }

    // 2. Create the booking FIRST — confirmed, solo, ₹0, flagged as a reward.
    //    The unique slot index makes this race-safe exactly like a paid booking,
    //    so we secure the slot before spending the reward.
    let booking;
    try {
      booking = await Booking.create({
        bookingRef: genBookingRef(),
        user: user._id,
        station: station._id,
        date,
        slotStart,
        squadSize: 1,           // a reward is always a single solo seat
        packageType: "solo",
        price: 0,               // free
        customerName: user.name,
        phone: user.phone,
        email: user.email,
        gamerTag,
        notes,
        status: "confirmed",    // no payment step → confirmed right away
        isFreeReward: true,     // earns NO stamp at check-in
      });
    } catch (e) {
      if (e.code === 11000) throw httpError(409, "That slot was just taken. Please pick another.");
      throw e;
    }

    // 3. Now that the slot is secured, atomically SPEND one reward. This can
    //    only fail if a concurrent redemption grabbed the user's last reward a
    //    moment ago — in which case we undo the booking and free the slot.
    const ok = await consumeReward({ userId: user._id, bookingId: booking._id });
    if (!ok) {
      await Booking.deleteOne({ _id: booking._id });
      await cacheDel(availabilityKey(station._id.toString(), date));
      throw httpError(400, "You don't have a free session to redeem");
    }

    // 4. A slot just got taken → invalidate the availability cache so it shows
    //    as booked immediately (same rule as every other booking).
    await cacheDel(availabilityKey(station._id.toString(), date));

    return booking;
}