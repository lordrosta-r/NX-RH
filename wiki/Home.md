# NanoXplore RH — Wiki

Plateforme interne d'**entretiens professionnels et de développement des collaborateurs**.
Pari produit : l'entretien est un **dialogue outillé**, pas un barème (pas de note globale).

## Démarrer ici

| Page | Contenu |
|------|---------|
| [Architecture](Architecture) | Stack, structure des dossiers, principes (SPA, KISS) |
| [Déploiement](Deploiement) | Mettre en prod en local/serveur (Docker), bootstrap admin |
| [Configuration](Configuration) | LDAP/AD, certificat SSL, SMTP — **tout depuis l'UI** |
| [Rôles & RBAC](Roles-et-RBAC) | Qui peut faire quoi (employé/manager/RH/admin) |
| [Gestion des comptes](Gestion-des-comptes) | Bloquer / débloquer / supprimer, comptes système |
| [QA & Tests](QA-et-Tests) | Backlogs par rôle + harness automatisé |
| [Reprise développeur](Reprise-developpeur) | Audit KISS : comment reprendre le projet |

## Concepts clés

- **Campagne** : un cycle RH (annuel le plus souvent). Conteneur de formulaires + périmètre + échéances. Lifecycle : `draft → active → closed → archived`.
- **Formulaire** : modèle de questions (auto-évaluation, manager, objectifs…). Réutilisable, lié à une campagne.
- **Évaluation** : instance d'un formulaire pour un collaborateur. Lifecycle strict : `assigned → in_progress → submitted → reviewed → signed_evaluatee → signed_manager → signed_hr → validated`.
- **Entretien** : vue qualitative en face-à-face (commentaires des deux côtés, position retenue, objectifs, synthèse, **signature manuscrite du manager**, marquage de **désaccord/litige**).
- **Édition précédente (N-1)** : rappel inline de la réponse de l'année dernière, par question (curé par la RH via `carryPrevious`).
- **Perspective** : un manager a deux casquettes (« Mon espace » / « Mon Équipe ») via un switch dans la barre de navigation.

## Stack en une ligne

Frontend **React + TypeScript** (Vite, React Router v6, TanStack Query v5, Tailwind) ·
Backend **Express + MongoDB/Mongoose** · Auth **JWT cookies httpOnly** + **LDAP/AD** ·
Déploiement **Docker** (nginx + app scalable + mongo).
