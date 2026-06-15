import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";
import { loadRazorpay } from "../utils/razorpay";
import { formatSlot } from "../utils/dateTime";

const STEPS = ["Station", "Date & Slot", "Squad", "Review"];

// Next 7 days as Date objects.
const nextDays = Array.from({ length: 7 }, (_, i) => {
  const d = new Date();
  d.setDate(d.getDate() + i);
  return d;
});
// Local YYYY-MM-DD (NOT toISOString, which is UTC and can shift the day).
const ymd = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

// Has this slot's start time already passed? Only today's earlier slots count
// as past — every other day in the window is entirely upcoming. slotStart is
// "HH:00", so parseInt gives the start hour. A slot whose hour <= the current
// hour has already started, so it's no longer bookable.
const isPastSlot = (dateStr, slotStart) => {
  const now = new Date();
  if (dateStr !== ymd(now)) return false;
  return parseInt(slotStart, 10) <= now.getHours();
};

const packageFor = (n) => (n === 1 ? "solo" : n === 2 ? "duo" : "squad");

export default function Book() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState(0);
  const [stations, setStations] = useState([]);
  const [station, setStation] = useState(null);
  const [date, setDate] = useState(ymd(nextDays[0]));
  const [slots, setSlots] = useState([]);
  const [slot, setSlot] = useState(null);
  const [squadSize, setSquadSize] = useState(1);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [error, setError] = useState("");
  const [paying, setPaying] = useState(false);
  const [reward, setReward] = useState(null);   // loyalty summary, or null
  const [useReward, setUseReward] = useState(false); // redeem a free session?

  // Load stations once.
  useEffect(() => {
    api.get("/stations").then((res) => setStations(res.data.stations)).catch(() => {});
  }, []);

  // Load the user's loyalty card once — tells us if a free session is available.
  useEffect(() => {
    api.get("/loyalty/me").then((res) => setReward(res.data)).catch(() => setReward(null));
  }, []);

  // Load availability whenever the station or date changes (step 2).
  useEffect(() => {
    if (!station) return;
    setLoadingSlots(true);
    setSlot(null);
    api
      .get("/availability", { params: { stationId: station._id, date } })
      .then((res) => setSlots(res.data.slots))
      .catch(() => setSlots([]))
      .finally(() => setLoadingSlots(false));
  }, [station, date]);

  // A redeemed reward is always free; otherwise price = hourly rate × players.
  const price = useReward ? 0 : station ? station.pricePerHour * squadSize : 0;
  const rewardAvailable = (reward?.rewardsAvailable || 0) > 0;

  // FREE-REWARD path: no payment — just create the booking with useReward and go
  // straight to the confirmation page.
  async function handleRedeem() {
    setError("");
    setPaying(true);
    try {
      const { data: created } = await api.post("/bookings", {
        stationId: station._id,
        date,
        slotStart: slot,
        useReward: true,
      });
      navigate(`/booking/${created.booking.bookingRef}`);
    } catch (e) {
      setError(e.response?.data?.message || "Could not redeem your free session.");
      setPaying(false);
      if (e.response?.status === 409) setStep(1); // slot taken → back to slot pick
    }
  }

  async function handlePay() {
    if (useReward) return handleRedeem(); // free session → skip Razorpay entirely
    setError("");
    setPaying(true);
    try {
      // 1. Create the pending booking (race-safe on the server).
      const { data: created } = await api.post("/bookings", {
        stationId: station._id,
        date,
        slotStart: slot,
        squadSize,
        packageType: packageFor(squadSize),
      });
      const bookingId = created.booking._id;
      const bookingRef = created.booking.bookingRef;

      // 2. Create the Razorpay order.
      const { data: order } = await api.post("/payments/order", { bookingId });

      // 3. Load + open Razorpay Checkout.
      await loadRazorpay();
      const rzp = new window.Razorpay({
        key: order.keyId, // PUBLIC key
        amount: order.amount,
        currency: order.currency,
        order_id: order.orderId,
        name: "E-Sports Arena",
        description: `${station.name} · ${date} · ${formatSlot(slot)}`,
        prefill: { name: user.name, email: user.email, contact: user.phone },
        theme: { color: "#2bff88" },
        handler: async (resp) => {
          // 4. Verify the payment on our server → confirm the booking.
          try {
            await api.post("/payments/verify", {
              bookingId,
              razorpay_order_id: resp.razorpay_order_id,
              razorpay_payment_id: resp.razorpay_payment_id,
              razorpay_signature: resp.razorpay_signature,
            });
            navigate(`/booking/${bookingRef}`);
          } catch {
            setError("Payment couldn't be verified. If you were charged, contact the arena.");
          }
        },
        modal: { ondismiss: () => setPaying(false) }, // user closed the popup
      });
      rzp.open();
    } catch (e) {
      const msg = e.response?.data?.message || "Could not start payment.";
      setError(msg);
      setPaying(false);
      if (e.response?.status === 409) setStep(1); // slot taken → back to slot pick
    }
  }

  const card = "rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6";
  const canNext = [!!station, !!slot, squadSize >= 1, true][step];

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      {/* Stepper */}
      <ol className="mb-8 flex items-center gap-2 text-xs">
        {STEPS.map((label, i) => (
          <li key={label} className="flex flex-1 items-center gap-2">
            <span
              className={`flex h-7 w-7 items-center justify-center rounded-full font-semibold ${
                i <= step ? "bg-neon text-zinc-950" : "bg-zinc-800 text-zinc-400"
              }`}
            >
              {i + 1}
            </span>
            <span className={i <= step ? "text-zinc-100" : "text-zinc-500"}>{label}</span>
            {i < STEPS.length - 1 && <span className="h-px flex-1 bg-zinc-800" />}
          </li>
        ))}
      </ol>

      {error && (
        <div className="mb-6 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2.5 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Step 1 — Station */}
      {step === 0 && (
        <div className={card}>
          <h2 className="mb-4 text-lg font-semibold">Choose a station</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {stations.map((s) => (
              <button
                key={s._id}
                onClick={() => setStation(s)}
                className={`rounded-xl border p-4 text-left transition ${
                  station?._id === s._id ? "border-neon bg-neon/5" : "border-zinc-800 hover:border-zinc-600"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{s.name}</span>
                  <span className="text-sm text-neon">₹{s.pricePerHour}/hr</span>
                </div>
                <p className="mt-1 text-xs text-zinc-500">Up to {s.capacity} players · {s.type}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 2 — Date & Slot */}
      {step === 1 && (
        <div className={card}>
          <h2 className="mb-4 text-lg font-semibold">Pick a date & time</h2>
          <div className="mb-5 flex flex-wrap gap-2">
            {nextDays.map((d) => {
              const v = ymd(d);
              return (
                <button
                  key={v}
                  onClick={() => setDate(v)}
                  className={`rounded-lg border px-3 py-2 text-center text-xs ${
                    date === v ? "border-neon bg-neon/5 text-neon" : "border-zinc-800 text-zinc-300 hover:border-zinc-600"
                  }`}
                >
                  <div className="font-semibold">{d.toLocaleDateString(undefined, { weekday: "short" })}</div>
                  <div className="text-zinc-500">{d.getDate()}/{d.getMonth() + 1}</div>
                </button>
              );
            })}
          </div>
          {loadingSlots ? (
            <p className="text-sm text-zinc-500">Loading slots…</p>
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {slots.map((s) => {
                const past = isPastSlot(date, s.slotStart);
                const disabled = !s.available || past;
                return (
                  <button
                    key={s.slotStart}
                    disabled={disabled}
                    onClick={() => setSlot(s.slotStart)}
                    className={`rounded-lg border px-2 py-2 text-sm transition ${
                      disabled
                        ? "cursor-not-allowed border-zinc-800 text-zinc-600 line-through"
                        : slot === s.slotStart
                        ? "border-neon bg-neon/5 text-neon"
                        : "border-zinc-700 text-zinc-200 hover:border-zinc-500"
                    }`}
                  >
                    {formatSlot(s.slotStart)}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Step 3 — Squad */}
      {step === 2 && (
        <div className={card}>
          <h2 className="mb-4 text-lg font-semibold">How many players?</h2>
          <div className="mb-6 flex gap-2">
            {Array.from({ length: station?.capacity || 1 }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                onClick={() => setSquadSize(n)}
                className={`h-12 w-12 rounded-lg border font-semibold ${
                  squadSize === n ? "border-neon bg-neon/5 text-neon" : "border-zinc-700 text-zinc-200 hover:border-zinc-500"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
          <div className="flex items-center justify-between border-t border-zinc-800 pt-4">
            <span className="text-zinc-400">Total ({squadSize} × ₹{station?.pricePerHour}/hr)</span>
            <span className="text-2xl font-bold text-neon">₹{price}</span>
          </div>
        </div>
      )}

      {/* Step 4 — Review */}
      {step === 3 && (
        <div className={card}>
          <h2 className="mb-4 text-lg font-semibold">Review & pay</h2>
          <dl className="space-y-2 text-sm">
            {[
              ["Station", station?.name],
              ["Date", date],
              ["Time", slot ? formatSlot(slot) : slot],
              ["Players", useReward ? 1 : squadSize],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between border-b border-zinc-800 pb-2">
                <dt className="text-zinc-400">{k}</dt>
                <dd className="font-medium">{v}</dd>
              </div>
            ))}
          </dl>

          {/* Redeem a free solo session if the user has one available. */}
          {rewardAvailable && (
            <label className="mt-4 flex cursor-pointer items-center gap-3 rounded-lg border border-neon/40 bg-neon/5 px-4 py-3">
              <input
                type="checkbox"
                checked={useReward}
                onChange={(e) => setUseReward(e.target.checked)}
                className="h-4 w-4 accent-[#2bff88]"
              />
              <span className="text-sm text-neon">
                🎁 Use my free solo session (makes this booking free)
              </span>
            </label>
          )}

          <div className="mt-4 flex items-center justify-between">
            <span className="text-zinc-400">Total</span>
            <span className="text-2xl font-bold text-neon">{useReward ? "Free" : `₹${price}`}</span>
          </div>
          <button
            onClick={handlePay}
            disabled={paying}
            className="mt-6 w-full rounded-xl bg-neon py-3 font-semibold text-zinc-950 transition hover:opacity-90 disabled:opacity-50"
          >
            {paying
              ? useReward
                ? "Confirming…"
                : "Starting payment…"
              : useReward
              ? "Confirm free booking"
              : `Pay ₹${price}`}
          </button>
        </div>
      )}

      {/* Nav buttons */}
      <div className="mt-6 flex justify-between">
        <button
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0}
          className="rounded-lg border border-zinc-700 px-5 py-2 text-sm transition hover:border-zinc-500 disabled:opacity-40"
        >
          Back
        </button>
        {step < STEPS.length - 1 && (
          <button
            onClick={() => setStep((s) => s + 1)}
            disabled={!canNext}
            className="rounded-lg bg-zinc-100 px-5 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-white disabled:opacity-40"
          >
            Next
          </button>
        )}
      </div>
    </div>
  );
}
