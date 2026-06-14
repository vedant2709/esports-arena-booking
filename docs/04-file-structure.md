# Repository File Structure

A monorepo with separate `server/` and `client/` so each deploys independently (API → Render/Railway, client → Vercel).

```
esports-arena-booking/
├── docs/                          # these planning docs
├── README.md
├── .gitignore
├── .env.example                   # documents required env vars (no secrets)
│
├── server/                        # Node + Express + MongoDB API
│   ├── package.json
│   ├── .env                       # (gitignored) real secrets
│   ├── src/
│   │   ├── index.js               # app entry, starts server
│   │   ├── app.js                 # express app, middleware chain
│   │   ├── config/
│   │   │   ├── db.js              # Mongo connection (pooled)
│   │   │   ├── redis.js          # Redis client
│   │   │   └── env.js            # validated env loading
│   │   ├── models/
│   │   │   ├── User.js            # customer accounts
│   │   │   ├── Station.js
│   │   │   ├── Booking.js
│   │   │   └── Admin.js           # owner account
│   │   ├── routes/
│   │   │   ├── auth.routes.js     # customer register/login/refresh/me
│   │   │   ├── stations.routes.js
│   │   │   ├── availability.routes.js
│   │   │   ├── bookings.routes.js
│   │   │   ├── payments.routes.js
│   │   │   └── admin.routes.js
│   │   ├── controllers/           # request handlers
│   │   ├── services/
│   │   │   ├── booking.service.js # create/hold/confirm, race handling
│   │   │   ├── pricing.service.js # SERVER-SIDE price computation
│   │   │   ├── availability.service.js
│   │   │   ├── payment.service.js # razorpay order + signature verify
│   │   │   └── cache.service.js   # redis get/set/invalidate
│   │   ├── middleware/
│   │   │   ├── auth.js            # JWT verify (admin)
│   │   │   ├── rateLimit.js       # Redis-backed limiter
│   │   │   ├── validate.js        # zod validation
│   │   │   ├── requestTimer.js    # response-time logging
│   │   │   └── errorHandler.js
│   │   ├── queues/                # BullMQ (post-MVP)
│   │   │   ├── notification.queue.js
│   │   │   └── notification.worker.js
│   │   ├── utils/                 # genRef, logger, etc.
│   │   └── seed/
│   │       ├── seedStations.js
│   │       └── seedAdmin.js       # secure one-time admin creation
│   └── tests/                     # api + booking-engine tests
│
├── client/                        # React + Vite SPA
│   ├── package.json
│   ├── index.html
│   ├── .env                       # (gitignored) VITE_API_URL, VITE_RAZORPAY_KEY_ID
│   ├── vite.config.js
│   └── src/
│       ├── main.jsx
│       ├── App.jsx                # routes
│       ├── api/                   # axios client + endpoint fns
│       ├── pages/
│       │   ├── Landing.jsx
│       │   ├── Register.jsx
│       │   ├── Login.jsx
│       │   ├── Booking.jsx        # protected
│       │   ├── MyBookings.jsx     # protected
│       │   ├── Confirmation.jsx   # protected
│       │   └── admin/
│       │       ├── Login.jsx
│       │       ├── Dashboard.jsx
│       │       └── Bookings.jsx
│       ├── components/            # StationCard, SlotPicker, etc.
│       ├── hooks/                 # useStations, useAvailability, useAuth
│       ├── context/               # bookingState, auth
│       ├── styles/
│       └── utils/
│
└── loadtest/                      # k6 scripts (post-MVP)
    └── booking-load.js
```

## Notes
- **`.env.example` is committed; `.env` is never committed.** See `06-security.md`.
- `services/` holds business logic so controllers stay thin and the booking engine is unit-testable.
- `queues/` and `loadtest/` are scaffolded but only wired up in the post-MVP phases.
