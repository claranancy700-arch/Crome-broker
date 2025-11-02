// Fetches live prices from CoinGecko and shows TradingView chart + news (no API key)
(function(){
  'use strict';

  // coins to show (CoinGecko ids)
  const coins = ['bitcoin','ethereum','chainlink','cardano','ripple'];
  const vs = 'usd';
  const pricePanel = document.getElementById('pricePanel');
  const newsEl = document.getElementById('news');

  function createCoinEl(id, display){
    const el = document.createElement('div');
    el.className = 'coin';
    el.id = 'coin-' + id;
    el.innerHTML = `<div class="name">${display}</div>
                    <div class="price" id="price-${id}">—</div>
                    <div class="chg" id="chg-${id}">—</div>`;
    return el;
  }

  // init price panel
  coins.forEach(c => {
    const display = c.charAt(0).toUpperCase() + c.slice(1);
    pricePanel.appendChild(createCoinEl(c, display));
  });

  // TradingView chart embed (BTC/USD default, change symbol as needed)
  try {
    new TradingView.widget({
      autosize: true,
      symbol: 'BINANCE:BTCUSDT',
      interval: '60',
      timezone: 'Etc/UTC',
      theme: 'dark',
      style: '1',
      locale: 'en',
      container_id: 'tv_chart',
      studies: [],
      withdateranges: true,
      allow_symbol_change: true
    });
  } catch (e) {
    console.warn('TradingView init failed', e);
    const tv = document.getElementById('tv_chart');
    if (tv) tv.innerHTML = '<p class="muted">Unable to load TradingView widget.</p>';
  }

  // CoinGecko price fetch
  async function fetchPrices(){
    try {
      const ids = coins.join(',');
      const url = `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(ids)}&vs_currencies=${vs}&include_24hr_change=true`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('price fetch failed');
      const data = await res.json();
      coins.forEach(id => {
        const p = data[id] && data[id][vs] ? Number(data[id][vs]) : null;
        const ch = data[id] && typeof data[id][vs + '_24h_change'] !== 'undefined' ? Number(data[id][vs + '_24h_change']) : null;
        const pEl = document.getElementById('price-' + id);
        const cEl = document.getElementById('chg-' + id);
        if (pEl) pEl.textContent = p === null ? '—' : '$' + p.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2});
        if (cEl) {
          if (ch === null) { cEl.textContent = '—'; cEl.className = 'chg'; }
          else {
            const cls = ch >= 0 ? 'chg up' : 'chg down';
            cEl.className = cls;
            cEl.textContent = (ch >= 0 ? '+' : '') + ch.toFixed(2) + '%';
          }
        }
      });
    } catch (err) {
      console.warn('fetchPrices error', err);
    }
  }

  // CoinGecko status updates as simple news feed
  async function fetchNews(){
    try {
      const url = 'https://api.coingecko.com/api/v3/status_updates?per_page=12';
      const res = await fetch(url);
      if (!res.ok) throw new Error('news fetch failed');
      const data = await res.json();
      const updates = Array.isArray(data.status_updates) ? data.status_updates : data;
      newsEl.innerHTML = '';
      if (!updates || updates.length === 0) {
        newsEl.innerHTML = '<li class="muted">No recent updates.</li>';
        return;
      }
      updates.forEach(u => {
        const li = document.createElement('li');
        const when = new Date(u.created_at || u.updated_at || Date.now()).toLocaleString();
        const title = u.title || u.description || (u.category ? u.category : 'Update');
        const link = u.user && u.user.twitter_username ? `https://twitter.com/${u.user.twitter_username}` : (u.project && u.project.url ? u.project.url : '#');
        li.innerHTML = `<div style="font-weight:700">${title}</div><div class="muted" style="font-size:0.9rem">${when}</div><div style="margin-top:6px">${u.description ? u.description.substring(0,240) : ''} ${link && link!=='#' ? `<div style="margin-top:6px"><a href="${link}" target="_blank" rel="noopener noreferrer">Source</a></div>` : ''}</div>`;
        newsEl.appendChild(li);
      });
    } catch (err) {
      console.warn('fetchNews error', err);
    }
  }

  // start polling
  fetchPrices();
  fetchNews();
  setInterval(fetchPrices, 5000); // prices every 5s
  setInterval(fetchNews, 60000); // news every 60s
})();