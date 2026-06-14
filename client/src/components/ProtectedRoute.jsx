import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// Wrap any route that needs a logged-in user. Pass role="owner" to also require
// a specific role (used for admin pages).
export default function ProtectedRoute({ children, role }) {
  const { user } = useAuth();
  const location = useLocation();

  // Not logged in → go to login, remembering where they were headed so we can
  // send them back after a successful login.
  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  // Logged in but wrong role (e.g. a customer hitting /admin) → bounce home.
  if (role && user.role !== role) {
    return <Navigate to="/" replace />;
  }

  return children;
}
