# Re-audit 1 — Evaluations & Campaigns
**Date**: 2026-05-05 | **Branch**: refactor | **Commit**: b85f5d7

---

## EvaluationDetailPage

### Mode B — "Revoir →" button
⚠️ **Partial**

The button **is now present** in the Mode B header and visibility is correctly gated on `(isAdminOrHr || isManager)` when `status === 'submitted'`. However, clicking it calls `reviewMutation` — which fires `PATCH /api/evaluations/:id` with `{ reviewerScore, reviewerComment, nextYearObjectives, status: 'reviewed' }` — **not** `POST /api/evaluations/:id/transition { action: 'review' }` as required by the spec.

The spec (S-17 Mode B) states:
> **Bouton « Revoir »** : déclenche `submitted → reviewed`.

And the re-audit contract specifies:
> calls `POST /api/evaluations/:id/transition { action: 'review' }`

`evaluationsApi.transitionEvaluation(id, 'review')` exists in `src/api/evaluations.ts` (line 42) but is **not used** here. The button is also conflated with the "Enregistrer la révision" form-bottom button — both call the same mutation, which means clicking "Revoir →" in the header also silently submits any partially-filled reviewer score/comment.

**What is wrong**: The "Revoir →" button must call `evaluationsApi.transitionEvaluation(id!, 'review')` (→ `POST /api/evaluations/:id/transition { action: 'review' }`), not `updateEvaluation`.

---

### Mode C — Stepper (5 steps)
✅ **Conforming**

Stepper now defines exactly 5 steps in the correct order:

```
Soumis → Révisé → Signé (évalué) → Signé (manager) → Signé (RH)
```

No `validated` step is present. Labels match the re-audit spec exactly (`src/pages/EvaluationDetailPage.tsx` lines 416–421). Fixed.

---

### Mode D — Title format
✅ **Conforming**

Title renders as:
```jsx
Compte-rendu — {evaluation.evaluatee?.firstName} {evaluation.evaluatee?.lastName}
```
(line 547) — matches spec `"Compte-rendu — [Prénom Nom]"` exactly. Fixed.

---

## EvaluationNewPage
✅ **Conforming**

No longer a stub. The page now implements a real form with three required fields:
- **Campagne** — `<select>` populated from `campaignsApi.getCampaigns({ status: 'active' })`
- **Évalué** — `<select>` populated from `usersApi.getUsers({ limit: 200 })`
- **Évaluateur** — `<select>` populated from same users list

Submission calls `evaluationsApi.createEvaluation({ campaignId, evaluateeId, evaluatorId })` → `POST /api/evaluations`, then redirects to `/evaluations/:id`. Error state and loading state are handled. Fixed.

---

## CampaignAnalyticsPage
✅ **Conforming**

`useQuery` now calls:
```js
analyticsApi.getCampaignAnalytics(id!) → GET /api/analytics/campaigns/:id
```
(line 112) — no longer uses `campaignsApi`. Fixed.

---

## EvaluationsPage

### Dept filter
✅ **Conforming**

A department text input is present for non-employee roles (lines 130–138):
```jsx
<input type="text" placeholder="Département…" value={deptFilter} ... />
```
Value is passed as `department` param in both `getEvaluations` and query key. Fixed.

### Réaffecter action
✅ **Conforming**

"Réaffecter" menu item is present in the `⋮` dropdown for `isAdminOrHr` (line 225–230). It opens a modal with a `<select>` of users loaded from `usersApi.getUsers`. On confirm, calls `evaluationsApi.updateEvaluation(id, { evaluatorId })` → `PATCH /api/evaluations/:id`. Modal closes and query is invalidated on success. Fixed.

### Expirer action
✅ **Conforming**

"Expirer" menu item is present for `isAdminOrHr` (lines 231–237, styled in `text-error-600`). It opens a confirmation dialog explaining the action is irreversible, then calls `evaluationsApi.updateEvaluation(id, { status: 'expired' })`. Danger button styling (`bg-error-500`) is applied. Fixed.

### Status multi-select
❌ **Non-conforming**

Spec S-16 requires `Statut (select multiple)`. The implementation uses a plain single-value `<select>` (lines 120–129) — `multiple` attribute is absent, state is `string` not `string[]`, and the API call passes a single `status` string. Only one status can be filtered at a time.

**What is wrong**: The status filter must be replaced with a multi-select (or equivalent chip/checkbox UI), state changed to `string[]`, and the API call updated to pass multiple status values (e.g. `status: statusFilter.join(',')` or repeated params).

---

## Summary
- ✅ Conforming: 6 items
- ⚠️ Partial: 1 item
- ❌ Non-conforming: 1 item

| # | Item | Status |
|---|------|--------|
| 1 | Mode B — "Revoir →" button present & gated | ⚠️ Button present, wrong API endpoint (PATCH vs POST transition) |
| 2 | Mode C — Stepper 5 steps | ✅ |
| 3 | Mode D — Title "Compte-rendu — [Prénom Nom]" | ✅ |
| 4 | EvaluationNewPage — real form + POST /api/evaluations | ✅ |
| 5 | CampaignAnalyticsPage — analyticsApi.getCampaignAnalytics | ✅ |
| 6 | EvaluationsPage — Dept filter | ✅ |
| 7 | EvaluationsPage — Réaffecter modal | ✅ |
| 8 | EvaluationsPage — Expirer confirmation | ✅ |
| 9 | EvaluationsPage — Status multi-select | ❌ Still single select |

---

## Verdict
**PARTIALLY FIXED**

6 of 8 items from the original audit have been correctly implemented. Two remaining issues:

1. **⚠️ Mode B "Revoir →"**: Button exists but must call `evaluationsApi.transitionEvaluation(id!, 'review')` instead of `updateEvaluation`.
2. **❌ Status multi-select**: The status filter remains a single `<select>` — spec requires multi-select.
