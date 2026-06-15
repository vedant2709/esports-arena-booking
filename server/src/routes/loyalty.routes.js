import { Router } from "express";
import { myLoyalty } from "../controllers/loyalty.controller.js";
import { requireAuth } from "../middleware/auth.js";

// Mounted under "/api/loyalty" (see app.js). Card data is per-user, so login
// is required and the user is identified by their auth cookie (req.user.id).
const router = Router();

router.get("/me", requireAuth, myLoyalty); // GET /api/loyalty/me

export default router;
