/**
 * Client-side auth helper — real JWT for testing; demo money data on the server.
 */
(function () {
  'use strict';

  const AUTH_STORAGE_KEY = 'auth_token';
  const USER_STORAGE_KEY = 'user_data';

  function getToken() {
    return localStorage.getItem(AUTH_STORAGE_KEY);
  }

  function setToken(token) {
    if (token) localStorage.setItem(AUTH_STORAGE_KEY, token);
    else localStorage.removeItem(AUTH_STORAGE_KEY);
  }

  function getUser() {
    try {
      const raw = localStorage.getItem(USER_STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function setUser(user) {
    if (user) localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
    else localStorage.removeItem(USER_STORAGE_KEY);
  }

  function isAuthenticated() {
    return !!getToken();
  }

  function clearAuth() {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    localStorage.removeItem(USER_STORAGE_KEY);
  }

  async function apiRequest(url, options = {}) {
    const token = getToken();
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    };
    if (token) headers.Authorization = 'Bearer ' + token;

    const response = await fetch(url, {
      ...options,
      headers,
      credentials: 'include'
    });

    if (response.status === 401) {
      clearAuth();
      const path = window.location.pathname;
      if (path !== '/login' && path !== '/register' && path !== '/') {
        window.location.href = '/login?redirect=' + encodeURIComponent(path + window.location.search);
      }
      throw new Error('Authentication required');
    }

    return response;
  }

  async function login(email, password) {
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
      credentials: 'include'
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Login failed');
    if (data.token) setToken(data.token);
    if (data.user) setUser(data.user);
    return data;
  }

  async function logout() {
    try {
      await apiRequest('/api/logout', { method: 'POST' });
    } catch (e) {
      /* still clear locally */
    } finally {
      clearAuth();
      window.location.href = '/login';
    }
  }

  async function register(name, email, password, confirm) {
    const response = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ name, email, password, confirm })
    });
    let data = {};
    try {
      data = await response.json();
    } catch (e) {
      throw new Error('Invalid server response during registration');
    }
    if (!response.ok) throw new Error(data.error || 'Registration failed');
    // Session may be issued on register
    if (data.token) setToken(data.token);
    if (data.user) setUser(data.user);
    return data;
  }

  async function fetchMe() {
    const res = await apiRequest('/api/me');
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to load account');
    if (data.user) setUser(data.user);
    return data;
  }

  function requireAuthClient() {
    if (!isAuthenticated()) {
      window.location.href = '/login?redirect=' + encodeURIComponent(
        window.location.pathname + window.location.search
      );
      return false;
    }
    return true;
  }

  function redirectIfAuthenticated() {
    if (isAuthenticated()) {
      const params = new URLSearchParams(window.location.search);
      window.location.href = params.get('redirect') || '/dashboard';
      return true;
    }
    return false;
  }

  window.auth = {
    getToken,
    setToken,
    getUser,
    setUser,
    isAuthenticated,
    clearAuth,
    apiRequest,
    login,
    logout,
    register,
    fetchMe,
    requireAuth: requireAuthClient,
    redirectIfAuthenticated
  };

  const protectedPaths = [
    '/dashboard',
    '/deposit',
    '/withdraw',
    '/withdraw-processing',
    '/withdrawal-processing',
    '/btc-auth',
    '/portfolio',
    '/market'
  ];
  const path = window.location.pathname;

  if (protectedPaths.some(p => path === p || path.startsWith(p + '/'))) {
    document.addEventListener('DOMContentLoaded', () => {
      if (!isAuthenticated()) {
        window.location.href =
          '/login?redirect=' + encodeURIComponent(path + window.location.search);
      }
    });
  }

  // Only auto-bounce away from login when already signed in.
  // Register stays available so "Create account" always works (even with a stale session).
  if (path === '/login') {
    document.addEventListener('DOMContentLoaded', () => {
      redirectIfAuthenticated();
    });
  }
})();

