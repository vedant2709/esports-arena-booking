# 07 — Feature List

A complete inventory of what the E-Sports Arena booking system does today.

---

## Accounts & authentication
- Customer registration and login.
- JWT **access + refresh tokens** stored in httpOnly cookies.
- Silent token-refresh on expiry (the user never sees a session hiccup).
- Roles: `customer` and `owner` (admin).

## Stations & availability
- Active station listing — console / racing / VR, with capacity and hourly price.
- Station list **cached in Redis** (1-hour TTL).
- Hourly availability (11:00–22:00) per station + date.
- Availability **cached in Redis with instant invalidation** when a booking changes.
- **Past slots on the current day are disabled** — only upcoming slots are selectable.
- Times displayed in **12-hour AM/PM** format everywhere.

## Booking & payments
- Multi-step booking flow: station → date/slot → squad size → review.
- **Server-side price calculation** (the client price is never trusted).
- **Race-safe booking** via a unique partial index — no double-booking, even under concurrent requests.
- 10-minute **pending holds**, with a cleanup job freeing lapsed holds every 60s.
- **Razorpay** order creation + signature-verified payment confirmation.
- Human-friendly booking references (e.g. `ESA-7F3K9`).
- My Bookings and Confirmation pages.

## Loyalty rewards (stamp card)
- Earn **1 stamp per attended session**, awarded when the **admin checks the customer in** — so a stamp always reflects a real, paid session (not just a booking).
- **10 stamps → one free solo session**, redeemed in-app at checkout (₹0, payment skipped).
- **Walk-in / add-session**: admin can award a stamp by phone number for in-person sessions or extensions.
- **Manual adjustment** for corrections (always logged).
- **Audit ledger**: every stamp change records who/when/why — no balance is ever an unexplained number.
- **Idempotent check-in**: re-clicking "Check in" never double-stamps; free-reward bookings earn no stamp.
- **Anti-abuse**: reward is solo-only (can't be gamed); redemption is validated server-side and consumed atomically.
- Customer UI: a loyalty card (stamp grid + "reward ready" banner), a dedicated **Rewards page** with activity history, and the card on the Confirmation and My Bookings pages.
- Admin UI: per-row **"Check in"** button and a **walk-in** form.

## Admin panel
- Paginated bookings list with status filter.
- Cancel / update booking status.
- **Day (weekday) column** on the bookings table.
- Loyalty check-in and walk-in controls (see above).

## Notifications
- **Asynchronous email confirmations** via a BullMQ queue + Resend.

## Security & infrastructure
- Redis-based **rate limiting** (login/register 5/min, booking 20/min).
- `helmet` security headers, CORS with credentials, cookie parsing.
- bcrypt password hashing.
- Vercel SPA routing config.

---

## API surface (quick reference)

| Method | Path | Who | Purpose |
|---|---|---|---|
| POST | `/api/auth/register` · `/login` · `/refresh` · `/logout` | public/auth | accounts |
| GET | `/api/stations` · `/api/stations/:id` | public | list stations |
| GET | `/api/availability?stationId&date` | public | slots for a station/date |
| POST | `/api/bookings` | auth | create booking (paid or `useReward`) |
| GET | `/api/bookings/mine` · `/:ref` | auth | my bookings / one booking |
| POST | `/api/payments/order` · `/verify` | auth | Razorpay order + verify |
| GET | `/api/loyalty/me` | auth | loyalty card + history |
| GET | `/api/admin/bookings` | owner | list all bookings |
| PATCH | `/api/admin/bookings/:id` | owner | update status |
| POST | `/api/admin/bookings/:id/checkin` | owner | check in → award stamp |
| POST | `/api/admin/loyalty/walkin` | owner | add a walk-in stamp |
| POST | `/api/admin/loyalty/adjust` | owner | manual stamp correction |
