// Shared date/time display helpers. Stored values stay machine-friendly
// (date "YYYY-MM-DD", slotStart "HH:00"); these only format for display.

// "HH:00" (24h) -> "h:00 AM/PM".  e.g. "19:00" -> "7:00 PM"
export const formatSlot = (slotStart) => {
  const hour = parseInt(slotStart, 10);
  const period = hour < 12 ? "AM" : "PM";
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${h12}:00 ${period}`;
};

// "YYYY-MM-DD" -> weekday name. e.g. "2026-06-14" -> "Sun".
// Parse parts explicitly (not new Date("YYYY-MM-DD"), which is UTC and can
// shift the weekday); construct a local date instead.
export const formatDay = (dateStr, weekday = "short") => {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday });
};
