# System Architecture & Flows

## High-level architecture

```
                          ┌────────────────────────┐
                          │   React (Vite) SPA      │
                          │   - customer booking    │
                          │   - admin dashboard      │
                          └───────────┬────────────┘
                                      │ HTTPS (JSON)
                          ┌───────────▼────────────┐
                          │   Express API (stateless)│  ← can run N instances
                          │   - REST endpoints       │
                          │   - auth middleware      │
                          │   - rate limiting        │
                          └───┬─────────┬───────┬───┘
                              │         │       │
              ┌───────────────▼──┐  ┌───▼────┐  ┌▼──────────────┐
              │ MongoDB (Atlas)  │  │ Redis  │  │ BullMQ worker │
              │ - bookings       │  │ cache  │  │ (async jobs)  │
              │ - stations       │  │ rate-  │  │ - WhatsApp    │
              │ - admins         │  │ limit  │  │ - email       │
              │ unique indexes   │  │ locks  │  └──────┬────────┘
              └──────────────────┘  └────────┘         │
                                                ┌──────▼────────┐
                                                │ WhatsApp/Email│
                                                │ provider      │
                                                └───────────────┘
                              ┌──────────────┐
                              │  Razorpay    │  ← payment + webhook
                              └──────────────┘
```

**Why stateless API?** No session stored in server memory → we can horizontally scale to many instances behind a load balancer. Shared state (rate-limit counters, cache, locks, job queue) lives in Redis, not in any single process. This is what makes the ~10k-user target real.

---

## Flow 1 — Customer makes a booking (the critical path)

```
1. Customer opens site → GET /api/stations           (cached in Redis)
2. Picks a station + date → GET /api/availability      (cached, only free slots returned)
3. Picks slot + squad size → frontend shows price (display only)
4. Submits → POST /api/bookings
      backend:
        a. validates input (zod)
        b. recomputes price SERVER-SIDE from station+package  ← never trust client
        c. attempts to reserve the slot:
             - insert booking as status="pending"
             - unique index {station,date,slot} → duplicate = slot taken
             - set holdExpiresAt = now + 10 min
        d. creates a Razorpay ORDER for the server-computed amount
        e. returns { bookingId, razorpayOrderId, amount, key_id }
5. Frontend opens Razorpay Checkout (test mode)
6. Customer pays → Razorpay returns payment_id + signature
7. Frontend → POST /api/payments/verify
      backend:
        a. verifies HMAC-SHA256(order_id|payment_id, key_secret)   ← never trust client
        b. valid → booking.status = "confirmed", clear hold
        c. enqueue WhatsApp + email jobs (BullMQ) → returns instantly
8. Razorpay also calls POST /api/payments/webhook (signature-checked)
      → idempotent confirm (covers customer closing the tab)
9. Confirmed → invalidate availability cache for that station/date
10. Customer sees confirmation / digital pass page
```

### Why the "pending + hold" step matters
A slot is reserved the instant the customer starts paying, so two people can't pay for the same slot. If payment is abandoned, `holdExpiresAt` lapses and a cleanup job frees the slot. This is the edge case that separates a real system from a tutorial.

---

## Flow 2 — Race-safe booking under concurrent load

```
Two customers submit the SAME station+date+slot at the same millisecond:

  Request A ──┐
              ├──► MongoDB unique index { stationId, date, slotStart }
  Request B ──┘

  → exactly ONE insert succeeds, the other gets a duplicate-key error (E11000)
  → backend catches E11000 → responds "slot just got taken, pick another"

  (Optional hardening: a short Redis lock per slot to reject the loser
   before it even hits Mongo, reducing wasted work under heavy load.)
```

The database unique index is the source of truth — it cannot be bypassed even under maximum concurrency. This is the heart of the "scalable to 10k users with zero double-bookings" claim.

---

## Flow 3 — Admin dashboard

```
1. Owner → POST /api/admin/login (email + password)
      → bcrypt compare → issue access JWT (15m) + refresh token (httpOnly cookie)
2. Dashboard loads → GET /api/admin/stats        (cached aggregations) [charts: post-MVP]
                   → GET /api/admin/bookings?page=1 (paginated)
3. Owner cancels/marks a booking → PATCH /api/admin/bookings/:id
      → invalidate availability cache for that slot
4. Token expires → POST /api/admin/refresh (rotating refresh token)
```

---

## Caching strategy (Redis)

| Data | Cache? | TTL | Invalidate when |
|---|---|---|---|
| Stations / games / pricing | Yes | long (1h) | admin edits config |
| Availability for date+station | Yes | short (30–60s) | new/cancelled booking on that slot |
| Dashboard stats | Yes | short (60s) | new booking / periodic |
| Booking detail | No | — | always fresh |

Read-heavy, rarely-changing data is cached; anything tied to money/correctness is read live or carefully invalidated.
