# client/src/pages/formeditor/

## Contenu

Ce dossier contient le FormBuilder SPA et le legacy FormEditor (conservé pour référence).

| Fichier | Rôle |
|---|---|
| `FormBuilder.jsx` | Éditeur de formulaire SPA — route `/hr/templates/:id/builder` |
| `formbuilder.css` | Styles du FormBuilder (préfixe `fb-`, tokens CSS uniquement) |
| `FormEditor.jsx` | Legacy MPA form editor — **ne pas utiliser**, conservé pour référence uniquement |
| `formeditor.css` | Styles legacy du FormEditor |
| `i18n/` | Traductions fr/en (clés `fe.*` legacy + `fb.*` FormBuilder SPA) |

## Architecture

`FormBuilder.jsx` est monté via `App.jsx` dans la section RH :

```
<ProtectedRoute allowedRoles={['hr', 'admin']}>
  <Route path="/hr/templates/:id/builder" element={<FormBuilder />} />
</ProtectedRoute>
```

Le shell (sidebar + topbar) est fourni par `AuthedLayout`.

## FormBuilder.jsx — Fonctionnalités

- **Header** : titre éditable (input) + bouton "Enregistrer"
- **Banner** : si `frozenAt` est présent → banner d'avertissement "Ce formulaire est verrouillé"
- **Layout 2 colonnes** :
  - **Gauche** : liste des blocs avec drag handles (HTML5 natif)
  - **Droite** (360px) : panneau de configuration du bloc sélectionné
- **Palette** ("Ajouter un bloc") en bas de la liste :
  - text, rating, yes_no, choice, weather, mobility, n1_import
- **Chaque bloc** : icône type, label, bouton supprimer
- **Config panel** :
  - Champ label (question text)
  - Toggle required
  - Liste d'options si `type === 'choice'`
- **"Enregistrer"** → PATCH `/api/forms/:id`, gestion 409 Conflict

## Drag-and-drop

Implémenté avec les APIs HTML5 natives (`draggable`, `onDragStart`, `onDragOver`, `onDrop`).
Pas de bibliothèque externe.

## Données (react-query)

| Query key | Endpoint | Usage |
|---|---|---|
| `hr-form` | `GET /api/forms/:id` | Chargement initial du formulaire |

Mutation : PATCH `/api/forms/:id` avec `{ title, questions }`.

## i18n

- Clés `fe.*` : legacy FormEditor (ne pas modifier)
- Clés `fb.*` : FormBuilder SPA (ajoutées lors de la Phase 6)

## Smart Block descriptions

| Type | Description |
|---|---|
| `weather` | Curseur Météo 1-10 |
| `mobility` | Demande de mobilité |
| `n1_import` | Import objectifs N-1 |

## Historique des décisions

### Legacy MPA (avant Phase 4)

`FormEditor.jsx` était une page MPA complète avec `FormEditorSidebar.jsx` et `FormEditorBanner.jsx`.
Ces fichiers ont été supprimés lors de la Phase 6, sauf `FormEditor.jsx` conservé pour référence.

### Phase 6 — FormBuilder SPA (feat/spa-tailwind)

- Création de `FormBuilder.jsx` : composant pur sans shell, intégré dans `AuthedLayout`
- Création de `formbuilder.css` avec BEM strict `fb-` et tokens CSS uniquement
- Extension de `i18n/fr.js` et `i18n/en.js` avec les clés `fb.*`
- Suppression de `main.jsx`, `FormEditorSidebar.jsx`, `FormEditorBanner.jsx`

## Points d'attention

- `FormEditor.jsx` est legacy : ne pas l'importer dans de nouveaux composants.
- Si `frozenAt` est défini côté API, les blocs ne peuvent pas être modifiés (UI verrouillée).
- Le bouton "Enregistrer" gère le 409 Conflict (formulaire lié à des évaluations).
- L'import `pageT` vient de `./i18n` (formeditor i18n), pas de hr/i18n.
