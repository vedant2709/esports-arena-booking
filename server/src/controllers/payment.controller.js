import Booking from "../models/Booking.js";
import { createOrder, verifySignature } from "../services/payment.service.js";

// POST /api/payments/order  (auth required)
// Body: { bookingId }
// Creates a Razorpay order for a pending booking and returns the info the
// browser needs to open Razorpay Checkout.
export async function createPaymentOrder(req, res) {
  try {
    const { bookingId } = req.body;

    const booking = await Booking.findById(bookingId);
    if (!booking) return res.status(404).json({ message: "Booking not found" });

    // Ownership: you can only pay for your OWN booking.
    if (booking.user.toString() !== req.user.id) {
      return res.status(403).json({ message: "Not your booking" });
    }

    // Only a pending booking can be paid for.
    if (booking.status !== "pending") {
      return res.status(400).json({ message: "Booking is not awaiting payment" });
    }

    // Ask Razorpay for an order for THIS booking's server-computed price.
    const order = await createOrder({ amount: booking.price, receipt: booking.bookingRef });

    // Save the order id on the booking so we can tie the payment back to it.
    booking.payment = { orderId: order.id, status: "created" };
    await booking.save();

    return res.json({
      orderId: order.id,
      amount: order.amount, // in paise (Razorpay Checkout expects paise)
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID, // PUBLIC key — safe for the browser
      bookingRef: booking.bookingRef,
    });
  } catch (e) {
    console.error("Create payment order error:", e);
    return res.status(500).json({ message: "Could not create payment order" });
  }
}

// POST /api/payments/verify  (auth required)
// Body: { bookingId, razorpay_order_id, razorpay_payment_id, razorpay_signature }
export async function verifyPayment(req, res){
  try {
    const { bookingId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    const booking = await Booking.findById(bookingId);
    if (!booking) return res.status(404).json({ message: "Booking not found" });

    // Ownership — you can only confirm your OWN booking.
    if (booking.user.toString() !== req.user.id) {
      return res.status(403).json({ message: "Not your booking" });
    }

    // Idempotency — if it's already confirmed (e.g. the webhook beat us to it),
    // don't re-process; just report success.
    if(booking.status === "confirmed"){
      return res.json({ message: "Already confirmed", booking });
    }

    // The order id in the request must match the order WE created for this booking.
    // Stops someone from confirming with a signature from a different order.
    if (booking.payment?.orderId !== razorpay_order_id) {
      return res.status(400).json({ message: "Order does not match this booking" });
    }

    // THE check: recompute the signature with our secret and compare.
    const valid = verifySignature({
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      signature: razorpay_signature,
    });

    if (!valid) {
      booking.payment.status = "failed";
      await booking.save();
      return res.status(400).json({ message: "Payment verification failed" });
    }

    // Verified → confirm the booking for real.
    booking.status = "confirmed";
    booking.payment.paymentId = razorpay_payment_id;
    booking.payment.status = "paid";
    booking.holdExpiresAt = undefined; // it's no longer a pending hold
    await booking.save();

    return res.json({ message: "Payment verified", booking });
  } catch (e) {
    console.error("Verify payment error:", e);
    return res.status(500).json({ message: "Something went wrong" });
  }
}