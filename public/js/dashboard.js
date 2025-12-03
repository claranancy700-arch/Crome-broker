// dashboard UI + animation logic
function initDashboardUI() {
  'use strict';

  const cards = Array.from(document.querySelectorAll('.card-anim'));
  const balanceEl = document.getElementById('balance');
  const lastUpdateEl = document.getElementById('lastUpdate');
  const txList = document.getElementById('txList');
  const sparkPath = document.getElementById('sparkPath');
  const priceEl = document.getElementById('price');
  const priceChangeEl = document.getElementById('priceChange');
  const userNameEl = document.getElementById('userName');

  // stagger reveal
  function revealCards() {
    cards.forEach((c, i) => {
      setTimeout(() => {
        c.style.opacity = '1';
        c.style.transform = 'none';
      }, i * 120);
    });
  }

  // count-up animation
  function countUp(el, from, to, ms) {
    const start = performance.now();
    function step(now) {
      const t = Math.min(1, (now - start) / ms);
      const val = Math.round(from + (to - from) * easeOutCubic(t));
      el.textContent = '$' + val.toLocaleString();
      if (t < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  // sparkline drawing + animate stroke
  function drawSparkline(pathEl, values) {
    const w = 200, h = 40;
    if (!values || values.length < 2) {
      pathEl.setAttribute('d', '');
      return;
    }
    const max = Math.max(...values), min = Math.min(...values);
    const range = Math.max(1e-6, max - min);
    const step = w / (values.length - 1);
    let d = '';
    values.forEach((v, i) => {
      const x = i * step;
      const y = h - ((v - min) / range) * h;
      d += (i === 0 ? 'M' : 'L') + x.toFixed(2) + ' ' + y.toFixed(2) + ' ';
    });
    pathEl.setAttribute('d', d.trim());

    const len = pathEl.getTotalLength ? pathEl.getTotalLength() : 0;
    if (len) {
      pathEl.style.transition = 'none';
      pathEl.style.strokeDasharray = len;
      pathEl.style.strokeDashoffset = len;
      requestAnimationFrame(() => {
        pathEl.style.transition = 'stroke-dashoffset 800ms ease-out';
        pathEl.style.strokeDashoffset = '0';
      });
    }
  }

  // transactions UI
  function addTx(item) {
    if (!txList) return;
    const li = document.createElement('li');
    li.innerHTML = `<div class="meta"><strong>${item.title}</strong><div class="muted">${item.time}</div></div><div class="amount">${item.amount}</div>`;
    txList.prepend(li);
    while (txList.children.length > 8) txList.removeChild(txList.lastChild);
  }

  // mock data generator
  function randomWalk(n = 30, start = 100) {
    const arr = [start];
    for (let i = 1; i < n; i++) {
      const prev = arr[i - 1];
      arr.push(Number((prev * (1 + (Math.random() - 0.48) / 50)).toFixed(2)));
    }
    return arr;
  }

  // demo state
  let priceSeries = randomWalk(30, 120.00);
  drawSparkline(sparkPath, priceSeries);
  const current = priceSeries[priceSeries.length - 1];
  if (priceEl) priceEl.textContent = '$' + current.toFixed(2);
  if (priceChangeEl) priceChangeEl.textContent = '+0.0%';

  // animated updates
  setInterval(() => {
    const last = priceSeries[priceSeries.length - 1];
    const next = Number((last * (1 + (Math.random() - 0.5) / 100)).toFixed(2));
    priceSeries.push(next);
    if (priceSeries.length > 40) priceSeries.shift();
    drawSparkline(sparkPath, priceSeries);

    const change = (((next / priceSeries[priceSeries.length - 2]) - 1) * 100).toFixed(2);
    if (priceEl) priceEl.textContent = '$' + next.toFixed(2);
    if (priceChangeEl) {
      priceChangeEl.textContent = (change >= 0 ? '+' : '') + change + '%';
      priceChangeEl.style.color = change >= 0 ? '#bfe9c7' : '#ffd7da';
    }
    if (lastUpdateEl) lastUpdateEl.textContent = 'just now';

    if (Math.random() > 0.6) {
      addTx({
        title: (Math.random() > 0.5 ? 'Buy' : 'Sell') + ' - TICKER',
        time: new Date().toLocaleTimeString(),
        amount: (Math.random() > 0.5 ? '+' : '-') + '$' + (Math.random() * 1200).toFixed(2)
      });
    }
  }, 2000);

  // initial balance count-up (demo)
  setTimeout(() => {
    if (balanceEl) countUp(balanceEl, 0, 76728, 900);
  }, 420);

  // sidebar toggle wiring
  const sidebar = document.getElementById('sidebar');
  const sidebarToggle = document.getElementById('sidebarToggle');
  const menuToggle = document.getElementById('menuToggle');
  sidebarToggle && sidebarToggle.addEventListener('click', () => sidebar.classList.toggle('collapsed'));
  menuToggle && menuToggle.addEventListener('click', () => sidebar.classList.toggle('collapsed'));

  // simulate buttons if present
  const addTxBtn = document.getElementById('addTx');
  const clearTxBtn = document.getElementById('clearTx');
  if (addTxBtn) addTxBtn.addEventListener('click', () => addTx({
    title: 'Manual tx',
    time: new Date().toLocaleTimeString(),
    amount: '+$' + (Math.random() * 900).toFixed(2)
  }));
  if (clearTxBtn) clearTxBtn.addEventListener('click', () => {
    if (txList) txList.innerHTML = '';
  });

  // wire deposit/withdraw quick actions
  (function wireQuickActions() {
    const params = new URLSearchParams(location.search);
    const email = params.get('email') || params.get('user') || '';
    const userParam = params.get('user') || '';
    const depositBtn = document.getElementById('depositBtn');
    const withdrawBtn = document.getElementById('withdrawBtn');
    if (email) {
      if (depositBtn) depositBtn.href = '/deposit?email=' + encodeURIComponent(email) + '&user=' + encodeURIComponent(userParam || '');
      if (withdrawBtn) withdrawBtn.href = '/withdraw?email=' + encodeURIComponent(email) + '&user=' + encodeURIComponent(userParam || '');
    }
  })();

  // reveal cards
  revealCards();
}

// ✅ Trigger UI setup when DOM is ready
document.addEventListener('DOMContentLoaded', initDashboardUI);
if (document.readyState !== 'loading') initDashboardUI();