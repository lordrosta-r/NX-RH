# Politique de sécurité

## Signaler une vulnérabilité

Merci de **ne pas ouvrir d'issue GitHub publique** pour les vulnérabilités de sécurité. Cela
exposerait la faille à tous avant qu'un correctif ne soit disponible.

Envoyez plutôt un e-mail privé à **security@nanoxplore.com** contenant :

- Une description de la vulnérabilité et du composant affecté.
- Les étapes de reproduction (preuve de concept si possible).
- Votre évaluation de l'impact potentiel.

Délai de réponse attendu : **accusé de réception sous 2 jours ouvrés**, calendrier de résolution
communiqué sous 7 jours ouvrés. Nous fixerons une date de divulgation avec vous une fois le
correctif prêt.

---

## Versions prises en charge

| Version | Prise en charge |
|---------|-----------------|
| 1.x     | Oui             |
| < 1.0   | Non             |

Seule la dernière version `1.x` reçoit les correctifs de sécurité.

---

## Modèle de sécurité

### Authentification

L'application prend en charge **deux modes d'authentification** :

- **Authentification locale** : pour les comptes `authSource: 'local'`, l'utilisateur s'identifie
  par e-mail et mot de passe ; seule l'empreinte du mot de passe (hash bcrypt) est stockée, jamais
  le mot de passe en clair.
- **Authentification LDAP** : les identifiants sont validés à la connexion contre un ou plusieurs
  annuaires LDAP activés (multi-annuaires). L'application ne stocke jamais les identifiants LDAP ;
  elle ne fait que les valider auprès de l'annuaire au moment de la connexion.

Quel que soit le mode, une connexion réussie émet deux JWT : un jeton d'accès (de courte durée de
vie) et un jeton de rafraîchissement (de durée de vie plus longue), tous deux stockés dans des
**cookies httpOnly** avec l'attribut `SameSite=Strict` — ils ne sont jamais placés dans le
`localStorage` ni accessibles au JavaScript exécuté dans le navigateur.

### Jetons de session

| Propriété | Valeur |
|-----------|--------|
| Stockage  | Cookies httpOnly (ni localStorage, ni en-tête Authorization) |
| Longueur minimale du jeton d'accès | 32 caractères d'entropie aléatoire |
| Jeton de rafraîchissement | Secret indépendant, au minimum 32 caractères, ne devant pas être dérivé du secret du jeton d'accès |
| Transport | HTTPS uniquement en production |

### Contrôle d'accès basé sur les rôles (RBAC)

Chaque route protégée est encadrée par `AuthGuard` (frontend) et un middleware correspondant côté
backend. Les rôles pris en charge sont `admin`, `hr`, `manager` et `employee`. Un utilisateur ne
peut accéder qu'aux pages et points d'API correspondant à son rôle.

### Invariant d'impersonation en lecture seule

Lorsqu'un administrateur usurpe l'identité d'un autre utilisateur à des fins de support, la
session est strictement en lecture seule. Le jeton d'impersonation n'accorde aucune permission
d'écriture et ne peut pas être élevé en privilèges. Cet invariant ne doit pas être rompu lors de
toute modification de la couche d'authentification.

---

## Garde-fous au démarrage en production

Le serveur refuse de démarrer en `NODE_ENV=production` lorsque l'une des conditions suivantes est
détectée. Chaque vérification correspond à un vecteur d'attaque concret.

### 1. Variables d'environnement requises manquantes

**Vérification :** `JWT_SECRET` et `MONGO_URI` doivent être définies ; si l'une des deux est
absente, le processus s'arrête immédiatement.

**Pourquoi c'est important :** un `JWT_SECRET` manquant ferait soit planter l'application à la
première opération sur un jeton, soit la ferait se rabattre sur une chaîne vide, rendant tout
jeton trivialement falsifiable.

### 2. Longueur minimale de JWT_SECRET

**Vérification :** `JWT_SECRET.length < 32` provoque un arrêt fatal, même en dehors de la
production.

**Pourquoi c'est important :** HMAC-SHA256 n'offre aucune sécurité réelle avec une clé courte et
devinable. Un secret de moins de 32 caractères peut être cassé hors ligne par force brute une fois
qu'un attaquant a capturé un jeton valide.

### 3. JWT_SECRET ne doit pas ressembler à une valeur par défaut

**Vérification (production uniquement) :** le secret est testé contre
`/dev|changeme|secret_key|not_for_production|example|placeholder/i`. Une correspondance provoque
un arrêt fatal.

**Pourquoi c'est important :** les secrets par défaut apparaissent dans la documentation, les
images Docker et les dépôts publics. Un attaquant qui reconnaît une valeur par défaut peut
immédiatement falsifier des jetons arbitraires.

### 4. E2E_MODE ne doit pas être activé en production

**Vérification (production uniquement) :** `E2E_MODE=true` provoque un arrêt fatal.

**Pourquoi c'est important :** `E2E_MODE` désactive le limiteur de débit (rate-limiter) sur la
connexion. Sans limitation de débit, un attaquant peut effectuer un nombre illimité de tentatives
de credential stuffing ou de force brute contre le point d'entrée de connexion.

### 5. MONGO_URI ne doit pas utiliser le mot de passe par défaut

**Vérification (production uniquement) :** l'URI est testée contre `/:changeme@|password=changeme/i`.
Une correspondance provoque un arrêt fatal.

**Pourquoi c'est important :** `changeme` est le mot de passe par défaut livré dans le fichier
Docker Compose de développement du projet. Le déployer tel quel exposerait la base de données à
quiconque connaît le nom d'hôte.

### 6. JWT_REFRESH_SECRET doit être indépendant

**Vérification (production uniquement) :**

- `JWT_REFRESH_SECRET` doit être défini et compter au moins 32 caractères.
- Il ne doit pas être égal à `JWT_SECRET`.
- Il ne doit pas être égal à `JWT_SECRET + "_refresh"` (un schéma de dérivation naïf).

**Pourquoi c'est important :** si les deux jetons partagent le même secret, compromettre l'un
compromet l'autre. Un attaquant qui obtient le secret du jeton d'accès pourrait falsifier des
jetons de rafraîchissement de longue durée et maintenir un accès persistant même après
l'expiration du jeton d'accès.

### 7. La vérification TLS du LDAP ne doit pas être désactivée

**Vérification (production uniquement) :** `LDAP_TLS_REJECT_UNAUTHORIZED=false` provoque un arrêt
fatal.

**Pourquoi c'est important :** désactiver la vérification du certificat ouvre la connexion LDAP aux
attaques de l'homme du milieu (man-in-the-middle). Un attaquant positionné sur le réseau pourrait
présenter un certificat falsifié, intercepter tout le trafic LDAP, et accepter ou refuser les
authentifications de manière arbitraire.

---

## Sécurité des dépendances

### Dependabot

Dependabot est activé pour les trois écosystèmes de paquets de ce dépôt :

| Écosystème | Répertoire | Fréquence |
|------------|------------|-----------|
| npm (frontend) | `/frontend-v2` | Hebdomadaire |
| npm (backend) | `/mongo/server` | Hebdomadaire |
| GitHub Actions | `/` | Hebdomadaire |

Dependabot ouvre automatiquement des pull requests lorsqu'une dépendance dispose d'une version plus
récente, et priorise les mises à jour qui corrigent des CVE connues. Les PR sont étiquetées
`dependencies` + la couche concernée (`frontend`, `backend` ou `ci`).

### Workflow CI npm audit

Le workflow `Security — npm audit` exécute `npm audit --audit-level=high` pour les workspaces
frontend et backend à chaque push et pull request ciblant `main`, ainsi que selon une planification
cron hebdomadaire (les lundis à 06:00 UTC). L'exécution hebdomadaire détecte les vulnérabilités
publiées entre deux commits.

Le workflow n'échoue **que sur les findings de sévérité `high` et `critical`** afin d'éviter de
bloquer sur le bruit de faible sévérité. `fail-fast: false` garantit que les deux workspaces sont
toujours audités, même si l'un échoue.

---

## Analyse de code CodeQL

L'analyse statique CodeQL est gratuite pour les **dépôts publics** via la configuration par défaut
de GitHub. Pour les **dépôts privés**, elle requiert **GitHub Advanced Security** (un module
payant de GitHub Enterprise). Si ce dépôt est privé et que GitHub Advanced Security n'est pas
disponible, envisagez d'exécuter CodeQL localement via la CodeQL CLI ou un runner auto-hébergé
disposant de la licence appropriée.
