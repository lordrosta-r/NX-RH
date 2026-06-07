# Configuration (depuis l'UI)

Tout se configure **depuis l'interface admin** — pas de fichier de conf à éditer.

## LDAP / Active Directory  (`/admin/ldap`)

Connexion de **plusieurs annuaires indépendants** (multi-source). Par source :

| Champ | Exemple |
|-------|---------|
| Hôte (URL) | `ldap://ad.entreprise.local:389` ou `ldaps://…:636` |
| Base DN | `dc=entreprise,dc=local` |
| Bind DN | `cn=svc-rh,ou=services,dc=entreprise,dc=local` |
| Mot de passe Bind | (laisser vide à l'édition = inchangé) |
| Filtre utilisateurs | `(&(objectClass=user)(mail=*))` |
| Attr. email / prénom / nom / département / titre / **manager** | `mail` / `givenName` / `sn` / `departmentNumber` / `title` / `manager` |
| **Comptes exclus (motifs)** | `svc-*, *@bots.local, admin*` |

Flux : **Tester** la connexion → **Prévisualiser** (qui sera importé) → **Synchroniser**.

- **Hiérarchie** : l'attribut `manager` (DN du responsable) est importé → l'organigramme se
  construit tout seul, sans orphelin. Les **rôles ne sont PAS importés** (l'AD n'est pas fiable
  là-dessus) : l'admin les attribue dans l'app.
- **Arrivée d'un nouvel utilisateur** : l'ajouter dans l'AD → cliquer **Synchroniser**. S'il
  arrive en cours de campagne, relancer **Générer les évaluations**.
- **Comptes système/service** : exclus par le `userFilter` (ne matche que les personnes) **et**
  toute entrée sans `mail` est ignorée. Le champ **Comptes exclus** ajoute des motifs : les
  comptes matchés sont ignorés à l'import **et désactivés (bloqués, réversible)** s'ils avaient
  déjà été absorbés. cf. [Gestion des comptes](Gestion-des-comptes).

## Certificat SSL  (`/admin/ssl`)

Téléverser `fullchain.pem` + `privkey.pem`. Le serveur **valide réellement** (cohérence
clé/cert via SPKI, dates d'expiration), écrit dans le volume `nginx/certs` de façon atomique
(privkey en 0600), puis indique de recharger nginx : `docker compose kill -s HUP nginx`.

## SMTP  (`/admin/mail-config` + `/admin/test-mail`)

Host / port / secure / utilisateur / expéditeur. **Preset OVH** fourni (`smtp.ovh.net:587`,
STARTTLS). Un email de test valide la configuration avant mise en service.
