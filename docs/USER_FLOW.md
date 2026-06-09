# NanoXplore RH — Parcours utilisateur global

## Vue d'ensemble

Tous les utilisateurs commencent au même endroit : la **page de connexion**. L'application les oriente ensuite automatiquement selon leur rôle. Ce document décrit le parcours complet du point de vue de chaque type d'utilisateur, de la connexion jusqu'à la fin du cycle d'évaluation.

---

## 1. Connexion et orientation

### Page de connexion (`/login`)

Identique pour tous les rôles. L'utilisateur saisit son email professionnel et son mot de passe. L'authentification peut se faire via :
- **Compte local** (`/login`) — identifiants stockés dans la base de données
- **LDAP / Active Directory** (`/login/ldap`) — annuaire de l'organisation (si configuré par l'Admin)

### Orientation post-connexion

Après authentification, l'utilisateur est redirigé vers la **racine `/`** : une route index unique
(`DashboardPage`) qui affiche le tableau de bord adapté à son rôle. Il n'existe **pas** de routes
distinctes `/employee`, `/manager` ou `/hr` — la même URL `/` rend un composant différent selon le rôle.

```
Tous les rôles →  /  (route index)
  ├─ admin     →  DashboardAdminPage    (santé plateforme, outils admin)
  ├─ hr        →  DashboardHrPage        (KPIs RH, campagnes, flags)
  ├─ manager   →  DashboardManagerPage   (équipe directe, actions à traiter)
  └─ employee  →  DashboardEmployeePage  (ses évaluations, PDI, objectifs)
```

> Les rôles `manager`, `hr` et `admin` disposent d'une **bascule de perspective** (« Mon espace » /
> « métier ») qui change la navigation sans changer l'URL.

---

## 2. Le cycle : qui fait quoi, quand

### Phase 1 — Préparation (RH)

```
RH se connecte → / (tableau de bord RH) → Campagnes (/campaigns)
  │
  ├─ Vérifie qu'un template existe (sinon : créer un template d'abord)
  ├─ Clique "Nouvelle campagne"
  ├─ Nomme la campagne, définit les dates d'ouverture/fermeture
  ├─ Sélectionne le ou les templates de formulaires
  └─ Active la campagne → statut passe à "active"
```

> **Règle bloquante** : sans au moins un template publié, le bouton "Nouvelle campagne" est désactivé.

### Phase 2 — Auto-évaluation (Employé)

```
Employé reçoit une notification email → se connecte → / (tableau de bord employé)
  │
  ├─ Voit la campagne en cours dans son tableau de bord
  ├─ Ouvre le formulaire "Auto-évaluation"
  ├─ Remplit : forces, faiblesses, ressenti général, faits marquants
  └─ Soumet → statut passe à "submitted"
```

### Phase 3 — Bilan N-1 (Employé puis Manager)

```
Employé
  ├─ Ouvre le formulaire "Bilan N-1"
  ├─ Renseigne ses objectifs de la période précédente et leur niveau d'atteinte
  └─ Soumet

Manager
  ├─ Voit la soumission dans son panel équipe
  ├─ Révise, ajoute ses commentaires sur chaque objectif
  └─ Valide la section
```

### Phase 4 — Objectifs futurs (Employé puis Manager)

```
Employé
  ├─ Ouvre le formulaire "Objectifs futurs"
  ├─ Propose ses objectifs pour la prochaine période
  └─ Soumet

Manager
  ├─ Révise les objectifs proposés
  ├─ Ajoute, modifie ou valide chaque objectif
  └─ Finalise la liste des objectifs retenus
```

### Phase 5 — Aspirations (Employé)

```
Employé
  ├─ Ouvre le formulaire "Aspirations"
  ├─ Exprime : formations souhaitées, mobilité interne, évolution de poste
  └─ Soumet → cette section est en lecture seule pour le manager
```

### Phase 6 — Entretien (Manager)

```
Manager
  ├─ Accède à la fiche complète de l'employé (toutes les phases)
  ├─ Conduit l'entretien en face à face en s'appuyant sur la fiche
  ├─ Saisit une note globale + commentaire de synthèse
  ├─ Complète la section manager de l'évaluation
  └─ Valide l'entretien → statut final "validated"
```

---

## 3. Ce que voit chaque rôle à chaque phase

| Phase | Employee | Manager | HR | Admin |
|---|---|---|---|---|
| Préparation | — | — | ✓ crée | ✓ accès total |
| Auto-évaluation | ✓ remplit | lecture seule | vue globale | vue globale |
| Bilan N-1 | ✓ remplit | ✓ commente + valide | vue globale | vue globale |
| Objectifs futurs | ✓ propose | ✓ finalise | vue globale | vue globale |
| Aspirations | ✓ remplit | lecture seule | vue globale | vue globale |
| Entretien | lecture seule | ✓ conduit + valide | vue globale | vue globale |

---

## 4. Navigation entre les pages

NanoXplore RH est une **SPA** (React Router v6, `createBrowserRouter`). La navigation se fait par
changement d'URL côté client ; chaque page est une route distincte. Les routes et leurs gardes de
rôle sont définies dans `frontend-v2/src/router/index.tsx`. Routes principales par domaine :

```
/                       ← Tableau de bord (adapté au rôle)
/campaigns, /forms      ← Campagnes & formulaires (RH/admin pour l'écriture)
/evaluations            ← Évaluations de l'utilisateur (+ /evaluations/history, /objectives)
/manager/todo           ← Actions à traiter (manager/hr/admin)
/interview              ← Vue Entretien (manager/hr/admin)
/users, /org            ← Collaborateurs & organigramme
/pdi, /mobility         ← PDI & demandes de mobilité
/documents, /events     ← Documents RH & calendrier
/analytics              ← Analyses (admin/hr/manager)
/admin/*                ← Administration (admin ; certaines pages ouvertes à hr)
/profile, /notifications, /help
```

La navigation affichée est calculée par `getPerspectiveNav(role, perspective, t)`
(`src/components/layout/navConfig.ts`) en fonction du rôle **et** de la perspective active.

### Structure type du tableau de bord employé (`/`)

```
┌─────────────────────────────────────────────────────┐
│  En-tête : nom de l'employé, déconnexion            │
├─────────────────────────────────────────────────────┤
│  Campagne en cours                                  │
│    Auto-évaluation        [En cours]                │
│    Bilan N-1              [À faire]                  │
│    Objectifs futurs       [Verrouillé]              │
│    Aspirations            [Verrouillé]              │
├─────────────────────────────────────────────────────┤
│  Historique des campagnes passées                   │
├─────────────────────────────────────────────────────┤
│  Accès profil & préférences (langue, thème, mot de passe) │
└─────────────────────────────────────────────────────┘
```

---

## 5. Lifecycle d'une évaluation

### Les statuts

> **Source de vérité :** `mongo/server/models/Evaluation.js` (`EVALUATION_STATUSES`,
> `VALID_TRANSITIONS`, `ROLE_TRANSITIONS`). Le diagramme complet figure dans le wiki
> [Architecture](https://github.com/lordrosta-r/NX-RH/wiki/Architecture).

Flux nominal :

```
assigned → in_progress → submitted → reviewed → signed_evaluatee → signed_manager → signed_hr → validated
```

| Statut | Description |
|---|---|
| `assigned` | L'évaluation est créée et assignée à l'évaluateur. Aucune réponse n'a encore été saisie. |
| `in_progress` | L'évaluateur a commencé à remplir le formulaire. Réponses modifiables (sauvegarde auto). |
| `submitted` | L'évaluateur a soumis le formulaire. Les réponses sont verrouillées. |
| `reviewed` | Le manager a examiné l'évaluation et ajouté son commentaire/score. |
| `disputed` | L'évalué conteste après revue ; en attente d'arbitrage RH. |
| `signed_evaluatee` | L'évalué a pris connaissance de l'évaluation et l'a signée. |
| `signed_manager` | Le manager a co-signé l'évaluation après l'entretien. |
| `signed_hr` | RH a contre-signé pour archivage officiel. |
| `validated` | Statut terminal — l'évaluation est finalisée et archivée en lecture seule. |
| `expired` | Terminal — échéance dépassée (déclenché par le planificateur). |
| `rejected` | Terminal — demande RH refusée par un RH. |
| `archived` | Terminal — évaluation annulée suite à un offboarding. |

### Transitions autorisées par rôle (hors admin)

| Rôle | Peut effectuer |
|---|---|
| `employee` | `assigned → in_progress`, `in_progress → submitted`, `reviewed → signed_evaluatee`, `reviewed → disputed` |
| `manager` | `in_progress → submitted`, `submitted → reviewed`, `signed_evaluatee → signed_manager` |
| `hr` | `reviewed → signed_hr` (contournement), `disputed → reviewed`/`signed_evaluatee` (arbitrage), `signed_evaluatee → signed_hr`, `signed_manager → signed_hr`, `signed_hr → validated` |
| `admin` | Toutes les transitions valides |

> **Note :** La transition `assigned → in_progress` se déclenche aussi automatiquement dès qu'une première réponse est sauvegardée (pre-save Mongoose).

### Étapes de signature

1. **signed_evaluatee** — L'évaluatee accuse réception de l'évaluation révisée par son manager. Il peut ajouter un commentaire ou poser un `disagreementFlag` avant de signer.
2. **signed_manager** — Le manager co-signe après la tenue de l'entretien en face à face.
3. **signed_hr** — RH contre-signe pour valider le circuit officiel. Déclenche l'archivage.
4. **validated** — État final. Données en lecture seule pour tous les rôles.

Les horodatages de signature (`signedByEvaluateeAt`, `signedByManagerAt`, `signedByHrAt`) sont conservés dans le document Evaluation.

Une évaluation ne peut jamais revenir à un statut antérieur sauf action explicite d'un Admin.
