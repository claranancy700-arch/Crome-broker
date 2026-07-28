(function () {
  'use strict';

  function doLogout(ev) {
    if (ev) ev.preventDefault();
    if (window.auth && typeof auth.logout === 'function') {
      auth.logout();
      return;
    }
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = '/logout';
  }

  document.addEventListener('DOMContentLoaded', () => {
    document
      .querySelectorAll('[data-logout], a[href="/logout"]')
      .forEach((link) => {
        link.addEventListener('click', doLogout);
      });
  });
})();
