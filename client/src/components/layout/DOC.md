# components/layout

> Composants d'orchestration de la coquille SPA (sidebar + topbar).
> À ne pas confondre avec `components/ui/` (composants atomiques réutilisables).

## Fichiers

### `navConfig.jsx`
Source unique de vérité de la navigation latérale. Une fonction par rôle :
- `getNavItemsForRole(role)` → tableau `[{ id, to, label, Icon, end? }]`
- `getBrandSubForRole(role)` → libellé sous le nom de la marque (ex. "Espace manager")

Le rôle `director` est mappé sur `manager` (pas de page dédiée — c'est un manager + analytics étendus).

### Modification

Pour ajouter un lien dans la sidebar d'un rôle, éditer le tableau `NAV[<role>]` dans `navConfig.jsx`.
Pour ajouter un nouveau rôle, ajouter une entrée `NAV[<role>]` + `BRAND_SUB[<role>]`.

## Décisions clés
- **Pas d'i18n ici** : les libellés sont en français pour le MVP. À déplacer dans `i18n/` si EN devient prioritaire.
- **Pas de check de permission** : la sidebar affiche les items du rôle ; la sécurité réelle est dans `ProtectedRoute` + back.
- **Active state** : géré par React Router via `<NavLink>` dans `AppSidebar`. La prop `end: true` est nécessaire pour les routes index sinon `/employee` reste actif sur `/employee/goals`.
