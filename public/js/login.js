(function () {
  'use strict';

  const form = document.getElementById('loginForm');
  const msg = document.getElementById('message');

  // password toggle (see password) with blink animation
  const pwInput = document.getElementById('password');
  const pwToggle = document.getElementById('pwToggle');
  if (pwInput && pwToggle) {
    function setPwVisible(show) {
      pwInput.type = show ? 'text' : 'password';
      pwToggle.setAttribute('aria-pressed', show ? 'true' : 'false');
      pwToggle.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
      // add blink animation class briefly
      pwToggle.classList.remove('blink');
      // force reflow to restart animation
      // eslint-disable-next-line no-unused-expressions
      void pwToggle.offsetWidth;
      pwToggle.classList.add('blink');
    }

    pwToggle.addEventListener('click', () => {
      const visible = pwInput.type === 'text';
      setPwVisible(!visible);
      // remove animation class after it finishes (safety)
      setTimeout(() => pwToggle.classList.remove('blink'), 600);
    });
  }

  function show(type, text) {
    msg.className = 'msg ' + (type === 'success' ? 'success' : 'error');
    msg.textContent = text;
  }

  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    msg.style.display = 'none';

    const email = form.email.value.trim();
    const password = form.password.value;

    if (!email || !password) {
      show('error', 'Please enter email and password.');
      return;
    }

    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.textContent = 'Signing in...';

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();
      if (!res.ok) {
        show('error', data && data.error ? data.error : 'Login failed');
      } else {
        show('success', 'Login successful. Welcome, ' + (data.user && data.user.name ? data.user.name : 'user') + '.');

        // If EMILY logs in, redirect to the dashboard (first dashboard)
        const isEmily = email.toLowerCase() === 'emily@example.com';
        const userName = (data.user && data.user.name) ? data.user.name : 'EMILY';

        // Redirect after a short delay so user sees the success message
        setTimeout(() => {
          if (isEmily) {
            // go to the primary dashboard (interactive)
            window.location = '/dashboard?user=' + encodeURIComponent(userName);
          } else {
            // default to lightweight dashboard
            window.location = '/dashboard-basic?user=' + encodeURIComponent(userName);
          }
        }, 800);
      }
    } catch (err) {
      show('error', 'Network error. Try again.');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Sign in';
    }
  });
})();