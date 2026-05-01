# Graph Report - NX-RH  (2026-05-01)

## Corpus Check
- 209 files · ~273,998 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 572 nodes · 567 edges · 30 communities detected
- Extraction: 74% EXTRACTED · 26% INFERRED · 0% AMBIGUOUS · INFERRED: 146 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 40|Community 40]]

## God Nodes (most connected - your core abstractions)
1. `useAuth()` - 39 edges
2. `useTranslate()` - 25 edges
3. `runTests()` - 18 edges
4. `authGuard()` - 15 edges
5. `useLocaleCtx()` - 15 edges
6. `useLocale()` - 15 edges
7. `connect()` - 7 edges
8. `syncUsers()` - 7 edges
9. `previewUsers()` - 6 edges
10. `getVisibleUserIds()` - 6 edges

## Surprising Connections (you probably didn't know these)
- `run()` --calls--> `Login()`  [INFERRED]
  scripts/e2e/test-hierarchy.js → client/src/pages/login/Login.jsx
- `run()` --calls--> `Login()`  [INFERRED]
  scripts/e2e/test-restricted.js → client/src/pages/login/Login.jsx
- `authGuard()` --calls--> `buildApp()`  [INFERRED]
  mongo/server/middleware/authGuard.js → mongo/server/__tests__/routes/events.test.js
- `authGuard()` --calls--> `buildApp()`  [INFERRED]
  mongo/server/middleware/authGuard.js → mongo/server/__tests__/routes/users.test.js
- `authGuard()` --calls--> `buildApp()`  [INFERRED]
  mongo/server/middleware/authGuard.js → mongo/server/__tests__/routes/evaluations.test.js

## Communities

### Community 0 - "Community 0"
Cohesion: 0.05
Nodes (35): AdminUsers(), useAuth(), useLocaleCtx(), useTranslate(), useThemeCtx(), computeEvalProgress(), Employee(), OnboardingBanner() (+27 more)

### Community 1 - "Community 1"
Cohesion: 0.03
Nodes (12): authGuard(), buildApp(), buildApp(), buildApp(), buildApp(), buildApp(), buildApp(), buildApp() (+4 more)

### Community 2 - "Community 2"
Cohesion: 0.05
Nodes (14): Admin(), AdminAudit(), AdminCommunications(), AdminCompliance(), AdminIntegrations(), AdminOrgChart(), AdminRoles(), AdminSandbox() (+6 more)

### Community 3 - "Community 3"
Cohesion: 0.06
Nodes (19): auth(), runTests(), run(), run(), run(), run(), run(), run() (+11 more)

### Community 4 - "Community 4"
Cohesion: 0.14
Nodes (13): formatAnswer(), sanitizeAnonymity(), handleN1Context(), handlePdf(), _renderPdf(), _renderQuestions(), _renderSignatureLine(), handleDetail() (+5 more)

### Community 5 - "Community 5"
Cohesion: 0.12
Nodes (9): connect(), seedDemo(), fullSelfAnswers(), partialSelfAnswers(), seedRich(), seed(), seed(), seed() (+1 more)

### Community 6 - "Community 6"
Cohesion: 0.14
Nodes (10): handleUpdate(), _sendStatusNotifications(), getTransporter(), _initTransporter(), sendMail(), notify(), notifyMany(), runDeadlineReminders() (+2 more)

### Community 7 - "Community 7"
Cohesion: 0.11
Nodes (3): fetchCampaigns(), fetchEvals(), apiFetch()

### Community 8 - "Community 8"
Cohesion: 0.15
Nodes (8): applyConfig(), buildExportCSS(), DevDesignLab(), ensureFont(), injectCSS(), load(), readFromDOM(), syncTopbarNav()

### Community 9 - "Community 9"
Cohesion: 0.22
Nodes (4): EvalDrawer(), ExpiryBadge(), fmtDate(), getDaysUntilExpiry()

### Community 10 - "Community 10"
Cohesion: 0.51
Nodes (9): bindAsync(), getVal(), makeClient(), previewUsers(), searchAsync(), syncUsers(), testConnection(), unbindAsync() (+1 more)

### Community 11 - "Community 11"
Cohesion: 0.29
Nodes (1): buildApp()

### Community 13 - "Community 13"
Cohesion: 0.33
Nodes (1): buildApp()

### Community 14 - "Community 14"
Cohesion: 0.33
Nodes (1): buildApp()

### Community 16 - "Community 16"
Cohesion: 0.47
Nodes (3): CalendarWidget(), getDaysInMonth(), getFirstDayOfWeek()

### Community 18 - "Community 18"
Cohesion: 0.4
Nodes (2): EditModal(), toInputDate()

### Community 19 - "Community 19"
Cohesion: 0.6
Nodes (3): buildFilter(), createClient(), getConfig()

### Community 25 - "Community 25"
Cohesion: 0.83
Nodes (3): getBrandSubForRole(), getNavItemsForRole(), resolveRole()

### Community 26 - "Community 26"
Cohesion: 0.67
Nodes (2): getLocale(), makeT()

### Community 27 - "Community 27"
Cohesion: 0.67
Nodes (2): CampaignCard(), fmtDate()

### Community 28 - "Community 28"
Cohesion: 0.67
Nodes (2): fmtDate(), TemplateCard()

### Community 29 - "Community 29"
Cohesion: 0.83
Nodes (3): fmtDate(), OffboardingDrawer(), userName()

### Community 30 - "Community 30"
Cohesion: 1.0
Nodes (3): computeDonePhases(), computeProgress(), EvaluationSummary()

### Community 31 - "Community 31"
Cohesion: 1.0
Nodes (2): header(), main()

### Community 32 - "Community 32"
Cohesion: 1.0
Nodes (2): cleanup(), run()

### Community 34 - "Community 34"
Cohesion: 1.0
Nodes (2): allowedNotifKeysFor(), filterNotifPrefsByRole()

### Community 36 - "Community 36"
Cohesion: 1.0
Nodes (2): getNavMenuForRole(), resolveLabels()

### Community 38 - "Community 38"
Cohesion: 0.67
Nodes (1): useNotifBadges()

### Community 39 - "Community 39"
Cohesion: 1.0
Nodes (2): fmtDate(), ProfileSection()

### Community 40 - "Community 40"
Cohesion: 1.0
Nodes (2): RoleSpaceSection(), spacesFor()

## Knowledge Gaps
- **Thin community `Community 11`** (7 nodes): `events.test.js`, `buildApp()`, `makeChain()`, `makeThenable()`, `MockEvent()`, `mockEventDoc()`, `tokenFor()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 13`** (6 nodes): `users.test.js`, `buildApp()`, `makeChain()`, `mockFindByIdUser()`, `MockUser()`, `tokenFor()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 14`** (6 nodes): `evaluations.test.js`, `buildApp()`, `makeChain()`, `makeThenable()`, `mockEvalDoc()`, `tokenFor()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 18`** (6 nodes): `HRCampaignDetail.jsx`, `AssignModal()`, `CmpReassignModal()`, `DeleteConfirmModal()`, `EditModal()`, `toInputDate()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 26`** (4 nodes): `index.js`, `getLocale()`, `makeT()`, `setLocale()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 27`** (4 nodes): `HRCampaigns.jsx`, `CampaignCard()`, `fmtDate()`, `StatusBadge()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 28`** (4 nodes): `HRTemplates.jsx`, `fmtDate()`, `NewTemplateModal()`, `TemplateCard()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 31`** (3 nodes): `header()`, `main()`, `run.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 32`** (3 nodes): `cleanup()`, `run()`, `seed.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 34`** (3 nodes): `auth.js`, `allowedNotifKeysFor()`, `filterNotifPrefsByRole()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 36`** (3 nodes): `navMenuConfig.js`, `getNavMenuForRole()`, `resolveLabels()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 38`** (3 nodes): `useNotifBadges.js`, `fetchBadges()`, `useNotifBadges()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 39`** (3 nodes): `ProfileSection.jsx`, `fmtDate()`, `ProfileSection()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 40`** (3 nodes): `RoleSpaceSection.jsx`, `RoleSpaceSection()`, `spacesFor()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `useAuth()` connect `Community 0` to `Community 2`?**
  _High betweenness centrality (0.083) - this node is a cross-community bridge._
- **Why does `Login()` connect `Community 0` to `Community 3`?**
  _High betweenness centrality (0.044) - this node is a cross-community bridge._
- **Are the 38 inferred relationships involving `useAuth()` (e.g. with `TestConsumer()` and `LogoutConsumer()`) actually correct?**
  _`useAuth()` has 38 INFERRED edges - model-reasoned connections that need verification._
- **Are the 23 inferred relationships involving `useTranslate()` (e.g. with `Settings()` and `FormBuilder()`) actually correct?**
  _`useTranslate()` has 23 INFERRED edges - model-reasoned connections that need verification._
- **Are the 17 inferred relationships involving `runTests()` (e.g. with `run()` and `run()`) actually correct?**
  _`runTests()` has 17 INFERRED edges - model-reasoned connections that need verification._
- **Are the 14 inferred relationships involving `authGuard()` (e.g. with `buildApp()` and `buildApp()`) actually correct?**
  _`authGuard()` has 14 INFERRED edges - model-reasoned connections that need verification._
- **Are the 13 inferred relationships involving `useLocaleCtx()` (e.g. with `AuthedLayout()` and `useLocale()`) actually correct?**
  _`useLocaleCtx()` has 13 INFERRED edges - model-reasoned connections that need verification._