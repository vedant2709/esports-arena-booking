import { getLoyaltyForUser } from "../services/loyalty.service.js";

// GET /api/loyalty/me  (auth required) — the logged-in user's loyalty card:
// progress (x / 10), whether a free session is unlocked, and recent history.
// All the math lives in the service; this is just the HTTP wrapper.
export async function myLoyalty(req, res) {
  try {
    const data = await getLoyaltyForUser(req.user.id);
    return res.json(data);
  } catch (e) {
    if (e.status) return res.status(e.status).json({ message: e.message });
    console.error("Loyalty fetch error:", e);
    return res.status(500).json({ message: "Something went wrong" });
  }
}
