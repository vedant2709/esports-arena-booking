import Station from "../models/Station.js";
import { cacheGet, cacheSet } from "../services/cache.service.js";

const STATIONS_CACHE_KEY = "stations:active";
const STATIONS_TTL = 3600; // 1 hour — stations change very rarely

// GET /api/stations — list all active stations (public). Cache-aside.
export async function listStations(req, res) {
  // 1. Cache check.
  const cached = await cacheGet(STATIONS_CACHE_KEY);
  if (cached) return res.json({ stations: cached }); // HIT → straight from Redis

  // 2. MISS → query MongoDB.
  const stations = await Station.find({ isActive: true }).sort({ name: 1 });

  // 3. Populate the cache for next time. No invalidation needed — the 1h TTL
  //    handles the rare case where stations change (it'll refresh within an hour).
  await cacheSet(STATIONS_CACHE_KEY, stations, STATIONS_TTL);

  return res.json({ stations });
}

// GET /api/stations/:id — fetch one station (public).
export async function getStation(req, res) {
  const station = await Station.findById(req.params.id);
  if (!station || !station.isActive) {
    return res.status(404).json({ message: "Station not found" });
  }
  return res.json({ station });
}
