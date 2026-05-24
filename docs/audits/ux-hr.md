# Audit Parcours Utilisateur — Rôle RH

## Résumé exécutif
**Score : 6.5/10**

Le parcours RH présente une **architecture fonctionnelle solide** mais souffre de **lacunes en termes de clarté informationnelle et de guidage opérationnel**. Les RH peuvent accéder à leurs outils critiques, mais les informations essentielles ne sont pas hiérarchisées et le workflow manque de **priorisation des actions urgentes**. Le système est techiquement complet mais **pauvre en UX de contexte et de décision**.

---

## 🔴 Parcours critique identifié

### Le RH típique dans NX-RH

1. **Connexion** → Authentification simple ✅
2. **Dashboard** → Vue d'ensemble fragmentée ⚠️
3. **Campagnes** → Gestion des campagnes d'évaluation
4. **Évaluations** → Suivi et signature des évals
5. **Demandes RH** → Gestion des flags (mobilité, augmentations, etc.)
6. **Utilisateurs** → Gestion des collaborateurs
7. **Paramètres** → Configuration et rappels groupés

**Problème systémique** : Chaque page fonctionne isolément. Pas de **narrative unifiée** du workflow RH. Le RH doit faire un **effort cognitif constant** pour contextualiser ses actions.

---

## 🔴 P0 — Bloquants

### 1. **Dashboard RH fragmenté et incomplet** [CRITIQUE]

**Observation:**
- KPIs affichent des zéros hardcodés ou des tirets (`—`)
  - "Évals à signer : 0"
  - "Stats rapides" affiche "— (S8)" → Signal d'incompétude
- Pas de vue d'ensemble réelle de l'avancement des campagnes
- Les alertes sont génériques (hardcodées) sans lien vers les données réelles

**Impact RH:**
- Le RH ouvre le dashboard mais ne peut **pas évaluer son charge de travail réelle**
- Impossible de savoir d'un coup d'œil : combien d'évals attendent sa signature, combien sont expirées, quelle est l'urgence

**Exemple concret:**
```
Dashboard montre :
- "Évals à signer : 0"
- Puis va à /evaluations et voit 47 évaluations "signed_manager" (attendant signature RH)
⟹ Contradiction totale. Le RH perd confiance.
```

**Recommandation P0:**
- ✅ Hydrater les KPIs avec des données réelles
- ✅ Compter les évals par statut : `signed_manager`, `expired`, `submitted`
- ✅ Afficher la date d'urgence la plus proche

---

### 2. **Évaluations : Absence de filtrage par urgence** [CRITIQUE]

**Observation:**
- Page `/evaluations` liste toutes les évals sans hiérarchisation
- Status filter existe mais pas de **filtrage temporel** (expirée, deadline proche)
- L'RH doit scanner manuellement 100+ lignes pour identifier les urgences
- Statuts multiples (assigned, in_progress, submitted, signed_manager, expired, etc.) → confusion

**Impact RH:**
- **Risque de non-respect des deadlines** : Les évals expirées se perdent dans la liste
- Impossible de différencier "urgent" de "normal"
- Manque de **filtres pertinents au métier RH**

**Exemple de workflow attendu:**
```
RH arrive à la page Évaluations
→ Voit immédiatement : "3 évaluations EXPIRÉES" (badge rouge)
→ Clique sur "Afficher seulement urgentes"
→ Voit un sous-ensemble limité et actionnable
```

**Ce qui se passe réellement:**
```
RH arrive à la page Évaluations
→ Voit 247 évaluations avec statuts mixtes
→ Doit utiliser le filtre status mais plusieurs statuts possibles
→ Temps perdu, frustration
```

**Recommandation P0:**
- ✅ Ajouter un filtrage temporel : "Expired", "Deadline J-3", "Deadline J-7"
- ✅ Ajouter un bouton rapide : "Urgences RH" qui pré-filtre les évals expirées + deadline proche
- ✅ Coloration du texte du statut (rouge pour expired, orange pour deadline proche)

---

### 3. **Campagnes : Absence de suivi visual de progression** [CRITIQUE]

**Observation:**
- Chaque campagne affiche une **barre de progression hardcodée à 0%**
  ```tsx
  style={{ width: '0%' }}  // Toujours 0% !
  ```
- Le RH ne sait pas : combien ont participé, combien ont complété, quel est le taux de réponse
- Les alertes "Deadlines proches (J-3)" sont statiques, pas basées sur les données réelles

**Impact RH:**
- Le RH ne peut **pas suivre l'avancement en temps réel**
- Ne peut pas identifier les **goulots d'étranglement**
- Les rappels groupés (HrSettingsPage) manquent de contexte → "À qui envoyer des rappels ?"

**Recommandation P0:**
- ✅ Calculer le taux de completion : `(responses / total_users) * 100`
- ✅ Afficher : "Paris: 45/120 (37%)" avec code couleur (rouge <50%, orange 50-75%, vert >75%)
- ✅ Ajouter des KPIs au niveau campagne : participation par département, par statut

---

### 4. **Demandes RH (Flags) : Workflow incomplet** [CRITIQUE]

**Observation:**
- La page HrFlagsPage affiche les demandes (mobilité, augmentation, promotion, formation)
- **Statuts possibles** : pending, in_progress, treated, rejected
- **Pas de workflow guidé** : Le RH change le statut mais pas d'étapes claires
- Les commentaires/notes ne sont pas persistants ou visibles dans la liste
- **Pas de priorité** : Toutes les demandes semblent égales

**Impact RH:**
- Le RH traite les demandes comme une simple checklist
- Pas de **SLA ou deadline visible** pour chaque demande
- Pas de **escalade** si demande est stuck "in_progress" depuis 10 jours
- Les employés ne savent pas où en est leur demande (pas de vue employé visible)

**Recommandation P0:**
- ✅ Ajouter un champ "Date deadline" pour chaque flag
- ✅ Ajouter un badge rouge si "in_progress" depuis >7 jours
- ✅ Ajouter une colonne "Commentaire interne" (non visible à l'employé) + "Message à l'employé"
- ✅ Ajouter un historique des changements de statut

---

## 🟠 P1 — Frictions importantes

### 5. **Navigation : Évaluations dispersées entre deux sections** [FRICTION]

**Observation:**
- Menu navbar pour HR :
  ```
  Collaborateurs
    ├─ Utilisateurs
    ├─ Organigramme
    └─ Offboarding
  
  Campagnes
    ├─ Campagnes
    └─ Formulaires
  
  Évaluations
    ├─ Toutes les évaluations
    ├─ Historique
    └─ Demandes RH [SÉPARÉ DU CONTEXTE]
  
  Paramètres
    ├─ Paramètres RH
    ├─ Journal d'audit
    ├─ Utilisateurs (import)
    ├─ Import formulaires
    └─ Email templates
  ```
- "Demandes RH" est mélangée dans "Évaluations" alors que c'est un workflow différent
- Les "Paramètres" contiennent à la fois du config système et du rappels groupés (contextes différents)

**Impact RH:**
- **Information scattering** : Le RH doit chercher partout
- Pas d'accès rapide aux tâches quotidiennes
- Les "Email templates" et "Import formulaires" n'intéressent que l'admin, pas l'HR opérationnel

**Recommandation P1:**
```
Navigation restructurée :

Tableau de bord

Campagnes & Évaluations
  ├─ Campagnes actives
  ├─ Toutes les évaluations
  ├─ Historique
  └─ Formulaires

Collaborateurs
  ├─ Annuaire
  ├─ Organigramme
  └─ Offboarding

Demandes RH  [SECTION DÉDIÉE]
  ├─ Demandes (mobilité, augmentation, etc.)
  └─ Traçabilité

Configuration
  ├─ Rappels automatiques
  ├─ Paramètres campagnes
  ├─ Journal d'audit
  └─ (Admin only) Import utilisateurs
```

---

### 6. **Absence de raccourcis vers les actions les plus fréquentes** [FRICTION]

**Observation:**
- Dashboard ne propose que "+ Nouvelle campagne" et "Exporter PDF (désactivé)"
- Pas de raccourci pour :
  - "Envoyer des rappels" (action très fréquente)
  - "Signer les évaluations en attente"
  - "Voir les flags urgents"
- Le RH doit naviguer : Dashboard → Évaluations → filter → select → signer

**Impact RH:**
- Actions répétitives deviennent trop coûteuses en clics
- Temps perdu

**Recommandation P1:**
- ✅ Ajouter une section "Actions rapides" au dashboard avec 3-4 boutons contextuels
- ✅ Exemple :
  ```
  Actions rapides :
  📝 Signer 3 évaluations
  🔔 Envoyer rappels (47 destinataires)
  ⚠️ Voir flags urgentes (2)
  📋 Voir évaluations expirées (1)
  ```

---

### 7. **Pages d'Administration mélangées avec opérationnel** [FRICTION]

**Observation:**
- HrSettingsPage mélange :
  - Rappels groupés (opérationnel, fréquent)
  - Paramètres campagnes (configuration, rare)
- AdminUsersPage : import utilisateurs (admin only, pas HR)
- AdminFormsPage : import formulaires (admin only, pas HR)

**Impact RH:**
- L'HR voit trop de boutons non pertinents
- Les vrais paramètres métier sont perdus dans du config système

**Recommandation P1:**
- ✅ Créer une page "Rappels & Communication" dédiée au workflow RH
- ✅ Isoler l'import utilisateurs/formulaires dans une section "Admin uniquement"

---

### 8. **Statuts d'évaluation : Trop nombreux et peu clairs** [FRICTION]

**Observation:**
- 10 statuts possibles :
  ```
  assigned, in_progress, submitted, reviewed, 
  signed_evaluatee, signed_manager, signed_hr, 
  validated, expired, archived
  ```
- Le RH doit mémoriser la **séquence logique**
- Pas de **guidage visuel** : quels statuts sont "à traiter en priorité"
- Le filtre "Status" propose tous les statuts → trop de choix

**Impact RH:**
- Cognitive overload
- Impossible d'identifier rapidement l'étape suivante

**Recommandation P1:**
```
Regrouper les statuts au niveau UI :

🟡 À TRAITER (5)
├─ assigned (1)
├─ in_progress (2)
└─ submitted (2)

🟠 EN SIGNATURE (3)
├─ signed_evaluatee (2)
└─ signed_manager (1)

⚠️ BLOCAGES (1)
├─ expired (1)

✅ TERMINÉES (10)
├─ validated (10)

📦 ARCHIVÉES (5)
```

---

## 🟡 P2 — Améliorations mineures

### 9. **UsersPage : Pas de vue "managériale" pour l'HR** [MINOR]

**Observation:**
- La page affiche tous les collaborateurs en une liste plate
- Pas de filtering par "qui rapporte à quel manager" pour l'HR
- Pas d'indicateur de "données complètes" (profil 100% rempli?)

**Recommandation P2:**
- ✅ Ajouter un filtre "Manager" pour contextualiser
- ✅ Ajouter une colonne "Complétude du profil" (icône d'info)

---

### 10. **FormsPage : Pas de lien direct vers les évaluations utilisant chaque form** [MINOR]

**Observation:**
- La page liste les formulaires mais pas de contexte d'utilisation
- Le RH ne sait pas : "Combien de réponses pour ce formulaire? Qui ne l'a pas complété?"

**Recommandation P2:**
- ✅ Ajouter une colonne "Usage" : "45 évals en cours (15 soumises)"
- ✅ Cliquer sur le nombre pour voir les évaluations

---

### 11. **OrgPage : Pas d'intégration dans le workflow RH** [MINOR]

**Observation:**
- L'organigramme existe mais est très séparé du workflow
- Pas de lien direct : "Voir l'équipe de ce manager" depuis la page Évaluations

**Recommandation P2:**
- ✅ Ajouter un lien rapide dans les filtres "Évaluations" : "Filtrer par équipe"

---

### 12. **Offboarding : Pas visible dans le flow habituel** [MINOR]

**Observation:**
- Il existe une route `/offboarding` (mention dans la navbar)
- Mais absence de **visibilité** : Les offboardings actifs ne sont pas dans le dashboard
- Le RH découvre cet outil par hasard

**Recommandation P2:**
- ✅ Ajouter un KPI au dashboard "Offboardings en cours"
- ✅ Vérifier que la page elle-même fonctionne correctement

---

## ✅ Points positifs

### Éléments bien pensés

1. **Authentification claire**
   - ✅ Validation des champs en temps réel
   - ✅ Messages d'erreur explicites (401, 429, 403)
   - ✅ Option LDAP intégrée naturellement

2. **Navbar responsive et bien structurée**
   - ✅ Menu desktop ET mobile
   - ✅ Notifications avec compteur
   - ✅ Profil utilisateur accessible

3. **Pagination intelligente**
   - ✅ Utilisation de React Query pour les états de chargement
   - ✅ Placeholder data smooth

4. **Granularité des actions**
   - ✅ Bulk archive, bulk sign, assign/reassign
   - ✅ Actions contextuelles (dropdown menus)

5. **Filtrage multi-critères**
   - ✅ Status, campaign, department, search
   - ✅ Débouncing du search

6. **Color coding et badging**
   - ✅ Les status badges sont visuellement différenciés
   - ✅ Alertes avec icônes (error, warning)

7. **Modales confirmations**
   - ✅ Présent pour les actions destructives

---

## 📊 Matrice Critères vs Pages

| Critère | Login | Dashboard | Évals | Campagnes | Flags | Utilisateurs | Forms | Org | Paramètres |
|---------|-------|-----------|-------|-----------|-------|--------------|-------|-----|-----------|
| **Infos clés visibles?** | ✅ | 🔴 | 🟠 | 🟠 | 🟡 | ✅ | ✅ | ✅ | 🟡 |
| **Suivi avancement?** | — | 🔴 | 🟠 | 🔴 | 🟠 | — | — | — | — |
| **ID urgences rapide?** | — | 🔴 | 🔴 | 🔴 | 🟠 | — | — | — | — |
| **Workflow fluide?** | ✅ | 🟠 | 🟠 | 🟠 | 🔴 | 🟡 | ✅ | 🟡 | 🟠 |
| **Raccourcis tâches?** | — | 🔴 | — | 🟠 | 🟠 | — | — | — | 🟠 |

**Légende:** ✅ Bon | 🟡 Acceptable | 🟠 Problématique | 🔴 Critique

---

## 🎯 Recommandations prioritaires

### Phase 1 (Urgent - 1-2 sprints)
1. **Hydrater le Dashboard RH** avec vraies données (KPIs, alertes réelles)
2. **Ajouter urgence visuelle** aux évaluations (expired badge rouge, deadline J-3)
3. **Créer une page "Urgences RH"** (1 clic depuis navbar) regroupant :
   - Évals expirées
   - Évals deadline J-3
   - Flags urgentes
   - Offboardings en cours

### Phase 2 (Important - 2-3 sprints)
4. **Restructurer navigation** HR (regrouper logiquement, enlever noise admin)
5. **Ajouter actions rapides** au dashboard
6. **Compléter workflow flags** (deadline, escalade, historique)
7. **Ajouter filtres temporels** aux listes (expired, deadline J-3, date range)

### Phase 3 (Souhaitable - 3+ sprints)
8. **Intégrer organigramme** dans le contexte (filtrer par équipe, etc.)
9. **Ajouter "Voie rapide RH"** pour les tâches répétitives
10. **Dashboard Directeur** (vue agrégée de toutes les campagnes)

---

## 📈 Métriques à suivre

Pour valider l'amélioration du parcours RH :

1. **Temps moyen pour signer une évaluation** (avant: ?, après: <2min)
2. **Taux d'évaluations expirées** (cible: <2%)
3. **Temps moyen de résolution d'un flag** (cible: <48h pour pending)
4. **Satisfaction utilisateur RH** (Net Promoter Score avant/après)
5. **Nombre de clics pour compléter une action RH** (cible: -30%)

---

## 🔍 Conclusion

Le système NX-RH **fonctionne techniquement** mais **l'UX du RH est fragmentée**. Les données existent, mais ne sont pas mises en scène pour la **prise de décision rapide et la priorisation**. 

Le RH opérationnel ressent :
- ❌ Manque de **clarté** (quoi faire maintenant?)
- ❌ Manque de **guidance** (dans quel ordre?)
- ❌ Manque de **contexte** (pourquoi c'est urgent?)
- ❌ Manque de **réactivité** (trop de clics)

**Les changements recommandés transformeraient NX-RH de "système complet mais contre-intuitif" à "plateforme ergonomique pour RH."**

Target score après recommandations P0+P1 : **8.5/10**
