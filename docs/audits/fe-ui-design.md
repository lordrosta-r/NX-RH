# Audit UI/Design System — NX-RH Frontend

## Résumé exécutif
Le frontend a une base visuelle assez homogène autour de Tailwind + slate + primary, avec une identité RH propre et plutôt lisible. En revanche, le design system est encore peu centralisé : beaucoup de pages réinventent cartes, boutons, champs et modales avec des variantes locales. Le layout global est cohérent sur certaines vues, mais plusieurs pages cassent le cadre (min-h-screen p-6, largeurs différentes, paddings divergents). Globalement, l'UI est solide mais manque de normalisation pour passer d'un "bon produit" à un vrai design system maintenable.

## Score global : 6.5/10

## P0 — Bloquants
Aucun blocant critique identifié.

## P1 — Importants

### P1-1: Design system partiellement dupliqué
**Problème :** Les composants UI partagés existent, mais sont peu consommés. Beaucoup de pages redéfinissent leurs propres boutons, cartes, badges, champs et menus.
**Où :** `src/components/ui/Button.tsx`, `src/components/ui/FormField.tsx`, `src/pages/CampaignNewPage.tsx`, `src/pages/DashboardAdminPage.tsx`, `src/pages/UsersPage.tsx`, `src/pages/ProfilePage.tsx`
**Impact :** Incohérence de rendu, maintenance plus coûteuse, risque de dérive visuelle.

### P1-2: Cohérence de layout inégale entre pages
**Problème :** Le layout global impose `max-w-7xl px-4 sm:px-6 lg:px-8 py-8`, mais plusieurs pages sortent du cadre avec leurs propres conteneurs et paddings.
**Où :** `src/layouts/AppLayout.tsx:21-31`, `src/pages/UsersPage.tsx`, `src/pages/ProfilePage.tsx`, `src/pages/AdminHubPage.tsx`, `src/pages/CampaignNewPage.tsx`
**Impact :** Sensation de produit "patchwork", difficultés à homogénéiser l'expérience.

### P1-3: Radius/shadows non normalisés
**Problème :** Coexistence de `rounded-md`, `rounded-lg`, `rounded-xl`, `rounded-2xl` et `shadow-sm`, `shadow`, `shadow-lg`, `shadow-xl` selon les pages, sans règle claire.
**Où :** `src/pages/DashboardAdminPage.tsx`, `src/pages/AdminHubPage.tsx`, `src/pages/LoginPage.tsx`, `src/pages/ProfilePage.tsx`
**Impact :** Hiérarchie visuelle instable, impression d'UI composite.

### P1-4: Palette trop large et usage hétérogène des couleurs
**Problème :** Base `primary/slate` cohérente, mais usage fréquent de `blue`, `violet`, `pink`, `teal`, `rose`, `amber`, `orange`, `green` en dehors des tokens métier.
**Où :** `src/tailwind.config.ts`, `src/pages/AdminHubPage.tsx`, `src/pages/DashboardAdminPage.tsx`
**Impact :** Identité visuelle moins maîtrisée, difficulté à standardiser les états.

## P2 — Mineurs / Améliorations

### P2-1: Typographie sans composant de titre/section
**Problème :** Les patterns `text-2xl font-bold`, `text-lg font-semibold` sont répétés partout sans composant dédié.
**Impact :** Système de titrage non standardisé.

### P2-2: Formulaires page-specific
**Problème :** Chaque page recode ses labels, erreurs et focus states au lieu d'utiliser `FormField` + `Input`.
**Où :** `src/components/ui/FormField.tsx`, `src/pages/LoginPage.tsx`, `src/pages/CampaignNewPage.tsx`

### P2-3: Buttons réécrits localement
**Problème :** Le composant `Button` existe mais les pages utilisent encore des `<button>` stylés à la main.
**Où :** `src/components/ui/Button.tsx`, `src/pages/LoginPage.tsx`, `src/pages/DashboardAdminPage.tsx`

## Points positifs ✅
- Bonne base Tailwind avec tokens `primary`, `success`, `warning`, `error`, `info`
- Navbar et AppLayout structurent correctement l'app
- `Button`, `PageHeader`, `FormField` existent déjà : bon socle pour industrialiser
- Ton visuel RH sobre et professionnel

## Recommandations prioritaires
1. Centraliser les patterns UI dans `Button`, `Input`, `FormField`, `PageHeader`, `Card`, `Badge`
2. Imposer un seul cadre de layout par défaut (`max-w-7xl`, padding, espacement vertical)
3. Réduire la palette décorative et formaliser les couleurs métier
4. Standardiser radius + shadow par niveau de surface (`rounded-xl` pour cards, `rounded-lg` pour inputs)
5. Remplacer les boutons/inputs localement stylés par les composants partagés
