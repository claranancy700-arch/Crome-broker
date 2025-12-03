const { Pool } = require('pg');

// Use `DATABASE_URL` when present (Render sets this for managed DBs),
// otherwise fall back to a simple stub so the app can still run locally
// without a DB. This keeps behavior safe for demos.
let pool = null;
if (process.env.DATABASE_URL) {
  // prefer SSL when connecting to hosted Postgres (common on managed services)
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: (process.env.NODE_ENV === 'production') ? { rejectUnauthorized: false } : false
  });
} else {
  // No database configured; provide a stub implementation to avoid runtime errors.
  pool = {
    query: async function () {
      return { rows: [] };
    }
  };
}

module.exports = pool;