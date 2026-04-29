# client/src/pages/admin — Documentation

## Contenu du dossier

Ce dossier contient les 10 pages du portail administrateur de NanoXplore RH.
Chaque fichier est une **page SPA** montée dans `<Outlet />` via `AuthedLayout`.
Aucune page ne gère sa propre sidebar ou topbar (pris en charge par le layout).

### Fichiers

| Fichier                     | Route                      | Description |
|-----------------------------|---------------------------|-------------|
| `Admin.jsx`                 | `/admin`                  | Dashboard — KPIs, répartition des rôles, accès rapides, santé système |
| `AdminUsers.jsx`            | `/admin/users`            | CRUD utilisateurs — tableau, recherche, modal création/édition, toggle actif/inactif |
| `AdminOrgChart.jsx`         | `/admin/org-chart`        | Organigramme hiérarchique — 4 modes (arbre, managérial, hub, diagnostic) |
| `AdminRoles.jsx`            | `/admin/roles`            | Matrice RBAC lecture seule — rôles système + feuille de route |
| `AdminIntegrations.jsx`     | `/admin/integrations`     | Configuration LDAP/AD, SSO (3 providers), SMTP, Webhooks |
| `AdminCommunications.jsx`   | `/admin/communications`   | Éditeur de templates d'emails avec variables |
| `AdminCompliance.jsx`       | `/admin/compliance`       | Rétention RGPD, anonymisation, export, audit log RGPD |
| `AdminSecurity.jsx`         | `/admin/security`         | Audit log avec filtres, impersonation avec warning légal |
| `AdminSandbox.jsx`          | `/admin/sandbox`          | Bac à sable campagne test (isolé de la production) |
| `AdminSettings.jsx`         | `/admin/settings`         | Branding, langue par défaut, politique mots de passe, mode maintenance |
| `admin.css`                 | —                         | CSS partagé pour toutes les pages admin |
| `i18n/fr.js`                | —                         | Traductions françaises (toutes les 10 pages) |
| `i18n/en.js`                | —                         | Traductions anglaises (toutes les 10 pages) |
| `i18n/index.js`             | —                         | Factory `makeT` — exporte `t` |

## Architecture & patterns

### Vérification du rôle

Chaque page effectue une double vérification :

```jsx
// Redirect si non-admin
useEffect(() => {
  if (!loading && user && user.role !== 'admin') navigate('/employee', { replace: true })
}, [loading, user, navigate])

// Guard de rendu
if (loading || !user) return null
if (user.role !== 'admin') return null
```

### Data fetching

- `useQuery` (TanStack Query v5) avec `credentials: 'include'`
- `queryKey: ['admin-users']` partagé entre Admin, AdminUsers, AdminOrgChart, AdminSecurity
- Graceful fallback si l'endpoint n'existe pas (ex. `/api/audit-logs`)

### i18n

```js
import { useLocale } from '../../hooks/useLocale'
import { t as pageT } from './i18n'

const { t } = useLocale(pageT)  // t('admin.users.col.name') → 'Nom' | 'Name'
```

Format des clés : `admin.<page>.<section>.<element>`

### CSS

- Préfixe `.adm-` pour toutes les classes (scope admin)
- Tokens CSS uniquement — pas de couleurs hardcodées
- Classes utilitaires : `.adm-card`, `.adm-hero`, `.adm-kpis`, `.adm-btn`, `.adm-modal`, etc.

## Migration — historique

### Avant (legacy)

```
Admin.jsx          ← dashboard + sidebar + topbar intégrés, window.location.href
AdminSidebar.jsx   ← sidebar dédiée à l'admin (supprimé)
main.jsx           ← point d'entrée Vite séparé (supprimé)
```

La page admin était une **MPA** (Multi-Page Application) avec son propre point d'entrée Vite,
sa propre sidebar et topbar. Elle utilisait `useAuthUser` (hook legacy) et `window.location.href`
pour les redirections.

### Après (SPA migré)

- Toutes les pages sont des **composants route** dans la SPA React Router v7
- `AuthedLayout` fournit la topbar/navigation — les pages ne la gèrent plus
- `useAuth()` depuis `AuthContext` remplace `useAuthUser`
- `useNavigate()` remplace `window.location.href`
- `useQuery` remplace `useEffect + fetch`
- `Link` de react-router-dom remplace les `<a href>`
- 9 nouvelles pages créées pour les sous-routes admin

## Points d'attention

1. **Mutations réelles** : `AdminIntegrations`, `AdminCommunications`, `AdminCompliance`,
   `AdminSandbox`, `AdminSettings` ont des états locaux et des interactions mock.
   Les mutations vers l'API backend sont à brancher lors de l'implémentation backend.

2. **Impersonation** (`AdminSecurity`) : le bouton est fonctionnellement désactivé (mock).
   Une vraie impersonation nécessite `POST /api/auth/impersonate` côté serveur.

3. **Organigramme** (`AdminOrgChart`) : l'arbre est construit en mémoire depuis `/api/users`.
   Pour de grandes organisations (>500 utilisateurs), prévoir une pagination ou un endpoint dédié.

4. **QueryKey partagé** : `['admin-users']` est utilisé par plusieurs pages.
   `queryClient.invalidateQueries({ queryKey: ['admin-users'] })` rafraîchit toutes les pages.

## Bugs connus & limitations (non corrigés — backend manquant)

| ID     | Page                   | Description |
|--------|------------------------|-------------|
| ADM-04 | AdminCompliance        | Boutons Anonymiser/Exporter dans le modal de confirmation ne font aucun appel API — état local uniquement. Utiliser les endpoints `/api/users/:id/gdpr-anonymize` (DELETE) et `/api/users/:id/gdpr-export` (GET) de `AdminUsers` |
| ADM-05 | AdminCommunications    | Sauvegarde des templates d'email est locale — aucun endpoint backend existant |
| ADM-06 | AdminSettings          | Tous les boutons "Enregistrer" (branding, langue, mot de passe, maintenance) sont locaux — aucun endpoint backend |
| ADM-07 | AdminSecurity          | Bouton Impersonation est du code mort — nécessite `POST /api/auth/impersonate` côté serveur |
| ADM-08 | AdminIntegrations      | Bouton "Enregistrer" SMTP sans `onClick` — aucun endpoint `/api/admin/smtp/config` existant |
| ADM-09 | AdminIntegrations      | Modal "Ajouter webhook" ne persiste pas — aucun endpoint webhook existant |
| ADM-10 | GET /api/users         | Sans `?page`, le paramètre `limit` est ignoré — silencieusement capé à 100 utilisateurs |
| ADM-11 | Admin dashboard        | `/api/health` ne retourne pas `uptime` — la section "uptime" ne s'affiche jamais |
