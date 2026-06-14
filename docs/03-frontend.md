# Frontend — React (Vite)

Plain React + Vite. Fresh, original UI (not a copy of the reference site).

**Suggested libraries (lightweight):**
- Routing: `react-router-dom`
- Data fetching/caching: `@tanstack/react-query` (handles loading/error/retry cleanly)
- Forms + validation: `react-hook-form` + `zod`
- Charts (admin, post-MVP): `recharts`
- Styling: CSS Modules or Tailwind (decide at Phase 0) — esports/neon theme, but our own layout
- Payments: Razorpay Checkout script (`checkout.razorpay.com`)

---

## Routes / pages

### Customer
| Route | Page | Auth | Purpose |
|---|---|---|---|
| `/` | Landing | public | Hero, stations, games, pricing, "Book now" CTA |
| `/register` | Register | public | Create account (name, email, phone, password) |
| `/login` | Login | public | Customer login |
| `/book` | Booking flow | **protected** | Multi-step: station → date/slot → squad → review → pay |
| `/my-bookings` | My Bookings | **protected** | User's booking history → `GET /api/bookings/mine` |
| `/booking/:ref` | Confirmation | **protected** | Digital pass; status; details (own booking) |

> `/book`, `/my-bookings`, `/booking/:ref` are wrapped in `ProtectedRoute`. If a logged-out user clicks "Book now", redirect to `/login?redirect=/book` and return them to the flow after login.

### Admin (protected)
| Route | Page | Purpose |
|---|---|---|
| `/admin/login` | Login | Email + password |
| `/admin` | Dashboard | Stats + charts *(charts post-MVP)* |
| `/admin/bookings` | Bookings table | Filter, paginate, cancel/mark |

---

## Booking flow (multi-step component)

```
(must be logged in — ProtectedRoute; name/phone/email come from the account)
Step 1  Choose station      → GET /api/stations
Step 2  Choose date + slot  → GET /api/availability?date=&stationId=
                              (grid of slots 11:00–23:00; taken slots disabled)
Step 3  Squad size + package → live price shown (display only; server is source of truth)
Step 4  Extras               → gamertag, notes (name/phone/email prefilled from account)
Step 5  Review + Pay         → POST /api/bookings → open Razorpay Checkout
                              → onSuccess → POST /api/payments/verify
                              → redirect to /booking/:ref
```

State kept in a single `bookingState` (context or a small store), mirroring the original site's step model but backed by a real API.

### Razorpay Checkout (frontend snippet)
```js
const { orderId, amount, keyId, bookingRef } = await createBooking(payload);
const rzp = new window.Razorpay({
  key: keyId,                       // PUBLIC key only — secret never on client
  amount: amount * 100,
  order_id: orderId,
  name: "E-Sports Arena",
  handler: async (resp) => {
    await verifyPayment({           // POST /api/payments/verify
      razorpay_order_id: resp.razorpay_order_id,
      razorpay_payment_id: resp.razorpay_payment_id,
      razorpay_signature: resp.razorpay_signature,
    });
    navigate(`/booking/${bookingRef}`);
  },
  prefill: { name, contact: phone },
  theme: { color: "#39FF14" },
});
rzp.open();
```

---

## Components (reusable)
```
StationCard, GameTag, SlotPicker, PriceSummary, StepIndicator,
BookingPass, FormField, Button, Loader, ErrorState, EmptyState,
ProtectedRoute, BookingsTable, StatCard, Chart (post-MVP)
```

---

## UX must-haves (the stuff beginners skip → looks professional)
- Loading + error + empty states on every data view (react-query makes this easy)
- Disabled/greyed taken slots; clear "slot just got taken" handling on 409
- Mobile-first responsive (customers book on phones)
- Form validation messages inline
- Optimistic-but-safe: never show "confirmed" until the server verifies payment
- Accessible: labels, focus states, keyboard nav on the slot grid
