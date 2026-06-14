import { Router } from "express";
import { createPaymentOrder, verifyPayment } from "../controllers/payment.controller.js";
import { requireAuth } from "../middleware/auth.js";

// Mounted under "/api/payments" (see app.js).
const router = Router();

// POST /api/payments/order — create a Razorpay order for a pending booking.
router.post("/order", requireAuth, createPaymentOrder);

// POST /api/payments/verify — verify the checkout signature → confirm booking.
router.post("/verify", requireAuth, verifyPayment);

// (POST /api/payments/webhook is added in 6c.)

export default router;
