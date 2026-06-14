import { Router } from "express";
import { listStations, getStation } from "../controllers/station.controller.js";

// Mounted under "/api/stations" (see app.js).
const router = Router();

router.get("/", listStations); // GET /api/stations
router.get("/:id", getStation); // GET /api/stations/:id

export default router;
