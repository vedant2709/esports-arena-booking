import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../api/client";
import LoyaltyCard from "../components/LoyaltyCard";
import { formatSlot } from "../utils/dateTime";

export default function Confirmation() {
  const { ref } = useParams();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get(`/bookings/${ref}`)
      .then((res) => setBooking(res.data.booking))
      .catch(() => setError("Booking not found"))
      .finally(() => setLoading(false));
  }, [ref]);

  if (loading) return <div className="mx-auto max-w-md px-4 py-16 text-zinc-500">Loading…</div>;
  if (error || !booking)
    return <div className="mx-auto max-w-md px-4 py-16 text-zinc-400">{error || "Not found"}</div>;

  const confirmed = booking.status === "confirmed";

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <div className="rounded-2xl border border-neon/30 bg-zinc-900/60 p-8 text-center shadow-[0_0_50px_-20px_#2bff88]">
        <div className="mb-3 text-5xl">{confirmed ? "🎟️" : "⏳"}</div>
        <h1 className="text-xl font-bold">{confirmed ? "Booking confirmed!" : "Booking pending"}</h1>
        <p className="mt-1 text-sm text-zinc-400">Ref: {booking.bookingRef}</p>

        <dl className="mt-6 space-y-2 text-left text-sm">
          {[
            ["Station", booking.station?.name],
            ["Date", booking.date],
            ["Time", formatSlot(booking.slotStart)],
            ["Players", booking.squadSize],
            ["Status", booking.isFreeReward ? "confirmed (free reward 🎁)" : booking.status],
            ["Amount", booking.price === 0 ? "Free" : `₹${booking.price}`],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between border-b border-zinc-800 pb-2">
              <dt className="text-zinc-400">{k}</dt>
              <dd className="font-medium capitalize">{v}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-6 flex gap-3">
          <Link to="/my-bookings" className="flex-1 rounded-lg border border-zinc-700 py-2 text-sm hover:border-zinc-500">
            My Bookings
          </Link>
          <Link to="/" className="flex-1 rounded-lg bg-neon py-2 text-sm font-semibold text-zinc-950 hover:opacity-90">
            Home
          </Link>
        </div>
      </div>

      {/* Loyalty card — shows the updated stamp count after this booking. */}
      <div className="mt-6">
        <LoyaltyCard />
      </div>
    </div>
  );
}
