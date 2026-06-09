# NanoXplore RH

Plateforme interne de gestion des **entretiens professionnels et du développement des collaborateurs**. Elle remplace les tableurs dispersés et les fils d'e-mails par un outil unique, conscient des rôles, qui accompagne chaque acteur — employé, manager, RH, administrateur — tout au long du cycle annuel d'évaluation.

Le pari produit : l'entretien est un **dialogue outillé**, pas un barème. Il n'y a pas de note globale.

---

## Fonctionnalités principales

- **Campagnes d'évaluation** — création, ciblage des participants par rôle, planification des échéances, tableau de bord analytique.
- **Constructeur de formulaires par glisser-déposer** — auto-évaluation, grille manager, feedback ascendant, objectifs, mobilité. Les formulaires sont réutilisables d'une campagne à l'autre.
- **Remplissage des évaluations avec contexte N-1** — les réponses de la campagne précédente s'affichent en ligne, question par question.
- **Entretiens managériaux** — échange structuré, saisie des objectifs, synthèse, double signature électronique, flux de désaccord/litige.
- **Plans de développement individuel (PDI)** — suivi des objectifs personnels et des actions de développement dans le temps.
- **Demandes de mobilité interne** — accessible à tous les collaborateurs authentifiés.
- **Synchronisation LDAP** — plusieurs annuaires, attribut manager pour la hiérarchie, aucun compte orphelin.
- **Gestion des comptes** — blocage / déblocage / suppression, exclusion réversible des comptes système.
- **Espace documents** — la RH publie des documents téléchargeables pour l'ensemble des collaborateurs.
- **Organigramme interactif plein écran** — visualisation de la hiérarchie.
- **Contrôle d'accès basé sur les rôles (RBAC)** — quatre rôles : employé, manager, RH, administrateur. Mode impersonation en lecture seule pour le support.
- **Interface bilingue** — français / anglais, détection automatique.
- **Configuration depuis l'interface** — LDAP, SMTP, certificat SSL, logo, modèles d'e-mails.

---

## Stack en bref

| Couche | Technologies |
|--------|--------------|
| Frontend | React 19, TypeScript, Vite, React Router v6, TanStack Query v5, Tailwind CSS v3 |
| Backend | Node.js 20, Express 4, MongoDB 7, Mongoose 8 |
| Auth | JWT dans des cookies httpOnly, LDAP (ldapjs) |
| Infrastructure | Nginx 1.27 (TLS), Docker multi-stage, Docker Compose, GitHub Actions |
| Tests | Vitest + Testing Library, Playwright, Jest + Supertest |

---

## Navigation du wiki

### Demarrer

- [[Installation]] — mise en place initiale pas à pas
- [[Configuration]] — LDAP, SMTP, certificat SSL, logo depuis l'interface
- [[Deploiement]] — guide de déploiement en production (Docker)
- [[Mise-a-jour]] — procédure de mise à jour et rollback

### Technique

- [[Architecture]] — vue d'ensemble du système, frontend, backend, flux de requêtes
- [[Stack-Technique]] — choix technologiques et justifications
- [[Securite]] — JWT, RBAC, impersonation, garde-fous au démarrage
- [[Roles-et-RBAC]] — qui peut faire quoi (matrice des rôles et des routes)
- [[CI-CD]] — pipeline GitHub Actions : CI, CD, audit de sécurité, releases
- [[QA-et-Tests]] — stratégie de tests, backlogs par rôle, harness automatisé
- [[Reprise-developpeur]] — comment reprendre le projet, conventions, principes KISS

### Metier

- [[Campagnes-et-Evaluations]] — cycle de vie complet d'une campagne, machine d'états des évaluations
- [[Gestion-des-comptes]] — bloquer / débloquer / supprimer, comptes système, import LDAP
- [[Guide-Utilisateur]] — guide d'utilisation par rôle

### Exploitation

- [[Sauvegarde-Restauration]] — procédures de sauvegarde et de restauration MongoDB
- [[Depannage]] — problèmes courants et solutions

### Reference

- [[FAQ]] — questions fréquentes
- [[Glossaire]] — termes métier définis
- [[Licence]] — logiciel propriétaire NanoXplore (conditions d'utilisation)
