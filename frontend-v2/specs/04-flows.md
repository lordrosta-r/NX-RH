# NX-RH — Flux UX & Patterns d'interaction (Frontend v2)

> **Auteur** : Architecte UX · **Version** : 1.1 · **Date** : 2025
> Stack : React 18 + Vite + TypeScript + Tailwind CSS · Couleur primaire : `#17A8D4`
>
> **Flows couverts** : Flux 1–10 (Batch A) · F-NEW-01–09 (Batch B)

---

## 1. Architecture de navigation

### 1.1 Structure de la barre de navigation (Navbar top fixe)

La navbar est fixe en haut (`position: fixed; top: 0; z-index: 50`), fond blanc (`surface-navbar`), ombre légère (`shadow-sm`), hauteur **64px** sur desktop, **56px** sur mobile. Elle s'adapte au rôle de l'utilisateur connecté.

#### Zones de la navbar

```
┌─────────────────────────────────────────────────────────────────┐
│  [Logo NX-RH]     [Liens de navigation centrés/gauche]   [🔔][Avatar ▾] │
└─────────────────────────────────────────────────────────────────┘
```

- **Zone gauche** : Logo `NX-RH` (wordmark complet), cliquable → `/`
- **Zone centrale** : Liens de navigation (cachés sur mobile)
- **Zone droite** : Cloche notifications + Avatar utilisateur (avec menu déroulant)

---

#### Navbar — Rôle `admin`

```
NX-RH | Tableau de bord | Utilisateurs | Campagnes | Formulaires | Évaluations | Calendrier | Ressources | Analytics | Admin ▾ |  🔔  | [Avatar] ▾
```

| Lien | Route | Dropdown |
|------|-------|----------|
| Tableau de bord | `/` | — |
| Utilisateurs | `/users` | — |
| Campagnes | `/campaigns` | — |
| Formulaires | `/forms` | — |
| Évaluations | `/evaluations` | Mes évaluations · Toutes · Créer en masse · Historique |
| Calendrier | `/calendar` | — |
| Ressources | `/resources` | — |
| Analytics | `/analytics` | — |
| Admin ▾ | — | Configuration · LDAP · Journal d'audit · Email de test |

---

#### Navbar — Rôle `hr`

```
NX-RH | Tableau de bord | Utilisateurs | Campagnes | Formulaires | Évaluations | Offboarding | Calendrier | Ressources | Analytics |  🔔  | [Avatar] ▾
```

| Lien | Route |
|------|-------|
| Tableau de bord | `/` |
| Utilisateurs | `/users` |
| Campagnes | `/campaigns` |
| Formulaires | `/forms` |
| Évaluations ▾ | Toutes · Créer · Créer en masse · Historique · Audit |
| Offboarding | `/offboarding` |
| Calendrier | `/calendar` |
| Ressources | `/resources` |
| Analytics | `/analytics` |

---

#### Navbar — Rôle `director`

```
NX-RH | Tableau de bord | Évaluations | Mon Équipe | Calendrier | Ressources |  🔔  | [Avatar] ▾
```

| Lien | Route |
|------|-------|
| Tableau de bord | `/` |
| Évaluations ▾ | Mes évaluations · Mon équipe · Historique |
| Mon Équipe | `/users` (périmètre limité) |
| Calendrier | `/calendar` |
| Ressources | `/resources` |

---

#### Navbar — Rôle `manager`

```
NX-RH | Tableau de bord | Mes Évaluations | Mon Équipe | Calendrier | Ressources |  🔔  | [Avatar] ▾
```

| Lien | Route |
|------|-------|
| Tableau de bord | `/` |
| Mes Évaluations ▾ | À traiter · Historique |
| Mon Équipe | `/users` (subordonnés directs uniquement) |
| Calendrier | `/calendar` |
| Ressources | `/resources` |

---

#### Navbar — Rôle `employee`

```
NX-RH | Tableau de bord | Mes Évaluations | Calendrier | Ressources |  🔔  | [Avatar] ▾
```

| Lien | Route |
|------|-------|
| Tableau de bord | `/` |
| Mes Évaluations ▾ | En cours · Historique |
| Calendrier | `/calendar` |
| Ressources | `/resources` |

---

#### Menu Avatar (tous les rôles)

Clic sur l'avatar → popover dropdown :
```
┌──────────────────────┐
│  Prénom Nom          │
│  role@email.com      │
├──────────────────────┤
│  👤 Mon Profil        │
│  ⚙️  Préférences      │
│  📥 Export RGPD      │
├──────────────────────┤
│  🚪 Déconnexion      │
└──────────────────────┘
```

---

### 1.2 Règles des Fils d'Ariane (Breadcrumbs)

- **Affichage** : toujours présent sur les pages de niveau ≥ 2 (jamais sur le dashboard ni `/login`)
- **Position** : sous la navbar, en haut du contenu de la page (`mt-4 mb-6`)
- **Format** : `Accueil / Section / Sous-section / Page courante`
- **Style** : items intermédiaires = liens `text-primary-600 hover:underline` ; dernier item = texte `text-slate-500 font-medium` (non cliquable)
- **Séparateur** : `/` en `text-slate-300`

**Exemples :**
```
Accueil / Campagnes / Campagne Q4 2024 / Analytique
Accueil / Évaluations / Entretien annuel – Alice Dupont
Accueil / Utilisateurs / Alice Dupont / Onboarding
Accueil / Administration / LDAP
```

---

### 1.3 Menus déroulants — Comportement

- **Déclenchement** : clic (pas hover) sur le lien avec chevron `▾`
- **Fermeture** : clic extérieur (outside click), Échap, ou clic sur un item
- **Animation** : `opacity 0→1` + `translateY -4px→0` en `150ms ease-out`
- **Style** : fond blanc, `shadow-lg`, `rounded-xl`, bordure `slate-200`, `z-40`
- **Item actif** : fond `primary-50`, texte `primary-700`
- **Item hover** : fond `slate-50`

---

## 2. Flux utilisateur critiques

---

### Flux 1 — Connexion

**Déclencheur** : Accès à l'application non authentifiée → redirection automatique vers `/login`

**Étapes — Connexion standard :**
1. L'utilisateur arrive sur `/login` (page publique, fond `slate-50`, card centrée)
2. Saisie de l'**email** et du **mot de passe** dans le formulaire
3. Option "Se souvenir de moi" (cochée = 30 jours, décochée = 8 h)
4. Clic sur **"Se connecter"** → bouton passe en état `loading` (spinner)
5. `POST /api/auth/login` — succès : cookie `httpOnly` JWT créé
6. `GET /api/auth/me` pour charger le profil complet
7. Redirection vers `returnUrl` (si présente) ou `/` (dashboard)

**Connexion LDAP :**
- Lien "Connexion LDAP / SSO" sous le formulaire standard
- Redirige vers la page `/login/ldap` : saisie du DN ou identifiant LDAP
- Flux d'authentification géré côté serveur, retour sur `/` après succès

**⚠ Points de décision :**
- `authSource=ldap` → formulaire LDAP ; `authSource=local` → formulaire standard
- `isActive=false` → message d'erreur "Compte désactivé — contactez votre administrateur"
- 5 tentatives échouées en 15 min → message "Trop de tentatives. Réessayez dans X minutes"

**État d'erreur :**
- Identifiants invalides → alerte inline `error-50/error-600` : "Email ou mot de passe incorrect"
- Compte inactif → alerte distincte avec mention de contacter le support

**Session expirée :**
1. Requête API renvoie `401` → intercepteur Axios/fetch déclenche le flux de déconnexion
2. `returnUrl = window.location.pathname + search` stocké en `sessionStorage`
3. Redirection vers `/login?returnUrl=...`
4. Après connexion réussie → redirection automatique vers `returnUrl`

---

### Flux 2 — Création d'une campagne (admin / hr)

**Déclencheur** : Clic sur **"Nouvelle campagne"** depuis `/campaigns`

**Étapes — Création en brouillon :**
1. Clic sur le bouton **"+ Nouvelle campagne"** (bouton `primary` en haut à droite)
2. Ouverture de `/campaigns/new` (page dédiée, pas une modale)
3. Remplissage du formulaire : nom, description, dates de début/fin, deadlines employé/manager, départements ciblés, visibilité étendue (toggle)
4. Validation côté client (date fin > date début, champs obligatoires)
5. Clic **"Enregistrer en brouillon"** → `POST /api/campaigns` avec `status: 'draft'`
6. Succès → toast "Campagne créée" + redirection vers `/campaigns/:id`

**Étapes — Passage de brouillon à actif :**
1. Sur `/campaigns/:id`, statut affiché `BROUILLON` (badge `warning-500`)
2. Bouton **"Lancer la campagne"** visible uniquement si `status === 'draft'`
3. Clic → modale de confirmation : "Lancer la campagne envoie des notifications aux utilisateurs des départements ciblés. Confirmer ?"
4. Confirmation → `PATCH /api/campaigns/:id` avec `status: 'active'`
5. Succès → badge passe à `ACTIVE` (`success-500`), notification `campaignLaunch` envoyée
6. _(Automatique, côté serveur)_ Génération automatique des évaluations via `targetScope` : pour chaque utilisateur ciblé × chaque formulaire de la campagne, une `Evaluation` est créée (statut `assigned`) en upsert — l'opération est fire-and-forget et n'impacte pas la réponse HTTP.

**Clonage d'une campagne :**
1. Sur `/campaigns/:id` ou depuis la liste → icône/bouton **"Cloner"**
2. Modale : "Cette campagne sera dupliquée avec les formulaires associés. Les dates seront décalées d'un an. Confirmer ?"
3. `POST /api/campaigns/:id/clone`
4. Succès → redirection vers le brouillon cloné `/campaigns/:newId` avec toast "Campagne clonée"

**État d'erreur :**
- Date de fin antérieure → message de validation inline sous le champ
- Erreur réseau → toast `error` avec bouton "Réessayer"

---

### Flux 3 — Gestion d'un formulaire d'évaluation

**Déclencheur** : Clic sur **"+ Nouveau formulaire"** depuis `/forms`

**Étapes — Création :**
1. Formulaire de base : titre, description, type (`self_evaluation`, `manager_evaluation`…), campagne associée (optionnel)
2. `POST /api/forms` → redirection vers l'éditeur `/forms/:id`
3. **FormBuilder** : interface glisser-déposer de questions

**Ajout de questions :**
- Bouton **"+ Ajouter une question"** → popover de sélection du type :
  - `rating` → échelle 1–10, icônes étoiles
  - `text` → zone texte libre
  - `yes_no` → radio Oui / Non
  - `choice` → liste d'options (ajout dynamique d'options)
  - `weather` → météo (4 icônes)
  - `mobility` → question de mobilité
  - `n1_import` → import d'objectifs N+1
- Chaque question : champ "libellé", "phase" (`self`, `n-1`, `objectives`…), toggle "Obligatoire"
- Réorganisation par glisser-déposer ; suppression par icône corbeille avec confirmation inline

**Formulaire gelé (`frozenAt`) :**
- Si `frozenAt` est renseigné → badge **"Gelé"** orange en haut du formulaire
- Tentative de modification des questions → **modale d'information** (pas d'erreur silencieuse) :
  > "Ce formulaire est gelé car des évaluations ont déjà été créées sur sa base. Les questions ne peuvent plus être modifiées. Seuls le titre et la description restent éditables."
- Boutons de suppression/ajout de questions désactivés (`disabled`, `cursor-not-allowed`, `opacity-50`)
- Titre et description : toujours éditables malgré le gel

**Suppression d'un formulaire :**
1. Bouton **"Supprimer"** (variante `danger`) sur la page `/forms/:id`
2. Modale de confirmation : "Supprimer ce formulaire est irréversible. Cette action est impossible si des évaluations existent."
3. `DELETE /api/forms/:id`
4. Si `frozenAt` → erreur 409 → message inline "Impossible de supprimer : des évaluations utilisent ce formulaire"
5. Succès → redirection vers `/forms` + toast "Formulaire supprimé"

---

### Flux 4 — Processus complet d'évaluation (flux central)

**Déclencheur** : HR crée des évaluations en masse depuis `/evaluations/bulk`

#### Étape A — Création en masse (HR)
1. Accès à `/evaluations/bulk` (admin/hr uniquement)
2. Sélection de la campagne, du formulaire, des couples évaluateur/évalué (import CSV ou sélection manuelle)
3. Aperçu du nombre d'évaluations à créer (max 500 par batch)
4. Clic **"Créer les évaluations"** → `POST /api/evaluations/bulk`
5. Résumé du résultat : `{ succès: N, doublons ignorés: M, erreurs: K }`
6. Les formulaires associés sont automatiquement gelés (`frozenAt`)
7. Notification `evaluationAssigned` envoyée aux évalués

#### Étape B — L'employé remplit son évaluation
1. Employé reçoit notification → clic → `/evaluations/:id`
2. Page divisée en phases (tabs ou sections accordéon) : Auto-évaluation · Objectifs · Aspirations
3. Sauvegarde automatique toutes les 30s (debounce) + bouton **"Sauvegarder"** manuel
4. Indicateur `lastSavedAt` : "Dernière sauvegarde il y a 2 minutes"
5. Premier enregistrement : statut `assigned → in_progress` (automatique)
6. Clic **"Soumettre"** → modale : "Une fois soumise, vous ne pourrez plus modifier vos réponses."
7. Confirmation → `PATCH /api/evaluations/:id` avec `status: 'submitted'`
8. Notification `evaluationSubmitted` envoyée au manager

#### Étape C — Le manager passe en revue
1. Manager voit l'évaluation en statut `submitted` dans son tableau de bord / liste filtrée
2. Accès à `/evaluations/:id` en mode lecture des réponses + sections réservées au manager
3. Saisie du **score** (1–10) et du **commentaire reviewer**
4. Définition des **objectifs N+1** (section dédiée)
5. Clic **"Valider la revue"** → `PATCH` avec `status: 'reviewed'`
6. Notification `managerActionRequired` envoyée à l'évalué

#### Étape D — Signatures (indicateur de progression)

Indicateur visuel de progression en haut de la page d'évaluation :

```
  [ Soumis ✓ ] ──► [ Revu ✓ ] ──► [ Signé (évalué) ] ──► [ Signé (manager) ] ──► [ Signé (RH) ] ──► [ Validé ]
```

- Étapes passées : icône ✓ `success-500`, fond `success-50`
- Étape courante : cercle `primary-500` pulsant
- Étapes futures : cercle `slate-300`

**Signature de l'évalué :**
1. Statut `reviewed` → bouton **"Signer mon évaluation"** visible pour l'évalué
2. Possibilité d'ajouter un `evaluateeComment` et de lever un `disagreementFlag` (toggle "Je conteste ce bilan")
3. Confirmation → `PATCH` avec `status: 'signed_evaluatee'`

**Signature du manager :**
1. Statut `signed_evaluatee` → bouton **"Contresigner"** visible pour le manager
2. `PATCH` avec `status: 'signed_manager'`

**Signature RH :**
1. Statut `signed_manager` (ou `reviewed` / `signed_evaluatee` selon disponibilité) → bouton **"Valider et signer (RH)"**
2. HR peut signer depuis `/evaluations` en actions bulk (`sign_hr` sur sélection multiple)
3. `PATCH` avec `status: 'signed_hr'`

**Validation finale :**
1. Statut `signed_hr` → bouton **"Valider définitivement"** (admin/hr)
2. `PATCH` avec `status: 'validated'`
3. Badge vert **VALIDÉ**, PDF téléchargeable à tout moment

**PDF :**
- Bouton **"Télécharger le PDF"** disponible dès `reviewed`
- Disponible pour : évaluateur, évalué, admin, hr
- `GET /api/evaluations/:id/pdf` → téléchargement direct

---

### Flux 5 — Onboarding d'un nouvel utilisateur

**Déclencheur** : Admin/HR crée un utilisateur depuis `/users/new`

1. Formulaire de création : prénom, nom, email, rôle, département, poste, manager assigné
2. `POST /api/users` → mot de passe temporaire généré et affiché **une seule fois** dans une modale
   > Modale : "Mot de passe temporaire : **XXXX-YYYY**. Copiez-le et communiquez-le à l'employé. Il ne sera plus affiché."
3. Bouton **"Copier"** dans la modale ; fermeture → `/users/:id`
4. L'utilisateur se connecte avec ses credentials → invite à changer son mot de passe (si configuré)

**Checklist d'onboarding (sur `/users/:id` onglet "Onboarding") :**

Progression visuelle : `X / 5 étapes complétées` (barre de progression `primary-500`)

```
☐  Profil complété
☐  Photo ajoutée
☐  Présentation à l'équipe
☐  Accès systèmes vérifiés
☐  Premier entretien planifié
```

- Chaque item cochable par l'employé lui-même ou par admin/hr
- Coche → `PATCH /api/users/:id/onboarding/:stepIndex`
- Animation de coche : ✓ `success-500` avec transition `scale 0→1` (200ms)

**Complétion de l'onboarding :**
- Dernier item coché → suggestion automatique : "Toutes les étapes sont complètes. Marquer l'onboarding comme terminé ?"
- Bouton **"Terminer l'onboarding"** → `PATCH /api/users/:id/onboarding/complete`
- Badge "Onboarding terminé" `success-50/success-600` affiché sur la fiche

---

### Flux 6 — Processus d'offboarding

**Déclencheur** : HR accède à `/offboarding/new` ou depuis la fiche d'un utilisateur

1. Sélection de l'employé concerné (champ de recherche autocomplete)
2. Aperçu de l'impact : `GET /api/users/:id/offboard-preview`
   - Affichage : "X évaluations en cours · Campagnes concernées : [liste]"
3. Choix du motif : `resignation` · `termination` · `retirement` · `other`
4. Saisie de la **date de dernier jour** et notes éventuelles
5. Clic **"Créer la demande de départ"** → `POST /api/offboarding`
6. `PATCH /api/users/:id/offboard` → archive automatiquement les évaluations non terminées
7. Redirection vers `/offboarding/:id`

**Gestion de la checklist :**

Statut initial : `pending` → `in_progress` au premier item coché

```
☐  Révocation accès systèmes
☐  Récupération matériel
☐  Archivage évaluations    ← coché automatiquement si offboard déclenché
☐  Solde de tout compte
☐  Entretien de départ (optionnel)
```

- Chaque item : `PATCH /api/offboarding/:id/checklist/:itemIndex` avec `done: true`
- Affichage : date de complétion + agent RH ayant coché

**Complétion de l'offboarding :**
1. Tous les items cochés → bouton **"Clôturer le départ"** devient actif
2. Clic → modale de confirmation avec **résumé** :
   > "Résumé du départ de [Prénom Nom] · Motif : Démission · Dernier jour : [date] · Évaluations archivées : X · Le compte sera désactivé."
3. Confirmation → `PATCH /api/offboarding/:id` avec `status: 'completed'`
4. Effets en cascade : `user.isActive=false`, `archivedAt=now`
5. Badge **DÉPART CLÔTURÉ** `error-50/error-600`

---

### Flux 7 — Accès à une ressource documentaire

**Déclencheur** : Employé clique sur "Ressources" dans la navbar

1. Arrivée sur `/resources` — grille de cards filtrée selon le rôle (`published` + `visibleTo` inclut le rôle)
2. Filtres disponibles : type (`pdf`, `xlsx`, `docx`, `pptx`), texte libre (recherche sur titre/description)
3. Clic sur une card de ressource → modale ou page de détail selon la taille de la ressource

**Téléchargement :**
- Bouton **"Télécharger"** → déclenchement du téléchargement navigateur (`Content-Disposition: attachment`)

**Visualisation (PDF) :**
- Bouton **"Visualiser"** → modale pleine hauteur avec visionneuse PDF intégrée (`iframe` ou lib PDF.js)

**Admin/HR — actions supplémentaires :**
- Bouton **"+ Nouvelle ressource"** → `/resources/new` (formulaire : titre, description, type, upload fichier, ciblage rôles, statut `draft`/`published`)
- Sur une ressource existante : boutons **"Modifier"** et **"Supprimer"** (avec confirmation)

---

### Flux 8 — Configuration LDAP et synchronisation

**Déclencheur** : Admin → navbar **Admin ▾** → **LDAP** → `/admin/ldap`

**Page structurée en 4 panneaux accordéon :**

**Panneau 1 — Configuration**
1. Formulaire : URL du serveur, port, `bindDN`, `bindPassword` (masqué, `type="password"`), `searchBase`, `searchFilter`
2. `bindPassword` n'est jamais retourné par l'API (champ vide si déjà configuré — indication : "Mot de passe enregistré, saisir pour modifier")
3. Clic **"Sauvegarder la configuration"** → `PUT /api/admin/ldap/config`

**Panneau 2 — Test de connexion**
1. Clic **"Tester la connexion"** → `POST /api/admin/ldap/test`
2. Résultat inline :
   - Succès : `✓ Connexion LDAP établie` (`success-50/success-600`)
   - Échec : message d'erreur détaillé (`error-50/error-600`)

**Panneau 3 — Prévisualisation**
1. Clic **"Prévisualiser l'annuaire"** → `POST /api/admin/ldap/preview`
2. Tableau des 50 premiers utilisateurs LDAP : DN, nom, email, statut (nouveau / existant)
3. Badge de comptage : "X nouveaux · Y existants · Z à mettre à jour"

**Panneau 4 — Synchronisation**
1. Clic **"Lancer la synchronisation"** → modale de confirmation
2. `POST /api/admin/ldap/sync` → barre de progression indéterminée pendant l'exécution
3. Rapport final :
   ```
   Synchronisation terminée
   ✓ X utilisateurs créés
   ↻ Y utilisateurs mis à jour
   ⊘ Z utilisateurs ignorés (doublons)
   ```
4. Les nouveaux utilisateurs reçoivent le rôle `employee` par défaut

---

### Flux 9 — Journal d'audit (admin / hr)

**Déclencheur** : Navbar **Admin ▾** → **Journal d'audit** → `/admin/audit`

1. Page avec tableau paginé (20 entrées/page)
2. **Filtres** (zone en haut, collapsible sur mobile) :
   - Action (liste déroulante des actions tracées)
   - Type cible (`targetType`)
   - Utilisateur (champ de recherche autocomplete)
   - Plage de dates (date de début / date de fin, `date-picker`)
3. Tableau : date/heure · utilisateur · action · cible · détails JSON (expandable)
4. Clic sur une ligne → détail JSON déroulé en accordéon en-dessous

**Export :**
- Bouton **"Exporter en CSV"** → téléchargement direct
- Bouton **"Exporter en PDF"** → génération côté serveur

---

### Flux 10 — Mon profil et préférences

**Déclencheur** : Clic sur l'avatar → **"Mon Profil"** → `/profile`

**Onglet "Informations personnelles" :**
1. Affichage du nom, prénom, email (non modifiable), rôle (non modifiable), département, poste, manager direct
2. Champs éditables : prénom, nom (tous rôles) ; admin/hr peuvent modifier tous les champs via `/users/:id`
3. Bouton **"Enregistrer"** → `PATCH /api/auth/preferences` ou `PATCH /api/users/:id`
4. Toast de confirmation "Profil mis à jour"

**Onglet "Préférences" :**
- **Langue** : FR 🇫🇷 / EN 🇬🇧 (radio buttons)
- **Thème** : Clair / Sombre / Clair avec barre latérale (radio avec aperçu miniature)
- **Notifications** (cases à cocher selon le rôle) :
  - Tous : Évaluation assignée · Rappel de deadline · Action manager requise
  - Manager/Director : + Évaluation soumise
  - HR : + Lancement de campagne
  - Admin : + Alertes système

**Changement de mot de passe :**
1. Onglet ou section "Sécurité"
2. Champs : mot de passe actuel, nouveau mot de passe, confirmation
3. Validation : min 8 caractères, force visuellement indiquée (barre de force)
4. `PATCH /api/auth/password` (route dédiée côté serveur)
5. Succès → toast "Mot de passe modifié" + déconnexion optionnelle des autres sessions

---

## 3. Machines à états

### 3.1 Machine à états — Campagne

```
         ┌──────────────────────────────────────────────┐
         │                                              │
     [Création]                                         │
         │                                              │
         ▼                                              │
    ┌─────────┐  "Lancer"   ┌────────┐  "Clôturer"  ┌────────┐  "Archiver"  ┌──────────┐
    │  DRAFT  │ ──────────► │ ACTIVE │ ────────────► │ CLOSED │ ──────────► │ ARCHIVED │
    └─────────┘             └────────┘               └────────┘             └──────────┘
         │                                                                        │
    "Supprimer"                                                             "Supprimer"
         │                                                                        │
         ▼                                                                        ▼
    [Supprimée]                                                             [Supprimée]
```

| Statut | Badge UI | Boutons disponibles (admin/hr) |
|--------|----------|-------------------------------|
| `draft` | 🟡 Brouillon | Modifier · Lancer · Cloner · Supprimer |
| `active` | 🟢 Active | Voir stats · Cloner · Clôturer |
| `closed` | 🔵 Clôturée | Voir stats · Archiver · Exporter |
| `archived` | ⚪ Archivée | Voir stats · Cloner · Supprimer |

---

### 3.2 Machine à états — Évaluation

```
                                                    ┌───────────────────────►  expired
                                                    │ (deadline dépassée)
   [Création]                                       │
       │                                            │
       ▼                                            │
  ┌──────────┐  1ère sauvegarde  ┌─────────────┐   │   ┌───────────┐
  │ ASSIGNED │ ────────────────► │ IN_PROGRESS │ ──┼──► │ SUBMITTED │
  └──────────┘  (auto)           └─────────────┘   │   └───────────┘
                                                    │         │ manager/director
                                                    │         ▼
                                              archived   ┌──────────┐
                                           (offboarding) │ REVIEWED │
                                                    │    └──────────┘
                                                    │         │ évalué
                                                    │         ▼
                                                    │  ┌─────────────────┐
                                                    │  │ SIGNED_EVALUATEE│
                                                    │  └─────────────────┘
                                                    │         │ manager/director
                                                    │         ▼
                                                    │  ┌──────────────────┐
                                                    │  │  SIGNED_MANAGER  │
                                                    │  └──────────────────┘
                                                    │         │ RH
                                                    │         ▼
                                                    │  ┌─────────────┐
                                                    │  │  SIGNED_HR  │
                                                    │  └─────────────┘
                                                    │         │ admin/RH
                                                    │         ▼
                                                    │   ┌───────────┐
                                                    └──►│ VALIDATED │
                                                        └───────────┘
```

**Ce que voit chaque rôle par statut :**

| Statut | Employé (évalué) | Manager | RH / Admin |
|--------|-----------------|---------|-----------|
| `assigned` | Bouton "Commencer" | Lecture seule | Vue liste |
| `in_progress` | Formulaire éditable + Sauvegarder + Soumettre | Lecture en attente | Vue liste |
| `submitted` | Lecture seule | Bouton "Valider la revue" + Score + Commentaire | Vue + actions bulk |
| `reviewed` | Bouton "Signer" + Commentaire évalué + Désaccord | Bouton "Contresigner" | Bouton "Signer RH" |
| `signed_evaluatee` | Lecture + PDF | Bouton "Contresigner" | Bouton "Signer RH" |
| `signed_manager` | Lecture + PDF | Lecture + PDF | Bouton "Signer RH" |
| `signed_hr` | Lecture + PDF | Lecture + PDF | Bouton "Valider" |
| `validated` | Lecture + PDF ✓ | Lecture + PDF ✓ | Lecture + PDF ✓ |
| `expired` | "Expiré" — lecture seule | Lecture | Vue + Expiration forcée |
| `archived` | — | — | Vue archivée |

---

## 4. Interactions Notifications

### Comportement de la cloche

- **Icône** : 🔔 en zone droite de la navbar
- **Badge non lu** : pastille rouge `error-500` avec compteur (`1–9`, puis `9+`)
- **Clic** → dropdown (popover `shadow-xl`, `rounded-2xl`, largeur 380px, max-height 480px scrollable)

### Contenu du dropdown

```
┌─────────────────────────────────────────┐
│  Notifications                 [Tout lu] │
├─────────────────────────────────────────┤
│  🔵  Évaluation assignée                 │
│      Entretien annuel – Alice Dupont    │
│      Il y a 5 minutes              [→]  │
├─────────────────────────────────────────┤
│  🔵  Rappel de deadline                  │
│      Campagne Q4 2024 · J-1 restant     │
│      Il y a 2 heures               [→]  │
├─────────────────────────────────────────┤
│  ⬜  Campagne lancée                     │
│      Campagne annuelle 2025 est active  │
│      Hier à 14h30                  [→]  │
├─────────────────────────────────────────┤
│         Voir toutes les notifications    │
│          ⚙️  Paramètres de notifications  │
└─────────────────────────────────────────┘
```

- **Notifications non lues** : fond `primary-50`, point bleu `primary-500` à gauche
- **Notifications lues** : fond blanc, pas de point
- **Clic sur une notification** → navigation vers l'écran concerné + marque comme lue
- **"Tout lu"** → `PATCH /api/notifications/read-all` → tous les points disparaissent
- **"Paramètres"** → `/profile#notifications`
- Les 10 dernières notifications sont affichées dans le dropdown

---

## 5. Gestion des erreurs

### 5.1 Tableau de bord des erreurs HTTP

| Code | Comportement UI |
|------|----------------|
| `401 Unauthorized` | Intercepteur global → effacement du state auth → redirection `/login?returnUrl=...` |
| `403 Forbidden` | Toast `error` : "Vous n'avez pas les droits pour effectuer cette action" + log console |
| `404 Not Found` | Page `404` dédiée : illustration SVG + "Page introuvable" + bouton "Retour à l'accueil" |
| `409 Conflict` | Message inline dans le formulaire concerné (ex : "Email déjà utilisé", "Formulaire gelé") |
| `429 Too Many Requests` | Bannière `warning` persistante : "Trop de requêtes. Veuillez patienter X secondes." |
| `500 Server Error` | Error boundary React → page d'erreur avec bouton "Réessayer" + détails en `<details>` |
| Réseau hors ligne | Bannière `offline` en haut de page (`warning-400`, fixe) : "Connexion perdue. Vérifiez votre réseau." |

### 5.2 Error Boundary React

Structure appliquée sur les routes principales :

```
<ErrorBoundary fallback={<ErrorPage onRetry={retry} />}>
  <RouterOutlet />
</ErrorBoundary>
```

- Bouton **"Réessayer"** → `window.location.reload()`
- Bouton **"Revenir à l'accueil"** → `navigate('/')`
- En mode développement : stack trace complète affichée

### 5.3 Bannière hors ligne

- Détectée via `navigator.onLine` + event listeners `online/offline`
- Bannière fixe en haut (au-dessus de la navbar) : `warning-50`, texte `warning-700`
- Disparaît automatiquement dès le retour de la connexion (toast "Connexion rétablie")

---

## 6. Navigation mobile

### 6.1 Menu hamburger → Drawer

- **Déclencheur** : icône hamburger (☰) en zone gauche de la navbar sur mobile (< 768px)
- **Animation** : drawer glisse depuis la gauche en `300ms ease-out` (`translateX -100%→0`)
- **Backdrop** : fond `rgba(15,23,42,0.5)` avec `opacity 0→1` (150ms), clic ferme le drawer
- **Contenu du drawer** : logo en haut + liste complète des liens (identique à la navbar desktop) + icône de fermeture ✕

**Structure du drawer :**
```
┌──────────────────────────┐
│  NX-RH              [✕] │
├──────────────────────────┤
│  👤 Prénom Nom           │
│  Rôle                    │
├──────────────────────────┤
│  🏠 Tableau de bord      │
│  📋 Mes Évaluations      │
│  📅 Calendrier           │
│  📁 Ressources           │
├──────────────────────────┤
│  ⚙️  Mon Profil           │
│  🚪 Déconnexion          │
└──────────────────────────┘
```

### 6.2 Barre de navigation basse (Bottom Tab Bar)

Disponible sur mobile pour les rôles `employee` et `manager` :

```
┌──────┬──────────────┬──────────────┬──────────┐
│  🏠  │  📋           │  📅          │  👤      │
│Accueil│Évaluations   │ Calendrier   │ Profil   │
└──────┴──────────────┴──────────────┴──────────┘
```

- Hauteur : 64px, fond blanc, `shadow-[0_-1px_0_rgba(0,0,0,0.08)]`
- Tab actif : icône + label `primary-600`, fond `primary-50` arrondi
- Tab inactif : `slate-400`

### 6.3 Comportement du bouton Retour

- Utilisation du **bouton retour natif du navigateur** (History API)
- Sur les modales : touche Échap ou swipe vertical (iOS) ferme la modale sans naviguer
- Sur le drawer : bouton retour ferme le drawer (event `popstate` intercepté)

---

## 7. Transitions de page et animations

### 7.1 Changement de route

Transition gérée via React Router + CSS :

```
Route sortante : opacity 1→0 en 100ms (ease-in)
Route entrante : opacity 0→1 en 200ms (ease-out), décalage 50ms
```

Implémentation :
```typescript
// Classe CSS appliquée sur le wrapper de route
.page-enter  { opacity: 0; }
.page-enter-active { opacity: 1; transition: opacity 200ms ease-out; }
.page-exit   { opacity: 1; }
.page-exit-active  { opacity: 0; transition: opacity 100ms ease-in; }
```

### 7.2 Modales

```
Backdrop   : opacity 0→1, 150ms, ease-out
Modale     : scale(0.95)→scale(1) + opacity 0→1, 150ms, ease-out
Fermeture  : opacity 1→0 + scale(1)→scale(0.95), 100ms, ease-in
```

### 7.3 Toasts (notifications UI)

- Position : coin inférieur droit (`bottom-6 right-6`)
- Entrée : `translateY(16px)→translateY(0)` + `opacity 0→1`, 200ms
- Durée d'affichage : 4 secondes (auto-dismiss)
- Sortie : `opacity 1→0` + `translateY(0)→translateY(8px)`, 150ms
- Types : `success` (vert) · `error` (rouge) · `warning` (amber) · `info` (bleu)
- Empilables (max 3 simultanés, les plus anciens s'éjectent)

### 7.4 Accordéon / Collapsible

```
Expansion  : height auto avec transition 200ms ease-out (via ResizeObserver + CSS grid)
Réduction  : height 0, overflow hidden, 200ms ease-in
Chevron    : rotate(0→90deg), 200ms ease-in-out
```

### 7.5 Interactions sur les lignes de tableau

- **Desktop (≥ 768px)** : actions (Modifier, Supprimer…) révélées au hover → `opacity 0→1` (150ms)
- **Mobile (< 768px)** : actions toujours visibles (icônes ou bouton `...` avec menu contextuel)

---

## 8. Patterns de chargement

### 8.1 Chargement initial d'une page

Utilisation de **skeleton screens** (jamais de spinners globaux) :

- **Skeleton card** : rectangle arrondi `slate-200` animé avec `shimmer` (gradient horizontal de droite à gauche)
- **Skeleton table** : lignes de hauteur `h-10` en `slate-200`, espacées de `space-y-2`
- **Skeleton texte** : lignes de largeurs variées (100%, 75%, 50%) pour simuler du contenu

Implémentation CSS shimmer :
```css
.skeleton {
  background: linear-gradient(90deg, #E2E8F0 25%, #F1F5F9 50%, #E2E8F0 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}
@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
```

### 8.2 Boutons en cours de soumission

- Le texte du bouton est remplacé par un spinner `16px` + texte "Chargement…" ou reste caché
- Bouton en état `disabled` (`opacity-50`, `cursor-not-allowed`, `pointer-events: none`)
- Aucune double soumission possible

### 8.3 Rechargement/rafraîchissement d'un tableau

- Spinner subtil en overlay (fond `rgba(255,255,255,0.6)`) centré sur le tableau
- Les lignes existantes restent visibles et ne sautent pas (pas de skeleton sur refresh)
- Indicateur discret : `rotate` animation sur icône de rafraîchissement du bouton déclencheur

### 8.4 Pagination

- Système **Précédent / Suivant** uniquement (pas de défilement infini)
- Navigation : `← Précédent` · indicateur de page `Page X sur Y` · `Suivant →`
- Nombre de résultats par page : 20 (liste/tableau standard), 12 (grille de cards)
- Sélecteur de taille de page optionnel : `10 | 20 | 50` (admin/hr uniquement pour tableaux volumineux)
- Skeleton rechargé uniquement sur la zone du tableau lors du changement de page

### 8.5 Sauvegarde automatique (évaluations)

- Indicateur discret sous le formulaire : "💾 Sauvegarde automatique active"
- En cours de sauvegarde : "⏳ Enregistrement…" (spinner `12px` inline)
- Après sauvegarde réussie : "✓ Enregistré à 14h32" (`success-600`)
- En cas d'échec : "⚠️ Échec de la sauvegarde — Vérifiez votre connexion" (`warning-600`)

---

---

## 9. Nouveaux Flows (Batch B)

> **Version** : 1.1 · Flows F-NEW-01 → F-NEW-09 · ajoutés lors du Batch B
>
> | ID | Titre | Acteurs | Écrans |
> |----|-------|---------|--------|
> | F-NEW-01 | Drag & Drop Organigramme | HR / Admin | S-39 |
> | F-NEW-02 | Import utilisateurs CSV/JSON | HR / Admin | S-40 |
> | F-NEW-03 | Import formulaire JSON | HR / Admin | S-41, S-14 |
> | F-NEW-04 | Dépôt demande employé | Employé | S-31, S-09 |
> | F-NEW-05 | Traitement demande par RH (HR Flags) | HR / Admin | S-38 |
> | F-NEW-06 | Sélection périmètre campagne | HR / Admin | S-10 |
> | F-NEW-07 | Import données N-1 dans objectives | Employé / Manager | S-09 |
> | F-NEW-08 | Gestion secteurs dans l'organigramme | HR / Admin | S-35, S-39 |
> | F-NEW-09 | Manager N+1 d'un autre manager | HR / Admin | S-39 |

---

### Flow F-NEW-01 — Drag & Drop Organigramme

**Acteurs** : HR / Admin
**Écran principal** : S-39 (`/admin/orgchart`)

**Déclencheur** : HR ouvre l'organigramme et fait glisser un nœud utilisateur sur un nouveau manager.

**Étapes (happy path) :**
1. Ouvrir `/admin/orgchart` → `GET /api/org/tree?view=all` — l'arbre hiérarchique est rendu
2. HR fait glisser (drag) un nœud user vers un autre nœud (le futur manager)
3. Au drop : modale de confirmation :
   > "Changer le manager de **[Prénom Nom]** vers **[Prénom Nom manager]** ?"
   > Boutons : **Confirmer** · **Annuler**
4. Confirmer → `PATCH /api/org/users/:id` `{ managerId: newManagerId }`
5. Succès → rechargement de l'arbre : `GET /api/org/tree?view=all`
6. Toast `success` : "Hiérarchie mise à jour"

**Chemins d'erreur :**
- `PATCH 409` (cycle hiérarchique détecté) → modale d'erreur : "Cette modification créerait une boucle hiérarchique. Opération annulée." — le nœud revient à sa position initiale (arbre inchangé)
- `PATCH 400` → toast `error` générique : "Modification impossible — vérifiez les données"
- Annuler la modale → annulation du drop, arbre inchangé (aucun appel API)
- Perte de connexion pendant le drag → bannière hors-ligne standard + rollback visuel

**Transitions :**
- S-39 → S-39 (rechargement en place après succès)
- S-39 → S-39-P1 (panneau latéral de détail utilisateur, si clic sur le nœud)

---

### Flow F-NEW-02 — Import utilisateurs CSV/JSON

**Acteurs** : HR / Admin
**Écran principal** : S-40 (`/admin/users/import`)

**Déclencheur** : HR/Admin souhaite créer ou mettre à jour plusieurs utilisateurs en masse via un fichier.

**Étapes (happy path) :**
1. Ouvrir `/admin/users/import`
2. Téléverser un fichier `.csv` ou `.json` via la zone de dépôt (drag & drop ou bouton "Parcourir")
3. Validation locale immédiate : extension acceptée (`.csv` ou `.json`) ; sinon → erreur client, aucun upload
4. Clic **"Simuler"** → `POST /api/users/import?dryRun=true` (multipart ou JSON selon le type)
5. Affichage de l'aperçu de simulation :
   - Résumé : "**N** créations · **M** mises à jour · **K** erreurs non bloquantes"
   - Si erreurs : tableau détaillé (ligne, champ, message d'erreur)
   - Option **"Continuer quand même"** disponible si des erreurs non bloquantes existent
6. Clic **"Importer"** (actif uniquement si simulation passée sans erreurs bloquantes) → `POST /api/users/import?dryRun=false`
7. Succès → toast `success` : "**N** utilisateurs créés, **M** mis à jour" + redirection automatique vers `/admin/users`

**Chemins d'erreur :**
- Fichier format inconnu (ex : `.xls`, `.txt`) → erreur client avant upload : "Format non supporté. Utilisez .csv ou .json"
- `POST 500` serveur → toast `error` + le fichier reste en mémoire pour permettre un retry (bouton "Réessayer")
- Toutes les lignes en erreur lors de la simulation → bouton "Importer" désactivé (`disabled`) ; seul le résultat de simulation est affiché
- Timeout réseau → toast `warning` : "La requête a pris trop de temps. Réessayez."

**Transitions :**
- S-40 → S-40 (phase simulation : aperçu des résultats dans la même page)
- S-40 → `/admin/users` (après import réussi)

---

### Flow F-NEW-03 — Import formulaire JSON

**Acteurs** : HR / Admin
**Écran principal** : S-41 (`/admin/forms/import`)
**Écran lié** : S-14 (liste des formulaires, lien "📤 Importer JSON")

**Déclencheur** : HR clique sur "📤 Importer JSON" depuis S-14 pour créer un formulaire à partir d'un fichier de définition.

**Étapes (happy path) :**
1. Ouvrir `/admin/forms/import` (lien depuis S-14 "📤 Importer JSON")
2. Deux onglets disponibles :
   - **Onglet "Fichier"** : zone de dépôt pour upload d'un `.json`
   - **Onglet "Coller"** : `<textarea>` pour coller du JSON brut
3. Clic **"Valider"** → validation client :
   - JSON parseable (syntaxe correcte)
   - Champs requis présents : `title`, `formType`, `questions` (tableau non vide)
   - Si invalide : erreurs affichées inline sous le champ
4. Si valide → aperçu du formulaire :
   - Titre, type (`formType`), nombre de questions, liste des questions avec leur type
5. Clic **"Importer"** → `POST /api/forms/import`
6. `201 Created` → toast `success` : "Formulaire importé" + redirection vers `/admin/forms/:id` (formulaire créé)
7. `400 Bad Request` → affichage des erreurs retournées `errors[]` (champ + message)

**Téléchargement du template :**
- Bouton **"📥 Télécharger le template"** → `GET /api/forms/template`
- Retourne un `.json` vide contenant tous les types de questions documentés, utilisable comme guide

**Chemins d'erreur :**
- JSON malformé (syntaxe) → erreur client avant envoi : "JSON invalide — vérifiez la syntaxe"
- `formType` inconnu → `400` serveur : "Type de formulaire inconnu : [valeur]"
- `question.type` inconnu → `400` serveur avec numéro de question concernée : "Question #N : type inconnu '[valeur]'"
- Fichier trop volumineux → erreur client : "Fichier trop grand (max 1 Mo)"

**Transitions :**
- S-41 → `/admin/forms/:id` (après import réussi)
- S-41 → S-14 (bouton retour "← Retour aux formulaires")

---

### Flow F-NEW-04 — Dépôt demande employé

**Acteurs** : Employé
**Écran principal** : S-31 (`/profile`, onglet "Mes demandes")
**Écran lié** : S-09 (`/evaluations/new?formId=xxx`, mode demande)

**Déclencheur** : Employé souhaite soumettre une demande (mobilité, augmentation, promotion, formation) depuis son profil.

**Types de demandes supportés :**
- Mobilité interne (`mobility_request`)
- Augmentation de salaire (`raise_request`)
- Promotion (`promotion_request`)
- Formation (`training_request`)

**Étapes (happy path) :**
1. Employé accède à son profil (`/profile`) → onglet **"Mes demandes"** (S-31)
2. Clic sur le dropdown **"+ Déposer une demande"** → sélectionner le type de demande
3. `GET /api/forms?formType=<type_sélectionné>` pour récupérer le formulaire associé
4. Si formulaire trouvé → redirection vers `/evaluations/new?formId=<id>` (S-09 en mode demande employé)
5. L'employé remplit le formulaire (sauvegarde automatique toutes les 30 s)
6. Clic **"Envoyer ma demande"** → modale de confirmation : "Votre demande sera transmise aux RH. Continuer ?"
7. Confirmation → `POST /api/evaluations` avec les données du formulaire rempli
8. Succès → toast `success` : "Demande envoyée aux RH" + redirection vers S-31 onglet "Mes demandes"
9. La demande apparaît dans la liste avec statut badge **"En attente"** (`warning`)

**Chemins d'erreur :**
- Aucun formulaire disponible pour le type choisi → toast `info` : "Formulaire non disponible pour ce type de demande, contactez les RH"
- `POST /api/evaluations` échoue → toast `error` + le formulaire reste affiché avec les données saisies (pas de perte)
- Session expirée en cours de remplissage → redirection vers `/login?returnUrl=/evaluations/new?formId=xxx` (données non sauvegardées si non auto-sauvegardées)

**Transitions :**
- S-31 → S-09 (remplissage du formulaire de demande)
- S-09 → S-31 onglet "Mes demandes" (après soumission réussie)

---

### Flow F-NEW-05 — Traitement demande par RH (HR Flags)

**Acteurs** : HR / Admin
**Écran principal** : S-38 (`/hr/flags`)

**Déclencheur** : Badge rouge sur la navbar indique N demandes en statut "new" → RH clique pour traiter.

**Étapes (happy path) :**
1. Badge rouge sur l'icône de la navbar affiche le nombre de demandes non traitées
2. Clic → navigation vers `/hr/flags`
3. `GET /api/hr/flags` → liste des évaluations dont le `formType` appartient aux `REQUEST_FORM_TYPES`
4. **FilterBar** (zone de filtres) :
   - Type de demande (mobilité, augmentation, promotion, formation)
   - Statut (`new`, `in_review`, `approved`, `rejected`)
   - Département / Secteur / Période (date de dépôt)
5. Clic sur une ligne de demande → panneau latéral **S-38-P1** s'ouvre
6. Panneau S-38-P1 affiche :
   - Réponses de l'employé (formulaire en lecture seule)
   - Informations contextuelles de l'employé (poste, département, manager)
   - Champ note interne (optionnel, visible uniquement par RH/Admin)
7. Saisir note interne (optionnel) + sélectionner nouveau statut → `PATCH /api/hr/flags/:evalId/status` `{ status, internalNote }`
8. Succès :
   - Badge navbar décrémenté (si statut `new` → autre statut)
   - Ligne mise à jour inline dans la liste (badge statut mis à jour)
   - Toast `success` : "Demande mise à jour"

**Comportement temps réel du badge :**
- Polling toutes les 30 s : `GET /api/hr/flags/count`
- Si WebSocket disponible : mise à jour push instantanée (évènement `flags:new`)

**Chemins d'erreur :**
- `PATCH 404` → toast `error` : "Demande introuvable — rafraîchissez la page"
- `PATCH 403` → toast `error` : "Vous n'êtes pas autorisé à traiter cette demande"
- Perte de connexion → mise à jour différée, indicateur hors-ligne standard

**Transitions :**
- S-38 → S-38 (mise à jour inline de la liste, badge mis à jour)
- S-38 (panneau S-38-P1) → fermeture panneau → retour S-38

---

### Flow F-NEW-06 — Sélection périmètre campagne

**Acteurs** : HR / Admin
**Écran principal** : S-10 (`/campaigns/new` ou `/campaigns/:id`, section "Périmètre")

**Déclencheur** : HR/Admin crée ou édite une campagne et doit définir le périmètre des utilisateurs ciblés.

**Étapes (happy path) :**
1. Dans S-10 (formulaire campagne), section **"Périmètre de la campagne"**
2. Sélectionner le type de scope via un groupe de radio buttons :
   - **Tous** : tous les utilisateurs actifs
   - **Département** → affiche un multi-select des départements (valeurs issues des constantes `DEPARTMENTS`)
   - **Secteur** → affiche un multi-select alimenté par `GET /api/org/sectors`
   - **Utilisateurs spécifiques** → affiche un champ de recherche/select : `GET /api/users?search=xxx` (autocomplete)
3. Sélections validées → le champ `targetScope` est renseigné dans l'objet campagne :
   ```json
   {
     "targetScope": {
       "type": "department" | "sector" | "specific" | "all",
       "values": ["RH", "IT"] // ou IDs selon le type
     }
   }
   ```
4. Sauvegarde de la campagne → `POST /api/campaigns` ou `PATCH /api/campaigns/:id` (selon création/édition)

**Effets du targetScope sur le lancement :**
- `POST /api/campaigns/:id/launch` utilise `targetScope` pour générer les évaluations uniquement pour les utilisateurs dans le périmètre
- Si `type: "all"` → toutes évaluations créées pour tous les utilisateurs actifs
- Si `type: "department"` → évaluations pour les utilisateurs dont `department ∈ values`
- Modification du scope sur une campagne `draft` → autorisée ; sur une campagne `active` → bloquée (scope gelé au lancement)

**Chemins d'erreur :**
- `GET /api/org/sectors` échoue → toast `warning` + fallback sur liste vide avec message "Impossible de charger les secteurs"
- Multi-select "Utilisateurs spécifiques" : aucun résultat de recherche → état vide "Aucun utilisateur trouvé"
- Scope vide (aucun utilisateur sélectionné) → validation bloquante avant sauvegarde : "Sélectionnez au moins un périmètre"

**Transitions :**
- S-10 → S-10 (sauvegarde du scope, même page)
- S-10 → S-27 (`/campaigns`, liste des campagnes, après sauvegarde/validation complète)

---

### Flow F-NEW-07 — Import données N-1 dans objectives

**Acteurs** : Employé / Manager
**Écran principal** : S-09 (`/evaluations/:id`, formulaire de type `objectives`)

**Déclencheur** : L'utilisateur remplit une évaluation avec un formulaire de type `objectives` et la campagne autorise le contexte N-1.

**Pré-conditions :**
- Le formulaire (`formType: 'objectives'`) contient des questions de type `objective_item`
- La campagne associée a `enableN1Context: true`
- Le rôle de l'utilisateur lui donne accès (voir règles ci-dessous)

**Étapes (happy path) :**
1. S-09 chargé avec un formulaire de type `objectives`
2. Si la campagne a `enableN1Context: true` → bouton **"📥 Importer depuis N-1"** affiché en haut de la section objectifs
3. Clic sur le bouton → `GET /api/evaluations/:id/n1-context`
4. Succès `200` → les champs `objective_item` sont pré-remplis avec les objectifs de la campagne précédente
   - Chaque objectif importé est marqué visuellement avec une étiquette "Importé N-1" (`info-50/info-600`)
5. L'utilisateur peut :
   - Modifier le texte de chaque objectif importé
   - Supprimer un objectif importé (croix `✕`)
   - Ajouter de nouveaux objectifs manuellement
6. Soumission normale du formulaire (`PATCH /api/evaluations/:id`) — le contenu importé est traité comme n'importe quelle réponse

**Règles de visibilité du bouton :**
- Si `n1VisibleToEmployee: false` et que l'utilisateur est un employé → bouton **caché**
- Si rôle `manager` ou `director` → bouton toujours visible quand `enableN1Context: true`
- `403` reçu depuis l'API → bouton caché, aucun message d'erreur affiché

**Chemins d'erreur :**
- `GET 204` (pas de données N-1 disponibles) → toast `info` : "Pas de données N-1 disponibles pour cette évaluation"
- `GET 403` → bouton caché selon le rôle (voir règles ci-dessus), pas de toast
- `GET 500` → toast `error` : "Impossible de charger les données N-1 — réessayez"

**Transitions :**
- S-09 → S-09 (les champs sont pré-remplis dans la même page, pas de navigation)
- Soumission → flow normal d'évaluation (statut `in_progress → submitted`)

---

### Flow F-NEW-08 — Gestion secteurs dans l'organigramme

**Acteurs** : HR / Admin
**Écrans** : S-35 (`/admin/settings`, section "Secteurs organisationnels") · S-39 (`/admin/orgchart`, vue "Secteur")

**Déclencheur** : HR/Admin souhaite créer, modifier ou supprimer des secteurs organisationnels, puis les visualiser dans l'organigramme.

**Étapes — CRUD secteurs (S-35) :**

1. Accéder à S-35 → section **"Secteurs organisationnels"** → `GET /api/org/sectors`
   - Liste des secteurs avec nom, description, couleur, compteur d'utilisateurs

2. **Créer un secteur :**
   - Clic **"+ Nouveau secteur"** → formulaire inline ou modale : nom + description + sélecteur couleur
   - `POST /api/org/sectors` `{ name, description, color }`
   - Succès → toast `success` : "Secteur créé" + secteur ajouté à la liste

3. **Modifier un secteur :**
   - Clic sur l'icône édition d'un secteur → champs passent en mode édition inline
   - `PATCH /api/org/sectors/:id` `{ name?, description?, color? }`
   - Succès → toast `success` : "Secteur mis à jour"

4. **Supprimer un secteur :**
   - Clic sur l'icône corbeille → modale de confirmation
   - `DELETE /api/org/sectors/:id`
   - Si le secteur contient des utilisateurs → `409` (voir chemins d'erreur)
   - Succès → toast `success` : "Secteur supprimé"

**Étapes — Visualisation et réassignation (S-39) :**

5. Dans S-39, sélectionner la vue **"Secteur"** → l'organigramme affiche les utilisateurs groupés par secteur, chaque groupe colorisé selon la couleur du secteur
6. Drag & drop d'un nœud utilisateur vers un autre groupe de secteur → `PATCH /api/org/users/:id` `{ sectorId: newSectorId }`
7. Succès → l'utilisateur apparaît dans le nouveau secteur

**Chemins d'erreur :**
- `DELETE 409` (secteur utilisé par des utilisateurs) → modale d'information :
  > "Ce secteur est utilisé par **N** utilisateur(s). Veuillez les réassigner avant de supprimer le secteur."
  > Bouton **"Voir les utilisateurs"** → filtre S-39 sur ce secteur
- `POST 409` (nom de secteur en doublon) → erreur inline : "Un secteur avec ce nom existe déjà"
- `PATCH /api/org/users/:id` (`sectorId`) échoue → toast `error` + rollback visuel du drag

**Transitions :**
- S-35 → S-35 (CRUD inline, même page)
- S-35 → S-39 (lien "Voir dans l'organigramme" sur un secteur)
- S-39 → S-35 (lien "Gérer les secteurs" dans la toolbar de S-39)
- Lien bidirectionnel S-35 ↔ S-39

---

### Flow F-NEW-09 — Manager N+1 d'un autre manager

**Acteurs** : HR / Admin
**Écran principal** : S-39 (`/admin/orgchart`), panneau latéral S-39-P1

**Contexte et décision de design :**

Ce flow clarifie le comportement lorsqu'un manager doit superviser une équipe dont il n'est pas le manager direct dans l'arbre hiérarchique.

| Rôle | Périmètre de visibilité |
|------|------------------------|
| `manager` | Rapports directs uniquement |
| `director` | Sous-arbre complet de manière récursive |

> ⚠️ **Note v1** : Il n'existe pas de "permission transversale" granulaire dans la v1. La visibilité est entièrement déterminée par le rôle. Pour donner un accès limité à une équipe spécifique sans être dans la hiérarchie, cette fonctionnalité est marquée **à implémenter dans une version future**.

**Étapes (happy path) :**
1. HR identifie dans S-39 un manager qui doit superviser une équipe transversale
2. Clic sur le nœud du manager → panneau latéral **S-39-P1** s'ouvre
3. Dans S-39-P1, section **"Rôle"** → sélectionner `director` (depuis `manager`)
4. `PATCH /api/org/users/:id` `{ role: 'director' }`
5. Succès → toast `success` : "Rôle mis à jour" + badge du nœud mis à jour dans l'arbre
6. Le user promu `director` peut désormais voir son sous-arbre complet récursivement dans S-05 (Dashboard) et dans la liste des évaluations
7. *(Optionnel)* Si une réorganisation hiérarchique est nécessaire : `PATCH /api/org/users/:id` `{ managerId: newManagerId }` (flow F-NEW-01)

**Chemins d'erreur :**
- `PATCH 403` → toast `error` : "Vous n'avez pas les droits pour modifier ce rôle"
- `PATCH 400` (rôle invalide) → toast `error` générique
- Tentative de passer `director` → `employee` directement sur un user avec des rapports directs → `409` : "Cet utilisateur a des rapports directs. Réassignez-les avant de changer le rôle."

**Transitions :**
- S-39 (nœud sélectionné) → S-39-P1 (panneau latéral, édition du rôle)
- S-39-P1 → S-39 (fermeture du panneau, arbre mis à jour)

---

### F-NEW-10 — Mot de passe oublié

**Acteurs** : Tout utilisateur (authSource: "local")
**Pré-condition** : Non connecté. Compte de type local (non LDAP).

**Étapes** :
1. Sur `/login` → clic "Mot de passe oublié ?"
2. → Redirect `/forgot-password`
3. Saisie de l'adresse email → `POST /api/auth/forgot-password { email }`
4. → Afficher message de confirmation (même si email inconnu — anti-énumération)
5. Email reçu avec lien `https://[domain]/reset-password?token=TOKEN`
6. → Clic lien → `/reset-password?token=TOKEN`
7. Saisie nouveau mdp + confirmation → `POST /api/auth/reset-password { token, newPassword }`
8. → Redirect `/login` avec toast "Mot de passe réinitialisé avec succès"

**Cas d'erreur** :
- Token expiré (> 1h) → "Ce lien a expiré, demandez un nouveau" + bouton "Renvoyer"
- Token déjà utilisé → idem
- Compte LDAP → "Votre compte utilise LDAP — contactez votre administrateur"
- Email inconnu → même message succès (sécurité)

**Notifications** : Email template "password_reset"
**Backend** : C1 (add-forgot-password) — à implémenter
**Screens** : S-NEW-01 `/forgot-password`, S-NEW-02 `/reset-password`

---

*Fin du document — NX-RH Flows UX v1.1*
