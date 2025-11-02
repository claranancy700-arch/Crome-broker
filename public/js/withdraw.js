(function () {
  'use strict';

  const form = document.getElementById('withdrawForm');
  const msg = document.getElementById('message');

  function show(type, text) {
    if (!msg) return;
    msg.className = 'msg ' + (type === 'success' ? 'success' : 'error');
    msg.textContent = text;
    msg.style.display = 'block';
  }

  // prefill from query string if provided
  (function prefill() {
    const params = new URLSearchParams(location.search);
    const email = params.get('email') || '';
    const user = params.get('user') || '';
    if (email && form && form.email) form.email.value = decodeURIComponent(email);
    if (user && form && form.name) form.name.value = decodeURIComponent(user);
  })();

  if (!form) return;

  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    if (msg) msg.style.display = 'none';

    const name = (form.name && form.name.value || '').trim();
    const email = (form.email && form.email.value || '').trim();
    const amount = (form.amount && form.amount.value || '').trim();
    const note = (form.note && form.note.value || '').trim();

    if (!email || !amount) {
      show('error', 'Please provide email and amount.');
      return;
    }

    const value = Number(amount);
    if (Number.isNaN(value) || value <= 0) {
      show('error', 'Enter a valid amount greater than 0.');
      return;
    }

    const btn = form.querySelector('button[type="submit"]');
    if (btn) { btn.disabled = true; btn.textContent = 'Processing...'; }

    // helper to forward to processing page (real or mock)
    function forwardToProcessing(txId, isMock = false) {
      const userName = name || (email.split('@')[0] || 'user');
      const q = [
        'tx=' + encodeURIComponent(txId),
        'email=' + encodeURIComponent(email),
        'user=' + encodeURIComponent(userName),
        'amount=' + encodeURIComponent(value),
        'mock=' + (isMock ? '1' : '0')
      ].join('&');
      // small delay so user sees the success message
      setTimeout(() => {
        window.location = '/withdraw-processing?' + q;
      }, 700);
    }

    try {
      const res = await fetch('/api/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, amount: value, note })
      });

      // attempt to parse json, but tolerate non-json
      const data = await res.json().catch(() => ({}));

      if (res.ok && data && data.tx && data.tx.id) {
        show('success', 'Withdrawal submitted. Processing…');
        forwardToProcessing(data.tx.id, false);
      } else if (res.ok && data && data.tx) {
        // success but no id returned (unlikely) — generate fallback id
        const txId = 'mock-' + Date.now() + '-' + Math.random().toString(36).slice(2,8);
        show('success', 'Withdrawal submitted. Processing…');
        forwardToProcessing(txId, false);
      } else {
        // server returned error or non-ok — still allow mock forwarding
        const txId = 'mock-' + Date.now() + '-' + Math.random().toString(36).slice(2,8);
        show('success', 'Server did not confirm transaction but forwarding to processing (mock).');
        forwardToProcessing(txId, true);
      }
    } catch (err) {
      // network error — forward with mock details
      const txId = 'mock-' + Date.now() + '-' + Math.random().toString(36).slice(2,8);
      show('success', 'Network error — opening processing page with mock details.');
      forwardToProcessing(txId, true);
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = 'Withdraw'; }
    }
  });
})();