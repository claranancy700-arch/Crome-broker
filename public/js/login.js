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
      if (window.toast) toast.error('Please enter email and password.');
      return;
    }

    const btn = form.querySelector('button[type="submit"]');
    if (window.loading) loading.button(btn, true);
    btn.disabled = true;
    btn.textContent = 'Signing in...';

    try {
      const data = await auth.login(email, password);
      show('success', 'Login successful. Welcome, ' + (data.user && data.user.name ? data.user.name : 'user') + '.');
      if (window.toast) toast.success('Login successful! Redirecting...');

      // Check for redirect parameter
      const params = new URLSearchParams(window.location.search);
      const redirect = params.get('redirect') || '/dashboard';

      // Redirect after a short delay
      setTimeout(() => {
        window.location = redirect;
      }, 500);
    } catch (err) {
      show('error', err.message || 'Login failed. Try again.');
      if (window.toast) toast.error(err.message || 'Login failed. Try again.');
    } finally {
      if (window.loading) loading.button(btn, false);
      btn.disabled = false;
      btn.textContent = 'Sign in';
    }
  });
})();