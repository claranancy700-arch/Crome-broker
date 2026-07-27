/**
 * Client-side Authentication Helper
 * Manages JWT tokens and provides authentication utilities
 */

(function() {
  'use strict';

  const AUTH_STORAGE_KEY = 'auth_token';
  const USER_STORAGE_KEY = 'user_data';

  // Get stored auth token
  function getToken() {
    return localStorage.getItem(AUTH_STORAGE_KEY);
  }

  // Set auth token
  function setToken(token) {
    if (token) {
      localStorage.setItem(AUTH_STORAGE_KEY, token);
    } else {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    }
  }

  // Get stored user data
  function getUser() {
    const userData = localStorage.getItem(USER_STORAGE_KEY);
    if (userData) {
      try {
        return JSON.parse(userData);
      } catch (e) {
        return null;
      }
    }
    return null;
  }

  // Set user data
  function setUser(user) {
    if (user) {
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(USER_STORAGE_KEY);
    }
  }

  // Check if user is authenticated
  function isAuthenticated() {
    return !!getToken();
  }

  // Clear all auth data
  function clearAuth() {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    localStorage.removeItem(USER_STORAGE_KEY);
    sessionStorage.clear();
  }

  // Make authenticated API request
  async function apiRequest(url, options = {}) {
    const token = getToken();
    
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    try {
      const response = await fetch(url, {
        ...options,
        headers,
        credentials: 'include' // Include cookies
      });
      
      // If unauthorized, clear auth and redirect to login
      if (response.status === 401) {
        clearAuth();
        if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
          window.location.href = '/login?redirect=' + encodeURIComponent(window.location.pathname);
        }
        throw new Error('Authentication required');
      }
      
      return response;
    } catch (error) {
      throw error;
    }
  }

  // Require authentication on page load
  function requireAuth(redirectToLogin = true) {
    if (!isAuthenticated()) {
      if (redirectToLogin) {
        const currentPath = window.location.pathname + window.location.search;
        window.location.href = '/login?redirect=' + encodeURIComponent(currentPath);
      }
      return false;
    }
    return true;
  }

  // Redirect to dashboard if already authenticated (for login/register pages)
  function redirectIfAuthenticated() {
    if (isAuthenticated()) {
      const params = new URLSearchParams(window.location.search);
      const redirect = params.get('redirect') || '/dashboard';
      window.location.href = redirect;
      return true;
    }
    return false;
  }

  // Login helper
  async function login(email, password) {
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password }),
      credentials: 'include'
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Login failed');
    }
    
    if (data.token) {
      setToken(data.token);
    }
    
    if (data.user) {
      setUser(data.user);
    }
    
    return data;
  }

  // Logout helper
  async function logout() {
    try {
      const token = getToken();
      if (token) {
        await fetch('/api/logout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          credentials: 'include'
        });
      }
    } catch (error) {
      console.error('Logout request failed:', error);
    } finally {
      clearAuth();
      window.location.href = '/login';
    }
  }

  // Register helper
  async function register(name, email, password, confirm) {
    const response = await fetch('/api/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ name, email, password, confirm })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Registration failed');
    }
    
    return data;
  }

  // Expose global auth API
  window.auth = {
    getToken,
    setToken,
    getUser,
    setUser,
    isAuthenticated,
    clearAuth,
    apiRequest,
    requireAuth,
    redirectIfAuthenticated,
    login,
    logout,
    register
  };

  // Auto-check authentication on protected pages
  // Pages that should be protected
  const protectedPaths = ['/dashboard', '/deposit', '/withdraw', '/portfolio', '/orders', '/reports', '/profile', '/settings'];
  const currentPath = window.location.pathname;
  
  // If on a protected page and not authenticated, redirect to login
  if (protectedPaths.some(path => currentPath.startsWith(path))) {
    document.addEventListener('DOMContentLoaded', () => {
      if (!isAuthenticated()) {
        window.location.href = '/login?redirect=' + encodeURIComponent(currentPath + window.location.search);
      }
    });
  }
  
  // If on login or register page and already authenticated, redirect to dashboard
  if (currentPath === '/login' || currentPath === '/register') {
    document.addEventListener('DOMContentLoaded', () => {
      redirectIfAuthenticated();
    });
  }
})();
