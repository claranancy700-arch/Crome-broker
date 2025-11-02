// client side validation + POST to /api/register
(function () {
  'use strict';

  const form = document.getElementById('registerForm');
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
    btn.disabled = true;
    btn.textContent = 'Registering...';

    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, confirm })
      });

      const data = await res.json();
      if (!res.ok) {
        show('error', data && data.error ? data.error : 'Registration failed');
      } else {
        show('success', 'Registration successful. You can now sign in.');
        form.reset();
      }
    } catch (err) {
      show('error', 'Network error. Try again.');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Register';
    }
  });
})();