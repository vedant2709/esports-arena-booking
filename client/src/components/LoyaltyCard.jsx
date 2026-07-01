import { useEffect, useState } from "react";
import api from "../api/client";

// Human labels for each ledger reason (used in the history list).
const REASON_LABEL = {
  checkin: "Checked in",
  auto: "Session completed",
  walk_in: "Walk-in session",
  admin_adjust: "Adjustment",
  redeemed: "Redeemed free session",
};

// The customer's digital punch card. Fetches /loyalty/me and renders the
// "x / 10" stamp grid plus a "free session ready" banner. Pass showHistory to
// also list recent activity (used on the dedicated Rewards page).
export default function LoyaltyCard({ showHistory = false }) {
  const [card, setCard] = useState(null);

  useEffect(() => {
    api
      .get("/loyalty/me")
      .then((res) => setCard(res.data))
      .catch(() => setCard(null)); // silently hide if it can't load
  }, []);

  if (!card) return null;

  const { progress, target, rewardsAvailable, rewardReady, history = [] } = card;
  const remaining = target - progress;

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold">🎮 Loyalty card</h3>
        <span className="text-xs text-zinc-500">{progress} / {target}</span>
      </div>

      {/* One box per stamp — filled (★) up to `progress`, empty otherwise. */}
      <div className="grid grid-cols-5 gap-2">
        {Array.from({ length: target }, (_, i) => {
          const filled = i < progress;
          return (
            <div
              key={i}
              className={`flex aspect-square items-center justify-center rounded-lg border text-sm font-semibold ${
                filled
                  ? "border-neon bg-neon/10 text-neon"
                  : "border-zinc-700 text-zinc-600"
              }`}
            >
              {filled ? "★" : i + 1}
            </div>
          );
        })}
      </div>

      {rewardReady ? (
        <div className="mt-4 rounded-lg border border-neon/40 bg-neon/5 px-3 py-2 text-center text-sm text-neon">
          🎁 Free solo session ready{rewardsAvailable > 1 ? ` ×${rewardsAvailable}` : ""}! Pick it at checkout.
        </div>
      ) : (
        <p className="mt-4 text-center text-xs text-zinc-500">
          {remaining} more session{remaining === 1 ? "" : "s"} until a free solo slot.
        </p>
      )}

      {/* Optional activity log — only on the dedicated Rewards page. */}
      {showHistory && (
        <div className="mt-5 border-t border-zinc-800 pt-4">
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Recent activity
          </h4>
          {history.length === 0 ? (
            <p className="text-xs text-zinc-600">No activity yet.</p>
          ) : (
            <ul className="space-y-2">
              {history.map((h, i) => (
                <li key={i} className="flex items-center justify-between text-xs">
                  <span className="text-zinc-300">
                    {REASON_LABEL[h.reason] || h.reason}
                    {h.note ? <span className="text-zinc-500"> · {h.note}</span> : null}
                  </span>
                  <span className="flex items-center gap-2 text-zinc-500">
                    <span>{new Date(h.createdAt).toLocaleDateString()}</span>
                    <span className={h.delta > 0 ? "text-neon" : "text-zinc-400"}>
                      {h.delta > 0 ? `+${h.delta}` : h.delta}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
