# Manager pages — Documentation

## Rôle
Portail manager de NanoXplore RH. Accessible aux rôles `manager`, `director` (traité comme manager), `hr`, `admin`.

## Pages et routes

| Fichier | Route | Description |
|---------|-------|-------------|
| `Manager.jsx` | `/manager` | Dashboard équipe : KPIs, cartes collaborateurs, urgence campagne |
| `ManagerTeam.jsx` | `/manager/team` | Liste de l'équipe avec statuts évaluations |
| `ManagerTeamMember.jsx` | `/manager/team/:userId` | Fiche collaborateur : objectifs + historique |
| `ManagerReview.jsx` | `/manager/review/:evalId` | Split-view 60/40 : auto-éval + carnet manager |
| `ManagerHistory.jsx` | `/manager/history` | Historique des évaluations clôturées |

## CSS
`manager.css` — partagé entre toutes les pages manager. Préfixe `.mgr-`.
Tokens CSS uniquement via `var(--color-*)` etc. Jamais de hex hardcodé.

## i18n
Clés préfixées `manager.*`. Pattern standard `useTranslate(pageT)`.

## API utilisée
- `GET /api/evaluations` — évals du manager (scope auto)
- `GET /api/evaluations?evaluateeId=X` — évals d'un collaborateur
- `GET /api/evaluations/:id` — éval complète
- `PATCH /api/evaluations/:id` — review / co-signature
- `GET /api/users` — membres de l'équipe
- `GET /api/users/:id` — fiche utilisateur
- `GET /api/campaigns?status=active` — campagne active

## Comportement read-only dans ManagerReview

`ManagerReview.jsx` déclare `LOCKED_FOR_MANAGER = ['signed_manager', 'signed_hr', 'validated', 'expired', 'archived']`.

Quand `evaluation.status` est dans cette liste, le flag `isEditable = false` :
- tous les inputs/selects/textareas sont `disabled`
- les boutons d'action (brouillon, soumettre, co-signer) sont masqués
- un bandeau "lecture seule" est affiché

### Sauvegarde brouillon vs soumission

| Fonction | Champs envoyés | Cas d'usage |
|----------|---------------|-------------|
| `handleSaveDraft()` | score, reviewerComment, nextObjectives, objectiveRatings (sans `status`) | Enregistrement intermédiaire |
| `handleSubmit('reviewed')` | + `status: 'reviewed'` | Soumission après entretien (statut submitted) |
| `handleSubmit('signed_manager')` | + `status: 'signed_manager'` | Co-signature manager (statut signed_evaluatee) |

Ne jamais passer `evaluation.status` directement à `handleSubmit` — les transitions valides sont `submitted→reviewed` et `signed_evaluatee→signed_manager` uniquement.

### Champs ajoutés au schéma (Evaluation.js)

- `nextObjectives` : String (max 5 000 car.) — objectifs N+1 rédigés par le manager
- `objectiveRatings` : Mixed (`{ [questionId]: rating }`) — appréciations d'objectifs par question

Ces deux champs sont gérés dans PATCH `/api/evaluations/:id` avec contrôle de rôle.

## Migration
Remplace le MPA legacy (`main.jsx`, `ManagerSidebar.jsx`).
Les composants ne gèrent plus sidebar/topbar — ceux-ci viennent de `AuthedLayout`.
