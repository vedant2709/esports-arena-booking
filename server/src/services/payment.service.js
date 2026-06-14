import crypto from "crypto";
import Razorpay from "razorpay";

// Lazily create the Razorpay client on first use. Lazy (not at import time) so
// the server still boots if the keys aren't set yet — it only fails if you
// actually try to create an order.
let client = null;
function getClient() {
  if (!client) {
    client = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
  }
  return client;
}

// Create a Razorpay ORDER for a given amount (₹). Razorpay works in the smallest
// currency unit (paise), so we multiply by 100. receipt links it to our booking.
export async function createOrder({ amount, receipt }) {
  return getClient().orders.create({
    amount: Math.round(amount * 100), // ₹ → paise, integer
    currency: "INR",
    receipt,
  });
}

// Verify the checkout signature Razorpay returns after a successful payment.
// Razorpay computes: HMAC_SHA256(order_id + "|" + payment_id, key_secret).
// We recompute it with OUR secret and compare. If they match, the payment is
// genuine and untampered. The client can never forge this without the secret.
export function verifySignature({ orderId, paymentId, signature }) {
  const expected = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");

  // Constant-time comparison to avoid timing attacks. timingSafeEqual requires
  // equal-length buffers, so we guard on length first.
  const a = Buffer.from(expected);
  const b = Buffer.from(signature || "");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
