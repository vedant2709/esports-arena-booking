# Security — Auth & Payments (in detail)

> Two separate concerns. **Auth** protects the admin (customers book as guests). **Payment security** protects everyone and does **not** depend on auth — its vulnerabilities come from *trusting the client*.

---

## Part 1 — Payment security (Razorpay) — NON-NEGOTIABLE, in MVP

These ship in the MVP even with a test account, because they *are* the point.

| Rule | Why | Where |
|---|---|---|
| **Server computes the amount** | If frontend sends the price, a user pays ₹1 for a ₹599 slot. Backend computes price from station + package + squad, ignores any client amount. | `pricing.service.js` |
| **Verify Razorpay signature server-side** | On success, verify `HMAC_SHA256(order_id + "\|" + payment_id, key_secret)` equals `razorpay_signature`. Only then mark `confirmed`. Never trust the frontend's "paid". | `payment.service.js` |
| **Verify webhook signature** | Razorpay webhooks signed with a webhook secret — verify before acting. Confirms payment even if the customer closes the tab. | `payments.routes.js` (webhook) |
| **Key secret server-only** | Frontend gets the **public `key_id`** only. `key_secret` + webhook secret live in server env, never shipped. | env |
| **Idempotency** | A booking can't be confirmed twice if a webhook retries. Guard on payment status / unique paymentId. | `payment.service.js` |

### Verify snippet (server)
```js
import crypto from "crypto";
function verifySignature({ orderId, paymentId, signature }) {
  const expected = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");
  // timing-safe compare
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}
```

---

## Part 2 — Customer auth (MVP) & Admin auth

**Two account types, same hardened stack, different rules:**

| | Customer (`User`) | Admin (`Admin`) |
|---|---|---|
| Registration | **Public** `/api/auth/register` (with validation + rate limit) | **None** — seeded once via script |
| Login | `/api/auth/login` | `/api/admin/login` |
| Role | `"customer"` | `"owner"` |
| Can access | own bookings, booking flow | admin dashboard, all bookings |
| Password / tokens | bcrypt + JWT in httpOnly cookies | bcrypt + JWT in httpOnly cookies |

> **Booking requires an authenticated customer in the MVP** — `userId` is attached server-side from the JWT, never trusted from the request body. Post-MVP guest checkout relaxes this (see roadmap Phase F).
>
> Role-based access: middleware checks `role` so a customer token can't hit admin routes and vice-versa.

### Customer-registration specifics
- Email uniqueness enforced at the DB (unique index) and validated (zod)
- Password strength rules (min length, etc.) validated server-side
- Rate-limit registration to prevent mass/bot signups
- Same httpOnly-cookie token storage as admin (no tokens in localStorage)

### Admin auth service (details below apply to both unless noted)

| Layer | What | MVP / Later |
|---|---|---|
| **Password storage** | bcrypt (cost 12). Never plaintext, never reversible. | ✅ MVP |
| **No public registration** | Admin seeded once via `seedAdmin.js` (reads email + password from env, hashes, inserts). Removes the biggest attack surface. | ✅ MVP |
| **Access token** | Short-lived JWT (~15 min), signed with strong secret. | ✅ MVP |
| **Refresh token** | Longer-lived, **rotating**; stored httpOnly. Reuse detection. | MVP (basic) → rotation/reuse-detection later |
| **Token storage** | **httpOnly + Secure + SameSite=strict cookies** — *not* localStorage (immune to XSS token theft). | ✅ MVP |
| **Brute-force** | Rate-limit `/admin/login` (e.g. 5 / 15 min). Lockout + audit later. | MVP (basic) → Redis-backed + lockout later |
| **Transport** | HTTPS everywhere (host-provided), HSTS. | ✅ MVP |
| **Headers** | `helmet()` — CSP, X-Frame-Options, etc. | ✅ MVP |
| **CORS** | Strict origin allowlist (only our frontend domain), credentials enabled for cookies. | ✅ MVP |
| **Input safety** | zod validation on every body/query; Mongo operator sanitization → no **NoSQL injection**. | ✅ MVP |
| **Error hygiene** | Generic error messages to client; no stack traces; structured logs server-side. | ✅ MVP |
| **CSRF** | With cookie auth, add CSRF token (or SameSite=strict + custom header check). | Later (note SameSite=strict in MVP) |
| **2FA (admin)** | Optional TOTP for the owner. | Later |

### Seed-admin approach (MVP)
```
# .env (server, gitignored)
ADMIN_EMAIL=owner@esportsarena.in
ADMIN_PASSWORD=<set once, strong>      # used only by the seed script, then can be removed
JWT_ACCESS_SECRET=<random 32+ bytes>
JWT_REFRESH_SECRET=<random 32+ bytes>
```
`node src/seed/seedAdmin.js` → bcrypt-hashes the password, inserts the single owner account. No register endpoint exists.

---

## Part 3 — Secrets & config hygiene

- **`.env` is gitignored; `.env.example` is committed** (documents the var names, no values).
- All secrets via env: `MONGODB_URI`, `REDIS_URL`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, `JWT_*`, `ADMIN_*`, `CLIENT_ORIGIN`.
- Frontend env (`VITE_*`) holds **only** public values (`VITE_API_URL`, `VITE_RAZORPAY_KEY_ID`).
- Rotate any key that ever touches a commit or a screenshot.

---

## Part 4 — `.env.example` (to commit)

```
# ---- server/.env.example ----
NODE_ENV=development
PORT=5000
CLIENT_ORIGIN=http://localhost:5173

MONGODB_URI=
REDIS_URL=

RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=

JWT_ACCESS_SECRET=
JWT_REFRESH_SECRET=

ADMIN_EMAIL=
ADMIN_PASSWORD=

# ---- client/.env.example ----
VITE_API_URL=http://localhost:5000
VITE_RAZORPAY_KEY_ID=
```

---

## Security "definition of done" for MVP
- [ ] No secret in any committed file or screenshot
- [ ] Price computed + verified server-side; signature verified server-side
- [ ] Admin password bcrypt-hashed; JWT in httpOnly cookies
- [ ] helmet + strict CORS + zod validation active
- [ ] Login rate-limited
- [ ] Generic error responses (no stack traces leaked)
