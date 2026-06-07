# Cadrage — Impersonation auditée & Management transverse (P1-6/7)

Document de conception. Aucune ligne de code livrée ici : il fixe le design, les
contrôles de sécurité et les décisions à trancher **avant** implémentation.

Stack de référence : Express + MongoDB/Mongoose (`mongo/server/`), JWT HS256 en
cookies httpOnly (`middleware/authGuard.js`), modèle `User` (hiérarchie
`managerId`), `AuditLog` append-only, `Evaluation.evaluatorId` explicite.

---

## A. Impersonation auditée (« voir en tant que »)

### Objectif
Permettre à un **admin** de voir l'application **comme** un autre utilisateur
(support, debug d'un blocage de processus) **sans** connaître son mot de passe,
**en lecture seule par défaut**, et avec **traçabilité totale**.

### Principe de jeton (le cœur sécurité)
On ne réutilise jamais le flux de login. On émet un **jeton d'impersonation
dédié, court et non renouvelable** :

```
POST /api/admin/impersonate/:userId   (admin uniquement)
```
1. Vérifie que l'appelant est `admin` et que la cible existe, `isActive`.
2. **Sauvegarde le jeton admin courant** dans un cookie séparé `adminToken`
   (httpOnly) — c'est le « retour » garanti.
3. Émet un **access token d'impersonation** dans le cookie `accessToken` avec un
   payload distinct :
   ```js
   { id: target._id, role: target.role,
     imp: true, impersonatedBy: admin._id,
     // TTL court, ex. 30 min
   }
   ```
4. **Aucun refresh token** n'est émis pour ce jeton (pas de rotation, pas de
   persistance dans `user.refreshTokens`). À expiration → fin automatique.

```
POST /api/admin/impersonate/stop
```
Restaure `accessToken` depuis `adminToken`, supprime `adminToken`. Retour à la
session admin d'origine.

### Contrôles de sécurité (non négociables)
- **Lecture seule** : un middleware `blockImpersonatedWrites` placé après
  `authGuard` : si `req.user.imp === true`, **refuser toute méthode ≠ GET/HEAD**
  (403). C'est la garantie qu'un support ne modifie rien par accident.
- **Pas d'impersonation d'un admin** : `target.role !== 'admin'` (sinon escalade
  latérale). Optionnel : interdire aussi `hr` selon politique.
- **`authGuard` durci** : la vérification DB actuelle (compte actif) reste ; on
  vérifie en plus que `impersonatedBy` correspond à un admin toujours actif.
- **Le refresh ne ressuscite jamais une impersonation** : la route
  `/auth/refresh` refuse si le token courant porte `imp: true`.
- **Rate-limit** sur `/impersonate/:userId` (réutiliser le limiter du login).

### Traçabilité (`AuditLog`)
- Ajouter les actions `impersonate_start`, `impersonate_stop` à `AUDIT_ACTIONS`.
- Log au démarrage et à l'arrêt : `{ userId: admin, targetId, at }`.
- **Toute écriture tentée** sous impersonation (bloquée) est aussi loggée
  (`impersonate_write_blocked`) — utile en audit de conformité.

### UI (`frontend-v2`)
- Bannière **permanente** non masquable en haut (au-dessus de `SetupBanner`) :
  « Vous consultez en tant que **Prénom Nom** — [Quitter] », fond rouge.
  Composant `ImpersonationBanner`, monté dans `AppLayout`, lit `useAuth()`
  (exposer `user.impersonatedBy` via `/auth/me`).
- Point d'entrée : bouton « Voir en tant que » sur `AdminUsersPage` / fiche user
  (admin only), ouvre une confirmation.
- En mode impersonation, masquer les boutons d'action mutatifs (le backend les
  refuse déjà, mais l'UI doit être cohérente).

### Décisions (verrouillées)
1. ✅ **Lecture seule stricte** : aucune écriture sous impersonation (403 sur
   tout ≠ GET/HEAD). Pas d'allowlist en v1.
2. **TTL** du jeton : **30 min** (défaut retenu).
3. ✅ **Cibles : tous les rôles sauf `admin`** (employee / manager / hr
   autorisés ; jamais un autre admin → anti-escalade latérale).

### Découpage
- BE-1 : routes start/stop + cookies `adminToken`, claims `imp/impersonatedBy`.
- BE-2 : middleware `blockImpersonatedWrites` + durcissement `/auth/refresh`.
- BE-3 : `AUDIT_ACTIONS` + logs + `/auth/me` renvoie `impersonatedBy`.
- FE-1 : `ImpersonationBanner` + entrée AdminUsers + masquage actions.
- Tests : refus d'écriture (403), pas d'impersonation admin, stop restaure
  l'admin, refresh refusé sous `imp`.

---

## B. Management transverse / matriciel

### Problème
`User.managerId` est strictement **linéaire**. Le cas « François a un manager
direct **et** un chef de projet transverse » n'est pas modélisable. Or
`Evaluation.evaluatorId` est déjà explicite : un évaluateur ≠ manager direct est
**déjà techniquement possible** — il manque la **modélisation org** + la
**visibilité** + l'**UI**.

### Modèle de données
Ajouter sur `User` :
```js
dottedLineManagerIds: [{ type: ObjectId, ref: 'User' }]   // 0..n managers transverses
```
- Validation `pre('save')` : pas d'auto-référence, pas de doublon avec
  `managerId`, et **pas de cycle** (réutiliser la logique anti-cycle existante).
- `managerId` reste le lien **hiérarchique** (qui signe). Les dotted-line sont
  des liens **fonctionnels** (qui voit / peut évaluer).

### Sémantique (la règle métier à figer)
- **Signature hiérarchique inchangée** par défaut : `signed_manager` reste le
  **manager direct**. Le transverse **n'usurpe pas** la signature.
- **Visibilité** : un dotted-line manager **voit** (lecture) les évaluations de
  ses rattachés transverses → étendre `services/managerVisibility.js`
  (`getDescendantUserIds` + union des `dottedLineManagerIds`).
- **Évaluation transverse** : à la création d'évaluation, l'`evaluatorId` peut
  être un dotted-line manager (déjà supporté côté schéma). L'UI de création doit
  proposer ces personnes comme évaluateurs possibles.

### Visibilité — points d'impact backend
- `managerVisibility.js` : inclure les rattachés transverses dans le périmètre
  de lecture d'un manager.
- Routes `/users` (scope manager) et `/evaluations` (filtre par périmètre) :
  élargir au périmètre transverse en **lecture seule**.
- `/org/tree` : exposer les liens dotted-line (affichage en pointillés).

### UI (`frontend-v2`)
- Fiche/édition user (`UserEditPage`) : champ multi-sélection « Responsables
  transverses ».
- Organigramme (`OrgPage`) : rendu **en pointillés** des liens dotted-line,
  distinct du trait plein hiérarchique.
- Création d'évaluation : l'évaluateur peut être un responsable transverse.

### Décisions (verrouillées)
1. ✅ **Le manager direct signe** (`signed_manager`) ; le transverse contribue
   (score/commentaire) et voit, mais ne signe pas. Co-signature matricielle =
   v2 éventuelle pilotée par flag de campagne.
2. ✅ **Plusieurs transverses** : `dottedLineManagerIds: []` (n..n).
3. Périmètre transverse = **lecture seule** par défaut ; il ne révise que s'il
   est explicitement désigné `evaluatorId` à la création de l'évaluation.

### Découpage
- BE-1 : champ `dottedLineManagerIds` + validations (cycle/doublon/self).
- BE-2 : `managerVisibility.js` + scoping lecture `/users` & `/evaluations`.
- BE-3 : `/org/tree` expose les liens transverses.
- FE-1 : champ d'édition user + sélection évaluateur transverse à la création.
- FE-2 : rendu pointillés dans l'organigramme.
- Tests : visibilité transverse (lecture), anti-cycle, la signature reste au
  manager direct.

---

## Ordre recommandé
1. **Transverse BE-1/BE-2** (faible risque, débloque la visibilité réelle).
2. **Impersonation BE-1→BE-3 + FE-1** (après validation des 3 décisions
   sécurité ; à traiter comme un lot sécurité dédié, avec revue).
3. Transverse FE + co-signature matricielle (v2) si le besoin se confirme.
