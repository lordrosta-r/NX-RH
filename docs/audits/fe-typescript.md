# Audit TypeScript — NX-RH Frontend

**Date:** Décembre 2024  
**Stack:** React 19, Vite, TanStack Query v5  
**Codebase:** `/Users/francoislongo/Desktop/taff/NX-RH/frontend-v2/src/`

---

## Résumé exécutif

**Score: 6.5/10** ✋

Le codebase TypeScript du frontend affiche une **architecture solide** avec une bonne configuration stricte et une structure d'API typée. Cependant, il souffre de **problèmes récurrents de typage permissif** qui affaiblissent la sécurité des types : **8 casts `as any` explicites**, utilisation excessive de `Record<string, unknown>`, `unknown` non-raffiné et `Partial<>` mal appliqué aux API.

### Points forts
✅ **tsconfig.json très strict** (`strict: true`, `noUnusedLocals`, `noUnusedParameters`)  
✅ **API bien typées avec génériques TanStack Query** (`useQuery<Type>`)  
✅ **Types centralisés et réutilisés** (`types/index.ts` exhaustif)  
✅ **Components UI correctement typés** (Button, FormField)  
✅ **Contexte Auth avec typage correct**

### Points faibles
❌ **8+ casts `as any` explicites** dans les pages (EvaluationsPage, AdminSetupWizardPage, etc.)  
❌ **`Record<string, unknown>` au lieu de discriminated unions** (Evaluation.answers)  
❌ **Props non-raffinées** avec `unknown` (admin.ts bulk operations)  
❌ **Erreurs potentielles à runtime** (type narrowing insuffisant)

---

## P0 — Bloquants 🚨

### 1. **`as any` casts non-justifiés** (6 occurrences)

**Fichier:** `pages/EvaluationsPage.tsx:303, 373`

```tsx
// ❌ PROBLÈME
<td className="px-4 py-3 text-slate-600">
  {(ev.campaignId as any)?.name ?? (typeof ev.campaignId === 'string' ? ev.campaignId : '')}
</td>
```

**Cause:** `Evaluation.campaignId` est typé `string`, mais la réponse API peuple la relation `campaign: Campaign` facultativement.

**Risque:** Perte de type sur `campaignId` — ne peut pas vérifier les propriétés à la compilation.

**Correction recommandée:**
```tsx
// ✅ SOLUTION 1: Typage discriminé
interface EvaluationResponse extends Evaluation {
  campaign?: Campaign  // Relation peuplée
}

// Ou ✅ SOLUTION 2: Helper type
export type EvaluatedWith<T extends object, R extends keyof any> = T & Record<R, any>

// Utilisation
const evaluationWithCampaign = data as EvaluatedWith<Evaluation, 'campaign'>
evaluationWithCampaign.campaign?.name
```

---

### 2. **Type narrowing insuffisant** (pages/OrgPage.tsx:118-119)

```tsx
// ❌ PROBLÈME
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const nodeTypes: any = { orgCircle: OrgCircleNode }
```

**Cause:** Configuration React Flow nécessite un dictionnaire de nœuds, mais le type n'est pas exposé par la lib.

**Risque:** Les erreurs au runtime sur les props de nœuds ne sont pas détectées.

**Correction:**
```tsx
// ✅ Solution
import { NodeTypes } from 'reactflow'  // if exported

const nodeTypes: NodeTypes = { 
  orgCircle: OrgCircleNode 
} as const  // Permet l'inférence stricte
```

---

### 3. **`unknown` non-raffiné dans les API** (api/admin.ts:52-64)

```tsx
// ❌ PROBLÈME
importUsers: (data: unknown[], dryRun = true) => 
  client.post('/api/users/import', data, { params: { dryRun } }),

importForm: (json: unknown) => 
  client.post<{ id: string }>('/api/forms/import', json),

updateHrSettings: (data: unknown) => 
  client.put('/api/hr/settings', data),
```

**Cause:** Le backend accepte des payloads hétérogènes. Aucun contrat de type n'est défini.

**Risque:** Pas de validation à la compilation — l'app peut envoyer des données malformées.

**Correction:**
```tsx
// ✅ Créer des types d'import
export interface UserImportPayload {
  users: Array<{
    email: string
    firstName: string
    lastName: string
    role: Role
  }>
}

importUsers: (data: UserImportPayload, dryRun = true) =>
  client.post('/api/users/import', data, { params: { dryRun } }),
```

---

## P1 — Importants ⚠️

### 4. **`Record<string, unknown>` au lieu de discriminated unions** (types/index.ts:89)

```tsx
// ❌ PROBLÈME
export interface Evaluation {
  ...
  answers?: Record<string, unknown>  // Trop vague
}
```

**Impacte:** Impossible de valider les réponses du formulaire — pas de connaissance du schéma attendu.

**Correction:**
```tsx
// ✅ Option 1: Discriminated union par type de question
type FormAnswer = 
  | { type: 'text'; value: string }
  | { type: 'rating'; value: number }
  | { type: 'choice'; value: string[] }
  | { type: 'yes_no'; value: boolean }

export interface Evaluation {
  answers?: Record<string, FormAnswer>
}

// ✅ Option 2: Générique de formulaire
interface FormResponse<T extends Form = Form> {
  answers: Record<FormQuestion['id'], any>  // Enfin peut être raffiné par T
}
```

---

### 5. **`Partial<User>` utilisé pour les PUT/PATCH** (api/users.ts:20-24)

```tsx
// ❌ PROBLÈME
createUser: (data: Partial<User>) =>
  client.post<User>('/api/users', data),

updateUser: (id: string, data: Partial<User>) =>
  client.put<User>(`/api/users/${id}`, data),
```

**Problème:** `Partial<>` peut être vide, mais la création requiert `email`, `firstName`, `lastName`. Patch requiert `id` mais accepte le reste.

**Correction:**
```tsx
// ✅ Types précis
interface CreateUserInput extends Pick<User, 'email' | 'firstName' | 'lastName' | 'role'> {
  password?: string
}

interface UpdateUserInput extends Partial<Omit<User, 'id' | 'createdAt' | 'updatedAt'>> {}

createUser: (data: CreateUserInput) =>
  client.post<User>('/api/users', data),

updateUser: (id: string, data: UpdateUserInput) =>
  client.put<User>(`/api/users/${id}`, data),
```

---

### 6. **`Record<string, boolean>` trop vague pour notificationPrefs** (types/index.ts:371)

```tsx
// ❌ PROBLÈME
interface UserPreferences {
  locale?: 'fr' | 'en'
  theme?: 'light' | 'dark' | 'system'
  notificationPrefs?: Record<string, boolean>  // Quels sont les clés valides ?
}
```

**Impact:** À la compilation, on peut passer n'importe quel key — la validation doit être runtime.

**Correction:**
```tsx
// ✅ Énumérer les clés
type NotificationChannel = 'email' | 'inApp' | 'sms'
type NotificationType = 'evaluation' | 'campaign' | 'offboarding'

type NotificationPrefs = 
  & Partial<Record<`${NotificationChannel}_${NotificationType}`, boolean>>
  & Partial<Record<NotificationChannel, boolean>>  // Ou globales

interface UserPreferences {
  locale?: 'fr' | 'en'
  theme?: 'light' | 'dark' | 'system'
  notificationPrefs?: NotificationPrefs
}
```

---

### 7. **Mutations TanStack Query sans typage explicite** (pages/EvaluationsPage.tsx:64-72)

```tsx
// ⚠️ OK mais pas optimal
const reassignMutation = useMutation({
  mutationFn: ({ id, evaluatorId }: { id: string; evaluatorId: string }) =>
    evaluationsApi.updateEvaluation(id, { evaluatorId }),
  onSuccess: () => { /* ... */ },
  onError: () => { /* ... */ },
})
```

**Meilleure pratique:** Extraire le type d'erreur TanStack Query

```tsx
// ✅ Meilleur
type MutationError = AxiosError<ApiError>

useMutation<Evaluation, MutationError, { id: string; evaluatorId: string }>({
  mutationFn: ({ id, evaluatorId }) => 
    evaluationsApi.updateEvaluation(id, { evaluatorId }),
  onError: (error) => {
    // ✅ Maintenant error.response?.data?.message est typé
    toast.error(error.response?.data?.message ?? 'Erreur')
  },
})
```

---

### 8. **`status: string` au lieu de `CampaignStatus`** (api/campaigns.ts:37)

```tsx
// ❌ PROBLÈME
updateCampaignStatus: (id: string, status: string) =>
  client.patch<Campaign>(`/api/campaigns/${id}/status`, { status }),
```

**Risque:** Pas de validation du statut — on peut passer `"invalid_status"`.

**Correction:**
```tsx
// ✅ Solution
updateCampaignStatus: (id: string, status: CampaignStatus) =>
  client.patch<Campaign>(`/api/campaigns/${id}/status`, { status }),
```

---

## P2 — Mineurs 💡

### 9. **Typage trop permissif d'erreurs API**

```tsx
// types/index.ts: 318-322
export interface ApiError {
  error: string           // Devrait être discriminé par type
  message?: string
  statusCode?: number
}
```

**Suggestion:** Discriminated union par statusCode:

```tsx
type ApiErrorResponse = 
  | { statusCode: 400; error: 'VALIDATION_ERROR'; details: Record<string, string[]> }
  | { statusCode: 401; error: 'UNAUTHORIZED' }
  | { statusCode: 500; error: 'SERVER_ERROR'; message: string }
```

---

### 10. **`useState` sans typage explicite** (pages/CampaignNewPage.tsx:80-81)

```tsx
// ⚠️ OK mais style incohérent
const [input, setInput] = useState('')

// Vs
const [statusFilter, setStatusFilter] = useState<string[]>([])
```

**Suggestion:** Être cohérent — utiliser le typage explicite systématiquement pour les types complexes.

---

### 11. **`bulkAction` endpoint accept generic `action: string`** (api/users.ts:58)

```tsx
// ⚠️ Non-validé
bulkAction: (data: { action: string; userIds: string[]; payload?: unknown }) =>
  client.post('/api/users/bulk', data),
```

**Suggestion:**
```tsx
type BulkUserAction = 'activate' | 'deactivate' | 'reassign_manager'

interface BulkActionInput {
  action: BulkUserAction
  userIds: string[]
  payload?: Record<string, unknown>
}

bulkAction: (data: BulkActionInput) =>
  client.post('/api/users/bulk', data),
```

---

### 12. **Event handler pas forcément typé dans les formulaires** (pages/CampaignNewPage.tsx:95)

```tsx
// ⚠️ À vérifier
onKeyDown={e => { if (e.key === 'Enter') { /* ... */ } }}
```

**Meilleure pratique:**
```tsx
onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
  if (e.key === 'Enter') { e.preventDefault(); add() }
}}
```

---

## Points positifs ✅

### ✅ Configuration TypeScript stricte

```json
{
  "strict": true,
  "noUnusedLocals": true,
  "noUnusedParameters": true,
  "noImplicitAny": true,           // Implicite via strict
  "noFallthroughCasesInSwitch": true,
  "erasableSyntaxOnly": true
}
```

**Verdict:** Excellente base — ne pas affaiblir.

---

### ✅ Types API cohérents et réutilisés

Tous les endpoints retournent des **types génériques correctement typés:**
- `useQuery<PaginatedResponse<User>>`
- `useMutation<Campaign, AxiosError, UpdateInput>`
- Réponses cohérentes avec `data:` pour l'accès

**Bon pattern à maintenir.**

---

### ✅ Discriminated unions pour les rôles

```tsx
export type Role = 'admin' | 'hr' | 'manager' | 'employee'
export type EvaluationStatus = 'assigned' | 'in_progress' | ... // 10 statuts
```

**Bien mieux que `string`** — TypeScript peut vérifier les cas exhaustifs.

---

### ✅ Hooks bien typés

```tsx
// useToast retourne ToastStore interfacé précisément
export const useToast(): ToastStore { /* ... */ }

// AuthContext fournit AuthContextType strict
export function useAuth(): AuthContextType { /* ... */ }
```

---

### ✅ Components UI avec Props interfaces

```tsx
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  /* ... */
}
```

---

## Recommandations prioritaires

### 🔴 **P0 — À faire immédiatement (1-2 jours)**

1. **Éliminer tous les `as any` casts:**
   - Créer `EvaluationWithRelations` pour les réponses avec relations peuplées
   - Typer `nodeTypes` de React Flow correctement
   - Fichiers: `EvaluationsPage.tsx`, `UserDetailPage.tsx`, `OrgPage.tsx`, `AdminSetupWizardPage.tsx`, `CampaignDetailPage.tsx`, `UserNewPage.tsx`

2. **Raffiner les `unknown` dans `admin.ts`:**
   - Créer `UserImportPayload`, `FormImportPayload`, `HrSettingsInput`
   - Valider à la compilation les payloads hétérogènes

3. **Fixer les imports API:**
   - `Partial<>` → types d'input spécifiques (`CreateUserInput`, `UpdateUserInput`)
   - `status: string` → `status: CampaignStatus | EvaluationStatus`

### 🟡 **P1 — À planifier (1 semaine)**

4. **Remplacer `Record<string, unknown>` par des unions:**
   - `Evaluation.answers` → Discriminated union basée sur `FormQuestion.type`
   - `notificationPrefs` → Énumération des clés valides

5. **Ajouter generics d'erreur aux mutations:**
   - Créer un `export type MutationError = AxiosError<ApiError>`
   - Utiliser partout: `useMutation<Success, MutationError, Input>`

6. **Linter rules TypeScript ESLint:**
   - Ajouter `@typescript-eslint/no-explicit-any: error` (actuellement: warn)
   - Ajouter `@typescript-eslint/explicit-function-return-types: warn`

### 🟢 **P2 — Amélioration continue**

7. **Documentation des contrats API:**
   - Ajouter des commentaires JSDoc sur les types complexes (FormAnswer, BulkActionInput)
   - Documenter les transitions d'état (`EvaluationStatus` flow machine)

8. **Tests de contrats:**
   - Créer des tests TypeScript (`api-contracts.test.ts` existe, l'améliorer)
   - Valider que les payloads match le backend schema

---

## Checklist de non-régression

- [ ] Aucun `any` explicit restant (excepté les deps non-typées)
- [ ] Tous les types `Partial<>` remplacés par des Input types spécifiques
- [ ] `Record<string, unknown>` → Discriminated unions ou Record<KnownKey, Type>
- [ ] Tous les endpoints retournent des types génériques corrects
- [ ] `eslint --ext .ts,.tsx --max-warnings 0` passe (zéro `any` warnings)
- [ ] `tsc --noEmit` passe sans erreur
- [ ] Aucune dérogation ESLint commentée pour le typage

---

## Comparaison avant/après (Exemple: EvaluationsPage)

### ❌ Avant
```tsx
{(ev.campaignId as any)?.name ?? (typeof ev.campaignId === 'string' ? ev.campaignId : '')}
```

### ✅ Après
```tsx
// types/index.ts
export interface EvaluationWithCampaign extends Evaluation {
  campaign?: Campaign
}

// pages/EvaluationsPage.tsx
const eval = data as EvaluationWithCampaign
{eval.campaign?.name ?? eval.campaignId}
```

**Impact:**
- ✅ `eval.campaign.name` typé strictement
- ✅ Erreur compilation si propriété n'existe pas
- ✅ Pas de `as any`
- ✅ Lisible et maintenable

---

## Ressources

- **TypeScript Handbook:** [Advanced Types](https://www.typescriptlang.org/docs/handbook/2/types-from-types.html)
- **TanStack Query:** [Type Safety](https://tanstack.com/query/v5/docs/react/typescript)
- **ESLint TypeScript:** [@typescript-eslint/no-explicit-any](https://typescript-eslint.io/rules/no-explicit-any/)

---

**Audit réalisé:** Décembre 2024  
**Prochaine révision:** Après implémentation P0 + P1 (2 semaines)
