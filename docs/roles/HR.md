# Rôle — HR (Ressources Humaines)

## Qui est-il ?

Le rôle HR est **transverse** — il n'est pas dans la ligne hiérarchique managériale. RH ne manage pas d'équipe, ne conduit pas d'entretiens. Il est le **pilote du processus** : il conçoit les formulaires, orchestre les campagnes et dispose d'une vue globale sur toute l'organisation.

**Redirection après connexion :** `/manager` (tableau de bord RH)

---

## Position dans la hiérarchie

```
         [ Admin ]          ← configuration système
             │
           [ HR ]           ← pilotage du processus (transverse)
             │
     ┌───────┴────────┐
 [Director]       [Director]
     │
  [Manager]  [Manager]
     │
 [Employee] [Employee]
```

HR voit toute l'organisation en **lecture** pour piloter les campagnes. Il n'est pas le supérieur hiérarchique des managers — il coordonne le processus.

---

## Navigation — Sidebar HR

| Item | Route | Description |
|---|---|---|
| Vue d'ensemble | `/hr` | Dashboard principal — KPIs, campagne, alertes, aperçu rapide |
| Campagnes | `/hr#campaigns` | Créer, activer, clore les campagnes |
| Éditeur de formulaires | `/hr#formeditor` | Créer et publier les templates de formulaires |
| Ressources | `/hr#resources` | Bibliothèque de documents publiés aux employés |
| Rapports | `/hr#reports` | Exports CSV, synthèses par département |
| Paramètres | `/hr#settings` | — |

> **Note :** L'Éditeur de formulaires et les Ressources sont aussi accessibles en **accès rapide** depuis la Vue d'ensemble (widgets de la page home).

---

## Étape 0 : Créer des templates de formulaires

Avant de pouvoir créer une campagne, HR doit disposer d'au moins un template publié.

### Qu'est-ce qu'un template ?

Un template est un **modèle de formulaire réutilisable** qui définit :
- Le type de formulaire (`self_evaluation`, `manager_evaluation`, etc.)
- Les sections et questions
- Le type de réponse attendu (texte libre, note sur 5, choix multiple, objectif SMART…)
- Les champs obligatoires vs optionnels

### Créer un template

```
/manager → onglet "Templates"
  │
  ├─ Cliquer "Nouveau template"
  ├─ Nommer le template (ex : "Entretien annuel 2026 — Standard")
  ├─ Choisir le type de formulaire
  ├─ Ajouter les sections et questions
  ├─ Prévisualiser le rendu employé
  └─ Publier le template → disponible pour les campagnes
```

> Un template non publié (brouillon) n'est pas utilisable dans une campagne.

### Mettre les templates à disposition

Une fois publiés, les templates sont disponibles pour toutes les campagnes futures. Les managers les consultent mais ne peuvent pas les modifier.

---

## Étape 1 : Créer et lancer une campagne

> **Prérequis bloquant** : au moins un template publié doit exister. Sans template, le bouton "Nouvelle campagne" est désactivé avec le message : *"Créez d'abord un template de formulaire."*

### Créer une campagne

```
/manager → onglet "Campagnes"
  │
  ├─ Cliquer "Nouvelle campagne"
  ├─ Nommer la campagne (ex : "Entretiens annuels 2026")
  ├─ Définir les dates : ouverture des auto-évaluations, clôture des entretiens
  ├─ Sélectionner le ou les templates à associer
  ├─ Choisir le périmètre : toute l'organisation ou certains services
  └─ Activer → statut "active", notifications envoyées aux employés concernés
```

### Cycle de vie d'une campagne

```
draft → active → closed → archived
```

- **draft** : en cours de configuration, invisible pour les employés
- **active** : ouverte, les employés peuvent remplir leurs formulaires
- **closed** : plus de nouvelles soumissions, les managers finalisent les entretiens
- **archived** : données conservées en lecture seule

---

## Vue globale de tous les entretiens

HR a accès à un tableau de suivi complet :
- Liste de tous les employés de l'organisation + statut de leur évaluation
- Filtres : par service, par manager, par statut, par phase
- Indicateurs : taux de complétion global, entretiens en retard, validés
- Alertes : campagnes qui approchent de la clôture avec des évaluations non terminées

---

## Rapports et exports

- Export CSV/Excel de toutes les évaluations d'une campagne
- Rapport de synthèse par département ou équipe
- Historique des campagnes passées
- Vue des aspirations agrégées (pour anticiper les plans de formation)

---

## Ce que HR peut faire qu'un Manager ne peut pas

| Action | Manager | HR |
|---|---|---|
| Créer un template | — | ✓ |
| Publier un template | — | ✓ |
| Créer une campagne | — | ✓ |
| Voir toute l'organisation | — | ✓ (lecture) |
| Exporter les données | — | ✓ |
| Rouvrir une évaluation validée | — | ✓ |
| Clore une campagne manuellement | — | ✓ |

---

## Ce que HR ne peut PAS faire

- Modifier les évaluations des employés (lecture seule sauf réouverture)
- Conduire un entretien à la place d'un manager
- Gérer les utilisateurs, les rôles ou les accès (rôle Admin)
- Configurer LDAP, SMTP ou les paramètres système (rôle Admin)
- Voir les données hors de l'organisation (il n'y a qu'une instance = une org)
