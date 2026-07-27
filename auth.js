const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// JWT secret - in production, use a strong secret from environment variable
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(64).toString('hex');
const JWT_EXPIRY = process.env.JWT_EXPIRY || '7d';
const REFRESH_TOKEN_EXPIRY = process.env.REFRESH_TOKEN_EXPIRY || '30d';

// In-memory token blacklist (for logout)
// In production, use Redis or database
const tokenBlacklist = new Set();

/**
 * Generate JWT access token
 */
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

/**
 * Generate JWT refresh token
 */
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

/**
 * Verify and decode JWT token
 */
function verifyToken(token) {
  try {
    // Check if token is blacklisted
    if (tokenBlacklist.has(token)) {
      return null;
    }
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
}

/**
 * Blacklist a token (for logout)
 */
function blacklistToken(token) {
  tokenBlacklist.add(token);
  // Clean up old tokens after their expiry (simple cleanup)
  setTimeout(() => tokenBlacklist.delete(token), 30 * 24 * 60 * 60 * 1000);
}

/**
 * Extract token from request (from cookie or Authorization header)
 */
function extractToken(req) {
  // Try cookie first
  if (req.cookies && req.cookies.token) {
    return req.cookies.token;
  }
  
  // Try Authorization header
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  
  return null;
}

/**
 * Middleware to require authentication
 */
function requireAuth(req, res, next) {
  const token = extractToken(req);
  
  if (!token) {
    // For API routes, return JSON error
    if (req.path.startsWith('/api/')) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    // For page routes, redirect to login
    return res.redirect('/login');
  }
  
  const decoded = verifyToken(token);
  if (!decoded || decoded.type !== 'access') {
    // For API routes, return JSON error
    if (req.path.startsWith('/api/')) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    // For page routes, redirect to login
    return res.redirect('/login');
  }
  
  // Attach user info to request
  req.user = {
    id: decoded.id,
    email: decoded.email,
    name: decoded.name
  };
  
  next();
}

/**
 * Middleware for optional authentication (sets req.user if token is valid)
 */
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
  requireAuth,
  optionalAuth,
  JWT_SECRET
};
