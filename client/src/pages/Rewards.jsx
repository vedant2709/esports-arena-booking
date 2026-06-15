import { Link } from "react-router-dom";
import LoyaltyCard from "../components/LoyaltyCard";

// A place users can open any time to check their loyalty card + history.
export default function Rewards() {
  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <h1 className="mb-1 text-2xl font-bold">My Rewards</h1>
      <p className="mb-6 text-sm text-zinc-400">
        Earn a stamp every time you play. 10 stamps = one free solo session.
      </p>

      <LoyaltyCard showHistory />

      <div className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 text-sm text-zinc-400">
        <h3 className="mb-2 font-semibold text-zinc-200">How it works</h3>
        <ul className="list-disc space-y-1 pl-5">
          <li>You earn a stamp when the arena checks you in for a session.</li>
          <li>Collect 10 stamps to unlock a free solo session.</li>
          <li>Redeem it at checkout — just tick “Use my free solo session”.</li>
        </ul>
      </div>

      <Link
        to="/book"
        className="mt-6 inline-block w-full rounded-lg bg-neon py-2.5 text-center text-sm font-semibold text-zinc-950 transition hover:opacity-90"
      >
        Book a slot →
      </Link>
    </div>
  );
}
