# Assignment 3 — package contents

Two folders:

### 1. `assignment3-greenthumb/`  — hand this to students
The deliberately-vulnerable **GreenThumb** app plus everything the assignment
needs:
- `README.md` — the full tutorial-style assignment (scenario, setup, deploy-for-
  grading, the five guided fixes, the two required videos, publishing & Canvas
  submission, and the rubric).
- The vulnerable app (`server.js`, `public/app.js`, `lib/`, `db/`, `public/`).
- `exploits/` — the exploit harness with the four attack payloads left as
  `TODO` for students to write, plus a completed header-inspection script and a
  `run-all` runner.

**To publish it for students:** push `assignment3-greenthumb/` to a repo on
`github.com/GMU-CYSE` (the URL you already reference in class), and give students
that clone URL. Students then publish *their own* repo and submit only the URL on
Canvas.

### 2. `greenthumb-solution/`  — keep private
The reference solution: the same app with all five defects fixed, the
**working** exploit scripts, `SOLUTION.md` (fixes + grading guide + common
pitfalls), and `WRITEUP.example.md` (a model of the student write-up).

---

## Quick verification (either folder)

```bash
cd <folder>
npm install
npm start            # http://localhost:3000
npm run exploit      # solution → all [SECURE]; starter (payloads filled) → all [VULNERABLE]
```

Requires **Node.js 18+** only. The app uses `sql.js` (SQLite in WebAssembly), so
there is no database server and no native compilation — `npm install` behaves
identically on Windows, macOS, and Linux, which keeps student setup friction low.

## The five defects at a glance

| # | Class (unit) | Where |
|---|---|---|
| FIX 1 | SQLi — auth bypass (2.2) | `POST /login` |
| FIX 2 | SQLi — UNION extraction + `ORDER BY` (2.2) | `GET /search` |
| FIX 3 | Reflected XSS (2.3) | `GET /search` |
| FIX 4 | Stored + DOM XSS (2.3) | `GET /listing/:id`, `public/app.js` |
| FIX 5 | Cookie flags + CSP (2.3) | `POST /login` + global middleware |

The theme (a plant-swap board) and every payload are original to this
assignment — none are reused from the Unit 2.2 / 2.3 lab material, so students
can't copy a lecture answer.
