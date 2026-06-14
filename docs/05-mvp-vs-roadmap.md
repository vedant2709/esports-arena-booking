# MVP Scope vs. Roadmap

## Weekend MVP (~24–26 focused hours)

Goal: a **deployed booking system that actually takes payments**, telling the core story end-to-end.

### ✅ In the MVP
- Real **Node/Express + MongoDB** backend (bookings persist server-side)
- **Customer accounts** — `User` collection + register/login (JWT, httpOnly cookies)
- **Login required to book** — every booking tied to a `userId`
- **"My Bookings"** page — user's booking history
- **Race-safe booking engine** — partial unique index on `{station, date, slot}` → no double-booking
- Slot **availability** (only free slots returned)
- React (Vite) **booking flow**: login → station → date/slot → squad → review
- **Razorpay test payment**, end-to-end: create order → checkout → **server-side signature verify** → booking confirmed
- **Pending + 10-min hold** so abandoned checkouts free the slot
- **Slim admin**: JWT login + bookings list + cancel/mark *(charts deferred)*
- Security essentials: bcrypt, JWT in httpOnly cookies, basic login rate-limit, helmet, CORS allowlist, zod validation, env secrets, **all payment non-negotiables** (see `06-security.md`)
- **Deployed & live** (Vercel + Render/Railway + Atlas) with seeded data
- README + screenshots + case-study draft

### Weekend hour plan
**Day 1 (~13h)** — scaffold/models (User, Station, Booking, Admin) → **customer auth** (register/login, JWT cookies) → booking API + race-safe index + availability → seed/test → React auth pages + protected booking flow.
**Day 2 (~13h)** — Razorpay (order + checkout + verify) → "My Bookings" → slim admin (login + bookings list/cancel) → responsive + error/loading states → deploy + env keys → live end-to-end test incl. test payment → README + case study.

> Buffer rule: if anything overruns, slip order is: admin polish → "My Bookings" extras → case-study draft. **Customer auth + core booking + payment always land.**
> Customer auth adds ~4–5h, so the weekend is now ~25–26h (tight but doable at your 24–25h).

---

## After MVP (the "scalable to ~10k users" layer)

Added over the following weeks (part-time). This is the system-design story.

### Phase A — Caching & rate limiting (Redis)
- Redis cache for stations, availability, dashboard stats (with invalidation)
- Redis-backed **distributed rate limiting** (per-IP + per-route)
- Optional short Redis **lock** per slot to shed load before hitting Mongo

### Phase B — Async notifications (BullMQ)
- Job queue for **automated WhatsApp + email** to customer *and* owner
- Retries + dead-letter handling
- Razorpay **webhook** confirmation path (covers closed tabs)

### Phase C — Admin analytics
- Dashboard **charts**: revenue over time, bookings by station/game, peak hours, occupancy %
- Cached aggregation queries
- Slot blackout/maintenance management

### Phase D — Scale hardening & proof
- DB indexes reviewed; connection pooling tuned; pagination everywhere
- Response-time logging → p95 metrics
- **Load test (k6)**: simulate concurrent users hammering the same slots
  → record req/s, p95 latency, and **zero double-bookings** for the case study
- Graceful shutdown, health checks

### Phase E — Security hardening
- Refresh-token rotation + reuse detection
- Account lockout tracking, audit logging
- Optional admin 2FA, CSRF tokens

### Phase F — Guest checkout
- Make `Booking.userId` **optional** (non-breaking change — existing data unaffected)
- Guest flow: book with name + phone + email, no account required
- Collect contact at checkout; confirmation still goes to that email/phone
- Optional "create an account to track this booking?" nudge after a guest booking
- Both paths (logged-in + guest) supported side by side

---

## "Definition of done" per milestone

| Milestone | Done when… |
|---|---|
| MVP | A stranger can book + pay (test) on the live URL; owner sees it in admin; no double-booking possible |
| Scalable v1 | Load test shows target throughput with 0 double-bookings; notifications auto-send; charts live |
| Portfolio-ready | Case study written with architecture diagram + load-test numbers + screenshots/demo video |

---

## When to start pitching gigs
**Don't wait for the full build.** The moment the **MVP is live** (end of weekend), start applying to booking-system gigs in parallel — the deployed link + "takes real payments, prevents double-booking" is already pitchable. The scalability layer then keeps strengthening the same portfolio piece.
