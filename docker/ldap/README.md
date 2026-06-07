# LDAP Test Server for NX-RH

A local LDAPS test server using [bitnami/openldap:2.6](https://hub.docker.com/r/bitnami/openldap) with TLS enabled, pre-configured for NX-RH development.

---

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) & Docker Compose
- `openssl` (available in macOS/Linux by default)

---

## Quick Start

### 1. Generate TLS certificates

```bash
chmod +x gen-ldap-certs.sh && ./gen-ldap-certs.sh
```

This creates `./certs/ca.crt`, `./certs/ldap.crt`, and `./certs/ldap.key`.

### 2. Start the LDAP server

```bash
docker compose -f docker-compose.ldap.yml up -d
```

### 3. Test the connection

```bash
ldapsearch -x \
  -H ldaps://localhost:1636 \
  -D "cn=admin,dc=nxrh,dc=local" \
  -w adminpassword \
  -b "dc=nxrh,dc=local" \
  -o "TLS_CACERT=./certs/ca.crt" \
  "(objectClass=*)"
```

---

## Test Users

| Username        | Password      | Role      |
|-----------------|---------------|-----------|
| `john.doe`      | `employee123` | employee  |
| `jane.smith`    | `hr123`       | hr        |
| `bob.manager`   | `manager123`  | manager   |
| `alice.hr`      | `hr123`       | hr        |
| `carol.director`| `director123` | director  |

All users are under `ou=users,dc=nxrh,dc=local`.

---

## Load the test LDIF

```bash
docker exec -i ldap-test ldapadd \
  -x \
  -H ldap://localhost:1389 \
  -D "cn=admin,dc=nxrh,dc=local" \
  -w adminpassword \
  < test-users.ldif
```

> **Note:** The bitnami image already creates the users listed in `LDAP_USERS`. Use the LDIF only if you need to re-seed or add extra attributes (e.g., `description`/role).

---

## NX-RH App LDAPS Configuration

```env
LDAP_HOST=ldap-test          # or localhost when running outside Docker
LDAP_PORT=1636
LDAP_USE_TLS=true
LDAP_CA_CERT_PATH=./docker/ldap/certs/ca.crt
LDAP_BIND_DN=cn=admin,dc=nxrh,dc=local
LDAP_BIND_PASSWORD=adminpassword
LDAP_BASE_DN=ou=users,dc=nxrh,dc=local
```

---

## Stop the server

```bash
docker compose -f docker-compose.ldap.yml down
```
