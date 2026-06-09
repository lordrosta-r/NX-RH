# NanoXplore RH — Administrator Configuration Guide

This document covers every area of the application that an administrator configures through
the UI. All settings described here are persisted in MongoDB (the `Config` collection) and
take effect at runtime without a server restart, unless stated otherwise.

---

## 1. First Login and Changing the Default Admin Password

The very first administrator account is created by running the bootstrap script once against
an empty database:

```bash
ADMIN_EMAIL=<email-admin> ADMIN_PASSWORD='MyStrongPass!' \
  node mongo/server/scripts/bootstrap-admin.js
```

The script is **idempotent**: it refuses to run if an active admin account already exists.

**If `ADMIN_PASSWORD` is not supplied**, the account is created with the hardcoded default
password `Admin@Change2026` and the flag `mustChangePassword` is set to `true` on the user
record. This flag is surfaced in the configuration status dashboard so the administrator
knows action is required.

On first login with that default password, the application enforces a password-change flow
before granting access to any other page. Once the password has been changed, the
`mustChangePassword` flag is cleared and the flag no longer appears in the configuration
status.

The minimum password length enforced by the bootstrap script is 12 characters.

---

## 2. LDAP Directories

**UI path:** Administration > LDAP directory (`/admin/ldap`)

The application supports multiple simultaneous LDAP sources. Each source is an independent
configuration block. Changes to the list of sources are held locally in the browser until
the administrator clicks **Save** — an unsaved-changes warning is displayed as long as a
draft exists. The Save button is disabled while there are validation errors.

### Adding a source

Click **Add directory**. A new source block appears with the following fields:

| Field | Description | Default |
|---|---|---|
| Name (label) | Free-text display name for this directory | "New directory" |
| Enabled | Whether this source is active for authentication and sync | checked |
| Host (URL) | LDAP server URL, e.g. `ldap://openldap:389` or `ldaps://dc.example.com:636` | `ldap://` |
| Base DN | Search root, e.g. `dc=example,dc=com` | — |
| Bind DN | Service account DN, e.g. `cn=admin,dc=example,dc=com` | — |
| Bind password | Password for the service account | — |
| User filter | LDAP filter to select user entries | `(objectClass=person)` |
| Default role | Role assigned to newly created users during sync | `employee` |
| Exclude patterns | Comma-separated glob patterns matched against email and DN to skip service/system accounts, e.g. `svc-*, *@bots.local` | — |

**Attribute mapping** — a second set of fields maps LDAP attributes to application fields:

| Field | Default LDAP attribute |
|---|---|
| Email attribute | `mail` |
| First name attribute | `givenName` |
| Last name attribute | `sn` |

The `manager` LDAP attribute (default: `manager`) is resolved automatically during sync
to populate the `managerId` hierarchy field. It does not appear as a configurable field in
the UI.

### TLS behaviour

In production (`NODE_ENV=production`) TLS certificate verification is always enforced and
cannot be disabled by a source configuration. In development it can be overridden via
`config.rejectUnauthorized` or the `LDAP_TLS_REJECT_UNAUTHORIZED=false` environment
variable.

### Test, Preview, Sync

These three actions are available per source. They are disabled while there is an unsaved
draft — save first.

- **Test** — opens a bind/unbind connection to verify the host, Bind DN and password are
  correct. Returns a success or error message inline.
- **Preview** — fetches up to 500 entries from the directory (using the configured filter
  and attribute mapping) and displays them in a table showing CN, email and DN. No data is
  written to the database.
- **Sync** — performs a full upsert against MongoDB (up to 1 000 entries per run):
  - Entries matching an exclude pattern are skipped. If a matching account was previously
    imported, it is **blocked** (not deleted) and marked with the reason
    "System/service account excluded (LDAP sync)".
  - New entries are created with a random bcrypt password; they authenticate via LDAP.
  - Existing entries have their name, department, position and DN updated; their password
    is never overwritten.
  - The `manager` DN attribute is resolved in a second pass to link `managerId` in the
    hierarchy. Self-referencing manager relationships are silently ignored.
  - After sync, the UI shows a summary: **created**, **updated**, **skipped**, **errors**.

**Important:** roles are never derived from Active Directory attributes. All users are
created with the configured `defaultRole`. An administrator assigns roles individually
inside the application.

---

## 3. SMTP Email

**UI path:** Administration > Mail configuration (`/admin/mail-config`)

### Fields

| Field | Description |
|---|---|
| SMTP host | Hostname of the mail server, e.g. `smtp.example.com` |
| SMTP port | Port number (common values: 587 for STARTTLS, 465 for implicit TLS) |
| Username | SMTP authentication username |
| Password | SMTP authentication password. If a password is already stored (`passwordSet` indicator), leaving the field blank keeps the existing value. |
| From (email) | Sender address, e.g. `<adresse-expéditeur>` |
| From (name) | Sender display name |
| Secure (TLS) | Checkbox — enable implicit TLS (port 465). Leave unchecked for STARTTLS on port 587. |

### OVH preset

Clicking the **OVH** preset button fills `smtpHost` with `smtp.ovh.net` and `smtpPort`
with `587`, leaving all other fields unchanged.

### Test send

A dedicated test panel on the same page lets the administrator enter a recipient address
and trigger a test email immediately via the **Send test** button. The page also exposes a
link to `/admin/test-mail` for a more detailed test-mail workflow.

### Fallback behaviour (no host configured)

When no SMTP host is stored, the mailer falls back to an automatically created Ethereal
test account (`ethereal.email`). Emails are not actually delivered but are captured and
a preview URL is logged server-side. This is intended for development environments only.

### Configuration priority

The mailer reads settings from MongoDB at startup (keys `smtp.host`, `smtp.port`,
`smtp.user`, `smtp.password`, `smtp.secure`, `smtp.from`), falling back to environment
variables (`MAIL_HOST`, `MAIL_PORT`, `MAIL_USER`, `MAIL_PASSWORD`, `MAIL_SECURE`,
`MAIL_FROM`). After saving through the UI, the in-memory transporter is invalidated and
rebuilt with the new settings on the next outbound email.

---

## 4. SSL Certificate

**UI path:** Administration > SSL certificate (`/admin/ssl` — part of the admin area)

### Certificate bootstrap on a fresh deployment

On a fresh deployment, no manual certificate setup is required before starting the stack.
The `cert-init` Docker service runs once at startup and, if `nginx/certs/fullchain.pem`
or `nginx/certs/privkey.pem` are absent, generates a self-signed certificate for
`localhost` into that directory. Nginx then starts normally. The certificate files are
never committed to the repository.

### Current certificate status

The page shows the currently installed certificate's common name (CN), validity end date
and number of days remaining. A badge turns red when fewer than 30 days remain.

### Uploading a real certificate

Two file pickers are provided:

- **Full chain** — accepts `.pem`, `.crt`, `.cer` files. This should contain the server
  certificate followed by any intermediate CA certificates.
- **Private key** — accepts `.pem`, `.key` files.

Both files are read as plain text in the browser. The content is validated client-side
(PEM markers, expiry, key/certificate match) before submission. Clicking **Install**
posts the two PEM strings to `POST /api/admin/ssl/cert`, which writes them atomically to
the shared `nginx/certs/` volume (`fullchain.pem` at mode 0644, `privkey.pem` at mode
0600).

### Applying the certificate

After a successful upload the page displays a confirmation toast. The certificate is not
active until nginx reloads its configuration. The page shows the following reload command
as a reminder:

```bash
docker compose kill -s HUP nginx
```

This sends SIGHUP to the nginx container, causing it to reload without downtime.

### Alternative: place certificates manually

Instead of using the UI, you can write `fullchain.pem` and `privkey.pem` directly into
`./nginx/certs/` on the host, then reload nginx:

```bash
# Copy your certificate files
cp /path/to/fullchain.pem ./nginx/certs/fullchain.pem
cp /path/to/privkey.pem   ./nginx/certs/privkey.pem

# Reload nginx (no downtime)
docker compose kill -s HUP nginx
```

To generate a self-signed certificate for a specific domain manually, use the helper
script:

```bash
bash scripts/gen-certs.sh your.domain.com
# Writes nginx/certs/fullchain.pem and nginx/certs/privkey.pem
docker compose kill -s HUP nginx
```

---

## 5. Company Logo / Branding

**UI path:** Administration > System configuration (`/admin/config`)

The administrator can upload a company logo that appears in the application navigation.

The logo must be supplied as a base64 data URL in one of the following formats: PNG, JPEG,
SVG, WebP or GIF. The maximum accepted size is approximately 500 KB (the raw base64 string
must be under 700 KB including the data URL prefix). The logo is stored in the `Config`
collection under the key `branding.logo` — no static file is written to disk.

The logo endpoint (`GET /api/branding`) is accessible to all authenticated roles so the
navigation bar can display it regardless of the user's role. Only administrators (`role:
admin`) can update it via `PUT /api/branding`. Setting the logo to `null` clears it.
