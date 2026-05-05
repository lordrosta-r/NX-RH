# Re-audit 3 — Profile, Onboarding, Offboarding
**Date**: 2026-05-05 | **Branch**: refactor | **Commit**: b85f5d7

---

## ProfilePage

### formType filter in "Mes demandes"

✅ **Conforms** — Both issues from the original audit are fixed.

1. **API call**: The list query now passes `formType` correctly:
   ```ts
   const REQUEST_FORM_TYPES = 'mobility_request,salary_raise_request,promotion_request,training_request'
   evaluationsApi.getEvaluations({ evaluateeId: user?.id, formType: REQUEST_FORM_TYPES, limit: 20 })
   ```
   This matches the spec (`GET /api/evaluations?formType=...`). Previously it used a generic unfiltred `GET /api/evaluations`.

2. **Dropdown `GET /api/forms?formType=<type>`**: `handleRequestType()` now calls `formsApi.getForms({ formType: formType, limit: 1 })`, using the correct `formType` query param — no longer `search=formType`.

**Additional observations (not in original audit scope):**
- The spec specifies `evaluateeId=me` (literal string) but the implementation sends the actual `user?.id`. This may or may not be handled server-side.
- The spec requires a `warning` toast when no form exists for a type; the implementation uses `alert()` with a slightly different message. The toast variant is still non-conformant with the spec.

---

### Manager field (read-only)

✅ **Conforms** — The manager field is now present and fully read-only in the Informations tab.

The component fetches the manager via:
```ts
const { data: managerData } = useQuery({
  queryKey: ['manager', user?.managerId],
  queryFn: () => usersApi.getUser(user!.managerId!).then((r) => r.data),
  enabled: !!user?.managerId,
})
```
And renders it as a read-only field:
```tsx
<label>Manager</label>
<p>{managerData ? `${managerData.firstName} ${managerData.lastName}` : '—'}</p>
```
Always displayed as a `<p>` (never an editable `<input>`), even in `editMode`. ✅

---

## OnboardingPage

### "Passer cette étape" hidden on step 0

⚠️ **Partial** — The step-0 hide is correctly implemented, but the button is also hidden on step 4 (the last step), which the spec does not require.

**Condition used:**
```tsx
{step > 0 && step < STEP_COUNT - 1 ? (
  <button>Passer cette étape</button>
) : (
  <span />
)}
```

| Step | Spec | Implementation |
|------|------|----------------|
| 0 (1ère étape) | Hidden | Hidden ✅ |
| 1 | Visible | Visible ✅ |
| 2 | Visible | Visible ✅ |
| 3 | Visible | Visible ✅ |
| 4 (dernière) | **Visible** | **Hidden** ❌ |

The spec states: *"Disponible sur toutes les étapes sauf la 1ère."* — Steps 1 through 4 should all show the button. The condition `step < STEP_COUNT - 1` (i.e. `step < 4`) incorrectly suppresses it on step 4.

---

### "Votre équipe" step shows manager + team

✅ **Conforms** — The team step (step 2) now correctly fetches and displays the manager and team members.

Previously it showed department colleagues. Now:
- Manager fetched via `usersApi.getUser(user!.managerId!)` — displayed in a distinct highlighted card labelled "Manager direct"
- Team members fetched via `usersApi.getUsers({ managerId: user?.managerId })` — displays users sharing the same manager (excluding self)

Both queries are enabled only on `step === 2` and guarded by `!!user?.managerId`. ✅

---

## OffboardingPage

### "Modifier statut" menu action

✅ **Conforms** — The "Modifier statut" action is present in the `⋮` dropdown menu for every row.

```tsx
{(isAdmin || user?.role === 'hr') && (
  <button onClick={() => { setOpenMenu(null); setStatusTarget({ id: rec.id, current: rec.status }); setNewStatus(rec.status) }}>
    Modifier statut
  </button>
)}
```

Visible to both `admin` and `hr` roles, consistent with the spec's RBAC for `/offboarding` (`admin, hr`). ✅

---

### Modal + PATCH /api/offboarding/:id/status

✅ **Conforms** — A proper modal opens with a status `<select>` and calls the correct endpoint.

**Modal** (lines 446–478): rendered when `statusTarget !== null`, contains a `<select>` with all three statuses (`pending`, `in_progress`, `completed`) and an "Enregistrer" button.

**Mutation:**
```ts
const changeStatusMutation = useMutation({
  mutationFn: ({ id, status }) => offboardingApi.changeStatus(id, status),
  // ...
})
```

**API module** (`src/api/offboarding.ts`):
```ts
changeStatus: (id: string, status: string) =>
  client.patch(`/api/offboarding/${id}/status`, { status }),
```

Endpoint is `PATCH /api/offboarding/:id/status` with `{ status }` body — exactly as specified. ✅

---

## Summary

| Item | Status |
|------|--------|
| ProfilePage — `formType` filter in "Mes demandes" list | ✅ Conforming |
| ProfilePage — Dropdown `GET /api/forms?formType=<type>` | ✅ Conforming |
| ProfilePage — Manager field (read-only) | ✅ Conforming |
| OnboardingPage — "Passer cette étape" hidden on step 0 | ⚠️ Partial |
| OnboardingPage — "Votre équipe" shows manager + team | ✅ Conforming |
| OffboardingPage — "Modifier statut" in ⋮ menu | ✅ Conforming |
| OffboardingPage — Modal + `PATCH /api/offboarding/:id/status` | ✅ Conforming |

- ✅ Conforming: **6 items**
- ⚠️ Partial: **1 item**
- ❌ Non-conforming: **0 items**

---

## Verdict

**PARTIALLY FIXED**

6 of 7 audited items are fully conformant. One remaining issue:

- **OnboardingPage** — "Passer cette étape" is correctly hidden on step 0 but is also incorrectly hidden on step 4. The spec requires it to be hidden **only** on the first step; steps 1–4 should all show it. Fix: change the condition from `step > 0 && step < STEP_COUNT - 1` to simply `step > 0`.

Two secondary observations outside the original audit scope also remain open:
1. **ProfilePage** — no-form-found uses `alert()` instead of a `warning` toast with the spec-mandated message.
2. **ProfilePage** — `evaluateeId` sends the actual user ID instead of the literal string `me` as specified.
