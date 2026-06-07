# NanoXplore RH — Backlog des features à tester

> Liste de tests fonctionnels organisée par **domaine**, **rôle** et **cycle de vie**.
> Statut : ☐ à tester · ☑ couvert (e2e/unit) · ⚠ point d'attention connu.
> Convention de priorité : **P1** critique (bloque la livraison) · **P2** important · **P3** confort.

---

## 1. Authentification & sécurité

| # | Scénario | Rôle | Prio | Statut |
|---|----------|------|------|--------|
| A1 | Connexion locale email + mot de passe (cookie httpOnly + Secure) | tous | P1 | ☑ |
| A2 | Mauvais mot de passe → message clair, pas de fuite | tous | P1 | ☑ |
| A3 | Rate-limit login (5 essais / 15 min) → 429 | tous | P1 | ☑ |
| A4 | Mot de passe temporaire → changement forcé à la 1re connexion | tous | P1 | ☐ |
| A5 | Connexion LDAP/AD (test connexion, preview, sync) | admin | P1 | ⚠ à valider sur AD réel |
| A6 | Expiration de session → redirection /login (401 intercepteur) | tous | P2 | ☐ |
| A7 | Refresh token (secret distinct) → renouvellement transparent | tous | P2 | ☐ |
| A8 | Accès route non autorisée par rôle → /unauthorized (403) | tous | P1 | ☑ |
| A9 | Impersonation RH/admin **lecture seule** (invariant à ne jamais casser) | admin/hr | P1 | ☑ |
| A10 | Déconnexion → cookie purgé, retour /login | tous | P2 | ☑ |

## 2. Utilisateurs & organisation

| # | Scénario | Rôle | Prio | Statut |
|---|----------|------|------|--------|
| U1 | Création utilisateur (champs requis, email unique) + mdp temporaire affiché 1 fois | admin/hr | P1 | ☐ |
| U2 | Rattachement à un responsable direct (managerId) | admin/hr | P1 | ☐ |
| U3 | Anti-cycle hiérarchique (un user ne peut pas être son propre manager, ni boucler) | admin/hr | P1 | ☑ |
| U4 | Édition de fiche (rôle, département, poste) | admin/hr | P2 | ☐ |
| U5 | Annuaire : filtres rôle / département / recherche | admin/hr/manager | P2 | ☐ |
| U6 | Organigramme : arbre cohérent avec managerId | tous | P2 | ☐ |
| U7 | Lien « Voir dans l'organigramme » depuis la fiche | admin/hr | P3 | ☑ |
| U8 | Import en masse (CSV) avec whitelist de champs + mdp à changer | admin/hr | P1 | ⚠ M7 |
| U9 | Groupes d'utilisateurs (création, affectation) | admin/hr | P2 | ☐ |
| U10 | Départements : CRUD + propagation aux listes déroulantes | admin/hr | P2 | ☐ |

## 3. Formulaires

| # | Scénario | Rôle | Prio | Statut |
|---|----------|------|------|--------|
| F1 | Création formulaire (titre, catégorie, type, « rempli par ») | admin/hr | P1 | ☐ |
| F2 | Builder : ajout/édition/suppression de questions (rating, text, choice, yes_no, scale, weather, objective_item) | admin/hr | P1 | ☐ |
| F3 | Toggle « édition précédente » par question (carryPrevious) | admin/hr | P1 | ☐ |
| F4 | Visible par l'évalué / formulaire anonyme | admin/hr | P2 | ☐ |
| F5 | Gel du formulaire (frozenAt) après 1re évaluation → IDs questions figés | système | P1 | ☑ |
| F6 | Clone de formulaire (lignée parentQuestionId conservée) | admin/hr | P2 | ☐ |
| F7 | Import/export JSON | admin/hr | P3 | ☐ |
| F8 | Liaison formulaire ↔ campagne (formIds) | admin/hr | P1 | ☐ |

## 4. Campagnes

| # | Scénario | Rôle | Prio | Statut |
|---|----------|------|------|--------|
| C1 | Wizard création (infos → formulaires → public cible → récap) | admin/hr | P1 | ☐ |
| C2 | Périmètre : Tous / Rôle / Département / Secteur / Groupe / Utilisateurs | admin/hr | P1 | ☐ |
| C3 | Génération des évaluations pour la population ciblée | admin/hr | P1 | ☐ |
| C4 | Cycle de vie draft → active → closed → archived (transitions valides) | admin/hr | P1 | ☑ |
| C5 | Contexte « édition précédente » (previousCampaignId, auto-détection) | admin/hr | P1 | ☐ |
| C6 | Clone de campagne d'une année sur l'autre (historique) | admin/hr | P2 | ☐ |
| C7 | Échéances employé / manager + rappels | admin/hr | P2 | ☐ |
| C8 | Visibilité étendue manager (équipes des sous-managers) | admin/hr | P2 | ☑ |
| C9 | Analytics campagne (taux de complétion, répartition) | admin/hr/manager | P2 | ☐ |

## 5. Évaluations (remplissage)

| # | Scénario | Rôle | Prio | Statut |
|---|----------|------|------|--------|
| E1 | Remplissage auto-évaluation (sauvegarde auto, assigned → in_progress) | employé | P1 | ☐ |
| E2 | Affichage de la réponse sur son échelle (rating/scale/weather) | employé | P2 | ☐ |
| E3 | Panneau « édition précédente » inline (accordéon) | employé/manager | P1 | ☐ |
| E4 | Soumission (verrouillage des réponses) | employé | P1 | ☑ |
| E5 | Revue manager (commentaire, score optionnel) | manager | P1 | ☐ |
| E6 | Transitions (submit, sign, validate, transition) | manager/hr | P1 | ☑ |
| E7 | Signature employé depuis sa fiche | employé | P1 | ☐ |
| E8 | Export PDF de l'évaluation | tous | P3 | ☐ |
| E9 | Historique des évaluations | tous | P2 | ☐ |

## 6. Entretien

| # | Scénario | Rôle | Prio | Statut |
|---|----------|------|------|--------|
| I1 | Ouverture entretien depuis « à traiter » / fiche éval / fiche collaborateur | manager | P1 | ☑ |
| I2 | Échange par question (commentaire employé + manager + position retenue) | manager | P1 | ☐ |
| I3 | Revue des objectifs N-1 (achieved / partial / not_achieved) | manager | P1 | ☐ |
| I4 | Fixation des objectifs N+1 | manager | P1 | ☐ |
| I5 | Synthèse (placeholder d'exemple) | manager | P2 | ☐ |
| I6 | Signature manuscrite manager (souris/canvas) → avance le statut | manager | P1 | ☐ |
| I7 | Marquer un désaccord → litige (status disputed) | manager | P1 | ☐ |
| I8 | Garde-fou : entretien sans campagne/collaborateur → message clair | manager | P2 | ☑ |
| I9 | Sécurité : signature dérivée de l'identité de l'appelant (pas du body) | système | P1 | ☑ C2 |
| I10 | Double flux de signature (manager dans l'entretien, employé sur sa fiche) | manager+employé | P1 | ☐ |

## 7. PDI, mobilité, demandes, flags RH

| # | Scénario | Rôle | Prio | Statut |
|---|----------|------|------|--------|
| P1 | Création PDI (RBAC : admin/hr OU manager direct se désignant) | manager/hr | P1 | ☑ C1 |
| P2 | Suivi/édition d'un PDI | manager/hr | P2 | ☐ |
| P3 | Demandes de mobilité / promotion / formation / augmentation | employé | P2 | ☐ |
| P4 | Flags RH (création, traitement) | admin/hr | P2 | ☐ |
| P5 | Espace manager « à traiter » (cartes par collaborateur) | manager | P1 | ☐ |

## 8. Administration & intégrations

| # | Scénario | Rôle | Prio | Statut |
|---|----------|------|------|--------|
| AD1 | Config LDAP : validation Zod/Joi, test connexion, preview, sync | admin | P1 | ☐ |
| AD2 | Upload certificat SSL (validation crypto clé/cert, expiration) | admin | P1 | ☐ |
| AD3 | Config SMTP (validation, preset OVH, email de test) | admin | P1 | ☐ |
| AD4 | Setup wizard « State Zero » (bannière config initiale incomplète) | admin | P2 | ☐ |
| AD5 | Audit log (création campagne, transitions, etc.) | admin/hr | P2 | ☐ |
| AD6 | /api/health public minimal + /api/health/detail admin (M9) | système | P2 | ☑ |
| AD7 | Templates d'emails | admin/hr | P3 | ☐ |
| AD8 | Notifications in-app (cloche, non-lues) | tous | P2 | ☑ |

## 9. Cycles de vie (scénarios transverses) — **à éprouver pendant le peuplement 120**

| # | Scénario | Attendu | Prio |
|---|----------|---------|------|
| L1 | **Nouvel arrivant en cours de campagne** | Re-génération / assignation de son évaluation | P1 |
| L2 | **Départ d'un collaborateur (offboarding)** | Archivage, évaluations en cours gérées, retrait de l'organigramme | P1 |
| L3 | **Départ d'un manager** | Réaffectation des subordonnés à un nouveau manager, visibilité recalculée | P1 |
| L4 | **Changement de poste / département** | Fiche mise à jour, impact sur ciblage des futures campagnes | P2 |
| L5 | **Changement de manager** | managerId mis à jour, anti-cycle respecté, entretien suit la nouvelle hiérarchie | P1 |
| L6 | **Échéance dépassée** | Statut d'expiration, rappels | P2 |
| L7 | **Litige d'entretien** | Bascule en disputed, suivi RH | P1 |
| L8 | **Historique pluriannuel** | « Édition précédente » remonte la réponse N-1 (campagnes clonées d'année en année) | P1 |

## 10. Non-fonctionnel

| # | Scénario | Prio |
|---|----------|------|
| N1 | Thème clair/sombre persistant (anti-flash) | P3 |
| N2 | i18n FR/EN | P3 |
| N3 | Accessibilité (aria-labels, navigation clavier) | P2 |
| N4 | Responsive (mobile/tablette) | P2 |
| N5 | Performance liste 120 users / 10 campagnes | P2 |
| N6 | Boot guards prod (secrets faibles refusés, E2E_MODE interdit) | P1 ☑ |

---

### Couverture e2e existante (frontend-v2/e2e/)
~30 specs Playwright : `auth`, `admin-user-lifecycle`, `ldap-config`, `visual-ux-audit`, `workflow-onboarding`, `workflow-admin-setup`, `smoke`, etc.
**Manques principaux à compléter** : entretien complet + désaccord (I2–I7), double signature (I10), remplissage employé bout-en-bout (E1–E7), wizard campagne (C1–C3), cycles de vie L1–L8.
