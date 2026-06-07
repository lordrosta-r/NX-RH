# Seed e2e / démo — `seeds/seed.js`

Seed réaliste utilisé par les tests Playwright (mode prod) et pour les démos.
Il **vide puis réinsère** les collections via le driver brut (bypass des hooks
Mongoose) — ne pas l'exécuter sur une base de production réelle.

## Lancer

```bash
cd mongo/server
MONGO_URI=mongodb://localhost:27017/nx-rh npm run seed:e2e
# ou directement : MONGO_URI=… node seeds/seed.js
```

`MONGO_URI` est obligatoire (le script s'arrête sinon).

## Comptes créés (mot de passe commun : `password123`)

| Rôle     | Email                          |
|----------|--------------------------------|
| admin    | `alice@nxrh.local`             |
| hr       | `marie.dupont@nxrh.local`      |
| hr (ldap)| `sophie.martin@nxrh.local`     |
| manager  | `pierre.leclerc@nxrh.local`    |
| manager  | `jean.moreau@nxrh.local`       |
| manager  | `claire.fontaine@nxrh.local`   |
| employee | `lucas.bernard@nxrh.local`     |
| employee | `emma.petit@nxrh.local`        |
| employee | `thomas.richard@nxrh.local`    |
| employee | `lea.durand@nxrh.local` (offboarding) |
| employee | `nicolas.blanc@nxrh.local` (inactif/offboarded) |

Ces identifiants sont ceux attendus par `frontend-v2/e2e/helpers/auth.ts`.

## Données

5 campagnes (draft / active / closed), 4 formulaires, 17 évaluations à tous les
statuts (`assigned` → `validated`/signé). Le **form4** (`manager_evaluation`,
rattaché à la campagne « Entretien annuel 2025 ») couvre les **types de question
avancés** (`scale`, `objective_item`, `weather`, `mobility`, `n1_import`) pour que
l'audit visuel exerce ces widgets. `n1_import` fonctionne car la campagne active a
un `previousCampaignId` renseigné.

Aussi : offboarding, mobilité, PDI, événements, ressources, notifications, audit logs.
