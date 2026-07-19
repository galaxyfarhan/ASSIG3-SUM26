# Assignment 3 Write-up

## FIX 1 – SQL Injection Authentication Bypass

### Vulnerability
The login page built the SQL query by directly concatenating the username and password. An attacker could inject SQL to bypass authentication.

### Payload Used
```
' OR 1=1 --
```

This payload made the SQL condition always evaluate to true, allowing login without a valid password.

### Fix Applied
I replaced the vulnerable SQL query with a parameterized query using bound parameters.

### Why It Works
Parameterized queries treat user input as data instead of executable SQL, preventing SQL injection attacks.

### Limitation
This fix prevents SQL injection but does not stop attacks using stolen user credentials or weak passwords.

---

## FIX 2 – SQL Injection Data Extraction

### Vulnerability
The application allowed user input to control the SQL query, including the ORDER BY clause.

### Payload Used
A UNION-based SQL injection payload was used to retrieve unauthorized database information.

### Fix Applied
I used parameter binding for SQL values and restricted ORDER BY to an allow-list of valid column names.

### Why It Works
Parameter binding prevents SQL injection, while the allow-list only permits expected column names.

### Limitation
The allow-list must be updated if new sortable columns are added later.

---

## FIX 3 – Reflected XSS

### Vulnerability
The search term was inserted directly into the HTML response without escaping.

### Payload Used
```html
<img src=x onerror=alert(document.domain)>
```

The payload attempted to execute JavaScript when rendered.

### Fix Applied
I added an `escapeHtml()` helper function and encoded all user input before displaying it.

### Why It Works
HTML encoding converts dangerous characters such as `<`, `>`, `&`, `"`, and `'` into safe HTML entities, preventing script execution.

### Limitation
Output encoding only protects the HTML context. Other contexts such as JavaScript or CSS require different encoding techniques.

---

## FIX 4 – Stored XSS and DOM XSS

### Vulnerability
Comments and the shared-note banner displayed user input without proper encoding, allowing malicious JavaScript to be stored and executed.

### Payload Used
```html
<img src=x onerror=alert('xss')>
```

### Fix Applied
I encoded all stored comments using `escapeHtml()` and replaced unsafe DOM updates with safe DOM APIs (`textContent`).

### Why It Works
The browser displays the payload as plain text instead of interpreting it as HTML.

### Limitation
If future code inserts user input using `innerHTML` again, new XSS vulnerabilities could be introduced.

---

## FIX 5 – Cookie Security and Content Security Policy

### Vulnerability
The session cookie did not use secure cookie flags, and no Content Security Policy (CSP) was configured.

### Payload Used
The provided exploit script confirmed that the application lacked HttpOnly, SameSite, and CSP protections.

### Fix Applied
I added:

- HttpOnly
- SameSite=Lax
- Content-Security-Policy response header

### Why It Works
HttpOnly prevents JavaScript from reading the session cookie, SameSite reduces CSRF attacks, and CSP blocks many injected scripts from executing.

### Limitation
CSP reduces the impact of XSS but cannot remove existing vulnerabilities. Secure coding practices are still required.