# E-Sports Arena — Booking System

A production-grade, scalable booking platform for a Vadodara gaming lounge (PS5 / racing rig / VR).
Built to replace a frontend-only prototype with a real end-to-end system: persistent bookings,
race-safe slot allocation, server-verified Razorpay payments, an admin dashboard, and a
Redis/queue-backed architecture designed for ~10k users.

> **Tech:** React (Vite) · Node/Express · MongoDB · Redis · BullMQ · Razorpay

## The problem
The original site saved bookings to the customer's own browser and relied on the customer
manually forwarding a WhatsApp message — so the owner missed bookings and had no central record.
This rebuild fixes every gap. See [`docs/00-overview.md`](docs/00-overview.md).

## Documentation
| Doc | Contents |
|---|---|
| [00-overview](docs/00-overview.md) | Problem, solution, locked decisions, business data |
| [01-architecture](docs/01-architecture.md) | Architecture diagram + request flows + caching |
| [02-backend](docs/02-backend.md) | Models, indexes, endpoints, booking engine |
| [03-frontend](docs/03-frontend.md) | React pages, components, booking flow, Razorpay |
| [04-file-structure](docs/04-file-structure.md) | Repository layout |
| [05-mvp-vs-roadmap](docs/05-mvp-vs-roadmap.md) | Weekend MVP scope + post-MVP roadmap |
| [06-security](docs/06-security.md) | Auth + payment security in detail |

## Highlights (what this demonstrates)
- **Race-safe booking** — partial unique DB index → zero double-bookings under concurrent load
- **Payment security** — amount computed + signature verified entirely server-side
- **Scalability patterns** — Redis caching, distributed rate limiting, async job queue, load-tested
- **Secure admin auth** — bcrypt, JWT in httpOnly cookies, seeded single-owner account

## Status
🚧 Planning complete — scaffolding next. MVP target: one focused weekend (~24–26h).

## Local development
_Setup instructions added during Phase 0 scaffold. Requires Node 18+, a MongoDB Atlas URI,
a Redis URL (post-MVP), and Razorpay test keys._
