// interactive dashboard-basic: polls /api/account for live updates and animates UI
(function () {
  'use strict';

  const balanceEl = document.getElementById('balanceVal');
  const lastRefEl = document.getElementById('lastRef');
  const txList = document.getElementById('txList');
  const sparkPath = document.getElementById('sparkPath');
  const priceEl = document.getElementById('price');
  const priceChangeEl = document.getElementById('priceChange');
  const userNameEl = document.getElementById('userName');
  const refreshBtn = document.getElementById('refreshNow');
  const cardAnims = Array.from(document.querySelectorAll('.card-anim'));

  let polling = null;
  let lastBalance = 0;

  function revealCards() {
    cardAnims.forEach((c, i) => {
      setTimeout(() => { c.style.opacity = '1'; c.style.transform = 'none'; }, i * 100);
    });
  }

  function formatCurrency(v) {
    return '$' + Number(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function countUp(el, from, to, ms = 700) {
    const start = performance.now();
    function step(now) {
      const t = Math.min(1, (now - start) / ms);
      const ease = 1 - Math.pow(1 - t, 3);
      const val = from + (to - from) * ease;
      el.textContent = formatCurrency(val);
      if (t < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  function drawSparkline(values) {
    if (!values || values.length < 2) {
      sparkPath.setAttribute('d', '');
      priceEl.textContent = '—';
      priceChangeEl.textContent = '—';
      return;
    }
    const w = 200, h = 40;
    const max = Math.max(...values), min = Math.min(...values);
    const range = Math.max(1e-6, max - min);
    const step = w / (values.length - 1);
    let d = '';
    values.forEach((v, i) => {
      const x = i * step;
      const y = h - ((v - min) / range) * h;
      d += (i === 0 ? 'M' : 'L') + x.toFixed(2) + ' ' + y.toFixed(2) + ' ';
    });
    sparkPath.setAttribute('d', d.trim());
    const len = sparkPath.getTotalLength ? sparkPath.getTotalLength() : 0;
    if (len) {
      sparkPath.style.transition = 'none';
      sparkPath.style.strokeDasharray = len;
      sparkPath.style.strokeDashoffset = len;
      requestAnimationFrame(() => {
        sparkPath.style.transition = 'stroke-dashoffset 700ms ease-out';
        sparkPath.style.strokeDashoffset = '0';
      });
    }
  }

  function populateTransactions(transactions) {
    txList.innerHTML = '';
    if (!transactions || transactions.length === 0) {
      const li = document.createElement('li');
      li.className = 'muted';
      li.textContent = 'No transactions yet.';
      txList.appendChild(li);
      return;
    }
    transactions.slice(0, 12).forEach(tx => {
      const li = document.createElement('li');
      li.innerHTML = `<div class="meta"><strong>${tx.type.charAt(0).toUpperCase() + tx.type.slice(1)}</strong><div class="muted">${new Date(tx.createdAt).toLocaleString()}</div></div>
                      <div class="amount">${tx.amount >= 0 ? '+' : '-'}$${Number(tx.amount).toFixed(2)}</div>`;
      txList.appendChild(li);
    });
  }

  async function fetchAccount(email) {
    const url = '/api/account?email=' + encodeURIComponent(email);
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error('Failed to fetch account');
    return res.json();
  }

  async function refreshOnce(email) {
    try {
      const data = await fetchAccount(email);
      const user = data.user || null;
      const transactions = Array.isArray(data.transactions) ? data.transactions : [];

      if (user && user.name) userNameEl.textContent = user.name;

      const bal = Number((user && user.balance) || 0);

      // animate balance from lastBalance to new balance
      countUp(balanceEl, lastBalance, bal, 900);
      lastBalance = bal;

      // populate tx list
      populateTransactions(transactions);

      // build series: cumulative balance over time (oldest->newest)
      if (transactions.length) {
        const sorted = transactions.slice().sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        let cum = 0;
        const series = sorted.map(t => { cum += Number(t.amount); return cum; });
        drawSparkline(series);
        const last = series[series.length - 1];
        const prev = series.length > 1 ? series[series.length - 2] : series[0];
        const change = prev === 0 ? 0 : ((last - prev) / Math.abs(prev)) * 100;
        priceEl.textContent = formatCurrency(last);
        priceChangeEl.textContent = (change >= 0 ? '+' : '') + change.toFixed(2) + '%';
        priceChangeEl.style.color = change >= 0 ? '#bfe9c7' : '#ffd7da';
      } else {
        drawSparkline(null);
      }

      lastRefEl.textContent = 'Last update: ' + new Date().toLocaleTimeString();
    } catch (err) {
      console.error('Refresh failed', err);
      lastRefEl.textContent = 'Last update: failed';
    }
  }

  function startPolling(email, interval = 2500) {
    if (polling) clearInterval(polling);
    // initial immediate refresh
    refreshOnce(email);
    polling = setInterval(() => refreshOnce(email), interval);
  }

  // wire up refresh button
  refreshBtn.addEventListener('click', () => {
    const params = new URLSearchParams(location.search);
    const email = params.get('email') || params.get('user') || '';
    if (!email) return window.location = '/login';
    refreshOnce(email);
  });

  // wire deposit/withdraw quick actions (preserve query)
  const depositBtn = document.getElementById('depositBtn');
  const withdrawBtn = document.getElementById('withdrawBtn');
  (function wireQuick() {
    const params = new URLSearchParams(location.search);
    const email = params.get('email') || params.get('user') || '';
    const userParam = params.get('user') || '';
    if (email) {
      if (depositBtn) depositBtn.href = '/deposit?email=' + encodeURIComponent(email) + '&user=' + encodeURIComponent(userParam);
      if (withdrawBtn) withdrawBtn.href = '/withdraw?email=' + encodeURIComponent(email) + '&user=' + encodeURIComponent(userParam);
    }
  })();

  // init: require email query, otherwise redirect to login
  function init() {
    const params = new URLSearchParams(location.search);
    const email = params.get('email') || params.get('user') || '';
    const userParam = params.get('user') || '';

    if (!email) {
      window.location = '/login';
      return;
    }

    if (userParam) userNameEl.textContent = decodeURIComponent(userParam);

    revealInitial();
    startPolling(email, 2500);
  }

  // reveal UI cards with small stagger
  function revealInitial() {
    const cards = Array.from(document.querySelectorAll('.card-anim'));
    cards.forEach((c, i) => setTimeout(() => { c.style.opacity = '1'; c.style.transform = 'none'; }, i * 120));
  }

  // start
  document.addEventListener('DOMContentLoaded', init);
  if (document.readyState !== 'loading') init();

})();