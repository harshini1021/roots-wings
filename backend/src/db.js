// src/db.js — sql.js, pure JavaScript, zero compilation needed on Windows
const path = require('path');
const fs   = require('fs');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'rootswings.db');
const dir = path.dirname(DB_PATH);
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

let _db   = null;
let _wrap = null;

function saveToDisk() {
  if (!_db) return;
  const data = _db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

class Stmt {
  constructor(sql) { this._sql = sql; }

  run(...args) {
    _db.run(this._sql, args.length ? args : []);
    saveToDisk();
    return { changes: _db.getRowsModified() };
  }

  get(...args) {
    const s = _db.prepare(this._sql);
    try {
      s.bind(args.length ? args : []);
      if (s.step()) return s.getAsObject();
      return undefined;
    } finally { s.free(); }
  }

  all(...args) {
    const s = _db.prepare(this._sql);
    const rows = [];
    try {
      s.bind(args.length ? args : []);
      while (s.step()) rows.push(s.getAsObject());
    } finally { s.free(); }
    return rows;
  }
}

class Db {
  prepare(sql)  { return new Stmt(sql); }

  exec(sql) {
    _db.run(sql);
    saveToDisk();
  }

  // transaction: runs all inserts, then saves once at the end
  transaction(fn) {
    return (...args) => {
      try {
        fn(...args);
        saveToDisk();  // single save after all inserts
      } catch (e) {
        throw e;
      }
    };
  }
}

async function initDb() {
  if (_wrap) return _wrap;

  const initSqlJs = require('sql.js');
  const SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    const buf = fs.readFileSync(DB_PATH);
    _db = new SQL.Database(buf);
    console.log('✅ Database loaded:', DB_PATH);
  } else {
    _db = new SQL.Database();
    console.log('✅ Database created:', DB_PATH);
  }

  _db.run('PRAGMA foreign_keys = ON');

  _db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id            TEXT PRIMARY KEY,
      name          TEXT NOT NULL,
      email         TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role          TEXT NOT NULL DEFAULT 'ALUMNI',
      created_at    TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS alumni (
      id           TEXT PRIMARY KEY,
      user_id      TEXT NOT NULL UNIQUE REFERENCES users(id),
      year         TEXT NOT NULL,
      field        TEXT NOT NULL,
      current_role TEXT NOT NULL,
      bio          TEXT,
      mentor       INTEGER NOT NULL DEFAULT 0,
      status       TEXT NOT NULL DEFAULT 'PENDING',
      created_at   TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
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
      created_at  TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS stories (
      id         TEXT PRIMARY KEY,
      alumni_id  TEXT NOT NULL REFERENCES alumni(id),
      quote      TEXT NOT NULL,
      detail     TEXT NOT NULL,
      status     TEXT NOT NULL DEFAULT 'LIVE',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS mentor_requests (
      id           TEXT PRIMARY KEY,
      from_user_id TEXT NOT NULL REFERENCES users(id),
      to_alumni_id TEXT NOT NULL REFERENCES alumni(id),
      message      TEXT,
      status       TEXT NOT NULL DEFAULT 'PENDING',
      created_at   TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS activity_log (
      id           TEXT PRIMARY KEY,
      action       TEXT NOT NULL,
      performed_by TEXT,
      target_id    TEXT,
      created_at   TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS password_resets (
      id         TEXT PRIMARY KEY,
      user_id    TEXT NOT NULL REFERENCES users(id),
      token      TEXT NOT NULL UNIQUE,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  saveToDisk();
  _wrap = new Db();
  return _wrap;
}

module.exports = new Proxy({}, {
  get(_, prop) {
    if (prop === 'initDb') return initDb;
    if (!_wrap) throw new Error('DB not ready — await initDb() first in server.js');
    return typeof _wrap[prop] === 'function' ? _wrap[prop].bind(_wrap) : _wrap[prop];
  }
});
