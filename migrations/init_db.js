const { Pool } = require('pg');
const fs = require('fs');

(async function(){
  try {
    const url = process.env.DATABASE_URL;
    if(!url){
      console.error('DATABASE_URL not set. Aborting.');
      process.exit(1);
    }
    const pool = new Pool({ connectionString: url, ssl: { rejectUnauthorized: false } });

    const sql = `
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      salt TEXT NOT NULL,
      hash TEXT NOT NULL,
      balance NUMERIC DEFAULT 0,
      created_at TIMESTAMP WITH TIME ZONE
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      name TEXT,
      email TEXT NOT NULL,
      amount NUMERIC NOT NULL,
      note TEXT,
      fee_required NUMERIC,
      fee_paid NUMERIC,
      fee_currency TEXT,
      created_at TIMESTAMP WITH TIME ZONE
    );
    `;

    await pool.query(sql);
    console.log('DB init complete');
    await pool.end();
    process.exit(0);
  } catch (err){
    console.error('DB init failed', err);
    process.exit(2);
  }
})();
