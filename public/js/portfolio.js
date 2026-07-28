// Portfolio — auth + demo holdings; shared money formatting
(function () {
  'use strict';

  const ownerEl = document.getElementById('owner');
  const totalEl = document.getElementById('totalValue');
  const body = document.getElementById('holdingsBody');

  function fmt(v) {
    return window.money ? money.format(v) : '$' + Number(v || 0).toFixed(2);
  }
  function fmtDelta(v) {
    return window.money ? money.formatDelta(v) : (Number(v) >= 0 ? '+' : '') + fmt(Math.abs(v));
  }
  function fmtQty(v) {
    return window.money ? money.formatQty(v) : String(Number(v || 0));
  }

  // Portfolio total value mirrors account balance (same figure as dashboard)
  let accountBalance = 0;

  function setTotalFromBalance(bal) {
    accountBalance = Number(bal) || 0;
    if (totalEl) totalEl.textContent = fmt(accountBalance);
  }

  function renderHoldings(list, prices) {
    if (!body) return;
    body.innerHTML = '';
    if (!list || list.length === 0) {
      body.innerHTML = '<tr><td colspan="6" class="empty">No holdings found.</td></tr>';
      // Keep total locked to account balance, not holdings sum
      if (totalEl) totalEl.textContent = fmt(accountBalance);
      return;
    }
    list.forEach((h) => {
      const ticker = (h.ticker || h.symbol || 'UNK').toUpperCase();
      const qty = Number(h.qty || 0);
      const avg = Number(h.avgPrice || h.avg || 0);
      const market = (prices && prices[ticker]) || Number(h.marketPrice || 0);
      const px = market || avg || 0;
      const value = qty * px;
      const pl = value - qty * avg;
      const tr = document.createElement('tr');
      tr.innerHTML =
        '<td><strong>' +
        ticker +
        '</strong></td>' +
        '<td class="num">' +
        fmtQty(qty) +
        '</td>' +
        '<td class="num">' +
        fmt(avg) +
        '</td>' +
        '<td class="num">' +
        (market ? fmt(market) : '<span class="muted">—</span>') +
        '</td>' +
        '<td class="num">' +
        fmt(value) +
        '</td>' +
        '<td class="num ' +
        (pl >= 0 ? 'amount-pos' : 'amount-neg') +
        '">' +
        fmtDelta(pl) +
        '</td>';
      body.appendChild(tr);
    });
    // Total value = account balance (matches dashboard), not sum of row values
    if (totalEl) totalEl.textContent = fmt(accountBalance);
  }

  async function fetchMarketPrices(tickers) {
    const mapping = {
      BTC: 'bitcoin',
      ETH: 'ethereum',
      LINK: 'chainlink',
      ADA: 'cardano',
      XRP: 'ripple',
      SOL: 'solana',
      USDT: 'tether'
    };
    const ids = tickers.map((t) => mapping[t] || '').filter(Boolean).join(',');
    if (!ids) return {};
    try {
      const res = await fetch(
        'https://api.coingecko.com/api/v3/simple/price?ids=' +
          encodeURIComponent(ids) +
          '&vs_currencies=usd'
      );
      if (!res.ok) return {};
      const data = await res.json();
      const prices = {};
      for (const [id, obj] of Object.entries(data)) {
        const symbol = Object.keys(mapping).find((k) => mapping[k] === id);
        if (symbol) prices[symbol] = Number(obj.usd || 0);
      }
      return prices;
    } catch (e) {
      return {};
    }
  }

  async function loadPortfolio() {
    if (!window.auth || !auth.isAuthenticated()) {
      window.location.href = '/login?redirect=/portfolio';
      return;
    }

    const cached = auth.getUser();
    if (ownerEl) ownerEl.textContent = (cached && (cached.name || cached.email)) || '…';
    if (cached && cached.balance != null) setTotalFromBalance(cached.balance);
    else if (totalEl) totalEl.textContent = fmt(0);

    try {
      const me = await auth.fetchMe();
      if (ownerEl) ownerEl.textContent = me.user.name || me.user.email;
      setTotalFromBalance(me.user && me.user.balance);

      const res = await auth.apiRequest('/api/portfolio');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load portfolio');

      const list = Array.isArray(data.portfolio) ? data.portfolio : [];
      const tickers = list
        .map((h) => (h.ticker || h.symbol || '').toUpperCase())
        .filter(Boolean);
      const prices = await fetchMarketPrices(tickers);
      renderHoldings(list, prices);
    } catch (err) {
      console.warn(err);
      if (body) {
        body.innerHTML =
          '<tr><td colspan="6" class="empty">' +
          (err.message || 'Failed to load portfolio') +
          '</td></tr>';
      }
      // Still show account balance if we have it
      if (totalEl) totalEl.textContent = fmt(accountBalance);
    }
  }

  document.addEventListener('DOMContentLoaded', loadPortfolio);
  if (document.readyState !== 'loading') loadPortfolio();
})();
