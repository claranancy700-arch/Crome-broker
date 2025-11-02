const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'cbroker_db',
  password: 'olydev22',
  port: 5432,
});

module.exports = pool;