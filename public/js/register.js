(function () {
  'use strict';

  const form = document.getElementById('registerForm');
  const msg = document.getElementById('message');

  function show(type, text) {
    if (!msg) return;
    msg.className = 'msg ' + (type === 'success' ? 'success' : 'error');
    msg.textContent = text;
    msg.style.display = 'block';
  }

  if (!form) return;

  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    if (msg) msg.style.display = 'none';

    const name = form.name.value.trim();
    const email = form.email.value.trim();
    const password = form.password.value;
    const confirm = form.confirm.value;

    if (!name || !email || !password || !confirm) {
      show('error', 'Please fill all fields.');
      return;
    }
    if (password.length < 8) {
      show('error', 'Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      show('error', 'Passwords do not match.');
      return;
    }

    const btn = form.querySelector('button[type="submit"]');
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Creating account…';
    }

    try {
      let data;
      if (window.auth && typeof auth.register === 'function') {
        data = await auth.register(name, email, password, confirm);
      } else {
        const res = await fetch('/api/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ name, email, password, confirm })
        });
        data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error((data && data.error) || 'Registration failed');
      }

      // Prefer token returned from register (single step)
      if (data.token && window.auth) {
        auth.setToken(data.token);
        if (data.user) auth.setUser(data.user);
      } else if (window.auth && typeof auth.login === 'function') {
        // Fallback: login after register if API is older
        await auth.login(email, password);
      } else {
        throw new Error('Could not start session after registration');
      }

      const start = data.startingBalance != null ? data.startingBalance : 25000;
      const startLabel =
        window.money && money.format
          ? money.format(start)
          : '$' + Number(start).toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            });

      show('success', 'Account created (balance ' + startLabel + '). Opening dashboard…');

      // Hard navigate after token is stored
      window.setTimeout(() => {
        window.location.href = '/dashboard';
      }, 400);
    } catch (err) {
      console.error('Register failed', err);
      show('error', (err && err.message) || 'Registration failed. Try again.');
      if (btn) {
        btn.disabled = false;
        btn.textContent = 'Register';
      }
    }
  });
})();
