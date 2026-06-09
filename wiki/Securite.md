# Securite

> Page de synthese en francais. Reference detaillee : `SECURITY.md`.
> Voir aussi [[Architecture]].

---

## Signaler une vulnerabilite

Ne pas ouvrir une issue publique GitHub pour une vulnerabilite de securite. Cela exposerait la faille a tous avant qu'un correctif soit disponible.

Signaler la vulnerabilite par le **canal de securite interne de l'organisation** (ne pas ouvrir d'issue publique), en fournissant :

- Une description de la vulnerabilite et du composant affecte.
- Les etapes pour reproduire (preuve de concept si possible).
- Votre evaluation de l'impact potentiel.

Delai de reponse attendu : **accusé de reception dans les 2 jours ouvrables**, calendrier de resolution communique dans les 7 jours ouvrables. Une date de divulgation coordonnee sera convenue apres la mise en place d'un correctif.

---

## Versions supportees

| Version | Supportee |
|---------|-----------|
| 1.x     | Oui       |
| < 1.0   | Non       |

Seule la derniere version `1.x` recoit des correctifs de securite.

---

## Modele de securite

### JWT en cookies httpOnly — jamais localStorage

L'authentification est geree exclusivement via LDAP. L'application ne stocke jamais elle-meme les identifiants LDAP ; elle les valide uniquement contre l'annuaire au moment de la connexion. En cas de succes, deux JWT sont emis :

- un **token d'acces** (courte duree)
- un **token de rafraichissement** (longue duree)

Les deux sont stockes en **cookies httpOnly** — jamais dans `localStorage`, jamais dans un en-tete `Authorization` expose au JavaScript du navigateur.

| Propriete | Valeur |
|-----------|--------|
| Stockage | Cookies httpOnly (pas localStorage, pas en-tete Authorization) |
| Longueur minimale du secret d'acces | 32 caracteres d'entropie aleatoire |
| Token de rafraichissement | Secret independant, minimum 32 caracteres, ne doit pas etre derive du secret du token d'acces |
| Transport | HTTPS uniquement en production |

**Pourquoi c'est important :** un token dans `localStorage` peut etre lu par tout script sur la page, y compris une charge XSS injectee par un attaquant. Les cookies `httpOnly` ne sont pas accessibles au JavaScript du navigateur. Pour une application RH qui gere des donnees personnelles sensibles et des acces bases sur les roles aux evaluations des autres employes, cette distinction n'est pas theorique.

Le frontend ne voit jamais le token — il appelle seulement `/api/auth/me` pour connaitre l'utilisateur courant. A l'expiration de session (reponse HTTP 401), l'intercepteur axios global dans `src/api/client.ts` redirige automatiquement vers `/login`.

### RBAC par route — authGuard

Chaque route protegee est doublement protegee :

- **Cote frontend :** composant `<AuthGuard roles={[...]}>` dans `src/router/index.tsx`. Redirige vers `/login` si non authentifie, vers `/unauthorized` si le role ne correspond pas.
- **Cote backend :** middleware `authGuard(roles)` dans `mongo/server/middleware/authGuard.js`. Valide le cookie JWT et verifie le role avant que le handler de route ne soit atteint.

Les quatre roles actifs sont `admin`, `hr`, `manager` et `employee`. Le role `director` est retire ; les comptes legacy avec ce role sont traites comme des managers.

### Impersonation lecture seule

Quand un administrateur impersonne un autre utilisateur a des fins de support, la session est strictement en lecture seule. Le token d'impersonation n'accorde aucune permission d'ecriture et ne peut pas etre escalade. Le middleware `blockImpersonatedWrites` (`mongo/server/middleware/impersonationGuard.js`) impose cet invariant. **Cet invariant ne doit pas etre casse lors de modifications de la couche d'authentification.**

---

## Garde-fous au demarrage en production

Le serveur refuse de demarrer en `NODE_ENV=production` si l'une des conditions suivantes est detectee. Chaque verification correspond a un vecteur d'attaque concret.

### 1. Variables d'environnement requises manquantes

**Verification :** `JWT_SECRET` et `MONGO_URI` doivent etre definies ; si l'une est absente, le processus s'arrete immediatement.

**Pourquoi :** un `JWT_SECRET` manquant entrainerait soit un crash au premier appel de token, soit un repli sur une chaine vide, rendant tout token trivialement falsifiable.

### 2. Longueur minimale de JWT_SECRET

**Verification :** `JWT_SECRET.length < 32` provoque une sortie fatale, meme hors production.

**Pourquoi :** HMAC-SHA256 n'offre aucune securite reelle avec une cle courte et devinable. Un secret de moins de 32 caracteres peut etre force en ligne apres qu'un attaquant ait capture un token valide.

### 3. JWT_SECRET ne doit pas ressembler a une valeur par defaut

**Verification (production uniquement) :** le secret est teste contre l'expression `/dev|changeme|secret_key|not_for_production|example|placeholder/i`. Une correspondance provoque une sortie fatale.

**Pourquoi :** les secrets par defaut apparaissent dans la documentation, les images Docker et les depots publics. Un attaquant qui reconnait une valeur par defaut peut immediatement forger des tokens arbitraires.

### 4. E2E_MODE ne doit pas etre active en production

**Verification (production uniquement) :** `E2E_MODE=true` provoque une sortie fatale.

**Pourquoi :** `E2E_MODE` desactive le rate-limiter de connexion. Sans limitation du taux, un attaquant peut effectuer un nombre illimite de tentatives de credential-stuffing ou de force brute contre le point de terminaison de connexion.

### 5. MONGO_URI ne doit pas utiliser le mot de passe par defaut

**Verification (production uniquement) :** l'URI est testee contre `/:changeme@|password=changeme/i`. Une correspondance provoque une sortie fatale.

**Pourquoi :** `changeme` est le mot de passe par defaut livre dans le fichier Docker Compose de developpement du projet. Le deployer tel quel exposerait la base de donnees a quiconque connait le nom d'hote.

### 6. JWT_REFRESH_SECRET doit etre independant

**Verification (production uniquement) :**

- `JWT_REFRESH_SECRET` doit etre defini et avoir au moins 32 caracteres.
- Il ne doit pas etre identique a `JWT_SECRET`.
- Il ne doit pas etre identique a `JWT_SECRET + "_refresh"` (schema de derivation naif).

**Pourquoi :** si les deux tokens partagent le meme secret, compromettre l'un compromet l'autre. Un attaquant qui obtient le secret du token d'acces pourrait forger des tokens de rafraichissement de longue duree et maintenir un acces persistant meme apres l'expiration du token d'acces.

### 7. La verification TLS LDAP ne doit pas etre desactivee

**Verification (production uniquement) :** `LDAP_TLS_REJECT_UNAUTHORIZED=false` provoque une sortie fatale.

**Pourquoi :** desactiver la verification du certificat expose la connexion LDAP aux attaques de type man-in-the-middle. Un attaquant positionne sur le reseau pourrait presenter un faux certificat, intercepter tout le trafic LDAP, et accepter ou refuser les authentifications arbitrairement.

---

## Securite des dependances

### Dependabot

Dependabot est active pour les trois ecosystemes de paquets du depot :

| Ecosysteme | Dossier | Frequence |
|------------|---------|-----------|
| npm (frontend) | `/frontend-v2` | Hebdomadaire |
| npm (backend) | `/mongo/server` | Hebdomadaire |
| GitHub Actions | `/` | Hebdomadaire |

Dependabot ouvre automatiquement des pull requests quand une dependance a une version plus recente, et priorise les mises a jour qui corrigent des CVE connus. Les PRs sont etiquetees `dependencies` + la couche concernee (`frontend`, `backend`, ou `ci`).

### Workflow npm audit en CI

Le workflow `Security — npm audit` execute `npm audit --audit-level=high` pour les deux workspaces (frontend et backend) a chaque push et pull request ciblant `main`, et selon un cron hebdomadaire (lundis a 06:00 UTC). L'execution hebdomadaire detecte les vulnerabilites publiees entre les commits.

Le workflow echoue **uniquement sur les findings de severite `high` et `critical`** pour eviter de bloquer sur du bruit de faible severite. `fail-fast: false` assure que les deux workspaces sont toujours audites meme si l'un echoue.

### CodeQL

L'analyse statique CodeQL est gratuite pour les **depots publics** via la configuration par defaut de GitHub. Pour les **depots prives**, elle requiert **GitHub Advanced Security** (add-on paye GitHub Enterprise). Si le depot est prive et que GitHub Advanced Security n'est pas disponible, envisager d'executer CodeQL localement via la CLI CodeQL ou un runner auto-heberge avec la licence appropriee.

---

## Pages reference

- Architecture generale et flux de requetes : [[Architecture]]
- Choix d'authentification argumente : [[Stack-Technique]]
