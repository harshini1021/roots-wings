// src/db.js — PostgreSQL via Neon (permanent cloud database)
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// Simple query helper
const query = (text, params) => pool.query(text, params);

// Create all tables
const initDb = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id            TEXT PRIMARY KEY,
      name          TEXT NOT NULL,
      email         TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role          TEXT NOT NULL DEFAULT 'ALUMNI',
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS alumni (
      id           TEXT PRIMARY KEY,
      user_id      TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      year         TEXT NOT NULL,
      field        TEXT NOT NULL,
      current_role TEXT NOT NULL,
      bio          TEXT,
      mentor       BOOLEAN NOT NULL DEFAULT FALSE,
      status       TEXT NOT NULL DEFAULT 'PENDING',
      created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS jobs (
      id          TEXT PRIMARY KEY,
      title       TEXT NOT NULL,
      company     TEXT NOT NULL,
      type        TEXT NOT NULL,
      description TEXT NOT NULL,
      location    TEXT,
      salary      TEXT,
      apply_url   TEXT,
      posted_by   TEXT NOT NULL REFERENCES users(id),
      status      TEXT NOT NULL DEFAULT 'PENDING',
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS stories (
      id         TEXT PRIMARY KEY,
      alumni_id  TEXT NOT NULL REFERENCES alumni(id) ON DELETE CASCADE,
      quote      TEXT NOT NULL,
      detail     TEXT NOT NULL,
      status     TEXT NOT NULL DEFAULT 'LIVE',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS mentor_requests (
      id           TEXT PRIMARY KEY,
      from_user_id TEXT NOT NULL REFERENCES users(id),
      to_alumni_id TEXT NOT NULL REFERENCES alumni(id),
      message      TEXT,
      status       TEXT NOT NULL DEFAULT 'PENDING',
      created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS activity_log (
      id           TEXT PRIMARY KEY,
      action       TEXT NOT NULL,
      performed_by TEXT REFERENCES users(id),
      target_id    TEXT,
      created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS password_resets (
      id         TEXT PRIMARY KEY,
      user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token      TEXT NOT NULL UNIQUE,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  console.log('✅ Database tables ready (Neon PostgreSQL)');
};

module.exports = { query, initDb, pool };
