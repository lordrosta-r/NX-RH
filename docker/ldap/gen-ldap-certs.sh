#!/usr/bin/env bash
set -euo pipefail

CERTS_DIR="./certs"

echo "==> Creating certs directory..."
mkdir -p "$CERTS_DIR"

echo "==> Generating CA key and self-signed certificate..."
openssl genrsa -out "$CERTS_DIR/ca.key" 4096

openssl req -new -x509 \
  -key "$CERTS_DIR/ca.key" \
  -out "$CERTS_DIR/ca.crt" \
  -days 3650 \
  -subj "/C=FR/ST=IDF/L=Paris/O=NX-RH/OU=IT/CN=NX-RH Test CA"

echo "==> Generating server key..."
openssl genrsa -out "$CERTS_DIR/ldap.key" 4096

echo "==> Creating CSR with SAN for localhost and ldap-test..."
openssl req -new \
  -key "$CERTS_DIR/ldap.key" \
  -out "$CERTS_DIR/ldap.csr" \
  -subj "/C=FR/ST=IDF/L=Paris/O=NX-RH/OU=IT/CN=ldap-test" \
  -addext "subjectAltName=DNS:localhost,DNS:ldap-test,IP:127.0.0.1"

echo "==> Signing server certificate with CA..."
openssl x509 -req \
  -in "$CERTS_DIR/ldap.csr" \
  -CA "$CERTS_DIR/ca.crt" \
  -CAkey "$CERTS_DIR/ca.key" \
  -CAcreateserial \
  -out "$CERTS_DIR/ldap.crt" \
  -days 3650 \
  -extfile <(printf "subjectAltName=DNS:localhost,DNS:ldap-test,IP:127.0.0.1\nbasicConstraints=CA:FALSE\nkeyUsage=digitalSignature,keyEncipherment\nextendedKeyUsage=serverAuth")

echo "==> Setting permissions..."
chmod 600 "$CERTS_DIR/ca.key" "$CERTS_DIR/ldap.key"
chmod 644 "$CERTS_DIR/ca.crt" "$CERTS_DIR/ldap.crt"

# Clean up CSR and serial file
rm -f "$CERTS_DIR/ldap.csr" "$CERTS_DIR/ca.srl"

echo ""
echo "✅ Certificates generated successfully in $CERTS_DIR:"
ls -la "$CERTS_DIR"
