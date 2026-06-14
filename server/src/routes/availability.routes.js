import { Router } from "express";
import { availability } from "../controllers/availability.controller.js";

// Mounted under "/api/availability" (see app.js).
const router = Router();

router.get("/", availability); // GET /api/availability?stationId=...&date=...

export default router;
