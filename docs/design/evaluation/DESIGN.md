# Design — Page de remplissage de formulaire (`/evaluation`)

## Vue d'ensemble

Page dédiée aux employés pour remplir leurs formulaires d'auto-évaluation.
Accessible aux rôles `employee`, `manager`, `admin`, `hr`. Route Express : `GET /evaluation`.

---

## Layout

Même squelette que toutes les pages internes :
- **Sidebar** `EvaluationSidebar` — Employee Portal, item "Mon évaluation" actif
- **Topbar** sticky — titre "Formulaire d'évaluation actif" + search + thème + locale
- **Contenu** `.ev-content` — max-width 900px, padding généreux

---

## Sections de la page

### Hero `.ev-hero`
- Badge campagne (ex. "Cycle Annuel 2026") + badge statut (Brouillon / Enregistré / Soumis)
- Titre h1 bold 900 (clamp 1.75–2.5rem)
- Description
- Barre de progression : answered / total questions

### Formulaire `.ev-form`
Card blanche avec sections numérotées.

#### Section `.ev-section`
- En-tête : numéro grisé (01, 02…) + titre uppercase + tag OBLIGATOIRE/OPTIONNEL
- Liste de questions `.ev-questions`

#### Question `.ev-qrow`
Grille 2 colonnes (texte gauche, champ droit) — passage 1 colonne pour textarea/slider.
- Badge `Q1`, `Q2`… + label + description

### Types de champs

| Type | Rendu | État actif |
|---|---|---|
| `scale` | 5 boutons numérotés 1–5 | Bouton actif : fond violet, texte blanc |
| `slider` | Range input 0–100 + labels Faible/Élevé | Thumb violet |
| `textarea` | Zone de texte multi-lignes, resize vertical | Bordure violet au focus |

### Footer `.ev-footer`
Sticky (dans le flow, pas position fixed). Deux zones :
- **Gauche** : Annuler (ghost) + Enregistrer le brouillon
- **Droite** : Soumettre l'évaluation (bouton plein violet)

### Tips `.ev-tips`
3 cards horizontales en bas de page (Conseil / Contexte / Sécurité).
Fond neutre, révèle léger hover.

---

## État React

```js
answers  // { [questionId]: number | string }
status   // 'draft' | 'saved' | 'submitted'
saving   // boolean — loading state du bouton Enregistrer
```

---

## Données mock

`MOCK_FORM` contient 3 sections, 8 questions :
- **Section 01** : 3 questions scale + 1 slider
- **Section 02** : 2 questions textarea
- **Section 03** : 1 textarea + 1 scale

En production : `GET /api/forms/:id` pour le template + `GET /api/evaluations/:id` pour l'état existant.

---

## Composants

| Fichier | Rôle |
|---|---|
| `Evaluation.jsx` | Composant principal — tout l'état et le rendu |
| `EvaluationSidebar.jsx` | Thin wrapper AppSidebar, `evaluation` actif |
| `evaluation.css` | Styles page — tokens uniquement |
| `i18n/fr.js` + `en.js` + `index.js` | Traductions page-owned |

---

## Règles CSS

- Violet primary (`var(--color-primary)`) : bouton scale actif, thumb slider, focus textarea, tag OBLIGATOIRE
- Grille 2 colonnes via `grid-template-columns: 1fr auto` — collapse 1 col pour textarea/slider via `:has()`
- Responsive : 1100px → 1 colonne, 900px → tips en colonne
