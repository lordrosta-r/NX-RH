# Audit Performance Frontend — NX-RH

## Résumé exécutif
Le frontend est globalement bien configuré pour la performance (lazy loading systématique, TanStack Query avec staleTime 5min, Suspense). Les problèmes identifiés sont des optimisations P1/P2 — pas de blocant critique.

## Score global : 7/10

## P0 — Bloquants
Aucun blocant critique.

## P1 — Importants

### P1-1: ReactQuery Devtools embarqué en prod
**Problème :** `ReactQueryDevtools` importé dans `src/main.tsx` sans condition `import.meta.env.DEV`
**Où :** `src/main.tsx:4-17`
**Impact :** Poids JS inutile chargé en production pour chaque utilisateur.
**Fix :** `{import.meta.env.DEV && <ReactQueryDevtools />}`

### P1-2: Aucune stratégie de chunking Vite
**Problème :** Pas de `build.rollupOptions.output.manualChunks` dans `vite.config.ts`
**Où :** `vite.config.ts:5-21`
**Impact :** Risque de gros chunks non splittés (router + pages + libs lourdes dans un seul bundle).
**Fix :** Séparer `vendor` (react, react-dom), `charts` (recharts), `flow` (@xyflow/react), `dnd` (@dnd-kit)

### P1-3: Dépendances lourdes potentiellement non justifiées partout
**Problème :** `@xyflow/react`, `recharts`, `@dnd-kit/*`, `dagre` sont des libs volumineuses.
**Où :** `package.json`
**Impact :** Bundle size élevé si ces libs sont incluses dans le chunk principal.
**Fix :** Vérifier que ces libs sont uniquement dans des pages lazy-loaded.

### P1-4: `key={index}` dans des listes
**Problème :** Plusieurs listes utilisent l'index comme clé React.
**Où :** `src/pages/UsersPage.tsx`, `src/pages/EvaluationsPage.tsx`
**Impact :** Réconciliation React moins fiable, re-renders inutiles et bugs visuels sur listes dynamiques.

### P1-5: Invalidations TanStack Query trop larges
**Problème :** `invalidateQueries({ queryKey: ['users'] })` invalide toutes les variantes de la query.
**Où :** `src/pages/UsersPage.tsx`, `src/pages/EvaluationsPage.tsx`
**Impact :** Refetch de données non concernées par la mutation.

## P2 — Mineurs

### P2-1: Multiple useQuery au montage CampaignNewPage
**Problème :** 3 queries conditionnelles + Promise.all déclenchées dès l'affichage du wizard.
**Où :** `src/pages/CampaignNewPage.tsx`

## Points positifs ✅
- Toutes les pages sont lazy-loaded via `React.lazy()` dans le router
- Suspense fallback correctement configuré
- TanStack Query : `staleTime: 5min`, `retry: 1`, `refetchOnWindowFocus: false`
- `keepPreviousData` utilisé sur EvaluationsPage pour pagination fluide

## Recommandations prioritaires
1. Conditionner `ReactQueryDevtools` à `import.meta.env.DEV`
2. Ajouter `manualChunks` dans Vite (vendor, recharts, xyflow, dnd-kit)
3. Remplacer tous les `key={index}` par des IDs stables (`item._id`)
4. Affiner les invalidations QueryClient (clés plus précises)
