import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/client";

const statusStyles = {
  confirmed: "border-neon/40 text-neon",
  pending: "border-amber-500/40 text-amber-400",
  cancelled: "border-red-500/40 text-red-400",
  expired: "border-zinc-600 text-zinc-500",
};

export default function MyBookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/bookings/mine")
      .then((res) => setBookings(res.data.bookings))
      .catch(() => setBookings([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="mb-6 text-2xl font-bold">My Bookings</h1>

      {loading ? (
        <p className="text-zinc-500">Loading…</p>
      ) : bookings.length === 0 ? (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-10 text-center">
          <p className="text-zinc-400">No bookings yet.</p>
          <Link to="/book" className="mt-4 inline-block rounded-lg bg-neon px-4 py-2 text-sm font-semibold text-zinc-950">
            Book a slot →
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {bookings.map((b) => (
            <div key={b._id} className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
              <div>
                <div className="font-medium">{b.station?.name || "Station"}</div>
                <div className="text-sm text-zinc-400">
                  {b.date} · {b.slotStart} · {b.squadSize} player(s) · ₹{b.price}
                </div>
                <div className="mt-1 text-xs text-zinc-600">Ref: {b.bookingRef}</div>
              </div>
              <span className={`rounded-full border px-3 py-1 text-xs font-medium capitalize ${statusStyles[b.status] || "border-zinc-700 text-zinc-400"}`}>
                {b.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
