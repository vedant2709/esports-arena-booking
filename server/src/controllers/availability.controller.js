import Station from "../models/Station.js";
import { getAvailability } from "../services/availability.service.js";

// GET /api/availability?stationId=...&date=YYYY-MM-DD  (public)
export async function availability(req, res) {
  const { stationId, date } = req.query;

  // Basic presence check (full validation comes in Step 7).
  if (!stationId || !date) {
    return res.status(400).json({ message: "stationId and date are required" });
  }

  // Make sure the station exists and is active before reporting availability.
  const station = await Station.findById(stationId);
  if (!station || !station.isActive) {
    return res.status(404).json({ message: "Station not found" });
  }

  const slots = await getAvailability(stationId, date);
  return res.json({ stationId, date, slots });
}
