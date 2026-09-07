# Blorbmart Rider

The rider side of Blorbmart — an installable PWA for students who deliver
orders around campus. Android and iOS, no app store.

## Run

```bash
npm install
cp .env.example .env    # optional; defaults to the production API
npm run dev             # http://localhost:5173
npm run build
npm run lint
```

## Stack

Vite 8 · React 19 · TypeScript · Tailwind 4 · React Router 7 · TanStack Query ·
Framer Motion · Firebase Auth/Firestore · vite-plugin-pwa.

Backend: `Blorbmart-backend`, under `/api/rider/*`.

---

## What a rider actually does

```
  Order paid
      │
      ├──────────────► Restaurant tablet lights up
      └──────────────► Every online rider's phone buzzes
                       (the same server call — see below)
      │
  Rider accepts ──► goes to the restaurant
      │
      ├─ Restaurant accepted it ──► collect ──► deliver ──► PIN ──► paid
      │
      └─ Restaurant never looked ──► after the window lapses, the rider can
                                     pay for the food themselves, deliver it,
                                     and be reimbursed in full plus a bonus
```

### At the same instant

Riders and restaurants are told by the same function call.
`openDeliveryOffer()` runs inside `markPayment` / `payWithWallet`, right beside
the vendor's push. There is no queue and no cron sweep between them, so there
is no window where one side knows and the other does not — and that window is
exactly what a rider is being asked to cover.

In the app, jobs arrive over a Firestore snapshot listener rather than a poll,
so every open phone gets the same document within one round trip. Polling
would make the promise false a few seconds at a time and quietly favour
whoever's timer happened to fire first.

### When the rider pays for the food

If nobody behind the counter has touched a paid order after
`RIDER_SOURCING_WINDOW_SECONDS` (default two minutes), the rider standing
there can pay cash and deliver it.

**What they pay is the restaurant's net, not the menu price** — the exact
amount Blorbmart would otherwise have settled to the vendor's wallet. That one
choice is what leaves everybody whole:

| | |
|---|---|
| Restaurant | Gets what they would have got, immediately, in cash |
| Rider | Reimbursed to the naira, plus a bonus for carrying the float |
| Platform | Keeps the commission it already collected from the customer |

Paying the menu price instead would hand the platform's commission to the
restaurant on every rider-sourced order — a margin leak that grows with
exactly the feature you hoped would grow.

The money then routes on one field, `order.settlementTarget`, written the
moment the cash is genuinely across the counter. `creditSellersForDeliveredOrder`
reads it and skips the vendor, because paying both would buy one plate of food
twice and neither credit looks wrong on its own.

### The trust ladder

Fronting cash is the only rider action that can lose real money, so it is
earned rather than granted:

| Deliveries completed | May front up to |
|---|---|
| 0–2 | nothing |
| 3–9 | ₦3,000 |
| 10–29 | ₦7,000 |
| 30+ | ₦15,000 |

A new rider delivers orders the restaurant already accepted, where no cash
changes hands and there is nothing to steal. The app shows this as a progress
bar rather than a restriction — riders chase it instead of resenting it.
Support can override it in either direction with `sourcingLimitOverride`.

### Earnings vs. reimbursement

Kept apart everywhere, including three separate ledger rows:

```
Delivery fee        earnings
Cash-front bonus    earnings
Food money back     the rider's own cash returning — NOT earnings
```

A completed sourcing job can put ₦5,100 in a wallet for a job that paid ₦615.
Reporting that as earnings would tell a student they earn four times what they
do, and they would find out at withdrawal. `cashOutstanding` is the third
number: cash already handed over on a delivery still in flight.

---

## Screens

| Route | |
|---|---|
| `/join` | Recruitment landing page, with an earnings calculator |
| `/signup` `/onboarding` | Four steps, each committed server-side so it resumes |
| `/` | Online switch and the live job board |
| `/delivery/:id` | The active job — one screen, one next action |
| `/earnings` | Balance, bank account, cashout, ledger |
| `/history` `/account` | Past jobs, profile, trust ladder |

Riders are routed by state, not just by "signed in": a half-registered rider
lands back on the step they stopped at rather than on an empty dashboard with
a disabled button.

## PWA

`vite-plugin-pwa` generates the manifest and service worker; `index.html`
carries the iOS-specific tags Apple does not read from a manifest. Installed,
it runs standalone with safe-area padding for the notch and home indicator.

Firestore is loaded on demand, so a visitor who opens the recruitment page and
never signs up does not download ~250 KB of database SDK. Routes are
code-split for the same reason — that page is what gets shared on WhatsApp
over campus data.

**Push** needs `VITE_FIREBASE_VAPID_KEY`. Without it the app still shows jobs
the instant they arrive whenever it is open; what is lost is the alert to a
pocketed phone. The permission is requested when a rider goes online — never
at first launch, where it gets denied before anyone knows what the app does,
and on iOS a denial is effectively permanent. iOS delivers web push only to an
installed app, which is why the account screen nags about installing.

## Configuration

Backend variables are documented in `Blorbmart-backend/.env.example` under
`RIDER SIDE` — the dispatch window, the earnings split, the trust ladder and
the cashout minimum are all tunable without a deploy of this app.

## Firestore

Rules live in `blorb_vendor/firestore.rules`.

- `deliveryOffers` — the live board. Readable by any active rider **only while
  open**, and deliberately carries no customer address or phone, with
  coordinates rounded to ~100 m. Enough to judge a job, not enough to point at
  somebody's door before anyone has accepted it.
- `deliveries` — full detail including the address, readable only by the
  assigned rider. Client writes are denied: these carry `mode`, `settlement`
  and `cashPaidAmount`, so a rule that let a rider set a status would let them
  set what they are owed.
- `riderWallets`, `riderWalletTransactions`, `riderWithdrawals` — owner-read,
  backend-write.

Deploy with `firebase deploy --only firestore:rules`.

Composite indexes worth creating:

```
deliveryOffers: status ASC, createdAt DESC
deliveries:     riderId ASC, status ASC
deliveries:     riderId ASC, createdAt DESC
riderWalletTransactions: walletId ASC, createdAt DESC
riderWithdrawals: walletId ASC, initiatedAt DESC
```
