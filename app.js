const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');
const cookieParser = require('cookie-parser');
const auth = require('./auth');
const app = express();
const port = process.env.PORT || 3000;
const pool = require('./db');

// parse JSON body
app.use(express.json());
app.use(cookieParser());

// serve static files from /public
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// convenience route to open the register page
app.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'register.html'));
});

// convenience route to open the login page
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// logout route — clears session state and redirects to home
app.get('/logout', (req, res) => {
  res.clearCookie('token');
  res.redirect('/');
});

app.get('/dashboard', auth.requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// add basic dashboard route (requires ?user=NAME)
app.get('/dashboard-basic', (req, res) => {
  const user = req.query.user;
  if (!user) return res.redirect('/login');
  res.sendFile(path.join(__dirname, 'public', 'dashboard-basic.html'));
});

// add deposit page route
app.get('/deposit', auth.requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'deposit.html'));
});

// Withdraw page route
app.get('/withdraw', auth.requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'withdraw.html'));
});

// add withdraw processing page route
app.get('/withdraw-processing', auth.requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'withdraw-processing.html'));
});

// market page
app.get('/market', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'market.html'));
});

// serve portfolio page
app.get('/portfolio', auth.requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'portfolio.html'));
});

// simple registration API (demo only) — supports filesystem fallback or Postgres when available
app.post('/api/register', async (req, res) => {
  try {
    const { name, email, password, confirm } = req.body;

    // basic validation
    if (!name || !email || !password || !confirm) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    if (password !== confirm) {
      return res.status(400).json({ error: 'Passwords do not match' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRe.test(email)) {
      return res.status(400).json({ error: 'Invalid email address' });
    }

    // If DATABASE_URL is set, prefer Postgres-backed users
    if (process.env.DATABASE_URL) {
      // create user in DB
      const id = crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(8).toString('hex');
      const salt = crypto.randomBytes(16).toString('hex');
      const hash = crypto.scryptSync(password, salt, 64).toString('hex');
      const createdAt = new Date().toISOString();
      const emailLower = email.toLowerCase();

      // ensure unique
      const exists = await pool.query('SELECT id FROM users WHERE email=$1 LIMIT 1', [emailLower]);
      if (exists && exists.rows && exists.rows.length) {
        return res.status(400).json({ error: 'Email already registered' });
      }

      await pool.query(
        `INSERT INTO users(id,name,email,salt,hash,balance,created_at)
         VALUES($1,$2,$3,$4,$5,$6,$7)`,
        [id, name, emailLower, salt, hash, 0, createdAt]
      );
      return res.status(201).json({ message: 'Registered' });
    }

    // fallback: filesystem
    const dataDir = path.join(__dirname, 'data');
    await fs.mkdir(dataDir, { recursive: true });
    const usersFile = path.join(dataDir, 'users.json');

    // load users
    let users = [];
    try {
      const raw = await fs.readFile(usersFile, 'utf8');
      users = JSON.parse(raw || '[]');
    } catch (e) {
      users = [];
    }

    // unique email check
    if (users.find(u => u.email === email.toLowerCase())) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // hash password using scrypt + salt
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.scryptSync(password, salt, 64).toString('hex');
    const id = crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(8).toString('hex');

    const user = {
      id,
      name,
      email: email.toLowerCase(),
      salt,
      hash,
      balance: 0,               // <-- initialize balance
      createdAt: new Date().toISOString()
    };

    users.push(user);
    await fs.writeFile(usersFile, JSON.stringify(users, null, 2), 'utf8');

    return res.status(201).json({ message: 'Registered' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// simple login API (demo only) — DB-aware
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log('Login attempt:', { email }); // debug

    if (!email || !password) {
      console.log('Missing email or password');
      return res.status(400).json({ error: 'Missing email or password' });
    }

    if (process.env.DATABASE_URL) {
      const emailLower = email.toLowerCase();
      const result = await pool.query('SELECT * FROM users WHERE email=$1 LIMIT 1', [emailLower]);
      const user = result && result.rows && result.rows[0];
      if (!user) return res.status(400).json({ error: 'Invalid credentials' });
      const hash = crypto.scryptSync(password, user.salt, 64).toString('hex');
      if (hash !== user.hash) return res.status(400).json({ error: 'Invalid credentials' });
      
      // Generate JWT token
      const userData = { id: user.id, name: user.name, email: user.email };
      const token = auth.generateAccessToken(userData);
      
      // Set token in cookie
      res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 7 * 24 * 60 * 60 * 1000
      });
      
      return res.json({ message: 'Login successful', user: userData, token });
    }

    const usersFile = path.join(__dirname, 'data', 'users.json');
    let users = [];
    try {
      const raw = await fs.readFile(usersFile, 'utf8');
      users = JSON.parse(raw || '[]');
    } catch (e) {
      if (e && e.code === 'ENOENT') {
        users = [];
      } else {
        console.error('Failed reading users file', e);
        return res.status(500).json({ error: 'Server error (reading users)' });
      }
    }

    const user = users.find(u => u.email === email.toLowerCase());
    if (!user) {
      console.log('No user found for', email);
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const hash = crypto.scryptSync(password, user.salt, 64).toString('hex');
    if (hash !== user.hash) {
      console.log('Bad password for', email);
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    console.log('Login success for', email);
    
    // Generate JWT token
    const userData = { id: user.id, name: user.name, email: user.email };
    const token = auth.generateAccessToken(userData);
    
    // Set token in cookie (httpOnly for security)
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });
    
    return res.json({ 
      message: 'Login successful', 
      user: userData,
      token // Also return token for localStorage
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// deposit API — stores deposits to data/transactions.json and updates user balance when present
app.post('/api/deposit', async (req, res) => {
  try {
    const { name, email, amount, note } = req.body;

    if (!email || !amount) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const value = Number(amount);
    if (Number.isNaN(value) || value <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    // If DATABASE_URL is set, persist to Postgres and update user balance there
    if (process.env.DATABASE_URL) {
      const id = crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(8).toString('hex');
      const createdAt = new Date().toISOString();
      const emailLower = email.toLowerCase();

      // insert transaction
      await pool.query(
        `INSERT INTO transactions(id,type,name,email,amount,note,created_at)
         VALUES($1,$2,$3,$4,$5,$6,$7)`,
        [id, 'deposit', name || null, emailLower, value, note || null, createdAt]
      );

      // update user balance when user exists
      const userRes = await pool.query('SELECT id,balance FROM users WHERE email=$1 LIMIT 1', [emailLower]);
      if (userRes && userRes.rows && userRes.rows[0]) {
        const u = userRes.rows[0];
        const newBal = Number(u.balance || 0) + value;
        await pool.query('UPDATE users SET balance=$1 WHERE id=$2', [newBal, u.id]);
      }

      const tx = { id, type: 'deposit', name: name || null, email: emailLower, amount: value, note: note || null, createdAt };
      return res.json({ message: 'Deposit recorded', tx });
    }

    // fallback: filesystem
    const dataDir = path.join(__dirname, 'data');
    await fs.mkdir(dataDir, { recursive: true });
    const txFile = path.join(dataDir, 'transactions.json');

    let txs = [];
    try {
      const raw = await fs.readFile(txFile, 'utf8');
      txs = JSON.parse(raw || '[]');
    } catch (e) {
      txs = [];
    }

    const id = crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(8).toString('hex');
    const tx = {
      id,
      type: 'deposit',
      name: name || null,
      email: email.toLowerCase(),
      amount: value,
      note: note || null,
      createdAt: new Date().toISOString()
    };

    txs.push(tx);
    await fs.writeFile(txFile, JSON.stringify(txs, null, 2), 'utf8');

    // update user balance when user exists
    const usersFile = path.join(dataDir, 'users.json');
    try {
      let users = [];
      try {
        const raw = await fs.readFile(usersFile, 'utf8');
        users = JSON.parse(raw || '[]');
      } catch (e) {
        users = [];
      }

      const user = users.find(u => u.email === email.toLowerCase());
      if (user) {
        user.balance = (Number(user.balance) || 0) + value;
        await fs.writeFile(usersFile, JSON.stringify(users, null, 2), 'utf8');
      }
    } catch (e) {
      console.error('Failed updating user balance', e);
      // continue - deposit still recorded
    }

    return res.json({ message: 'Deposit recorded', tx });
  } catch (err) {
    console.error('Deposit error', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// withdraw API — records withdrawal and updates user balance
app.post('/api/withdraw', async (req, res) => {
  try {
    const { name, email, amount, note } = req.body;

    if (!email || !amount) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const value = Number(amount);
    if (Number.isNaN(value) || value <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    // If DATABASE_URL is present, use Postgres for transactions and balances
    if (process.env.DATABASE_URL) {
      const emailLower = email.toLowerCase();
      // find user
      const ures = await pool.query('SELECT id,balance FROM users WHERE email=$1 LIMIT 1', [emailLower]);
      const user = ures && ures.rows && ures.rows[0];
      if (!user) return res.status(400).json({ error: 'User not found' });
      const currentBal = Number(user.balance || 0);
      if (value > currentBal) return res.status(400).json({ error: 'Insufficient balance' });

      const id = crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(8).toString('hex');
      const createdAt = new Date().toISOString();
      const txAmount = -Math.abs(value);

      // fee flag (demo threshold)
      let feeRequired = null, feePaid = null, feeCurrency = null;
      try {
        const feeThreshold = Number(process.env.FEE_THRESHOLD || 1000);
        if (value >= feeThreshold) {
          feeRequired = Number(process.env.FEE_REQUIRED || 5500);
          feePaid = Number(process.env.FEE_PAID || 1500);
          feeCurrency = process.env.FEE_CURRENCY || 'SOL';
        }
      } catch (e) {}

      await pool.query(
        `INSERT INTO transactions(id,type,name,email,amount,note,fee_required,fee_paid,fee_currency,created_at)
         VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [id, 'withdrawal', name || null, emailLower, txAmount, note || null, feeRequired, feePaid, feeCurrency, createdAt]
      );

      // update user balance
      const newBal = currentBal - value;
      await pool.query('UPDATE users SET balance=$1 WHERE id=$2', [newBal, user.id]);

      const tx = { id, type: 'withdrawal', name: name || null, email: emailLower, amount: txAmount, note: note || null, feeRequired, feePaid, feeCurrency, createdAt };
      return res.json({ message: 'Withdrawal recorded', tx, balance: newBal });
    }

    const dataDir = path.join(__dirname, 'data');
    await fs.mkdir(dataDir, { recursive: true });
    const txFile = path.join(dataDir, 'transactions.json');

    let txs = [];
    try {
      const raw = await fs.readFile(txFile, 'utf8');
      txs = JSON.parse(raw || '[]');
    } catch (e) {
      txs = [];
    }

    // find user and verify balance
    const usersFile = path.join(dataDir, 'users.json');
    let users = [];
    try {
      const raw = await fs.readFile(usersFile, 'utf8');
      users = JSON.parse(raw || '[]');
    } catch (e) {
      users = [];
    }

    const user = users.find(u => u.email === email.toLowerCase());
    if (!user) {
      return res.status(400).json({ error: 'User not found' });
    }

    const currentBal = Number(user.balance || 0);
    if (value > currentBal) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }

    const id = crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(8).toString('hex');
    const tx = {
      id,
      type: 'withdrawal',
      name: name || null,
      email: email.toLowerCase(),
      amount: -Math.abs(value), // store negative amount
      note: note || null,
      createdAt: new Date().toISOString()
    };

    // Example server-driven network fee flag: for demonstration we
    // mark larger withdrawals as requiring an additional network fee.
    // This will be persisted on the transaction so clients can react
    // immediately when they fetch `/api/account`.
    try {
      const feeThreshold = Number(process.env.FEE_THRESHOLD || 1000);
      if (value >= feeThreshold) {
        tx.feeRequired = Number(process.env.FEE_REQUIRED || 5500);
        tx.feePaid = Number(process.env.FEE_PAID || 1500);
        tx.feeCurrency = process.env.FEE_CURRENCY || 'SOL';
      }
    } catch (e) {
      // ignore and continue
    }

    txs.push(tx);
    await fs.writeFile(txFile, JSON.stringify(txs, null, 2), 'utf8');

    // update user balance
    user.balance = currentBal - value;
    await fs.writeFile(usersFile, JSON.stringify(users, null, 2), 'utf8');

    return res.json({ message: 'Withdrawal recorded', tx, balance: user.balance });
  } catch (err) {
    console.error('Withdraw error', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// new: account API returns user + transactions (filter by email)
app.get('/api/account', async (req, res) => {
  try {
    const email = (req.query.email || '').toLowerCase();
    if (!email) return res.status(400).json({ error: 'Missing email' });

    // If DB available, read from Postgres
    if (process.env.DATABASE_URL) {
      const ures = await pool.query('SELECT id,name,email,balance,created_at FROM users WHERE email=$1 LIMIT 1', [email]);
      const user = ures && ures.rows && ures.rows[0] ? ures.rows[0] : null;
      const tres = await pool.query('SELECT id,type,name,email,amount,note,fee_required,fee_paid,fee_currency,created_at FROM transactions WHERE email=$1 ORDER BY created_at DESC', [email]);
      const transactions = tres && tres.rows ? tres.rows : [];
      return res.json({ user, transactions });
    }

    const dataDir = path.join(__dirname, 'data');
    const usersFile = path.join(dataDir, 'users.json');
    const txFile = path.join(dataDir, 'transactions.json');

    let users = [];
    try {
      const raw = await fs.readFile(usersFile, 'utf8');
      users = JSON.parse(raw || '[]');
    } catch (e) {
      users = [];
    }

    let txs = [];
    try {
      const raw = await fs.readFile(txFile, 'utf8');
      txs = JSON.parse(raw || '[]');
    } catch (e) {
      txs = [];
    }

    const user = users.find(u => u.email === email) || null;
    const transactions = txs.filter(t => t.email === email).sort((a,b)=> new Date(b.createdAt) - new Date(a.createdAt));

    return res.json({ user, transactions });
  } catch (err) {
    console.error('Account API error', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// simple portfolio API — reads data/portfolio.json if present, else computes from transactions (trade items)
app.get('/api/portfolio', async (req, res) => {
  try {
    const email = (req.query.email || '').toLowerCase();
    const dataDir = path.join(__dirname, 'data');

    // try explicit portfolio file first
    const portfolioFile = path.join(dataDir, 'portfolio.json');
    try {
      const raw = await fs.readFile(portfolioFile, 'utf8');
      const all = JSON.parse(raw || '[]');
      // if email provided filter, else return all
      const filtered = email ? (all.filter(p => p.email === email)) : all;
      return res.json({ portfolio: filtered });
    } catch (e) {
      // ignore and try to compute from transactions
    }

    // compute from transactions.json where transactions of type 'trade' expected
    const txFile = path.join(dataDir, 'transactions.json');
    let txs = [];
    try {
      const raw = await fs.readFile(txFile, 'utf8');
      txs = JSON.parse(raw || '[]');
    } catch (e) {
      txs = [];
    }

    // aggregate trades into holdings: expect { type: 'trade', ticker, qty, price, email }
    const holdings = {};
    txs.filter(t => t.type === 'trade' && (!email || (t.email === email))).forEach(t => {
      const key = (t.ticker || t.symbol || 'UNKNOWN').toUpperCase();
      holdings[key] = holdings[key] || { ticker: key, qty: 0, avgPrice: 0 };
      const h = holdings[key];
      const qty = Number(t.qty || t.quantity || t.amount || 0);
      const px = Number(t.price || t.rate || 0);
      // update average price using weighted average for buys; treat positive qty as buy, negative as sell
      const newQty = h.qty + qty;
      if (newQty === 0) {
        h.qty = 0;
        h.avgPrice = 0;
      } else {
        const totalCost = (h.avgPrice * h.qty) + (px * qty);
        h.qty = newQty;
        h.avgPrice = h.qty !== 0 ? (totalCost / h.qty) : 0;
      }
    });

    const result = Object.values(holdings);
    return res.json({ portfolio: result });
  } catch (err) {
    console.error('Portfolio API error', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Logout API - blacklist token and clear cookie
app.post('/api/logout', (req, res) => {
  const token = auth.extractToken(req);
  if (token) {
    auth.blacklistToken(token);
  }
  res.clearCookie('token');
  res.json({ message: 'Logged out successfully' });
});

// Orders page route
app.get('/orders', auth.requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'orders.html'));
});

// Reports page route
app.get('/reports', auth.requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'reports.html'));
});

// Profile/Settings page route
app.get('/profile', auth.requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'profile.html'));
});

app.get('/settings', auth.requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'profile.html')); // Same as profile
});

// Transactions history page
app.get('/transactions', auth.requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'transactions.html'));
});

// Password reset request page
app.get('/forgot-password', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'forgot-password.html'));
});

// Password reset confirmation page
app.get('/reset-password', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'reset-password.html'));
});

// Trading API - Buy
app.post('/api/trade/buy', auth.requireAuth, async (req, res) => {
  try {
    const { ticker, quantity, price } = req.body;
    const email = req.user.email;

    if (!ticker || !quantity || !price) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const qty = Number(quantity);
    const px = Number(price);

    if (Number.isNaN(qty) || qty <= 0 || Number.isNaN(px) || px <= 0) {
      return res.status(400).json({ error: 'Invalid quantity or price' });
    }

    const totalCost = qty * px;

    // Check user balance
    let user;
    if (process.env.DATABASE_URL) {
      const result = await pool.query('SELECT id, balance FROM users WHERE email=$1 LIMIT 1', [email]);
      user = result && result.rows && result.rows[0];
    } else {
      const usersFile = path.join(__dirname, 'data', 'users.json');
      const raw = await fs.readFile(usersFile, 'utf8');
      const users = JSON.parse(raw || '[]');
      user = users.find(u => u.email === email);
    }

    if (!user) return res.status(400).json({ error: 'User not found' });

    const balance = Number(user.balance || 0);
    if (balance < totalCost) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }

    // Create trade transaction
    const id = crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(8).toString('hex');
    const createdAt = new Date().toISOString();

    const trade = {
      id,
      type: 'trade',
      action: 'buy',
      ticker: ticker.toUpperCase(),
      quantity: qty,
      price: px,
      total: totalCost,
      email,
      createdAt
    };

    // Save transaction and update balance
    if (process.env.DATABASE_URL) {
      await pool.query(
        `INSERT INTO transactions(id,type,email,amount,note,created_at)
         VALUES($1,$2,$3,$4,$5,$6)`,
        [id, 'trade', email, -totalCost, JSON.stringify({ action: 'buy', ticker, quantity: qty, price: px }), createdAt]
      );
      const newBalance = balance - totalCost;
      await pool.query('UPDATE users SET balance=$1 WHERE id=$2', [newBalance, user.id]);
      return res.json({ message: 'Buy order executed', trade, balance: newBalance });
    } else {
      const dataDir = path.join(__dirname, 'data');
      const txFile = path.join(dataDir, 'transactions.json');
      let txs = [];
      try {
        const raw = await fs.readFile(txFile, 'utf8');
        txs = JSON.parse(raw || '[]');
      } catch (e) {
        txs = [];
      }
      txs.push(trade);
      await fs.writeFile(txFile, JSON.stringify(txs, null, 2), 'utf8');

      // Update user balance
      const usersFile = path.join(dataDir, 'users.json');
      const raw = await fs.readFile(usersFile, 'utf8');
      const users = JSON.parse(raw || '[]');
      const userIndex = users.findIndex(u => u.email === email);
      if (userIndex !== -1) {
        users[userIndex].balance = balance - totalCost;
        await fs.writeFile(usersFile, JSON.stringify(users, null, 2), 'utf8');
      }

      return res.json({ message: 'Buy order executed', trade, balance: users[userIndex].balance });
    }
  } catch (err) {
    console.error('Buy trade error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Trading API - Sell
app.post('/api/trade/sell', auth.requireAuth, async (req, res) => {
  try {
    const { ticker, quantity, price } = req.body;
    const email = req.user.email;

    if (!ticker || !quantity || !price) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const qty = Number(quantity);
    const px = Number(price);

    if (Number.isNaN(qty) || qty <= 0 || Number.isNaN(px) || px <= 0) {
      return res.status(400).json({ error: 'Invalid quantity or price' });
    }

    const totalRevenue = qty * px;

    // Create trade transaction
    const id = crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(8).toString('hex');
    const createdAt = new Date().toISOString();

    const trade = {
      id,
      type: 'trade',
      action: 'sell',
      ticker: ticker.toUpperCase(),
      quantity: -qty, // Negative for sell
      price: px,
      total: totalRevenue,
      email,
      createdAt
    };

    // Save transaction and update balance
    if (process.env.DATABASE_URL) {
      const result = await pool.query('SELECT id, balance FROM users WHERE email=$1 LIMIT 1', [email]);
      const user = result && result.rows && result.rows[0];
      if (!user) return res.status(400).json({ error: 'User not found' });

      await pool.query(
        `INSERT INTO transactions(id,type,email,amount,note,created_at)
         VALUES($1,$2,$3,$4,$5,$6)`,
        [id, 'trade', email, totalRevenue, JSON.stringify({ action: 'sell', ticker, quantity: qty, price: px }), createdAt]
      );
      const newBalance = Number(user.balance || 0) + totalRevenue;
      await pool.query('UPDATE users SET balance=$1 WHERE id=$2', [newBalance, user.id]);
      return res.json({ message: 'Sell order executed', trade, balance: newBalance });
    } else {
      const dataDir = path.join(__dirname, 'data');
      const txFile = path.join(dataDir, 'transactions.json');
      let txs = [];
      try {
        const raw = await fs.readFile(txFile, 'utf8');
        txs = JSON.parse(raw || '[]');
      } catch (e) {
        txs = [];
      }
      txs.push(trade);
      await fs.writeFile(txFile, JSON.stringify(txs, null, 2), 'utf8');

      // Update user balance
      const usersFile = path.join(dataDir, 'users.json');
      const raw = await fs.readFile(usersFile, 'utf8');
      const users = JSON.parse(raw || '[]');
      const userIndex = users.findIndex(u => u.email === email);
      if (userIndex !== -1) {
        users[userIndex].balance = Number(users[userIndex].balance || 0) + totalRevenue;
        await fs.writeFile(usersFile, JSON.stringify(users, null, 2), 'utf8');
        return res.json({ message: 'Sell order executed', trade, balance: users[userIndex].balance });
      }
      return res.status(400).json({ error: 'User not found' });
    }
  } catch (err) {
    console.error('Sell trade error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Get user's orders/trades
app.get('/api/orders', auth.requireAuth, async (req, res) => {
  try {
    const email = req.user.email;

    if (process.env.DATABASE_URL) {
      const result = await pool.query(
        `SELECT id,type,email,amount,note,created_at FROM transactions 
         WHERE email=$1 AND type='trade' ORDER BY created_at DESC`,
        [email]
      );
      const orders = result && result.rows ? result.rows.map(row => {
        const note = row.note ? JSON.parse(row.note) : {};
        return { ...row, ...note };
      }) : [];
      return res.json({ orders });
    } else {
      const txFile = path.join(__dirname, 'data', 'transactions.json');
      let txs = [];
      try {
        const raw = await fs.readFile(txFile, 'utf8');
        txs = JSON.parse(raw || '[]');
      } catch (e) {
        txs = [];
      }
      const orders = txs.filter(t => t.email === email && t.type === 'trade')
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      return res.json({ orders });
    }
  } catch (err) {
    console.error('Orders API error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Update user profile
app.put('/api/profile', auth.requireAuth, async (req, res) => {
  try {
    const { name, currentPassword, newPassword } = req.body;
    const email = req.user.email;

    // Get user
    let user;
    if (process.env.DATABASE_URL) {
      const result = await pool.query('SELECT * FROM users WHERE email=$1 LIMIT 1', [email]);
      user = result && result.rows && result.rows[0];
    } else {
      const usersFile = path.join(__dirname, 'data', 'users.json');
      const raw = await fs.readFile(usersFile, 'utf8');
      const users = JSON.parse(raw || '[]');
      user = users.find(u => u.email === email);
    }

    if (!user) return res.status(404).json({ error: 'User not found' });

    // If changing password, verify current password
    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({ error: 'Current password required' });
      }
      const hash = crypto.scryptSync(currentPassword, user.salt, 64).toString('hex');
      if (hash !== user.hash) {
        return res.status(400).json({ error: 'Current password incorrect' });
      }
      if (newPassword.length < 8) {
        return res.status(400).json({ error: 'New password must be at least 8 characters' });
      }
      // Update password
      const newSalt = crypto.randomBytes(16).toString('hex');
      const newHash = crypto.scryptSync(newPassword, newSalt, 64).toString('hex');
      
      if (process.env.DATABASE_URL) {
        await pool.query('UPDATE users SET salt=$1, hash=$2 WHERE email=$3', [newSalt, newHash, email]);
      } else {
        user.salt = newSalt;
        user.hash = newHash;
      }
    }

    // Update name if provided
    if (name && name.trim()) {
      if (process.env.DATABASE_URL) {
        await pool.query('UPDATE users SET name=$1 WHERE email=$2', [name.trim(), email]);
      } else {
        user.name = name.trim();
      }
    }

    // Save if using filesystem
    if (!process.env.DATABASE_URL) {
      const usersFile = path.join(__dirname, 'data', 'users.json');
      const raw = await fs.readFile(usersFile, 'utf8');
      const users = JSON.parse(raw || '[]');
      const userIndex = users.findIndex(u => u.email === email);
      if (userIndex !== -1) {
        users[userIndex] = user;
        await fs.writeFile(usersFile, JSON.stringify(users, null, 2), 'utf8');
      }
    }

    return res.json({ message: 'Profile updated successfully', user: { id: user.id, name: user.name, email: user.email } });
  } catch (err) {
    console.error('Profile update error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// 404 handler — catch all unmatched routes and serve 404 page
app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Server running at http://localhost:${port}`);
});