# Re-audit 4 — Forms, EvaluationsPage, Users API
**Date**: 2025-07-14 | **Branch**: refactor | **Commit**: b85f5d7 Fix remaining non-conformities: OffboardingPage status modal, AdminUsersImportPage dryRun+template+separator, AdminFormsImportPage paste-JSON+validation+preview+template+redirect, stepper labels, FormsPage aria-label

---

## FormNewPage

### Phase types (self/n-1/objectives/aspirations/all)
✅ **Conforms.**
`PHASES` array (lines 20–26) declares exactly: `self`, `n-1`, `objectives`, `aspirations`, `all` — matching spec S-14 verbatim. The old `employee / manager / both` values are gone.

### Campagne liée field
❌ **Does not conform.**
Spec S-14 requires a `Campagne [Select ▼]` field in the Métadonnées column. The implementation has no such field. The `meta` state is `{ title, description, formType, isFrozen }` — no `campaignId` key, no select rendering a campaign list, and no campaign data query in this component.

### Anonyme toggle
❌ **Does not conform.**
Spec S-14 requires an `☐ Anonyme` checkbox in the Métadonnées column. The implementation contains no such toggle. Neither the `meta` state nor the JSX includes any `isAnonymous` / `anonymous` field.

### Question types (choice, n1_import, scale)
✅ **Conforms.**
`QUESTION_TYPES` array (lines 8–18) includes:
- `choice` → "Choix multiple" ✅
- `n1_import` → "Import N-1 (auto)" ✅
- `scale` → "Curseur 0-100%" ✅

All three types required by the audit are present. The `choice` type even renders a dynamic options editor when selected (lines 111–148).

---

## FormsPage

### Campaign filter
✅ **Conforms.**
A campaign `<select>` filter is present (lines 96–105). It fetches active campaigns via `campaignsApi.getCampaigns({ status: 'active', limit: 100 })` and passes `campaignId: campaignFilter || undefined` to the `getForms` query (line 43). State variable `campaignFilter` is correctly wired.

---

## EvaluationsPage

### Department filter
✅ **Conforms.**
A text `<input>` with `placeholder="Département…"` is present (lines 130–138), rendered for non-employee roles. Its value is bound to `deptFilter` state which is passed as `department: deptFilter || undefined` in the `getEvaluations` call (line 50).

### Réaffecter action + modal
✅ **Conforms.**
The `⋮` dropdown menu (line 225–230) contains a "Réaffecter" button, gated to `isAdminOrHr`, that sets `reassignTarget`. A full modal (lines 316–343) renders when `reassignTarget !== null`, containing:
- A labelled "Nouvel évaluateur" `<select>` populated from `usersApi.getUsers()`
- Disabled "Réaffecter" CTA until an evaluator is selected
- `reassignMutation` calling `evaluationsApi.updateEvaluation(id, { evaluatorId })`

### Expirer action + confirmation
✅ **Conforms.**
The `⋮` dropdown (lines 232–237) contains an "Expirer" button (styled in `error` colour, gated to `isAdminOrHr`) that sets `expireConfirm`. A confirmation modal (lines 346–364) renders when `expireConfirm !== null`, with an irreversibility warning and an "Expirer" CTA calling `expireMutation.mutate(expireConfirm)` which patches `{ status: 'expired' }`.

---

## src/api/users.ts

### gdprExport endpoint
✅ **Conforms.**
```ts
gdprExport: (id: string) =>
  client.get(`/api/users/${id}/gdpr-export`, { responseType: 'blob' }),
```
The endpoint is `/api/users/${id}/gdpr-export` — not `/gdpr` — exactly as required.

> ⚠️ Minor observation (not an audit failure): a duplicate method `exportGdpr` exists at line 55–56 calling the same endpoint. This is dead code but does not break conformance.

---

## src/types/index.ts

### QuestionType 'choice'
✅ **Conforms.**
Line 100:
```ts
export type QuestionType = 'text' | 'textarea' | 'rating' | 'choice' | 'yes_no' | 'weather' | 'mobility' | 'n1_import' | 'scale' | 'objective_item'
```
`'choice'` is present (not `'multiple_choice'`). `'n1_import'` and `'scale'` are also present.

### QuestionPhase values
✅ **Conforms.**
Line 101:
```ts
export type QuestionPhase = 'self' | 'n-1' | 'objectives' | 'aspirations' | 'all'
```
All five spec-mandated values are present, in the correct form (including the hyphenated `'n-1'`).

---

## Summary
- ✅ Conforming: 9 items
- ⚠️ Partial: 0 items
- ❌ Non-conforming: 2 items

| # | Item | Status |
|---|------|--------|
| 1 | FormNewPage — Phase types | ✅ |
| 2 | FormNewPage — Campagne liée field | ❌ |
| 3 | FormNewPage — Anonyme toggle | ❌ |
| 4 | FormNewPage — Question types (choice, n1_import, scale) | ✅ |
| 5 | FormsPage — Campaign filter | ✅ |
| 6 | EvaluationsPage — Department filter | ✅ |
| 7 | EvaluationsPage — Réaffecter action + modal | ✅ |
| 8 | EvaluationsPage — Expirer action + confirmation | ✅ |
| 9 | src/api/users.ts — gdprExport endpoint | ✅ |
| 10 | src/types/index.ts — QuestionType 'choice' | ✅ |
| 11 | src/types/index.ts — QuestionPhase values | ✅ |

## Verdict
**PARTIALLY FIXED**

9 of 11 items are correctly implemented. Two items in `FormNewPage` remain unaddressed from the original audit: the **"Campagne liée" select** and the **"Anonyme" checkbox** are still absent from the metadata panel, contrary to spec S-14. Both require adding a `campaignId` field (with an active-campaigns query) and an `isAnonymous` boolean to the component's `meta` state and the rendered form.
