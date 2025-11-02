// portfolio page: shows user's holdings (mock when ?mock=1). Remove mock behavior later.
(function () {
  'use strict';

  const params = new URLSearchParams(location.search);
  const email = params.get('email') || '';
  const user = params.get('user') || '';
  const mock = params.get('mock') === '1';

  const ownerEl = document.getElementById('owner');
  const totalEl = document.getElementById('totalValue');
  const body = document.getElementById('holdingsBody');

  function formatCurrency(v) {
    return '$' + Number(v || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function renderHoldings(list, prices = {}) {
    body.innerHTML = '';
    if (!list || list.length === 0) {
      body.innerHTML = '<tr><td colspan="6" class="empty">No holdings found.</td></tr>';
      totalEl.textContent = formatCurrency(0);
      return;
    }
    let total = 0;
    list.forEach(h => {
      const ticker = (h.ticker || h.symbol || 'UNK').toUpperCase();
      const qty = Number(h.qty || 0);
      const avg = Number(h.avgPrice || h.avg || 0);
      const market = prices[ticker] || Number(h.marketPrice || 0);
      const value = qty * (market || avg || 0);
      const pl = value - (qty * avg);
      total += value;
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${ticker}</td>
                      <td>${qty}</td>
                      <td>${formatCurrency(avg)}</td>
                      <td>${market ? formatCurrency(market) : '<span class="muted">—</span>'}</td>
                      <td>${formatCurrency(value)}</td>
                      <td style="color:${pl>=0? '#bfe9c7' : '#ffd7da'}">${pl>=0? '+' : ''}${formatCurrency(pl)}</td>`;
      body.appendChild(tr);
    });
    totalEl.textContent = formatCurrency(total);
  }

  async function fetchMarketPrices(tickers) {
    // simple implementation: maps tickers to CoinGecko ids for common symbols (extend later)
    const mapping = { 'BTC':'bitcoin','ETH':'ethereum','LINK':'chainlink','ADA':'cardano','XRP':'ripple','USDT':'tether' };
    const ids = tickers.map(t => mapping[t] || '').filter(Boolean).join(',');
    if (!ids) return {};
    try {
      const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(ids)}&vs_currencies=usd`);
      if (!res.ok) return {};
      const data = await res.json();
      const prices = {};
      for (const [id, obj] of Object.entries(data)) {
        const symbol = Object.keys(mapping).find(k => mapping[k] === id);
        if (symbol) prices[symbol] = Number(obj.usd || 0);
      }
      return prices;
    } catch (e) {
      console.warn('Market price fetch failed', e);
      return {};
    }
  }

  async function loadPortfolio() {
    ownerEl.textContent = user || email || 'Unknown';

    if (mock) {
      // demo/mock holdings — remove mock param in production
      const demo = [
        { ticker: 'BTC', qty: 0.125, avgPrice: 36000, marketPrice: 0 },
        { ticker: 'ETH', qty: 1.5, avgPrice: 1800, marketPrice: 0 },
        { ticker: 'LINK', qty: 40, avgPrice: 7.2, marketPrice: 0 },
        { ticker: 'ADA', qty: 250, avgPrice: 0.45, marketPrice: 0 }
      ];
      const tickers = demo.map(d => d.ticker);
      const prices = await fetchMarketPrices(tickers);
      renderHoldings(demo, prices);
      return;
    }

    // try server API first
    try {
      const url = '/api/portfolio' + (email ? ('?email=' + encodeURIComponent(email)) : '');
      const res = await fetch(url);
      if (!res.ok) throw new Error('portfolio fetch failed');
      const data = await res.json();
      const list = Array.isArray(data.portfolio) ? data.portfolio : [];
      const tickers = list.map(h => (h.ticker || h.symbol || '').toUpperCase()).filter(Boolean);
      const prices = await fetchMarketPrices(tickers);
      renderHoldings(list, prices);
      return;
    } catch (err) {
      console.warn('Portfolio load failed, falling back to mock', err);
      // fallback to mock so UI still useful during development
      const demo = [
        { ticker: 'BTC', qty: 0.05, avgPrice: 42000, marketPrice: 0 },
        { ticker: 'ETH', qty: 2.3, avgPrice: 1500, marketPrice: 0 }
      ];
      const tickers = demo.map(d => d.ticker);
      const prices = await fetchMarketPrices(tickers);
      renderHoldings(demo, prices);
    }
  }

  document.addEventListener('DOMContentLoaded', loadPortfolio);
  if (document.readyState !== 'loading') loadPortfolio();

})();