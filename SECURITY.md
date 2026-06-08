# Security Policy

## Reporting a Vulnerability

Please **do not open a public GitHub issue** for security vulnerabilities. Doing so exposes the
flaw to everyone before a fix is available.

Instead, send a private email to **security@nanoxplore.com** with:

- A description of the vulnerability and the affected component.
- Steps to reproduce (proof-of-concept if possible).
- Your assessment of the potential impact.

Expected response time: **acknowledgement within 2 business days**, resolution timeline communicated
within 7 business days. We will coordinate a disclosure date with you once a fix is ready.

---

## Supported Versions

| Version | Supported |
|---------|-----------|
| 1.x     | Yes       |
| < 1.0   | No        |

Only the latest `1.x` release receives security patches.

---

## Security Model

### Authentication

Authentication is handled exclusively via **LDAP**. The application never stores LDAP credentials
itself; it only validates them against the directory at login time. On success it issues two JWTs:
an access token (short-lived) and a refresh token (longer-lived), both stored in **httpOnly
cookies** — they are never placed in `localStorage` or accessible to JavaScript running in the
browser.

### Session tokens

| Property | Value |
|----------|-------|
| Storage  | httpOnly cookies (not localStorage, not Authorization header) |
| Access token min length | 32 characters of random entropy |
| Refresh token | independent secret, minimum 32 characters, must not be derived from the access-token secret |
| Transport | HTTPS only in production |

### Role-Based Access Control (RBAC)

Every protected route is wrapped by `AuthGuard` (frontend) and a matching middleware on the
backend. The supported roles are `admin`, `hr`, `manager`, and `employee`. A user can only reach
pages and API endpoints that match their role.

### Read-only impersonation invariant

When an administrator impersonates another user for support purposes, the session is strictly
read-only. The impersonation token grants no write permissions and cannot be escalated. This
invariant must not be broken when modifying the auth layer.

---

## Production Boot Guardrails

The server refuses to start in `NODE_ENV=production` when any of the following conditions is
detected. Each check maps to a concrete attack vector.

### 1. Missing required environment variables

**Check:** `JWT_SECRET` and `MONGO_URI` must be set; if either is absent the process exits
immediately.

**Why it matters:** A missing `JWT_SECRET` would cause the application to either crash at the
first token operation or fall back to an empty string, making every token trivially forgeable.

### 2. JWT_SECRET minimum length

**Check:** `JWT_SECRET.length < 32` causes a fatal exit even outside production.

**Why it matters:** HMAC-SHA256 provides no meaningful security with a short, guessable key. A
secret shorter than 32 characters can be brute-forced offline once an attacker captures a valid
token.

### 3. JWT_SECRET must not look like a default value

**Check (production only):** The secret is tested against
`/dev|changeme|secret_key|not_for_production|example|placeholder/i`. A match causes a fatal exit.

**Why it matters:** Default secrets appear in documentation, Docker images, and public
repositories. An attacker who recognises a default value can immediately forge arbitrary tokens.

### 4. E2E_MODE must not be enabled in production

**Check (production only):** `E2E_MODE=true` causes a fatal exit.

**Why it matters:** `E2E_MODE` disables the login rate-limiter. Without rate-limiting, an
attacker can perform an unlimited number of credential-stuffing or brute-force attempts against
the login endpoint.

### 5. MONGO_URI must not use the default password

**Check (production only):** The URI is tested against `/:changeme@|password=changeme/i`. A
match causes a fatal exit.

**Why it matters:** `changeme` is the default password shipped in the project's Docker Compose
development file. Deploying it as-is would expose the database to anyone who knows the hostname.

### 6. JWT_REFRESH_SECRET must be independent

**Check (production only):**

- `JWT_REFRESH_SECRET` must be set and at least 32 characters long.
- It must not equal `JWT_SECRET`.
- It must not equal `JWT_SECRET + "_refresh"` (a naive derivation pattern).

**Why it matters:** If both tokens share the same secret, compromising one compromises the other.
An attacker who obtains the access-token secret could forge long-lived refresh tokens and maintain
persistent access even after the access token expires.

### 7. LDAP TLS verification must not be disabled

**Check (production only):** `LDAP_TLS_REJECT_UNAUTHORIZED=false` causes a fatal exit.

**Why it matters:** Disabling certificate verification opens the LDAP connection to
man-in-the-middle attacks. An attacker positioned on the network could present a forged
certificate, intercept all LDAP traffic, and accept or deny authentications arbitrarily.

---

## Dependency Security

### Dependabot

Dependabot is enabled for all three package ecosystems in this repository:

| Ecosystem | Directory | Schedule |
|-----------|-----------|----------|
| npm (frontend) | `/frontend-v2` | Weekly |
| npm (backend) | `/mongo/server` | Weekly |
| GitHub Actions | `/` | Weekly |

Dependabot opens pull requests automatically when a dependency has a newer version, and
prioritises updates that address known CVEs. PRs are labelled `dependencies` + the relevant
layer (`frontend`, `backend`, or `ci`).

### npm audit CI workflow

The `Security — npm audit` workflow runs `npm audit --audit-level=high` for both the frontend and
backend workspaces on every push and pull request targeting `main`, and on a weekly cron schedule
(Mondays at 06:00 UTC). The weekly run catches vulnerabilities published between commits.

The workflow fails **only on `high` and `critical` severity findings** to avoid blocking on
low-severity noise. `fail-fast: false` ensures both workspaces are always audited even if one
fails.

---

## CodeQL Code Scanning

CodeQL static analysis is free for **public repositories** through GitHub's default setup.
For **private repositories** it requires **GitHub Advanced Security** (a paid GitHub Enterprise
add-on). If this repository is private and GitHub Advanced Security is not available, consider
running CodeQL locally via the CodeQL CLI or a self-hosted runner with the appropriate licence.
