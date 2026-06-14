import Redis from "ioredis";

// Create ONE shared Redis client for the whole app. ioredis connects
// automatically and keeps a persistent connection (it also auto-reconnects
// if Redis restarts). We export this single instance so every part of the
// app — rate limiter, cache — talks to the same connection.
const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379");

// Log once when the connection is established.
redis.on("connect", () => {
  console.log("✅ Redis connected");
});

// Log errors (e.g. Redis is down) without crashing the app. ioredis keeps
// retrying in the background, so the server stays up even if Redis blips.
redis.on("error", (err) => {
  console.error("❌ Redis error:", err.message);
});

export default redis;
