# NanoXplore RH — Environment Variables Reference

This document is the authoritative reference for all environment variables consumed by the
backend (`mongo/server/`). Variables are read at startup via `dotenv` from a `.env` file at
the project root. See `.env.example` (development) and `.env.prod.example` (production
template) for ready-to-copy examples.

> **Admin UI overrides.** Several runtime settings — SMTP credentials, LDAP configuration,
> and branding — can also be configured from the admin UI and are stored in the database
> (MongoDB `Config` collection). When a database value is present it **takes precedence**
> over the corresponding environment variable. Environment variables serve as the initial
> defaults and as a fallback when no database value has been set.

---

## Security constraints enforced at boot

The server calls `process.exit(1)` before accepting any traffic when:

- `JWT_SECRET` is shorter than 32 characters (any environment).
- `MONGO_URI` or `JWT_SECRET` are absent (any environment).
- In `NODE_ENV=production`:
  - `JWT_SECRET` matches a known placeholder pattern (`dev`, `changeme`, `secret_key`, `not_for_production`, `example`, `placeholder`).
  - `JWT_REFRESH_SECRET` is absent, shorter than 32 characters, or equal to / derived from `JWT_SECRET`.
  - `E2E_MODE=true` (disables login rate-limiting).
  - `MONGO_URI` contains the default password `changeme`.
  - `LDAP_TLS_REJECT_UNAUTHORIZED=false`.

---

## 1. Core

| Variable | Required? | Default | Description |
|---|---|---|---|
| `NODE_ENV` | Yes | — | Runtime environment. Must be `production` in production; triggers security guards and HSTS/CSP upgrades. |
| `PORT` | No | `3000` | TCP port the Express server listens on. |
| `MONGO_URI` | **Yes** | — | Full MongoDB connection string including credentials and database name. Must not contain the password `changeme` in production. Also accepted as `MONGODB_URI` in some internal utilities. |
| `MONGO_ROOT_USER` | Yes (Docker) | — | MongoDB root username injected into the `mongo` container via `MONGO_INITDB_ROOT_USERNAME`. Required by `docker-compose.yml`. |
| `MONGO_ROOT_PASSWORD` | Yes (Docker) | — | MongoDB root password injected into the `mongo` container. Required by `docker-compose.yml`. |
| `MONGO_DB` | No | `nanoxplore_rh` | Database name passed to the `mongo` container as `MONGO_INITDB_DATABASE`. |
| `MONGODB_MIN_POOL` | No | driver default | Minimum number of MongoDB connection pool connections. |
| `MONGODB_MAX_POOL` | No | driver default | Maximum number of MongoDB connection pool connections. |
| `JWT_SECRET` | **Yes** | — | Secret used to sign access tokens. **Minimum 32 characters.** Must not look like a placeholder in production. Recommended: `openssl rand -hex 48` (96 chars). |
| `JWT_REFRESH_SECRET` | Yes (prod) | — | Independent secret for refresh tokens. **Minimum 32 characters.** Must not be equal to or derived from `JWT_SECRET`. Required and validated in production. |
| `JWT_EXPIRES_IN` | No | `1h` | Lifetime of access tokens (any value accepted by the `jsonwebtoken` library, e.g. `1h`, `8h`). |
| `JWT_REFRESH_EXPIRES_IN` | No | `7d` | Lifetime of refresh tokens. |
| `BCRYPT_ROUNDS` | No | `12` | bcrypt work factor for hashing passwords. Lower values (e.g. `1`) speed up tests. |
| `LOG_LEVEL` | No | `info` | Winston log level: `debug`, `info`, `warn`, or `error`. |
| `LOG_DIR` | No | — | Directory for log files. When absent, logs go to stdout only. |
| `SCHEDULER_DISABLED` | No | `false` | Set to `true` to skip starting the cron scheduler (useful in CI or test environments). |

---

## 2. Cookies and CORS

| Variable | Required? | Default | Description |
|---|---|---|---|
| `COOKIE_SECURE` | No | `false` | Set to `true` in production to mark auth cookies as `Secure` (requires HTTPS). Hardcoded to `true` in `docker-compose.yml` for the `app` service. |
| `CLIENT_ORIGIN` | No | `http://localhost:5173` | Comma-separated list of allowed CORS origins. A bare `*` is rejected at startup. Use the public HTTPS URL in production. |
| `FRONTEND_URL` | No | `http://localhost:5173` | Base URL used when constructing links in outgoing emails (password reset, user import, notifications). |

---

## 3. Email / SMTP

The mailer reads from the database first (keys `smtp.*`); environment variables are the fallback.
Both sets of variables serve the same purpose — `MAIL_*` is used by the mailer service and
`SMTP_*` is used by the admin status/health-check endpoint (`/api/admin/status`).

| Variable | Required? | Default | Description |
|---|---|---|---|
| `MAIL_HOST` | No | — | SMTP server hostname for sending application emails. When absent, a temporary Ethereal test account is used (dev mode). |
| `MAIL_PORT` | No | `587` | SMTP port. Common values: `587` (STARTTLS), `465` (SMTPS). |
| `MAIL_SECURE` | No | `false` (unless port 465) | Set to `true` for implicit TLS (SMTPS / port 465). `false` uses STARTTLS. |
| `MAIL_USER` | No | — | SMTP authentication username. |
| `MAIL_PASSWORD` | No | — | SMTP authentication password. |
| `MAIL_FROM` | No | `<adresse-expéditeur>` | Sender address used in the `From` header of all outgoing emails. Overridable via the admin UI (`smtp.from` config key). |
| `SMTP_HOST` | No | — | SMTP hostname for the admin status health-check. Can mirror `MAIL_HOST`. Leave blank to skip the SMTP connectivity check. |
| `SMTP_PORT` | No | `587` | SMTP port for the admin health-check. |
| `SMTP_SECURE` | No | `false` | TLS mode for the admin health-check SMTP connection. |
| `SMTP_USER` | No | — | SMTP username for the admin health-check. |
| `SMTP_PASS` | No | — | SMTP password for the admin health-check. |
| `SMTP_FROM` | No | — | Sender address used by the admin health-check mailer. |

---

## 4. LDAP

LDAP is optional. When `LDAP_URL` is not set the server operates in local-only authentication
mode (passwords hashed with bcrypt). When enabled, all five core variables below are required
by `config/ldap.js`; the server throws at the first LDAP authentication attempt if any are
missing.

LDAP settings can also be managed from the admin UI (`/admin/integrations`), which stores
them in the database and takes precedence over these variables.

| Variable | Required? | Default | Description |
|---|---|---|---|
| `LDAP_URL` | No | — | LDAP server URL. Use `ldaps://` for TLS (recommended). Example: `ldaps://dc.corp.local:636`. When absent, LDAP is disabled. |
| `LDAP_BASE_DN` | Yes (if LDAP enabled) | — | Base Distinguished Name for directory searches. Example: `DC=corp,DC=local`. |
| `LDAP_BIND_DN` | Yes (if LDAP enabled) | — | DN of the service account used to bind and search the directory. |
| `LDAP_BIND_PASSWORD` | Yes (if LDAP enabled) | — | Password for the LDAP service account. |
| `LDAP_USER_FILTER` | Yes (if LDAP enabled) | `(uid={{u}})` | LDAP search filter. Use `{{u}}` as a placeholder for the username. Active Directory example: `(sAMAccountName={{u}})`. Username input is escaped before substitution. |
| `LDAP_TYPE` | No | `activedirectory` | Directory flavour hint: `activedirectory` or `openldap`. Guides filter and attribute mapping. |
| `LDAP_USER_SEARCH_BASE` | No | — | Subtree DN to restrict user searches to. Falls back to `LDAP_BASE_DN` when absent. |
| `LDAP_TLS_REJECT_UNAUTHORIZED` | No | `true` | Set to `false` only in development with self-signed certificates. **Forbidden in production** — the server refuses to start if this is `false` and `NODE_ENV=production`. |

---

## 5. Uploads and Storage

By default uploaded files are stored on the local filesystem. All three `MINIO_*` variables
must be set to switch to MinIO / S3-compatible object storage.

| Variable | Required? | Default | Description |
|---|---|---|---|
| `UPLOADS_DIR` | No | `./uploads` | Local directory for uploaded HR documents. In Docker production the volume `uploads_data` is mounted at `/data/uploads`. |
| `MINIO_ENDPOINT` | No | — | MinIO / S3-compatible endpoint hostname. Must be set together with `MINIO_PORT` and `MINIO_ACCESS_KEY` to enable object storage. |
| `MINIO_PORT` | No | — | Port for the MinIO endpoint (e.g. `9000`). |
| `MINIO_USE_SSL` | No | `false` | Set to `true` to use HTTPS when connecting to MinIO. |
| `MINIO_ACCESS_KEY` | No | — | MinIO / S3 access key (analogous to an AWS access key ID). |
| `MINIO_SECRET_KEY` | No | — | MinIO / S3 secret key (analogous to an AWS secret access key). |
| `MINIO_BUCKET` | No | `nxrh` | Name of the MinIO bucket used to store uploaded files. |

---

## 6. Misc / Feature Flags

| Variable | Required? | Default | Description |
|---|---|---|---|
| `E2E_MODE` | No | — | Set to `true` to bypass the login rate-limiter during end-to-end test runs. **Must not be set in production** — the server rejects it at boot. |
| `RELAX_RATE_LIMIT` | No | — | When truthy, relaxes API rate limits (useful for load-testing or internal tooling). Do not set in production. |
| `AUTH_PROVIDER` | No | `local` | Authentication provider: `local` (bcrypt) or `ldap`. In practice, LDAP mode is activated by the presence of `LDAP_URL`. |
| `HOSTNAME` | No | OS hostname | Exposed in the `/api/metrics` response as `instanceId`. Automatically set by Docker. |
| `SEED_VERBOSE` | No | — | When truthy, the database seed script prints verbose output. Development only. |
| `ADMIN_EMAIL` | No | — | Initial admin account email created by the seed script. |
| `ADMIN_FIRSTNAME` | No | — | First name for the initial admin account created by the seed script. |
| `ADMIN_LASTNAME` | No | — | Last name for the initial admin account created by the seed script. |
| `ADMIN_PASSWORD` | No | — | Password for the initial admin account created by the seed script. |
