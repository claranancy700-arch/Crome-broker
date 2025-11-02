const pool = require('./db');

pool.query('SELECT 1 + 1 AS result', (err, res) => {
  if (err) {
    console.error('Error connecting to database:', err);
  } else {
    console.log('Connected to database successfully!');
    console.log('Test query result:', res.rows[0].result);
  }
  pool.end();
});