import { test, expect } from "@playwright/test";
import { loginAs } from "./helpers/auth";
import {
  waitForPageLoad,
  expectNotUnauthorized,
  takeScreenshot,
} from "./helpers/utils";

// L'UI LDAP est passée d'un système à 4 onglets (Config/Test/Preview/Sync) à
// une gestion MULTI-SOURCES : une carte par annuaire, chacune avec ses champs
// (Hôte, Base DN, Bind DN, filtre) et ses actions Tester / Prévisualiser /
// Synchroniser. L'en-tête expose « Ajouter une source » et « Enregistrer ».

test.describe("LDAP - Configuration Admin (multi-sources)", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, "admin");
    await page.goto("/admin/ldap");
    await waitForPageLoad(page);
  });

  test("/admin/ldap accessible", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: /annuaires ldap/i }),
    ).toBeVisible({ timeout: 15000 });
    await expectNotUnauthorized(page);
    await takeScreenshot(page, "admin-ldap");
  });

  test("en-tête : actions Ajouter une source et Enregistrer", async ({
    page,
  }) => {
    await expect(
      page.getByRole("button", { name: /ajouter une source/i }),
    ).toBeVisible({ timeout: 15000 });
    await expect(
      page.getByRole("button", { name: /^enregistrer$/i }),
    ).toBeVisible();
  });

  test("une carte de source expose les champs de connexion", async ({
    page,
  }) => {
    // S'assurer qu'au moins une source existe (sinon en créer une localement).
    const sourceCards = page.locator(".tile");
    if ((await sourceCards.count()) === 0) {
      await page.getByRole("button", { name: /ajouter une source/i }).click();
    }

    // Les champs portent un label (Hôte, Base DN, Bind DN) + un mot de passe.
    await expect(page.getByLabel(/hôte/i).first()).toBeVisible({
      timeout: 15000,
    });
    await expect(page.getByLabel(/base dn/i).first()).toBeVisible();
    await expect(page.getByLabel(/bind dn/i).first()).toBeVisible();
    await expect(page.locator('input[type="password"]').first()).toBeVisible();
  });

  test("une carte de source expose Tester / Prévisualiser / Synchroniser", async ({
    page,
  }) => {
    const sourceCards = page.locator(".tile");
    if ((await sourceCards.count()) === 0) {
      await page.getByRole("button", { name: /ajouter une source/i }).click();
    }

    // Boutons d'action par source (plusieurs sources possibles → .first()).
    await expect(
      page.getByRole("button", { name: /^tester$/i }).first(),
    ).toBeVisible({ timeout: 15000 });
    await expect(
      page.getByRole("button", { name: /prévisualiser/i }).first(),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /^synchroniser$/i }).first(),
    ).toBeVisible();
  });

  test("éditer un champ marque la configuration comme modifiée", async ({
    page,
  }) => {
    const sourceCards = page.locator(".tile");
    if ((await sourceCards.count()) === 0) {
      await page.getByRole("button", { name: /ajouter une source/i }).click();
    }

    // Modifier le champ Hôte avec une valeur unique (≠ valeur seedée) crée un
    // draft : taper caractère par caractère garantit le dispatch des events React.
    const newHost = `ldap://openldap:389/${Date.now()}`;
    const hostField = page.getByLabel(/hôte/i).first();
    await hostField.click();
    await hostField.fill("");
    await hostField.pressSequentially(newHost, { delay: 10 });

    // La valeur saisie est reflétée et l'avertissement « non enregistré » s'affiche.
    await expect(hostField).toHaveValue(newHost);
    await expect(page.getByText(/non enregistré|modifications/i)).toBeVisible({
      timeout: 5000,
    });

    await takeScreenshot(page, "admin-ldap-edit");
  });
});

test.describe("LDAP - Page de connexion LDAP", () => {
  test("/login/ldap accessible", async ({ page }) => {
    await page.goto("/login/ldap");
    await page.waitForLoadState("networkidle");

    const usernameField = page
      .getByRole("textbox", { name: /identifiant ldap/i })
      .or(page.locator('input[type="text"]').first());
    const passwordField = page.locator('input[type="password"]').first();

    await expect(usernameField.first()).toBeVisible({ timeout: 15000 });
    await expect(passwordField).toBeVisible({ timeout: 15000 });

    await takeScreenshot(page, "login-ldap");
  });

  test("formulaire avec champs vides - validation inline", async ({ page }) => {
    await page.goto("/login/ldap");
    await page.waitForLoadState("networkidle");

    const submitButton = page.getByRole("button", {
      name: /se connecter via ldap|connexion|login|submit/i,
    });
    await submitButton.click();

    // Une erreur inline apparaît sous le champ (texte rouge, pas un toast).
    const inlineError = page
      .locator('[class*="error"]')
      .filter({ hasText: /requis|obligatoire|champ/i })
      .first();
    await expect(inlineError).toBeVisible({ timeout: 5000 });
  });

  test("mauvais credentials LDAP - message d'erreur clair", async ({
    page,
  }) => {
    await page.goto("/login/ldap");
    await page.waitForLoadState("networkidle");

    const usernameField = page
      .getByRole("textbox", { name: /identifiant ldap/i })
      .or(page.locator('input[type="text"]').first());
    const passwordField = page.locator('input[type="password"]').first();

    await usernameField.first().fill("testuser");
    await passwordField.fill("wrongpass");

    await page
      .getByRole("button", {
        name: /se connecter via ldap|connexion|login|submit/i,
      })
      .click();
    await page.waitForLoadState("networkidle");

    // Un message d'erreur lisible doit apparaître (identifiants / serveur).
    const errorMessage = page
      .locator('[class*="error"], [role="alert"]')
      .first();
    await expect(errorMessage).toBeVisible({ timeout: 10000 });
    const errorText = await errorMessage.innerText();
    expect(errorText.length).toBeGreaterThan(3);
  });

  test("lien retour vers /login présent", async ({ page }) => {
    await page.goto("/login/ldap");
    await page.waitForLoadState("networkidle");

    // Le lien de retour s'intitule « Connexion standard ».
    const backLink = page.getByRole("link", {
      name: /connexion standard|retour|connexion normale|login classique/i,
    });
    await expect(backLink).toBeVisible({ timeout: 15000 });

    const href = await backLink.getAttribute("href");
    expect(href).toContain("/login");
  });
});
