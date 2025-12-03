# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

Crome-broker is a cryptocurrency broker/portfolio management web application built with Express.js backend and vanilla JavaScript frontend. The application provides user authentication, account management, deposits, withdrawals, portfolio tracking, and live market data.

## Commands

### Development
```powershell
# Install dependencies
npm install

# Start the server (listens on port 3000 by default, or PORT env var)
npm start
# or directly:
node app.js

# Create a demo user (hardcoded: emily@example.com / 123456)
node create-user.js

# Test database connection (requires DATABASE_URL env var)
node test-db.js
```

## Architecture

### Backend Structure (app.js)

**Data Storage**: File-based JSON storage in `data/` directory (no persistent DB required for basic operation)
- `data/users.json` - User accounts with hashed passwords (scrypt + salt)
- `data/transactions.json` - All transactions (deposits, withdrawals, trades)
- `data/portfolio.json` - (Optional) Explicit portfolio holdings

**Database**: PostgreSQL pool configured via `db.js`
- Uses `DATABASE_URL` env var when available (for production on Render)
- Provides stub implementation when DB not configured (app still runs locally)
- SSL enabled in production mode

**Authentication**: 
- Passwords hashed with crypto.scryptSync + random salt
- No session management or JWT tokens implemented
- User lookup via email (stored lowercase)

**Key API Endpoints**:
- `POST /api/register` - Create new user account
- `POST /api/login` - Authenticate user
- `POST /api/deposit` - Record deposit and update user balance
- `POST /api/withdraw` - Record withdrawal, verify balance, deduct amount
- `GET /api/account?email=` - Fetch user info + transaction history
- `GET /api/portfolio?email=` - Compute portfolio from trades or read from file

**Transaction Types**:
- `deposit` - Adds to balance
- `withdrawal` - Subtracts from balance (stored as negative amount)
- `trade` - For portfolio tracking (expects: ticker, qty, price)

**Withdrawal Flow**: 
- Server may add `feeRequired`, `feePaid`, `feeCurrency` fields to withdrawal transactions when amount exceeds threshold
- Frontend checks for pending fees via `/api/account`

### Frontend Structure

**Static Files**: Served from `public/` directory
- HTML pages: `index.html`, `login.html`, `register.html`, `dashboard.html`, `deposit.html`, `withdraw.html`, `market.html`, `portfolio.html`
- CSS: `public/css/styles.css`, `public/css/dashboard.css`
- JavaScript: `public/js/` (each page has corresponding `.js` file)
- Media: `public/media/` (hero images/videos)

**Dashboard UI** (`dashboard.js`):
- Animated card reveals with staggered timing
- Count-up animation for balance display
- Real-time sparkline chart (SVG path animation with stroke-dashoffset)
- Live transaction feed with mock data updates every 2s
- Collapsible sidebar navigation

**Market Page** (`market.js`):
- Fetches live crypto prices from CoinGecko API (BTC, ETH, LINK, ADA, XRP)
- Embeds TradingView widget for charts
- Displays crypto news from CoinGecko status updates
- Auto-refreshes prices every 5s, news every 60s

**Data Flow**:
1. User auth state passed via URL query params (`?email=...&user=...`)
2. Pages fetch user data from `/api/account?email=` on load
3. Forms POST to `/api/register`, `/api/login`, `/api/deposit`, `/api/withdraw`
4. No client-side state management library (vanilla JS)

## Important Patterns

### User Balance Updates
When processing deposits/withdrawals:
1. Transaction always recorded in `transactions.json` first
2. User balance updated in `users.json` second
3. Deposit failure on balance update is non-fatal (transaction still recorded)

### Password Security
- Always use `crypto.scryptSync(password, salt, 64)` for hashing
- Generate salt with `crypto.randomBytes(16).toString('hex')`
- Store both `salt` and `hash` fields in user object

### Email Handling
- Always normalize emails to lowercase: `email.toLowerCase()`
- Check for existing users before registration

### Transaction IDs
- Use `crypto.randomUUID()` with fallback to `crypto.randomBytes(8).toString('hex')`

### Error Handling
- Return JSON error responses: `{ error: 'message' }`
- Use appropriate HTTP status codes (400 for validation, 500 for server errors)
- Log errors to console with `console.error()`

## Environment Variables

- `PORT` - Server port (default: 3000)
- `DATABASE_URL` - PostgreSQL connection string (optional, app runs without it)
- `NODE_ENV` - Set to `production` to enable DB SSL

## Node Version

- Requires Node.js 18.x (specified in package.json engines)
