import { Worker } from "bullmq";
import { bullConnection } from "../config/queue.js";
import Booking from "../models/Booking.js";
import { sendBookingConfirmationEmail } from "../services/email.service.js";

// The worker pulls jobs off the "notifications" queue and processes them.
// It runs in the same process as the API (fine for a single Render service);
// at scale you'd run it as a separate worker service.
export const notificationWorker = new Worker(
  "notifications",
  async (job) => {
    if (job.name === "booking-confirmation") {
      // Re-fetch the booking fresh (the job only carries the id, not stale data).
      const booking = await Booking.findById(job.data.bookingId).populate("station", "name");
      if (!booking) return; // booking gone — nothing to send
      await sendBookingConfirmationEmail(booking); // throws → BullMQ retries
    }
  },
  { connection: bullConnection }
);

notificationWorker.on("completed", (job) => {
  console.log(`📧 Sent ${job.name} (job ${job.id})`);
});
notificationWorker.on("failed", (job, err) => {
  console.error(`Notification job ${job?.id} failed:`, err.message);
});
