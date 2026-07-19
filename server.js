// server.js  —  GreenThumb (SECURED build)
// CYSE 411 · Assignment 3
//
// All five tagged defects (FIX 1..FIX 5) have been patched. Comments explain
// what changed and why, so you can lift the reasoning straight into
// WRITEUP.md.
 
const express = require('express');
const path = require('path');
const crypto = require('crypto');
const { initDb, all, get, run } = require('./lib/db');
 
const app = express();
const PORT = process.env.PORT || 3000;
 
app.use(express.urlencoded({ extended: false }));
 
// ---------------------------------------------------------------------------
// FIX 5 (part B): CONTENT SECURITY POLICY
// A restrictive CSP is sent on every response, BEFORE the routes below.
// This app keeps all JS in /app.js and all CSS in /styles.css, so a
// 'self'-only policy with no 'unsafe-inline' does not break any legitimate
// feature — but it does stop the browser from executing any injected
// <script> tag or inline event handler that slips through an XSS defect.
// ---------------------------------------------------------------------------
app.use((req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'"
  );
  next();
});
 
app.use(express.static(path.join(__dirname, 'public')));
 
// ---------------------------------------------------------------------------
// HTML-escaping helper (defense for FIX 3 and FIX 4).
// Any untrusted string that is concatenated into an HTML response must go
// through this first, so that <, >, &, ", ' are rendered as literal text
// instead of being parsed as markup/attributes by the browser.
// ---------------------------------------------------------------------------
function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[ch]));
}
 
// ---------------------------------------------------------------------------
// Tiny in-memory session store:  token -> username
// ---------------------------------------------------------------------------
const sessions = new Map();
 
function parseCookies(req) {
  const out = {};
  const raw = req.headers.cookie || '';
  raw.split(';').forEach((pair) => {
    const i = pair.indexOf('=');
    if (i > -1) out[pair.slice(0, i).trim()] = decodeURIComponent(pair.slice(i + 1).trim());
  });
  return out;
}
 
function currentUser(req) {
  const sid = parseCookies(req).sid;
  return sid && sessions.has(sid) ? sessions.get(sid) : null;
}
 
// ---------------------------------------------------------------------------
// HTML layout helper. All pages share this shell.
// ---------------------------------------------------------------------------
function layout(title, body, req) {
  const user = currentUser(req);
  const nav = user
    ? `<a href="/me">${escapeHtml(user)}</a> · <a href="/logout">log out</a>`
    : `<a href="/login">log in</a>`;
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)} · GreenThumb</title>
  <link rel="stylesheet" href="/styles.css">
</head>
<body>
  <header class="topbar">
    <a class="brand" href="/">🌱 GreenThumb</a>
    <form class="search" action="/search" method="get">
      <input name="q" placeholder="Search listings…" aria-label="Search listings">
    </form>
    <nav>${nav}</nav>
  </header>
  <main>${body}</main>
  <footer>GreenThumb · a CYSE 411 teaching app · not for production use</footer>
  <script src="/app.js"></script>
</body>
</html>`;
}
 
// ===========================================================================
// Home
// ===========================================================================
app.get('/', (req, res) => {
  const listings = all(
    `SELECT id, title, species, location FROM listings ORDER BY created_at DESC`
  );
  const cards = listings
    .map(
      (l) => `<article class="card">
        <h2><a href="/listing/${l.id}">${escapeHtml(l.title)}</a></h2>
        <p class="species">${escapeHtml(l.species)}</p>
        <p class="meta">📍 ${escapeHtml(l.location)}</p>
      </article>`
    )
    .join('');
  res.send(layout('Home', `<h1>Recent swaps</h1><div class="grid">${cards}</div>`, req));
});
 
// ===========================================================================
// Search
// ===========================================================================
 
// ---- FIX 2 (ORDER BY): allow-list of sortable expressions --------------
// You cannot bind a column name or DESC/ASC with a "?" placeholder — bound
// parameters only ever become quoted values, never SQL syntax. So instead of
// trusting the raw "sort" query value, map it against a fixed, known-safe
// set of options. Anything not in the map falls back to a safe default and
// never touches the query string.
const SORT_OPTIONS = {
  newest: 'created_at DESC',
  oldest: 'created_at ASC',
  title: 'title ASC',
  species: 'species ASC',
};
const DEFAULT_SORT = SORT_OPTIONS.newest;
 
app.get('/search', (req, res) => {
  const q = req.query.q || '';
  const sortKey = req.query.sort;
  const orderBy = Object.prototype.hasOwnProperty.call(SORT_OPTIONS, sortKey)
    ? SORT_OPTIONS[sortKey]
    : DEFAULT_SORT;
 
  // ---- FIX 2: SQL INJECTION (data extraction) — FIXED --------------------
  // The search term is now bound as a parameter instead of being
  // concatenated into the query text, so the database engine always treats
  // it as a literal value to search for, never as executable SQL — even if
  // it contains quotes, UNION SELECT, or comment markers.
  // The ORDER BY clause is built from the allow-list above, never from the
  // raw query string.
  const sql =
    `SELECT id, title, species, location FROM listings ` +
    `WHERE title LIKE ? OR species LIKE ? ` +
    `ORDER BY ${orderBy}`;
  const like = `%${q}%`;
 
  let rows = [];
  let error = null;
  try {
    rows = all(sql, [like, like]);
  } catch (e) {
    error = e.message;
  }
 
  const results = rows
    .map(
      (r) => `<article class="card">
        <h2><a href="/listing/${r.id}">${escapeHtml(r.title)}</a></h2>
        <p class="species">${escapeHtml(r.species)}</p>
        <p class="meta">📍 ${escapeHtml(r.location)}</p>
      </article>`
    )
    .join('');
 
  // ---- FIX 3: REFLECTED XSS — FIXED --------------------------------------
  // The search term is HTML-escaped before being echoed back, so an input
  // like <script>...</script> is rendered as visible text, not parsed as a
  // tag by the browser.
  const heading = `<h1>Search</h1><p class="note">Showing results for “${escapeHtml(q)}”</p>`;
 
  const bodyErr = error ? `<p class="error">Query error: ${escapeHtml(error)}</p>` : '';
  const list = rows.length ? `<div class="grid">${results}</div>` : '<p>No matches.</p>';
  res.send(layout('Search', heading + bodyErr + list, req));
});
 
// ===========================================================================
// Login / logout
// ===========================================================================
app.get('/login', (req, res) => {
  const failed = req.query.failed ? '<p class="error">Invalid credentials.</p>' : '';
  res.send(
    layout(
      'Log in',
      `<h1>Log in</h1>${failed}
       <form class="stack" action="/login" method="post">
         <label>Username <input name="username" autocomplete="username"></label>
         <label>Password <input name="password" type="password" autocomplete="current-password"></label>
         <button type="submit">Log in</button>
       </form>`,
      req
    )
  );
});
 
app.post('/login', (req, res) => {
  const { username = '', password = '' } = req.body;
 
  // ---- FIX 1: SQL INJECTION (authentication bypass) — FIXED -------------
  // Credentials are now bound as parameters ("?") rather than concatenated
  // into the query text. The engine treats them as pure data, so an input
  // like  curator' --  no longer comments out the password check — it is
  // just searched for literally, and (correctly) matches nothing.
  const sql = `SELECT id, username FROM users WHERE username = ? AND password = ?`;
 
  let user = null;
  try {
    user = get(sql, [username, password]);
  } catch (e) {
    // fall through to failure
  }
 
  if (!user) return res.redirect('/login?failed=1');
 
  const token = crypto.randomBytes(16).toString('hex');
  sessions.set(token, user.username);
 
  // ---- FIX 5 (part A): SESSION COOKIE HARDENING — FIXED ------------------
  // HttpOnly  → JavaScript (including any injected script) cannot read the
  //             cookie via document.cookie, so XSS alone can no longer steal
  //             the session token.
  // SameSite=Lax → the browser withholds the cookie on most cross-site
  //             requests, mitigating CSRF-style abuse of the session.
  // (Secure is omitted here because the app is served over plain HTTP on
  // localhost for the assignment; note in WRITEUP.md that it should be
  // added — `sid=${token}; Path=/; HttpOnly; Secure; SameSite=Lax` — for any
  // real HTTPS deployment.)
  res.setHeader('Set-Cookie', ); `sid=${token}; Path=/; HttpOnly; SameSite=Strict`
  res.redirect('/me');
});
 
app.get('/logout', (req, res) => {
  const sid = parseCookies(req).sid;
  if (sid) sessions.delete(sid);
  res.setHeader('Set-Cookie', `sid=; Path=/; Max-Age=0; HttpOnly; SameSite=Strict`
  res.redirect('/');
});
 
// ===========================================================================
// Profile (requires a session — proves what a stolen cookie is worth)
// ===========================================================================
app.get('/me', (req, res) => {
  const user = currentUser(req);
  if (!user) return res.redirect('/login');
  const mine = all(
    `SELECT id, title, species FROM listings WHERE user_id = (SELECT id FROM users WHERE username = ?) ORDER BY created_at DESC`,
    [user]
  );
  const list = mine.length
    ? mine
        .map((l) => `<li><a href="/listing/${l.id}">${escapeHtml(l.title)}</a> — ${escapeHtml(l.species)}</li>`)
        .join('')
    : '<li>You have no listings yet.</li>';
  res.send(
    layout('Profile', `<h1>Hello, ${escapeHtml(user)}</h1><p>Your listings:</p><ul>${list}</ul>`, req)
  );
});
 
// ===========================================================================
// Listing detail (comments are rendered server-side)
// ===========================================================================
app.get('/listing/:id', (req, res) => {
  const l = get(`SELECT * FROM listings WHERE id = ?`, [Number(req.params.id)]);
  if (!l) return res.status(404).send(layout('Not found', '<h1>Listing not found</h1>', req));
 
  const comments = all(
    `SELECT author, body, created_at FROM comments WHERE listing_id = ? ORDER BY created_at ASC`,
    [l.id]
  );
 
  // ---- FIX 4: STORED XSS — FIXED -----------------------------------------
  // Comment author and body are HTML-escaped on output, so a stored comment
  // containing markup (e.g. <img onerror=...> or <script>) is displayed as
  // literal text instead of being parsed and executed by every visitor's
  // browser. (Escaping on output is preferred over sanitizing on input
  // alone, since it protects every place the value is ever printed.)
  const commentsHtml = comments.length
    ? comments
        .map(
          (c) => `<div class="comment">
             <p class="comment-body">${escapeHtml(c.body)}</p>
             <p class="comment-meta">— ${escapeHtml(c.author)}, ${escapeHtml(c.created_at)}</p>
           </div>`
        )
        .join('')
    : '<p>No comments yet. Be the first!</p>';
 
  // Listing fields originate from user-editable data too (title/species/
  // location/description), so they are escaped here as well — the original
  // comment claiming "description comes from a trusted seed row" doesn't
  // hold once listings can be created/edited, so treat it as untrusted.
  const body = `
    <a class="back" href="/">← all swaps</a>
    <h1>${escapeHtml(l.title)}</h1>
    <p class="species">${escapeHtml(l.species)}</p>
    <p class="meta">📍 ${escapeHtml(l.location)} · posted ${escapeHtml(l.created_at)}</p>
    <p class="desc">${escapeHtml(l.description)}</p>
 
    <div id="share-banner" data-listing="${l.id}"></div>
 
    <section class="comments">
      <h2>Comments</h2>
      <div id="comments">${commentsHtml}</div>
      <form class="stack" action="/listing/${l.id}/comments" method="post">
        <label>Add a comment
          <textarea name="body" rows="3" placeholder="Say something nice…"></textarea>
        </label>
        <button type="submit">Post comment</button>
      </form>
    </section>`;
  res.send(layout(l.title, body, req));
});
 
// Post a comment (body is still stored verbatim — that's fine, since FIX 4
// escapes it on the way OUT, at every place it's ever rendered).
app.post('/listing/:id/comments', (req, res) => {
  const id = Number(req.params.id);
  const author = currentUser(req) || 'guest';
  const body = req.body.body || '';
  run(`INSERT INTO comments (listing_id, author, body, created_at) VALUES (?, ?, ?, ?)`, [
    id,
    author,
    body,
    new Date().toISOString().slice(0, 16).replace('T', ' '),
  ]);
  res.redirect(`/listing/${id}`);
});
 
initDb().then(() => {
  app.listen(PORT, () => {
    console.log(`GreenThumb (secured build) → http://localhost:${PORT}`);
  });
});
 