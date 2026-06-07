# LDAP Docker Test Server

> ⚠️ **This setup is for local testing only.** Do not use it in production.  
> For production, point NX-RH at your corporate Active Directory or OpenLDAP server.

---

## Purpose

This guide sets up a local **LDAPS** (LDAP over TLS) server using `bitnami/openldap`
on port **1636**. It lets you test NX-RH LDAP authentication without needing access
to a real corporate directory.

---

## Architecture

```
NX-RH Express app
       │  LDAPS (port 1636)
       ▼
bitnami/openldap container
  Domain : dc=nxrh,dc=local
  Admin  : cn=admin,dc=nxrh,dc=local
  Users  : ou=people,dc=nxrh,dc=local
```

---

## Step-by-Step Setup

### Step 1 — Generate TLS certificates

The LDAP container needs a server certificate. Re-use the project's cert generation script
or generate a dedicated pair:

```bash
# Generate a self-signed cert for the LDAP server
mkdir -p ldap-test/certs

openssl req -x509 \
  -nodes -days 365 \
  -newkey rsa:2048 \
  -keyout ldap-test/certs/ldap.key \
  -out    ldap-test/certs/ldap.crt \
  -subj   "/C=FR/O=NanoXplore/CN=localhost" \
  -addext "subjectAltName=DNS:localhost,IP:127.0.0.1"
```

### Step 2 — Write the Docker Compose file

Create `ldap-test/docker-compose.yml`:

```yaml
services:
  openldap:
    image: bitnami/openldap:2
    container_name: nx_ldap_test
    ports:
      - "1389:1389"   # plain LDAP  (dev convenience)
      - "1636:1636"   # LDAPS       (what NX-RH uses)
    environment:
      LDAP_ROOT: "dc=nxrh,dc=local"
      LDAP_ADMIN_USERNAME: "admin"
      LDAP_ADMIN_PASSWORD: "admin_secret"
      LDAP_CONFIG_ADMIN_ENABLED: "yes"
      LDAP_CONFIG_ADMIN_USERNAME: "config_admin"
      LDAP_CONFIG_ADMIN_PASSWORD: "config_secret"
      LDAP_ENABLE_TLS: "yes"
      LDAP_TLS_CERT_FILE: "/certs/ldap.crt"
      LDAP_TLS_KEY_FILE:  "/certs/ldap.key"
      LDAP_TLS_CA_FILE:   "/certs/ldap.crt"   # self-signed: cert is its own CA
      LDAP_TLS_VERIFY_CLIENT: "never"
    volumes:
      - ./certs:/certs:ro
      - openldap_data:/bitnami/openldap
    restart: unless-stopped

volumes:
  openldap_data:
```

### Step 3 — Start the container

```bash
cd ldap-test
docker compose up -d
docker compose logs -f openldap   # wait for "slapd starting"
```

### Step 4 — Verify LDAPS connectivity

```bash
# Test with ldapsearch (install: brew install openldap / apt install ldap-utils)
LDAPTLS_REQCERT=never ldapsearch \
  -H ldaps://localhost:1636 \
  -D "cn=admin,dc=nxrh,dc=local" \
  -w admin_secret \
  -b "dc=nxrh,dc=local" \
  "(objectClass=*)" dn

# Expected output: dn: dc=nxrh,dc=local (and any loaded entries)
```

### Step 5 — Load test users

Create `ldap-test/test-users.ldif`:

```ldif
dn: ou=people,dc=nxrh,dc=local
objectClass: organizationalUnit
ou: people

dn: uid=alice,ou=people,dc=nxrh,dc=local
objectClass: inetOrgPerson
objectClass: posixAccount
uid: alice
cn: Alice Martin
sn: Martin
givenName: Alice
mail: alice@nxrh.local
userPassword: Alice1234!
uidNumber: 1001
gidNumber: 1001
homeDirectory: /home/alice

dn: uid=bob,ou=people,dc=nxrh,dc=local
objectClass: inetOrgPerson
objectClass: posixAccount
uid: bob
cn: Bob Dupont
sn: Dupont
givenName: Bob
mail: bob@nxrh.local
userPassword: Bob1234!
uidNumber: 1002
gidNumber: 1001
homeDirectory: /home/bob

dn: uid=carol,ou=people,dc=nxrh,dc=local
objectClass: inetOrgPerson
objectClass: posixAccount
uid: carol
cn: Carol Leroy
sn: Leroy
givenName: Carol
mail: carol@nxrh.local
userPassword: Carol1234!
uidNumber: 1003
gidNumber: 1001
homeDirectory: /home/carol
```

Load it:

```bash
LDAPTLS_REQCERT=never ldapadd \
  -H ldaps://localhost:1636 \
  -D "cn=admin,dc=nxrh,dc=local" \
  -w admin_secret \
  -f test-users.ldif
```

---

## Test Users

| uid | Password | NX-RH role (set in DB) | Notes |
|-----|----------|------------------------|-------|
| `alice` | `Alice1234!` | `admin` | Full access |
| `bob` | `Bob1234!` | `manager` | Can review evaluations |
| `carol` | `Carol1234!` | `employee` | Standard user |

> Roles are **never read from LDAP** — they are managed in MongoDB by an NX-RH admin.
> On first LDAP login, a new user is created in MongoDB with the default `employee` role.

---

## Configuring NX-RH to Use This LDAP Server

Edit your NX-RH `.env`:

```dotenv
AUTH_PROVIDER=ldap
LDAP_TYPE=openldap

# The test container, accessed from the host
LDAP_URL=ldaps://localhost:1636

LDAP_BASE_DN=dc=nxrh,dc=local
LDAP_BIND_DN=cn=admin,dc=nxrh,dc=local
LDAP_BIND_PASSWORD=admin_secret
LDAP_USER_SEARCH_BASE=ou=people,dc=nxrh,dc=local
LDAP_USER_FILTER=(uid={{u}})

# Allow self-signed certificate (test only — never in production)
LDAP_TLS_REJECT_UNAUTHORIZED=false
```

If NX-RH runs inside Docker (not on the host), replace `localhost` with the host IP
or use `host.docker.internal`:

```dotenv
LDAP_URL=ldaps://host.docker.internal:1636
```

---

## Troubleshooting

### Certificate verification error

```
Error: unable to verify the first certificate
```

Set `LDAP_TLS_REJECT_UNAUTHORIZED=false` in `.env`.  
This is expected with self-signed certs in development.

### Container exits immediately

Check logs for port conflicts or missing cert files:

```bash
docker compose logs openldap
```

Ensure the cert files exist and are readable:

```bash
ls -la ldap-test/certs/
```

### Bind failure (`Invalid credentials`)

Verify the admin DN and password:

```bash
LDAPTLS_REQCERT=never ldapsearch \
  -H ldaps://localhost:1636 \
  -D "cn=admin,dc=nxrh,dc=local" \
  -w admin_secret \
  -b "dc=nxrh,dc=local" "(objectClass=*)"
```

### NX-RH returns "User not found" after successful LDAP bind

The user's `mail` attribute in LDAP must match the email stored (or to be created) in
MongoDB. Double-check the `mail:` field in the LDIF and the login form input.

### LDAP filter not matching

The filter `(uid={{u}})` matches the `uid` attribute. If users log in with their email,
change the filter to `(mail={{u}})` and update `LDAP_USER_FILTER` accordingly.

---

## Security Note

This test environment uses:
- A **self-signed certificate** (not trusted by browsers or OS)
- A **simple admin password** (`admin_secret`)
- `LDAP_TLS_REJECT_UNAUTHORIZED=false` in NX-RH

**None of these settings are acceptable in production.**  
For production, use `ldaps://` with a valid CA-signed certificate and
`LDAP_TLS_REJECT_UNAUTHORIZED=true`.
