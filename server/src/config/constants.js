// Venue operating hours (local time). Each slot is 1 hour.
export const OPEN_HOUR = 11; // first slot starts 11:00
export const CLOSE_HOUR = 23; // venue closes 23:00, so the last slot starts 22:00

// All bookable hourly slot start times: ["11:00", "12:00", ... "22:00"]
export const SLOTS = Array.from(
  { length: CLOSE_HOUR - OPEN_HOUR },
  (_, i) => String(OPEN_HOUR + i).padStart(2, "0") + ":00"
);

// ───────────────────────────── LOYALTY ─────────────────────────────
// How many attended sessions ("stamps") fill one card. On the Nth stamp the
// user unlocks ONE free solo session. Kept here as the single source of truth
// so the backend math and any UI that shows "x / 10" never disagree.
export const STAMPS_PER_REWARD = 10;

// ───────────────────────────── VENUE TIME ─────────────────────────────
// Bookings store date/slotStart as VENUE-LOCAL strings (e.g. "2026-06-22",
// "13:00"). The server may run in any timezone (UTC on most hosts), so to ask
// "has this slot finished yet?" we must compute "now" in the venue's timezone,
// not the server's. This is that timezone.
export const VENUE_TZ = "Asia/Kolkata"; // IST

// Returns the current venue-local date + hour, derived from the real instant but
// expressed in VENUE_TZ — so it's correct no matter where the server is hosted.
//   { date: "2026-06-22", hour: 14 }
export function venueNow() {
  const now = new Date();
  // en-CA formats as YYYY-MM-DD; hour12:false gives a 0–23 hour.
  const date = new Intl.DateTimeFormat("en-CA", {
    timeZone: VENUE_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  const hour = parseInt(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: VENUE_TZ,
      hour: "2-digit",
      hour12: false,
    }).format(now),
    10
  );
  return { date, hour };
}
