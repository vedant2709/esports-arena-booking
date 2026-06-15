import { useCallback, useEffect, useState } from "react";
import api from "../api/client";
import { formatSlot, formatDay } from "../utils/dateTime";

const FILTERS = ["", "pending", "confirmed", "cancelled", "expired"];
const badge = {
  confirmed: "border-neon/40 text-neon",
  pending: "border-amber-500/40 text-amber-400",
  cancelled: "border-red-500/40 text-red-400",
  expired: "border-zinc-600 text-zinc-500",
};

export default function Admin() {
  const [data, setData] = useState({ bookings: [], page: 1, pages: 1, total: 0 });
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");      // feedback banner for check-in/walk-in
  const [walkPhone, setWalkPhone] = useState(""); // phone for the walk-in form

  const load = useCallback(() => {
    setLoading(true);
    api
      .get("/admin/bookings", { params: { page, limit: 10, status: status || undefined } })
      .then((res) => setData(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [page, status]);

  useEffect(() => {
    load();
  }, [load]);

  const cancel = async (id) => {
    await api.patch(`/admin/bookings/${id}`, { status: "cancelled" });
    load(); // refresh the table
  };

  // Mark a booking as attended → awards one loyalty stamp (server enforces once).
  const checkIn = async (id) => {
    setNotice("");
    try {
      const { data: res } = await api.post(`/admin/bookings/${id}/checkin`);
      setNotice(
        res.alreadyCheckedIn
          ? "Already checked in — no extra stamp added."
          : `✓ Checked in. Stamp added (now ${res.summary.progress}/${res.summary.target}).`
      );
      load(); // refresh so the row shows "checked in"
    } catch (e) {
      setNotice(e.response?.data?.message || "Could not check in.");
    }
  };

  // Add a stamp for an in-person session/extension, by phone (the walk-in case).
  const addWalkIn = async () => {
    setNotice("");
    if (!walkPhone.trim()) return setNotice("Enter a phone number first.");
    try {
      const { data: res } = await api.post("/admin/loyalty/walkin", { phone: walkPhone.trim() });
      setNotice(
        `✓ Stamp added for ${res.user.name} — now ${res.summary.progress}/${res.summary.target}` +
          (res.summary.rewardReady ? " · 🎁 free session unlocked!" : "")
      );
      setWalkPhone("");
    } catch (e) {
      setNotice(e.response?.data?.message || "Could not add stamp.");
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Admin · Bookings</h1>
          <p className="text-sm text-zinc-400">{data.total} total</p>
        </div>
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm outline-none focus:border-neon"
        >
          {FILTERS.map((f) => (
            <option key={f} value={f}>{f === "" ? "All statuses" : f}</option>
          ))}
        </select>
      </div>

      {/* Walk-in / add-session: stamp a user who played in person (no booking). */}
      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
        <span className="text-sm font-medium text-zinc-300">Walk-in stamp:</span>
        <input
          value={walkPhone}
          onChange={(e) => setWalkPhone(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addWalkIn()}
          placeholder="Customer phone number"
          className="flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm outline-none focus:border-neon"
        />
        <button
          onClick={addWalkIn}
          className="rounded-lg bg-neon px-4 py-2 text-sm font-semibold text-zinc-950 transition hover:opacity-90"
        >
          + Add session
        </button>
      </div>

      {/* Feedback banner for check-in / walk-in actions. */}
      {notice && (
        <div className="mb-4 rounded-lg border border-neon/30 bg-neon/5 px-4 py-2.5 text-sm text-neon">
          {notice}
        </div>
      )}

      <div className="overflow-x-auto rounded-2xl border border-zinc-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-900/80 text-xs uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="px-4 py-3">Ref</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Station</th>
              <th className="px-4 py-3">Day</th>
              <th className="px-4 py-3">When</th>
              <th className="px-4 py-3">₹</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {loading ? (
              <tr><td colSpan={8} className="px-4 py-10 text-center text-zinc-500">Loading…</td></tr>
            ) : data.bookings.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-10 text-center text-zinc-500">No bookings.</td></tr>
            ) : (
              data.bookings.map((b) => (
                <tr key={b._id} className="hover:bg-zinc-900/40">
                  <td className="px-4 py-3 font-mono text-xs text-zinc-400">{b.bookingRef}</td>
                  <td className="px-4 py-3">
                    <div>{b.user?.name || b.customerName}</div>
                    <div className="text-xs text-zinc-500">{b.user?.email || b.email}</div>
                  </td>
                  <td className="px-4 py-3">{b.station?.name || "—"}</td>
                  <td className="px-4 py-3 text-zinc-400">{formatDay(b.date)}</td>
                  <td className="px-4 py-3 text-zinc-300">{b.date} · {formatSlot(b.slotStart)}</td>
                  <td className="px-4 py-3">{b.price}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full border px-2.5 py-0.5 text-xs capitalize ${badge[b.status] || "border-zinc-700 text-zinc-400"}`}>
                      {b.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      {/* Check-in: only for paid (confirmed) bookings. Shows a
                          static badge once done so it can't be clicked again. */}
                      {b.status === "confirmed" &&
                        (b.checkedIn ? (
                          <span className="rounded-lg border border-neon/30 px-3 py-1 text-xs text-neon">
                            ✓ In{b.isFreeReward ? " · 🎁" : ""}
                          </span>
                        ) : (
                          <button
                            onClick={() => checkIn(b._id)}
                            className="rounded-lg border border-zinc-700 px-3 py-1 text-xs transition hover:border-neon hover:text-neon"
                          >
                            Check in
                          </button>
                        ))}
                      {(b.status === "pending" || b.status === "confirmed") && (
                        <button
                          onClick={() => cancel(b._id)}
                          className="rounded-lg border border-zinc-700 px-3 py-1 text-xs transition hover:border-red-500 hover:text-red-400"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="mt-4 flex items-center justify-between text-sm">
        <span className="text-zinc-500">Page {data.page} of {data.pages}</span>
        <div className="flex gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={data.page <= 1}
            className="rounded-lg border border-zinc-700 px-3 py-1.5 transition hover:border-zinc-500 disabled:opacity-40"
          >
            Prev
          </button>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={data.page >= data.pages}
            className="rounded-lg border border-zinc-700 px-3 py-1.5 transition hover:border-zinc-500 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
