import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/auth.routes.js";
import stationRoutes from "./routes/station.routes.js";
import availabilityRoutes from "./routes/availability.routes.js";
import bookingRoutes from "./routes/booking.routes.js";
import paymentRoutes from "./routes/payment.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import loyaltyRoutes from "./routes/loyalty.routes.js";

// Create the Express application — the "pipeline" container that every
// incoming request flows through (middleware in order, then a route).
const app = express();

// Behind Render/Vercel's proxy, the real client IP is in X-Forwarded-For.
// Trust the first proxy hop so req.ip is the actual client (needed for correct
// rate limiting). Without this, every request would appear to share one IP.
app.set("trust proxy", 1);

// SECURITY HEADERS: helmet sets a suite of protective HTTP response headers
// (anti-clickjacking, no MIME-sniffing, hides framework info, etc.). Runs first.
app.use(helmet());

// CORS: controls which browser ORIGINS may call this API. Browsers block
// cross-origin requests unless the server opts in here. credentials:true is
// required for the browser to send/receive our httpOnly auth cookies.
const allowedOrigins = (process.env.CLIENT_ORIGIN || "http://localhost:5173").split(",");
app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);

// MIDDLEWARE: parse JSON request bodies into req.body so routes can read them.
// Without this, req.body is undefined for JSON POST requests.
app.use(express.json());

// MIDDLEWARE: parse the Cookie header into req.cookies so we can read the
// httpOnly auth cookie the browser sends on each request.
app.use(cookieParser());

// Health check — a dead-simple endpoint that proves the server is alive.
// Hosting platforms (Render, etc.) ping routes like this to monitor uptime.
app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "esports-arena-server" });
});

// ROUTES
app.use("/api/auth", authRoutes);                 // register/login/refresh/me/logout
app.use("/api/stations", stationRoutes);          // list stations, get one
app.use("/api/availability", availabilityRoutes); // free/taken slots for a station+date
app.use("/api/bookings", bookingRoutes);          // create booking, my bookings
app.use("/api/payments", paymentRoutes);          // create order, verify
app.use("/api/admin", adminRoutes);               // owner-only: list bookings, update status
app.use("/api/loyalty", loyaltyRoutes);           // logged-in user's loyalty card

// Export the configured app so index.js can start it (and tests can import it).
export default app;
