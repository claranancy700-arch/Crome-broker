// Dashboard: auth + ledger; shared money formatting
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

  function moneyFmt(v) {
    return window.money ? money.format(v) : '$' + Number(v || 0).toFixed(2);
  }
  function moneyDelta(v) {
    return window.money ? money.formatDelta(v) : (Number(v) >= 0 ? '+' : '') + moneyFmt(v);
  }

  function revealCards() {
    cards.forEach((c, i) => {
      setTimeout(() => {
        c.style.opacity = '1';
        c.style.transform = 'none';
      }, i * 100);
    });
  }

  function countUp(el, from, to, ms) {
    if (!el) return;
    const start = performance.now();
    function step(now) {
      const t = Math.min(1, (now - start) / ms);
      const val = from + (to - from) * (1 - Math.pow(1 - t, 3));
      el.textContent = moneyFmt(val);
      if (t < 1) requestAnimationFrame(step);
      else el.textContent = moneyFmt(to);
    }
    requestAnimationFrame(step);
  }

  function drawSparkline(pathEl, values) {
    if (!pathEl) return;
    const w = 200;
    const h = 40;
    if (!values || values.length < 2) {
      pathEl.setAttribute('d', '');
      return;
    }
    const max = Math.max(...values);
    const min = Math.min(...values);
    const range = Math.max(1e-6, max - min);
    const step = w / (values.length - 1);
    let d = '';
    values.forEach((v, i) => {
      const x = i * step;
      const y = h - ((v - min) / range) * h;
      d += (i === 0 ? 'M' : 'L') + x.toFixed(2) + ' ' + y.toFixed(2) + ' ';
    });
    pathEl.setAttribute('d', d.trim());
  }

  function formatTx(t) {
    const type = (t.type || 'tx').toLowerCase();
    const amount = Number(t.amount || 0);
    const title =
      type === 'deposit'
        ? 'Deposit'
        : type === 'withdrawal'
          ? 'Withdrawal'
          : type === 'trade'
            ? 'Trade'
            : type.charAt(0).toUpperCase() + type.slice(1);
    const note = t.note ? ' — ' + String(t.note).slice(0, 36) : '';
    const time = t.createdAt || t.created_at
      ? new Date(t.createdAt || t.created_at).toLocaleString()
      : '';
    return {
      title: title + note,
      time,
      amount: moneyDelta(amount),
      positive: amount >= 0
    };
  }

  function renderTxs(transactions) {
    if (!txList) return;
    txList.innerHTML = '';
    const list = (transactions || []).slice(0, 10);
    if (!list.length) {
      const li = document.createElement('li');
      li.innerHTML =
        '<div class="meta"><strong>No transactions yet</strong><div class="muted">Your ledger is empty</div></div>';
      txList.appendChild(li);
      return;
    }
    list.forEach((t) => {
      const item = formatTx(t);
      const li = document.createElement('li');
      li.innerHTML =
        '<div class="meta"><strong>' +
        item.title +
        '</strong><div class="muted">' +
        item.time +
        '</div></div><div class="amount ' +
        (item.positive ? 'amount-pos' : 'amount-neg') +
        '">' +
        item.amount +
        '</div>';
      txList.appendChild(li);
    });
  }

  function randomWalk(n, start) {
    const arr = [start];
    for (let i = 1; i < n; i++) {
      arr.push(Number((arr[i - 1] * (1 + (Math.random() - 0.48) / 50)).toFixed(2)));
    }
    return arr;
  }

  let priceSeries = randomWalk(30, 120);
  drawSparkline(sparkPath, priceSeries);
  if (priceEl) priceEl.textContent = moneyFmt(priceSeries[priceSeries.length - 1]);
  if (priceChangeEl) priceChangeEl.textContent = '—';

  setInterval(() => {
    const last = priceSeries[priceSeries.length - 1];
    const next = Number((last * (1 + (Math.random() - 0.5) / 100)).toFixed(2));
    priceSeries.push(next);
    if (priceSeries.length > 40) priceSeries.shift();
    drawSparkline(sparkPath, priceSeries);
    const change = (((next / priceSeries[priceSeries.length - 2]) - 1) * 100).toFixed(2);
    if (priceEl) priceEl.textContent = moneyFmt(next);
    if (priceChangeEl) {
      priceChangeEl.textContent = (change >= 0 ? '+' : '') + change + '%';
      priceChangeEl.style.color = change >= 0 ? 'var(--positive)' : 'var(--negative)';
    }
  }, 2500);

  async function loadAccount() {
    if (!window.auth || !auth.isAuthenticated()) {
      window.location.href = '/login?redirect=/dashboard';
      return;
    }

    const cached = auth.getUser();
    if (cached && userNameEl) userNameEl.textContent = cached.name || 'user';

    try {
      const data = await auth.fetchMe();
      const user = data.user || {};
      if (userNameEl) userNameEl.textContent = user.name || 'user';
      const headerUser = document.getElementById('headerUserLabel');
      if (headerUser) headerUser.textContent = user.name || user.email || 'Account';
      if (window.shellNav && typeof shellNav.refresh === 'function') shellNav.refresh();
      const bal = Number(user.balance || 0);
      countUp(balanceEl, 0, bal, 700);
      if (lastUpdateEl) lastUpdateEl.textContent = 'just now';
      renderTxs(data.transactions || []);
    } catch (err) {
      console.error(err);
      if (balanceEl) balanceEl.textContent = moneyFmt(0);
      if (lastUpdateEl) lastUpdateEl.textContent = 'error loading';
      if (txList) {
        txList.innerHTML =
          '<li><div class="meta"><strong>Could not load account</strong><div class="muted">' +
          (err.message || 'Try signing in again') +
          '</div></div></li>';
      }
    }
  }

  revealCards();
  loadAccount();
}

document.addEventListener('DOMContentLoaded', initDashboardUI);
if (document.readyState !== 'loading') initDashboardUI();
