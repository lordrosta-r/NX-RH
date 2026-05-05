# Re-audit 2 — Admin Pages
**Date**: 2025-07-15 | **Branch**: refactor | **Commit**: b85f5d7 Fix remaining non-conformities: OffboardingPage status modal, AdminUsersImportPage dryRun+template+separator, AdminFormsImportPage paste-JSON+validation+preview+template+redirect, stepper labels, FormsPage aria-label

---

## AdminConfigPage

### GET /api/admin/config endpoint
✅ **Conforme** — `admin.ts` line 46: `getConfigKeys: () => client.get<Array<{ key: string; value: string }>>('/api/admin/config')`. L'endpoint est désormais `GET /api/admin/config` (et non plus `/api/admin/config/keys`). Le composant appelle correctement `adminApi.getConfigKeys()`.

---

## AdminAuditPage

### actorId param
✅ **Conforme** — L'état local utilise `actorId` (`useState({ action: '', targetType: '', actorId: '', from: '', to: '' })`). Le filtre est correctement propagé via `...filters` vers `adminApi.getAuditLog()`. La signature de `getAuditLog` dans `admin.ts` (l. 29) type bien `actorId?: string`. Plus aucune référence à `actor`.

### CSV export
✅ **Conforme** — `exportCsv()` appelle `adminApi.exportAuditCsv({ action, actorId, targetType, from, to })`. Dans `admin.ts` (l. 50-51): `client.get('/api/admin/audit/export/csv', { params, responseType: 'blob' })`. L'endpoint est `GET /api/admin/audit/export/csv` avec les bons paramètres dont `actorId`.

---

## AdminUsersPage

### authSource column
✅ **Conforme** — Composant `AuthSourceBadge` défini (l. 24-29) avec badge bleu pour `ldap`, gris pour `local`. Colonne `Auth` présente dans le header (l. 106). Rendu `<AuthSourceBadge source={user.authSource} />` ligne 128.

### deactivatedAt column
✅ **Conforme** — Colonne `Désactivé le` présente dans le header (l. 106). Rendu conditionnel (l. 131-135) : si `!user.isActive` → affiche `user.deactivatedAt` formaté, sinon `—`.

### RGPD banner
⚠️ **Partiel** — Un bandeau conditionnel existe (l. 74-79) et s'affiche lorsque `hasOffboarding` (= `data?.data?.some(u => u.offboardingStatus === 'offboarding')`). Cependant :
1. Le texte affiché est *"Des utilisateurs sont en cours d'offboarding. Vérifiez les dossiers."* — il ne correspond pas au texte RGPD imposé par la spec S-30 : *« Les données utilisateur sont soumises au RGPD. Toute anonymisation est irréversible et auditée. »*
2. La spec requiert un bandeau **permanent** en haut de page (pas conditionnel). Le bandeau offboarding est utile mais ne se substitue pas au bandeau RGPD fixe.

### Forcer désactivation
✅ **Conforme** — Action présente dans `ActionMenu` conditionnellement pour `isAdminOrHr` (l. 152-159) : label `Forcer désactivation`, icône `ShieldOff`, désactivée si `!user.isActive`. Modal de confirmation implémentée (l. 201-226). Mutation `forceDeactivateMut` appelle `adminApi.forceDeactivateUser(id)`.

### authSource filter
✅ **Conforme** — Select présent dans la barre de filtres (l. 91-99) avec options `Toutes sources` / `Local` / `LDAP`. La valeur `authSourceFilter` est passée à la query via `...(authSourceFilter ? { authSource: authSourceFilter } : {})`.

---

## AdminUsersImportPage

### dryRun toggle
✅ **Conforme** — `const [dryRun, setDryRun] = useState(true)` (l. 48) — défaut `true`. Toggle UI présent (l. 110-121) avec label *"Mode simulation"* et description dynamique : *"Aperçu uniquement — aucune donnée ne sera modifiée"* (dryRun=true) vs *"Import réel — les utilisateurs seront créés/mis à jour"* (dryRun=false).

### Auto-detect separator
✅ **Conforme** — Fonction `detectSeparator` (l. 18-21) lit la première ligne et retourne `;` ou `,`. Appelée dans `processFile` (l. 59) : `const sep = detectSeparator(text)`. Le parseur `parseCsv` utilise le séparateur détecté.

### Template CSV
✅ **Conforme** — Fonction `downloadTemplateCsv` (l. 33-40) génère un CSV avec les 7 colonnes spec (`firstName · lastName · email · role · department · managerEmail · sector`) + une ligne exemple. Bouton *"Télécharger le template CSV"* présent (l. 95-100).

### Endpoint dryRun param
✅ **Conforme** — `admin.ts` l. 58 : `importUsers: (data, dryRun = true) => client.post('/api/users/import', data, { params: { dryRun } })`. Endpoint `POST /api/users/import?dryRun=true|false` correct. Appelé en page (l. 80) : `adminApi.importUsers(rows, dryRun)`.

---

## AdminFormsImportPage

### Tabs (Fichier / Coller JSON)
✅ **Conforme** — `const [tab, setTab] = useState<'file' | 'paste'>('file')` (l. 55). Deux onglets rendus (l. 126-139) : *"📁 Fichier"* (avec `FileText`) et *"📋 Coller JSON"* (avec `ClipboardList`). Contenu conditionnel sur `tab`.

### Validation (types, IDs, formType)
✅ **Conforme** — Fonction `validateForm` (l. 11-34) :
- Vérifie `title`, `formType`, `questions` présents
- Valide `formType` contre `VALID_FORM_TYPES` (10 valeurs) — erreur si inconnu
- Pour chaque question : vérifie `id` (présence + unicité via `Set`) et `type` contre `VALID_QUESTION_TYPES` (9 valeurs)
- Erreurs affichées dans un panneau rouge (l. 178-183)

### Rich preview
✅ **Conforme** — Aperçu riche (l. 186-219) affiché si `json && !errors.length` : grille 3 colonnes (Titre / Type / Questions), liste des 5 premières questions avec badge de type et texte tronqué, indicateur "+ N autres".

### Template JSON
⚠️ **Partiel** — Un bouton *"Télécharger le template JSON"* existe (l. 117-122) et la fonction `downloadTemplate()` (l. 36-51) génère un JSON statique côté client. **Cependant**, la spec S-41 impose explicitement : *"Bouton « ⬇ Télécharger le template JSON » → `GET /api/forms/template`"*. La méthode `adminApi.getFormTemplate()` existe dans `admin.ts` (l. 60) mais n'est **pas appelée** par la page — le template est généré localement au lieu d'être récupéré depuis l'API.

### Endpoint POST /api/forms/import
✅ **Conforme** — `admin.ts` l. 59 : `importForm: (json) => client.post<{ id: string }>('/api/forms/import', json)`. Appelé dans `doImport` (l. 98) : `adminApi.importForm(json)`.

### Redirect to /forms/:id
✅ **Conforme** — Post-import (l. 101) : `setTimeout(() => navigate(id ? `/forms/${id}` : '/forms'), 2000)`. Redirige vers `/forms/:id` si l'API retourne un `id`, vers `/forms` sinon. Message de succès affiché pendant 2 secondes (l. 232-237).

---

## Summary
- ✅ Conforming: 16 items
- ⚠️ Partial: 2 items
- ❌ Non-conforming: 0 items

**Items partiels :**
1. **AdminUsersPage — RGPD banner** : Le bandeau offboarding conditionnel est présent mais ne correspond pas au texte RGPD permanent requis par S-30.
2. **AdminFormsImportPage — Template JSON** : Le bouton existe mais appelle une génération locale au lieu de `GET /api/forms/template`.

---

## Verdict
**PARTIALLY FIXED** — 16/18 items correctement implémentés. 2 items partiels subsistent, les 8 non-conformités critiques de l'audit initial ont été résorbées. Aucune régression détectée.
