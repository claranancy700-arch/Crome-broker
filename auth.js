const jwt = require('jsonwebtoken');

// Stable demo secret when env is unset (set JWT_SECRET in real production)
const JWT_SECRET = process.env.JWT_SECRET || 'crome-broker-demo-secret-change-me';
const JWT_EXPIRY = process.env.JWT_EXPIRY || '7d';
const REFRESH_TOKEN_EXPIRY = process.env.REFRESH_TOKEN_EXPIRY || '30d';

// In-memory token blacklist (demo-only; use Redis/DB in production)
const tokenBlacklist = new Set();

function generateAccessToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      name: user.name,
      type: 'access'
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRY }
  );
}

function generateRefreshToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      type: 'refresh'
    },
    JWT_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRY }
  );
}

function verifyToken(token) {
  try {
    if (tokenBlacklist.has(token)) return null;
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
}

function blacklistToken(token) {
  tokenBlacklist.add(token);
  setTimeout(() => tokenBlacklist.delete(token), 30 * 24 * 60 * 60 * 1000);
}

function extractToken(req) {
  if (req.cookies && req.cookies.token) return req.cookies.token;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  return null;
}

function setAuthCookie(res, token) {
  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000
  });
}

function requireAuth(req, res, next) {
  const token = extractToken(req);

  if (!token) {
    if (req.path.startsWith('/api/') || (req.originalUrl || '').startsWith('/api/')) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    return res.redirect('/login?redirect=' + encodeURIComponent(req.originalUrl || '/dashboard'));
  }

  const decoded = verifyToken(token);
  if (!decoded || decoded.type !== 'access') {
    if (req.path.startsWith('/api/') || (req.originalUrl || '').startsWith('/api/')) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    return res.redirect('/login?redirect=' + encodeURIComponent(req.originalUrl || '/dashboard'));
  }

  req.user = {
    id: decoded.id,
    email: decoded.email,
    name: decoded.name
  };
  next();
}

function optionalAuth(req, res, next) {
  const token = extractToken(req);
  if (token) {
    const decoded = verifyToken(token);
    if (decoded && decoded.type === 'access') {
      req.user = {
        id: decoded.id,
        email: decoded.email,
        name: decoded.name
      };
    }
  }
  next();
}

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
  blacklistToken,
  extractToken,
  setAuthCookie,
  requireAuth,
  optionalAuth,
  JWT_SECRET
};
