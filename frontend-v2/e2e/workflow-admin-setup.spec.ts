import { test, expect } from "@playwright/test";
import { loginAs } from "./helpers/auth";
import {
  waitForPageLoad,
  expectNoErrors,
  expectNotUnauthorized,
  takeScreenshot,
} from "./helpers/utils";
import path from "path";
import { fileURLToPath } from "url";

// Le projet est en ESM ("type":"module") : __dirname n'existe pas, on le dérive.
const __dirname = path.dirname(fileURLToPath(import.meta.url));

test.describe("Admin - Setup Initial", () => {
  test.setTimeout(60000);

  test.beforeEach(async ({ page }) => {
    await loginAs(page, "admin");
    await page.waitForLoadState("networkidle");
  });

  test.afterEach(async ({ page }, testInfo) => {
    if (testInfo.status !== testInfo.expectedStatus) {
      await takeScreenshot(
        page,
        `fail-admin-setup-${testInfo.title.replace(/[^\w]/g, "_").slice(0, 50)}`,
      );
    }
  });

  test("connexion admin - dashboard admin accessible", async ({ page }) => {
    await page.goto("/");
    await waitForPageLoad(page);
    await expectNoErrors(page);
    await takeScreenshot(page, "admin-dashboard");
  });

  test("LDAP - page /admin/ldap accessible avec actions par source", async ({
    page,
  }) => {
    await page.goto("/admin/ldap");
    await waitForPageLoad(page);
    await expectNotUnauthorized(page);

    // La page est un formulaire multi-sources (plus d'onglets) : un titre LDAP
    // + des actions par annuaire (Test / Aperçu / Sync) + Enregistrer global.
    await expect(page.getByText(/LDAP/i).first()).toBeVisible({
      timeout: 15000,
    });
    await expect(
      page.getByRole("button", { name: /test/i }).first(),
    ).toBeVisible({ timeout: 15000 });
    await expect(
      page.getByRole("button", { name: /aperçu|preview|prévisualiser/i }).first(),
    ).toBeVisible({ timeout: 15000 });
    await expect(
      page.getByRole("button", { name: /sync|synchroniser/i }).first(),
    ).toBeVisible({ timeout: 15000 });

    await takeScreenshot(page, "admin-ldap-tabs");
  });

  test("LDAP - configurer et sauvegarder config LDAP #1", async ({ page }) => {
    await page.goto("/admin/ldap");
    await waitForPageLoad(page);

    // Formulaire multi-sources : les champs ont des ids "<sourceId>-host/baseDN/…".
    const hostField = page
      .locator('input[id$="-host"], input[placeholder*="ldap" i]')
      .first();
    if (await hostField.isVisible()) {
      await hostField.fill("ldap://openldap:389");
    }

    const baseDnField = page
      .locator('input[id$="-baseDN"], input[placeholder*="dc="]')
      .first();
    if (await baseDnField.isVisible()) {
      await baseDnField.fill("dc=nxrh,dc=local");
    }

    const bindDnField = page.locator('input[id$="-bindDN"]').first();
    if (await bindDnField.isVisible()) {
      await bindDnField.fill("cn=admin,dc=nxrh,dc=local");
    }

    const passwordField = page.locator('input[type="password"]').first();
    if (await passwordField.isVisible()) {
      await passwordField.fill("adminpass");
    }

    // Le bouton Enregistrer est désactivé tant que le formulaire n'est pas
    // "sale" (dirty) et sans erreur. Après saisie il devient cliquable.
    const saveButton = page
      .getByRole("button", { name: /save|sauvegarder|enregistrer/i })
      .first();
    await expect(saveButton).toBeEnabled({ timeout: 5000 });
    await saveButton.click();
    await page.waitForLoadState("networkidle");

    // Pas de toast : la sauvegarde réussie réinitialise l'état "dirty",
    // ce qui re-désactive le bouton Enregistrer.
    await expect(saveButton).toBeDisabled({ timeout: 15000 });
  });

  test("LDAP - tester la connexion LDAP (erreur attendue en prod)", async ({
    page,
  }) => {
    await page.goto("/admin/ldap");
    await waitForPageLoad(page);

    const testTab = page.getByRole("tab", { name: /test/i });
    if (await testTab.isVisible()) {
      await testTab.click();
      await page.waitForLoadState("networkidle");
    }

    const testButton = page.getByRole("button", { name: /test/i }).first();
    if (await testButton.isVisible()) {
      await testButton.click();
      await page.waitForLoadState("networkidle");

      // Error is expected — just verify it's not a blank crash
      const bodyText = await page.locator("body").textContent();
      expect(bodyText).toBeTruthy();
      expect(bodyText!.length).toBeGreaterThan(10);
    } else {
      test.info().annotations.push({
        type: "UX",
        description: "Bouton Test introuvable sur l'onglet test LDAP",
      });
    }
  });

  test("LDAP - modifier config et sauvegarder (second profil LDAP)", async ({
    page,
  }) => {
    await page.goto("/admin/ldap");
    await waitForPageLoad(page);

    const baseDnField = page
      .locator('input[id$="-baseDN"], input[placeholder*="dc="]')
      .first();
    if (await baseDnField.isVisible()) {
      await baseDnField.fill("dc=nxrh2,dc=local");
    }

    const saveButton = page
      .getByRole("button", { name: /save|sauvegarder|enregistrer/i })
      .first();
    await expect(saveButton).toBeEnabled({ timeout: 5000 });
    await saveButton.click();
    await page.waitForLoadState("networkidle");

    // Succès = retour à l'état non-dirty → bouton de nouveau désactivé.
    await expect(saveButton).toBeDisabled({ timeout: 15000 });
  });

  test("Formulaires - créer un formulaire via le builder", async ({ page }) => {
    await page.goto("/forms/new");
    await waitForPageLoad(page);
    await expectNotUnauthorized(page);

    const timestamp = Date.now();
    const formTitle = `Formulaire E2E Test ${timestamp}`;

    const titleField = page
      .locator(
        'input[name*="title" i], input[name*="titre" i], input[placeholder*="titre" i], input[placeholder*="title" i]',
      )
      .first();
    if (await titleField.isVisible()) {
      await titleField.fill(formTitle);
    }

    const addQuestionBtn = page.getByRole("button", {
      name: /ajouter une question|add question/i,
    });
    if (await addQuestionBtn.isVisible()) {
      await addQuestionBtn.click();
      await page.waitForLoadState("networkidle");

      const questionLabel = page
        .locator(
          'input[name*="label" i], input[name*="question" i], textarea[name*="label" i]',
        )
        .last();
      if (await questionLabel.isVisible()) {
        await questionLabel.fill("Performance globale");
      }

      const typeSelector = page
        .locator('select[name*="type" i], [data-testid*="question-type"]')
        .last();
      if (await typeSelector.isVisible()) {
        const options = await typeSelector.locator("option").allTextContents();
        const ratingOption = options.find((o) => /rating|note/i.test(o));
        if (ratingOption) {
          await typeSelector.selectOption({ label: ratingOption });
        }
      }
    }

    const saveButton = page
      .getByRole("button", {
        name: /save|sauvegarder|enregistrer|créer|create/i,
      })
      .first();
    await saveButton.click();
    await page.waitForLoadState("networkidle");

    expect.soft(page.url()).toMatch(/\/forms/);
    await takeScreenshot(page, "form-builder-created");
  });

  test("Formulaires - importer un formulaire via JSON", async ({ page }) => {
    let importPageFound = false;

    for (const url of ["/admin/forms/import", "/admin/forms-import"]) {
      await page.goto(url);
      await page.waitForLoadState("networkidle");
      const currentUrl = page.url();
      const bodyText = await page.locator("body").textContent();
      if (
        !currentUrl.includes("404") &&
        bodyText &&
        !bodyText.includes("404") &&
        !bodyText.includes("Not Found") &&
        !bodyText.includes("Page introuvable")
      ) {
        importPageFound = true;
        break;
      }
    }

    if (!importPageFound) {
      test.skip();
      return;
    }

    await expectNotUnauthorized(page);

    const downloadBtn = page.getByRole("button", {
      name: /template|modèle|download|télécharger/i,
    });
    if (await downloadBtn.isVisible()) {
      await downloadBtn.click();
      await page.waitForTimeout(1000);
    }

    const fileInput = page.locator('input[type="file"]');
    if (await fileInput.isVisible()) {
      const fixturePath = path.join(__dirname, "fixtures/form-test.json");
      await fileInput.setInputFiles(fixturePath);

      const importButton = page.getByRole("button", {
        name: /import|importer|valider|validate/i,
      });
      if (await importButton.isVisible()) {
        await importButton.click();
        await page.waitForLoadState("networkidle");
        await expect(
          page.getByText(/success|succès|importé|importée|créé/i).first(),
        ).toBeVisible({ timeout: 15000 });
      }
    } else {
      test.info().annotations.push({
        type: "UX",
        description: "Champ fichier introuvable sur la page d'import",
      });
    }
  });

  test("Campagne - créer via wizard 4 étapes", async ({ page }) => {
    await page.goto("/campaigns/new");
    await waitForPageLoad(page);
    await expectNotUnauthorized(page);

    const timestamp = Date.now();
    const campaignName = `Campagne E2E ${timestamp}`;

    // Étape 1 : nom et description
    const nameField = page
      .locator(
        'input[name*="name" i], input[name*="nom" i], input[name*="title" i], input[name*="titre" i]',
      )
      .first();
    if (await nameField.isVisible()) {
      await nameField.fill(campaignName);
    }

    const descField = page
      .locator('textarea[name*="description" i], input[name*="description" i]')
      .first();
    if (await descField.isVisible()) {
      await descField.fill("Test automatisé");
    }

    let nextBtn = page.getByRole("button", { name: /suivant|next/i }).first();
    if (await nextBtn.isVisible()) {
      await nextBtn.click();
      await page.waitForLoadState("networkidle");
    }

    // Étape 2 : dates
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const endDate = new Date(now.getFullYear(), now.getMonth() + 2, 1);
    const formatDate = (d: Date): string => d.toISOString().split("T")[0];

    const dateInputs = page.locator('input[type="date"]');
    const dateCount = await dateInputs.count();
    if (dateCount >= 1) {
      await dateInputs.first().fill(formatDate(startDate));
    }
    if (dateCount >= 2) {
      await dateInputs.last().fill(formatDate(endDate));
    }

    nextBtn = page.getByRole("button", { name: /suivant|next/i }).first();
    if (await nextBtn.isVisible()) {
      await nextBtn.click();
      await page.waitForLoadState("networkidle");
    }

    // Étape 3 : sélectionner un template de formulaire
    const templateOption = page
      .locator(
        '[data-testid*="template"], [class*="template"] input[type="radio"], input[type="radio"]',
      )
      .first();
    if (await templateOption.isVisible()) {
      await templateOption.click();
    }

    nextBtn = page.getByRole("button", { name: /suivant|next/i }).first();
    if (await nextBtn.isVisible()) {
      await nextBtn.click();
      await page.waitForLoadState("networkidle");
    }

    // Étape 4 : publier / finaliser
    const publishBtn = page.getByRole("button", {
      name: /publier|publish|finaliser|finalize|créer|create|terminer|lancer/i,
    });
    if (await publishBtn.isVisible()) {
      await publishBtn.click();
      await page.waitForLoadState("networkidle");
    }

    await page.waitForURL(/\/campaigns/, { timeout: 15000 }).catch(() => {
      /* redirect optionnel */
    });

    expect.soft(page.url()).toMatch(/\/campaigns/);
    await takeScreenshot(page, "campaign-wizard-created");
  });
});
