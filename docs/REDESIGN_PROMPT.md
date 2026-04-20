# Redesign Prompt — Inner Pages (Admin, Manager, Campaigns, Users, Resources, FormEditor)

> **Objective:** Bring all 7 inner pages listed below into full visual and structural parity with the "Editorial Enterprise" design established by `Employee.jsx` and `HRDashboard.jsx`. Each page must feel like it belongs to the same design system — same surface hierarchy, same typography rules, same component patterns, zero design drift.

---

## 0. Project Context

- **Stack:** Node/Express MPA served via nginx. React pages are **standalone MPA entries** — no React Router, no shared providers between pages.
- **Build:** Vite (`client/vite.config.js`). Run `npm run build` from `client/` to produce `mongo/server/public/`.
- **CSS:** Plain CSS with `var(--color-*)`, `var(--radius-*)`, `var(--shadow-*)`, `var(--gradient-*)` tokens from `client/src/styles/tokens.css` and `theme.css`. **No Tailwind. No CSS-in-JS.**
- **i18n:** Each page has a co-located `i18n.js` file exporting `t`. Labels are keyed as `page.section.key`. Both `fr` and `en` must be present.
- **Icons:** SVG stroke components only, imported from the barrel `../../components/ui/icons`. Props: `size` (default 18), `color` (default `currentColor`), `strokeWidth` (default 2). Never use font icons or emoji as icons.
- **Auth:** `useAuthUser()` hook — check `user.role` for access guards.

---

## 1. Universal Design Rules (apply to ALL pages)

These rules are non-negotiable and must be applied everywhere:

### 1.1 Shell
Every inner page wraps in the shared two-div shell:
```jsx
<div className="db">
  <PageSidebar … />
  <div className="db-main">
    <AppTopbar … />
    <main className="db-content" id="main-content">
      …
    </main>
  </div>
</div>
```
`.db` = flex row, full viewport height. `.db-main` = `flex: 1; min-width: 0; overflow-y: auto`. These classes come from the page's own CSS file (not shared), each page re-declares them identically.

### 1.2 No hardcoded colors
Every color value must be a CSS token. The only acceptable raw values are:
- `transparent`
- `rgba(…)` **only** when constructing a tinted overlay of a known token (e.g. `rgba(184, 0, 11, 0.08)` for a primary-tinted surface)
- `#ffffff` / `#000000` for forced-white or forced-black text on a specific colored background

### 1.3 No-Line Rule
`border: 1px solid` is forbidden for **section separation**. Section boundaries are established by:
1. **Surface tonal shift** — adjacent surfaces use different `--color-surface-*` tokens
2. **Negative space** — gutters between cards are the visual separator
3. **Ghost border** — only when required for form accessibility: `1px solid var(--color-outline-variant)` at ≤ 20% opacity

Status indicators (pills, badges) may use a tinted background + matching text color. Left-border accent `border-left: 4px solid` for status cards is **forbidden** — use `background: rgba(token, 0.08)` tints instead.

### 1.4 Hero / Welcome section
Every page has exactly one hero section at the top of `<main>`:

```jsx
<header className="<prefix>-hero">
  <div className="<prefix>-hero__text">
    <p className="<prefix>-hero__eyebrow">{t('page.hero.eyebrow')}</p>
    <h1 className="<prefix>-hero__headline">
      {t('page.hero.greeting')} <span className="<prefix>-hero__accent">{firstName}</span>
    </h1>
    <p className="<prefix>-hero__sub">{t('page.hero.subtitle')}</p>
  </div>
</header>
```

CSS rules for the hero:
```css
.<prefix>-hero {
  padding: 2.5rem 2rem 2rem;
}
.<prefix>-hero__eyebrow {
  font-size: 0.6875rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--color-primary);
  margin-bottom: 0.5rem;
}
.<prefix>-hero__headline {
  font-size: clamp(1.75rem, 3vw, 2.5rem);
  font-weight: 900;
  letter-spacing: -0.03em;
  color: var(--color-on-surface);
  line-height: 1.1;
  margin-bottom: 0.5rem;
}
.<prefix>-hero__accent {
  color: var(--color-primary);
}
.<prefix>-hero__sub {
  font-size: 0.9375rem;
  color: var(--color-on-surface-variant);
  font-weight: 400;
}
```

### 1.5 KPI cards — Bento layout
KPIs are displayed as a bento grid of cards, **never** as a flat horizontal strip. Minimum card height: 120px. Each card:
- Background: `var(--color-surface-container-lowest)` (white)
- Radius: `var(--radius-xl)`
- No border
- Hover: `translateY(-2px)` + `box-shadow: var(--shadow-md)`
- A large numeric value (`font-size: 2rem; font-weight: 900`) + label below
- An optional colored icon or sparkline accent

### 1.6 AppTopbar integration
Every page must pass `tKeys` to `AppTopbar`:
```jsx
<AppTopbar
  searchPlaceholder={t('page.search.placeholder')}
  locale={locale} setLocale={setLocale}
  theme={theme} cycleTheme={cycleTheme}
  notifItems={notifItems}
  user={user} onLogout={handleLogout}
  onMenuToggle={() => setSidebarOpen(o => !o)}
/>
```

### 1.7 Status pills
Status values are displayed as inline pills with a tinted background, never with borders:
```css
.<prefix>-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.2em 0.7em;
  border-radius: var(--radius-full);
  font-size: 0.6875rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}
.<prefix>-pill--active   { background: rgba(0, 130, 80, 0.10); color: #00784A; }
.<prefix>-pill--draft    { background: rgba(130, 100, 0, 0.10); color: var(--color-tertiary); }
.<prefix>-pill--closed   { background: rgba(28, 27, 27, 0.07);  color: var(--color-on-surface-variant); }
.<prefix>-pill--error    { background: var(--color-error-container); color: var(--color-error); }
```

### 1.8 Tables
Table rules:
- `border-collapse: collapse`; **no** `border: 1px solid` on the table or `td`/`th`
- `th`: `font-size: 0.6875rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--color-on-surface-variant); padding: 0.75rem 1rem; border-bottom: 1px solid rgba(28,27,27,0.06)`
- `td`: `font-size: 0.875rem; padding: 0.875rem 1rem; color: var(--color-on-surface)`
- Row hover: `background: var(--color-surface-container-low)`
- Zebra striping: forbidden

### 1.9 Typography consistency
- Body text: `font-size: 0.875rem; font-weight: 400; line-height: 1.55; color: var(--color-on-surface)`
- Section titles (inside cards): `font-size: 1.125rem; font-weight: 700; letter-spacing: -0.01em; color: var(--color-on-surface)`
- Metadata / labels: `font-size: 0.75rem; color: var(--color-on-surface-variant); font-weight: 500`
- Eyebrow / overline: `font-size: 0.6875rem; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: var(--color-primary)`

### 1.10 Co-location principle
Each page folder (`pages/<page>/`) contains **only** the files for that page:
- `<Page>.jsx` — main component
- `<Page>Sidebar.jsx` — sidebar (thin wrapper: NAV_ITEMS array + `AppSidebar`)
- `<page>.css` — all styles (re-declares `.db`, `.db-main`, `.db-content`)
- `i18n.js` — `fr` + `en` translations
- `<Page>*.jsx` — sub-components (banner, modal, etc.)

No page may import a component from **another** page's folder.

---

## 2. Reference Implementation

Study these two files as the gold standard before touching any other page:

| File | What it demonstrates |
|---|---|
| `client/src/pages/employee/Employee.jsx` | Hero, bento grid, notifications aside, calendar integration, async data fetching pattern |
| `client/src/pages/hr/HRDashboard.jsx` | KPI strip → bento, alert derivation, multi-fetch with `Promise.all`, HR action buttons |
| `client/src/pages/employee/employee.css` | `.db-*` class declarations, bento grid CSS, card hover, spotlight |
| `client/src/pages/hr/hr.css` | `.hr-*` prefix usage, KPI layout, alert colors |
| `docs/design/dashboard/DESIGN.md` | Authoritative token reference, surface hierarchy, typography scale |

---

## 3. Per-Page Specifications

---

### 3.1 Admin (`pages/admin/`)

**Current issues:**
- KPIs rendered as a horizontal strip (`adm-kpi-strip`) — replace with bento grid
- Role distribution badges use hardcoded color pairs
- Hero is only `font-size: 44px` instead of responsive `clamp()`
- Section cards have `border: 1px solid` separators

**Redesign requirements:**

**Hero:**
- Eyebrow: `"TABLEAU DE BORD ADMIN"` / `"ADMIN DASHBOARD"`
- Headline: `"Bienvenue, <span accent>Prénom</span>"`
- Sub: user count + active campaign count as a prose sentence
- Background: `--color-surface` (no card wrapping the hero)

**KPI Bento (replace the strip):**
Grid of 4 cards in 2×2 or 4×1 responsive:
| Card | Value | Icon | Accent |
|---|---|---|---|
| Total utilisateurs | `users.length` | `UsersIcon` | `--color-secondary` |
| Évaluations actives | count `in_progress` | `ClipboardIcon` | `--color-primary` |
| Campagnes actives | count active | `FlagIcon` | `--color-tertiary` |
| Formulaires publiés | count published forms | `DocumentIcon` | `--color-outline` |

**Role distribution:**
- Replace hardcoded badge colors with token-based pills (rule 1.7)
- Show as a compact table or a mini horizontal bar chart using `--color-secondary`, `--color-primary`, `--color-tertiary`

**Users table:**
- Apply table rules from §1.8
- Pagination controls: ghost buttons (no border, hover tint)
- Search/filter bar: pill input (`border-radius: var(--radius-full)`, background `--color-surface-container-low`)

**Quick actions:**
- Render as ghost cards (background `--color-surface-container-lowest`, hover lift) arranged in a 3-column row
- Icon + label + chevron right

---

### 3.2 Director (`pages/director/`) — obsolete

Le rôle `director` n'est plus une cible produit.

- Ne plus créer ni maintenir de portail dédié `pages/director/`.
- Toute supervision multi-équipes doit être absorbée par `pages/manager/`.
- Si un manager a un périmètre étendu, il reste dans le même espace `/manager` avec des données agrégées supplémentaires.

---

### 3.3 Manager (`pages/manager/`)

**Current issues:**
- Pure list layout with no visual status grouping
- Review/co-sign modal is functional but unstyled
- No at-a-glance status summary

**Redesign requirements:**

**Hero:**
- Eyebrow: `"ESPACE MANAGER"` / `"MANAGER SPACE"`
- Headline: `"Bonjour, <span accent>Prénom</span>"`
- Sub: pending evaluations count + active campaign name

**Status summary strip (replaces bare list header):**
Three inline counters in a row — À signer, En cours, Complétés — using pill-style chips with token tints.

**Evaluation list → Status-grouped cards:**
Group evaluations by status into three swimlane sections: `À signer`, `En cours`, `Complétés`. Each section:
- Section header: eyebrow label + count badge
- Cards inside: `--color-surface-container-lowest`, `--radius-xl`, hover lift
- Each card: employee avatar placeholder (initials in a circle), name, campaign name, due date, status pill, action button

**Review / Co-sign panel:**
- Convert the modal into a sliding right panel (`position: fixed; right: 0; top: 0; height: 100vh; width: min(480px, 100vw)`)
- Background: `--color-surface-container-lowest`
- Header: eyebrow + evaluation title
- Content: score fields + comment textarea
- Footer: Cancel (ghost) + Sign (gradient CTA)

---

### 3.4 Campaigns (`pages/campaigns/`)

**Current issues:**
- Hero `font-size: 44px` hardcoded — replace with `clamp()`
- Campaign cards have `border: 1px solid` — remove, use surface tint
- Status indicated by `border-left: 4px solid` — replace with pill (§1.7)
- Card background uses a flat color for status variants — unify to `--color-surface-container-lowest`

**Redesign requirements:**

**Hero:**
- Apply hero pattern from §1.4 exactly
- Eyebrow: `"CAMPAGNES D'ÉVALUATION"` / `"EVALUATION CAMPAIGNS"`
- Headline: `"<span accent>Campagnes</span> en cours"` / `"Active <span accent>Campaigns</span>"`
- Sub: total count + active count

**Campaign cards:**
```
┌────────────────────────────────────────┐
│ [Status pill]              [Date range]│
│                                        │
│ Campaign name (700, 1.125rem)          │
│ Description (0.875rem, variant)        │
│                                        │
│ Progress bar (completion %)            │
│                                        │
│ [Participants count]    [→ Open]       │
└────────────────────────────────────────┘
```
- No `border-left` accent
- No `border: 1px solid`
- Background: `var(--color-surface-container-lowest)`
- Status pill using §1.7 rules
- CTA "Open" as a ghost button with `ChevronRightIcon`

**Create campaign button:**
- Gradient CTA pill (§1.7 §1 button type) in the hero, not a bare `<button>`

---

### 3.5 Users (`pages/users/`)

**Current issues:**
- Hero subtitle uses `--color-outline` instead of `--color-on-surface-variant`
- Hero headline is `28px` — too small vs other pages
- Table has `border: 1px solid` grid lines

**Redesign requirements:**

**Hero:**
- Apply §1.4 hero pattern exactly
- Eyebrow: `"GESTION DES UTILISATEURS"` / `"USER MANAGEMENT"`
- Headline: `"<span accent>N</span> utilisateurs actifs"` where N is the total count
- Sub: use `var(--color-on-surface-variant)` — **not** `--color-outline`

**Users table:**
- Apply §1.8 table rules
- Role column: show token-based role pill (§1.7), not a plain text string
- Status column: active/inactive pill using `rgba` tint backgrounds
- Actions column: icon-only buttons (edit, deactivate) with `title` attr, ghost style

**Search + filter bar:**
- Pill search input (background `--color-surface-container-low`, radius `--radius-full`)
- Role filter as a ghost segmented control or `<select>` with custom styling

---

### 3.6 Resources (`pages/resources/`)

**Current issues:**
- Identical structural issues as Users (same pattern, same token drift)
- Card/list items may have `border: 1px solid`

**Redesign requirements:**

Apply the **exact same fixes as Users** (§3.5), adapted to Resources vocabulary:

**Hero:**
- Eyebrow: `"RESSOURCES"` / `"RESOURCES"`
- Headline: `"<span accent>N</span> ressources publiées"` / `"<span accent>N</span> published resources"`
- Sub: breakdown by type (PDF, XLSX, link) as a prose string

**Resource cards (if grid view) / rows (if list view):**
- No `border: 1px solid` around cards
- Type badge: token-based pill (PDF → `--color-error`-tinted, XLSX → `--color-secondary`-tinted, Link → `--color-outline`-tinted)
- Status pill per §1.7
- Hover: `translateY(-2px)` + `var(--shadow-sm)`

**Upload / create button:**
- Gradient CTA in hero area, consistent with Campaigns

---

### 3.7 FormEditor (`pages/formeditor/`)

**Current issues (CRITICAL — structural violations):**
1. Uses `.fe` / `.fe-main` instead of `.db` / `.db-main` — breaks the shared shell contract
2. Imports `HRSidebar` and `AdminSidebar` from other page folders — violates co-location
3. No `AppTopbar` `tKeys` passed (`searchPlaceholder` missing)
4. No local `FormEditorSidebar.jsx`

**Redesign requirements:**

**Step 1 — Fix the shell (MANDATORY FIRST):**
Replace all `.fe` → `.db` and `.fe-main` → `.db-main` class references in both `FormEditor.jsx` and `formeditor.css`.

**Step 2 — Create `FormEditorSidebar.jsx`:**
```jsx
// pages/formeditor/FormEditorSidebar.jsx
import AppSidebar from '../../components/ui/AppSidebar'
import { DocumentIcon, GearIcon, HomeIcon } from '../../components/ui/icons'

const NAV_ITEMS = [
  { key: 'home',      href: '/employee', icon: HomeIcon },
  { key: 'editor',   href: '/formeditor', icon: DocumentIcon, active: true },
  { key: 'settings', href: '/settings', icon: GearIcon },
]

export default function FormEditorSidebar({ t, sidebarOpen, setSidebarOpen }) {
  return (
    <AppSidebar
      navItems={NAV_ITEMS}
      t={t}
      sidebarOpen={sidebarOpen}
      setSidebarOpen={setSidebarOpen}
      tKeyPrefix="formeditor.nav"
    />
  )
}
```

**Step 3 — Remove cross-page imports:**
Remove any `import HRSidebar from '../hr/HRSidebar'` or `import AdminSidebar from '../admin/AdminSidebar'`. Replace with the new `FormEditorSidebar`.

**Step 4 — Pass `tKeys` to AppTopbar:**
```jsx
<AppTopbar
  searchPlaceholder={t('formeditor.search.placeholder')}
  locale={locale} setLocale={setLocale}
  theme={theme} cycleTheme={cycleTheme}
  notifItems={[]}
  user={user} onLogout={handleLogout}
  onMenuToggle={() => setSidebarOpen(o => !o)}
/>
```

**Visual design (beyond structural fixes):**
- The form canvas area stays functional — do not change drag-drop logic
- The canvas background: `var(--color-surface-container-low)` (subtle tint vs white card area)
- The field palette sidebar (right or left): `var(--color-surface-container-lowest)`, no `border: 1px solid` separator — use `box-shadow: -4px 0 12px rgba(0,0,0,0.04)` instead
- Form name input at top: pill style, background `var(--color-surface-container-low)`
- Publish/Save button: gradient CTA pill (§1.7)
- Discard/Cancel: ghost button

---

## 4. CSS File Template

Each redesigned page's CSS file should follow this structure:

```css
/* ============================================================
   <Page> — Editorial Enterprise layout
   Design ref: docs/design/dashboard/DESIGN.md
   ============================================================ */

/* 1. Shell (re-declared per page — identical across all pages) */
.db               { display: flex; min-height: 100vh; background: var(--color-surface); }
.db-main          { flex: 1; min-width: 0; overflow-y: auto; }
.db-content       { padding: 0 2rem 4rem; max-width: 1400px; }

/* 2. Hero */
.<prefix>-hero    { … }

/* 3. KPI Bento */
.<prefix>-bento   { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; … }
.<prefix>-kpi     { … }

/* 4. Section-specific components */

/* 5. Table */
.<prefix>-table   { … }

/* 6. Status pills */
.<prefix>-pill    { … }

/* 7. Responsive */
@media (max-width: 1100px) { … }
@media (max-width: 720px)  { … }
```

---

## 5. i18n Template

Each page's `i18n.js` must export:

```js
export function t(key, locale = 'fr') {
  return (STRINGS[locale] || STRINGS.fr)[key] ?? key
}

const STRINGS = {
  fr: {
    '<page>.hero.eyebrow':   '…',
    '<page>.hero.greeting':  'Bonjour,',
    '<page>.hero.subtitle':  '…',
    '<page>.search.placeholder': 'Rechercher…',
    '<page>.nav.home':       'Accueil',
    // …all keys
  },
  en: {
    '<page>.hero.eyebrow':   '…',
    '<page>.hero.greeting':  'Hello,',
    '<page>.hero.subtitle':  '…',
    '<page>.search.placeholder': 'Search…',
    '<page>.nav.home':       'Home',
    // …all keys
  },
}
```

---

## 6. Implementation Order

Implement pages in this order to minimize risk and validate the design system incrementally:

1. **Campaigns** — simplest structural fix (hero + cards + no-line)
2. **Users** — token drift fix + table rules
3. **Resources** — clone Users fix with different vocabulary
4. **Admin** — KPI bento refactor (most impactful visual change)
5. **Manager** — status grouping + slide panel
6. **FormEditor** — structural fix last (highest complexity, most risk)

After each page: run `npm run build` from `client/` and verify zero errors before proceeding.

---

## 7. Verification Checklist

Before marking a page done, verify all of the following:

- [ ] Shell uses `.db` / `.db-main` / `.db-content`
- [ ] Hero follows §1.4 template (`eyebrow + h1 + sub` with accent span)
- [ ] No `border: 1px solid` for section separation
- [ ] No `border-left: 4px solid` status indicators
- [ ] All colors are CSS tokens (no hardcoded hex except documented exceptions)
- [ ] KPIs displayed as bento cards (not a flat strip)
- [ ] Status values shown as pills (§1.7)
- [ ] Table rows have hover tint, no border grid
- [ ] AppTopbar receives `searchPlaceholder` (tKeys)
- [ ] Sidebar is a local `<Page>Sidebar.jsx` — no cross-page imports
- [ ] `i18n.js` has all keys in both `fr` and `en`
- [ ] `npm run build` produces zero errors
- [ ] Page renders correctly at 1400px, 1100px, 720px, 375px
