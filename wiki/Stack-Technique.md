# Stack technique

> Page de synthese en francais. Reference detaillee : `docs/STACK.md`.
> Voir aussi [[Architecture]].

---

## Principe directeur : K.I.S.S.

Chaque decision de ce projet a ete filtree par une seule question : **est-ce la chose la plus simple qui pourrait fonctionner ?**

Le parti pris est de privilegier des outils bien compris, bien documentes et maintenus par de grandes communautes, plutot que des alternatives theoriquement superieures mais moins matures. Les contraintes visibles dans la base de code (pas de Redux, pas de Zustand, pas de SSR, pas de framework CSS alternatif) ne sont pas des prohibitions arbitraires — elles sont le resultat d'un choix deliberement simple, puis maintenu contre la tendance a l'accumulation de complexite.

---

## 1. React 19 + TypeScript 6 + Vite 8

| Element | Choix |
|---------|-------|
| UI | React 19 |
| Langage | TypeScript 6 (strict) |
| Bundler | Vite 8 |

**Pourquoi React :** bibliotheque UI la plus adoptee dans l'industrie. Documentation exhaustive, communaute immense, modeles mentaux (composants, props, hooks) largement transferables.

**Pourquoi TypeScript :** les donnees RH — evaluations, cibles de campagne, visibilite par role — sont suffisamment complexes pour qu'une faute de frappe dans un nom de champ ou un null-check manquant puisse produire silencieusement des donnees incorrectes pour un utilisateur. TypeScript detecte ces bugs a la compilation. Les erreurs catchees sont typees `unknown` (pas `Error`) ; `as any` est interdit par ESLint.

**Pourquoi Vite :** demarrage quasi instantane, HMR fiable, pipeline de build en une commande (`tsc -b && vite build`). Configuration minimale : un plugin React, un plugin de compression, un proxy vers Express pour le developpement.

**Alternatives ecartees :**

- **Create React App (CRA)** — officiellement depreciee, builds lents, configuration webpack rigide.
- **Next.js** — pas de SEO requis (application derriere authentification), pas de besoin de SSR. Apprendre les conventions Next.js (app router vs pages router, server components) en plus du domaine metier aurait alourdi le projet sans benefice concret.

---

## 2. React Router v6 + TanStack Query v5 (pas de Redux)

| Element | Choix |
|---------|-------|
| Routing | React Router v6, `createBrowserRouter` |
| Etat serveur | TanStack Query v5 |
| Client HTTP | axios (instance partagee dans `src/api/client.ts`) |
| Etat UI global | 3 contextes React legers (Auth, Perspective, Confirm) |

**Pourquoi React Router v6 :** standard de facto pour le routing SPA en React. `createBrowserRouter` produit un fichier unique (`src/router/index.tsx`) listant toutes les routes — source de verite unique pour auditer le controle d'acces : chaque route protegee est enveloppee dans un `<AuthGuard>` avec les roles autorises declares en ligne.

**Pourquoi TanStack Query :** gere tout l'etat serveur (fetch, cache, revalidation en arriere-plan, invalidation apres mutation). Modele mental simple : une cle de requete identifie une donnee serveur, toute mutation qui modifie cette donnee invalide la cle. Cela elimine le probleme de synchronisation qui a motive la creation de Redux.

**Pourquoi axios plutot que `fetch` nu :** une instance partagee permet d'attacher des intercepteurs une seule fois. L'intercepteur 401 qui redirige vers `/login` a l'expiration de session est defini en un seul endroit et s'applique a tous les appels API.

**Pourquoi pas Redux :** Redux est le plus utile quand l'etat cote client doit etre partage entre de nombreux composants non connectables par props ou contexte (assistant multi-etapes, edition collaborative). Dans NanoXplore RH, la grande majorite de l'"etat" est de la donnee serveur que TanStack Query gere mieux. Le reste (utilisateur connecte, perspective active, dialog de confirmation) tient dans trois contextes React legers. Redux et ses alternatives (Zustand, Jotai) resolvent un probleme qui ne se pose pas ici.

---

## 3. Tailwind CSS v3 + CSS custom properties

| Element | Choix |
|---------|-------|
| Utilitaires CSS | Tailwind CSS v3 |
| Tokens de design | Proprietes CSS (`var(--color-*)`) dans `src/styles/tokens.css` |
| Icones | `lucide-react` (SVG stroke, bibliotheque unique) |

**Pourquoi Tailwind :** le modele utilitaire maintient les styles co-localises avec le balisage qui les utilise. Pas de feuille de style separee a maintenir en parallele, pas de risque de collision de noms de classe, pas de CSS mort a auditer.

**Pourquoi des proprietes CSS en plus :** pour le theming. L'application supporte un basculement clair/sombre qui doit etre applique avant que React ne monte — un script inline dans `index.html` lit `localStorage` et positionne `data-theme` sur `<html>` avant le chargement des bundles. Les proprietes CSS sur `:root` repondent a cet attribut ; les utilitaires Tailwind y font reference via `var(--color-*)`. La logique de theme reste entierement en CSS, la couche appropriee.

**Pourquoi lucide-react uniquement :** melanger des bibliotheques d'icones cree des incoherences visuelles (poids de trait, grille, conventions de nommage differents). Une seule bibliotheque, imposee dans les conventions, garantit l'homogeneite.

**Alternatives ecartees :**

- **styled-components / Emotion** — cout d'execution a l'execution, configuration de build plus complexe.
- **Material UI (MUI)** — surcharger les styles par defaut est verbeux, le bundle est significatif, le langage visuel "Material Design" n'est pas neutre. Tailwind + tokens offre un controle total sur le design.

---

## 4. Express 4 + MongoDB 7 + Mongoose 8

| Element | Choix |
|---------|-------|
| Runtime | Node.js 20 |
| Framework web | Express 4 |
| Base de donnees | MongoDB 7 |
| ODM | Mongoose 8 |

**Pourquoi Node.js / Express :** une seule langue sur toute la base de code (JavaScript/TypeScript frontend et backend) reduit la charge cognitive. Express est intentionnellement minimal : une requete entre, passe par les middlewares, atteint un handler de route, retourne une reponse. L'architecture choisie (`routes/`, `models/`, `services/`, `middleware/`) est une architecture en couches conventionnelle qu'un developpeur Node.js reconnait immediatement.

**Pourquoi MongoDB :** le domaine des evaluations a des schemas genuinement variables. Une campagne d'evaluation peut cibler des participants avec des roles differents, des types de formulaires differents (auto-evaluation, revue manager, feedback ascendant, objectifs) et des ensembles de questions personnalisees construites par le RH dans le form builder. Modeliser cela dans une base relationnelle exige plusieurs tables de jointure et des patterns EAV ou des colonnes JSON — de la complexite sans simplification du code applicatif. Le modele document de MongoDB correspond naturellement aux structures imbriquees (formulaire avec categories, categories avec questions, questions avec leur propre type et configuration).

**Pourquoi Mongoose :** validation de schema au niveau ODM, hooks pre-save, API plus claire pour les requetes. Choix standard pour Express + MongoDB.

**Securite au niveau backend :** `helmet` pour les en-tetes HTTP securises, `express-rate-limit` pour la limitation des requetes, `express-mongo-sanitize` pour prevenir l'injection NoSQL, `sanitize-html` pour nettoyer le contenu HTML avant persistance, `bcrypt` pour le hashage des mots de passe.

**Alternatives ecartees :**

- **NestJS** — framework opinionne construit sur Express, ajoutant decorateurs, injection de dependances, modules. La couche d'abstraction supplementaire aurait exige d'apprendre les conventions NestJS avant de pouvoir construire la logique metier. La simplicite d'Express a permis de se concentrer sur le domaine.
- **PostgreSQL** — le choix le plus honnete a reconsiderer. Les donnees RH sont inheremment relationnelles (utilisateurs dans des departements, managers etant des utilisateurs, campagnes ciblant des utilisateurs, evaluations appartenant a des campagnes). Le modele document peut tout representer, mais cela exige des pipelines d'agregation Mongoose la ou SQL offrirait des JOIN simples. Si le projet repartait de zero, PostgreSQL avec des colonnes JSONB pour les parties genuinement variables (configuration des questions, reponses) et des tables normalisees pour le noyau relationnel stable serait serieusement etudie.

---

## 5. JWT en cookies httpOnly + LDAP

| Element | Choix |
|---------|-------|
| Authentification | LDAP via `ldapjs` |
| Stockage des tokens | Cookies `httpOnly` (jamais `localStorage`) |
| Tokens | JWT acces (courte duree) + refresh (longue duree) |

**Pourquoi les cookies httpOnly :** stocker les JWT dans `localStorage` les rend lisibles par tout JavaScript sur la page, y compris une charge XSS qu'un attaquant pourrait injecter. Les cookies `httpOnly` ne sont pas accessibles au JavaScript du navigateur. Pour une application RH qui gere des donnees personnelles sensibles et des acces bases sur les roles aux evaluations des autres employes, cette distinction n'est pas theorique.

**Pourquoi LDAP :** exigence metier — les organisations entreprise authentifient generalement via Active Directory ou OpenLDAP. Les utilisateurs ne doivent pas maintenir un mot de passe separe pour l'outil RH. L'application supporte aussi plusieurs annuaires LDAP, courant dans les organisations issues de fusions ou ayant des annuaires separes par entite.

**Flux d'authentification :** LDAP valide l'identifiant, Express emet un JWT, le JWT est pose en cookie `httpOnly`, toutes les requetes suivantes transportent le cookie automatiquement. Le frontend ne voit jamais le token — il appelle seulement `/api/auth/me` pour connaitre l'utilisateur courant.

**Alternatives ecartees :**

- **Sessions cote serveur** — necessite un store partage (Redis ou base de donnees) quand plusieurs instances tournent. Les tokens JWT sont sans etat et peuvent etre verifies par n'importe quelle instance sans aller-retour vers un store partage, ce qui permet `docker compose up --scale app=3` sans configuration supplementaire.
- **JWT dans localStorage** — approche de nombreux tutoriels, rejetee pour l'exposition XSS decrite ci-dessus.

---

## 6. Zod (frontend) + Joi (backend)

| Cote | Bibliotheque | Role |
|------|-------------|------|
| Frontend | Zod 4 | Validation des formulaires via `@hookform/resolvers` |
| Backend | Joi 17 | Validation des corps de requete dans les middlewares de routes |

**Pourquoi deux bibliotheques :** chaque cote a un role different. Zod sur le frontend integre nativement avec React Hook Form via `@hookform/resolvers` ; un schema Zod definit a la fois le type TypeScript et les regles de validation en une seule declaration. Joi sur le backend est une bibliotheque mature avec une API fluide bien adaptee aux middlewares Express.

**La duplication est intentionnelle.** La validation frontend ameliore l'experience utilisateur (retour immediat sans aller-retour). La validation backend est la frontiere de securite qui ne peut pas etre contournee — un client peut toujours envoyer une requete elaboree qui court-circuite l'interface. Les deux couches ensemble signifient qu'aucune n'est un point de defaillance unique.

---

## 7. Docker multi-stage + nginx

| Element | Choix |
|---------|-------|
| Conteneurisation | Dockerfile multi-stage |
| Orchestration | Docker Compose |
| Proxy inverse | nginx (terminaison TLS, redirect HTTP→HTTPS, cache assets statiques) |
| CI/CD | GitHub Actions |

**Pourquoi Docker multi-stage :** l'image de production contient uniquement les assets compiles et le runtime Node.js — pas d'outils de build, pas de sources, pas de dependances de developpement. L'image est plus petite et a une surface d'attaque reduite.

**Pattern cert-init :** nginx requiert un certificat TLS pour demarrer, mais le vrai certificat est televerse par un administrateur via l'interface apres le premier demarrage. Le service `cert-init` genere un certificat auto-signe pour `localhost` automatiquement au premier lancement pour que nginx puisse demarrer sans condition. Un administrateur le remplace ensuite par le vrai certificat via le panneau d'administration.

**GitHub Actions :** trois workflows — CI sur chaque PR (verification TypeScript, ESLint, tests unitaires, tests d'integration), CD qui construit et pousse l'image Docker a la fusion vers `main`, securite qui execute `npm audit` et l'analyse CodeQL.

**Alternatives ecartees :**

- **PaaS (Render, Railway, Fly.io)** — simplifieraient le deploiement (pas de Dockerfile, TLS gere). Ecartees parce que l'approche Docker produit un artefact portable deployable sur n'importe quelle machine faisant tourner Docker, y compris un serveur sur site — la cible de deploiement typique pour des outils RH entreprise qui gerent des donnees sensibles d'employes et ne peuvent pas les router via un cloud tiers. La souverainete des donnees justifie la charge operationnelle.

---

## 8. Vitest + Playwright (frontend) / Jest 30 + Supertest (backend)

| Couche | Outils |
|--------|--------|
| Tests unitaires et composants (frontend) | Vitest 4 + Testing Library |
| Tests end-to-end | Playwright |
| Tests d'integration (backend) | Jest 30 + Supertest + `mongodb-memory-server` |
| Mocks API en tests de composants | MSW (Mock Service Worker) |

**Pourquoi Vitest plutot que Jest sur le frontend :** Vitest s'execute dans le pipeline Vite et reutilise sa configuration directement. Pas de couche de transformation `babel-jest` ou `ts-jest` — moins de couches de transformation signifie moins de cas limites de configuration. L'API est compatible avec Jest.

**Pourquoi Testing Library :** encourage les tests depuis la perspective de l'utilisateur (trouver les elements par role accessible ou label, declencher des evenements comme un utilisateur le ferait, asserter sur ce que l'utilisateur voit). Produit des tests plus resilients aux changements d'implementation.

**Pourquoi Playwright :** tests end-to-end exercant toute la pile via un vrai navigateur. Support multi-navigateurs (Chromium, Firefox, WebKit). Les scenarios couvrent les chemins utilisateurs critiques (form builder, remplissage d'evaluation, flux manager) et produisent des captures d'ecran comme artefacts.

**Pourquoi `mongodb-memory-server` :** instancie une vraie instance MongoDB en memoire pour chaque suite de tests, ce qui signifie que les tests d'integration exercent les vrais modeles Mongoose et la vraie logique de requete sans necessite de connexion a une base externe.

---

## Dette technique identifiee

- **MongoDB vs relationnel :** le choix le plus reflechi. En pratique, certaines agregations Mongoose auraient ete des requetes SQL simples. PostgreSQL avec JSONB pour les parties variables et des tables normalisees pour le noyau stable serait serieusement etudie si le projet repartait de zero.
- **Pas de TypeScript cote backend :** le backend utilise JavaScript avec des commentaires JSDoc dans certains fichiers. Les schemas Zod (frontend) et Joi (backend) ne sont pas derives d'une source partagee — un renommage de champ exige deux modifications dans deux schemas differents.
- **Couverture de tests inegale :** les seuils sont a 50 % de branches, 55 % de fonctions, 60 % de lignes. Les chemins critiques sont couverts (authentification, soumission d'evaluation, gardes de role), mais certaines routes administratives et de configuration n'ont pas de tests automatises.
- **Tests Playwright fragiles sur base vivante :** les tests E2E dependent de donnees de seed et d'appels API en direct, ce qui les rend plus lents et moins deterministes que des tests unitaires purs.
