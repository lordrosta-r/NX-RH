# Audit Specs NX-RH — Rapport complet

> Généré par analyse croisée des 7 fichiers specs  
> Date : 2025 · Périmètre : frontend-v2/specs/

---

## ✅ Points conformes

- **Résolution des 8 INC** : `00-master.md` identifie et résout correctement les 8 incohérences majeures avec décisions prescriptives claires.
- **41 écrans documentés** (S-01 → S-41, hors S-37 + S-10b) avec layouts ASCII, colonnes, filtres, états vides et mobiles.
- **10 flux UX** couvrant les parcours critiques (Auth, Campagnes, Formulaires, Évaluations ×4 étapes, Onboarding, Offboarding, Ressources, LDAP, Audit, Profil).
- **Machine à états campagne et évaluation** correctement définies dans `04-flows.md` §3.
- **Règles d'or (×20)** non-négociables cohérentes entre `00-master.md` et `06-components.md`.
- **Design system** complet : palette couleurs, typographie, badges statuts, variants boutons.
- **Composants fondamentaux** bien définis dans `06-components.md` : `DataTable`, `FilterBar`, `StatusBadge`, `EvaluationForm`, `SignaturePanel`, `QuestionBuilder`, `OffboardingChecklist`, `ProgressSteps`, `Modal`, `ConfirmDialog`, `Alert`, `Toast`.
- **3 endpoints correctement contractualisés** dans `07-api-contract.md` avec body/réponses/erreurs exhaustifs : `PATCH /api/users/:id/avatar`, `PATCH /api/admin/config/batch`, `GET /api/evaluations/:id/n1-context`.
- **Module 5 Évaluations** : endpoints listés dans `00-master.md` §4 sont cohérents avec S-16/S-17/S-18.
- **INC-01** résolu : `signed_evaluatee` utilisé partout (cohérent screens + flows + design system).

---

## ⚠️ Incohérences mineures (P2)

| # | Incohérence | Fichiers concernés | Résolution suggérée |
|---|---|---|---|
| P2-01 | Flux 4C : "saisie du score 1–10" — non corrigé dans `04-flows.md` malgré INC-02 | `04-flows.md` §2.F4.C | Remplacer "1–10" par "0–100" dans Flux 4 Étape C |
| P2-02 | Toast position `bottom-6 right-6` dans `04-flows.md` §7.3 vs résolution INC-04 (`bottom-4`) | `04-flows.md` §7.3 | Aligner sur `bottom-4 right-4` |
| P2-03 | S-14 liste 9 types de questions (`scale` + `objective_item` inclus) vs 7 types officiels (INC-05) | `03-screens.md` S-14, `00-master.md` INC-05 | Soit intégrer `scale` et `objective_item` dans la résolution INC-05, soit supprimer de S-14 |
| P2-04 | Navbar admin dans `04-flows.md` §1.1 omet **Offboarding** — correction INC-06 non reflétée dans le fichier | `04-flows.md` §1.1 | Ajouter Offboarding entre Ressources et Analytics dans la navbar admin flows |
| P2-05 | `06-components.md` Navbar §2 : liens admin/hr manquent **Calendrier** et **Offboarding** (correction INC-06 non appliquée dans la spec du composant) | `06-components.md` Navbar | Aligner la liste des liens avec la résolution INC-06 de `00-master.md` |
| P2-06 | `04-flows.md` §4 Flux 10 : lien "Paramètres → `/profile#notifications`" au lieu de `/profile/preferences` (INC-08 non reflétée) | `04-flows.md` §4 | Remplacer `→ /profile#notifications` par `→ /profile/preferences` |
| P2-07 | `04-flows.md` §4 Flux 10 : "Bouton Enregistrer → `PATCH /api/auth/preferences` ou `PATCH /api/users/:id`" — ambiguïté sur quel endpoint utiliser selon le champ modifié | `04-flows.md` §4, `00-master.md` Module 2 | Préciser : prénom/nom self → `PATCH /api/users/:id` ; langue/thème/notifs → `PATCH /api/auth/preferences` |
| P2-08 | S-26 Hub Admin liste 6 cards dont `/admin/orgchart` et `/admin/settings` — ces deux screens (S-39 et S-34) ne figurent pas dans la checklist Module 10 de `00-master.md` | `00-master.md` Module 10, `03-screens.md` S-26 | Ajouter S-34 et S-39 au Module 10 |
| P2-09 | `01-features.md` non auditable (fichier remplacé par `00-master.md`) mais toujours référencé comme source — risque de confusion | `00-master.md` §0, `01-features.md` | Marquer `01-features.md` comme déprécié ou le supprimer si `00-master.md` est la source canonique |
| P2-10 | S-37 inexistant sans explication — crée une ambiguïté sur le périmètre | `03-screens.md` en-tête | Ajouter une note expliquant pourquoi S-37 est sauté (ex: réservé, supprimé, fusionné) |

---

## 🔴 Gaps bloquants (P1)

### P1-01 · `07-api-contract.md` quasi-vide — 5 endpoints documentés sur ~65+

Le fichier `07-api-contract.md` ne contractualise que 5 endpoints alors que l'application en utilise ~65. **Tous les modules critiques sont non-contractualisés** : Auth, Users, Campaigns, Forms, Evaluations, Events, Resources, Offboarding, Analytics, Admin config/ldap/audit, Notifications, Org.

Voir section **📋 Endpoints manquants** pour la liste exhaustive.

**Impact** : Les développeurs back et front ne peuvent pas s'aligner sur les formats de body/réponse/erreur.

---

### P1-02 · Conflit de routes `/calendar` vs `/events`

`04-flows.md` §1.1 (navbars de tous les rôles) et la résolution INC-03 (`/calendar/new`) utilisent `/calendar` comme base. Mais `03-screens.md` S-19 est défini à `/events`. Le checklist `00-master.md` §7 utilise `/events`.

| Fichier | Route utilisée |
|---|---|
| `04-flows.md` §1.1 (navbars ×5 rôles) | `/calendar` |
| `00-master.md` INC-03 | `/calendar/new` |
| `03-screens.md` S-19 | `/events` |
| `00-master.md` §7 checklist | `/events` |

**Impact** : bloquant pour l'implémentation du routing React.  
**Résolution suggérée** : décider `/events` (screens + checklist = 2 sources) OU `/calendar` (flows + INC-03 = 2 sources) et mettre à jour toutes les références.

---

### P1-03 · 5 routes sans screen fiche

Routes mentionnées dans flows/master comme "ajouté INC-03" mais sans description d'écran dans `03-screens.md` :

| Route | Référence | Manque |
|---|---|---|
| `/evaluations/bulk` | `00-master.md` INC-03, `04-flows.md` Flux 4A, Module 5 | Fiche écran S-XX complète |
| `/resources/new` | `00-master.md` INC-03, `04-flows.md` Flux 7, Module 7 | Fiche écran S-XX complète |
| `/offboarding/new` | `00-master.md` INC-03, `04-flows.md` Flux 6, Module 8 | Fiche écran S-XX complète |
| `/notifications` | `00-master.md` INC-03, §7 checklist, `05-notifications.md` §6 | Fiche écran S-XX complète (Annexe B 03-screens ne la liste pas) |
| `/calendar/new` | `00-master.md` INC-03, §7 checklist ligne "Nouvel événement" | Fiche écran S-XX complète |

**Impact** : impossible de coder ces 5 pages sans specs détaillées.

---

### P1-04 · 5 nouveaux écrans sans flow UX

S-36, S-38, S-39, S-40, S-41 n'ont aucun flux dans `04-flows.md` :

| Écran | Route | Flow absent |
|---|---|---|
| S-36 | `/admin/mail-templates` | Flux "Gestion templates mail" |
| S-38 | `/hr/flags` | Flux "Traitement demandes collaborateurs" |
| S-39 | `/admin/orgchart` | Flux "Navigation organigramme + drag&drop" |
| S-40 | `/admin/users/import` | Flux "Import CSV/JSON utilisateurs" |
| S-41 | `/admin/forms/import` | Flux "Import JSON formulaire" |

**Impact** : comportements edge-case (erreurs, états intermédiaires, confirmations) non spécifiés.

---

### P1-05 · Composant `SlideOver` utilisé mais non défini

Un panneau latéral de type "slide-over" (glisse depuis la droite, overlay) est utilisé dans :
- S-20 `/events/:id` : "Modal modification : Slide-over droite (max-w-lg)"
- S-36 `/admin/mail-templates` : "Layout — éditeur (slide-over)"
- S-38 `/hr/flags` : "Clic sur ligne → panneau latéral S-38-P1"
- S-39 `/admin/orgchart` : "panneau latéral (slide-over) quand un nœud est sélectionné"

`06-components.md` définit `Modal` et `ConfirmDialog` mais **aucun composant `SlideOver`**. Les différences techniques (animation, overlay, scroll du contenu principal maintenu) justifient un composant distinct de `Modal`.

**Impact** : 4 écrans ne peuvent pas être codés de manière cohérente.

---

## 📋 Endpoints manquants dans 07-api-contract.md

> Tous les endpoints ci-dessous sont appelés dans screens/flows mais absents de `07-api-contract.md`.

### Auth
- `POST /api/auth/login` — S-01, S-02, F-01
- `POST /api/auth/logout` — F-10
- `GET /api/auth/me` — F-01, S-03
- `PATCH /api/auth/preferences` — S-32, F-10
- `PATCH /api/auth/password` — F-10

### Utilisateurs
- `GET /api/users` — S-04
- `GET /api/users?q=...` — S-10 (autocomplete targetScope=users)
- `POST /api/users` — S-05, F-05
- `GET /api/users/:id` — S-06
- `PATCH /api/users/:id` — S-07
- `PATCH /api/users/:id/onboarding/:stepIndex` — S-33, F-05
- `PATCH /api/users/:id/onboarding/complete` — S-33, F-05
- `GET /api/users/:id/gdpr-export` — S-06, S-30
- `DELETE /api/users/:id/gdpr-anonymize` — S-06, S-30
- `GET /api/users/:id/offboard-preview` — S-06-M1, F-06
- `PATCH /api/users/:id/offboard` — F-06
- `POST /api/users/import` — S-40

### Campagnes
- `GET /api/campaigns` — S-09
- `POST /api/campaigns` — S-10, F-02
- `GET /api/campaigns/:id` — S-11
- `PATCH /api/campaigns/:id` — S-11, F-02
- `DELETE /api/campaigns/:id` — S-11
- `POST /api/campaigns/:id/clone` — S-11, F-02
- `GET /api/campaigns/:id/analytics` — S-12, S-25

### Formulaires
- `GET /api/forms` — S-13
- `POST /api/forms` — S-14, F-03
- `GET /api/forms/:id` — S-15
- `PATCH /api/forms/:id` — S-15, F-03
- `DELETE /api/forms/:id` — S-15, F-03
- `GET /api/forms/:id/export` — S-15
- `POST /api/forms/import` — S-41
- `GET /api/forms/template` — S-41

### Évaluations
- `GET /api/evaluations` — S-16
- `POST /api/evaluations` — S-16
- `POST /api/evaluations/bulk` — F-04A
- `GET /api/evaluations/:id` — S-17
- `PATCH /api/evaluations/:id` — S-17 (auto-save + transitions)
- `PATCH /api/evaluations/bulk` — S-16 (actions bulk)
- `PATCH /api/evaluations/:id/reassign` — S-16
- `POST /api/evaluations/:id/expire` — S-16
- `GET /api/evaluations/export` — S-12, S-25
- `GET /api/evaluations/:id/pdf` — S-17 (Mode D), F-04
- `GET /api/evaluations/history` — S-18

### Événements
- `GET /api/events` — S-19
- `POST /api/events` — F-06 (calendar/new)
- `GET /api/events/:id` — S-20
- `PATCH /api/events/:id` — S-20
- `DELETE /api/events/:id` — S-20

### Ressources
- `GET /api/resources` — S-21
- `POST /api/resources` — F-07 (resources/new)
- `GET /api/resources/:id` — S-22
- `PATCH /api/resources/:id` — S-22
- `DELETE /api/resources/:id` — S-22

### Offboarding
- `GET /api/offboarding` — S-23
- `POST /api/offboarding` — F-06
- `GET /api/offboarding/:id` — S-24
- `PATCH /api/offboarding/:id` — S-24, F-06
- `DELETE /api/offboarding/:id` — S-24
- `PATCH /api/offboarding/:id/checklist/:itemIndex` — S-24, F-06

### Analytics
- `GET /api/analytics/export/pdf` — S-25
  > ⚠️ Note : S-12 appelle `GET /api/analytics/export/pdf?campaignId=:id` et `GET /api/campaigns/:id/analytics` — deux endpoints distincts à confirmer

### Administration
- `GET /api/admin/config` — S-27, S-34
- `PUT /api/admin/config` — S-27
- `DELETE /api/admin/config` — S-27
- `POST /api/admin/email/test` — S-27-M1
- `GET /api/admin/audit` — S-29, F-09
- `PUT /api/admin/ldap/config` — S-28, F-08
- `GET /api/admin/ldap/config` — S-28
- `POST /api/admin/ldap/test` — S-28, F-08
- `POST /api/admin/ldap/preview` — S-28, F-08
- `POST /api/admin/ldap/sync` — S-28, F-08
- `GET /api/admin/mail-templates` — S-36
- `PATCH /api/admin/mail-templates/:slug` — S-36

### Notifications
- `GET /api/notifications` — `05-notifications.md`, checklist §7
- `PATCH /api/notifications/read-all` — `04-flows.md` §4

### Organisation
- `GET /api/org/tree?view=all|teams|sector` — S-39
- `PATCH /api/org/users/:id` — S-39
- `GET /api/org/sectors` — S-10 (campaign creation), S-35, S-39
- `POST /api/org/sectors` — S-35, S-39
- `PATCH /api/org/sectors/:id` — S-35, S-39
- `DELETE /api/org/sectors/:id` — S-35, S-39

### RH Flags
- `GET /api/hr/flags?type=...&status=...&from=...&to=...&department=...&sector=...` — S-38
- `PATCH /api/hr/flags/:evalId/status` — S-38

**Total endpoints manquants : ~62** (sur ~67 utilisés dans l'app — 07-api-contract.md couvre ~7%)

---

## 🧩 Composants non définis

| Composant | Utilisé dans | Priorité |
|---|---|---|
| `SlideOver` | S-20, S-36, S-38, S-39 (panneau latéral depuis la droite) | 🔴 P1 |
| `ColorPicker` | S-35 (modal secteur), S-39 (création secteur) | ⚠️ P2 |
| `DropZone` | S-40 (import CSV/JSON), S-41 (import JSON) — "Glissez un fichier ici" | ⚠️ P2 |
| `OrgChart` / TreeViewer | S-39 (arbre SVG/D3 collapsible) — composant métier complexe | ⚠️ P2 |
| `DateRangePicker` | S-38 (filtre période "date range picker") — `DatePicker` single ne suffit pas | ⚠️ P2 |
| `BottomSheet` | S-39 mobile : "Panneau latéral = bottom-sheet" | ⚠️ P2 |

---

## 📝 Recommandations

### Actions prioritaires (P1 — à traiter avant dev)

1. **Contractualiser les ~62 endpoints manquants** dans `07-api-contract.md` — utiliser le format existant (body, réponses, erreurs, rôles). Prioriser : auth, users, campaigns, evaluations (les 4 modules centraux).

2. **Décider définitivement `/events` vs `/calendar`** et mettre à jour l'ensemble des fichiers. Recommandation : `/events` (aligné avec `03-screens.md` et le checklist `00-master.md`). Renommer `/calendar/new` en `/events/new`.

3. **Rédiger les 5 fiches écrans manquantes** : `/evaluations/bulk`, `/resources/new`, `/offboarding/new`, `/notifications`, `/events/new` — au format S-XX dans `03-screens.md`.

4. **Rédiger les 5 flows manquants** pour S-36, S-38, S-39, S-40, S-41 dans `04-flows.md`.

5. **Définir le composant `SlideOver`** dans `06-components.md` avec son interface TypeScript, animation, overlay et accessibilité.

### Actions secondaires (P2 — avant code review)

6. **Corriger les 6 résidus INC non propagés** dans `04-flows.md` : score 1→10 (P2-01), toast bottom-6 (P2-02), navbar admin Offboarding (P2-04), lien préférences (P2-06).

7. **Résoudre l'ambiguïté `scale` + `objective_item`** dans S-14 : soit les intégrer dans la résolution INC-05, soit les supprimer du FormBuilder spec.

8. **Définir `ColorPicker`, `DropZone`, `DateRangePicker`, `OrgChart`** dans `06-components.md`.

9. **Expliciter S-37** : ajouter une note expliquant le saut de numéro.

10. **Clarifier `01-features.md`** : le marquer comme source historique ou le supprimer pour éviter la confusion avec `00-master.md`.

---

## Synthèse quantitative

| Catégorie | Nombre |
|---|---|
| ✅ Points conformes | 10 |
| ⚠️ Incohérences mineures (P2) | 10 |
| 🔴 Gaps bloquants (P1) | 5 |
| 📋 Endpoints manquants dans 07-api-contract.md | ~62 |
| 🧩 Composants non définis | 6 (dont 1 P1, 5 P2) |

---

*Audit généré par analyse croisée de : 00-master.md · 01-features.md · 02-design-system.md · 03-screens.md · 04-flows.md · 05-notifications.md · 06-components.md · 07-api-contract.md*
