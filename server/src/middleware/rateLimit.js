import redis from "../config/redis.js";

// A FACTORY: call it with settings and it returns a middleware. This lets us
// create different limiters for different routes (login vs booking, etc.).
//   name      → a label so each limiter has its own independent counters
//   limit     → max requests allowed per window
//   windowSec → window length in seconds
export function rateLimit({name, limit, windowSec}){
    return async function (req,res,next) {
        try {
            // 1. Identify the client by IP, and build a key unique to this limiter.
            const key = `rl:${name}:${req.ip}`;

            // 2. Atomically increment this client's counter; get the new value.
            const count = await redis.incr(key);

            // 3. If this is the first request in the window, start the expiry clock.
            if(count === 1){
                await redis.expire(key, windowSec);
            }

            // 4. Over the limit → reject. ttl tells the client how long to wait.
            if(count > limit){
                const ttl = await redis.ttl(key);
                res.set("Retry-After", String(ttl));
                return res.status(429).json({ message: `Too many requests. Try again in ${ttl}s.` });
            }

            // 5. Under the limit → let the request through.
            next();
        } catch (e) {
            // Fail OPEN: if Redis is unavailable, don't block traffic — just allow it.
            console.error("Rate limit error:", e.message);
            next();
        }
    }
}