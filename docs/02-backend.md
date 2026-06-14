# Backend — Data Models & API Endpoints

Stack: **Node.js + Express + Mongoose (MongoDB Atlas)**, Redis for cache/rate-limit/locks, BullMQ for async jobs.

---

## Data models

### Station
```js
{
  _id,
  name: String,            // "PS5 - Station 1", "Racing Rig", "VR (Quest 3)"
  type: String,            // "console" | "racing" | "vr"
  description: String,
  capacity: Number,        // max players at once (e.g. PS5 = 2, VR = 1)
  games: [String],         // ["God of War", "Elden Ring", "FC26", "Tekken 8"]
  isActive: Boolean,
  createdAt, updatedAt
}
```

### User  (customer accounts)
```js
{
  _id,
  name: String,
  email: String,           // unique, lowercased
  phone: String,
  passwordHash: String,    // bcrypt (cost 12)
  role: String,            // "customer"
  lastLoginAt: Date,
  createdAt, updatedAt
}
// index: { email: 1 } unique
```
> Customers register/login to book (MVP). Confirmations go to this account's email/phone.
> Post-MVP guest checkout will allow bookings without a User (see roadmap).

### Booking  (the core model)
```js
{
  _id,
  bookingRef: String,      // human-friendly id e.g. "ESA-7F3K9" (shown on pass)
  userId: ObjectId,        // ref User — REQUIRED in MVP (optional post-MVP for guests)
  stationId: ObjectId,     // ref Station
  date: String,            // "YYYY-MM-DD" (venue local date)
  slotStart: String,       // "19:00"  (hourly slots 11:00–23:00)
  slotEnd: String,         // "20:00"
  durationHours: Number,   // 1..3, or "unlimited" package
  packageType: String,     // "solo" | "duo" | "squad" | "hourly"
  squadSize: Number,       // 1..N
  customerName: String,    // snapshot (from user account in MVP; entered by guest post-MVP)
  phone: String,
  email: String,           // where confirmation is sent
  gamerTag: String,
  notes: String,
  price: Number,           // SERVER-COMPUTED, in ₹ (store paise internally if preferred)
  status: String,          // "pending" | "confirmed" | "cancelled" | "expired"
  holdExpiresAt: Date,     // for pending → auto-expire if unpaid
  payment: {
    orderId: String,       // Razorpay order id
    paymentId: String,     // Razorpay payment id (after success)
    signature: String,     // verified signature
    status: String         // "created" | "paid" | "failed"
  },
  createdAt, updatedAt
}
```

**Indexes (critical):**
```js
// 1. Race-safety: one booking per station+date+slot (only counts live holds/confirms)
bookingSchema.index(
  { stationId: 1, date: 1, slotStart: 1 },
  { unique: true, partialFilterExpression: { status: { $in: ["pending", "confirmed"] } } }
);
// 2. Fast availability lookups
bookingSchema.index({ stationId: 1, date: 1, status: 1 });
// 3. Admin lists / sorting
bookingSchema.index({ status: 1, createdAt: -1 });
// 4. TTL-ish cleanup helper (or a scheduled job) on holdExpiresAt
bookingSchema.index({ holdExpiresAt: 1 });
```
> The partial unique index means cancelled/expired bookings don't block the slot — only active ones do.

### Admin
```js
{
  _id,
  email: String,           // unique
  passwordHash: String,    // bcrypt (cost 12)
  role: String,            // "owner"
  lastLoginAt: Date,
  createdAt, updatedAt
}
```
Seeded once via a secure script (see `06-security.md`) — no public registration.

### Pricing/config
Packages + rates kept in a small config collection or seed file so price is computed server-side, never from the client.

---

## API endpoints

### Customer auth
| Method | Path | Purpose | Notes |
|---|---|---|---|
| POST | `/api/auth/register` | Create customer account | bcrypt; email unique; rate-limited |
| POST | `/api/auth/login` | Login | bcrypt; sets httpOnly cookies; rate-limited |
| POST | `/api/auth/refresh` | Rotate access token | Rotating refresh token |
| POST | `/api/auth/logout` | Clear session | |
| GET | `/api/auth/me` | Current user profile | Requires auth |

### Public / customer
| Method | Path | Purpose | Notes |
|---|---|---|---|
| GET | `/api/stations` | List stations, games, pricing | Redis-cached; public |
| GET | `/api/availability?date=&stationId=` | Free slots for a date/station | Redis-cached (short TTL); public |
| POST | `/api/bookings` | Create **pending** booking + Razorpay order | **Auth required (MVP)**; validates + computes price server-side; attaches `userId`; rate-limited |
| GET | `/api/bookings/mine` | Logged-in user's bookings ("My Bookings") | Auth required; `Booking.find({ userId })` |
| POST | `/api/payments/verify` | Verify signature → confirm booking | Auth required; HMAC check; enqueue notifications |
| POST | `/api/payments/webhook` | Razorpay server-to-server confirm | Public but signature-checked; idempotent |
| GET | `/api/bookings/:ref` | Fetch a booking for confirmation page | Auth + ownership check (own booking) |

### Admin (JWT-protected)
| Method | Path | Purpose | Notes |
|---|---|---|---|
| POST | `/api/admin/login` | Login | bcrypt; rate-limited; sets httpOnly cookies |
| POST | `/api/admin/refresh` | Rotate access token | Rotating refresh token |
| POST | `/api/admin/logout` | Clear session | |
| GET | `/api/admin/bookings?status=&date=&page=` | Paginated bookings | |
| PATCH | `/api/admin/bookings/:id` | Cancel / update status | Invalidates availability cache |
| GET | `/api/admin/stats` | Dashboard metrics | Cached aggregations *(charts: post-MVP)* |
| POST | `/api/admin/blackout` | Block slots (maintenance) | *post-MVP* |

---

## Key middleware (order matters)

```
helmet()                    → security headers
cors({ allowlist })         → strict origin allowlist
express.json({ limit })     → body size cap
rateLimiter (Redis-backed)  → per-IP + per-route limits
validate(zodSchema)         → input validation + sanitization (NoSQL-injection safe)
authGuard (admin routes)    → verify JWT from httpOnly cookie
requestTimer                → log response time (p95 observability)
errorHandler                → no stack traces leaked to client
```

---

## Booking creation — pseudocode (the heart of it)

```js
async function createBooking(req) {
  const userId = req.user.id;                              // from authGuard (MVP: required)
  const data = validate(bookingSchema, req.body);          // zod
  const station = await Station.findById(data.stationId);
  const price = computePrice(station, data.packageType,    // SERVER-SIDE price
                             data.squadSize, data.durationHours);
  try {
    const booking = await Booking.create({
      ...data, userId, price, status: "pending",
      holdExpiresAt: new Date(Date.now() + 10*60*1000),
      bookingRef: genRef(),
    });
    const order = await razorpay.orders.create({
      amount: price * 100,         // paise
      currency: "INR",
      receipt: booking.bookingRef,
    });
    booking.payment = { orderId: order.id, status: "created" };
    await booking.save();
    return { bookingRef: booking.bookingRef, orderId: order.id,
             amount: price, keyId: process.env.RAZORPAY_KEY_ID };
  } catch (e) {
    if (e.code === 11000) throw new HttpError(409, "Slot just got taken — pick another");
    throw e;
  }
}
```
> Note: `Date.now()` is fine in real app code — the restriction only applies to workflow scripts, not the app.
