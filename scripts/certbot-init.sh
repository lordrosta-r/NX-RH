#!/usr/bin/env bash
# =============================================================================
# certbot-init.sh — Obtain a Let's Encrypt certificate (production)
#
# Prerequisites:
#   - Your domain's DNS must point to this server's public IP
#   - Port 80 must be open (ACME HTTP-01 challenge)
#   - certbot must be installed: apt install certbot  OR  brew install certbot
#
# Usage:
#   ./scripts/certbot-init.sh your-domain.com admin@your-domain.com
#
# After issuance, restart nginx:
#   docker compose restart nginx
# =============================================================================

set -euo pipefail

DOMAIN="${1:?Usage: $0 <domain> <email>}"
EMAIL="${2:?Usage: $0 <domain> <email>}"
CERTS_DIR="$(dirname "$0")/../nginx/certs"

certbot certonly \
  --standalone \
  --agree-tos \
  --non-interactive \
  --email "$EMAIL" \
  -d "$DOMAIN" \
  -d "www.$DOMAIN"

# Symlink Let's Encrypt certs to where nginx expects them
ln -sf "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" "$CERTS_DIR/fullchain.pem"
ln -sf "/etc/letsencrypt/live/$DOMAIN/privkey.pem"   "$CERTS_DIR/privkey.pem"

echo "✓ Certificates issued and linked to $CERTS_DIR"
echo ""
echo "Auto-renewal (add to crontab or systemd timer):"
echo "  0 3 * * * certbot renew --quiet && docker compose -f /path/to/docker-compose.yml restart nginx"
