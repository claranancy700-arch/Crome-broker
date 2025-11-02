// Extended market page: Watchlist + Alerts, Correlation matrix, Trade Ideas, Micro order-book, On-chain timeline
(function () {
  'use strict';

  // --- basic helpers & config ---
  const coinsDefault = ['bitcoin','ethereum','chainlink','cardano','ripple','litecoin','dogecoin'];
  const cgBase = 'https://api.coingecko.com/api/v3';
  const watchKey = 'sb_watchlist_v1';
  const alertsKey = 'sb_watch_alerts_v1';

  // DOM refs
  const watchlistEl = document.getElementById('watchlist');
  const addSymbolInput = document.getElementById('addSymbol');
  const addBtn = document.getElementById('addBtn');
  const alertsBanner = document.getElementById('alertsBanner');
  const depthSymbol = document.getElementById('depthSymbol');
  const depthToggle = document.getElementById('depthToggle');
  const depthCanvas = document.getElementById('depthCanvas');
  const depthMeta = document.getElementById('depthMeta');
  const corrMatrixEl = document.getElementById('corrMatrix');
  const corrCountSel = document.getElementById('corrCount');
  const ideasEl = document.getElementById('ideas');
  const timelineEl = document.getElementById('timeline');

  // state
  let watchlist = loadJSON(watchKey) || coinsDefault.map(id => ({ id, label: prettyId(id) }));
  let alerts = loadJSON(alertsKey) || {}; // { id: { above: num, below: num } }
  let priceCache = {}; // {id: {usd, change_24h}}
  let depthWs = null;

  // --- TradingView widget init ---
  try {
    new TradingView.widget({
      autosize: true,
      symbol: 'BINANCE:BTCUSDT',
      interval: '60',
      timezone: 'Etc/UTC',
      theme: 'dark',
      container_id: 'tv_chart',
      allow_symbol_change: true
    });
  } catch (e) {
    console.warn('TradingView init failed', e);
    const tv = document.getElementById('tv_chart');
    if (tv) tv.innerHTML = '<p class="small muted">Unable to load TradingView widget.</p>';
  }

  // --- Watchlist UI & persistence ---
  function prettyId(id) {
    return id.split('-').map(p => p[0].toUpperCase() + p.slice(1)).join(' ');
  }
  function saveJSON(key, v) { try { localStorage.setItem(key, JSON.stringify(v)); } catch(e){} }
  function loadJSON(key) { try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch(e){ return null; } }

  function renderWatchlist() {
    watchlistEl.innerHTML = '';
    watchlist.forEach(item => {
      const row = document.createElement('div');
      row.className = 'watch-item';
      row.innerHTML = `<div style="min-width:120px"><strong>${item.label}</strong><div class="small muted">${item.id}</div></div>
                       <div style="display:flex;gap:8px;align-items:center">
                         <div id="price-${item.id}" class="small">—</div>
                         <button data-id="${item.id}" class="btn tiny remove">Remove</button>
                         <button data-id="${item.id}" class="btn tiny alert">Alert</button>
                       </div>`;
      watchlistEl.appendChild(row);
    });
    // populate depth symbol select
    depthSymbol.innerHTML = '';
    watchlist.forEach(w => {
      const opt = document.createElement('option');
      opt.value = w.id;
      opt.textContent = w.label + ' / USD';
      depthSymbol.appendChild(opt);
    });
  }

  addBtn.addEventListener('click', async () => {
    const raw = (addSymbolInput.value || '').trim();
    if (!raw) return;
    addBtn.disabled = true;
    try {
      // try CoinGecko search to resolve id
      const q = encodeURIComponent(raw);
      const res = await fetch(`${cgBase}/search?query=${q}`);
      const data = await res.json();
      const found = (data.coins || []).find(c => c.symbol.toLowerCase() === raw.toLowerCase() || c.id.toLowerCase() === raw.toLowerCase()) || data.coins && data.coins[0];
      if (!found) {
        alert('Coin not found on CoinGecko.');
      } else {
        const id = found.id;
        if (!watchlist.some(w => w.id === id)) {
          watchlist.unshift({ id, label: found.name || prettyId(id) });
          saveJSON(watchKey, watchlist);
          renderWatchlist();
          fetchPricesFor([id]);
        }
      }
    } catch (e) {
      console.warn('add coin failed', e);
    } finally {
      addBtn.disabled = false;
      addSymbolInput.value = '';
    }
  });

  watchlistEl.addEventListener('click', (ev) => {
    const rm = ev.target.closest('.remove');
    const al = ev.target.closest('.alert');
    if (rm) {
      const id = rm.dataset.id;
      watchlist = watchlist.filter(w => w.id !== id);
      saveJSON(watchKey, watchlist);
      renderWatchlist();
    } else if (al) {
      const id = al.dataset.id;
      configureAlert(id);
    }
  });

  function configureAlert(id) {
    const cfg = alerts[id] || { above: null, below: null };
    const above = prompt('Alert when price rises above (USD). Leave blank to ignore.', cfg.above || '');
    const below = prompt('Alert when price falls below (USD). Leave blank to ignore.', cfg.below || '');
    alerts[id] = { above: above ? Number(above) : null, below: below ? Number(below) : null };
    saveJSON(alertsKey, alerts);
    showAlertBanner('Alerts saved (local only)');
  }

  function showAlertBanner(text) {
    alertsBanner.innerHTML = `<div class="alert-banner">${text}</div>`;
    setTimeout(() => { alertsBanner.innerHTML = ''; }, 4200);
  }

  // --- Price polling & alerts ---
  async function fetchPricesFor(ids) {
    if (!ids || ids.length === 0) return;
    const list = ids.join(',');
    try {
      const res = await fetch(`${cgBase}/simple/price?ids=${encodeURIComponent(list)}&vs_currencies=usd&include_24hr_change=true`);
      const data = await res.json();
      ids.forEach(id => {
        const obj = data[id];
        if (obj && obj.usd !== undefined) {
          priceCache[id] = { usd: obj.usd, chg: obj.usd_24h_change || 0 };
          const el = document.getElementById('price-' + id);
          if (el) el.textContent = '$' + Number(obj.usd).toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2});
        }
      });
    } catch (e) {
      console.warn('fetchPricesFor failed', e);
    }
  }

  async function pollAllPrices() {
    const ids = watchlist.map(w => w.id);
    if (ids.length === 0) return;
    try {
      await fetchPricesFor(ids);
      checkAlerts();
      updateCorrelationAndIdeas(); // refresh based on latest prices
    } catch (e) {
      console.warn('pollAllPrices', e);
    }
  }

  function checkAlerts() {
    if (Notification && Notification.permission === 'default') Notification.requestPermission();
    watchlist.forEach(w => {
      const cfg = alerts[w.id];
      const p = priceCache[w.id] && priceCache[w.id].usd;
      if (!cfg || p == null) return;
      if (cfg.above && p >= cfg.above) triggerAlert(w, `Price above $${cfg.above}: ${format(p)}`);
      if (cfg.below && p <= cfg.below) triggerAlert(w, `Price below $${cfg.below}: ${format(p)}`);
    });
  }

  let lastAlerted = {};
  function triggerAlert(w, text) {
    // avoid repeated alerts within 2 minutes
    const key = `${w.id}:${text}`;
    if (lastAlerted[key] && (Date.now() - lastAlerted[key] < 120000)) return;
    lastAlerted[key] = Date.now();
    showAlertBanner(`${w.label}: ${text}`);
    if (Notification && Notification.permission === 'granted') {
      new Notification(`${w.label} alert`, { body: text });
    }
  }

  function format(n) { return '$' + Number(n).toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2}); }

  // --- Correlation matrix & Trade Ideas ---
  async function fetchChartPrices(id, days = 7) {
    try {
      const res = await fetch(`${cgBase}/coins/${encodeURIComponent(id)}/market_chart?vs_currency=usd&days=${days}&interval=hourly`);
      if (!res.ok) return null;
      const data = await res.json();
      // data.prices = [[ts, price], ...]
      return (data.prices || []).map(p => p[1]);
    } catch (e) {
      return null;
    }
  }

  function pearson(a, b) {
    const n = Math.min(a.length, b.length);
    if (n === 0) return 0;
    let sa = 0, sb = 0, sa2 = 0, sb2 = 0, sab = 0;
    for (let i = 0; i < n; i++) {
      const x = a[i], y = b[i];
      sa += x; sb += y; sa2 += x*x; sb2 += y*y; sab += x*y;
    }
    const num = (n * sab) - (sa * sb);
    const den = Math.sqrt((n * sa2 - sa*sa) * (n * sb2 - sb*sb));
    if (den === 0) return 0;
    return num / den;
  }

  async function updateCorrelationAndIdeas() {
    const N = Number(corrCountSel.value) || 5;
    const ids = watchlist.slice(0, N).map(w => w.id);
    if (ids.length < 2) {
      corrMatrixEl.innerHTML = '<div class="small muted">Add more coins to watchlist for correlations.</div>';
      return;
    }
    corrMatrixEl.innerHTML = '<div class="small muted">Computing correlations…</div>';
    // fetch charts in parallel
    const charts = await Promise.all(ids.map(id => fetchChartPrices(id, 7)));
    // compute returns (log returns) and correlations
    const series = charts.map(arr => {
      if (!arr) return [];
      const r = [];
      for (let i = 1; i < arr.length; i++) r.push(Math.log(arr[i] / arr[i-1]));
      return r;
    });
    // build matrix
    corrMatrixEl.innerHTML = '';
    const grid = document.createElement('div');
    grid.className = 'matrix';
    const size = ids.length;
    grid.style.gridTemplateColumns = `repeat(${size}, 1fr)`;
    // create cells
    for (let i = 0; i < size; i++) {
      for (let j = 0; j < size; j++) {
        const cell = document.createElement('div');
        cell.className = 'cell';
        if (i === j) {
          cell.style.background = '#fff';
          cell.style.color = '#000';
          cell.textContent = ids[i].toUpperCase();
        } else {
          const a = series[i] || [], b = series[j] || [];
          const c = pearson(a, b) || 0;
          const pct = Math.round(c * 100);
          // color scale: negative red, positive green
          const g = Math.round(200 * Math.max(0, c));
          const r = Math.round(200 * Math.max(0, -c));
          cell.style.background = `rgb(${r},${g},80)`;
          cell.textContent = (pct >= 0 ? '+' : '') + pct + '%';
          cell.title = `${ids[i]} ↔ ${ids[j]} : ${c.toFixed(3)}`;
          cell.addEventListener('click', () => {
            // open TradingView compare for the pair
            const symbol = ids[i].toUpperCase() + ' / ' + ids[j].toUpperCase();
            alert('Pair compare (placeholder): ' + symbol);
          });
        }
        grid.appendChild(cell);
      }
    }
    corrMatrixEl.appendChild(grid);

    // simple Trade Ideas generator (rule-based)
    ideasEl.innerHTML = '';
    for (let k = 0; k < ids.length; k++) {
      const id = ids[k];
      const p = priceCache[id] && priceCache[id].usd;
      const ch24 = priceCache[id] && priceCache[id].chg;
      const idea = generateIdea(id, p, ch24);
      const li = document.createElement('li');
      li.innerHTML = `<strong>${prettyId(id)}</strong>: ${idea}`;
      ideasEl.appendChild(li);
    }
  }

  function generateIdea(id, price, ch24) {
    if (!price) return 'No price data.';
    if (ch24 >= 15) return `Strong momentum — 24h +${ch24.toFixed(1)}%. Consider small position to ride momentum (use tight stop).`;
    if (ch24 >= 5) return `Momentum pickup — 24h +${ch24.toFixed(1)}%. Watch volume for confirmation.`;
    if (ch24 <= -12) return `Sharp drop — 24h ${ch24.toFixed(1)}%. Possible mean‑reversion candidate; consider scaling in if fundamentals ok.`;
    if (ch24 <= -4) return `Dip spotted — 24h ${ch24.toFixed(1)}%. Evaluate position sizing and risk.`;
    return `No strong signal — 24h ${ch24 ? ch24.toFixed(1) + '%' : '—'}.`;
  }

  // --- Micro order-book using Binance websocket ---
  function binanceSymbolFromId(id) {
    // common mapping; fallback will try id -> USD(T)
    const map = { bitcoin: 'BTCUSDT', ethereum: 'ETHUSDT', chainlink: 'LINKUSDT', cardano: 'ADAUSDT', ripple: 'XRPUSDT', litecoin: 'LTCUSDT', dogecoin: 'DOGEUSDT' };
    return map[id] || (id.replace(/-/g,'').toUpperCase() + 'USDT');
  }

  let depthCanvasCtx = depthCanvas.getContext ? depthCanvas.getContext('2d') : null;

  function resizeCanvas() {
    if (!depthCanvas) return;
    depthCanvas.width = depthCanvas.clientWidth * devicePixelRatio;
    depthCanvas.height = depthCanvas.clientHeight * devicePixelRatio;
    if (depthCanvasCtx) depthCanvasCtx.scale(devicePixelRatio, devicePixelRatio);
  }
  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

  function renderDepth(bids, asks) {
    if (!depthCanvasCtx) return;
    const w = depthCanvas.clientWidth, h = depthCanvas.clientHeight;
    depthCanvasCtx.clearRect(0,0,w,h);
    // pick top N
    const nb = bids.slice(0,16), na = asks.slice(0,16);
    // compute cumulative
    let maxVol = 1;
    const bCum = nb.map((b,i)=> { const v = Number(b[1]); if (v>maxVol) maxVol=v; return v; });
    const aCum = na.map((a,i)=> { const v=Number(a[1]); if (v>maxVol) maxVol=v; return v; });
    // draw bids left (green), asks right (red)
    const colW = (w - 20) / 2;
    const pad = 8;
    depthCanvasCtx.font = '12px Inter, system-ui, Arial';
    nb.forEach((b,i) => {
      const vol = Number(b[1]); const price = Number(b[0]);
      const hgt = Math.max(4, (vol / maxVol) * (h - 40));
      const y = h - pad - (i+1) * (hgt + 2);
      depthCanvasCtx.fillStyle = 'rgba(34,180,90,0.9)';
      depthCanvasCtx.fillRect(pad, y, (vol / maxVol) * colW, hgt);
      depthCanvasCtx.fillStyle = '#fff';
      depthCanvasCtx.fillText(price.toFixed(2), pad + 4, y + 12);
    });
    na.forEach((a,i) => {
      const vol = Number(a[1]); const price = Number(a[0]);
      const hgt = Math.max(4, (vol / maxVol) * (h - 40));
      const y = h - pad - (i+1) * (hgt + 2);
      depthCanvasCtx.fillStyle = 'rgba(200,40,60,0.9)';
      depthCanvasCtx.fillRect(w - pad - (vol / maxVol) * colW, y, (vol / maxVol) * colW, hgt);
      depthCanvasCtx.fillStyle = '#fff';
      depthCanvasCtx.fillText(price.toFixed(2), w - pad - 60, y + 12);
    });
  }

  async function connectDepthFor(id) {
    try {
      disconnectDepth();
      const sym = binanceSymbolFromId(id).toLowerCase();
      const url = `wss://stream.binance.com:9443/ws/${sym}@depth20@100ms`;
      depthMeta.textContent = 'Connecting to ' + sym.toUpperCase();
      depthWs = new WebSocket(url);
      depthWs.addEventListener('message', ev => {
        const data = JSON.parse(ev.data);
        const bids = data.bids || [];
        const asks = data.asks || [];
        renderDepth(bids, asks);
        depthMeta.textContent = `${sym.toUpperCase()} • Bids:${bids.length} Asks:${asks.length} last update ${new Date().toLocaleTimeString()}`;
      });
      depthWs.addEventListener('open', () => depthMeta.textContent = 'Connected: ' + sym.toUpperCase());
      depthWs.addEventListener('close', () => depthMeta.textContent = 'Disconnected');
      depthWs.addEventListener('error', (e) => depthMeta.textContent = 'Depth stream error');
    } catch (e) {
      depthMeta.textContent = 'Orderbook connect failed';
      console.warn('connectDepthFor', e);
    }
  }

  function disconnectDepth() {
    if (depthWs) try { depthWs.close(); } catch(e){}
    depthWs = null;
  }

  depthToggle.addEventListener('click', () => {
    const id = depthSymbol.value;
    if (!id) return;
    if (depthWs) {
      disconnectDepth();
      depthToggle.textContent = 'Connect';
    } else {
      connectDepthFor(id);
      depthToggle.textContent = 'Disconnect';
    }
  });

  // --- On-chain timeline (CoinGecko status + mock large transfers) ---
  async function fetchChainUpdates() {
    try {
      timelineEl.innerHTML = '<div class="small muted">Loading chain updates…</div>';
      const res = await fetch(`${cgBase}/status_updates?per_page=12`);
      const data = await res.json();
      const updates = Array.isArray(data.status_updates) ? data.status_updates : [];
      timelineEl.innerHTML = '';
      updates.forEach(u => {
        const when = new Date(u.created_at || u.updated_at || Date.now()).toLocaleString();
        const el = document.createElement('div');
        el.style.padding = '8px';
        el.innerHTML = `<div style="font-weight:700">${u.title || u.category || 'Update'}</div><div class="small muted">${when}</div><div style="margin-top:6px">${u.description ? u.description.substring(0,160) : ''}</div>`;
        timelineEl.appendChild(el);
      });
      // add a couple of mock large transfers to make timeline interesting
      const mock = generateMockTransfers();
      mock.forEach(m => {
        const el = document.createElement('div');
        el.style.padding = '8px';
        el.innerHTML = `<div style="font-weight:700">Large transfer — ${m.symbol.toUpperCase()}</div><div class="small muted">${m.when}</div><div style="margin-top:6px">Tx: ${m.tx} • Amount: ${m.amount}</div>`;
        timelineEl.appendChild(el);
      });
    } catch (e) {
      console.warn('fetchChainUpdates', e);
      timelineEl.innerHTML = '<div class="small muted">Unable to load chain updates.</div>';
    }
  }

  function generateMockTransfers() {
    return [
      { symbol: 'eth', when: new Date(Date.now()-3600*1000).toLocaleString(), tx: '0x' + Math.random().toString(16).slice(2,12), amount: '1,200 ETH' },
      { symbol: 'btc', when: new Date(Date.now()-7200*1000).toLocaleString(), tx: '0x' + Math.random().toString(16).slice(2,12), amount: '250 BTC' }
    ];
  }

  // --- Initialization & polling loops ---
  function initUI() {
    renderWatchlist();
    pollAllPrices();
    fetchChainUpdates();
    updateCorrelationAndIdeas();
  }

  // periodic tasks
  setInterval(pollAllPrices, 5000); // prices + alerts
  setInterval(fetchChainUpdates, 60000); // timeline refresh
  setInterval(updateCorrelationAndIdeas, 12000);

  // initial price load for watchlist
  (async function initialLoad() {
    const ids = watchlist.map(w => w.id);
    await fetchPricesFor(ids);
    renderWatchlist();
    initUI();
  })();

  // utility: request Notification permission once on user gesture
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && Notification && Notification.permission === 'default') Notification.requestPermission(); });

})();