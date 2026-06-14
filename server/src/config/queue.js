import { Queue } from "bullmq";
import IORedis from "ioredis";

// BullMQ needs its own Redis connection with maxRetriesPerRequest set to null
// (its workers use long-blocking commands that the default setting would abort).
// This is separate from the cache/rate-limit Redis client in config/redis.js.
export const bullConnection = new IORedis(
  process.env.REDIS_URL || "redis://localhost:6379",
  { maxRetriesPerRequest: null }
);

// The queue that holds "send a notification" jobs. Producers add jobs here;
// the worker (queues/notification.worker.js) consumes them.
export const notificationQueue = new Queue("notifications", {
  connection: bullConnection,
});
