// Deposit — real auth, demo balance update
(function () {
  'use strict';

  const form = document.getElementById('depositForm');
  const msg = document.getElementById('message');
  const accountLabel = document.getElementById('accountLabel');

  function show(type, text) {
    if (!msg) return;
    msg.className = 'msg ' + (type === 'success' ? 'success' : 'error');
    msg.textContent = text;
    msg.style.display = 'block';
  }

  function prefill() {
    if (!window.auth) return;
    const user = auth.getUser();
    if (!user) return;
    if (form && form.name) {
      form.name.value = user.name || '';
      form.name.readOnly = true;
    }
    if (form && form.email) {
      form.email.value = user.email || '';
      form.email.readOnly = true;
    }
    if (accountLabel) {
      accountLabel.textContent = (user.name || 'User') + ' · ' + (user.email || '');
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    if (window.auth && !auth.isAuthenticated()) {
      window.location.href = '/login?redirect=/deposit';
      return;
    }
    prefill();
    // Refresh name/email from server
    if (window.auth) {
      auth.fetchMe().then(prefill).catch(() => {});
    }

    if (form) {
      const btn = form.querySelector('button[type="submit"]');
      if (btn) {
        btn.disabled = true;
        btn.textContent = 'Deposits disabled';
      }
    }
  });

  if (!form) return;

  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    if (msg) msg.style.display = 'none';

    show('error', 'Deposits are currently disabled.');
    return;

    const amount = form.amount.value;
    const note = (form.note && form.note.value || '').trim();
    const value = Number(amount);

    if (Number.isNaN(value) || value <= 0) {
      show('error', 'Enter a valid amount greater than 0.');
      return;
    }

    const btn = form.querySelector('button[type="submit"]');
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Processing...';
    }

    try {
      const res = await auth.apiRequest('/api/deposit', {
        method: 'POST',
        body: JSON.stringify({ amount: value, note })
      });
      const data = await res.json();
      if (!res.ok) {
        show('error', (data && data.error) || 'Deposit failed');
      } else {
        const bal =
          window.money
            ? money.format(data.balance || 0)
            : '$' + Number(data.balance || 0).toFixed(2);
        show('success', 'Deposit successful. New balance: ' + bal);
        setTimeout(() => {
          window.location = '/dashboard';
        }, 700);
      }
    } catch (err) {
      show('error', err.message || 'Network error. Try again.');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = 'Deposit';
      }
    }
  });
})();
