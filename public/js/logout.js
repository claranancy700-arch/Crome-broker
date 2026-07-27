(function(){
  'use strict';

  // Handle logout when user clicks the Sign out button
  const logoutLinks = document.querySelectorAll('[data-logout], a[href="/logout"]');
  
  logoutLinks.forEach(link => {
    link.addEventListener('click', (ev) => {
      ev.preventDefault();
      
      // Clear local storage (email, user data, tokens, etc.)
      localStorage.clear();
      sessionStorage.clear();
      
      // Redirect to logout endpoint, which redirects to home
      window.location.href = '/logout';
    });
  });

  // Also handle logout if someone lands on /logout directly
  if (window.location.pathname === '/logout') {
    localStorage.clear();
    sessionStorage.clear();
    // Server will redirect to /; if not, we do it here
    setTimeout(() => {
      if (window.location.pathname === '/logout') {
        window.location.href = '/';
      }
    }, 500);
  }
})();
