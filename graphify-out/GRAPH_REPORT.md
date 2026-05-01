# Graph Report - NX-RH  (2026-05-01)

## Corpus Check
- 206 files · ~232,728 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 563 nodes · 559 edges · 31 communities detected
- Extraction: 74% EXTRACTED · 26% INFERRED · 0% AMBIGUOUS · INFERRED: 144 edges (avg confidence: 0.8)
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
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 40|Community 40]]
- [[_COMMUNITY_Community 41|Community 41]]

## God Nodes (most connected - your core abstractions)
1. `useAuth()` - 39 edges
2. `useTranslate()` - 25 edges
3. `runTests()` - 18 edges
4. `useLocaleCtx()` - 15 edges
5. `useLocale()` - 15 edges
6. `authGuard()` - 14 edges
7. `connect()` - 7 edges
8. `syncUsers()` - 7 edges
9. `previewUsers()` - 6 edges
10. `AuthedLayout()` - 6 edges

## Surprising Connections (you probably didn't know these)
- `run()` --calls--> `Login()`  [INFERRED]
  scripts/e2e/test-hierarchy.js → client/src/pages/login/Login.jsx
- `run()` --calls--> `Login()`  [INFERRED]
  scripts/e2e/test-restricted.js → client/src/pages/login/Login.jsx
- `authGuard()` --calls--> `buildApp()`  [INFERRED]
  mongo/server/middleware/authGuard.js → mongo/server/__tests__/routes/users.test.js
- `buildApp()` --calls--> `authGuard()`  [INFERRED]
  mongo/server/__tests__/routes/evaluations.pdf.test.js → mongo/server/middleware/authGuard.js
- `buildApp()` --calls--> `authGuard()`  [INFERRED]
  mongo/server/__tests__/routes/offboarding.test.js → mongo/server/middleware/authGuard.js

## Communities

### Community 0 - "Community 0"
Cohesion: 0.05
Nodes (35): AdminUsers(), useAuth(), useLocaleCtx(), useTranslate(), useThemeCtx(), computeEvalProgress(), Employee(), OnboardingBanner() (+27 more)

### Community 1 - "Community 1"
Cohesion: 0.04
Nodes (10): authGuard(), buildApp(), buildApp(), buildApp(), buildApp(), buildApp(), buildApp(), buildApp() (+2 more)

### Community 2 - "Community 2"
Cohesion: 0.05
Nodes (14): Admin(), AdminAudit(), AdminCommunications(), AdminCompliance(), AdminIntegrations(), AdminOrgChart(), AdminRoles(), AdminSandbox() (+6 more)

### Community 3 - "Community 3"
Cohesion: 0.06
Nodes (19): auth(), runTests(), run(), run(), run(), run(), run(), run() (+11 more)

### Community 4 - "Community 4"
Cohesion: 0.12
Nodes (9): connect(), seedDemo(), fullSelfAnswers(), partialSelfAnswers(), seedRich(), seed(), seed(), seed() (+1 more)

### Community 5 - "Community 5"
Cohesion: 0.14
Nodes (10): handleUpdate(), _sendStatusNotifications(), getTransporter(), _initTransporter(), sendMail(), notify(), notifyMany(), runDeadlineReminders() (+2 more)

### Community 6 - "Community 6"
Cohesion: 0.11
Nodes (3): fetchCampaigns(), fetchEvals(), apiFetch()

### Community 7 - "Community 7"
Cohesion: 0.16
Nodes (12): formatAnswer(), sanitizeAnonymity(), handlePdf(), _renderPdf(), _renderQuestions(), _renderSignatureLine(), handleDetail(), handleList() (+4 more)

### Community 8 - "Community 8"
Cohesion: 0.15
Nodes (8): applyConfig(), buildExportCSS(), DevDesignLab(), ensureFont(), injectCSS(), load(), readFromDOM(), syncTopbarNav()

### Community 9 - "Community 9"
Cohesion: 0.22
Nodes (4): EvalDrawer(), ExpiryBadge(), fmtDate(), getDaysUntilExpiry()

### Community 10 - "Community 10"
Cohesion: 0.51
Nodes (9): bindAsync(), getVal(), makeClient(), previewUsers(), searchAsync(), syncUsers(), testConnection(), unbindAsync() (+1 more)

### Community 12 - "Community 12"
Cohesion: 0.33
Nodes (1): buildApp()

### Community 13 - "Community 13"
Cohesion: 0.33
Nodes (1): buildApp()

### Community 14 - "Community 14"
Cohesion: 0.33
Nodes (1): buildApp()

### Community 15 - "Community 15"
Cohesion: 0.33
Nodes (1): buildApp()

### Community 17 - "Community 17"
Cohesion: 0.47
Nodes (3): CalendarWidget(), getDaysInMonth(), getFirstDayOfWeek()

### Community 19 - "Community 19"
Cohesion: 0.4
Nodes (2): EditModal(), toInputDate()

### Community 20 - "Community 20"
Cohesion: 0.6
Nodes (3): buildFilter(), createClient(), getConfig()

### Community 26 - "Community 26"
Cohesion: 0.83
Nodes (3): getBrandSubForRole(), getNavItemsForRole(), resolveRole()

### Community 27 - "Community 27"
Cohesion: 0.67
Nodes (2): getLocale(), makeT()

### Community 28 - "Community 28"
Cohesion: 0.67
Nodes (2): CampaignCard(), fmtDate()

### Community 29 - "Community 29"
Cohesion: 0.67
Nodes (2): fmtDate(), TemplateCard()

### Community 30 - "Community 30"
Cohesion: 0.83
Nodes (3): fmtDate(), OffboardingDrawer(), userName()

### Community 31 - "Community 31"
Cohesion: 1.0
Nodes (3): computeDonePhases(), computeProgress(), EvaluationSummary()

### Community 32 - "Community 32"
Cohesion: 1.0
Nodes (2): header(), main()

### Community 33 - "Community 33"
Cohesion: 1.0
Nodes (2): cleanup(), run()

### Community 35 - "Community 35"
Cohesion: 1.0
Nodes (2): allowedNotifKeysFor(), filterNotifPrefsByRole()

### Community 37 - "Community 37"
Cohesion: 1.0
Nodes (2): getNavMenuForRole(), resolveLabels()

### Community 39 - "Community 39"
Cohesion: 0.67
Nodes (1): useNotifBadges()

### Community 40 - "Community 40"
Cohesion: 1.0
Nodes (2): fmtDate(), ProfileSection()

### Community 41 - "Community 41"
Cohesion: 1.0
Nodes (2): RoleSpaceSection(), spacesFor()

## Knowledge Gaps
- **Thin community `Community 12`** (6 nodes): `users.test.js`, `buildApp()`, `makeChain()`, `mockFindByIdUser()`, `MockUser()`, `tokenFor()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 13`** (6 nodes): `evaluations.pdf.test.js`, `buildApp()`, `makePopulateChain()`, `mockEval()`, `MockPDF()`, `tokenFor()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 14`** (6 nodes): `offboarding.test.js`, `buildApp()`, `makeChain()`, `MockOffboardingRequest()`, `mockRequestDoc()`, `tokenFor()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 15`** (6 nodes): `resources.test.js`, `buildApp()`, `makeChain()`, `MockResource()`, `mockResourceDoc()`, `tokenFor()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 19`** (6 nodes): `HRCampaignDetail.jsx`, `AssignModal()`, `CmpReassignModal()`, `DeleteConfirmModal()`, `EditModal()`, `toInputDate()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 27`** (4 nodes): `index.js`, `getLocale()`, `makeT()`, `setLocale()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 28`** (4 nodes): `HRCampaigns.jsx`, `CampaignCard()`, `fmtDate()`, `StatusBadge()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 29`** (4 nodes): `HRTemplates.jsx`, `fmtDate()`, `NewTemplateModal()`, `TemplateCard()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 32`** (3 nodes): `header()`, `main()`, `run.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 33`** (3 nodes): `cleanup()`, `run()`, `seed.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 35`** (3 nodes): `auth.js`, `allowedNotifKeysFor()`, `filterNotifPrefsByRole()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 37`** (3 nodes): `navMenuConfig.js`, `getNavMenuForRole()`, `resolveLabels()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 39`** (3 nodes): `useNotifBadges.js`, `fetchBadges()`, `useNotifBadges()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 40`** (3 nodes): `ProfileSection.jsx`, `fmtDate()`, `ProfileSection()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 41`** (3 nodes): `RoleSpaceSection.jsx`, `RoleSpaceSection()`, `spacesFor()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `useAuth()` connect `Community 0` to `Community 2`?**
  _High betweenness centrality (0.086) - this node is a cross-community bridge._
- **Why does `Login()` connect `Community 0` to `Community 3`?**
  _High betweenness centrality (0.045) - this node is a cross-community bridge._
- **Are the 38 inferred relationships involving `useAuth()` (e.g. with `TestConsumer()` and `LogoutConsumer()`) actually correct?**
  _`useAuth()` has 38 INFERRED edges - model-reasoned connections that need verification._
- **Are the 23 inferred relationships involving `useTranslate()` (e.g. with `Settings()` and `FormBuilder()`) actually correct?**
  _`useTranslate()` has 23 INFERRED edges - model-reasoned connections that need verification._
- **Are the 17 inferred relationships involving `runTests()` (e.g. with `run()` and `run()`) actually correct?**
  _`runTests()` has 17 INFERRED edges - model-reasoned connections that need verification._
- **Are the 13 inferred relationships involving `useLocaleCtx()` (e.g. with `AuthedLayout()` and `useLocale()`) actually correct?**
  _`useLocaleCtx()` has 13 INFERRED edges - model-reasoned connections that need verification._
- **Are the 14 inferred relationships involving `useLocale()` (e.g. with `useLocaleCtx()` and `AdminSettings()`) actually correct?**
  _`useLocale()` has 14 INFERRED edges - model-reasoned connections that need verification._