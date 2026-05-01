# NX-RH — Flux UX & Patterns d'interaction (Frontend v2)

> **Auteur** : Architecte UX · **Version** : 1.0 · **Date** : 2025
> Stack : React 18 + Vite + TypeScript + Tailwind CSS · Couleur primaire : `#17A8D4`

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

*Fin du document — NX-RH Flows UX v1.0*
