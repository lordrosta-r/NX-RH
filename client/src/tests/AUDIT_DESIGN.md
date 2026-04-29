# Audit design system — NanoXplore RH

> Réalisé après lecture complète de tous les fichiers CSS (`tokens.css`, `theme.css`,
> `global.css`, tous les composants et toutes les pages). Seuls les fichiers CSS et les
> tokens ont été modifiés — aucun JSX touché.

---

## Problèmes corrigés

### `theme.css` — Dark mode surface scale (impact : toute l'app en dark)

| Token | Avant | Après | Raison |
|---|---|---|---|
| `--color-primary` | *(absent du bloc dark)* `#b8000b` | `#e05555` | Rouge trop sombre sur `#0f1117` — contraste insuffisant pour liens actifs |
| `--color-primary-container` | *(absent)* | `rgba(224,85,85,0.15)` | Hover teinté cohérent avec la primary recalibrée |
| `--color-surface` | `#111010` | `#0f1117` | Fond bleu-noir : teinte bleue donne de la profondeur, évite le noir pur |
| `--color-surface-bright` | `#161515` | `#1a1d27` | Cohérence de l'échelle bleue |
| `--color-surface-container-lowest` | `#1c1b1b` | `#1a1d27` | Idem |
| `--color-surface-container-low` | `#201f1f` | `#1f2232` | Idem |
| `--color-surface-container` | `#252424` | `#22263a` | Idem |
| `--color-surface-container-high` | `#2d2c2c` | `#2a2f46` | Idem |
| `--color-surface-container-highest` | `#323131` | `#323a52` | Idem |
| `--color-on-surface` | `#eae7e7` | `#e8eaf0` | Légère teinte bleue, plus douce que blanc warm |
| `--color-on-surface-variant` | `#9ca3af` | `#9da3b4` | Harmonisé avec la nouvelle surface scale |
| `--color-background` | `#111010` | `#0f1117` | Aligné sur `--color-surface` |
| `--color-on-background` | `#eae7e7` | `#e8eaf0` | Aligné |
| `--color-outline` | *(absent)* | `#3d4460` | Contour bleu-ardoise (remplace absence de token) |
| `--color-outline-variant` | `rgba(233,188,182,0.15)` (**ROSE**) | `#2a2f46` | La valeur rosée créait des bordures parasites en dark mode |
| `--color-divider` | *(absent)* → `rgba(28,27,27,0.06)` **invisible** | `rgba(255,255,255,0.08)` | Token light mode invisible sur fond sombre |
| `--apptb-border` | `rgba(255,255,255,0.06)` | `rgba(255,255,255,0.10)` | Séparateur topbar plus visible |

---

### `AppTopbar.css` — Hover backgrounds invisibles en dark mode

Le fichier contient deux blocs (legacy + moderne). Le bloc moderne (lignes 471–925) utilise
`var(--color-surface-container-low)` pour les hover backgrounds, ce qui génère un contraste
de ~1.3:1 sur le fond topbar `#0d0f1a` → hover pratiquement invisible.

**Fix appliqué** : bloc d'overrides ajouté à la fin du fichier.

| Sélecteur | Avant | Après |
|---|---|---|
| `.apptb__sep` | `var(--color-surface-container-high)` | `var(--apptb-sep)` |
| `.apptb__icon-btn:hover` bg | `var(--color-surface-container-low)` | `var(--apptb-icon-hover-bg)` |
| `.apptb__icon-btn:hover` color | `var(--color-on-surface-variant)` | `var(--apptb-text-active)` |
| `.apptb__avatar-btn:hover` | `var(--color-surface-container-low)` | `var(--apptb-hover-bg)` |
| `.apptb__nav-btn:hover` / `--open` | `var(--color-surface-container-low)` | `var(--apptb-hover-bg)` |

---

### `Button.css` — États `:active` manquants

Tous les variants avaient `:hover` et `:focus-visible` mais pas d'état `:active`.
L'absence de feedback visuel au clic est un problème d'accessibilité (WCAG 2.5.3).

| Variant | Fix ajouté |
|---|---|
| `btn--primary` | `:active:not(:disabled) { filter: brightness(0.85) }` |
| `btn--secondary` | `:active:not(:disabled) { filter: brightness(0.78) }` |
| `btn--danger` | `:active:not(:disabled) { filter: brightness(0.85) }` |
| `btn--ghost` | `:active:not(:disabled) { background: var(--color-surface-container-high) }` |

---

### `employee.css` — Couleurs en dur dans `.db-onboarding__check--done`

```css
/* Avant */
color: #15803d; background: #f0fdf4; border-color: #86efac;

/* Après */
color: var(--color-success);
background: var(--color-success-light);
border-color: color-mix(in srgb, var(--color-success) 35%, transparent);
```

`#f0fdf4` (vert très clair) sur fond dark = rupture visuelle majeure.

---

### `manager.css` — Couleurs en dur et états interactifs manquants

| Sélecteur | Avant | Après | Raison |
|---|---|---|---|
| `.mgr-urgency` color | `#92400e` | `var(--color-tertiary)` | Amber foncé illisible en dark |
| `.mgr-kpi--submitted .mgr-kpi__value` | `#b47800` | `var(--color-badge-submitted-fg)` | Token existant, valeur identique mais thémable |
| `.mgr-status--submitted` color | `#b47800` | `var(--color-badge-submitted-fg)` | Cohérence avec les badges |
| `.mgr-btn--ghost:hover` | `rgba(184,0,11,0.06)` | `var(--color-primary-tint)` | Token existant pour cette valeur |
| `.mgr-btn:focus-visible` | *(absent)* | `outline: 2px solid var(--color-primary)` | Accessibilité clavier |
| `.mgr-btn:active` | *(absent)* | `transform: translateY(0); filter: brightness(0.9)` | Feedback clic |

---

### `toast.css` — Couleur warning en dur

```css
/* Avant */
background: #d97706;

/* Après */
background: var(--color-warning, #d97706);
```

Utilise le token `--color-warning` si défini, sinon amber comme fallback.

---

## Incohérences documentées (non corrigées)

### Border-radius — usage mixte

| Fichier | Valeur utilisée pour les cartes |
|---|---|
| `hr.css`, `global.css` | `var(--radius-md)` |
| `admin.css`, `manager.css` | `var(--radius-xl)` |
| `employee.css` | `border-radius: 16px` (valeur en dur) |

**Recommandation** : standardiser sur `var(--radius-xl)` pour les cartes de contenu principal,
`var(--radius-md)` pour les éléments inline/formulaires. Définir la convention dans `tokens.css`.

### `--color-badge-progress-fg: #005fb8` — contraste dark insuffisant

Le bleu `#005fb8` sur les fonds dark containers (`#22263a`) produit un ratio ~3.4:1 < WCAG AA (4.5:1).
Ce token n'est pas surchargé dans le bloc dark de `theme.css`.

**Recommandation** : ajouter dans `html[data-theme="dark"]` :
```css
--color-badge-progress-fg: #6ea8fe;  /* bleu plus lumineux, ratio ≥ 4.5:1 */
```

### `AppTopbar.css` — Double bloc legacy/moderne (23 KB)

Le fichier contient ~450 lignes de code legacy (Block 1) et ~450 lignes de code moderne
(Block 2). Le Block 2 override le Block 1 pour les sélecteurs en commun, mais les règles
Block 1 sans équivalent Block 2 s'appliquent encore (ex: `.apptb__hamburger span` était
défini uniquement en Block 1 avec `rgba(255,255,255,0.75)`).

**Recommandation** : supprimer le Block 1 (lignes 1–468) lors d'une prochaine passe de cleanup.

---

## Fichiers modifiés

- `client/src/styles/theme.css`
- `client/src/components/ui/AppTopbar.css`
- `client/src/components/ui/Button.css`
- `client/src/pages/employee/employee.css`
- `client/src/pages/manager/manager.css`
- `client/src/components/ui/toast.css`
