const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');
const app = express();
const port = process.env.PORT || 3000;
const pool = require('./db');

// Example route
app.get('/users', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM users');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error');
  }
});

// parse JSON body
app.use(express.json());

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

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// add basic dashboard route (requires ?user=NAME)
app.get('/dashboard-basic', (req, res) => {
  const user = req.query.user;
  if (!user) return res.redirect('/login');
  res.sendFile(path.join(__dirname, 'public', 'dashboard-basic.html'));
});

// add deposit page route
app.get('/deposit', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'deposit.html'));
});

// Withdraw page route
app.get('/withdraw', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'withdraw.html'));
});

// add withdraw processing page route
app.get('/withdraw-processing', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'withdraw-processing.html'));
});

// market page
app.get('/market', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'market.html'));
});

// serve portfolio page
app.get('/portfolio', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'portfolio.html'));
});

// simple registration API (demo only)
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

    // ensure data directory
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

// simple login API (demo only)
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log('Login attempt:', { email }); // debug

    if (!email || !password) {
      console.log('Missing email or password');
      return res.status(400).json({ error: 'Missing email or password' });
    }

    const usersFile = path.join(__dirname, 'data', 'users.json');
    let users = [];
    try {
      const raw = await fs.readFile(usersFile, 'utf8');
      users = JSON.parse(raw || '[]');
    } catch (e) {
      if (e && e.code === 'ENOENT') {
        // no users file yet — treat as empty list (login will fail with invalid credentials)
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
    return res.json({ message: 'Login successful', user: { id: user.id, name: user.name, email: user.email } });
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

app.listen(port, '0.0.0.0', () => {
  console.log(`Server running at http://localhost:${port}`);
});