# TraderDash

A Trader Management System with two completely separate login systems and
dashboards: an **Admin** panel for managing traders, goals, and settings, and
a **Trader** panel where traders sign up themselves and submit their own
trading results.

```
tradindash/
├── client/   React + Vite + Tailwind frontend
└── server/   Node + Express + MongoDB (Mongoose) backend, see server/README.md
```

## How the two roles work

| | Admin | Trader |
|---|---|---|
| Account creation | Created via `/admin-login` flow or seeded directly | Self-registers at `/trader-signup` — instantly active |
| Login | `/admin-login` | `/trader-login` |
| Token storage | `localStorage.adminToken` / `adminInfo` | `localStorage.traderToken` / `traderInfo` |
| JWT role claim | `"admin"` | `"trader"` |
| Dashboard routes | `/admin/*` (Overview, Traders, Goals, Settings) | `/trader/dashboard` |
| What they do | View and manage all traders, set desk goals, configure appearance | Submit a P&L entry (amount + date/time + optional note) and see their own submission history |

Admin and trader tokens are **not interchangeable** — the backend embeds a
`role` claim in the JWT and rejects a token used on the wrong kind of route
(e.g. a trader's token can't call any `/traders` or `/admin/*` admin
endpoint, and vice versa). See `server/middlewares/authMiddleware.js`
(`protect` vs `protectTrader`).

## Where trader data ends up on the Admin side

Every number the Admin panel shows about a trader (total profit, P&L charts
broken down daily/weekly/monthly) is **computed live** from the raw entries
that trader submitted on their own dashboard — nothing is duplicated or
synced manually. See `server/controllers/traderController.js`
(`getTotalProfit`, `bucketEntries`) for the aggregation logic.

Fields like capital, win rate, drawdown, and risk level remain
admin-managed/manual (set via the Traders page in the admin panel), since
those aren't things a trader can self-report meaningfully.

## Running locally

```bash
# Backend
cd server
npm install
cp .env.example .env   # set MONGO_URI and JWT_SECRET
npm run dev             # http://localhost:7007

# Frontend (separate terminal)
cd client
npm install
npm run dev              # http://localhost:5173 (or similar)
```

Then visit:
- `/admin-login` to sign in as an admin
- `/trader-signup` to create a trader account, or `/trader-login` if you already have one
