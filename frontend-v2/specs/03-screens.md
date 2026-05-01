# NX-RH — Inventaire des écrans (Frontend v2)

> **Version** : 2.1 · **Date** : 2025 · **Langue** : Français
> **Stack** : React 18 + Vite + TypeScript + Tailwind CSS
> **Navigation** : Top navbar fixe (h-16) · Pas de sidebar · Fil d'Ariane pour le contexte
> **Responsive** : desktop 1280px · tablette 768px · mobile 375px
> **Design ref** : Eurecia — cards blanches, primaire teal `#17A8D4`, illustrations SVG
> **Écrans** : 41 (S-01 → S-41 · hors S-37 · + S-10b)

---

## Conventions globales

### Patterns de placement

| Élément | Position |
|---|---|
| CTA principal | En haut à droite de l'en-tête de page |
| Actions secondaires | Menu contextuel `⋮` sur les lignes de tableau / coins de cards |
| Badge de statut | En haut à droite des cards · dans la colonne dédiée des tableaux |
| Fil d'Ariane | Sous la navbar, avant le H1 (`text-xs text-slate-500`) |
| Filtres | Expanded sur desktop · collapsed en accordéon sur mobile |
| Notifications toast | `fixed bottom-4 right-4`, auto-dismiss 4 s |

### Tables vs Cards

- **Tables** : vues administrateur/RH sur des listes denses (utilisateurs, évaluations bulk, audit)
- **Cards** (grid) : contenus orientés employé (ressources, événements, mes évaluations)

### États vides (pattern commun)

```
┌──────────────────────────────────────┐
│                                      │
│        [Illustration SVG 120px]      │
│                                      │
│    Titre explicatif (text-lg/medium) │
│    Description courte (text-sm/      │
│    slate-500, max 2 lignes)          │
│                                      │
│         [ + Créer le premier X ]     │
│                                      │
└──────────────────────────────────────┘
```
→ Icône Lucide 48px en `text-primary-300` + message + bouton Primary (si permissions)

### États de chargement (pattern commun)

Skeleton shimmer (`bg-gradient shimmer 1.5s`) :
- Lignes de tableau → rectangles `h-4 rounded` de largeur variable
- Cards → blocs `rounded-xl` reproduisant la forme de la card

### États d'erreur (pattern commun)

Alert `error` en haut du contenu principal :
```
⚠ Impossible de charger les données. [Réessayer]
```
→ `border-l-4 border-error-500 bg-error-50 p-4 rounded-lg`

---

## 1. Authentification

---

### S-01 · `/login` — Connexion

**Accessible à** : Tous (route publique — redirige si déjà connecté)

**Layout** :
```
┌─────────────────────────────────────────┐
│  [Logo NX-RH centré, h-10]              │
│  "L'entretien annuel, simplifié."        │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │  Card blanche, shadow-xl p-8    │    │
│  │                                 │    │
│  │  H1: "Connexion"                │    │
│  │  Sous-titre: "Bienvenue sur     │    │
│  │   NX-RH NanoXplore"             │    │
│  │                                 │    │
│  │  [Label] Adresse e-mail         │    │
│  │  [Input email]                  │    │
│  │                                 │    │
│  │  [Label] Mot de passe           │    │
│  │  [Input password] [👁]          │    │
│  │                                 │    │
│  │  ☐ Se souvenir de moi           │    │
│  │                                 │    │
│  │  [ Se connecter ]  (Primary lg) │    │
│  │                                 │    │
│  │  ─────── ou ────────            │    │
│  │  [ Connexion via LDAP ]         │    │
│  │  (Secondary, si LDAP activé)    │    │
│  └─────────────────────────────────┘    │
│                                         │
│  © 2025 NanoXplore — v2.0.0             │
└─────────────────────────────────────────┘
```

**Page title** (H1) : « Connexion »

**Top section** : Logo + tagline centré au-dessus de la card. Pas de navbar. Pas de fil d'Ariane.

**Main content** :
- Champ e-mail (`type="email"`, autofocus, autocomplete="username")
- Champ mot de passe (`type="password"`, autocomplete="current-password"), toggle visibilité
- Checkbox « Se souvenir de moi » (session 30 j vs 8 h)
- Bouton Primary lg full-width « Se connecter »
- Divider + bouton Secondary « Connexion via LDAP » (affiché uniquement si `VITE_LDAP_ENABLED=true`)

**Erreurs inline** :
- Champs en erreur : bordure `error-500` + message sous le champ (`text-xs text-error-600`)
- 401 : « E-mail ou mot de passe incorrect »
- 429 (rate-limit) : Alert `warning` — « Trop de tentatives. Réessayez dans X minutes. »
- 403 (compte inactif) : Alert `error` — « Votre compte est désactivé. Contactez votre RH. »

**Loading state** : Bouton passe en état `loading` (spinner inline, texte « Connexion… »), champs `disabled`.

**Mobile** : Card full-width (`mx-4`), padding réduit `p-6`, fond page `bg-slate-50`.

**Liens** : → `/` après succès (ou URL `?redirect=...` préservée)

---

### S-02 · `/login/ldap` — Connexion LDAP

**Accessible à** : Tous (route publique)

**Layout** : Identique à S-01, sans le séparateur LDAP.

**Différences** :
- H1 : « Connexion LDAP »
- Sous-titre : « Utilisez vos identifiants d'entreprise »
- Champ login : `type="text"` (login LDAP ≠ email obligatoirement), label « Identifiant LDAP »
- Icône `Server` (Lucide) à gauche du titre de card
- Lien retour : `← Connexion standard` en `text-sm text-primary-600`

**Règle** : Si `VITE_LDAP_ENABLED=false`, la route redirige vers `/login`.

---

## 2. Tableau de bord

---

### S-03 · `/` — Tableau de bord (5 variantes selon rôle)

**Accessible à** : Tous (authGuard)

**Fil d'Ariane** : *(aucun — racine)*

**Loading state** : 4 blocs skeleton en grille 12 cols.

**Erreur** : Alert inline + bouton « Réessayer ».

---

#### Variante A — Tableau de bord Administrateur

**Page title** : « Tableau de bord »

**Layout desktop** (12 colonnes) :
```
┌──────────────────────────────────────────────────────────────┐
│ H1: Tableau de bord · Bonjour, [Prénom] 👋                   │
│ [Exporter PDF]  (Secondary)                                  │
├──────────────────────────────────────────────────────────────┤
│ [col-3] KPI      [col-3] KPI      [col-3] KPI    [col-3] KPI │
│ Utilisateurs     Campagnes act.   Évals en cours  Offboardings│
│ actifs           actives          non finalisées  en attente  │
├──────────────────────────────────────────────────────────────┤
│ [col-8] Campagnes actives                [col-4] Actions urg. │
│  Tableau compact (nom, statut, %)         Liste d'alertes     │
│                                           rouge/orange        │
├──────────────────────────────────────────────────────────────┤
│ [col-12] Activité récente (piste d'audit, 10 dernières lignes)│
└──────────────────────────────────────────────────────────────┘
```

**KPI cards** (4 × col-span-3) :
| KPI | Valeur | Icône | Couleur accent |
|---|---|---|---|
| Utilisateurs actifs | `N` | `Users` | `primary-500` |
| Campagnes actives | `N` | `BarChart2` | `success-500` |
| Évaluations non finalisées | `N` | `ClipboardList` | `warning-500` |
| Offboardings en attente | `N` | `LogOut` | `error-500` |

**Actions urgentes** (col-4) : liste verticale de cards `p-4` rouge/orange :
- Évaluations expirées (badge `error`)
- Évaluations à signer côté RH (badge `warning`)
- Offboardings non complétés > 30 j (badge `error`)
- Chaque item : lien direct vers l'écran concerné

**Activité récente** : tableau 5 colonnes — Date · Acteur · Action · Cible · Statut. Lien « Voir le journal complet → /admin/audit »

---

#### Variante B — Tableau de bord RH

**Page title** : « Tableau de bord RH »

**Layout** :
```
KPI row (3 cols) : Campagnes actives · Évals à signer · Évals soumises
─────────────────────────────────────────────────────────────────
[col-8] Campagnes en cours   [col-4] Alertes
 (cards avec barre de          – Deadlines proches (J-3)
  progression % complétion)    – Évals expirées
                               – Offboardings en cours
─────────────────────────────────────────────────────────────────
[col-6] Stats rapides          [col-6] Prochains événements
 Score moyen global             (3 prochains, liens /events)
 Taux de complétion global
```

**CTAs header** : « + Nouvelle campagne » (Primary) · « Exporter PDF » (Secondary)

---

#### Variante C — Tableau de bord Directeur

**Page title** : « Tableau de bord — Mon département »

**Layout** :
```
KPI row (4 cols) : Membres d'équipe · Évals soumises · Évals à revoir · Score moyen dép.
─────────────────────────────────────────────────────────────────
[col-8] Évaluations de mon équipe (tableau)
  Colonnes: Collaborateur · Campagne · Statut · Score · Action
[col-4] Résumé équipe
  Liste collaborateurs + statut éval (avatar sm + badge)
─────────────────────────────────────────────────────────────────
[col-12] Campagnes actives (read-only)
```

**Filtre** : Sélecteur de département (si visibilité étendue multi-dép.)

---

#### Variante D — Tableau de bord Manager

**Page title** : « Tableau de bord — Mon équipe »

**Layout** :
```
KPI row (3 cols) : Évals à compléter · Équipe en attente · Rappels deadline
─────────────────────────────────────────────────────────────────
[col-7] Évaluations à compléter (cards triées par deadline)
  Card: Nom évalué · Campagne · Deadline · [Remplir →]
[col-5] Mon équipe
  Liste avec indicateur de complétion (avatar + barre h-1)
─────────────────────────────────────────────────────────────────
[col-12] Prochains événements (filtrés rôle manager)
```

**CTA header** : « Mes évaluations → /evaluations » (Primary)

---

#### Variante E — Tableau de bord Employé

**Page title** : « Bonjour, [Prénom] »

**Layout** :
```
[Illustration SVG accueil, col-4]   [col-8] Mes évaluations en cours
                                      (cards: campagne + statut + bouton)
─────────────────────────────────────────────────────────────────
[col-4] Progression onboarding      [col-4] Prochains événements
  (si onboarding non complété)        (2-3 événements, type icône)
  Barre + liste d'étapes
[col-4] Ressources récentes
  (3 dernières ressources publiées)
─────────────────────────────────────────────────────────────────
[col-12] Mon historique (5 dernières évals validées, liens PDF)
```

**CTA header** : *(aucun — vue lecture)*

**Mobile** : Empilement vertical, cards pleine largeur.

**Liens depuis dashboard** : → `/evaluations` · `/evaluations/:id` · `/events` · `/resources` · `/evaluations/history` · `/profile`

---

## 3. Utilisateurs

---

### S-04 · `/users` — Liste des utilisateurs

**Accessible à** : admin, hr, director, manager (périmètre réduit)

**Fil d'Ariane** : Accueil › Collaborateurs

**Page title** : « Collaborateurs »

**Layout** :
```
[H1: Collaborateurs]                        [+ Nouvel utilisateur]
[Recherche___________] [Rôle ▼] [Département ▼] [Statut ▼] [🔍 Filtres]

┌─────────────────────────────────────────────────────────────────┐
│ NOM              │ RÔLE     │ DÉPARTEMENT │ STATUT  │ CONNEXION  │⋮│
├─────────────────────────────────────────────────────────────────┤
│ [Avatar] J. Doe  │ Manager  │ R&D         │ ● Actif │ il y a 2j  │⋮│
│ [Avatar] M. Durand│ Employee│ Finance     │ ● Actif │ il y a 5j  │⋮│
│ ...                                                              │
└─────────────────────────────────────────────────────────────────┘
[Pagination : ‹ 1 2 3 … › · « 48 utilisateurs »]
```

**Colonnes tableau** :
| Colonne | Détail |
|---|---|
| Nom | Avatar (sm) + Prénom Nom, lien → `/users/:id` |
| Rôle | Badge pill (`admin`/`hr`/`director`/`manager`/`employee`) |
| Département | Texte |
| Statut | Pill vert « Actif » / gris « Inactif » / orange « Offboarding » |
| Dernière connexion | Date relative (`text-xs slate-400`) |
| Actions `⋮` | Voir · Modifier · Offboarding (admin/hr) · Anonymiser (admin) |

**Filtres** : Recherche texte (nom/email) · Rôle (select) · Département (select) · Statut actif/inactif

**Empty state** : Illustration `Users` + « Aucun collaborateur trouvé » + « + Créer le premier collaborateur » (si admin/hr)

**Modals** : Confirmation suppression/anonymisation (S-04-M1)

**Mobile** : Colonnes condensées : Avatar+Nom · Rôle · Statut · `⋮`. Scroll horizontal si besoin.

**Liens** : → `/users/new` · `/users/:id` · `/users/:id/edit`

---

### S-05 · `/users/new` — Créer un utilisateur

**Accessible à** : admin, hr

**Fil d'Ariane** : Accueil › Collaborateurs › Nouvel utilisateur

**Page title** : « Nouvel utilisateur »

**Layout** :
```
[H1: Nouvel utilisateur]                   [Annuler] [Créer →]

┌──────────────────────────────────┐
│ Card "Informations personnelles" │
│  Prénom*   [___________]         │
│  Nom*      [___________]         │
│  E-mail*   [___________]         │
├──────────────────────────────────┤
│ Card "Poste & Organisation"      │
│  Rôle*        [Select ▼]         │
│  Département  [___________]      │
│  Poste        [___________]      │
│  Manager      [Search user ▼]    │
└──────────────────────────────────┘
```

**Champs** : `firstName`* · `lastName`* · `email`* · `role`* · `department` · `position` · `managerId` (recherche autocomplete utilisateurs actifs)

**Post-création** : Modal « Utilisateur créé » affichant le mot de passe temporaire (à copier, masqué après fermeture). Bouton « Copier » avec feedback toast.

**Validation inline** : Email unique (vérif. live 500 ms debounce) · Champs requis marqués `*`

**Mobile** : Formulaire pleine largeur, boutons CTA en bas (sticky footer).

**Liens** : Retour → `/users` · Succès → `/users/:id` (nouvel ID)

---

### S-06 · `/users/:id` — Profil utilisateur

**Accessible à** : admin/hr (complet) · director/manager (périmètre) · employee (soi + manager direct)

**Fil d'Ariane** : Accueil › Collaborateurs › [Prénom Nom]

**Page title** : « [Prénom Nom] »

**Layout** :
```
[Avatar XL] [Prénom Nom]     [Modifier] [⋮ Actions]
            [Rôle] [Département] [Poste]
            ✉ email · 🕐 Dernière connexion
            [Badge LDAP si authSource=ldap]

─────── Onglets : Profil | Évaluations | Onboarding ────────

[Onglet Profil]
  Card "Informations"     Card "Hiérarchie"
   Tous les champs          Manager direct (avatar + lien)
   lecture seule            Subordonnés directs (liste)

[Onglet Évaluations]
  Tableau évaluations de cet utilisateur (avec filtres statut)

[Onglet Onboarding] (admin/hr/self)
  Checklist 5 étapes avec cases à cocher
  Barre de progression h-2
  Bouton "Marquer comme terminé"
```

**Zone Actions `⋮`** (admin/hr uniquement) :
- « Modifier » → `/users/:id/edit`
- « Déclencher l'offboarding » (ouvre Modal offboard-preview S-06-M1)
- « Exporter données RGPD » (téléchargement JSON)
- « Anonymiser » (admin seulement, ouvre Modal confirmation S-06-M2)

**Modal offboard-preview (S-06-M1)** :
> Titre : « Déclencher le départ de [Prénom] »
> Corps : « N évaluations actives seront archivées · Campagnes concernées : [liste] »
> Footer : [Annuler] [Confirmer le départ] (Danger)

**Modal anonymisation (S-06-M2)** :
> Titre : « Anonymiser les données »
> Corps : Avertissement RGPD + champ de confirmation (saisir « CONFIRMER »)
> Footer : [Annuler] [Anonymiser définitivement] (Danger)

**Offboarding badge** : Si `offboardingStatus = 'offboarding'`, bandeau `warning` en haut de page.

**Mobile** : Onglets → accordéon · Avatar centré · Boutons actions en stack.

**Liens** : → `/users/:id/edit` · `/evaluations/:id` · `/users/:id/offboarding`

---

### S-07 · `/users/:id/edit` — Modifier l'utilisateur

**Accessible à** : admin/hr (tous champs) · self (prénom/nom uniquement)

**Fil d'Ariane** : Accueil › Collaborateurs › [Prénom Nom] › Modifier

**Page title** : « Modifier — [Prénom Nom] »

**Layout** : Identique à S-05 (formulaire pré-rempli). Champs non-autorisés affichés en `disabled` (bg-slate-100).

**Particularités** :
- Section « Sécurité » (admin only) : bascule `isActive`, sélecteur `authSource`
- Lien « Voir le profil » en haut (Secondary)

**Mobile** : Identique S-05.

---

### S-08 · `/users/:id/offboarding` — Offboarding en cours

**Accessible à** : admin, hr

**Fil d'Ariane** : Accueil › Collaborateurs › [Prénom Nom] › Offboarding

**Page title** : « Offboarding — [Prénom Nom] »

→ Redirige vers `/offboarding/:offboardingId` (le dossier d'offboarding lié à cet utilisateur).

---

## 4. Campagnes

---

### S-09 · `/campaigns` — Liste des campagnes

**Accessible à** : Tous (employees : uniquement `active`)

**Fil d'Ariane** : Accueil › Campagnes

**Page title** : « Campagnes »

**Layout** :
```
[H1: Campagnes]                     [+ Nouvelle campagne] (admin/hr)

[Filtre Statut: Tous | Brouillon | Active | Clôturée | Archivée]
[Recherche_________]

┌───────────────────────────────────────────────────────────────┐
│ NOM           │ STATUT     │ PÉRIODE         │ PROGRESSION  │⋮ │
├───────────────────────────────────────────────────────────────┤
│ Entretiens    │ ● Active   │ Jan–Mar 2025    │ ██████░ 72%  │⋮ │
│  annuels 2025 │            │                 │              │  │
│ Revue Q4 2024 │ ● Archivée │ Oct–Déc 2024   │ ██████████100│⋮ │
└───────────────────────────────────────────────────────────────┘
```

**Colonnes** : Nom (lien → `/campaigns/:id`) · Statut (badge) · Période (dates) · Progression (barre h-1 + %) · Actions `⋮`

**Actions `⋮`** (admin/hr) : Voir · Modifier · Cloner · Archiver/Supprimer (selon statut)

**Filtres** : Onglets statuts (tabs horizontaux) + recherche texte

**Empty state** : Illustration `BarChart2` + « Aucune campagne » + « + Créer la première campagne »

**Mobile** : Cards empilées (1 col) — Nom + Badge statut + Barre de progression + Actions.

**Liens** : → `/campaigns/new` · `/campaigns/:id` · `/campaigns/:id/analytics`

---

### S-10 · `/campaigns/new` et `/campaigns/:id/edit` — Créer / Modifier une campagne

**Accessible à** : admin, hr

**Fil d'Ariane** :
- Création : Accueil › Campagnes › Nouvelle campagne
- Édition : Accueil › Campagnes › [Nom] › Modifier

**Page title** : « Nouvelle campagne » / « Modifier — [Nom de la campagne] »

**Layout** :
```
[H1: Nouvelle campagne]               [Annuler] [Enregistrer brouillon] [Activer →]

┌─────────────────────────────────────────────────────┐
│ Card "Identité de la campagne"                      │
│  Nom*              [__________________________]      │
│  Description       [Textarea 3 lignes________]      │
├─────────────────────────────────────────────────────┤
│ Card "Calendrier"                                   │
│  Date de début*    [📅 ___________]                 │
│  Date de fin*      [📅 ___________]                 │
│  Deadline employé  [📅 ___________]                 │
│  Deadline manager  [📅 ___________]                 │
├─────────────────────────────────────────────────────┤
│ Card "Ciblage"                                      │
│  Départements cibles  [Multi-select ▼]              │
│  ☐ Visibilité étendue (managers voient N+2)         │
├─────────────────────────────────────────────────────┤
│ Card "Contexte N-1"                                 │
│  Activer le contexte N-1      [Toggle ON/OFF]       │
│  Visible par l'employé        [Toggle ON/OFF]       │
│  (affiché seulement si N-1 activé)                  │
│  Campagne source (optionnel)  [Select ▼]            │
│  (liste des campagnes closed/archived)              │
│  Si vide → auto-fallback backend                    │
├─────────────────────────────────────────────────────┤
│ Card "Périmètre de la campagne"                     │
│  [●] Tous les collaborateurs actifs                 │
│  [ ] Par département → [multi-select départements]  │
│  [ ] Par secteur     → [multi-select secteurs]      │
│  [ ] Sélection manuelle → [search+select users]     │
├─────────────────────────────────────────────────────┤
│ Card "Formulaires"                                  │
│  Formulaire principal*   [Select ▼]                 │
│  Formulaire d'objectifs  [Select ▼ — optionnel]     │
│  (type: 'objectives' uniquement)                    │
└─────────────────────────────────────────────────────┘
```

**Champs** : `name`* · `description` · `startDate`* · `endDate`* · `deadlineEmployee` · `deadlineManager` · `targetDepartments` (multi-select) · `extendedVisibility` (checkbox) · `enableN1Context` (toggle) · `n1VisibleToEmployee` (toggle, conditionnel) · `previousCampaignId` (select optionnel) · `targetScope` (radio: `all` | `department` | `sector` | `users`) · `targetSectorIds` (multi-select, conditionnel) · `targetUserIds` (autocomplete, conditionnel) · `objectivesFormId` (select optionnel)

**Logique conditionnelle** :
- `n1VisibleToEmployee` et `previousCampaignId` sont **masqués** si `enableN1Context = false`
- Si `previousCampaignId` vide, le backend sélectionne automatiquement la campagne source la plus récente
- `targetScope = 'all'` → aucun sélecteur supplémentaire
- `targetScope = 'department'` → multi-select des DEPARTMENTS
- `targetScope = 'sector'` → multi-select des secteurs (`GET /api/org/sectors`)
- `targetScope = 'users'` → autocomplete (`GET /api/users?q=...`)
- Formulaire d'objectifs : sélecteur filtré sur `formType = 'objectives'` uniquement

**Validation** : `endDate > startDate` (erreur inline) · Nom requis

**Mobile** : Formulaire 1 col, boutons sticky en bas.

**Liens** : Succès → `/campaigns/:id` (nouvelle campagne en draft)

---

### S-11 · `/campaigns/:id` — Détail de la campagne

**Accessible à** : Tous (admin/hr : complet · autres : lecture)

**Fil d'Ariane** : Accueil › Campagnes › [Nom campagne]

**Page title** : « [Nom de la campagne] »

**Layout** :
```
[H1: Nom]  [Badge statut]          [Modifier] [Cloner] [⋮ Actions]
Période: 01/01/2025 – 31/03/2025 · Créée le …

──── Onglets : Aperçu | Évaluations | Formulaires ────

[Onglet Aperçu]
┌────────────────────────────────────────────────────────┐
│ [col-3] Total   [col-3] En cours  [col-3] Soumis  [col-3] Validés │
│  N évals         N évals           N évals          N évals        │
├────────────────────────────────────────────────────────┤
│ [col-8] Barre de progression globale (h-2, segmentée)  │
│ [col-4] Répartition par statut (liste + pourcentages)  │
├────────────────────────────────────────────────────────┤
│ Départements ciblés : [chip] R&D [chip] Finance …      │
└────────────────────────────────────────────────────────┘

[Onglet Évaluations]
  Tableau des évaluations (raccourci vers /evaluations?campaign=:id)

[Onglet Formulaires]
  Grille de cards formulaires liés
```

**Boutons de transition de statut** (admin/hr, selon statut courant) :
- `draft` → [Activer la campagne] (Primary)
- `active` → [Clôturer la campagne] (Secondary)
- `closed` → [Archiver] (Ghost)

**Actions `⋮`** : Modifier · Cloner · Voir les analytics · Supprimer (draft/archived seulement)

**Modal clonage (S-11-M1)** :
> « Cloner [Nom] » · Nouveau nom proposé (+ an) · [Annuler] [Cloner] (Primary)

**Modal suppression (S-11-M2)** :
> Avertissement — confirmation par saisie du nom · [Supprimer définitivement] (Danger)

**Mobile** : Onglets → scroll horizontal · KPI 2×2 grid.

**Liens** : → `/campaigns/:id/analytics` · `/evaluations?campaign=:id` · `/forms/:id`

---

### S-12 · `/campaigns/:id/analytics` — Analytique de la campagne

**Accessible à** : admin, hr

**Fil d'Ariane** : Accueil › Campagnes › [Nom] › Analytique

**Page title** : « Analytique — [Nom] »

**Layout** :
```
[H1: Analytique — Nom]              [Exporter PDF] [Exporter CSV]

[col-6] Distribution des statuts     [col-6] Distribution des scores
  Graphe donut (statuts colorés)       Histogramme (tranches de 10)

[col-4] Score moyen global           [col-8] Complétion par département
  Chiffre large + gauge circulaire      Tableau: Dép. · Total · Complété · %
```

**Graphes** : SVG/Canvas inline (recharts ou similaire). Palette : couleurs sémantiques du design system.

**Export PDF** : Déclenche `GET /api/analytics/export/pdf?campaignId=:id` → téléchargement.

**Export CSV** : Déclenche `GET /api/evaluations/export?campaignId=:id`.

**Empty state** : « Aucune donnée analytique disponible — lancez la campagne pour commencer. »

**Mobile** : Graphes pleine largeur empilés.

---

## 5. Formulaires

---

### S-13 · `/forms` — Bibliothèque de formulaires

**Accessible à** : Tous

**Fil d'Ariane** : Accueil › Formulaires

**Page title** : « Formulaires »

**Layout** :
```
[H1: Formulaires]                          [+ Nouveau formulaire] (admin/hr)
[Type ▼] [Campagne ▼] [Recherche________]

Grille 3 colonnes (xl) / 2 (md) / 1 (mobile)
┌──────────────────┐  ┌──────────────────┐
│ [Icône type]     │  │ [Icône type]      │
│ Titre formulaire │  │ Titre             │
│ Type: Auto-éval  │  │ Type: Manager     │
│ [Badge] 5 quest. │  │ [Badge 🔒 Gelé]   │
│ Campagne: …      │  │ Campagne: —       │
│ [Voir →]         │  │ [Voir →]          │
└──────────────────┘  └──────────────────┘
```

**Card champs** : Icône type (Lucide) · Titre · Type (badge pill) · Nombre de questions · Campagne liée (ou « Template ») · Badge « Gelé 🔒 » si `frozenAt` · Bouton « Voir »

**Actions `⋮`** (admin/hr) : Modifier · Dupliquer · Supprimer (si non gelé)

**Filtres** : Type (`self_evaluation` / `manager_evaluation` / `upward_feedback` / `director_evaluation` / `peer_review`) · Campagne liée

**Empty state** : Illustration `FileText` + « Aucun formulaire » + « + Créer le premier formulaire »

**Mobile** : Cards 1 col.

---

### S-14 · `/forms/new` — Créer un formulaire

**Accessible à** : admin, hr

**Fil d'Ariane** : Accueil › Formulaires › Nouveau formulaire

**Page title** : « Nouveau formulaire »

**Layout** :
```
[H1: Nouveau formulaire]    [📤 Importer JSON →]  [Annuler] [Enregistrer]

[col-4] Métadonnées               [col-8] Questions (FormBuilder)
  Titre*                            [+ Ajouter une question]
  Description                       ┌──────────────────────────┐
  Type*  [Select ▼]                 │ Q1: [Type ▼] [Phase ▼]  │
  Campagne [Select ▼]               │ Texte de la question*    │
  ☐ Anonyme                         │ [Requis] [⠿ Déplacer]   │
                                    │ [Supprimer 🗑]           │
                                    └──────────────────────────┘
                                    [+ Ajouter une question]
```

**Types de formulaire** (sélecteur `Type*`) :
```
─── Évaluations ───────────────────
• Auto-évaluation        (self_evaluation)
• Évaluation manager     (manager_evaluation)
• Feedback ascendant     (upward_feedback)
• Évaluation directeur   (director_evaluation)
• Peer review            (peer_review)

─── Objectifs ──────────────────────
• Objectifs              (objectives)

─── Formulaires de demande ─────────
• Demande de mobilité        (mobility_request)
• Demande d'augmentation     (salary_raise_request)
• Demande de promotion       (promotion_request)
• Demande de formation       (training_request)
```

Si `formType = 'objectives'` → afficher option supplémentaire :
```
[ ] 📥 Importer automatiquement les objectifs N-1
    (les réponses de la campagne précédente, phase 'objectives', seront pré-remplies)
```

**Types de questions** (sélecteur dans chaque card) :
- `rating` — Curseur 1–5 (ou 1–10 configurable)
- `text` — Textarea libre
- `yes_no` — Boutons Oui/Non
- `choice` — Choix multiple (champs dynamiques pour options)
- `weather` — Météo humeur (5 icônes soleil→tempête)
- `mobility` — Souhait de mobilité (oui/non + commentaire)
- `n1_import` — Import réponse N+1 (lecture seule évalué)
- `scale` — Curseur 0–100% (label : « Atteinte d'objectif % »)
- `objective_item` — Champ structuré : « Libellé de l'objectif » + « Résultat attendu » + « Date cible »

**Phases** : `self` · `n-1` · `objectives` · `aspirations` · `all`

**Drag & Drop** : Réordonnancement des questions par glisser-déposer (handle `⠿`).

**Validation** : IDs de questions auto-générés (UUID) mais uniques. Titre requis. Type requis.

**Lien « 📤 Importer JSON »** : redirige vers S-41 `/admin/forms/import`.

**Mobile** : Métadonnées repliées (accordéon) · FormBuilder pleine largeur.

---

### S-15 · `/forms/:id` — Éditer un formulaire

**Accessible à** : admin/hr (écriture) · autres (lecture seule)

**Fil d'Ariane** : Accueil › Formulaires › [Titre]

**Page title** : « [Titre du formulaire] »

**Différences vs S-14** :
- Bandeau `warning` si `frozenAt` : « 🔒 Formulaire gelé — Les questions ne sont plus modifiables car des évaluations existent. Vous pouvez encore modifier le titre et la description. »
- Questions en lecture seule si gelé (pas d'édition, pas de drag, pas de suppression)
- Bouton « Supprimer le formulaire » (Danger, footer, admin/hr, si non gelé)
- Badge « Gelé » en haut à droite du titre
- Bouton « ⬇️ Exporter JSON » (Secondary, admin/hr) → `GET /api/forms/:id/export`

**Modal suppression (S-15-M1)** :
> « Supprimer ce formulaire ? Cette action est irréversible. » · [Annuler] [Supprimer] (Danger)

---

## 6. Évaluations

---

### S-16 · `/evaluations` — Liste des évaluations

**Accessible à** : Tous (périmètre selon rôle)

**Fil d'Ariane** : Accueil › Évaluations

**Page title** : « Mes évaluations » (employee) · « Évaluations » (admin/hr/manager/director)

**Layout** :
```
[H1]                [+ Nouvelle] [Actions bulk ▼] [Exporter CSV] (admin/hr)
[Campagne ▼] [Statut ▼] [Évalué ▼] [Évaluateur ▼] [Recherche___]

☐ [Sélectionner tout]                         [N sélectionnées · Actions ▼]

┌───────────────────────────────────────────────────────────────────┐
│☐│ ÉVALUÉ         │ ÉVALUATEUR   │ CAMPAGNE    │ STATUT    │ DATE  │⋮│
├───────────────────────────────────────────────────────────────────┤
│☐│ [Av] J. Doe    │ [Av] M. Paul │ EA 2025     │ En cours  │25/01  │⋮│
│☐│ [Av] L. Martin │ [Av] A. Lee  │ EA 2025     │ Soumise   │18/01  │⋮│
└───────────────────────────────────────────────────────────────────┘
[Pagination]
```

**Colonnes** : Checkbox · Évalué (avatar+nom) · Évaluateur (avatar+nom, masqué si anonyme) · Campagne · Statut (badge) · Date · Actions `⋮`

**Actions bulk** (admin/hr) : Archiver · Signer (RH) · Réaffecter — avec modale de confirmation.

**Actions `⋮`** ligne : Voir · PDF · Réaffecter (admin/hr) · Expirer (admin/hr)

**Filtres** : Campagne (select) · Statut (select multiple) · Département · Recherche

**Employee** : Colonnes = Campagne · Formulaire · Statut · Deadline · Action [Remplir / Voir]

**Empty state** : Illustration `ClipboardList` + « Aucune évaluation » + CTA contextuel.

**Mobile** : Tableau → cards empilées (sans checkbox bulk). Filtres en tiroir.

**Liens** : → `/evaluations/:id` · `/evaluations/history` · `/evaluations/new`

---

### S-17 · `/evaluations/:id` — Remplir / Voir une évaluation

**Accessible à** : Tous (scopé — évaluateur, évalué, admin/hr)

**Fil d'Ariane** : Accueil › Évaluations › [Campagne — Évalué]

**Page title** : Dynamique selon mode (voir ci-dessous)

---

#### Mode A — Remplissage (évaluateur, statut `assigned` / `in_progress`)

**Page title** : « Remplir l'évaluation »

**Layout** :
```
[H1: Remplir l'évaluation]
Évalué: [Avatar] Prénom Nom · Campagne: EA 2025 · Deadline: 15/02
Progression: ████████░░ 4/5 questions répondues

─────── Navigation phases ────────
[● Phase auto] [○ Phase N-1] [○ Objectifs]

┌──────────────────────────────────────────┐
│ Question 2 / 5                           │
│ « Comment évaluez-vous vos performances  │
│   sur les objectifs de l'année ? »       │
│                                          │
│  [1] [2] [3] [4] [5]  ← rating          │
│                                          │
│  Note (optionnelle) : [_______________]  │
└──────────────────────────────────────────┘

[← Précédent]    [Sauvegarder]    [Suivant →]

─── En bas de la dernière question ───
[Soumettre l'évaluation] (Primary)
```

**Sauvegarde auto** : `PATCH /api/evaluations/:id` (débounce 2 s) — toast « Sauvegardé à [heure] »

**Barre de progression** : Questions répondues / total, segmentée par phase.

**Navigation** : Boutons Précédent/Suivant + tabs phases.

**Soumission** : Modal de confirmation → [Annuler] [Confirmer la soumission] (Primary)

---

#### Mode B — Consultation lecture seule (reviewer, statut `submitted`)

**Page title** : « Révision de l'évaluation »

**Layout** :
```
[H1: Révision]  [Badge: Soumise]   [Télécharger PDF] [Revoir →] (admin/hr/manager)
Évalué: [Av] Prénom Nom · Évaluateur: [Av] …

─────── Questions & Réponses ────────
  Phase: Auto-évaluation
  Q1: Texte question
  ➤ Réponse: ████░░ 4/5

  Q2: Texte question
  ➤ Réponse: « Texte libre… »

─────── Section Reviewer (manager) ────────
  Score global*  [____] /100
  Commentaire reviewer [Textarea_________________]
  Objectifs N+1  [Textarea_________________]

[Annuler]         [Enregistrer la révision] (Primary)
```

**Bouton « Revoir »** (admin/hr/manager/director) : déclenche `submitted → reviewed`.

---

#### Mode C — Flux de signature (multi-étapes)

**Page title** : « Compte-rendu d'entretien »

**Bandeau de progression signatures** :
```
[✓ Soumis] ─── [✓ Révisé] ─── [→ Signer (évalué)] ─── [○ Manager] ─── [○ RH]
```

Selon le statut :
- `reviewed` : Bouton [Signer l'entretien] pour l'**évalué** + zone commentaire évalué + flag désaccord
- `signed_evaluatee` : Bouton [Signer] pour le **manager/director**
- `signed_manager` : Bouton [Signer (RH)] pour le **RH/admin**
- `signed_hr` : Bouton [Valider définitivement] pour **admin/hr**

**Zone évalué** (visible sur `reviewed` pour l'évalué) :
- Lecture de son évaluation + score + commentaire reviewer
- Champ « Mon commentaire » (facultatif)
- Checkbox « Je signale un désaccord » (flag `disagreementFlag`)
- [Signer et valider la prise de connaissance] (Primary)

**Flag désaccord** : Si `disagreementFlag = true`, bandeau `warning` visible par admin/hr/manager.

---

#### Mode D — Lecture seule complète (post-validation)

**Page title** : « Compte-rendu — [Prénom Nom] »

Affichage complet en lecture : questions/réponses · score · commentaire reviewer · objectifs N+1 · commentaire évalué · signatures (noms + dates).

**Bouton** : [Télécharger PDF] (déclenche `GET /api/evaluations/:id/pdf`)

---

**Mobile (tous modes)** : 1 question par écran · swipe navigation · barre de progression sticky en haut.

**Liens** : → `/evaluations` · PDF download

---

### S-18 · `/evaluations/history` — Historique des évaluations

**Accessible à** : Tous (filtré sur soi)

**Fil d'Ariane** : Accueil › Évaluations › Historique

**Page title** : « Mon historique d'entretiens »

**Layout** :
```
[H1: Mon historique]         [Exporter PDF] (si évaluation validée)

[Année ▼] [Campagne ▼]

Grille 2 colonnes (desktop) / 1 (mobile)
┌──────────────────────────┐  ┌──────────────────────────┐
│ EA 2024 — Autoevaluation │  │ EA 2023 — Manager eval   │
│ Statut: ✓ Validée        │  │ Statut: ✓ Validée        │
│ Score: 78/100            │  │ Score: 82/100            │
│ Validée le 15/03/2024    │  │ Validée le 20/03/2023    │
│ [Voir le compte-rendu]   │  │ [Voir] [PDF]             │
└──────────────────────────┘  └──────────────────────────┘
```

**Empty state** : Illustration `History` + « Aucun entretien terminé pour l'instant. »

**Mobile** : Cards 1 col.

---

## 7. Événements

---

### S-19 · `/events` — Calendrier / Liste des événements

**Accessible à** : Tous (filtrés par `targetRoles`)

**Fil d'Ariane** : Accueil › Calendrier

**Page title** : « Calendrier »

**Layout** :
```
[H1: Calendrier]         [Vue: Mois | Semaine | Liste]  [+ Nouvel événement] (admin/hr)

[← Janvier 2025 →]

Grille calendrier mensuelle 7 colonnes
  L   M   M   J   V   S   D
  …  [●Deadline EA]  …  [●Réunion RH]  …

─── Liste des prochains événements ───
[Chip type: Deadline] Deadline EA 2025 — 15/02/2025 — Tous
[Chip type: Meeting]  Réunion RH Q1   — 20/02/2025 — Managers
```

**Types d'événements** (couleurs) :
| Type | Couleur | Icône |
|---|---|---|
| `deadline` | `error-500` | `Clock` |
| `interview` | `primary-500` | `MessageSquare` |
| `meeting` | `info-500` | `Users` |
| `feedback` | `success-500` | `Star` |
| `campaign` | `warning-500` | `BarChart2` |

**Vue liste** : Tableau Date · Type (chip coloré) · Titre · Lieu · Rôles ciblés · Actions `⋮`

**Empty state** : « Aucun événement à venir. »

**Mobile** : Vue liste par défaut (calendrier masqué). Pull-to-refresh.

---

### S-20 · `/events/:id` — Détail d'un événement

**Accessible à** : Tous (filtrés par rôle)

**Fil d'Ariane** : Accueil › Calendrier › [Titre événement]

**Page title** : « [Titre] »

**Layout** :
```
[H1: Titre]  [Chip type]    [Modifier] [Supprimer] (admin/hr)

  📅 Date: 15/02/2025 — 14h00 → 16h00
  📍 Lieu: Salle Apollon, Paris
  👥 Rôles: Managers, HR
  🔗 Campagne liée: [EA 2025 →] (si campaignId)

  Description:
  [Texte complet de l'événement]
```

**Modal suppression** : Confirmation simple [Annuler] [Supprimer] (Danger).

**Modal modification** : Slide-over droite (`max-w-lg`) avec formulaire inline.

**Champs formulaire** : `title`* · `date`* · `endDate` · `type`* · `description` · `location` · `campaignId` · `targetRoles` (multi-select)

---

## 8. Ressources

---

### S-21 · `/resources` — Bibliothèque de ressources

**Accessible à** : Tous (publiées uniquement pour non-admin/hr)

**Fil d'Ariane** : Accueil › Ressources

**Page title** : « Ressources »

**Layout** :
```
[H1: Ressources]              [+ Nouvelle ressource] (admin/hr)
[Type ▼] [Statut ▼] (admin/hr) [Recherche________]

Grille 3 cols (xl) / 2 (md) / 1 (mobile)
┌───────────────────────┐
│ [Icône PDF/XLSX…]     │
│ Titre de la ressource │
│ Type: PDF · 2,3 Mo    │
│ Visible: Tous         │
│ [Badge] Publié        │
│ [Télécharger ↓]       │
└───────────────────────┘
```

**Card champs** : Icône type (colorée) · Titre · Type + taille · Rôles cibles · Badge statut · Bouton « Télécharger »

**Admin/HR** : Badge `draft` visible + bouton « Publier » sur les drafts + actions `⋮` (Modifier · Supprimer)

**Empty state** : Illustration `BookOpen` + « Aucune ressource disponible. »

**Mobile** : Cards 1 col, bouton Télécharger pleine largeur.

---

### S-22 · `/resources/:id` — Voir une ressource

**Accessible à** : Tous (publiées · admin/hr : toutes)

**Fil d'Ariane** : Accueil › Ressources › [Titre]

**Page title** : « [Titre de la ressource] »

**Layout** :
```
[H1: Titre]  [Badge statut]      [Modifier] [Publier / Dépublier] (admin/hr)

  Type: PDF · Taille: 2,3 Mo · Publié le 01/01/2025
  Visible pour: [chip] Managers [chip] Employees

  Description:
  [Texte descriptif]

  [Télécharger le fichier ↓]  (Primary lg)
```

**Modal modification (S-22-M1)** : Slide-over — champs `title` · `description` · `type` · `status` · `visibleTo` (multi-select rôles).

---

## 9. Offboarding

---

### S-23 · `/offboarding` — Liste des offboardings

**Accessible à** : admin, hr

**Fil d'Ariane** : Accueil › Offboarding

**Page title** : « Offboarding »

**Layout** :
```
[H1: Offboarding]                          [+ Nouvelle demande]

[Statut ▼] [Motif ▼] [Recherche________]

┌─────────────────────────────────────────────────────────────────┐
│ COLLABORATEUR    │ MOTIF       │ DERNIER JOUR │ STATUT   │CHECK │⋮│
├─────────────────────────────────────────────────────────────────┤
│ [Av] Jean Dupont │ Démission   │ 28/02/2025   │ En cours │ 3/5  │⋮│
│ [Av] Sara Martin │ Retraite    │ 31/03/2025   │ Pending  │ 0/5  │⋮│
└─────────────────────────────────────────────────────────────────┘
```

**Colonnes** : Collaborateur (avatar+nom, lien → `/offboarding/:id`) · Motif (badge) · Dernier jour · Statut · Checklist (N/5) · Actions `⋮`

**Motifs** (badges colorés) : `resignation` (warning) · `termination` (error) · `retirement` (info) · `other` (slate)

**Actions `⋮`** : Voir · Modifier statut · Supprimer (admin seulement)

**Empty state** : Illustration `LogOut` + « Aucune demande de départ en cours. »

**Mobile** : Tableau → cards. Colonnes principales : Nom + Statut + Checklist.

---

### S-24 · `/offboarding/:id` — Dossier d'offboarding

**Accessible à** : admin, hr

**Fil d'Ariane** : Accueil › Offboarding › [Prénom Nom]

**Page title** : « Départ — [Prénom Nom] »

**Layout** :
```
[H1: Départ — Prénom Nom]   [Badge statut]    [⋮ Actions]
Motif: Démission · Dernier jour: 28/02/2025

─── col-8 ─────────────────────── col-4 ──────────────────
 Checklist de départ                  Informations
 ┌────────────────────────────┐      Collaborateur: lien profil
 │☑ Révocation accès systèmes│      Département: R&D
 │☑ Récupération matériel     │      Manager: [Av] J. Manager
 │☐ Archivage évaluations    │      Créé par: M. RH
 │☐ Solde de tout compte     │      Créé le: 01/02/2025
 │☐ Entretien de départ      │
 └────────────────────────────┘      Notes RH:
 Progression: ██░░░ 2/5             [Textarea éditable]
                                    [Sauvegarder les notes]

─── Bas de page ────────────────────────────────────────────
  Changer le statut:  [Marquer En cours] / [Marquer Complété]
```

**Checklist** : Chaque item cochable (PATCH `/api/offboarding/:id/checklist/:index`). `doneAt` et `doneBy` affichés au survol.

**Passage à `completed`** : Modal de confirmation (avertissement : « L'utilisateur sera désactivé »).

**Modal suppression (S-24-M1)** : Admin uniquement · Confirmation + [Supprimer] (Danger).

**Mobile** : Checklist + infos empilés verticalement.

---

## 10. Analytique

---

### S-25 · `/analytics` — Dashboard analytique global

**Accessible à** : admin, hr

**Fil d'Ariane** : Accueil › Analytique

**Page title** : « Analytique RH »

**Layout** :
```
[H1: Analytique RH]    [Campagne: Toutes ▼]   [Exporter PDF] [Exporter CSV]

[col-3] KPI       [col-3] KPI        [col-3] KPI       [col-3] KPI
Total évals       Score moyen        Taux complétion   Évals validées
  N               XX/100              XX%                N

[col-6] Distribution statuts         [col-6] Distribution scores
  Graphe donut multicolore            Histogramme barres

[col-12] Top 5 performances (tableau: Collaborateur · Score · Campagne)

[col-12] Taux de complétion par département
  Tableau: Département · Total · Soumis · Validés · %
  + mini barre de progression h-1 par ligne
```

**Sélecteur campagne** : Toutes / [Campagne spécifique] — rafraîchit tous les graphes.

**Export PDF** : `GET /api/analytics/export/pdf` (avec `campaignId` si sélection).

**Empty state** : « Sélectionnez une campagne active pour afficher les données. »

**Mobile** : KPI 2×2 · graphes 1 col · tableau scroll horizontal.

---

## 11. Administration

---

### S-26 · `/admin` — Hub d'administration

**Accessible à** : admin

**Fil d'Ariane** : Accueil › Administration

**Page title** : « Administration »

**Layout** : Grille de cards de navigation 6 colonnes (3+3 sur deux lignes) :
```
┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│[Settings]│ │ [Server] │ │ [Shield] │ │ [Users]  │ │[Sliders] │ │  [Tree]  │
│ Config   │ │ LDAP     │ │ Audit    │ │ Gestion  │ │Paramètres│ │Organig-  │
│ système  │ │          │ │ Journal  │ │ avancée  │ │ système  │ │  ramme   │
│→ /admin/ │ │→ /admin/ │ │→ /admin/ │ │→ /admin/ │ │→ /admin/ │ │→ /admin/ │
│  config  │ │  ldap    │ │  audit   │ │  users   │ │  settings│ │ orgchart │
└──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘
```
Chaque card : icône 24px centrée · titre · description courte · lien.

**Cards** :
| # | Icône | Titre | Description | Lien |
|---|---|---|---|---|
| 1 | `Settings` | Config système | Clés de configuration, SMTP, feature flags | `/admin/config` |
| 2 | `Server` | LDAP | Annuaire d'entreprise, synchronisation | `/admin/ldap` |
| 3 | `Shield` | Journal d'audit | Piste d'audit complète des actions | `/admin/audit` |
| 4 | `Users` | Gestion avancée | Conformité RGPD, anonymisation | `/admin/users` |
| 5 | `SlidersHorizontal` | Paramètres système | Général, SMTP, feature flags, sécurité | `/admin/settings` |
| 6 | `Network` | Organigramme | Visualiser et gérer la hiérarchie | `/admin/orgchart` |

---

### S-27 · `/admin/config` — Configuration système

**Accessible à** : admin

**Fil d'Ariane** : Accueil › Administration › Configuration

**Page title** : « Configuration système »

**Layout** :
```
[H1: Configuration]                   [+ Nouvelle clé]  [Email de test ✉]

┌──────────────────────────────────────────────────────────┐
│ CLÉ                    │ VALEUR              │ ACTIONS   │
├──────────────────────────────────────────────────────────┤
│ smtp.host              │ smtp.example.com    │ [✎] [🗑]  │
│ smtp.port              │ 587                 │ [✎] [🗑]  │
│ feature.onboarding     │ true                │ [✎] [🗑]  │
└──────────────────────────────────────────────────────────┘
```

**Modal « Email de test » (S-27-M1)** :
> Champ « Adresse de test » + [Envoyer] · En dev : affiche l'URL Ethereal preview.

**Modal « Nouvelle clé / Modifier » (S-27-M2)** :
> Champs `key`* + `value`* · [Annuler] [Enregistrer]

**Modal suppression** : Confirmation simple.

---

### S-28 · `/admin/ldap` — Configuration LDAP

**Accessible à** : admin

**Fil d'Ariane** : Accueil › Administration › LDAP

**Page title** : « Configuration LDAP »

**Layout** :
```
[H1: Configuration LDAP]

─────── Onglets : Config | Test | Prévisualisation | Synchronisation ────────

[Onglet Config]
  Card "Connexion"
    URL LDAP*    [ldap://...]
    Base DN*     [dc=example,dc=com]
    Bind DN*     [cn=admin,dc=...]
    Bind Password [●●●●●●●] (write-only)
  Card "Mapping attributs"
    Champ email     [mail]
    Champ prénom    [givenName]
    Champ nom       [sn]
  [Sauvegarder la configuration]

[Onglet Test]
  [Tester la connexion]  → résultat inline (✅ / ❌ + message)

[Onglet Prévisualisation]
  [Charger la prévisualisation] → tableau 50 premiers utilisateurs LDAP

[Onglet Synchronisation]
  Dernière sync: [date]  Résultat: N créés, M mis à jour, K ignorés
  [Lancer la synchronisation]  → progress indicator + résultat
```

**Sécurité** : `bindPassword` jamais affiché en lecture, toujours write-only.

---

### S-29 · `/admin/audit` — Journal d'audit

**Accessible à** : admin, hr

**Fil d'Ariane** : Accueil › Administration › Journal d'audit

**Page title** : « Journal d'audit »

**Layout** :
```
[H1: Journal d'audit]                          [Exporter CSV]

[Action ▼] [Type cible ▼] [Utilisateur ▼] [Du ___] [Au ___]

┌────────────────────────────────────────────────────────────────────┐
│ DATE/HEURE         │ ACTEUR         │ ACTION             │ CIBLE  │
├────────────────────────────────────────────────────────────────────┤
│ 25/01 14:32        │ [Av] A. Admin  │ campaign_activate  │ EA2025 │
│ 25/01 11:20        │ [Av] M. RH     │ evaluation_update  │ #4512  │
│ 24/01 09:05        │ [Av] A. Admin  │ gdpr_anonymize     │ #usr92 │
└────────────────────────────────────────────────────────────────────┘
[Pagination]
```

**Actions tracées** (filtrables) : `status_change` · `evaluation_update` · `campaign_create/activate/update/delete` · `bulk_action` · `offboard` · `offboarding_*` · `gdpr_anonymize` · `reassigned`

**Empty state** : « Aucune entrée dans le journal d'audit. »

**Mobile** : Tableau scroll horizontal. Filtres en tiroir.

---

### S-30 · `/admin/users` — Gestion avancée des utilisateurs

**Accessible à** : admin

**Fil d'Ariane** : Accueil › Administration › Gestion utilisateurs

**Page title** : « Gestion avancée des utilisateurs »

**Différences vs `/users`** (S-04) :
- Colonne supplémentaire : `authSource` (badge `local` / `ldap`)
- Colonne : Date d'archivage (si inactif)
- Actions `⋮` enrichies : Anonymiser RGPD · Exporter données RGPD · Forcer désactivation
- Filtres supplémentaires : `authSource` · Comptes inactifs/archivés
- Bandeau info RGPD en haut de page : « Les données utilisateur sont soumises au RGPD. Toute anonymisation est irréversible et auditée. »

---

## 12. Profil utilisateur

---

### S-31 · `/profile` — Mon profil

**Accessible à** : Tous

**Fil d'Ariane** : Accueil › Mon profil

**Page title** : « Mon profil »

**Layout** :
```
[Avatar XL — modifiable]   [Prénom Nom]     [Modifier]
                            [Rôle] · [Département] · [Poste]
                            ✉ email · Source: local / LDAP

─── Onglets : Informations | Avatar | Préférences | Mes données | Mes demandes ───

[Onglet Informations]
  Champs modifiables (self) : prénom, nom
  Champs lecture seule : email, rôle, département, poste, manager

[Onglet Avatar]
  ┌─────────────────────────────────────────────┐
  │  [Aperçu avatar actuel — cercle 96px]       │
  │  [Choisir une image]  (Secondary)           │
  │  Formats acceptés : JPG, PNG, WebP · max 2 Mo│
  │  [Supprimer l'avatar] → initiales générées  │
  └─────────────────────────────────────────────┘

[Onglet Préférences]
  → redirige vers /profile/preferences

[Onglet Mes données]
  Mes évaluations (raccourci /evaluations)
  Mes entretiens terminés (raccourci /evaluations/history)
  [Exporter mes données RGPD] → téléchargement JSON

[Onglet Mes demandes]
  [+ Déposer une demande ▼]  ← dropdown
    → [Demande de mobilité]
    → [Demande d'augmentation]
    → [Demande de promotion]
    → [Demande de formation]

  [DataTable — mes demandes]
  Colonnes : Type | Date | Statut | Actions
  [Ligne : Demande de mobilité | 01/05/2026 | En traitement | [Voir →]]
```

**Onglet Avatar — comportement** :
- Click « Choisir une image » → `<input type="file" accept="image/*">` (max 2 Mo)
- Preview instantanée via `FileReader` avant envoi
- Envoi : `PATCH /api/users/:id/avatar` avec `{ avatar: "<base64>" }` ou URL
- Toast « Avatar mis à jour » · En cas d'erreur taille/format : feedback inline

**Modification avatar** : Click → input `file` (image) ou génération automatique initiales.

**Onglet Mes demandes — comportement** :
- Liste : `GET /api/evaluations?formType=mobility_request,salary_raise_request,promotion_request,training_request&evaluateeId=me`
- Dropdown « + Déposer » → chaque option déclenche `GET /api/forms?formType=<type>` pour récupérer l'id du formulaire → redirige vers `/evaluations/new?formId=<id>`
- Si aucun formulaire du type demandé n'existe → toast `warning` « Aucun formulaire de ce type disponible — contactez votre RH »

---

### S-32 · `/profile/preferences` — Mes préférences

**Accessible à** : Tous

**Fil d'Ariane** : Accueil › Mon profil › Préférences

**Page title** : « Préférences »

**Layout** :
```
[H1: Préférences]                              [Sauvegarder]

┌──────────────────────────────────────────────┐
│ Card "Interface"                              │
│  Langue        [○ Français  ○ English]       │
│  Thème         [○ Clair  ○ Sombre  ○ Système]│
├──────────────────────────────────────────────┤
│ Card "Notifications e-mail"                   │
│  ☑ Évaluation assignée                       │
│  ☑ Rappel de deadline                        │
│  ☑ Action manager requise                    │
│  ☑ Soumission d'évaluation (manager+)        │
│  ☑ Lancement de campagne (hr+)               │
│  ☑ Alertes système (admin)                   │
│  (Seules les notifs autorisées par rôle      │
│   sont affichées)                            │
└──────────────────────────────────────────────┘
```

**Sauvegarde** : `PATCH /api/auth/preferences` · Toast « Préférences sauvegardées »

**Changement de thème** : Appliqué immédiatement (sans rechargement, via classe `.dark` sur `<html>`).

**Mobile** : Identique, bouton Sauvegarder sticky en bas.

---

## 13. Onboarding

---

### S-33 · `/onboarding` — Flux d'onboarding nouvel utilisateur

**Accessible à** : Tous (utilisateurs dont `onboarding.completed = false`)

**Déclenchement** : Redirection automatique après `/login` si `onboarding.completed = false` ET rôle `employee` (configurable via feature flag `feature.onboarding`).

**Page title** : « Bienvenue sur NX-RH »

**Layout** : Écran plein (sans navbar) — wizard multi-étapes :
```
[Logo NX-RH centré]

[Step indicator : ● ○ ○ ○ ○  Étape 1 sur 5]

┌────────────────────────────────────────────────┐
│ [Illustration SVG 160px centrée]               │
│                                                │
│  H2: « Complétez votre profil »                │
│  Description: « Vérifiez vos informations »    │
│                                                │
│  Prénom*  [___________]                        │
│  Nom*     [___________]                        │
│                                                │
│  [Passer cette étape]  [Suivant →] (Primary)   │
└────────────────────────────────────────────────┘
```

**5 étapes** :
1. **Profil complété** — Vérification prénom/nom, complétion champs optionnels
2. **Photo ajoutée** — Upload avatar ou génération initiales
3. **Présentation à l'équipe** — Affichage manager direct + membres équipe (lecture)
4. **Accès systèmes vérifiés** — Checklist "J'ai accès à…" (informatif)
5. **Premier entretien planifié** — Affichage campagne active en cours (si existe)

**Chaque étape** : `PATCH /api/users/:id/onboarding/:stepIndex` au clic « Suivant ».

**Fin** : `PATCH /api/users/:id/onboarding/complete` → redirection vers `/` (dashboard).

**Bouton « Passer cette étape »** : Disponible sur toutes les étapes sauf la 1ère.

**Mobile** : Plein écran, illustrations redimensionnées, wizard identique.

---

## 14. Paramètres système

---

### S-34 · `/admin/settings` — Paramètres système

**Accessible à** : admin uniquement

**Fil d'Ariane** : Accueil › Administration › Paramètres système

**Page title** : « Paramètres système »

**Layout** :
```
[H1: Paramètres système]                         [Sauvegarder]

┌────────────────────────────────────────────────────────┐
│ Card "Général"                                         │
│  Nom de la plateforme  [NX-RH___________________]      │
│  Fuseau horaire        [Select ▼ Europe/Paris]         │
│  Logo (URL)            [https://...]                   │
├────────────────────────────────────────────────────────┤
│ Card "Configuration SMTP"                              │
│  Serveur SMTP*  [smtp.example.com]                     │
│  Port*          [587]                                  │
│  Utilisateur    [user@example.com]                     │
│  Mot de passe   [●●●●●●●] [👁]                        │
│  ○ Activer TLS  [Toggle ON/OFF]                        │
├────────────────────────────────────────────────────────┤
│ Card "Feature Flags"                                   │
│  Onboarding employé    [Toggle ON/OFF]                 │
│  Module Offboarding    [Toggle ON/OFF]                 │
│  Export PDF            [Toggle ON/OFF]                 │
│  Connexion LDAP        [Toggle ON/OFF]                 │
│  (liste dynamique des flags présents en DB)            │
├────────────────────────────────────────────────────────┤
│ Card "Sécurité"                                        │
│  Durée session JWT (heures)  [8___]                    │
│  Max tentatives login        [5___]                    │
│  Fenêtre blocage (minutes)   [15__]                    │
└────────────────────────────────────────────────────────┘
```

**Bouton Sauvegarder** :
- Envoie `PATCH /api/admin/config/batch` avec l'ensemble des clés modifiées
- Toast `success` « Paramètres sauvegardés » · Toast `error` en cas d'échec

**Champs SMTP** :
- Mot de passe masqué par défaut (`type="password"`)
- Toggle visibilité `[👁]` → `type="text"` temporairement
- Placeholder « •••••••• » (write-only, jamais retourné par l'API)

**Feature Flags** :
- Chaque flag est un `Toggle` avec libellé + description courte
- Rendu dynamique selon les clés retournées par `GET /api/admin/config`

**Validation** :
- `smtpPort` : entier 1–65535
- `jwtSessionDuration` : entier 1–720 (heures)
- `maxLoginAttempts` : entier 1–20

**Mobile** : Sections empilées, bouton Sauvegarder sticky en bas.

**Liens depuis S-26** : ← Retour Administration

---

## 15. Paramètres RH

---

### S-35 · `/hr/settings` — Paramètres RH

**Accessible à** : hr (écriture) · admin (lecture seule)

**Fil d'Ariane** : Accueil › Paramètres RH

**Page title** : « Paramètres RH »

**Layout** :
```
[H1: Paramètres RH]                              [Sauvegarder]

┌────────────────────────────────────────────────────────┐
│ Card "Campagnes — Rappels automatiques"                 │
│  Rappels J-3 actifs    [Toggle ON/OFF]                 │
│  Délai avant expiration (jours après endDate)  [30___] │
├────────────────────────────────────────────────────────┤
│ Card "Contexte N-1 — Valeurs par défaut"               │
│  Activer N-1 sur nouvelles campagnes  [Toggle ON/OFF]  │
│  Visible par l'employé par défaut     [Toggle ON/OFF]  │
├────────────────────────────────────────────────────────┤
│ Card "Exports"                                         │
│  [⬇ Exporter le journal d'audit (CSV)] (Secondary)    │
│  Déclenche : GET /api/admin/audit?format=csv           │
└────────────────────────────────────────────────────────┘
```

**Bouton Sauvegarder** :
- Envoie `PATCH /api/admin/config/batch` avec les préférences RH
- Toast `success` « Préférences RH sauvegardées » · Toast `error` en cas d'échec

**Section Rappels groupés** :
```
┌────────────────────────────────────────────────────────┐
│ Card "Rappels groupés"                                 │
│  Filtre campagne active  [Select ▼ — campagnes active] │
│  [Envoyer un rappel groupé] (Primary)                  │
│   → POST /api/hr/notifications/bulk-remind             │
│   → Body : { campaignId, message? }                    │
└────────────────────────────────────────────────────────┘
```

**Comportement rappels groupés** :
- Sélecteur filtrant uniquement les campagnes `active`
- Bouton désactivé si aucune campagne sélectionnée
- Confirmation Modal avant envoi : « Envoyer un rappel à tous les évaluateurs non soumis de [campagne] ? »
- Toast `success` « Rappels envoyés à N personnes » · Toast `error` en cas d'échec

**Admin en lecture** : Tous les champs sont `disabled` + bannière `info` « Vue lecture seule — réservée aux RH »

**Mobile** : Sections empilées, bouton Sauvegarder sticky en bas.

**Section Secteurs organisationnels** :
```
┌────────────────────────────────────────────────────────┐
│ Card "Secteurs organisationnels"                       │
│                                                        │
│  ● [●] R&D          12 users  [✏️] [🗑️]              │
│  ● [●] Finance       8 users  [✏️] [🗑️]              │
│  ● [●] Commercial   15 users  [✏️] [🗑️]              │
│                                                        │
│  [+ Ajouter un secteur]                                │
└────────────────────────────────────────────────────────┘
```

**Modal Nouveau / Modifier secteur** :
- Champ `Nom*`
- Color picker `Couleur` (swatch palette + hex input)
- Champ `Description` (optionnel)
- [Annuler] [Enregistrer]

**Comportement** :
- Suppression impossible si le secteur a des utilisateurs → message d'erreur inline
- Même endpoints que depuis l'organigramme (S-39) :
  - `GET /api/org/sectors`
  - `POST /api/org/sectors`
  - `PATCH /api/org/sectors/:id`
  - `DELETE /api/org/sectors/:id`

---

## 16. Administration — Templates de mail

---

### S-36 · `/admin/mail-templates` — Gestion des templates de mail

**Accessible à** : admin (écriture) · hr (lecture seule)

**Fil d'Ariane** : Administration › Templates de mail

**Layout — liste** :
```
[H1: Templates de mail]

[DataTable]
Colonnes : Slug | Sujet | Variables | Dernière modif. | Actions
[Ligne: evaluationAssigned | "Nouvelle évaluation..." | firstName,campaignName | 01/05/2026 | [✏️ Modifier]]
...
(7 templates listés)
```

**Layout — éditeur (slide-over)** :
```
─── Modifier le template ───
Slug :   [evaluationAssigned]  (read-only)
Sujet :  [____________________________]
Variables disponibles : firstName · campaignName · evaluatorName · etc.

[Corps (texte)]
┌──────────────────────────────────────────┐
│ textarea monospace                       │
│ Utilise {{ variable }} pour insérer      │
└──────────────────────────────────────────┘

[Corps (HTML)] (optionnel)
┌──────────────────────────────────────────┐
│ textarea monospace                       │
└──────────────────────────────────────────┘

[Prévisualisation →]  (panel remplaçant les variables par des exemples)

[Réinitialiser aux valeurs par défaut]  (Secondary/Danger)
[Annuler]  [Sauvegarder]
```

**Comportement** :
- hr : formulaire entièrement `disabled` + bannière `info` « Vue lecture seule »
- Validation : sujet requis, corps texte requis
- Toast `success` / `error` après sauvegarde
- « Réinitialiser aux valeurs par défaut » → modal de confirmation → `PATCH /api/admin/mail-templates/:slug` avec `{ reset: true }`

**Endpoints** :
- `GET /api/admin/mail-templates` → liste tous les templates
- `PATCH /api/admin/mail-templates/:slug` → `{ subject, bodyText, bodyHtml? }` ou `{ reset: true }`

---

## 17. RH — Demandes collaborateurs

---

### S-38 · `/hr/flags` — Dashboard demandes RH

**Accessible à** : admin · hr

**Fil d'Ariane** : RH › Demandes collaborateurs

**Layout** :
```
[H1: Demandes collaborateurs]

[FilterBar]
Type    : [Toutes ▼]  [Mobilité | Augmentation | Promotion | Formation]
Statut  : [Tous ▼]   [Nouveau | En traitement | Traité]
Période : [date range picker]
Département : [Tous ▼]
Secteur : [Tous ▼]

[DataTable]
Colonnes : Employé | Type | Date soumission | Campagne | Statut | Actions
[Badge statut coloré : new=blue · in_progress=orange · treated=green]

[Clic sur ligne → panneau latéral S-38-P1]
```

**Panneau latéral — détail d'une demande (S-38-P1)** :
```
[Nom de l'employé]  [Type de demande — badge]
Date : xx/xx/xxxx
Campagne : [nom campagne ou "—"]
─────────────────────────────────
Réponses au formulaire :
  Q1 : ...
  Q2 : ...
─────────────────────────────────
Statut actuel : [Select ▼]
  • Nouveau
  • En traitement
  • Traité

Note interne :
[textarea]

[Annuler]  [Mettre à jour]

[Voir l'évaluation complète →]  (lien /evaluations/:id)
```

**Comportement** :
- Mise à jour `PATCH /api/hr/flags/:evalId/status` → `{ status, note }` → rafraîchissement de la liste
- Badge rouge sur l'icône nav si nombre de demandes `new` > 0

**Endpoints** :
- `GET /api/hr/flags?type=...&status=...&from=...&to=...&department=...&sector=...`
- `PATCH /api/hr/flags/:evalId/status` → `{ status: 'new'|'in_progress'|'treated', note: '...' }`

---

## 18. Organisation

---

### S-39 · `/admin/orgchart` — Organigramme

**Accessible à** : admin, hr

**Fil d'Ariane** : Administration › Organigramme

**3 vues (tabs en haut)** :
1. **Tout** (`view=all`) — arbre complet, racines = users sans `managerId`, tous rôles confondus
2. **Équipes** (`view=teams`) — regroupé par manager direct ; chaque nœud manager = carte avec compteur équipe
3. **Secteur** (`view=sector`) — chaque secteur = groupe coloré, utilisateurs assignés dedans ; section « Non assigné » en bas

**Layout** :
```
[Onglets: 🏢 Tout | 👥 Équipes | 🗂 Secteur]    [Recherche user ____]  [+ Nouveau secteur]

[Arbre SVG / D3 — collapsible — branches/feuilles]

[Panneau latéral (slide-over) quand un nœud est sélectionné]
```

**Nœud dans l'arbre** :
- Avatar + Nom + Rôle (badge coloré) + Département
- Badge secteur (couleur du secteur)
- Compteur rapports directs (si manager/director)
- Badge orange si `managerId = null` ET rôle ∉ `['admin','hr']` (sans N+1 défini)
- Bouton `-` / `+` pour replier/déplier la branche

**Interactions** :
- Clic sur nœud → panneau latéral s'ouvre (S-39-P1)
- Drag & drop d'un nœud sous un autre → dialog confirmation « Changer le manager de [Nom] pour [Nouveau manager] ? » → `PATCH /api/org/users/:id`
- Sélection multiple (checkbox sur les nœuds) → bouton « Assigner au secteur » (batch)

**Panneau latéral S-39-P1** :
```
[Avatar L]  [Prénom Nom]
            [Rôle] · [Département] · [Secteur]
            Manager : [Nom du N+1 ou "—"]
            Rapports directs : N
────────────────────────────────────
[Changer le rôle      ▼]
[Changer le secteur   ▼]
[Voir ses évaluations →]
[Créer une campagne pour ce secteur →]  (si secteur défini)
```
- Changer rôle → `PATCH /api/org/users/:id { role }`
- Changer secteur → `PATCH /api/org/users/:id { sectorId }`

**Vue Secteur — gestion secteurs** :
- Chaque secteur = card avec sa couleur + nom + nb users + boutons [✏️] [🗑️]
- Bouton « + Nouveau secteur » → modal inline : nom + couleur (color picker) + description
- Drag & drop d'un user d'un secteur à un autre

**Endpoints** :
| Méthode | URL | Usage |
|---|---|---|
| `GET` | `/api/org/tree?view=all\|teams\|sector` | Données de l'arbre |
| `PATCH` | `/api/org/users/:id` | managerId, sectorId, role |
| `GET` | `/api/org/sectors` | Liste des secteurs |
| `POST` | `/api/org/sectors` | Créer un secteur |
| `PATCH` | `/api/org/sectors/:id` | Modifier un secteur |
| `DELETE` | `/api/org/sectors/:id` | Supprimer un secteur |

**Mobile** : Arbre remplacé par une liste hiérarchique repliable (accordéon). Panneau latéral = bottom-sheet.

---

### S-40 · `/admin/users/import` — Import utilisateurs

**Accessible à** : admin, hr

**Fil d'Ariane** : Administration › Utilisateurs › Import

**Layout** :
```
[H1: Import utilisateurs]

┌────────────────────────────────────────────────────────┐
│        [Illustration Upload SVG 80px]                  │
│   Glissez un fichier CSV ou JSON ici                   │
│        [ou cliquez pour parcourir]                     │
└────────────────────────────────────────────────────────┘
[⬇ Télécharger le template CSV]

[Si fichier chargé → Tableau aperçu]
┌───────────────────────────────────────────────────────────────────────────┐
│ PRÉNOM  │ NOM   │ EMAIL          │ RÔLE     │ DÉPARTEMENT │ MANAGER │ SECTEUR│
├───────────────────────────────────────────────────────────────────────────┤
│ Jean    │ Dupont│ j.dupont@…     │ employee │ R&D         │ -       │ Tech   │
│ [fond rouge — email invalide]  ⚠ "Email déjà existant"                   │
└───────────────────────────────────────────────────────────────────────────┘

[Mode simulation ☑]

[Lancer l'import]   (Primary)

[Résultats : ✅ N créés · 🔄 M mis à jour · ⚠️ P erreurs]
[Voir les utilisateurs créés →]
```

**Comportement** :
- CSV (séparateur `;` ou `,` auto-détecté) ou JSON array
- Mode simulation (`dryRun=true`) : preview sans modification réelle
- Upsert par email
- Erreurs non bloquantes : ligne en erreur signalée (fond rouge + tooltip), les autres passent
- Post-import : lien « Voir les utilisateurs créés → » (filtre `/admin/users?source=import`)

**Colonnes CSV/JSON** : `firstName` · `lastName` · `email`* · `role` · `department` · `managerEmail` · `sector`

**Endpoint** : `POST /api/users/import?dryRun=true|false`

**Mobile** : Formulaire 1 col, tableau en scroll horizontal.

---

### S-41 · `/admin/forms/import` — Import formulaire JSON

**Accessible à** : admin, hr

**Fil d'Ariane** : Administration › Formulaires › Import JSON

**Layout** :
```
[H1: Import formulaire JSON]

[Onglets : 📁 Fichier | 📋 Coller JSON]

[Onglet Fichier]
┌────────────────────────────────────────────────────────┐
│        [Illustration Upload SVG 80px]                  │
│   Glissez un fichier JSON ici                          │
│        [ou cliquez pour parcourir]                     │
└────────────────────────────────────────────────────────┘

[Onglet Coller JSON]
┌────────────────────────────────────────────────────────┐
│  {                                                     │
│    "title": "...",                                     │
│    "formType": "...",                                  │
│    ...                                                 │
│  }                                 [Textarea monospace]│
└────────────────────────────────────────────────────────┘

[⬇ Télécharger le template JSON]   [Valider]

[Si valide → Aperçu]
┌────────────────────────────────────────────────────────┐
│ ✅ JSON valide                                         │
│ Titre : "Évaluation annuelle 2025"                     │
│ Type  : self_evaluation                                │
│ Questions : 12                                         │
└────────────────────────────────────────────────────────┘
[Importer]   (Primary)

[Si erreurs]
⚠ Erreurs de validation :
  • question[2].type : valeur inconnue "unknown_type"
  • questions[5].id : dupliqué (déjà utilisé en position 2)
```

**Comportement** :
- Validation complète : types de questions, options, IDs uniques, `formType` valide
- Aperçu avant confirmation (titre, type, nb de questions)
- Post-import → redirige vers S-15 `/forms/:id`
- Bouton « ⬇ Télécharger le template JSON » → `GET /api/forms/template`

**Endpoints** :
| Méthode | URL | Usage |
|---|---|---|
| `POST` | `/api/forms/import` | Import du formulaire |
| `GET` | `/api/forms/template` | Téléchargement du template JSON vide |

**Mobile** : Onglets en pleine largeur, textarea réduit (12 lignes).

---

| ID | Écran | Titre | Action | Type |
|---|---|---|---|---|
| S-04-M1 | `/users` | Confirmer la suppression | DELETE user | Danger |
| S-06-M1 | `/users/:id` | Prévisualisation offboard | Déclenche offboarding | Warning |
| S-06-M2 | `/users/:id` | Anonymiser les données | GDPR anonymize | Danger + saisie |
| S-10-M1 | `/campaigns/new` | — | Mot de passe temporaire | Info |
| S-11-M1 | `/campaigns/:id` | Cloner la campagne | POST clone | Primary |
| S-11-M2 | `/campaigns/:id` | Supprimer la campagne | DELETE campaign | Danger + saisie |
| S-15-M1 | `/forms/:id` | Supprimer le formulaire | DELETE form | Danger |
| S-17-M1 | `/evaluations/:id` | Confirmer la soumission | submit transition | Primary |
| S-24-M1 | `/offboarding/:id` | Supprimer la demande | DELETE offboarding | Danger |
| S-27-M1 | `/admin/config` | Email de test | POST email/test | Info |
| S-27-M2 | `/admin/config` | Créer/modifier une clé | PUT config | Primary |
| S-35-M1 | `/hr/settings` | Confirmer rappel groupé | POST bulk-remind | Warning |

---

## Annexe B — Récapitulatif des routes

| # | Route | Écran | Rôles |
|---|---|---|---|
| S-01 | `/login` | Connexion | Public |
| S-02 | `/login/ldap` | Connexion LDAP | Public |
| S-03 | `/` | Tableau de bord | Tous |
| S-04 | `/users` | Liste utilisateurs | admin, hr, director, manager |
| S-05 | `/users/new` | Créer utilisateur | admin, hr |
| S-06 | `/users/:id` | Profil utilisateur | admin, hr, director, manager, self |
| S-07 | `/users/:id/edit` | Modifier utilisateur | admin, hr, self (limité) |
| S-08 | `/users/:id/offboarding` | Redirect offboarding | admin, hr |
| S-09 | `/campaigns` | Liste campagnes | Tous |
| S-10 | `/campaigns/new` | Créer campagne | admin, hr |
| S-10b | `/campaigns/:id/edit` | Modifier campagne | admin, hr |
| S-11 | `/campaigns/:id` | Détail campagne | Tous |
| S-12 | `/campaigns/:id/analytics` | Analytique campagne | admin, hr |
| S-13 | `/forms` | Bibliothèque formulaires | Tous |
| S-14 | `/forms/new` | Créer formulaire | admin, hr |
| S-15 | `/forms/:id` | Éditer formulaire | admin, hr (écriture) · tous (lecture) |
| S-16 | `/evaluations` | Liste évaluations | Tous (scopé) |
| S-17 | `/evaluations/:id` | Évaluation (4 modes) | Tous (scopé) |
| S-18 | `/evaluations/history` | Historique évaluations | Tous |
| S-19 | `/events` | Calendrier | Tous |
| S-20 | `/events/:id` | Détail événement | Tous |
| S-21 | `/resources` | Bibliothèque ressources | Tous |
| S-22 | `/resources/:id` | Détail ressource | Tous |
| S-23 | `/offboarding` | Liste offboardings | admin, hr |
| S-24 | `/offboarding/:id` | Dossier offboarding | admin, hr |
| S-25 | `/analytics` | Dashboard analytique | admin, hr |
| S-26 | `/admin` | Hub administration | admin |
| S-27 | `/admin/config` | Configuration système | admin |
| S-28 | `/admin/ldap` | Configuration LDAP | admin |
| S-29 | `/admin/audit` | Journal d'audit | admin, hr |
| S-30 | `/admin/users` | Gestion avancée RGPD | admin |
| S-31 | `/profile` | Mon profil | Tous |
| S-32 | `/profile/preferences` | Mes préférences | Tous |
| S-33 | `/onboarding` | Flux onboarding | Tous (si non complété) |
| S-34 | `/admin/settings` | Paramètres système | admin |
| S-35 | `/hr/settings` | Paramètres RH | hr (écriture) · admin (lecture) |
| S-36 | `/admin/mail-templates` | Templates de mail | admin (écriture) · hr (lecture) |
| S-38 | `/hr/flags` | Demandes collaborateurs | admin, hr |
| S-39 | `/admin/orgchart` | Organigramme | admin, hr |
| S-40 | `/admin/users/import` | Import utilisateurs | admin, hr |
| S-41 | `/admin/forms/import` | Import formulaire JSON | admin, hr |

---

## Annexe C — Patterns de navigation navbar

**Desktop (≥ 1024px)** — Liens centrés visibles :

| Lien | Icône | Rôles qui le voient |
|---|---|---|
| Tableau de bord | `LayoutDashboard` | Tous |
| Collaborateurs | `Users` | admin, hr, director, manager |
| Campagnes | `BarChart2` | Tous |
| Évaluations | `ClipboardList` | Tous |
| Calendrier | `Calendar` | Tous |
| Ressources | `BookOpen` | Tous |
| Offboarding | `LogOut` | admin, hr |
| Analytique | `PieChart` | admin, hr |
| Administration | `Settings` | admin |

**Dropdown utilisateur** (droite) : Avatar md + Prénom → Mon profil · Préférences · Déconnexion

**Mobile (< 1024px)** : Hamburger `Menu` → Drawer plein écran (bg white, z-50) avec tous les liens + section utilisateur en bas.

**Indicateur route active** : `border-b-2 border-primary-500 text-primary-700 font-semibold`
