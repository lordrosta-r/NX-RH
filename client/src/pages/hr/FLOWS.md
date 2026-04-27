# NanoXplore RH — Flows de navigation RH (à valider)

> Ce fichier décrit les parcours complets d'un utilisateur RH dans l'application.
> Il est la base de discussion avant toute correction fonctionnelle.
> **Légende** : ✅ fonctionnel | ⚠️ partiel | ❌ absent/cassé

---

## Flow 1 — Créer un formulaire d'évaluation

**Objectif** : construire le questionnaire utilisé par les employés et managers.

```
/hr/templates
  → [+ Nouveau modèle]
  → Modale : titre + description → POST /api/forms
  → Carte créée dans la liste

→ [Éditer] sur la carte
  → /hr/templates/:id/builder  (FormBuilder)
  → Ajouter des blocs (texte, note 1-5, choix multiple, météo, mobilité…)
  → Chaque bloc : label, description, obligatoire, phase (auto/n-1/objectifs…)
  → Glisser-déposer pour réordonner
  → [Enregistrer] → PATCH /api/forms/:id
  → Toast "Sauvegardé"

→ Retour /hr/templates (modèle statut "Libre")
```

**État actuel** : ⚠️ Le FormBuilder sauvegarde bien mais son design ne correspond pas
au fichier `designs/formcreator.html` (badges numérotés, aperçu visuel, grille de types).
**À corriger** : refonte visuelle du FormBuilder selon le design fourni.

---

## Flow 2 — Créer et lancer une campagne

**Objectif** : ouvrir un cycle d'évaluation pour tout ou partie de l'entreprise.

```
/hr/campaigns
  → [+ Nouvelle campagne]
  → /hr/campaigns/new (wizard 5 étapes)
      Étape 1 : nom, description, dates début/fin
      Étape 2 : cibler les départements (ou preset : Tous / CDI > 6 mois / Managers)
      Étape 3 : import historique N-1 (optionnel)
      Étape 4 : deadline employé, deadline manager, notif 48h avant
      Étape 5 : résumé → [Lancer la campagne]
  → POST /api/campaigns (status: 'active')
  → Retour /hr/campaigns (carte "Active")
```

**État actuel** : ✅ fonctionnel bout en bout.
**Manque** : pas de prévisualisation du formulaire dans le wizard.

---

## Flow 3 — Assigner des évaluations à une campagne

**Objectif** : créer les paires évalué/évaluateur pour une campagne.

```
/hr/campaigns → [Voir] sur une campagne active
  → /hr/campaigns/:id
  → [Assigner des évaluations]
      Sélectionner le modèle de formulaire (liste des forms "Libres")
      Sélectionner les paires évalué → évaluateur (liste employees/managers)
      → POST /api/evaluations (création en masse)
  → Tableau mis à jour avec les nouvelles évaluations
  → Taux de complétion mis à jour en temps réel
```

**État actuel** : ⚠️ Assignation possible MAIS les questions du formulaire sélectionné
**ne s'affichent pas** dans EvaluationForm.jsx (utilise encore MOCK_PHASES comme fallback).
**À corriger** : connecter EvaluationForm aux vraies questions du formulaire.

---

## Flow 4 — Suivre l'avancement d'une campagne

**Objectif** : voir qui a rempli quoi, relancer si besoin.

```
/hr/campaigns/:id
  → Indicateurs : complétion globale %, nb signé, nb en cours, nb en attente
  → Tableau des évaluations : évalué, évaluateur, statut, progression
  → [Réaffecter] sur une ligne → ReassignModal → PATCH /api/evaluations/:id/reassign
  → [Éditer la campagne] : nom, dates, départements (si statut draft)
  → [Clore la campagne] → status 'closed'
  → [Supprimer] (si draft ou closed) → DELETE /api/campaigns/:id (avec cascade)
```

**État actuel** : ✅ fonctionnel. Le suivi en temps réel fonctionne.

---

## Flow 5 — Traiter les contestations et demandes

**Objectif** : gérer les signalements d'employés (désaccord, mobilité, augmentation).

```
/hr/requests → onglet "Contestations"
  → Liste des évals avec disagreementFlag = true
  → Ligne : nom évalué, nom évaluateur, campagne, motif (evaluateeComment)
  → [Signer RH] : valide et clôture → PATCH /api/evaluations/:id { action: 'sign_hr' }
  → [Ignorer]   : retire le flag
  → [Réaffecter] : ouvre ReassignModal

/hr/requests → onglet "Mobilité / Augmentations"
  → Filtré sur les réponses contenant des demandes (fragile — à améliorer)
```

**État actuel** : ⚠️ Contestations OK. Onglet Mobilité/Augmentations fragile (filtre sur texte libre).

---

## Flow 6 — Actions en masse

**Objectif** : signer ou archiver des dizaines d'évaluations en une action.

```
/hr/requests → onglet "Toutes les évaluations"
  → Filtrer par statut ("reviewed", "submitted"…)
  → Cocher une sélection ou "Tout sélectionner"
  → [Signer RH]  → PATCH /api/evaluations/bulk { action: 'sign_hr', ids: [...] }
  → [Archiver]   → PATCH /api/evaluations/bulk { action: 'archive', ids: [...] }
  → [Réaffecter en masse] → modal → PATCH /api/evaluations/bulk { action: 'assign_reviewer' }
  → Toast : "N évaluations modifiées, M ignorées"
```

**État actuel** : ✅ fonctionnel (limite 200/batch).

---

## Flow 7 — Analytics et reporting

**Objectif** : produire des tableaux de bord pour la direction.

```
/hr/analytics
  → Onglet Flight Risk    : employés à risque de départ (score calculé sur critères multiples)
  → Onglet Goal Gap       : écart objectifs fixés vs atteints
  → Onglet Skills Gap     : compétences sous-évaluées par département
  → Onglet Sentiment      : tendance globale (NPS interne)
  → Onglet 9-Box          : matrice performance × potentiel

  → Filtres : département, période, campagne
  → [Exporter CSV] → GET /api/evaluations/export → téléchargement direct
```

**État actuel** : ✅ données réelles (calcul depuis /api/evaluations + /api/campaigns).
**Manque** : export PDF absent. Filtres partiellement connectés (département OK, période ⚠️).

---

## Flow 8 — Gérer l'annuaire

**Objectif** : consulter et filtrer l'ensemble des employés.

```
/hr/directory
  → Recherche par nom, poste, département
  → Fiche employé : info RH + historique des évaluations + documents
  → Lien vers /admin/users pour modifications (si rôle admin)
```

**État actuel** : ✅ lecture fonctionnelle. Modifications via /admin/users (rôle admin requis).

---

## Flow 9 — Gérer les ressources

**Objectif** : publier des documents RH (guides, chartes, politiques).

```
/hr/resources
  → [+ Ajouter une ressource] → titre, type, URL → POST /api/resources
  → Liste avec filtre par type (PDF, lien, vidéo…)
  → [Ouvrir] → ouvre le lien dans un nouvel onglet
  → [Supprimer] → DELETE /api/resources/:id
```

**État actuel** : ✅ CRUD complet fonctionnel.

---

## Flow 10 — Préférences et intégrations (via Admin)

**Objectif** : configurer les notifications, LDAP, emails.

```
/admin/integrations
  → Section LDAP : hôte, port, DN, test connexion → POST /api/admin/ldap/test
  → Prévisualisation utilisateurs LDAP → POST /api/admin/ldap/preview
  → Synchronisation → POST /api/admin/ldap/sync
  → Section Email : test d'envoi → POST /api/admin/email/test
```

**État actuel** : ⚠️ UI connectée, backend LDAP présent mais non testé en prod.

---

## Flow 11 — Offboarding (départ employé)

**Objectif** : gérer les départs proprement (archivage évals, audit).

```
/admin/users
  → Trouver l'employé → [Départ]
  → Étape 1 : aperçu (N évals en cours, campagnes concernées)
  → Étape 2 : raison de départ + date effective → PATCH /api/users/:id/offboard
  → Évaluations en cours archivées automatiquement
  → Entrée dans l'AuditLog
```

**État actuel** : ✅ fonctionnel (rôle admin requis).

---

## Flow 12 — Piste d'audit

**Objectif** : tracer qui a fait quoi et quand (signature, archivage, réaffectation).

```
/admin/audit
  → Tableau des événements : type, utilisateur, cible, date, métadonnées
  → Filtres : type d'action, utilisateur, plage de dates
  → Rétention 2 ans (TTL MongoDB)
```

**État actuel** : ✅ fonctionnel pour les événements d'évaluations et campagnes.

---

## Points de friction identifiés (à corriger ensemble)

| # | Problème | Impact | Priorité |
|---|---|---|---|
| 1 | EvaluationForm utilise MOCK_PHASES au lieu des questions du FormBuilder | Critique — le cœur du produit | 🔴 |
| 2 | FormBuilder design ne correspond pas à `formcreator.html` | UX dégradée, confusion des types | 🟡 |
| 3 | Onglet Mobilité/Augmentations : filtre fragile sur texte libre | Fonctionnellement vide | 🟡 |
| 4 | Export PDF absent | Direction ne peut pas imprimer | 🟡 |
| 5 | Filtres Analytics : période non connectée | Tableaux de bord figés dans le temps | 🟡 |
| 6 | Pas de prévisualisation du formulaire avant lancement campagne | RH ne voit pas ce que l'employé verra | 🟠 |
| 7 | Pas de relance email depuis l'interface | RH doit relancer manuellement | 🟠 |
