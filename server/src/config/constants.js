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
