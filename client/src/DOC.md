# Architecture SPA — `client/src/`

Ce dossier contient l'intégralité du frontend React (Single Page Application) de NanoXplore RH.

## Chaîne d'entrée

```
index.html → src/main.jsx → <App /> → React Router v7 → Pages
```

1. **`index.html`** — point d'entrée unique, charge `src/main.jsx`
2. **`main.jsx`** — monte `<App />` dans le DOM, initialise les providers globaux
3. **`App.jsx`** — déclare toutes les routes via React Router v7
4. **Pages** — chaque route rend un composant de `pages/`

## Simplification des rôles

- Le produit n'expose plus de portail `director` distinct.
- Un manager peut superviser d'autres managers via la hiérarchie, sans rôle supplémentaire côté UX.
- Les comptes historiques `director` sont temporairement rabattus vers `/manager` pour éviter une rupture brutale.

## Structure des dossiers

| Dossier | Rôle |
|---------|------|
| `contexts/` | Contextes globaux React (Auth, Theme, Locale) |
| `layouts/` | Composants de mise en page partagés (`AuthedLayout`, `ProtectedRoute`) |
| `pages/` | Un sous-dossier par page — composants, styles et i18n co-localisés |
| `components/ui/` | Composants UI réutilisables (pas de logique métier) |
| `hooks/` | Hooks utilitaires partagés |
| `i18n/` | Factory `makeT` pour l'internationalisation |
| `styles/` | CSS global, design tokens, surcharges de thème |

## Ajouter une nouvelle page

1. Créer un dossier `src/pages/<MaPage>/` avec le composant principal
2. Ajouter la route dans `App.jsx` :
   ```jsx
   <Route path="/ma-page" element={
     <ProtectedRoute roles={['employee']}>
       <MaPage />
     </ProtectedRoute>
   } />
   ```
3. Si nécessaire, ajouter un lien dans le layout de navigation

> Pas besoin de toucher à la config Vite ni aux routes Express — le SPA fallback gère tout.

## Commandes

| Commande | Description |
|----------|-------------|
| `npm run dev` | Serveur de dev avec HMR (port 5173), proxy API vers Express |
| `npm run build` | Build de production → `mongo/server/public/` |
| `npm test` | Lance les tests Vitest |
