import "dotenv/config"; // MUST be first: loads .env into process.env before anything reads it
import app from "./app.js";
import { connectDB } from "./config/db.js";
import "./config/redis.js"; // side-effect import: creates the Redis client + connects
import { expireStaleHolds } from "./services/cleanup.service.js";

const PORT = process.env.PORT || 5001;
const CLEANUP_INTERVAL_MS = 60 * 1000; // run the hold-cleanup once a minute

// Start sequence: connect to the database FIRST, then open the HTTP port.
// If the DB connection fails, we log the reason and exit with code 1 instead
// of running a server that can't actually store anything.
async function start() {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`✅ Server running on http://localhost:${PORT}`);
    });

    // Background job: expire abandoned holds so their slots free up. Idempotent,
    // so it's safe even if multiple server instances each run it.
    setInterval(() => {
      expireStaleHolds()
        .then((n) => {
          if (n > 0) console.log(`🧹 Expired ${n} stale hold(s)`);
        })
        .catch((e) => console.error("Hold cleanup error:", e.message));
    }, CLEANUP_INTERVAL_MS);
  } catch (err) {
    console.error("❌ Failed to start server:", err.message);
    process.exit(1);
  }
}

start();
