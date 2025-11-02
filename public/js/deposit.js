// client script for deposit page
(function () {
  'use strict';

  const form = document.getElementById('depositForm');
  const msg = document.getElementById('message');

  function show(type, text) {
    msg.className = 'msg ' + (type === 'success' ? 'success' : 'error');
    msg.textContent = text;
  }

  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    msg.style.display = 'none';

    const name = form.name.value.trim();
    const email = form.email.value.trim();
    const amount = form.amount.value;
    const note = form.note.value.trim();

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
    btn.disabled = true;
    btn.textContent = 'Processing...';

    try {
      const res = await fetch('/api/deposit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, amount: value, note })
      });

      const data = await res.json();
      if (!res.ok) {
        show('error', data && data.error ? data.error : 'Deposit failed');
      } else {
        show('success', 'Deposit successful.');
        // redirect to interactive dashboard with email + user so dashboard can load live data
        const userName = name || (email.split('@')[0] || 'user');
        setTimeout(() => {
          window.location = '/dashboard?email=' + encodeURIComponent(email) + '&user=' + encodeURIComponent(userName);
        }, 800);
      }
    } catch (err) {
      show('error', 'Network error. Try again.');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Deposit';
    }
  });
})();