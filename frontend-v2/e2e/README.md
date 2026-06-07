# E2E Tests - NX-RH

Playwright end-to-end tests for all 4 roles: admin, hr, manager, employee.

## Prerequisites

All three services must be running before executing tests.

### 1. MongoDB
```bash
mongod
```

### 2. Backend API (port 5050)
```bash
cd /Users/francoislongo/Desktop/taff/NX-RH/mongo/server
node index.js
```

### 3. Frontend (port 5173)
```bash
cd /Users/francoislongo/Desktop/taff/NX-RH/frontend-v2
npm run dev
```

### 4. Seed data
```bash
cd /Users/francoislongo/Desktop/taff/NX-RH
node mongo/database/seed-rich-v2.js
```

## Test credentials

| Role     | Email                 | Password   |
|----------|-----------------------|------------|
| admin    | admin@nx-rh.fr        | Test1234!  |
| hr       | rh@nx-rh.fr           | Test1234!  |
| manager  | mgr.back@nx-rh.fr     | Test1234!  |
| employee | emp.back1@nx-rh.fr    | Test1234!  |

## Running tests

```bash
cd /Users/francoislongo/Desktop/taff/NX-RH/frontend-v2

# Run all E2E tests (headless)
npm run test:e2e

# Run with interactive UI
npm run test:e2e:ui

# Open HTML report after a run
npm run test:e2e:report
```

## Test files

| File                    | Coverage                                      |
|-------------------------|-----------------------------------------------|
| auth.spec.ts            | Login/logout for all roles, auth guards       |
| admin-users.spec.ts     | User list, user detail, CSV import            |
| campaigns.spec.ts       | Campaign list, detail, creation               |
| forms.spec.ts           | Form list, creation, JSON import              |
| evaluations.spec.ts     | Evaluation list/detail for admin and employee |
| hr-flows.spec.ts        | HR dashboard, evaluations, campaigns, remind  |
| manager-flows.spec.ts   | Manager dashboard, org chart, campaigns       |
| admin-full.spec.ts      | Admin portal, audit, analytics, settings      |
| page-checks.spec.ts     | All pages for all roles — no crash check      |
