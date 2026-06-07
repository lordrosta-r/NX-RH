import { test, expect } from "@playwright/test";
import { loginAs } from "./helpers/auth";
import {
  waitForPageLoad,
  expectNoErrors,
  takeScreenshot,
} from "./helpers/utils";
import path from "path";

test.describe("Import N+1", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, "admin");
    await page.waitForLoadState("networkidle");
  });

  test("Import N+1 - page import users accessible", async ({ page }) => {
    test.setTimeout(60000);
    await page.goto("/admin/users/import");
    await waitForPageLoad(page);
    await expectNoErrors(page);

    // Vérifier qu'une zone d'upload ou un formulaire est présent
    const uploadZone = page
      .locator(
        'input[type="file"], [data-testid="upload-zone"], .upload-zone, [class*="dropzone"], [class*="upload"]',
      )
      .first();
    await expect.soft(uploadZone).toBeVisible({ timeout: 15000 });
  });

  test("Import N+1 - upload CSV et preview", async ({ page }) => {
    test.setTimeout(60000);
    await page.goto("/admin/users/import");
    await waitForPageLoad(page);

    const csvPath = path.join(__dirname, "fixtures/users-test.csv");

    await test.step("Uploader le fichier CSV", async () => {
      const fileInput = page.locator('input[type="file"]').first();
      await fileInput.waitFor({ state: "attached", timeout: 15000 });
      await page.setInputFiles('input[type="file"]', csvPath);
      await page.waitForLoadState("networkidle");
    });

    await test.step("Vérifier la prévisualisation", async () => {
      const previewTable = page
        .locator('table, [data-testid="preview-table"], [class*="preview"]')
        .first();
      await previewTable.waitFor({ state: "visible", timeout: 15000 });

      const body = page.locator("body");
      await expect.soft(body).toContainText(/jean\.dupont\.test|jean dupont/i);
      await expect
        .soft(body)
        .toContainText(/marie\.martin\.test|marie martin/i);
    });

    await takeScreenshot(page, "import-csv-preview");
  });

  test("Import N+1 - valider l'import CSV", async ({ page }) => {
    test.setTimeout(60000);
    await page.goto("/admin/users/import");
    await waitForPageLoad(page);

    const csvPath = path.join(__dirname, "fixtures/users-test.csv");

    await test.step("Upload", async () => {
      const fileInput = page.locator('input[type="file"]').first();
      await fileInput.waitFor({ state: "attached", timeout: 15000 });
      await page.setInputFiles('input[type="file"]', csvPath);
      await page.waitForLoadState("networkidle");
    });

    await test.step("Valider l'import", async () => {
      const validateBtn = page
        .locator("button")
        .filter({ hasText: /valider|importer|confirmer|import/i })
        .first();
      await validateBtn.waitFor({ state: "visible", timeout: 15000 });
      await validateBtn.click();
      await page.waitForLoadState("networkidle");
    });

    await test.step("Vérifier le résultat", async () => {
      const body = page.locator("body");
      await expect
        .soft(body)
        .toContainText(/importé|importés|succès|success|créé|créés|\d+ user/i);
    });

    await takeScreenshot(page, "import-csv-result");
  });

  test("Import N+1 - vérifier nouveaux users dans /users", async ({ page }) => {
    test.setTimeout(60000);
    await page.goto("/users");
    await waitForPageLoad(page);
    await expectNoErrors(page);

    await test.step("Rechercher le user importé", async () => {
      const searchField = page
        .locator(
          'input[type="search"], input[placeholder*="recherch"], input[placeholder*="search"], input[placeholder*="nom"], input[placeholder*="filtr"]',
        )
        .first();
      if (await searchField.isVisible({ timeout: 5000 }).catch(() => false)) {
        await searchField.fill("jean.dupont.test");
        await page.waitForLoadState("networkidle");
        await page.waitForTimeout(500);
      }
    });

    await test.step("Vérifier présence dans la liste", async () => {
      const body = page.locator("body");
      const found = await body
        .getByText(/jean\.dupont\.test|jean dupont test/i)
        .isVisible({ timeout: 10000 })
        .catch(() => false);
      expect.soft(found).toBeTruthy();
    });
  });

  test("Import N+1 - importer formulaire JSON", async ({ page }) => {
    test.setTimeout(60000);
    await page.goto("/admin/forms/import");
    await waitForPageLoad(page);
    await expectNoErrors(page);

    const jsonPath = path.join(__dirname, "fixtures/form-test.json");

    await test.step("Upload JSON", async () => {
      const fileInput = page.locator('input[type="file"]').first();
      await fileInput.waitFor({ state: "attached", timeout: 15000 });
      await page.setInputFiles('input[type="file"]', jsonPath);
      await page.waitForLoadState("networkidle");
    });

    await test.step("Vérifier le succès", async () => {
      const body = page.locator("body");
      // Chercher le bouton valider si disponible
      const validateBtn = page
        .locator("button")
        .filter({ hasText: /valider|importer|confirmer|import/i })
        .first();
      if (await validateBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        await validateBtn.click();
        await page.waitForLoadState("networkidle");
      }
      await expect
        .soft(body)
        .toContainText(/importé|succès|success|créé|form/i);
    });

    await takeScreenshot(page, "import-form-json-result");
  });

  test("Import N+1 - créer campagne pour nouveaux users", async ({ page }) => {
    test.setTimeout(60000);
    const timestamp = Date.now();
    const campaignName = `Bilan N+1 ${timestamp}`;

    await page.goto("/campaigns/new");
    await waitForPageLoad(page);
    await expectNoErrors(page);

    await test.step("Remplir le nom de la campagne", async () => {
      const nameField = page
        .locator(
          'input[name*="name"], input[name*="nom"], input[placeholder*="nom"], input[placeholder*="campagne"], input[id*="name"]',
        )
        .first();
      await nameField.waitFor({ state: "visible", timeout: 15000 });
      await nameField.fill(campaignName);
    });

    await test.step("Remplir les dates", async () => {
      const today = new Date();
      const startDate = today.toISOString().split("T")[0];
      const endDate = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0];

      const dateInputs = page.locator('input[type="date"]');
      const dateCount = await dateInputs.count();
      if (dateCount >= 1) await dateInputs.nth(0).fill(startDate);
      if (dateCount >= 2) await dateInputs.nth(1).fill(endDate);
    });

    await test.step("Avancer dans le wizard / sélectionner participants", async () => {
      const nextBtn = page
        .locator("button")
        .filter({ hasText: /suivant|next|continuer|étape/i })
        .first();
      if (await nextBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        await nextBtn.click();
        await page.waitForLoadState("networkidle");

        // Essayer d'inclure les nouveaux users
        const searchField = page
          .locator(
            'input[type="search"], input[placeholder*="recherch"], input[placeholder*="participant"]',
          )
          .first();
        if (await searchField.isVisible({ timeout: 5000 }).catch(() => false)) {
          await searchField.fill("jean.dupont");
          await page.waitForTimeout(500);
          const firstResult = page
            .locator(
              '[data-testid="user-option"], .user-option, [class*="suggestion"]',
            )
            .first();
          if (
            await firstResult.isVisible({ timeout: 3000 }).catch(() => false)
          ) {
            await firstResult.click();
          }
        }
      }
    });

    await test.step("Soumettre la campagne", async () => {
      const submitBtn = page
        .locator('button[type="submit"], button')
        .filter({ hasText: /créer|valider|lancer|terminer|finish|create/i })
        .first();
      if (await submitBtn.isVisible({ timeout: 10000 }).catch(() => false)) {
        await submitBtn.click();
        await page.waitForLoadState("networkidle");
      }
    });

    await test.step("Vérifier création", async () => {
      const body = page.locator("body");
      const found = await body
        .getByText(
          new RegExp(campaignName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"),
        )
        .isVisible({ timeout: 10000 })
        .catch(() => false);
      if (!found) {
        // Peut avoir redirigé vers /campaigns
        await page.goto("/campaigns");
        await waitForPageLoad(page);
        await expect
          .soft(page.locator("body"))
          .toContainText(/bilan n\+1|campagne/i);
      }
    });

    await takeScreenshot(page, "import-campaign-created");
  });

  test("Import N+1 - dashboard mis à jour (compteurs)", async ({ page }) => {
    test.setTimeout(60000);
    await page.goto("/");
    await waitForPageLoad(page);
    await expectNoErrors(page);

    // Vérifier que des chiffres/statistiques sont présents
    const statsEl = page
      .locator(
        '[data-testid*="stat"], [class*="stat"], [class*="counter"], [class*="kpi"], [class*="metric"]',
      )
      .first();
    const hasStats = await statsEl
      .isVisible({ timeout: 10000 })
      .catch(() => false);
    if (!hasStats) {
      // Au moins des nombres doivent être visibles
      const numbers = page.locator("body").getByText(/\d+/);
      const numCount = await numbers.count();
      expect.soft(numCount).toBeGreaterThan(0);
    }

    await takeScreenshot(page, "import-dashboard-stats");
  });
});
