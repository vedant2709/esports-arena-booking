# E-Sports Arena — Booking System (Project Overview)

> A production-grade, scalable booking platform for **E-Sports Arena, Sayajiganj (Alankar Tower, 1st Floor), Vadodara** — a gaming lounge with PS5, racing rig, and VR stations.

This document is the entry point. Read the others in order:

1. `00-overview.md` ← you are here
2. `01-architecture.md` — system architecture + request flows
3. `02-backend.md` — models, endpoints, the race-safe booking engine
4. `03-frontend.md` — React pages, components, booking flow
5. `04-file-structure.md` — repository layout
6. `05-mvp-vs-roadmap.md` — what ships this weekend vs. after
7. `06-security.md` — auth + payment security in detail

---

## The problem we're solving

The existing site (`esportsarena-vadodra.netlify.app`) is a **frontend-only prototype**. Verified by reading its source:

- Bookings are saved to the **customer's own browser** (`localStorage`), never to a server.
- The owner is notified **only if** the customer manually taps a pre-filled WhatsApp link and presses send.
- The "Admin Dashboard" reads the same `localStorage`, so it only shows bookings made on the owner's own device — effectively empty.
- **No database, no double-booking prevention, no real payment, no automated notification.**

In short: the owner loses bookings and has no central record.

## What we're building

A real end-to-end system that fixes every one of those gaps:

| Original (broken) | This build |
|---|---|
| Saves to customer's browser only | Central MongoDB — every booking stored server-side |
| Owner notified only if customer taps WhatsApp | Automated WhatsApp/email to owner *and* customer (queued) |
| Admin sees only local data | Real admin dashboard (JWT) showing all bookings + charts |
| No slot conflict check | Race-safe availability engine — no double-booking |
| ₹ shown, no charge | Razorpay payments, server-verified |
| No scale considerations | Redis caching, rate limiting, queue, load-tested to ~10k users |

## Goals

- **Portfolio centerpiece** demonstrating: real backend, payment security, **system design at scale**, and a clean React UI.
- A resellable booking-system pattern (clinics, salons, tutors, turf venues all need the same thing).

## Locked decisions

- **Frontend:** React (Vite), plain React — *fresh, original UI* (not a copy of the reference site)
- **Backend:** Node.js + Express + MongoDB (Atlas)
- **Cache / rate-limit / queue:** Redis + BullMQ
- **Payments:** Razorpay (test mode in MVP)
- **Auth model:** **Customer accounts required to book** (register/login) in the MVP — every booking tied to a `userId`. Separate JWT-protected **admin/owner** login (single seeded account). **Guest checkout** is added post-MVP (makes `userId` optional — a non-breaking change).
- **Scale target:** ~10,000 users, proven via load test
- **Data reused from reference site:** business info only (name, location, stations, games, pricing, hours, contact) — no design copied

## Business data (carried over)

| Field | Value |
|---|---|
| Business | E-Sports Arena, Sayajiganj (Alankar Tower, 1st Floor), Vadodara |
| Stations | PS5 (solo/multiplayer), Racing rig (G29 wheel), Quest 3 VR |
| Games | God of War, Elden Ring, FC26 (FIFA), Tekken 8, + custom requests |
| Pricing | Solo ₹399, Squad ₹249/person, 2-Player ₹599, Hourly ₹100–300 |
| Hours | 11:00 AM – 11:00 PM |
| Contact | +91 93274 18556 |
