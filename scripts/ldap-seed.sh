#!/usr/bin/env bash
# =============================================================================
# scripts/ldap-seed.sh — Peuple les 2 annuaires OpenLDAP de dev (après démarrage)
#
# Le bootstrap automatique d'osixia (montage de LDIF) est fragile et destructif
# (chown/sed/rm sur le fichier monté). On charge donc les données APRÈS le
# démarrage des conteneurs, de façon idempotente.
#
# Usage :
#   docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d
#   ./scripts/ldap-seed.sh
#
# Mot de passe de tous les comptes LDAP après seed : Test1234!
# =============================================================================
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PASS="Test1234!"

seed_dir() {
  local container="$1" base="$2" admin="$3" adminpw="$4" ldif="$5"
  echo "▶  $container ($base)"
  # 1. charger les entrées (ignore « already exists »)
  docker exec -i "$container" ldapadd -c -x -H ldap://localhost \
    -D "$admin" -w "$adminpw" < "$ldif" >/dev/null 2>&1 || true
  # 2. fixer un mot de passe connu pour chaque utilisateur
  local dns
  dns=$(docker exec "$container" ldapsearch -x -LLL -H ldap://localhost \
    -b "$base" -D "$admin" -w "$adminpw" "(objectClass=inetOrgPerson)" dn 2>/dev/null \
    | awk '/^dn: /{print substr($0,5)}')
  local n=0
  while IFS= read -r dn; do
    [ -z "$dn" ] && continue
    docker exec "$container" ldappasswd -x -H ldap://localhost \
      -D "$admin" -w "$adminpw" -s "$PASS" "$dn" >/dev/null 2>&1 || true
    n=$((n+1))
  done <<< "$dns"
  echo "   ✓ $n comptes (mot de passe : $PASS)"
}

seed_dir nx_openldap  "dc=nxrh,dc=local"    "cn=admin,dc=nxrh,dc=local"    adminpass   "$ROOT/docker/ldap/seed.ldif"
seed_dir nx_openldap2 "dc=partner,dc=local" "cn=admin,dc=partner,dc=local" partnerpass "$ROOT/docker/ldap/seed-partner.ldif"

echo "✅  LDAP seedé. Exemples de login :"
echo "   marie.dupont@nxrh.local   / Test1234!   (annuaire NX-RH)"
echo "   alice.partner@partner.local / Test1234! (annuaire Partner)"
