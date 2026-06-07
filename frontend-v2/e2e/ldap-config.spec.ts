import { test, expect } from "@playwright/test";
import { loginAs } from "./helpers/auth";
import {
  waitForPageLoad,
  expectNoErrors,
  expectNotUnauthorized,
  takeScreenshot,
} from "./helpers/utils";

test.describe("LDAP - Configuration Admin", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, "admin");
    await page.waitForLoadState("networkidle");
  });

  test("/admin/ldap accessible", async ({ page }) => {
    await page.goto("/admin/ldap");
    await waitForPageLoad(page);
    await expectNoErrors(page);
    await expectNotUnauthorized(page);
    await takeScreenshot(page, "admin-ldap");
  });

  test("4 onglets présents (Config/Test/Preview/Sync)", async ({ page }) => {
    await page.goto("/admin/ldap");
    await waitForPageLoad(page);

    // LDAP tabs are <button> elements, not role="tab"
    const tabs = page.getByRole("button");
    await expect
      .soft(tabs.filter({ hasText: /config/i }).first())
      .toBeVisible({ timeout: 15000 });
    await expect
      .soft(tabs.filter({ hasText: /^test$/i }).first())
      .toBeVisible({ timeout: 15000 });
    await expect
      .soft(
        tabs.filter({ hasText: /prévisualisation|aperçu|preview/i }).first(),
      )
      .toBeVisible({ timeout: 15000 });
    await expect
      .soft(tabs.filter({ hasText: /synchronis|sync/i }).first())
      .toBeVisible({ timeout: 15000 });
  });

  test("Tab Config - champs de formulaire présents", async ({ page }) => {
    await page.goto("/admin/ldap");
    await waitForPageLoad(page);

    const configTab = page.getByRole("button", { name: /config/i });
    if (await configTab.isVisible()) {
      await configTab.click();
      await page.waitForLoadState("networkidle");
    }

    const urlField = page
      .locator(
        'input[name*="url"], input[placeholder*="ldap"], input[id*="url"]',
      )
      .first();
    const baseDnField = page
      .locator(
        'input[name*="base"], input[placeholder*="dc="], input[id*="base"]',
      )
      .first();
    const bindDnField = page
      .locator(
        'input[name*="bind"], input[id*="bind"], input[placeholder*="cn="]',
      )
      .first();
    const passwordField = page.locator('input[type="password"]').first();

    await expect.soft(urlField).toBeVisible({ timeout: 15000 });
    await expect.soft(baseDnField).toBeVisible({ timeout: 15000 });
    await expect.soft(bindDnField).toBeVisible({ timeout: 15000 });
    await expect.soft(passwordField).toBeVisible({ timeout: 15000 });
  });

  test("Tab Config - sauvegarder la configuration", async ({ page }) => {
    await page.goto("/admin/ldap");
    await waitForPageLoad(page);

    const configTab = page.getByRole("button", { name: /config/i });
    if (await configTab.isVisible()) {
      await configTab.click();
      await page.waitForLoadState("networkidle");
    }

    const urlField = page
      .locator(
        'input[name*="url"], input[placeholder*="ldap"], input[id*="url"]',
      )
      .first();
    if (await urlField.isVisible()) {
      await urlField.fill("ldap://openldap:389");
    }

    const baseDnField = page
      .locator(
        'input[name*="base"], input[placeholder*="dc="], input[id*="base"]',
      )
      .first();
    if (await baseDnField.isVisible()) {
      await baseDnField.fill("dc=nxrh,dc=local");
    }

    const bindDnField = page
      .locator(
        'input[name*="bind"], input[id*="bind"], input[placeholder*="cn="]',
      )
      .first();
    if (await bindDnField.isVisible()) {
      await bindDnField.fill("cn=admin,dc=nxrh,dc=local");
    }

    const passwordField = page.locator('input[type="password"]').first();
    if (await passwordField.isVisible()) {
      await passwordField.fill("adminpass");
    }

    const saveButton = page.getByRole("button", {
      name: /sauvegarder|enregistrer|save/i,
    });
    if (await saveButton.isVisible()) {
      await saveButton.click();
      await expect(page.locator("body")).toContainText(
        /succès|success|sauvegardé|enregistré|saved/i,
        { timeout: 10000 },
      );
    }
  });

  test("Tab Test - bouton tester la connexion présent", async ({ page }) => {
    await page.goto("/admin/ldap");
    await waitForPageLoad(page);

    const testTab = page.getByRole("button", { name: /^test$/i });
    if (await testTab.isVisible()) {
      await testTab.click();
      await page.waitForLoadState("networkidle");
    }

    const testButton = page.getByRole("button", {
      name: /test.*connexion|tester|test connection/i,
    });
    await expect(testButton).toBeVisible({ timeout: 15000 });

    await testButton.click();
    await page.waitForLoadState("networkidle");

    // Any response is acceptable (LDAP server may not be running in test env)
    const bodyText = await page.locator("body").innerText();
    expect(bodyText.length).toBeGreaterThan(10);

    await takeScreenshot(page, "admin-ldap-test");
  });

  test("Tab Preview - affiche un message ou une liste", async ({ page }) => {
    await page.goto("/admin/ldap");
    await waitForPageLoad(page);

    const previewTab = page.getByRole("button", {
      name: /prévisualisation|aperçu|preview/i,
    });
    if (await previewTab.isVisible()) {
      await previewTab.click();
      await page.waitForLoadState("networkidle");
    }

    // Verify no JS crash — error classes are acceptable, runtime errors are not
    await expect(page.locator("body")).not.toContainText(
      /TypeError|ReferenceError/i,
      { timeout: 10000 },
    );
    const bodyText = await page.locator("body").innerText();
    expect(bodyText.length).toBeGreaterThan(5);
  });

  test("Tab Sync - bouton synchroniser présent", async ({ page }) => {
    await page.goto("/admin/ldap");
    await waitForPageLoad(page);

    // Cliquer sur l'onglet "Synchronisation" (exact pour éviter de matcher le bouton action)
    const syncTab = page.getByRole("button", { name: "Synchronisation" });
    if (await syncTab.isVisible()) {
      await syncTab.click();
      await page.waitForLoadState("networkidle");
    }

    // Le bouton d'action est "Lancer la synchronisation" (différent du libellé du tab)
    const syncButton = page
      .getByRole("button", { name: /lancer la synchronisation|synchronis/i })
      .last();
    await expect(syncButton).toBeVisible({ timeout: 15000 });

    await takeScreenshot(page, "admin-ldap-sync");
  });
});

test.describe("LDAP - Page de connexion LDAP", () => {
  test("/login/ldap accessible", async ({ page }) => {
    await page.goto("/login/ldap");
    await page.waitForLoadState("networkidle");

    const usernameField = page
      .locator(
        'input[name*="user"], input[name*="login"], input[type="text"], input[placeholder*="user"]',
      )
      .first();
    const passwordField = page.locator('input[type="password"]').first();

    await expect(usernameField).toBeVisible({ timeout: 15000 });
    await expect(passwordField).toBeVisible({ timeout: 15000 });

    await takeScreenshot(page, "login-ldap");
  });

  test("formulaire avec champs vides - validation inline", async ({ page }) => {
    await page.goto("/login/ldap");
    await page.waitForLoadState("networkidle");

    const submitButton = page.getByRole("button", {
      name: /connexion|login|se connecter|submit/i,
    });
    if (await submitButton.isVisible()) {
      await submitButton.click();
    }

    // Inline errors should appear near the fields, not only as toast
    const inlineErrors = page.locator(
      '[class*="error"]:not([role="alert"]), .invalid-feedback, [data-error]',
    );
    await expect.soft(inlineErrors.first()).toBeVisible({ timeout: 5000 });

    const invalidInputs = page.locator('input[aria-invalid="true"]');
    expect.soft(await invalidInputs.count()).toBeGreaterThan(0);
  });

  test("mauvais credentials LDAP - message d'erreur clair", async ({
    page,
  }) => {
    await page.goto("/login/ldap");
    await page.waitForLoadState("networkidle");

    const usernameField = page
      .locator('input[name*="user"], input[name*="login"], input[type="text"]')
      .first();
    const passwordField = page.locator('input[type="password"]').first();

    if (await usernameField.isVisible()) {
      await usernameField.fill("testuser");
    }
    if (await passwordField.isVisible()) {
      await passwordField.fill("wrongpass");
    }

    const submitButton = page.getByRole("button", {
      name: /connexion|login|se connecter|submit/i,
    });
    if (await submitButton.isVisible()) {
      await submitButton.click();
      await page.waitForLoadState("networkidle");
    }

    // Error message must be visible and human-readable (not blank page, not crash)
    const errorMessage = page
      .locator('[class*="error"], [role="alert"], [data-testid*="error"]')
      .first();
    await expect(errorMessage).toBeVisible({ timeout: 10000 });

    const errorText = await errorMessage.innerText();
    expect(errorText.length).toBeGreaterThan(3);
  });

  test("lien retour vers /login présent", async ({ page }) => {
    await page.goto("/login/ldap");
    await page.waitForLoadState("networkidle");

    const backLink = page.getByRole("link", {
      name: /retour|connexion normale|← login|login classique/i,
    });
    await expect(backLink).toBeVisible({ timeout: 15000 });

    const href = await backLink.getAttribute("href");
    expect(href).toContain("/login");
  });
});
