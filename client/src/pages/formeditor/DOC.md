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

## FormBuilder.jsx — Layout éditorial

Layout 2 colonnes plein écran (sans header séparé) :

```
┌─────────────────────────────────────┬──────────────────────────┐
│  fb-canvas  (flex-1, overflow-y)    │  fb-panel  (400px)        │
│                                     │                           │
│  ← Modèles                          │  CONFIGURATION DU         │
│                                     │  COMPOSANT                │
│  ARCHITECTURE DE PERFORMANCE        │  ─────────────────────    │
│  [formTitle — input styled h2]      │  Intitulé + Description   │
│  [subtitle]                         │  Phase (select)           │
│                                     │  Options si choice        │
│  [QuestionCard ×n]                  │                           │
│    - Badge QUESTION 01              │  LOGIQUE DE VALIDATION    │
│    - h3 (label)                     │  ─────────────────────    │
│    - QuestionPreview                │  Obligatoire / Pondération│
│    - Copy + Delete actions          │  / Anonyme (toggles)      │
│                                     │                           │
│  [Palette — type buttons dashed]    │  TYPE DE CHAMP            │
│                                     │  ─────────────────────    │
└─────────────────────────────────────│  2×2 grid + special row   │
                                      │                           │
                                      │  [Annuler] [Enregistrer]  │
                                      └──────────────────────────┘
```

## FormBuilder.jsx — Fonctionnalités

- **Titre du formulaire** : input stylé comme un h2 éditorial (background none, border-bottom au focus)
- **Banner** : si `frozenAt` est présent → banner d'avertissement verrouillé
- **Cards** : affichent le label, un prévisualisation du type de réponse, badge numéroté
- **Drag-and-drop** : handle drag absolu à gauche du card (visible au hover)
- **Copier un bloc** : duplique le bloc sélectionné et l'insère juste dessous
- **Palette** : grille de boutons de type en bas du canvas
- **Panneau droit (3 sections)** :
  1. **Configuration** : intitulé, description, phase, options (si `choice`)
  2. **Validation** : obligatoire, pondération (désactivé), anonyme
  3. **Type de champ** : 2×2 grille principale + 3 types spéciaux
- **Footer sticky** : "Annuler" (restaure état original) + "Enregistrer" (PATCH API)
- **"Enregistrer"** → PATCH `/api/forms/:id`, gestion 409 Conflict

## Prévisualisation des types (`QuestionPreview`)

| Type | Aperçu |
|---|---|
| `rating` | 5 boîtes 1-5 (boîte 4 active — secondary color) |
| `text` | Zone pointillée avec placeholder italique |
| `yes_no` / `mobility` | 2 boîtes côte-à-côte "Oui" / "Non" |
| `choice` | 3 barres horizontales dégradées |
| `weather` | 10 petites boîtes 1-10 (boîte 7 active) |
| `n1_import` | Zone pointillée avec icône Download |

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
- Clés `fb.*` : FormBuilder SPA

## Champs d'un bloc

| Champ | Type | Notes |
|---|---|---|
| `_id` | string | ID local (UUID-like) |
| `id` | string | ID API (mappé depuis `_id` au save) |
| `type` | string | rating, text, yes_no, choice, weather, mobility, n1_import |
| `label` | string | Intitulé de la question |
| `description` | string | Description optionnelle (affichée dans le card) |
| `required` | boolean | Champ obligatoire |
| `anonymous` | boolean | Soumission anonyme |
| `phase` | string | all, self, n-1, objectives, aspirations |
| `options` | string[] | Options pour le type `choice` uniquement |

## Historique des décisions

### Legacy MPA (avant Phase 4)

`FormEditor.jsx` était une page MPA complète avec `FormEditorSidebar.jsx` et `FormEditorBanner.jsx`.
Ces fichiers ont été supprimés lors de la Phase 6, sauf `FormEditor.jsx` conservé pour référence.

### Phase 6 — FormBuilder SPA (feat/spa-tailwind)

- Création de `FormBuilder.jsx` : composant pur sans shell, intégré dans `AuthedLayout`
- Création de `formbuilder.css` avec BEM strict `fb-` et tokens CSS uniquement
- Extension de `i18n/fr.js` et `i18n/en.js` avec les clés `fb.*`
- Suppression de `main.jsx`, `FormEditorSidebar.jsx`, `FormEditorBanner.jsx`

### Phase 7 — Refonte UI éditorial (designs/formcreator.html)

- Layout : header éditorial plein canvas + panneau droit 400px (remplacement header + list-panel)
- Icônes : migration vers lucide-react exclusif (BarChart2, AlignLeft, Download, Copy…)
- Cards : nouveau design avec badge numéroté, prévisualisation réponse, handle drag flottant
- Panneau droit : 3 sections (Configuration / Validation / Type) + footer sticky
- Nouvelle fonctionnalité : copier un bloc (`handleCopyBlock`)
- Nouveau champ bloc : `description` et `anonymous`
- Bouton "Annuler" : restaure l'état original du bloc sélectionné

## Points d'attention

- `FormEditor.jsx` est legacy : ne pas l'importer dans de nouveaux composants.
- Si `frozenAt` est défini côté API, les blocs ne peuvent pas être modifiés (UI verrouillée).
- Le bouton "Enregistrer" gère le 409 Conflict (formulaire lié à des évaluations).
- L'import `pageT` vient de `./i18n` (formeditor i18n), pas de hr/i18n.
- Le canvas a un `padding-left: 4rem` pour laisser de la place aux drag handles absolus.
- Ne pas utiliser `color-mix(in srgb, var(--color-secondary) N%, transparent)` dans le CSS — le support est limité. Utiliser des `rgba()` directs pour les transparences de secondary.
