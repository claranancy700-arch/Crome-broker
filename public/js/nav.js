/**
 * Sticky shell: hamburger + slide-in nav panel on every page.
 * Auth-aware links (guest vs signed-in).
 */
(function () {
  'use strict';

  const GUEST_LINKS = [
    { href: '/', label: 'Home' },
    { href: '/login', label: 'Login' },
    { href: '/register', label: 'Register', cta: true }
  ];

  const USER_LINKS = [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/market', label: 'Market' },
    { href: '/portfolio', label: 'Portfolio' },
    { href: '/deposit', label: 'Deposit' },
    { href: '/withdraw', label: 'Withdraw' },
    { href: '/logout', label: 'Sign out', logout: true }
  ];

  function isAuthed() {
    try {
      return !!(window.auth && auth.isAuthenticated && auth.isAuthenticated());
    } catch (e) {
      return !!localStorage.getItem('auth_token');
    }
  }

  function ensureShell() {
    if (document.getElementById('app-header')) return;

    const header = document.createElement('header');
    header.className = 'app-header';
    header.id = 'app-header';
    header.innerHTML =
      '<div class="app-header__inner">' +
      '<button type="button" class="nav-toggle" id="navToggle" aria-controls="navPanel" aria-expanded="false" aria-label="Open menu">' +
      '<span class="nav-toggle__bar"></span><span class="nav-toggle__bar"></span><span class="nav-toggle__bar"></span>' +
      '</button>' +
      '<a href="/" class="brand brand-link" aria-label="Sand Box home">' +
      '<img src="/bars%20logo.svg" alt="Sand Box" class="logo" width="200" height="56" decoding="async" onerror="this.style.display=\'none\'" />' +
      '</a>' +
      '<div class="header-trail" id="headerTrail"></div>' +
      '</div>';

    const backdrop = document.createElement('div');
    backdrop.className = 'nav-backdrop';
    backdrop.id = 'navBackdrop';
    backdrop.hidden = true;

    const panel = document.createElement('aside');
    panel.className = 'nav-panel';
    panel.id = 'navPanel';
    panel.setAttribute('aria-hidden', 'true');
    panel.setAttribute('aria-label', 'Main menu');
    panel.innerHTML =
      '<div class="nav-panel__head">' +
      '<span class="nav-panel__title">Menu</span>' +
      '<button type="button" class="nav-close" id="navClose" aria-label="Close menu">×</button>' +
      '</div>' +
      '<nav class="nav-panel__nav" id="siteNav"></nav>' +
      '<div class="nav-panel__meta" id="navMeta"></div>';

    document.body.insertBefore(panel, document.body.firstChild);
    document.body.insertBefore(backdrop, document.body.firstChild);
    document.body.insertBefore(header, document.body.firstChild);
  }

  function fillNav() {
    const nav = document.getElementById('siteNav');
    const meta = document.getElementById('navMeta');
    const trail = document.getElementById('headerTrail');
    if (!nav) return;

    const authed = isAuthed();
    const links = authed ? USER_LINKS : GUEST_LINKS;
    const path = window.location.pathname.replace(/\/$/, '') || '/';

    nav.innerHTML = '';
    if (authed) {
      const sec = document.createElement('div');
      sec.className = 'nav-panel__section';
      sec.textContent = 'Account';
      nav.appendChild(sec);
    } else {
      const sec = document.createElement('div');
      sec.className = 'nav-panel__section';
      sec.textContent = 'Welcome';
      nav.appendChild(sec);
    }

    links.forEach((item) => {
      const a = document.createElement('a');
      a.href = item.href;
      a.textContent = item.label;
      if (item.cta) a.classList.add('cta');
      if (item.logout) a.setAttribute('data-logout', '');

      const hrefPath = item.href.replace(/\/$/, '') || '/';
      if (hrefPath === path || (hrefPath !== '/' && path.startsWith(hrefPath))) {
        a.classList.add('is-active');
      }

      nav.appendChild(a);
    });

    if (meta) {
      if (authed) {
        let name = '';
        try {
          const u = window.auth && auth.getUser && auth.getUser();
          name = (u && (u.name || u.email)) || '';
        } catch (e) { /* ignore */ }
        meta.innerHTML =
          (name ? '<div>Signed in as <strong style="color:#fff">' + escapeHtml(name) + '</strong></div>' : '') +
          '<div style="margin-top:6px">Account connected</div>';
      } else {
        meta.innerHTML = '<div>Create an account to explore</div>';
      }
    }

    if (trail) {
      trail.innerHTML = '';
      if (authed) {
        const user = document.createElement('span');
        user.className = 'header-user';
        user.id = 'headerUserLabel';
        try {
          const u = window.auth && auth.getUser && auth.getUser();
          user.textContent = (u && u.name) || 'Account';
        } catch (e) {
          user.textContent = 'Account';
        }
        trail.appendChild(user);

        if (path === '/dashboard' || path.startsWith('/dashboard')) {
          // page has its own actions
        } else if (!path.startsWith('/deposit') && !path.startsWith('/withdraw')) {
          const d = document.createElement('a');
          d.href = '/dashboard';
          d.className = 'btn small btn-hide-xs';
          d.textContent = 'Dashboard';
          trail.appendChild(d);
        }
      } else {
        const login = document.createElement('a');
        login.href = '/login';
        login.className = 'btn small btn-hide-xs';
        login.textContent = 'Login';
        trail.appendChild(login);
        const reg = document.createElement('a');
        reg.href = '/register';
        reg.className = 'btn primary small';
        reg.textContent = 'Register';
        trail.appendChild(reg);
      }
    }

    // Wire logout if helper present
    nav.querySelectorAll('[data-logout]').forEach((el) => {
      el.addEventListener('click', (ev) => {
        if (window.auth && typeof auth.logout === 'function') {
          ev.preventDefault();
          closeNav();
          auth.logout();
        }
      });
    });
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function openNav() {
    const panel = document.getElementById('navPanel');
    const backdrop = document.getElementById('navBackdrop');
    const toggle = document.getElementById('navToggle');
    if (!panel) return;
    panel.classList.add('is-open');
    panel.setAttribute('aria-hidden', 'false');
    if (backdrop) {
      backdrop.hidden = false;
      backdrop.classList.add('is-open');
    }
    if (toggle) toggle.setAttribute('aria-expanded', 'true');
    document.body.classList.add('nav-open');
  }

  function closeNav() {
    const panel = document.getElementById('navPanel');
    const backdrop = document.getElementById('navBackdrop');
    const toggle = document.getElementById('navToggle');
    if (!panel) return;
    panel.classList.remove('is-open');
    panel.setAttribute('aria-hidden', 'true');
    if (backdrop) {
      backdrop.classList.remove('is-open');
      backdrop.hidden = true;
    }
    if (toggle) toggle.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('nav-open');
  }

  function bindShell() {
    const toggle = document.getElementById('navToggle');
    const closeBtn = document.getElementById('navClose');
    const backdrop = document.getElementById('navBackdrop');
    const panel = document.getElementById('navPanel');

    if (toggle) {
      toggle.addEventListener('click', () => {
        const open = toggle.getAttribute('aria-expanded') === 'true';
        if (open) closeNav();
        else openNav();
      });
    }
    if (closeBtn) closeBtn.addEventListener('click', closeNav);
    if (backdrop) backdrop.addEventListener('click', closeNav);

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeNav();
    });

    if (panel) {
      panel.addEventListener('click', (e) => {
        const a = e.target.closest('a');
        if (a && a.getAttribute('href') && a.getAttribute('href') !== '#') {
          // allow navigation; close for hash links on same page
          if (a.getAttribute('href').startsWith('#')) closeNav();
          else closeNav();
        }
      });
    }

    // Year stamp if present
    const y = document.getElementById('year');
    if (y) y.textContent = new Date().getFullYear();
  }

  function stripLegacyHeaders() {
    document.querySelectorAll('header.site-header').forEach((el) => el.remove());
    // Remove old dashboard sidebars if present
    document.querySelectorAll('aside.sidebar').forEach((el) => el.remove());
  }

  function init() {
    stripLegacyHeaders();
    ensureShell();
    fillNav();
    bindShell();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Re-fill after auth.js may load token (same tick usually fine)
  window.addEventListener('load', () => {
    fillNav();
  });

  window.shellNav = { open: openNav, close: closeNav, refresh: fillNav };
})();
