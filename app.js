const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');
const cookieParser = require('cookie-parser');
const auth = require('./auth');
const app = express();
const port = process.env.PORT || 3000;
const pool = require('./db');

const DATA_DIR = path.join(__dirname, 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const TX_FILE = path.join(DATA_DIR, 'transactions.json');

// Demo starting balance for new accounts (not real money)
const DEMO_START_BALANCE = Number(process.env.DEMO_START_BALANCE || 25000);

app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// ---------- helpers ----------
async function readJson(file, fallback) {
  try {
    const raw = await fs.readFile(file, 'utf8');
    return JSON.parse(raw || 'null') ?? fallback;
  } catch (e) {
    if (e && e.code === 'ENOENT') return fallback;
    throw e;
  }
}

async function writeJson(file, data) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, JSON.stringify(data, null, 2), 'utf8');
}

function newId() {
  return crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(8).toString('hex');
}

function hashPassword(password, salt) {
  return crypto.scryptSync(password, salt, 64).toString('hex');
}

function publicUser(u) {
  if (!u) return null;
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    balance: Number(u.balance || 0),
    createdAt: u.createdAt || u.created_at || null
  };
}

async function findUserByEmail(email) {
  const emailLower = (email || '').toLowerCase();
  if (!emailLower) return null;

  if (process.env.DATABASE_URL) {
    const result = await pool.query('SELECT * FROM users WHERE email=$1 LIMIT 1', [emailLower]);
    return result && result.rows && result.rows[0] ? result.rows[0] : null;
  }

  const users = await readJson(USERS_FILE, []);
  return users.find(u => u.email === emailLower) || null;
}

async function listTxForEmail(email) {
  const emailLower = (email || '').toLowerCase();

  if (process.env.DATABASE_URL) {
    const tres = await pool.query(
      `SELECT id,type,name,email,amount,note,fee_required,fee_paid,fee_currency,created_at
       FROM transactions WHERE email=$1 ORDER BY created_at DESC`,
      [emailLower]
    );
    return (tres && tres.rows ? tres.rows : []).map(t => ({
      id: t.id,
      type: t.type,
      name: t.name,
      email: t.email,
      amount: Number(t.amount),
      note: t.note,
      feeRequired: t.fee_required,
      feePaid: t.fee_paid,
      feeCurrency: t.fee_currency,
      createdAt: t.created_at
    }));
  }

  const txs = await readJson(TX_FILE, []);
  return txs
    .filter(t => t.email === emailLower)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

// ---------- pages ----------
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'register.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/logout', (req, res) => {
  const token = auth.extractToken(req);
  if (token) auth.blacklistToken(token);
  res.clearCookie('token');
  res.redirect('/');
});

app.get('/dashboard', auth.requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

app.get('/deposit', auth.requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'deposit.html'));
});

app.get('/withdraw', auth.requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'withdraw.html'));
});

app.get('/withdraw-processing', auth.requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'withdraw-processing.html'));
});

// Alias spelling used in some flows
app.get('/withdrawal-processing', auth.requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'withdraw-processing.html'));
});

// Bitcoin authorization step (between processing phases)
app.get('/btc-auth', auth.requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'btc-auth.html'));
});

app.get('/market', auth.requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'market.html'));
});

app.get('/portfolio', auth.requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'portfolio.html'));
});

// ---------- auth APIs ----------
app.post('/api/register', async (req, res) => {
  try {
    const { name, email, password, confirm } = req.body;

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

    const emailLower = email.toLowerCase();
    const id = newId();
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = hashPassword(password, salt);
    const createdAt = new Date().toISOString();
    const balance = DEMO_START_BALANCE;

    if (process.env.DATABASE_URL) {
      const exists = await pool.query('SELECT id FROM users WHERE email=$1 LIMIT 1', [emailLower]);
      if (exists && exists.rows && exists.rows.length) {
        return res.status(400).json({ error: 'Email already registered' });
      }

      await pool.query(
        `INSERT INTO users(id,name,email,salt,hash,balance,created_at)
         VALUES($1,$2,$3,$4,$5,$6,$7)`,
        [id, name, emailLower, salt, hash, balance, createdAt]
      );

      // Seed a demo welcome deposit so the ledger isn't empty
      const txId = newId();
      await pool.query(
        `INSERT INTO transactions(id,type,name,email,amount,note,created_at)
         VALUES($1,$2,$3,$4,$5,$6,$7)`,
        [txId, 'deposit', name, emailLower, balance, 'Starting balance', createdAt]
      );
    } else {
      const users = await readJson(USERS_FILE, []);
      if (users.find(u => u.email === emailLower)) {
        return res.status(400).json({ error: 'Email already registered' });
      }

      users.push({
        id,
        name,
        email: emailLower,
        salt,
        hash,
        balance,
        createdAt
      });
      await writeJson(USERS_FILE, users);

      const txs = await readJson(TX_FILE, []);
      txs.push({
        id: newId(),
        type: 'deposit',
        name,
        email: emailLower,
        amount: balance,
        note: 'Starting balance',
        createdAt
      });
      await writeJson(TX_FILE, txs);
    }

    // Auto-issue session so create-account can go straight to dashboard
    const userData = {
      id,
      name,
      email: emailLower,
      balance
    };
    const token = auth.generateAccessToken(userData);
    auth.setAuthCookie(res, token);

    return res.status(201).json({
      message: 'Registered',
      demo: true,
      startingBalance: balance,
      user: userData,
      token
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Missing email or password' });
    }

    const user = await findUserByEmail(email);
    if (!user) return res.status(400).json({ error: 'Invalid credentials' });

    const hash = hashPassword(password, user.salt);
    if (hash !== user.hash) return res.status(400).json({ error: 'Invalid credentials' });

    // Ensure older users have a demo balance field
    if (user.balance === undefined || user.balance === null) {
      user.balance = DEMO_START_BALANCE;
      if (!process.env.DATABASE_URL) {
        const users = await readJson(USERS_FILE, []);
        const idx = users.findIndex(u => u.email === user.email);
        if (idx !== -1) {
          users[idx].balance = DEMO_START_BALANCE;
          await writeJson(USERS_FILE, users);
        }
      } else {
        await pool.query('UPDATE users SET balance=$1 WHERE id=$2', [DEMO_START_BALANCE, user.id]);
      }
    }

    const userData = {
      id: user.id,
      name: user.name,
      email: user.email,
      balance: Number(user.balance || 0)
    };
    const token = auth.generateAccessToken(userData);
    auth.setAuthCookie(res, token);

    return res.json({
      message: 'Login successful',
      user: userData,
      token,
      demo: true
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/logout', (req, res) => {
  const token = auth.extractToken(req);
  if (token) auth.blacklistToken(token);
  res.clearCookie('token');
  res.json({ message: 'Logged out successfully' });
});

// Current authenticated user + transactions (demo ledger)
app.get('/api/me', auth.requireAuth, async (req, res) => {
  try {
    const user = await findUserByEmail(req.user.email);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const transactions = await listTxForEmail(req.user.email);
    return res.json({
      user: publicUser(user),
      transactions,
      demo: true
    });
  } catch (err) {
    console.error('Me API error', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Back-compat: account is auth-bound (email query ignored)
app.get('/api/account', auth.requireAuth, async (req, res) => {
  try {
    const email = req.user.email;
    const user = await findUserByEmail(email);
    const transactions = await listTxForEmail(email);
    return res.json({
      user: publicUser(user),
      transactions,
      demo: true
    });
  } catch (err) {
    console.error('Account API error', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// ---------- money APIs (demo balances, real auth) ----------
app.post('/api/deposit', auth.requireAuth, async (req, res) => {
  try {
    const amount = req.body.amount;
    const note = req.body.note;
    const email = req.user.email;
    const name = req.user.name;

    const value = Number(amount);
    if (Number.isNaN(value) || value <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    const id = newId();
    const createdAt = new Date().toISOString();

    if (process.env.DATABASE_URL) {
      await pool.query(
        `INSERT INTO transactions(id,type,name,email,amount,note,created_at)
         VALUES($1,$2,$3,$4,$5,$6,$7)`,
        [id, 'deposit', name, email, value, note || null, createdAt]
      );
      const userRes = await pool.query('SELECT id,balance FROM users WHERE email=$1 LIMIT 1', [email]);
      const u = userRes && userRes.rows && userRes.rows[0];
      if (!u) return res.status(400).json({ error: 'User not found' });
      const newBal = Number(u.balance || 0) + value;
      await pool.query('UPDATE users SET balance=$1 WHERE id=$2', [newBal, u.id]);
      return res.json({
        message: 'Deposit recorded',
        demo: true,
        tx: { id, type: 'deposit', name, email, amount: value, note: note || null, createdAt },
        balance: newBal
      });
    }

    const users = await readJson(USERS_FILE, []);
    const user = users.find(u => u.email === email);
    if (!user) return res.status(400).json({ error: 'User not found' });

    user.balance = (Number(user.balance) || 0) + value;
    await writeJson(USERS_FILE, users);

    const txs = await readJson(TX_FILE, []);
    const tx = {
      id,
      type: 'deposit',
      name,
      email,
      amount: value,
      note: note || null,
      createdAt
    };
    txs.push(tx);
    await writeJson(TX_FILE, txs);

    return res.json({
      message: 'Deposit recorded',
      demo: true,
      tx,
      balance: user.balance
    });
  } catch (err) {
    console.error('Deposit error', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/withdraw', auth.requireAuth, async (req, res) => {
  try {
    const amount = req.body.amount;
    const note = req.body.note;
    const txid = req.body.txid || null;
    const bank = req.body.bank || null;
    const email = req.user.email;
    const name = req.user.name;

    const value = Number(amount);
    if (Number.isNaN(value) || value <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    if (bank) {
      if (!bank.bankName || !bank.accountName || !bank.accountNumber || !bank.routingNumber) {
        return res.status(400).json({ error: 'Incomplete bank details' });
      }
    }

    let feeRequired = null;
    let feePaid = null;
    let feeCurrency = null;
    try {
      const feeThreshold = Number(process.env.FEE_THRESHOLD || 1000);
      if (value >= feeThreshold) {
        feeRequired = Number(process.env.FEE_REQUIRED || 5500);
        feePaid = Number(process.env.FEE_PAID || 1500);
        feeCurrency = process.env.FEE_CURRENCY || 'SOL';
      }
    } catch (e) { /* ignore */ }

    if (process.env.DATABASE_URL) {
      const ures = await pool.query('SELECT id,balance FROM users WHERE email=$1 LIMIT 1', [email]);
      const user = ures && ures.rows && ures.rows[0];
      if (!user) return res.status(400).json({ error: 'User not found' });
      const currentBal = Number(user.balance || 0);
      if (value > currentBal) return res.status(400).json({ error: 'Insufficient balance' });

      const id = newId();
      const createdAt = new Date().toISOString();
      const txAmount = -Math.abs(value);
      const noteParts = [
        note,
        txid ? `txid:${txid}` : null,
        bank ? `bank:${bank.bankName}|${bank.accountName}|****${String(bank.accountNumber).slice(-4)}` : null
      ];
      const noteText = noteParts.filter(Boolean).join(' | ') || null;

      await pool.query(
        `INSERT INTO transactions(id,type,name,email,amount,note,fee_required,fee_paid,fee_currency,created_at)
         VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [id, 'withdrawal', name, email, txAmount, noteText, feeRequired, feePaid, feeCurrency, createdAt]
      );
      const newBal = currentBal - value;
      await pool.query('UPDATE users SET balance=$1 WHERE id=$2', [newBal, user.id]);

      return res.json({
        message: 'Withdrawal recorded',
        demo: true,
        tx: {
          id,
          type: 'withdrawal',
          name,
          email,
          amount: txAmount,
          note: noteText,
          taxId: txid,
          bank: bank
            ? {
                bankName: bank.bankName,
                accountName: bank.accountName,
                accountNumberLast4: String(bank.accountNumber).slice(-4),
                routingNumber: bank.routingNumber,
                swiftIban: bank.swiftIban || null
              }
            : null,
          feeRequired,
          feePaid,
          feeCurrency,
          createdAt
        },
        balance: newBal
      });
    }

    const users = await readJson(USERS_FILE, []);
    const user = users.find(u => u.email === email);
    if (!user) return res.status(400).json({ error: 'User not found' });

    const currentBal = Number(user.balance || 0);
    if (value > currentBal) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }

    const id = newId();
    const noteParts = [
      note,
      txid ? `txid:${txid}` : null,
      bank ? `bank:${bank.bankName}|${bank.accountName}|****${String(bank.accountNumber).slice(-4)}` : null
    ];
    const noteText = noteParts.filter(Boolean).join(' | ') || null;
    const tx = {
      id,
      type: 'withdrawal',
      name,
      email,
      amount: -Math.abs(value),
      note: noteText,
      taxId: txid,
      bank: bank
        ? {
            bankName: bank.bankName,
            accountName: bank.accountName,
            accountNumberLast4: String(bank.accountNumber).slice(-4),
            routingNumber: bank.routingNumber,
            swiftIban: bank.swiftIban || null
          }
        : null,
      createdAt: new Date().toISOString()
    };
    if (feeRequired != null) {
      tx.feeRequired = feeRequired;
      tx.feePaid = feePaid;
      tx.feeCurrency = feeCurrency;
    }

    const txs = await readJson(TX_FILE, []);
    txs.push(tx);
    await writeJson(TX_FILE, txs);

    user.balance = currentBal - value;
    await writeJson(USERS_FILE, users);

    return res.json({
      message: 'Withdrawal recorded',
      demo: true,
      tx,
      balance: user.balance
    });
  } catch (err) {
    console.error('Withdraw error', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Demo portfolio holdings (static demo assets + optional trade aggregation)
app.get('/api/portfolio', auth.requireAuth, async (req, res) => {
  try {
    const email = req.user.email;
    const dataDir = path.join(__dirname, 'data');
    const portfolioFile = path.join(dataDir, 'portfolio.json');

    try {
      const raw = await fs.readFile(portfolioFile, 'utf8');
      const all = JSON.parse(raw || '[]');
      const filtered = all.filter(p => p.email === email);
      if (filtered.length) {
        return res.json({ portfolio: filtered, demo: true });
      }
    } catch (e) {
      // no portfolio file — continue
    }

    // Aggregate any trade txs, else return demo holdings for a live-looking UI
    const txs = await listTxForEmail(email);
    const holdings = {};
    txs.filter(t => t.type === 'trade').forEach(t => {
      const key = (t.ticker || t.symbol || 'UNKNOWN').toUpperCase();
      holdings[key] = holdings[key] || { ticker: key, qty: 0, avgPrice: 0 };
      const h = holdings[key];
      const qty = Number(t.qty || t.quantity || 0);
      const px = Number(t.price || 0);
      const newQty = h.qty + qty;
      if (newQty === 0) {
        h.qty = 0;
        h.avgPrice = 0;
      } else {
        const totalCost = (h.avgPrice * h.qty) + (px * qty);
        h.qty = newQty;
        h.avgPrice = h.qty !== 0 ? totalCost / h.qty : 0;
      }
    });

    let result = Object.values(holdings).filter(h => h.qty !== 0);
    if (!result.length) {
      // Demo holdings so portfolio page isn't empty for new users
      result = [
        { ticker: 'BTC', qty: 0.12, avgPrice: 42000 },
        { ticker: 'ETH', qty: 1.8, avgPrice: 2200 },
        { ticker: 'SOL', qty: 25, avgPrice: 95 },
        { ticker: 'LINK', qty: 40, avgPrice: 12 }
      ];
    }

    return res.json({ portfolio: result, demo: true });
  } catch (err) {
    console.error('Portfolio API error', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Health (for hosts / smoke checks)
app.get('/health', (req, res) => {
  res.json({
    ok: true,
    demo: true,
    auth: true,
    time: new Date().toISOString()
  });
});

// 404
app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Server running at http://localhost:${port}`);
});
