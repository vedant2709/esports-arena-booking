import crypto from "crypto";

// Short, human-friendly booking reference shown on the pass, e.g. "ESA-7F3K9A".
// 4 random bytes = 8 hex chars → collision chance is negligible. bookingRef is
// also a unique index, so an (astronomically rare) collision would be caught.
export function genBookingRef() {
  return "ESA-" + crypto.randomBytes(4).toString("hex").toUpperCase();
}
