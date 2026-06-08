# Reprise développeur — Audit KISS

> Question : *un développeur peut-il reprendre le projet facilement ?*
> Réponse honnête, après avoir lu et modifié une large partie du code.

## Verdict : **oui, avec une rampe courte.** 7/10 sur la reprenabilité.

Ce n'est pas un projet « clever » qui se la raconte : c'est lisible, conventionné, documenté.
Un dev React/Node autonome est productif en **~1 jour**, à l'aise en **~1 semaine**.

## Ce qui rend la reprise facile (les points forts)

1. **Une source de vérité pour les routes** : `frontend-v2/src/router/index.tsx`. On lit le
   plan du site en un fichier (avec les rôles requis par route).
2. **Conventions strictes et homogènes** : un composant = un fichier, API axios par domaine,
   Zod côté formulaires, Joi côté serveur, couleurs par tokens, icônes lucide. On **réapprend
   rien** d'un écran à l'autre.
3. **`DOC.md` par dossier significatif** + `CONTRIBUTING.md` racine : l'historique des décisions et
   les pièges sont écrits.
4. **Séparation routes / services** côté backend : la logique métier est dans `services/`,
   testable isolément.
5. **Sécurité explicite et centralisée** : `authGuard([roles])`, transitions d'évaluation
   gatées par l'identité, boot guards. On comprend vite « qui peut quoi ».
6. **Tests réels** : Jest backend (mongodb-memory-server), QA backlogs + harness rejouable.

## Ce qui demande un temps d'adaptation (honnête)

1. **La machine à états des évaluations** (`assigned→…→validated`) est riche : il faut la lire
   une fois (model `Evaluation.js` + `routes/evaluations/`) avant d'y toucher. C'est *strict*
   par sécurité, pas accidentel.
2. **Le contexte « édition précédente » (N-1)** (`routes/evaluations/n1Context.js`) : lookup en
   deux stratégies + lignée `parentQuestionId`. Bien commenté, mais à lire posément.
3. **L'organigramme** (`useOrgChart.ts` + `components/org/`) : react-flow + calculs de layout +
   plusieurs vues (Tout/Équipes/Départements/Secteurs). Le plus gros morceau front.
4. **Deux dossiers frontend historiques** : seul `frontend-v2/` est vivant. Ignorer tout
   `client/` legacy éventuel (et le `CONTRIBUTING.md` peut mentionner des chemins périmés).

## Plan « premier jour » pour un nouveau dev

1. Lire `CONTRIBUTING.md` (racine) + ce wiki ([Architecture](Architecture)).
2. Monter la stack dev : `docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d --build`.
3. Suivre une route de bout en bout : `router/index.tsx` → une `pages/*` → son `api/*` →
   la `routes/*` backend → le `services/*` → le `models/*`. (Ex. une campagne.)
4. Lancer les tests : `cd mongo/server && npm test`.
5. Lire `docs/qa/README.md` pour comprendre la surface fonctionnelle par rôle.

## Dette / chantiers de finition (non bloquants)

- Tuile « Documents RH » (dashboard employé) → route `/documents` possiblement absente.
- `userService.deleteUser` (ancien soft-delete) inutilisé depuis l'unification du `DELETE /:id`.
- États vides peu engageants sur une base fraîche (cosmétique).
- SMTP/SSL/AD : à brancher via l'UI selon l'environnement.

## Conclusion

Le code **a une opinion et s'y tient**. La complexité résiduelle est *intrinsèque au domaine*
(cycle d'évaluation, hiérarchie, N-1), pas gratuite. Un dev sérieux reprend sans douleur ;
c'est précisément ce que « KISS » devait garantir, et c'est tenu.
