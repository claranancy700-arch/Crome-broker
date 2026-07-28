# C-Broker Application Audit & Feature Checklist

## Current App Status
- **Architecture**: Express.js backend + HTML/CSS/JS frontend
- **Storage**: JSON files (local) + Postgres support (via `DATABASE_URL`)
- **Core Features**: Registration, Login, Deposit, Withdraw, Market, Portfolio, Dashboard
- **Deployment**: Render-ready (npm install / npm start)

---

## Pages & Routes (Frontend)

### Pages Implemented ✅
| Page | Route | Status | Notes |
|------|-------|--------|-------|
| Home / Landing | `/` | ✅ Exists | Hero, features, CTA |
| Register | `/register` | ✅ Exists | Form validation, pwd hash |
| Login | `/login` | ✅ Exists | Email/pwd auth |
| Dashboard | `/dashboard` | ✅ Exists | Overview, balance, activity |
| Dashboard Basic | `/dashboard-basic` | ✅ Exists | Fallback dashboard |
| Deposit | `/deposit` | ✅ Exists | Form to add funds |
| Withdraw | `/withdraw` | ✅ Exists | Form to remove funds |
| Withdraw Processing | `/withdraw-processing` | ✅ Exists | Fee alert (new server-driven) |
| Market | `/market` | ✅ Exists | Ticker, prices, trading |
| Portfolio | `/portfolio` | ✅ Exists | Holdings, P&L |

### Pages Missing or Incomplete ❌
| Feature | Severity | Details |
|---------|----------|---------|
| **Logout** | High | Dashboard links to `/logout` but no route exists; should clear session/token |
| **Orders Page** | High | Dashboard nav links to `#` (placeholder); no `/orders` route |
| **Reports Page** | High | Dashboard nav links to `#` (placeholder); no `/reports` route |
| **Profile / Settings** | Medium | Avatar button exists but no `/profile` page; no user settings (email, password change) |
| **Password Reset** | Medium | No password recovery flow |
| **Transaction History** | Medium | `/api/account` returns txs but no dedicated `/history` page to display them nicely |
| **Error / 404 Pages** | Low | No custom 404 or error page |

---

## API Endpoints

### Authentication Endpoints
| Endpoint | Method | Status | Notes |
|----------|--------|--------|-------|
| `/api/register` | POST | ✅ Works | Creates user, stores hash |
| `/api/login` | POST | ✅ Works | Validates credentials, returns user |
| **Logout** | — | ❌ Missing | No endpoint; frontend should clear localStorage |
| **Token Refresh** | — | ❌ Missing | No session/JWT management |

### Account Endpoints
| Endpoint | Method | Status | Notes |
|----------|--------|--------|-------|
| `/api/account` | GET | ✅ Works | Returns user + transactions (email filter) |
| **User Profile** | GET | ❌ Missing | No `/api/user/:id` endpoint |
| **Update Profile** | PUT | ❌ Missing | No way to change name, email, password |

### Transaction Endpoints
| Endpoint | Method | Status | Notes |
|----------|--------|--------|-------|
| `/api/deposit` | POST | ✅ Works (Postgres-ready) | Adds funds, updates balance |
| `/api/withdraw` | POST | ✅ Works (Postgres-ready, fee flag) | Removes funds, attaches fee info |
| **Transaction History** | GET | ❌ Missing | No dedicated endpoint (use `/api/account` instead) |
| **Cancel Withdraw** | — | ❌ Missing | Can't reverse pending withdrawals |

### Portfolio Endpoints
| Endpoint | Method | Status | Notes |
|----------|--------|--------|-------|
| `/api/portfolio` | GET | ✅ Works | Computes holdings from trades |
| **Create Trade** | POST | ❌ Missing | No `/api/trade` endpoint; market/portfolio pages have no "trade" button |

### System Endpoints
| Endpoint | Method | Status | Notes |
|----------|--------|--------|-------|
| `/users` | GET | ⚠️ Exists | Debug route; returns all users (security risk) |
| **Health / Status** | GET | ❌ Missing | No `/health` endpoint for monitoring |
| **Migrations** | — | ✅ Works | `npm run migrate` script exists |

---

## Frontend JavaScript Modules

### Existing JS Files ✅
- `login.js` — Login form validation + API call
- `register.js` — Registration form + validation
- `deposit.js` — Deposit form + API call
- `withdraw.js` — Withdraw form + API call
- `withdraw-processing.js` — Processing page logic, fee alert, polling
- `dashboard.js` — Main dashboard (balance, activity, balance chart)
- `dashboard-basic.js` — Fallback dashboard
- `market.js` — Market ticker, prices
- `market-extended.js` — Extended market view
- `portfolio.js` — Portfolio holdings display
- `main.js` — Global utilities (nav toggle, year, etc.)

### Missing / Incomplete JS ❌
| Module | Needed For | Details |
|--------|-----------|---------|
| `logout.js` | Logout button | Clear localStorage, redirect to home |
| `profile.js` | Profile page | Show user info, allow edits |
| `orders.js` | Orders page | List open/closed orders (if trading implemented) |
| `reports.js` | Reports page | Charts, transaction summaries |
| `auth.js` (global) | All pages | Centralized auth check; redirect unauthenticated users |
| `api.js` (global) | All API calls | Wrapper for fetch with error handling, token injection |
| `ui.js` (global) | All pages | Toast notifications, loading spinners, error displays |

---

## Session / Authentication

### Current Approach ⚠️
- **No session/token system**: Login returns user object but doesn't set cookies or tokens.
- **Frontend relies on URL params**: Email + user passed via query string (`?email=...&user=...`).
- **Security risk**: Anyone can spoof `email` or `user` by editing the URL.
- **No auth guard**: Pages like `/dashboard`, `/withdraw` don't check if user is logged in.

### What's Missing ❌
| Feature | Severity | Details |
|---------|----------|---------|
| **Session Cookies** | High | Backend should set `HttpOnly` cookie on login; frontend uses it for auth |
| **JWT Tokens** (alternative) | High | Issue token on login; validate on protected routes |
| **Auth Middleware** | High | Express middleware to check auth before allowing dashboard/withdraw/etc. |
| **Logout Route** | High | Clear session/cookie, redirect to home |
| **Login Guard** | High | Redirect unauthenticated users from `/dashboard` → `/login` |

---

## Database & Data Model

### Current Tables (Postgres) ✅
- `users` (id, name, email, salt, hash, balance, created_at)
- `transactions` (id, type, name, email, amount, note, fee_required, fee_paid, fee_currency, created_at)

### Missing Tables ❌
| Table | Purpose | Columns (sketch) |
|-------|---------|-----------------|
| `orders` | Track buy/sell orders | id, user_id, symbol, qty, price, side (buy/sell), status, created_at |
| `positions` | Track open holdings (if trading) | id, user_id, symbol, qty, avg_cost, created_at |
| `trades` | Historical trades | id, user_id, symbol, qty, price, side, created_at |
| `sessions` | Session management (if using cookies) | id, user_id, token, expires_at, created_at |

### Missing Fields ❌
- `users.verified_email` — Track email verification status
- `users.kyc_status` — KYC compliance level
- `transactions.status` — Pending / completed / failed (for async processing)
- `transactions.metadata` — JSON field for extra info (e.g., blockchain tx hash)

---

## Features to Implement

### High Priority (Core Broker Functionality)
1. **Logout** — Clear session, redirect to home
2. **Auth Guard** — Redirect unauthenticated users from protected pages
3. **Orders Page** — List all pending/filled orders (requires trading engine)
4. **Trading / Execution** — "Buy" button on market → create order → fill → update portfolio
5. **Session / Token Auth** — Replace URL-based auth with proper tokens/cookies

### Medium Priority (UX & Safety)
6. **Profile Page** — Show user info, allow password/email change
7. **Transaction History Page** — Dedicated page listing all deposits/withdrawals/trades
8. **Error Handling** — Toast notifications, custom error pages
9. **Form Validation** — Better client-side validation (e.g., min/max amounts)
10. **Loading States** — Show spinners during API calls
11. **Email Verification** — Send verification email on register
12. **Password Reset** — "Forgot password?" flow

### Low Priority (Polish & Monitoring)
13. **Health Endpoint** — `/health` for Render/monitoring
14. **Admin Panel** — View all users, debug trades
15. **Activity Logs** — Track user actions for compliance
16. **Two-Factor Auth (2FA)** — Optional security layer
17. **API Documentation** — Swagger/OpenAPI docs
18. **Unit Tests** — Jest tests for critical functions

---

## Security Issues

### Current Vulnerabilities ⚠️
| Issue | Risk | Fix |
|-------|------|-----|
| **No CSRF protection** | Medium | Add CSRF tokens to forms |
| **No rate limiting** | Medium | Limit login/register attempts |
| **No HTTPS enforcement** | High | Ensure Render uses HTTPS (automatic) |
| **URL-based auth** | High | Use cookies/tokens, not query params for sensitive data |
| **No input validation** | Medium | Validate + sanitize all inputs (email format, amount > 0, etc.) |
| **Debug `/users` endpoint** | High | Remove or restrict to admin only |
| **Hardcoded fee values** | Low | Use configurable env vars (already done: `FEE_THRESHOLD`, etc.) |
| **No password policy** | Low | Enforce min length, complexity (currently just 8 char min) |

---

## Integration Checklist

### Before Going Live
- [ ] Implement logout + auth guard
- [ ] Set up session/token system
- [ ] Remove `/users` debug endpoint
- [ ] Add email verification
- [ ] Test all forms (register, login, deposit, withdraw)
- [ ] Test on Render with Postgres
- [ ] Set up SSL/HTTPS (automatic on Render)
- [ ] Add environment validation (warn if key env vars missing)
- [ ] Create admin account / seeding script
- [ ] Documentation for future developers

### Post-Launch
- [ ] Monitor error logs
- [ ] Gather user feedback
- [ ] Implement trading / orders
- [ ] Add more payment methods (Stripe, etc.)
- [ ] Compliance & KYC integration

---

## Quick Wins (Easy to Implement)

1. **Remove `/users` endpoint** — ~1 line delete
2. **Add logout route** — ~5 lines (clear session, redirect)
3. **Add logout button JS** — ~10 lines (clear localStorage, fetch logout, redirect)
4. **Redirect unauth users** — ~20 lines middleware
5. **Add 404 page** — ~20 lines HTML + route
6. **Improve error messages** — ~30 lines (better alerts in JS)

---

## File Structure Summary
```
Crome-broker/
├── app.js (main server, routes: register, login, deposit, withdraw, account, portfolio)
├── db.js (Postgres pool, with fallback stub)
├── package.json (deps: express, pg)
├── migrations/
│   └── init_db.js (create users + transactions tables)
├── public/
│   ├── index.html (home)
│   ├── login.html, register.html, dashboard.html, deposit.html, withdraw.html, market.html, portfolio.html
│   ├── js/
│   │   ├── login.js, register.js, deposit.js, withdraw.js, withdraw-processing.js
│   │   ├── dashboard.js, market.js, portfolio.js
│   │   └── main.js
│   ├── css/
│   │   ├── styles.css, dashboard.css
│   └── media/ (images, videos)
└── data/ (JSON fallback: users.json, transactions.json)
```

---

## Next Steps (Recommended Order)

1. **Setup Postgres & Test** (use Render managed DB)
   - Run migration
   - Test register/login/deposit/withdraw with DB
   
2. **Auth System** (critical)
   - Add session/cookie or JWT
   - Implement logout route
   - Add auth guard to protected pages
   
3. **Remove Debug Endpoint** (security)
   - Delete `/users` route
   
4. **Add Core Pages** (for UX)
   - Logout button (JS + route)
   - Profile page (show user, allow edits)
   - Transaction history page
   
5. **Improve Forms** (robustness)
   - Better validation
   - Loading states
   - Error handling
   
6. **Trading Feature** (if needed)
   - Orders table + routes
   - Trading logic (buy/sell)
   - Portfolio rebalancing

---

**Last Updated**: 2025-12-04  
**Status**: MVP-ready but needs auth, trading, and UX polish
