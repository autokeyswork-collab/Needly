# Route — Arepo & Axis Delivery App (Expo prototype)

A React Native (Expo) scaffold for a multi-vendor delivery app covering
Food, Local Market, Supermarket, and Confectionery in Arepo & Axis, with
five interfaces sharing one live order flow:

- **Customer** — browse by category, order from a vendor, track delivery
- **Vendor** — accept orders, mark ready
- **Manager** — handles Local Market orders specifically, since that
  category has no vendor to prep the order (see below)
- **Rider** — accept deliveries, confirm pickup/drop-off, see earnings
- **Admin** — live stats, vendor breakdown, full order feed

### Why there's a Manager role

Local Market is set up as a direct product list rather than a set of
vendor storefronts — the customer adds items straight from the market's
catalog. That means there's no vendor account to accept and prep the
order. The **Manager** role fills that gap: new Local Market orders
land in a "New orders" queue with a notification badge on the Manager
tab, the manager sorts/packs the order ("Start sorting" → "Ready for
rider"), and from there it flows into the Rider queue exactly like any
other order.

This mirrors the web prototype you saw first — same data model, same
order-status flow (`placed → accepted → ready → picked_up → delivered`) —
just rebuilt in real React Native components so it runs on iOS/Android.

## Running it

```bash
npm install
npx expo start
```

Then scan the QR code with the **Expo Go** app on your phone, or press
`i` / `a` in the terminal for an iOS/Android simulator.

## Project structure

```
App.js                        entry point, providers + navigation
src/
  theme/colors.js             shared color tokens
  data/mockData.js            categories, vendors, menu items (mock)
  context/OrdersContext.js    in-memory global order state (all 4 roles read/write this)
  components/Pill.js          shared status badge
  navigation/
    RootNavigator.js          bottom tab navigator (Customer/Vendor/Rider/Admin)
    RouteTabBar.js             themed "route line" tab bar
    CustomerStack.js          stack nav for the customer's 4 screens
  screens/
    customer/BrowseScreen.js
    customer/VendorMenuScreen.js
    customer/CartScreen.js
    customer/TrackingScreen.js
    VendorScreen.js
    ManagerScreen.js
    RiderScreen.js
    AdminScreen.js
```

## What's mocked vs. what's real

Everything here runs entirely on-device with in-memory state — closing
the app resets all orders. That's intentional for a fast prototype: it
lets you demo the full four-role flow with zero backend setup.

## Turning this into a production app

In rough priority order:

1. **Auth** — separate sign-in for customers, vendors, and riders (e.g.
   Firebase Auth, Supabase Auth, or your own JWT-based API). Admin
   access should be restricted separately (invite-only, not open signup).
2. **Backend & database** — replace `OrdersContext.js`'s in-memory
   `useState` with real API calls (REST or GraphQL) backed by Postgres/
   Firestore. Keep the same function signatures (`placeOrder`,
   `advanceOrder`, `assignRider`) so the screens barely change.
3. **Real-time updates** — orders need to update live across devices
   (a vendor accepting should instantly show on the customer's tracking
   screen). Use WebSockets, Firestore listeners, or Supabase Realtime.
4. **Payments** — integrate Paystack or Flutterwave (both are the
   standard choice for Nigeria) for card/bank transfer/USSD checkout.
5. **Maps & rider matching** — swap the mock "accept delivery" button
   for real geolocation (react-native-maps + Google/Mapbox directions),
   and add proximity-based rider assignment instead of a manual queue.
6. **Push notifications** — order status changes should notify
   customers, vendors, and riders even when the app is backgrounded
   (Expo Notifications + your backend).
7. **Vendor onboarding & catalog management** — a way for vendors to
   add/edit their own menu and toggle item availability, rather than
   the hardcoded `mockData.js`.
8. **Admin controls** — vendor approval, rider approval, dispute
   handling, and payout management.

## Design tokens

| Name    | Hex       | Use                              |
|---------|-----------|-----------------------------------|
| ink     | `#14171F` | primary text, dark backgrounds    |
| paper   | `#F5F4F0` | screen background                 |
| indigo  | `#232B4D` | header / brand surfaces           |
| mango   | `#FF9E1B` | primary accent, CTAs              |
| green   | `#2F7A4F` | success / "ready" states          |
| chili   | `#E14B3C` | alerts                            |
| line    | `#DEDACE` | borders, dividers                 |
| mute    | `#6B6F76` | secondary text                    |
