#!/usr/bin/env bash
# =============================================================================
# gen-certs.sh — Generate self-signed TLS certificates for local development
#
# Output: nginx/certs/fullchain.pem + nginx/certs/privkey.pem
# These paths are what nginx/conf.d/app.conf expects.
#
# DO NOT use self-signed certs in production.
# For production, use scripts/certbot-init.sh (Let's Encrypt) instead.
# =============================================================================

set -euo pipefail

CERTS_DIR="$(dirname "$0")/../nginx/certs"
mkdir -p "$CERTS_DIR"

DOMAIN="${1:-localhost}"

echo "Generating self-signed certificate for: $DOMAIN"

openssl req -x509 \
  -nodes \
  -days 365 \
  -newkey rsa:2048 \
  -keyout  "$CERTS_DIR/privkey.pem" \
  -out     "$CERTS_DIR/fullchain.pem" \
  -subj    "/C=FR/ST=IDF/L=Paris/O=NanoXplore/CN=$DOMAIN" \
  -extensions v3_req \
  -addext "subjectAltName=DNS:$DOMAIN,DNS:www.$DOMAIN,IP:127.0.0.1"

echo ""
echo "✓ Certificates written to $CERTS_DIR"
echo "  fullchain.pem  (certificate)"
echo "  privkey.pem    (private key)"
echo ""
echo "To trust the cert locally (macOS):"
echo "  sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain $CERTS_DIR/fullchain.pem"
