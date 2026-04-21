# DOC.md — pages/evaluation/

## Rôle du dossier

Ce dossier contient les composants React de la section **évaluation employé** du portail
NanoXplore RH. Ces pages font partie de la **Phase 4** de la migration MPA → SPA.

---

## Structure des fichiers

```
evaluation/
├── EvaluationLayout.jsx   ← En-tête partagé (titre, badge campagne, stepper d'étapes)
├── EvaluationSummary.jsx  ← Vue récapitulatif  → route /evaluation/:evalId
├── EvaluationForm.jsx     ← Formulaire par phase → routes /evaluation/:evalId/{phase}
├── EvaluationSign.jsx     ← Signature / contestation → route /evaluation/:evalId/sign
├── evaluation.css         ← Styles page (tokens uniquement — section SPA en fin de fichier)
└── i18n/
    ├── fr.js              ← Traductions françaises
    ├── en.js              ← Traductions anglaises
    └── index.js           ← Factory makeT
```

### Fichiers supprimés (migration Phase 4)

| Ancien fichier        | Remplacé par                             |
|-----------------------|------------------------------------------|
| `Evaluation.jsx`      | `EvaluationSummary` + `EvaluationForm`   |
| `EvaluationSidebar.jsx` | Sidebar globale via `AuthedLayout`     |
| `main.jsx`            | Plus besoin — SPA via `client/src/main.jsx` |

---

## Routes gérées

| Route                               | Composant                         | Description                          |
|-------------------------------------|-----------------------------------|--------------------------------------|
| `/evaluation/:evalId`               | `EvaluationSummary`               | Récapitulatif avec barre de progression et cartes de phase |
| `/evaluation/:evalId/self`          | `EvaluationForm phase="self"`     | Auto-évaluation (compétences + narratif) |
| `/evaluation/:evalId/n-1`           | `EvaluationForm phase="n-1"`      | Bilan année N-1 (objectifs passés)   |
| `/evaluation/:evalId/objectives`    | `EvaluationForm phase="objectives"` | Objectifs pour le cycle à venir    |
| `/evaluation/:evalId/aspirations`   | `EvaluationForm phase="aspirations"` | Aspirations carrière               |
| `/evaluation/:evalId/sign`          | `EvaluationSign`                  | Signature ou contestation            |

---

## Pattern formulaire par phase (EvaluationForm)

`EvaluationForm` est un **composant générique** dont la phase est injectée via le prop `phase`
dans `App.jsx`. Il ne connaît pas son propre chemin — il reçoit sa phase depuis l'arbre de routes.

```jsx
// App.jsx
<Route path="/evaluation/:evalId/self"        element={<EvaluationForm phase="self" />} />
<Route path="/evaluation/:evalId/n-1"         element={<EvaluationForm phase="n-1" />} />
<Route path="/evaluation/:evalId/objectives"  element={<EvaluationForm phase="objectives" />} />
<Route path="/evaluation/:evalId/aspirations" element={<EvaluationForm phase="aspirations" />} />
```

### Questions mock (MOCK_PHASES dans EvaluationForm.jsx)

Les questions sont actuellement mockées dans `EvaluationForm.jsx` (const `MOCK_PHASES`).

**TODO :** Remplacer par un fetch `GET /api/forms/:formId` filtré par phase quand le backend
supportera les sections par phase.

Les IDs de questions suivent la convention `<préfixe>_q<n>` :

| Phase        | Préfixe | Exemple      |
|--------------|---------|--------------|
| self         | `self_` | `self_q1`    |
| n-1          | `n1_`   | `n1_q1`      |
| objectives   | `obj_`  | `obj_q1`     |
| aspirations  | `asp_`  | `asp_q1`     |

### Types de questions supportés

| Type    | Rendu                                    |
|---------|------------------------------------------|
| rating  | 5 boutons numérotés 1–5 (violet actif)   |
| text    | `<textarea>` pleine largeur              |
| yes_no  | Toggle Oui / Non                         |
| choice  | Groupe radio vertical                    |

---

## Data fetching

Tous les composants utilisent **TanStack Query v5** :

```js
const { data: evaluation } = useQuery({
  queryKey: ['eval', evalId],
  queryFn:  () => fetch(`/api/evaluations/${evalId}`, { credentials: 'include' }).then(r => r.json()),
  staleTime: 30_000,
})
```

Les mutations (sauvegarde brouillon, soumission, signature) utilisent `useMutation` avec
invalidation du cache `['eval', evalId]` au succès.

---

## Signature / Contestation (EvaluationSign)

- **Contresigner** → `PATCH /api/evaluations/:id` avec `{ status: 'signed_evaluatee' }`
- **Contester** → TODO : endpoint `POST /api/evaluations/:id/contest` non encore implémenté.
  En attendant : `PATCH /api/evaluations/:id` avec `{ evaluateeComment: motif }`.

---

## CSS

Les nouvelles classes SPA sont ajoutées à la fin de `evaluation.css` sous la section
`EVALUATION SPA — EvaluationLayout · EvaluationSummary · EvaluationForm · EvaluationSign`.

Règles respectées :
- Tokens CSS uniquement (`var(--color-*)`) — aucun hex ou rgb littéral
- Pas de `1px solid #...` ni de `border-left: 4px` pour les statuts
- La progression `width: X%` est le seul cas de style inline justifié (valeur dynamique)

---

## Changements (historique Phase 4)

- Suppression du routing interne basé sur `window.location.search` (MPA legacy)
- Remplacement de la sidebar locale `EvaluationSidebar` par la sidebar globale d'`AuthedLayout`
- Introduction de `EvaluationLayout` comme en-tête partagé avec indicateur d'étapes
- Toute navigation inter-phases via `useNavigate()` (zero `window.location`)
