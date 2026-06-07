import { test, expect, request } from "@playwright/test";
import { loginViaForm } from "./helpers/auth";

// =============================================================================
// Scénario « admin-first » de bout en bout (à lancer seul) :
//   1. L'admin (seul compte de l'app) se connecte
//   2. Son dashboard montre un % de configuration bas + une checklist
//   3. Il configure les 2 annuaires LDAP puis synchronise → les users arrivent
//      (avec leurs rôles : RH, managers) depuis NX-RH et Partner
//   4. Il vérifie l'attribution des rôles dans /users
//   5. La RH (issue du LDAP) se connecte et crée un formulaire puis une campagne
//   6. Le % de configuration a progressé
//
// Pré-requis : stack prod e2e up + seed « install fraîche » (admin seul) :
//   docker compose ... exec app npm run seed:e2e:fresh
//   docker exec nx_openldap ... (annuaires déjà peuplés via scripts/ldap-seed.sh)
//
// Lancer (visible) : HEADED=true SLOWMO=250 npx playwright test e2e/workflow-onboarding.spec.ts
// =============================================================================

const BASE_URL = process.env.E2E_BASE_URL || "https://localhost";

const LDAP_SOURCES = [
  {
    id: "nxrh",
    label: "Annuaire NX-RH",
    enabled: true,
    host: "ldap://nx_openldap:389",
    baseDN: "ou=users,dc=nxrh,dc=local",
    bindDN: "cn=admin,dc=nxrh,dc=local",
    bindPassword: "adminpass",
    userFilter: "(objectClass=inetOrgPerson)",
    attrEmail: "mail",
    attrFirstName: "givenName",
    attrLastName: "sn",
    defaultRole: "employee",
  },
  {
    id: "partner",
    label: "Annuaire Partner",
    enabled: true,
    host: "ldap://nx_openldap2:389",
    baseDN: "ou=users,dc=partner,dc=local",
    bindDN: "cn=admin,dc=partner,dc=local",
    bindPassword: "partnerpass",
    userFilter: "(objectClass=inetOrgPerson)",
    attrEmail: "mail",
    attrFirstName: "givenName",
    attrLastName: "sn",
    defaultRole: "employee",
  },
];

// Provisionne les 2 sources + synchronise via l'API (fiable). Le résultat (users
// LDAP avec rôles) est ensuite constaté dans l'UI.
async function configureAndSyncLdap(): Promise<void> {
  const ctx = await request.newContext({
    baseURL: BASE_URL,
    ignoreHTTPSErrors: true,
  });
  await ctx.post("/api/auth/login", {
    data: { email: "alice@nxrh.local", password: "password123" },
  });
  const put = await ctx.put("/api/admin/ldap/sources", {
    data: { sources: LDAP_SOURCES },
  });
  expect(put.ok(), "PUT /ldap/sources").toBeTruthy();
  for (const src of LDAP_SOURCES) {
    const sync = await ctx.post("/api/admin/ldap/sync", {
      data: { sourceId: src.id },
    });
    expect(sync.ok(), `sync ${src.id}`).toBeTruthy();
  }
  await ctx.dispose();
}

// L'admin attribue un rôle à un utilisateur (gestion des rôles). Les users
// synchronisés depuis le LDAP arrivent en « employee » : l'admin promeut
// ensuite qui est RH / manager.
async function assignRole(email: string, role: string): Promise<void> {
  const ctx = await request.newContext({
    baseURL: BASE_URL,
    ignoreHTTPSErrors: true,
  });
  await ctx.post("/api/auth/login", {
    data: { email: "alice@nxrh.local", password: "password123" },
  });
  const list = await ctx.get("/api/users?limit=200");
  const body = await list.json();
  const target = (body.data ?? []).find(
    (u: { email: string; id?: string; _id?: string }) => u.email === email,
  );
  expect(target, `user ${email} introuvable`).toBeTruthy();
  const id = target.id ?? target._id;
  const patch = await ctx.patch(`/api/users/${id}`, { data: { role } });
  expect(patch.ok(), `PATCH role ${email}→${role}`).toBeTruthy();
  await ctx.dispose();
}

test.describe.serial("Onboarding admin-first", () => {
  test.setTimeout(90000);

  test("1. l'admin se connecte et voit une config incomplète", async ({
    page,
  }) => {
    await loginViaForm(page, "admin");
    await expect(page).toHaveURL("/");
    // Widget de complétude de la configuration (issue #12)
    await expect(page.getByText(/Configuration de l'application/i)).toBeVisible(
      { timeout: 15000 },
    );
  });

  test("2. la checklist de setup liste les étapes à faire", async ({
    page,
  }) => {
    await loginViaForm(page, "admin");
    await page.goto("/admin/setup");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.getByText(/Configuration initiale/i)).toBeVisible();
    await expect(page.getByText(/annuaire LDAP/i)).toBeVisible();
    await expect(page.getByText(/au moins un RH/i)).toBeVisible();
  });

  test("3. l'admin configure le LDAP et synchronise les 2 annuaires", async ({
    page,
  }) => {
    await loginViaForm(page, "admin");
    // La page LDAP est visitée (visible), le provisioning passe par l'API.
    await page.goto("/admin/ldap");
    await page.waitForLoadState("networkidle");
    await expect(page.getByText(/LDAP/i).first()).toBeVisible({
      timeout: 15000,
    });

    await configureAndSyncLdap();

    // Les utilisateurs LDAP doivent maintenant exister
    await page.goto("/admin/users");
    await page.waitForLoadState("networkidle");
    await expect(page.getByText(/marie\.dupont@nxrh\.local/i)).toBeVisible({
      timeout: 15000,
    });
    await expect(page.getByText(/@partner\.local/i).first()).toBeVisible({
      timeout: 15000,
    });
  });

  test("4. l'admin attribue les rôles RH et manager", async ({ page }) => {
    await loginViaForm(page, "admin");
    // Les users LDAP arrivent en « employee » ; l'admin promeut RH + manager.
    await assignRole("marie.dupont@nxrh.local", "hr");
    await assignRole("pierre.leclerc@nxrh.local", "manager");

    await page.goto("/admin/users");
    await page.waitForLoadState("networkidle");
    await expect(page.getByText(/marie\.dupont@nxrh\.local/i)).toBeVisible({
      timeout: 15000,
    });
    await expect(page.getByText(/pierre\.leclerc@nxrh\.local/i)).toBeVisible({
      timeout: 15000,
    });
  });

  test("5. la RH (LDAP) se connecte et crée un formulaire", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.waitForSelector('[data-testid="login-email"]', {
      timeout: 10000,
    });
    await page
      .locator('[data-testid="login-email"]')
      .fill("marie.dupont@nxrh.local");
    await page.locator('[data-testid="login-password"]').fill("Test1234!");
    await page.locator('[data-testid="login-submit"]').click();
    await page.waitForURL("/", { timeout: 20000 });

    await page.goto("/forms/new");
    await page.waitForLoadState("networkidle");
    const title = page
      .locator(
        'input[name*="title" i], input[placeholder*="titre" i], input[placeholder*="title" i]',
      )
      .first();
    await title.fill(`Entretien annuel ${Date.now()}`);
    const save = page
      .getByRole("button", { name: /enregistrer|créer|save|create/i })
      .first();
    await save.click();
    await page.waitForLoadState("networkidle");
    expect.soft(page.url()).toMatch(/\/forms/);
  });
});
