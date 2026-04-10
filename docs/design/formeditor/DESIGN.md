# Design — Éditeur de formulaires (`/formeditor`)

## Vue d'ensemble

Page dédiée à la création et gestion des formulaires d'évaluation.
Accessible uniquement aux rôles `admin` et `hr`. Route Express : `GET /formeditor`.

---

## Deux vues

### 1. Vue liste (`view === 'list'`)

- **Banner** `FormEditorBanner` — tagline + description des tâches + headline "Vos formulaires, **votre façon.**" + 3 stats (nb formulaires, actifs, réponses totales)
- **Toolbar** — filtres statut (Tous / Actifs / Brouillons / Archivés) + bouton "+ Créer un formulaire"
- **Grille de cards** `fe-grid` — `auto-fill minmax(300px, 1fr)`
  - Chaque card : icône DocumentIcon, badge statut coloré, titre, description (2 lignes), tags, meta (questions · réponses · équipe), footer (date modif + actions Modifier/Dupliquer)
  - Statuts : `active` (vert), `draft` (neutre), `archived` (atténué)

### 2. Vue créateur (`view === 'create'`)

Layout 2 colonnes : `1fr 360px`

#### Colonne gauche — Structure du formulaire

- **En-tête formulaire** `.fe-fheader`
  - Label violet "ARCHITECTURE DU FORMULAIRE"
  - Input titre stylé comme un heading (transparent, sans border)
  - Textarea description
  - Row : select équipe + input tags

- **Liste de questions** `.fe-questions`
  - État vide : texte guide + bouton "+ Ajouter une question" (card pointillée)
  - Chaque question : card `.fe-qcard` avec border-left violet si active, draggable (HTML5 natif)
    - Badge "QUESTION 01" violet + astérisque rouge si obligatoire
    - Icônes edit / trash
    - Titre de la question (editable via config panel)
    - Description (si renseignée)
    - Aperçu inline du type de champ (scale buttons / texte / choix)
  - Drag & drop : reorder sur `onDrop` uniquement (stable, pas de live swap)
  - Card "+" `.fe-qcard--add` : dashed border, hover violet — ajoute une question de type "scale" par défaut

#### Colonne droite — Component Configuration

- **État idle** (aucune question sélectionnée) : message "Sélectionnez une question"
- **État actif** :
  - QUESTION TITLE — input
  - QUESTION DESCRIPTION — textarea
  - VALIDATION LOGIC — 3 toggles (obligatoire, coefficient, anonyme)
  - INTERFACE OPTIONS — grille 2×2 rectangulaire : Échelle / Texte long / Texte court / Choix multiple
  - Footer : Annuler + Enregistrer

---

## Types de champs

| Type | Description | Aperçu inline |
|---|---|---|
| `scale` | Boutons 1–5 | 5 boutons numérotés |
| `textarea` | Texte long multi-lignes | 2 lignes grises |
| `text` | Texte court une ligne | 1 ligne grise |
| `choice` | Choix multiple (radio) | 2 options avec radio |

> "Menu déroulant" a été supprimé — doublon fonctionnel avec "Choix multiple".

---

## Composants

| Fichier | Rôle |
|---|---|
| `FormEditor.jsx` | Composant principal — gère les deux vues et tout l'état |
| `FormEditorBanner.jsx` + `.css` | Banner hero de la vue liste |
| `FormEditorSidebar.jsx` | Thin wrapper AppSidebar, `formeditor` actif |
| `formeditor.css` | Styles page — tokens uniquement, pas de valeurs hardcodées |
| `i18n/fr.js` + `en.js` + `index.js` | Traductions page-owned |

---

## Règles CSS

- Sidebar : `var(--color-sidebar-*)` via `AppSidebar.css`
- Violet secondary (`#5b00df`) utilisé pour : badge question actif, border-left, interface option sélectionnée, label "ARCHITECTURE DU FORMULAIRE"
- Rouge primary (`var(--color-primary)`) : statut actif, astérisque obligatoire, actions des cards
- Aucun hardcode hex — tout via tokens `var(--color-*)`

---

## État React

```js
view          // 'list' | 'create'
filter        // 'all' | 'active' | 'draft' | 'archived'
editingId     // id du formulaire en cours d'édition (null = nouveau)
formTitle, formDesc, formTeam, formTags  // métadonnées du formulaire
fields        // [{ id, type, label, description, required, weightage, anonymous }]
activeField   // id de la question sélectionnée dans le config panel
dragIdx       // index de la question en cours de drag
fieldCounter  // useRef — compteur incrémental pour les ids (évite collisions Date.now())
```
