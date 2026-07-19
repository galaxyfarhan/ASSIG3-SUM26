// lib/db.js
// Thin wrapper around sql.js (SQLite compiled to WebAssembly).
// sql.js is pure JavaScript/WASM, so there is NO native compilation step:
// `npm install` works the same on Windows, macOS and Linux.
//
// The database lives in memory for the lifetime of the server process and is
// (re)built from db/seed.js on startup. That is all this assignment needs:
// comments you post survive page reloads (stored XSS is observable) but a
// restart gives everyone a clean slate.

const initSqlJs = require('sql.js');
const { buildSeed } = require('../db/seed');

let SQL = null;
let db = null;

async function initDb() {
  if (db) return db;
  SQL = await initSqlJs();
  db = new SQL.Database();
  db.run(buildSeed());
  return db;
}

// Run a query and return an array of row objects.
// Accepts optional bound parameters (used by the SECURE version you will write).
function all(sql, params = []) {
  const stmt = db.prepare(sql);
  try {
    stmt.bind(params);
    const rows = [];
    while (stmt.step()) rows.push(stmt.getAsObject());
    return rows;
  } finally {
    stmt.free();
  }
}

// Run a query and return the first row (or null).
function get(sql, params = []) {
  const rows = all(sql, params);
  return rows.length ? rows[0] : null;
}

// Run an INSERT/UPDATE/DELETE. Accepts optional bound parameters.
function run(sql, params = []) {
  const stmt = db.prepare(sql);
  try {
    stmt.bind(params);
    stmt.step();
  } finally {
    stmt.free();
  }
}

module.exports = { initDb, all, get, run };
