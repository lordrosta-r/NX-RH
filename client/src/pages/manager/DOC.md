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

## Migration
Remplace le MPA legacy (`main.jsx`, `ManagerSidebar.jsx`).
Les composants ne gèrent plus sidebar/topbar — ceux-ci viennent de `AuthedLayout`.
