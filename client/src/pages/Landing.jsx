import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/client";

export default function Landing() {
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/stations")
      .then((res) => setStations(res.data.stations))
      .catch(() => setStations([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-zinc-800">
        <div
          className="pointer-events-none absolute inset-0 opacity-30"
          style={{ background: "radial-gradient(600px circle at 50% 0%, rgba(43,255,136,0.15), transparent 70%)" }}
        />
        <div className="relative mx-auto max-w-6xl px-4 py-24 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-neon">
            Alankar Tower · Sayajiganj, Vadodara
          </p>
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-6xl">
            Book your <span className="text-neon">game</span>.<br className="hidden sm:block" /> Skip the wait.
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-zinc-400">
            PS5, racing rigs & VR — reserve your station and time slot in seconds. Pay online, walk in, play.
          </p>
          <Link
            to="/book"
            className="mt-8 inline-block rounded-xl bg-neon px-6 py-3 font-semibold text-zinc-950 shadow-[0_0_40px_-10px_#2bff88] transition hover:opacity-90"
          >
            Book your slot →
          </Link>
        </div>
      </section>

      {/* Stations */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="mb-8 text-2xl font-bold">Our Stations</h2>

        {loading ? (
          <p className="text-zinc-500">Loading stations…</p>
        ) : stations.length === 0 ? (
          <p className="text-zinc-500">No stations available right now.</p>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {stations.map((s) => (
              <div
                key={s._id}
                className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 transition hover:border-neon/40 hover:shadow-[0_0_30px_-12px_#2bff88]"
              >
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-lg font-semibold">{s.name}</h3>
                  <span className="rounded-full border border-zinc-700 px-2 py-0.5 text-xs uppercase tracking-wide text-zinc-400">
                    {s.type}
                  </span>
                </div>
                <p className="mb-4 text-sm text-zinc-400">{s.description}</p>
                <div className="mb-4 flex flex-wrap gap-1.5">
                  {s.games.slice(0, 4).map((g) => (
                    <span key={g} className="rounded-md bg-zinc-800 px-2 py-1 text-xs text-zinc-300">
                      {g}
                    </span>
                  ))}
                </div>
                <div className="flex items-center justify-between border-t border-zinc-800 pt-4">
                  <span className="text-sm text-zinc-400">Up to {s.capacity} players</span>
                  <span className="font-bold text-neon">
                    ₹{s.pricePerHour}
                    <span className="text-xs font-normal text-zinc-500">/hr</span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
