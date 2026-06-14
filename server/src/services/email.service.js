import { Resend } from "resend";

// Lazily create the Resend client on first send (not at import) so the server
// boots even before RESEND_API_KEY is configured.
let resend = null;
function getResend() {
  if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY is not set");
  }
  if (!resend) resend = new Resend(process.env.RESEND_API_KEY);
  return resend;
}

// Resend's onboarding sender works without verifying a domain, but only delivers
// to YOUR OWN Resend account email. For real recipients, verify a domain and set
// FROM_EMAIL (e.g. "E-Sports Arena <bookings@yourdomain.com>").
const FROM = process.env.FROM_EMAIL || "E-Sports Arena <onboarding@resend.dev>";

function confirmationHtml(booking) {
  const row = (k, v) =>
    `<tr><td style="padding:6px 0;color:#71717a">${k}</td><td style="padding:6px 0;text-align:right;font-weight:600;color:#18181b">${v}</td></tr>`;
  return `
  <div style="font-family:system-ui,Segoe UI,Roboto,sans-serif;background:#f4f4f5;padding:24px">
    <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e4e4e7">
      <div style="background:#09090b;padding:24px;text-align:center">
        <span style="color:#2bff88;font-size:20px;font-weight:800">⬢ E-Sports Arena</span>
      </div>
      <div style="padding:24px">
        <h1 style="margin:0 0 4px;font-size:20px;color:#18181b">Booking confirmed 🎟️</h1>
        <p style="margin:0 0 20px;color:#71717a;font-size:14px">
          Hi ${booking.customerName}, your slot is locked in. Show this reference at the arena.
        </p>
        <table style="width:100%;font-size:14px;border-collapse:collapse">
          ${row("Reference", booking.bookingRef)}
          ${row("Station", booking.station?.name || "—")}
          ${row("Date", booking.date)}
          ${row("Time", booking.slotStart)}
          ${row("Players", booking.squadSize)}
          ${row("Amount paid", "₹" + booking.price)}
        </table>
        <p style="margin:20px 0 0;color:#a1a1aa;font-size:12px">
          Alankar Tower, 1st Floor · Sayajiganj, Vadodara · 11 AM – 11 PM
        </p>
      </div>
    </div>
  </div>`;
}

// Send the booking-confirmation email. Throws on failure so the queue retries.
export async function sendBookingConfirmationEmail(booking) {
  // TEST_EMAIL_OVERRIDE: in dev, send ALL confirmations to one inbox regardless
  // of the booking's email (handy when using Resend's onboarding sender, which
  // only delivers to your own account). Leave unset in production.
  const to = process.env.TEST_EMAIL_OVERRIDE || booking.email;

  const { error } = await getResend().emails.send({
    from: FROM,
    to,
    subject: `Booking confirmed — ${booking.bookingRef}`,
    html: confirmationHtml(booking),
  });
  if (error) throw new Error(error.message || "Resend send failed");
}
