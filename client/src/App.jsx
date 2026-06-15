import { Routes, Route } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Book from "./pages/Book";
import MyBookings from "./pages/MyBookings";
import Confirmation from "./pages/Confirmation";
import Admin from "./pages/Admin";
import Rewards from "./pages/Rewards";

export default function App() {
  const { loading } = useAuth();

  // While the initial session check runs, show a splash so the UI doesn't flicker
  // between logged-out and logged-in states on first paint.
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-zinc-500">
        Loading…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <Navbar />
      <main>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/book" element={<ProtectedRoute><Book /></ProtectedRoute>} />
          <Route path="/my-bookings" element={<ProtectedRoute><MyBookings /></ProtectedRoute>} />
          <Route path="/rewards" element={<ProtectedRoute><Rewards /></ProtectedRoute>} />
          <Route path="/booking/:ref" element={<ProtectedRoute><Confirmation /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute role="owner"><Admin /></ProtectedRoute>} />
        </Routes>
      </main>
    </div>
  );
}
