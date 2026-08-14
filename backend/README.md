# Route — Backend (Phase 1: Foundation)

A real Node.js + Express + PostgreSQL backend implementing everything in
the Phase 1 roadmap: auth, orders, payments (Paystack), push notifications
(Expo), real-time updates (Socket.io), rider dispatch, and
cancellation/refunds. This is the backend the Expo app is meant to talk to
once you're ready to move off local in-memory state.

## What's implemented

| Feature | Where |
|---|---|
| Auth (register/login, JWT) | `src/routes/auth.routes.js` |
| Role-based access control | `src/middleware/auth.js` |
| Vendor browsing + product/add-on management | `src/routes/vendors.routes.js` |
| Order creation (server-side price calc) | `src/routes/orders.routes.js` |
| Order status lifecycle + role-gated transitions | `src/routes/orders.routes.js` |
| Rider dispatch (broadcast + first-to-claim) | `src/routes/orders.routes.js`, `src/sockets/orderSocket.js` |
| Cancellation + Paystack refund | `src/routes/orders.routes.js` |
| Paystack checkout + webhook | `src/routes/payments.routes.js` |
| Push notifications (Expo) | `src/lib/pushNotifications.js` |
| Real-time order updates (Socket.io) | `src/sockets/orderSocket.js` |
| Disputes (two-state: Open/Resolved) | `src/routes/disputes.routes.js` |
| Rider online/offline + real stats | `src/routes/riders.routes.js` |
| Delivery address/phone (required at checkout, hidden from rider until pickup) | `src/routes/orders.routes.js`, `prisma/schema.prisma` |
| Per-product availability toggle | `src/routes/vendors.routes.js` |
| Vendor/rider approval gating | `src/routes/auth.routes.js` |
| Rate limiting on auth endpoints | `src/routes/auth.routes.js` |
| CORS restricted to `ALLOWED_ORIGINS` | `src/index.js`, `src/sockets/orderSocket.js` |
| Local Market as a manager-run, vendor-less category | `prisma/schema.prisma` (`Vendor.managerId`), `prisma/seed.js` |

## 1. Prerequisites

- Node.js 18+
- PostgreSQL running locally (or a hosted instance — Railway, Supabase, Neon, etc. all work)
- A free [Paystack](https://paystack.com) account for test API keys

## 2. Setup

```bash
cd backend
npm install

cp .env.example .env
# edit .env: set DATABASE_URL, JWT_SECRET, PAYSTACK_SECRET_KEY, PAYSTACK_PUBLIC_KEY

npx prisma migrate dev --name init   # creates all tables
npx prisma db seed                   # loads demo vendors/products + one account per role

npm run dev                          # starts the server on http://localhost:4000
```

Demo accounts (all use password `password123`):
- `customer@demo.route` — a customer
- `mamarisi@demo.route`, `axisgrill@demo.route`, `freshmarket@demo.route`, `quickbasket@demo.route`, `pharmacy@demo.route` — one owner account per seeded vendor
- `rider@demo.route` — a rider, already online
- `manager@demo.route`, `admin@demo.route`

## 3. Testing it works

```bash
curl http://localhost:4000/health
# { "ok": true }

curl -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"customer@demo.route","password":"password123"}'
# returns { token, user }
```

Use the returned `token` as `Authorization: Bearer <token>` on every other
request.

## 4. Paystack webhook (for local testing)

Paystack needs to reach your webhook over the public internet, so for
local dev use a tunnel:

```bash
npx ngrok http 4000
```

Then in the Paystack dashboard → Settings → API Keys & Webhooks, set the
webhook URL to `https://<your-ngrok-subdomain>.ngrok.io/payments/webhook`.

## 5. Connecting the Expo app

The mobile app currently keeps everything in `OrdersContext.js` as local
React state. To switch it to this real backend:

1. Replace the `fetch`-less functions in `OrdersContext.js`
   (`placeOrder`, `advanceOrder`, `assignRider`, etc.) with calls to this
   API (e.g. `POST /orders`, `PATCH /orders/:id/status`, `POST /orders/:id/claim`).
2. Add a Socket.io client (`socket.io-client`) that connects with the JWT
   and listens for `order:updated` to replace the "everything is one
   React state tree" model with real push-driven updates.
3. Store the JWT from `/auth/login` in secure storage
   (`expo-secure-store`) instead of the app just assuming who's logged in.
4. Register the device's Expo push token on login via
   `PATCH /auth/me/push-token`.

This is a real chunk of work on its own — happy to do it as a follow-up
once this backend is running and you've confirmed the endpoints do what
you need.

## 6. What's intentionally NOT in Phase 1

Per the roadmap: live GPS tracking (only status pings for now), ratings
UI, analytics dashboards, promos/loyalty, multi-zone expansion, and
splitting this into separate microservices. All of those are Phase 2/3 —
adding them now would be premature for a backend that hasn't seen real
traffic yet.

## 7. Before this touches real money

- Change `DEMO_PASSWORD` / reseed with real accounts before any non-local deploy
- Switch Paystack test keys (`sk_test_...`) for live keys (`sk_live_...`) only after end-to-end testing
- Set `ALLOWED_ORIGINS` in `.env` to your actual deployed domain(s) — defaults to allowing nothing rather than `*`
- ~~Add rate limiting on `/auth/login`~~ — done, `authLimiter` in `auth.routes.js` (10 attempts / 15 min / IP)
- ~~Restrict Socket.io CORS~~ — done, reads the same `ALLOWED_ORIGINS` as the REST API
- ~~Add vendor/rider approval gating~~ — done: self-registered VENDOR/RIDER accounts land `approved: false` and can't log in until an admin hits `PATCH /auth/users/:id/approve` (see `GET /auth/pending` to list them)

## 8. Still deferred (see the project's Scope of Work for the full list)

Ratings/reviews, favorites, reorder, the three-state dispute workflow (this backend ships a simpler two-state Open/Resolved flow), customer tiers, revenue-by-period analytics, and live GPS tracking are intentionally not in this backend yet. They exist in the newer web prototype (App.jsx) but were deliberately held back from this deployment/integration phase — see the Scope of Work document's "Explicitly Deferred" section for why.
