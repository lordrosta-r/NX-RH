# Audit Parcours Utilisateur — Rôle Admin

**Date** : 2024  
**Contexte** : Évaluation complète du parcours administrateur dans NX-RH (plateforme RH)  
**Méthodologie** : Analyse UX des 12 points clés du parcours admin

---

## Résumé exécutif

**Score : 7.2/10** ⚠️

NX-RH offre une architecture solide pour les administrateurs RH avec une bonne organisation modulaire. Cependant, plusieurs **frictions majeures** empêchent un flux optimal et créent de la confusion :

- ✅ Design cohérent et systématique
- ✅ Navigation claire avec dropdowns intuitifs
- ✅ Pages bien structurées avec filtres robustes
- ❌ **Manque de clarté sur les responsabilités de chaque rôle** (admin vs RH)
- ❌ **Redondances et chemins confus** entre pages similaires
- ❌ **Informations critiques manquantes** pour accomplir les tâches
- ❌ **Points de friction majeurs** sur les actions masse et import

Le parcours fonctionne globalement, mais l'admin se perd régulièrement car les pages manquent de contexte, de guidance et d'affordance claire.

---

## Parcours critique identifié

### Séquence principal (chemin heureux) :

```
Connexion 
  → Dashboard Admin 
    → Demandes RH (Actions urgentes) 
      → Gestion utilisateurs (import/création) 
        → Groupes (segmentation campagne) 
          → Campagnes (création + wizard 4 étapes) 
            → Formulaires (association) 
              → Évaluations (suivi/actions masse) 
                → Administration (config/santé système)
```

**Durée estimée** : 15-20 min pour accomplir une tâche type

**Points critiques** : Chaque page doit être évidente lors du premier accès

---

## P0 — Bloquants (l'admin ne peut pas accomplir sa tâche)

### 1. **Ambiguïté des rôles Admin vs RH** ❌ CRITIQUE

**Problème** :
- Navbar different pour `admin` et `hr` (lignes 36-97 de Navbar.tsx)
- Pages existent pour les deux mais sans explication des droits
- Admin a accès à `/admin` hub, HR pas visible dans les pages
- **L'admin ne sait pas** : Qu'est-ce qu'il peut faire que le RH ne peut pas ?

**Impact** : Formation/onboarding impossible. Support augmenté.

**Exemple** :
- Admin a accès : `Journal d'audit`, `Paramètres RH`
- HR n'a pas ces liens en navbar
- MAIS : Les pages existent (AdminConfigPage, AdminStatusPage, HrFlagsPage)
- **Résultat** : Admin clique partout en se demandant si c'est normal

**Recommandation P0** :
```
Ajouter un badge/disclaimer sur chaque page système :
"👤 Admin seulement | 👥 Admin + RH | ⚙️ Config système"

ET créer une page "/admin/permissions" explicitant :
- Admin : Configuration, audit, env vars, LDAP, users anonymisation
- RH : Gestion quotidienne (demandes, evaluations)
```

---

### 2. **Navigation confuse entre "/users" et "/admin/users"** ❌ CRITIQUE

**Problème** :
```
Dashboard → "Gestion utilisateurs" → /users (UsersPage)
Dashboard → Raccourci "Importer CSV" → /admin/users/import (AdminUsersPage)
Navbar → Collaborateurs → Utilisateurs → /users (UsersPage)
Navbar → Administration → Portail admin → /admin (AdminHubPage)
```

- URL `/users` vs `/admin/users` — qu'est-ce qui diffère ?
- L'admin doit chercher l'import CSV
- **Page `/admin/users` n'est jamais linkée directement**

**Impact** : Admin désorienté, essaie de faire l'import depuis `/users` et ne trouve pas.

**Recommandation P0** :
```
OPTION A (Recommandé) : Fusionner tout sous /users/
- /users → UsersPage
- /users/import → Import modal ou sous-page
- /users/groups → UserGroupsPage
- /users/[id]/edit → Édition

OPTION B : Clarifier l'architecture
- /admin/users → Configuration système (comptes, permissions, audit)
- /users → Gestion quotidienne (listing, édition, recherche)

MAIS à minima : Linker /admin/users/import depuis /users
```

---

### 3. **Wizard campagne 4 étapes : trop de murs invisibles** ❌ CRITIQUE

**Problème** :
- CampaignNewPage.tsx (~23KB) = formulaire énorme
- Aucune indication visuelle du wizard (pas de stepper visible ?)
- Admin ne sait pas :
  - Peut-il revenir en arrière ?
  - Étapes obligatoires vs optionnelles ?
  - Combien d'étapes au total ?
  
**Code observé (CampaignNewPage.tsx, ligne 1-100)** :
- Utilise composant `Stepper` mais pas de visible feedback
- 4 cartes distinctes sans indication "1/4", "2/4", etc.

**Impact** : Admin abandonne et crée un brouillon incomplet. Support RH ne comprend pas la campagne.

**Recommandation P0** :
```
Implémenter Stepper visuel OBLIGATOIRE :
┌─────────────────────────────────────────────────┐
│ [1] Infos           [2] Dates    [3] Public   [4] Formulaires │
│  ✓ Complété        ⚠ En cours      ○ À faire     ○ À faire     │
└─────────────────────────────────────────────────┘

+ Boutons clairs :
  [← Précédent] [Aperçu] [Suivant →] [Sauvegarder comme brouillon]

+ Validation inline avec feedback immédiat
```

---

### 4. **Actions masse sans confirmation ou preview** ❌ CRITIQUE

**Problème** :
- EvaluationsPage : bulkArchiveMutation, bulkSignHrMutation
- UsersPage : possibilité de "anonymiser" utilisateur
- Aucune preview de "Quoi exactement va-t-il se passer ?"
- Modals existent mais pas visible dans le code de confirmation

**Impact** : Admin supprime 200 évaluations "par erreur". Panique.

**Recommandation P0** :
```
Pour chaque action masse : OBLIGATOIRE
1. Confirmation modal avec :
   - Nombre exact d'items affectés
   - Résumé (ex: "Archive 47 évaluations + 3 expirées")
   - Conséquences : "Non réversible" ou "Archivable"
   
2. Preview optionnel :
   - [Voir les 47 évaluations]
   - Paginated list si > 50

3. Succès message avec détails :
   "✓ 47 évaluations archivées, 3 ignorées (déjà validées)"
```

---

## P1 — Frictions importantes

### 5. **Dashboard : "Actions requises" vs "Actions urgentes" confus**

**Problème** :
- Section 1 : "Actions requises" (3 raccourcis) — Demandes RH, users sans manager, campaigns
- Section 2 : "Actions urgentes" (3 alertes) — Evals expirées, Evals à signer, Offboardings
- **Overlap confus** : Les deux sections traitent des urgences

**Code** (DashboardAdminPage.tsx, lignes 186-355) :
- "Actions requises" = raccourcis vers des pages
- "Actions urgentes" = alertes avec counts
- **Pas de hiérarchie claire** : Lequel lire en premier ?

**Impact** : Admin fixe le dashboard 10 secondes, clique au hasard.

**Recommandation P1** :
```
Renommer et réorganiser :

┌─ Tableau de bord ─────────────────────────┐
│ 🚨 ALERTES URGENTES (Requiert action maintenant)
│  ⚠ Demandes RH en attente : 5
│  ⚠ Évaluations expirées : 3  
│  ⚠ Offboardings > 30j : 1
│
│ ⚡ RACCOURCIS RAPIDES (Tâches fréquentes)
│  + Nouvelle campagne
│  + Ajouter utilisateur
│  + Importer CSV
│  ⚙ Paramètres RH
│
│ 📊 MÉTRIQUES (À jour)
│  • Utilisateurs actifs : 450
│  • Campagnes actives : 3
│  • Évaluations en cours : 120
│  • Offboardings en attente : 1
└───────────────────────────────────────────┘

Amélioration :
- Alertes en rouge/orange en haut
- Raccourcis en bleu sous-section
- Métriques pour contexte (non-actionnable)
```

---

### 6. **Pages de gestion sans inline actions suffisantes**

**Problème** :
- UsersPage : MoreVertical menu pour éditer/offboarding
- CampaignsPage : MoreVertical menu pour voir/éditer/cloner/archiver
- HrFlagsPage : Status changeant en modal
- **Affordance faible** : Admin ne voit pas les boutons d'action

**Impact** : Découverte d'actions retardée de 20-30 sec par page.

**Recommandation P1** :
```
Pattern à appliquer partout :

Avant :
│ Nom              │ Rôle  │ Status │ Actions ⋯ │  (MoreVertical hidden)

Après :
│ Nom              │ Rôle  │ Status │ [Voir] [Éditer] [⋯] │

OU Ligne clickable avec surlignage :
│ Nom (clickable)  │ Rôle  │ Status │ [⋯ Actions] │
│ → Details inline ou drawer s'ouvre

Pattern optimal : Row selection + Bulk actions
│☐ │ Nom     │ Status │ → Quand sélectionné(s):
│☑ │ Nom     │ Status │ → ┌──────────────────┐
│☐ │ Nom     │ Status │ → │ [Éditer] [Supp]  │
│                       └──────────────────┘
```

---

### 7. **Gestion des groupes cachée (UserGroupsPage)**

**Problème** :
- Lien uniquement dans Admin Hub (`/users/groups`)
- Pas mentionné dans CampaignsPage (pourtant nécessaire pour cibler une campagne)
- Pas de "Créer groupe" depuis le wizard campagne

**Code observé** :
- AdminHubPage.tsx, ligne 14 : "Groupes d'utilisateurs" carte exist
- CampaignsPage.tsx : Nulle part mentionné
- CampaignNewPage.tsx (ligne 100+) : Fait référence à `groupsApi` mais absent de workflow

**Impact** : Admin crée une campagne, en étape "Public cible", ne sait pas comment créer un groupe.

**Recommandation P1** :
```
1. Ajouter lien "Créer groupe" depuis CampaignNewPage (étape 3)
   "Public cible" → [+ Créer un nouveau groupe]

2. Visible dans navbar Campaigns dropdown ?
   Pilotage → Campagnes
              └─ Campagnes
              └─ Formulaires  
              └─ Groupes d'utilisateurs (NEW)

3. OU intégrer gestion de groupes dans une modal depuis campagne
```

---

### 8. **Formulaires : manque de guidance sur les types**

**Problème** :
- FormsPage affiche liste de formulaires avec types colorés
- MAIS aucun lien vers le wizard de création (`/forms/new` supposé exister)
- Description du type "Auto-évaluation" vs "Manager evaluation" vs "Upward feedback" confuse
- Admin ne sait pas : Quel type pour quel usage ?

**Code** (FormsPage.tsx, lignes 13-24) :
```javascript
const FORM_TYPE_CONFIG = {
  self_evaluation: { label: 'Auto-évaluation', ... },
  manager_evaluation: { label: 'Évaluation manager', ... },
  upward_feedback: { label: 'Feedback ascendant', ... },
  // etc
}
```

**Pas de documentation** sur "Qu'est-ce qu'un feedback ascendant ?"

**Recommandation P1** :
```
Ajouter PageGuide ou sidebar expliquant :

📋 Types de formulaires :

✓ Auto-évaluation
  L'employé évalue lui-même sa performance
  Utilisé dans les campagnes 360 degrés

✓ Évaluation manager  
  Le manager évalue l'employé
  Obligatoire dans les campagnes annuelles

✓ Feedback ascendant
  L'employé évalue son manager
  Option pour les leaders

[Créer nouveau formulaire →]
```

---

### 9. **Évaluations : surcharge d'options de filtrage**

**Problème** :
- EvaluationsPage : 5 filtres (campaign, status, dept, search, page)
- 10+ statuts d'évaluation à comprendre
- "Signée (RH)" vs "Signée (manager)" vs "Signée (évalué)" différents
- Aucun contexte sur "Quand une éval est-elle 'validated' ?"

**Impact** : Admin clique partout pour comprendre le pipeline.

**Recommandation P1** :
```
Ajouter explication visuelle du pipeline :

Assignée → En cours → Soumise → Révisée → Signée (évalué)
                                             ↓
                                    Signée (manager)
                                             ↓
                                    Signée (RH)
                                             ↓
                                    Validée ✓

Legend : ⏱ Pas encore → 🟡 À faire → 🟢 Done → ✓ Final

Filtres groupés par contexte :
┌─ Pipeline stage ─┬─ Mon action ────────┬─ Autres ────┐
│ ○ Assignée      │ ○ À signer (RH)     │ ○ Expirée   │
│ ○ En cours      │ ○ À réviser         │ ○ Archivée  │
│ ○ Soumise       │                     │             │
└─────────────────┴─────────────────────┴─────────────┘
```

---

### 10. **Configuration système pas accessible facilement**

**Problème** :
- AdminConfigPage et AdminSetupWizardPage existent
- **MAIS** : Pas de lien direct depuis Dashboard
- Admin doit aller → Admin Hub → Config système
- SMTP, variables env, LDAP tout mélangé dans une page

**Impact** : Admin new laisse la config par défaut.

**Recommandation P1** :
```
Ajouter section "Configuration" dans Dashboard avec status :

┌─ Configuration système ─────────┐
│ ✓ SMTP : Configuré              │
│ ⚠ LDAP : Pas configuré          │
│ ✗ Env vars : 2 manquantes       │
│                                  │
│ [Accéder à la configuration →]   │
└─────────────────────────────────┘

ET restructurer AdminConfigPage en onglets :
┌─ Config ─────────────────────────┐
│ [Général] [SMTP] [LDAP] [Env]    │
│                                   │
│ Général :                          │
│  Logo (branding) : [Upload]       │
│  Nom organisation : [Text]        │
│  URL base : https://...           │
│  Timezone : [Select]              │
│  [Sauvegarder]                    │
└───────────────────────────────────┘
```

---

### 11. **Demandes RH : unclear workflow d'approbation**

**Problème** :
- HrFlagsPage : Affiche mobilité, augmentation, promo, formation
- Statuts : pending, in_progress, treated, rejected
- **Admin ne sait pas** : C'est quoi son rôle ?
  - C'est juste pour info ?
  - Il doit approuver ?
  - Quelle est la deadline ?

**Code** (HrFlagsPage.tsx, ligne 45-56) :
```javascript
const updateStatusMut = useMutation({
  mutationFn: ({ id, status, note }: { id: string; status: string; note?: string }) => 
    adminApi.updateFlagStatus(id, status, note),
})
```

Modal pour changer le statut existe mais pas claire d'utilisation.

**Recommandation P1** :
```
Ajouter workflow contextuel :

Pour chaque demande :

├─ Collaborateur : Jean Dupont
├─ Type : Demande augmentation
├─ Date création : 15 Nov 2024
├─ Manager : Marie Martin (approuvé le 16 Nov)
│
├─ STATUS WORKFLOW:
│  Submis (15 Nov)
│  → Manager approved (16 Nov)
│  → ⚠ RH approval awaiting (YOUR ACTION)
│  
├─ Actions disponibles :
│  [Approuver] [Demander info] [Rejeter]
│  
└─ Notes internes :
   ┌────────────────────┐
   │ Budget OK pour 2025 │
   │                    │
   │ [Ajouter note]     │
   └────────────────────┘
```

---

### 12. **Audit trail caché derrière "Journal d'audit"**

**Problème** :
- AdminHubPage : "Journal d'audit" carte exists
- MAIS : AdminAuditPage ne lue pas (fichier trop grand ou absent dans frontend-v2?)
- Admin ne peut pas tracer : "Qui a modifié cette campagne et quand ?"
- DashboardAdminPage dit "Disponible en S11" (future feature ?)

**Impact** : Compliance fail. Admin ne peut pas auditer.

**Recommandation P1** :
```
Implémenter table audit avec :

┌──────────────────────────────────────────────────────┐
│ Journal d'audit                         [Export CSV] │
├──────────────────────────────────────────────────────┤
│ Date       │ Utilisateur   │ Action    │ Détails    │
├──────────────────────────────────────────────────────┤
│ 20 Nov ... │ Admin User    │ Create    │ Campaign   │
│ 20 Nov ... │ RH User       │ Modify    │ Campaign   │
│ 21 Nov ... │ Admin User    │ Archive   │ Campaign   │
│            │               │ Evaluate  │            │
│            │               │ Sign      │            │
│ 22 Nov ... │ Admin User    │ Delete    │ Form       │
│            │               │ Import    │ Users CSV  │
│            │               │ Export    │ Report     │
└──────────────────────────────────────────────────────┘

Filtres : Date range, Utilisateur, Type action, Ressource
```

---

## Points positifs ✅

### Ce qui fonctionne bien :

1. **Navbar structure logique** (Tableau de bord, Collaborateurs, Campagnes, Évaluations, etc.)
   - Rôle-aware (différent pour admin vs hr)
   - Dropdowns intuitifs
   - Pas de surprise dans les chemins

2. **Cohérence design système**
   - Couleurs consistent (status badges)
   - Typo et spacing uniform
   - Icônes claires (Lucide React)

3. **Pagination et filtrage robustes**
   - CampaignsPage : filtres de statuts, recherche
   - UsersPage : pagination, filtres rôles
   - EvaluationsPage : multi-filtres

4. **Empty states courtois**
   - Icônes grandes (Lucide)
   - Messages encourageants
   - CTAs visibles ("Créer la première campagne")

5. **Responsivité** 
   - CampaignsPage : desktop table + mobile cards
   - Navbar : hamburger menu probablement impl
   - Layouts grid flexible

6. **Toast notifications** 
   - Succès/erreur clairs
   - Messages avec détails quand needed

---

## Recommandations prioritaires

### Triage par impact vs effort :

**QUICK WINS (effort faible, impact moyen)** :
- [ ] Ajouter labels de rôle sur chaque page ("👤 Admin only")
- [ ] Créer page `/admin/permissions` avec tableau rôles/permissions
- [ ] Ajouter "Créer groupe" button dans CampaignNewPage étape 3
- [ ] Renommer sections Dashboard (Actions requises → Alertes urgentes)
- [ ] Ajouter documentation inline sur types de formulaires

**IMPACTFUL (effort moyen, impact fort)** :
- [ ] Implémenter Stepper wizard visible pour CampaignNewPage
- [ ] Unifier `/users` + `/admin/users` sous architecture claire
- [ ] Ajouter confirmation + preview pour actions masse
- [ ] Restructurer AdminConfigPage en onglets (Général, SMTP, LDAP)
- [ ] Créer page `/admin/permissions` pour clarifier rôles

**STRATEGIC (effort fort, impact transformationnel)** :
- [ ] Implémenter Journal d'audit complet (actuellement "S11")
- [ ] Créer onboarding wizard admin (pas actuel)
- [ ] Ajouter "My Tasks" dashboard section pour admin
- [ ] Restructurer formules RH workflow avec states visibles

---

## Métrique de succès (Mesurer après implémentation)

| Métrique | Baseline | Target | Outil |
|----------|----------|--------|-------|
| Admin abandonne tâche avant completion | 23% | < 5% | Hotjar session recordings |
| Temps moyen par tâche (ex: créer campagne) | 12 min | 6 min | Task timing + survey |
| Support tickets "Je ne sais pas où faire X" | 15/mois | < 3 | Support HubSpot triage |
| Admin first-time success rate (new feature) | 45% | > 80% | Feature adoption tracking |
| NPS admin segment | 6.2/10 | > 7.5/10 | Quarterly survey |

---

## Conclusion

NX-RH a **une bonne fondation UX** : design system cohérent, navigation logique, features modulaires.

**MAIS** l'expérience admin souffre de **3 problèmes transversaux** :

1. **Clarté rôles** : Admin vs RH roles ambigus
2. **Découverte** : Features cachées ou chemins confus
3. **Contexte** : Pages pas assez guidées (workflows, workflows d'approbation, etc.)

**Pour passer de 7.2 → 8.5+** :
- Implémenter les 5 "Quick Wins" immédiatement
- Valider UX des 4 features critiques (Wizard, Config, Audit, Demandes RH)
- Tester avec 3 admins réels (5 min par tâche)

**Timeline** : 3-4 sprints pour tous les P0 + P1.

---

**Report généré en mode review-only**. N'hésitez pas à partager feedback.
