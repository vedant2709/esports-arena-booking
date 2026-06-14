import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-50 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <Link to="/" className="flex items-center gap-2 text-lg font-bold tracking-tight">
          <span className="text-neon">⬢</span> E-Sports Arena
        </Link>

        <div className="flex items-center gap-4 text-sm">
          {user ? (
            <>
              {user.role === "owner" && (
                <Link to="/admin" className="text-zinc-300 hover:text-white">Admin</Link>
              )}
              <Link to="/my-bookings" className="text-zinc-300 hover:text-white">My Bookings</Link>
              <span className="hidden text-zinc-500 sm:inline">Hi, {user.name.split(" ")[0]}</span>
              <button
                onClick={logout}
                className="rounded-lg border border-zinc-700 px-3 py-1.5 transition hover:border-neon hover:text-neon"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="text-zinc-300 hover:text-white">Login</Link>
              <Link
                to="/register"
                className="rounded-lg bg-neon px-3 py-1.5 font-semibold text-zinc-950 transition hover:opacity-90"
              >
                Sign up
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
