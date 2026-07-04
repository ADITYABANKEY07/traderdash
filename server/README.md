# Trader Management System — Backend (MVC)

Node.js + Express + MongoDB (Mongoose) backend, structured as MVC, for the
Trader Management System admin dashboard (Admin auth, Traders, Goals, Settings).

## Folder Structure

```
backend/
├── config/
│   └── db.js                 # MongoDB connection
├── controllers/               # Business logic (the "C" in MVC)
│   ├── adminController.js
│   ├── traderController.js
│   ├── goalController.js
│   └── settingsController.js
├── models/                    # Mongoose schemas (the "M" in MVC)
│   ├── Admin.js
│   ├── Trader.js              # exports Trader + PnLEntry
│   ├── Goal.js                # exports Goal + GoalProgress
│   └── Settings.js
├── routes/                    # Express routers, map URLs -> controllers
│   ├── adminRoutes.js
│   ├── traderRoutes.js
│   ├── goalRoutes.js
│   └── settingsRoutes.js
├── middlewares/
│   ├── authMiddleware.js      # JWT "protect" + requireSuperAdmin
│   └── errorMiddleware.js     # notFound + central errorHandler
├── utils/
│   ├── generateToken.js       # JWT signing
│   └── asyncHandler.js        # wraps async controllers
├── app.js                     # Express app + route mounting
├── server.js                  # Entry point — loads env, connects DB, starts server
├── .env.example
└── package.json
```

(There is no separate `views/` folder since this is a pure JSON API consumed by
the React frontend — the React app itself is effectively the "View" layer.)

## Setup

```bash
cd backend
npm install
cp .env.example .env   # then edit MONGO_URI / JWT_SECRET as needed
npm run dev            # nodemon, or: npm start
```

The server runs on `http://localhost:7007` by default, matching the existing
`AdminLogin.jsx` call to `http://localhost:7007/admin/login`.

## Authentication

JWT-based. `POST /admin/login` and `POST /admin/register` return a `token`.
Send it on all protected routes as:

```
Authorization: Bearer <token>
```

## API Reference

### Admin

| Method | Route             | Access  | Description                          |
|--------|--------------------|---------|---------------------------------------|
| POST   | /admin/register    | Public  | Create a new admin account            |
| POST   | /admin/login        | Public  | Login, returns JWT token              |
| GET    | /admin/profile      | Private | Get logged-in admin's profile         |
| PUT    | /admin/profile      | Private | Update name/email/phone/timezone      |
| PUT    | /admin/password     | Private | Change password                       |

### Traders (Admin-facing management)

| Method | Route                  | Access  | Description                              |
|--------|-------------------------|---------|--------------------------------------------|
| GET    | /traders                | Private (Admin) | List traders (`?status=`, `?search=`), each with computed `profit` |
| POST   | /traders                | Private (Admin) | Create a trader record directly (admin-managed, includes password) |
| GET    | /traders/:id            | Private (Admin) | Get one trader, with computed `profit`     |
| PUT    | /traders/:id            | Private (Admin) | Update a trader (capital, winRate, drawdown, risk, status) |
| DELETE | /traders/:id            | Private (Admin) | Delete a trader and their P&L entries      |
| GET    | /traders/:id/pnl        | Private (Admin) | Bucketed P&L history (`?period=daily\|weekly\|monthly`), aggregated from the trader's own submissions |

### Trader (self-service — separate signup/login from Admin)

| Method | Route                  | Access  | Description                              |
|--------|-------------------------|---------|--------------------------------------------|
| POST   | /trader/register        | Public  | Trader self-registration (instantly active) |
| POST   | /trader/login           | Public  | Trader login, returns a `trader`-role JWT  |
| GET    | /trader/me              | Private (Trader) | Own profile + computed total profit  |
| GET    | /trader/pnl             | Private (Trader) | Own bucketed P&L (`?period=`)        |
| GET    | /trader/pnl/history     | Private (Trader) | Own raw submission history (most recent 50) |
| POST   | /trader/pnl             | Private (Trader) | Submit a new P&L entry: `{ pnl, date, note? }` — the only data-entry action on the trader dashboard |

Trader and Admin tokens are not interchangeable: each JWT carries a `role`
claim (`"admin"` or `"trader"`), and `protect` / `protectTrader` each reject
tokens issued for the other role.

### Goals

| Method | Route                   | Access  | Description                                   |
|--------|--------------------------|---------|-------------------------------------------------|
| GET    | /goals/active            | Private | Active goal + computed countdown/pace metrics  |
| GET    | /goals                   | Private | List all goals (history)                       |
| POST   | /goals                   | Private | Create/set a new goal (deactivates the old one) |
| PUT    | /goals/:id               | Private | Update a goal (target, deadline, achieved, ...) |
| DELETE | /goals/:id               | Private | Delete a goal                                   |
| GET    | /goals/:id/progress      | Private | Monthly actual-vs-target data for the chart     |
| POST   | /goals/:id/progress      | Private | Add/update a month's progress entry             |

### Settings

| Method | Route     | Access  | Description                                      |
|--------|-----------|---------|----------------------------------------------------|
| GET    | /settings | Private | Get appearance settings (theme, density, accent)  |
| PUT    | /settings | Private | Update appearance settings                        |

## Notes

- Passwords are hashed with bcrypt before saving (see `Admin.js` pre-save hook).
- `goalController.js` computes the countdown, on-track/behind-schedule pace
  status, and projected finish date server-side — mirroring the logic in the
  frontend `Goals.jsx` page, so the dashboard can eventually fetch this
  instead of using hardcoded dates.
- `PnLEntry` and `GoalProgress` are separate collections referenced by
  `trader` / `goal` ObjectId, so each trader and goal can carry its own
  daily/weekly/monthly or monthly time series without bloating the main document.
