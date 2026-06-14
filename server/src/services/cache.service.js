import redis from "../config/redis.js";

// Redis stores strings, so we JSON-encode on the way in and decode on the way out.

// Read a cached value by key. Returns the parsed value, or null on a cache MISS.
export async function cacheGet(key) {
  const raw = await redis.get(key);
  return raw ? JSON.parse(raw) : null;
}

// Store a value with a TTL (in seconds). "EX" tells Redis to auto-expire it.
export async function cacheSet(key, value, ttlSec) {
  await redis.set(key, JSON.stringify(value), "EX", ttlSec);
}

// Delete a key — used to INVALIDATE stale cache when the data changes.
export async function cacheDel(key) {
  await redis.del(key);
}
