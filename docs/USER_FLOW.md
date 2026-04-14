# NanoXplore RH — Parcours utilisateur global

## Vue d'ensemble

Tous les utilisateurs commencent au même endroit : la **page de connexion**. L'application les oriente ensuite automatiquement selon leur rôle. Ce document décrit le parcours complet du point de vue de chaque type d'utilisateur, de la connexion jusqu'à la fin du cycle d'évaluation.

---

## 1. Connexion et orientation

### Page de connexion (`/`)

Identique pour tous les rôles. L'utilisateur saisit son email professionnel et son mot de passe. L'authentification peut se faire via :
- **Compte local** — identifiants stockés dans la base de données
- **LDAP / Active Directory** — synchronisation avec l'annuaire de l'organisation (si configuré par l'Admin)

### Redirection automatique post-connexion

```
Rôle Admin     →  /hr        (accès total + outils admin)
Rôle HR        →  /hr        (tableau de bord RH)
Rôle Director  →  /manager   (vue consolidée de sa sous-arborescence)
Rôle Manager   →  /manager   (son équipe directe)
Rôle Employee  →  /dashboard (ses propres évaluations)
```

---

## 2. Le cycle : qui fait quoi, quand

### Phase 1 — Préparation (RH)

```
RH se connecte → /hr (onglet Campagnes)
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
Employé reçoit une notification email → se connecte → /dashboard
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

| Phase | Employee | Manager | Director | HR | Admin |
|---|---|---|---|---|---|
| Préparation | — | — | — | ✓ crée | ✓ accès total |
| Auto-évaluation | ✓ remplit | lecture seule | lecture (son périmètre) | vue globale | vue globale |
| Bilan N-1 | ✓ remplit | ✓ commente + valide | lecture (son périmètre) | vue globale | vue globale |
| Objectifs futurs | ✓ propose | ✓ finalise | lecture (son périmètre) | vue globale | vue globale |
| Aspirations | ✓ remplit | lecture seule | lecture (son périmètre) | vue globale | vue globale |
| Entretien | lecture seule | ✓ conduit + valide | vue agrégée | vue globale | vue globale |

---

## 4. Navigation entre les pages

```
/                ← Login (toujours accessible)
/dashboard       ← Employés (et tout rôle authentifié)
/manager         ← Managers, Directors, Admin
/hr              ← HR, Admin
```

La navigation interne à chaque page est gérée par des onglets et des panels, pas par des changements d'URL (MPA + composants React par page).

### Structure typique de `/manager`

```
┌─────────────────────────────────────────────────────┐
│  En-tête : nom de l'utilisateur, rôle, déconnexion  │
├──────────┬──────────────────────────────────────────┤
│ Sidebar  │ Panel principal                          │
│          │                                          │
│ Mon équipe│ (liste des membres + statuts)           │
│ Campagnes│ (si HR ou Admin)                         │
│ Templates│ (si HR ou Admin)                         │
│ Rapports │ (si HR, Director ou Admin)               │
│ Paramètres│ (si Admin)                              │
└──────────┴──────────────────────────────────────────┘
```

### Structure typique de `/dashboard`

```
┌─────────────────────────────────────────────────────┐
│  En-tête : nom de l'employé, déconnexion            │
├─────────────────────────────────────────────────────┤
│  Campagne en cours                                  │
│    Phase 2 — Auto-évaluation  [En cours]            │
│    Phase 3 — Bilan N-1        [À faire]             │
│    Phase 4 — Objectifs futurs [Verrouillé]          │
│    Phase 5 — Aspirations      [Verrouillé]          │
├─────────────────────────────────────────────────────┤
│  Historique des campagnes passées                   │
├─────────────────────────────────────────────────────┤
│  Paramètres personnels (langue, thème, mot de passe)│
└─────────────────────────────────────────────────────┘
```

---

## 5. Lifecycle d'une évaluation

### Les 8 statuts

```
assigned → in_progress → submitted → reviewed → signed_evaluatee → signed_manager → signed_hr → validated
```

| Statut | Description |
|---|---|
| `assigned` | L'évaluation est créée et assignée à l'évaluateur. Aucune réponse n'a encore été saisie. |
| `in_progress` | L'évaluateur a commencé à remplir le formulaire. Réponses modifiables (sauvegarde auto). |
| `submitted` | L'évaluateur a soumis le formulaire. Les réponses sont verrouillées. |
| `reviewed` | Le manager (ou directeur) a examiné l'évaluation et ajouté son commentaire/score. |
| `signed_evaluatee` | L'évaluatee a pris connaissance de l'évaluation et l'a signée. |
| `signed_manager` | Le manager a co-signé l'évaluation après l'entretien. |
| `signed_hr` | RH a contre-signé pour archivage officiel. |
| `validated` | Statut terminal — l'évaluation est finalisée et archivée en lecture seule. |

### Transitions autorisées par rôle

| Rôle | Peut effectuer |
|---|---|
| `employee` | `assigned → in_progress`, `in_progress → submitted` |
| `manager` | `submitted → reviewed` |
| `director` | `submitted → reviewed` |
| `hr` | `reviewed → signed_hr`, `signed_manager → signed_hr` |
| `admin` | Toutes les transitions |

> **Note :** La transition `assigned → in_progress` se déclenche aussi automatiquement dès qu'une première réponse est sauvegardée (pre-save Mongoose).

### Étapes de signature

1. **signed_evaluatee** — L'évaluatee accuse réception de l'évaluation révisée par son manager. Il peut ajouter un commentaire ou poser un `disagreementFlag` avant de signer.
2. **signed_manager** — Le manager co-signe après la tenue de l'entretien en face à face.
3. **signed_hr** — RH contre-signe pour valider le circuit officiel. Déclenche l'archivage.
4. **validated** — État final. Données en lecture seule pour tous les rôles.

Les horodatages de signature (`signedByEvaluateeAt`, `signedByManagerAt`, `signedByHrAt`) sont conservés dans le document Evaluation.

Une évaluation ne peut jamais revenir à un statut antérieur sauf action explicite d'un Admin.
