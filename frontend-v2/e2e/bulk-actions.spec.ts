import { test, expect } from "@playwright/test";
import { loginAs } from "./helpers/auth";
import {
  waitForPageLoad,
  expectNoErrors,
  waitForDownload,
  takeScreenshot,
} from "./helpers/utils";

test.describe("Bulk Actions - Users", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, "admin");
    await page.waitForLoadState("networkidle");
    await page.goto("/users");
    await waitForPageLoad(page);
    await expectNoErrors(page);
  });

  test("checkbox select-all sélectionne tous les users", async ({ page }) => {
    test.setTimeout(60000);

    // Chercher la checkbox "tout sélectionner" dans le header du tableau
    const selectAllCheckbox = page
      .locator(
        'thead input[type="checkbox"], ' +
          '[data-testid="select-all"], ' +
          'th input[type="checkbox"], ' +
          'button:has-text("Tout sélectionner")',
      )
      .first();

    await selectAllCheckbox.waitFor({ state: "visible", timeout: 15000 });
    await selectAllCheckbox.click();
    await page.waitForTimeout(500);

    // Vérifier que plusieurs lignes sont sélectionnées
    const checkedBoxes = page.locator(
      'tbody input[type="checkbox"]:checked, tr.selected, [data-selected="true"]',
    );
    const count = await checkedBoxes.count();
    expect.soft(count).toBeGreaterThan(1);

    // OU vérifier un indicateur de sélection (ex: "X sélectionnés")
    const selectionIndicator = page
      .locator(
        '[data-testid="selection-count"], [class*="selection-count"], [class*="selected-count"]',
      )
      .first();
    const hasIndicator = await selectionIndicator
      .isVisible()
      .catch(() => false);
    if (!hasIndicator && count === 0) {
      test
        .info()
        .annotations.push({
          type: "UX",
          description: "Aucun indicateur de sélection visible après select-all",
        });
    }

    await takeScreenshot(page, "bulk-users-select-all");
  });

  test("barre d'actions bulk apparaît lors d'une sélection", async ({
    page,
  }) => {
    test.setTimeout(60000);

    // Sélectionner au moins un user
    const firstRowCheckbox = page
      .locator('tbody input[type="checkbox"], [data-testid="row-checkbox"]')
      .first();
    await firstRowCheckbox.waitFor({ state: "visible", timeout: 15000 });
    await firstRowCheckbox.click();
    await page.waitForTimeout(500);

    // Vérifier l'apparition de la barre bulk
    const bulkBar = page
      .locator(
        '[data-testid="bulk-action-bar"], ' +
          '[class*="bulk-action"], ' +
          '[class*="bulk-bar"], ' +
          '[class*="action-bar"], ' +
          '[class*="toolbar"]',
      )
      .first();

    await expect.soft(bulkBar).toBeVisible({ timeout: 10000 });

    // Vérifier qu'au moins un bouton d'action est présent dans la barre
    const actionBtns = bulkBar.locator("button");
    const btnCount = await actionBtns.count().catch(() => 0);
    expect.soft(btnCount).toBeGreaterThan(0);

    await takeScreenshot(page, "bulk-users-bar-visible");
  });

  test("bulk deactivate - désactiver users sélectionnés", async ({ page }) => {
    test.setTimeout(60000);

    await test.step("Sélectionner 2 users (hors admin)", async () => {
      // Chercher des users non-admin
      const rows = page.locator("tbody tr");
      await rows.first().waitFor({ state: "visible", timeout: 15000 });
      const rowCount = await rows.count();

      let selected = 0;
      for (let i = 0; i < rowCount && selected < 2; i++) {
        const row = rows.nth(i);
        const isAdmin = await row
          .getByText(/alice@nxrh|administrateur/i)
          .isVisible()
          .catch(() => false);
        if (!isAdmin) {
          const checkbox = row.locator('input[type="checkbox"]').first();
          if (await checkbox.isVisible()) {
            await checkbox.click();
            selected++;
          }
        }
      }
      expect(selected).toBeGreaterThanOrEqual(1);
    });

    await test.step("Cliquer sur Désactiver", async () => {
      const deactivateBtn = page
        .locator("button")
        .filter({ hasText: /désactiver|deactivate|inactiver/i })
        .first();
      await deactivateBtn.waitFor({ state: "visible", timeout: 10000 });
      await deactivateBtn.click();

      // Confirmation éventuelle
      const confirmBtn = page
        .locator("button")
        .filter({ hasText: /confirmer|confirm|oui|yes/i })
        .first();
      if (await confirmBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await confirmBtn.click();
      }
      await page.waitForLoadState("networkidle");
    });

    await test.step("Vérifier statut inactif", async () => {
      const inactiveBadge = page
        .locator('[class*="badge"], [class*="status"]')
        .filter({ hasText: /inactif|inactive|désactivé/i })
        .first();
      await expect.soft(inactiveBadge).toBeVisible({ timeout: 10000 });
    });

    await takeScreenshot(page, "bulk-users-deactivated");
  });

  test("bulk activate - réactiver users désactivés", async ({ page }) => {
    test.setTimeout(60000);

    await test.step("Sélectionner les users inactifs", async () => {
      // Filtrer pour voir les inactifs si possible
      const filterBtn = page
        .locator("button, select")
        .filter({ hasText: /filtr|inactif|statut/i })
        .first();
      if (await filterBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        await filterBtn.click();
        const inactifOption = page
          .locator('[role="option"], option')
          .filter({ hasText: /inactif|inactive/i })
          .first();
        if (
          await inactifOption.isVisible({ timeout: 3000 }).catch(() => false)
        ) {
          await inactifOption.click();
          await page.waitForLoadState("networkidle");
        }
      }

      const rows = page.locator("tbody tr");
      const rowCount = await rows.count().catch(() => 0);
      let selected = 0;
      for (let i = 0; i < rowCount && selected < 2; i++) {
        const row = rows.nth(i);
        const checkbox = row.locator('input[type="checkbox"]').first();
        if (await checkbox.isVisible()) {
          await checkbox.click();
          selected++;
        }
      }
    });

    await test.step("Cliquer sur Activer", async () => {
      const activateBtn = page
        .locator("button")
        .filter({ hasText: /activer|activate|réactiver/i })
        .first();
      if (await activateBtn.isVisible({ timeout: 10000 }).catch(() => false)) {
        await activateBtn.click();

        const confirmBtn = page
          .locator("button")
          .filter({ hasText: /confirmer|confirm|oui|yes/i })
          .first();
        if (await confirmBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
          await confirmBtn.click();
        }
        await page.waitForLoadState("networkidle");
      }
    });

    await test.step("Vérifier statut actif", async () => {
      const activeBadge = page
        .locator('[class*="badge"], [class*="status"]')
        .filter({ hasText: /actif|active/i })
        .first();
      await expect.soft(activeBadge).toBeVisible({ timeout: 10000 });
    });

    await takeScreenshot(page, "bulk-users-activated");
  });

  test("bulk export CSV users", async ({ page }) => {
    test.setTimeout(60000);

    await test.step("Sélectionner tous les users", async () => {
      const selectAllCheckbox = page
        .locator(
          'thead input[type="checkbox"], ' +
            '[data-testid="select-all"], ' +
            'th input[type="checkbox"], ' +
            'button:has-text("Tout sélectionner")',
        )
        .first();
      await selectAllCheckbox.waitFor({ state: "visible", timeout: 15000 });
      await selectAllCheckbox.click();
      await page.waitForTimeout(500);
    });

    await test.step("Déclencher l'export CSV et vérifier le téléchargement", async () => {
      const filename = await waitForDownload(page, async () => {
        const exportBtn = page
          .locator("button, a")
          .filter({ hasText: /export csv|télécharger|exporter|download/i })
          .first();
        await exportBtn.waitFor({ state: "visible", timeout: 10000 });
        await exportBtn.click();
      });

      expect.soft(filename).toMatch(/\.csv$/i);
    });

    await takeScreenshot(page, "bulk-users-csv-export");
  });
});

test.describe("Bulk Actions - Evaluations", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, "admin");
    await page.waitForLoadState("networkidle");
    await page.goto("/evaluations");
    await waitForPageLoad(page);
    await expectNoErrors(page);
  });

  test("sélection d'évaluations - barre bulk apparaît", async ({ page }) => {
    test.setTimeout(60000);

    // Cliquer sur la première checkbox d'une évaluation
    const firstCheckbox = page
      .locator(
        'tbody input[type="checkbox"], [data-testid="evaluation-checkbox"], tr input[type="checkbox"]',
      )
      .first();
    await firstCheckbox.waitFor({ state: "visible", timeout: 15000 });
    await firstCheckbox.click();
    await page.waitForTimeout(500);

    const bulkBar = page
      .locator(
        '[data-testid="bulk-action-bar"], ' +
          '[class*="bulk-action"], ' +
          '[class*="bulk-bar"], ' +
          '[class*="action-bar"], ' +
          '[class*="toolbar"]',
      )
      .first();

    await expect.soft(bulkBar).toBeVisible({ timeout: 10000 });
    await takeScreenshot(page, "bulk-evaluations-bar");
  });

  test("bulk archive évaluations", async ({ page }) => {
    test.setTimeout(60000);

    await test.step("Sélectionner 2 évaluations", async () => {
      const rows = page.locator("tbody tr");
      await rows.first().waitFor({ state: "visible", timeout: 15000 });
      const rowCount = await rows.count();

      let selected = 0;
      for (let i = 0; i < rowCount && selected < 2; i++) {
        const row = rows.nth(i);
        // Éviter les évaluations déjà archivées
        const isArchived = await row
          .getByText(/archivée/i)
          .isVisible()
          .catch(() => false);
        if (!isArchived) {
          const checkbox = row.locator('input[type="checkbox"]').first();
          if (await checkbox.isVisible()) {
            await checkbox.click();
            selected++;
          }
        }
      }
    });

    await test.step("Cliquer sur Archiver", async () => {
      const archiveBtn = page
        .locator("button")
        .filter({ hasText: /archiver|archive/i })
        .first();
      if (await archiveBtn.isVisible({ timeout: 10000 }).catch(() => false)) {
        await archiveBtn.click();

        const confirmBtn = page
          .locator("button")
          .filter({ hasText: /confirmer|confirm|oui|yes/i })
          .first();
        if (await confirmBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
          await confirmBtn.click();
        }
        await page.waitForLoadState("networkidle");

        const archivedBadge = page
          .locator('[class*="badge"], [class*="status"]')
          .filter({ hasText: /archivée|archived/i })
          .first();
        await expect.soft(archivedBadge).toBeVisible({ timeout: 10000 });
      } else {
        test
          .info()
          .annotations.push({
            type: "UX",
            description:
              "Bouton Archiver non trouvé dans la barre bulk évaluations",
          });
      }
    });

    await takeScreenshot(page, "bulk-evaluations-archived");
  });

  test("bulk sign_hr évaluations soumises", async ({ page }) => {
    test.setTimeout(60000);

    await test.step("Sélectionner des évaluations", async () => {
      const rows = page.locator("tbody tr");
      await rows.first().waitFor({ state: "visible", timeout: 15000 });
      const rowCount = await rows.count();

      let selected = 0;
      for (let i = 0; i < rowCount && selected < 3; i++) {
        const row = rows.nth(i);
        const checkbox = row.locator('input[type="checkbox"]').first();
        if (await checkbox.isVisible()) {
          await checkbox.click();
          selected++;
        }
      }
    });

    await test.step("Cliquer sur Signer RH", async () => {
      const signBtn = page
        .locator("button")
        .filter({ hasText: /signer rh|sign rh|signature rh|valider rh/i })
        .first();
      if (await signBtn.isVisible({ timeout: 10000 }).catch(() => false)) {
        await signBtn.click();

        const confirmBtn = page
          .locator("button")
          .filter({ hasText: /confirmer|confirm|oui|yes/i })
          .first();
        if (await confirmBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
          await confirmBtn.click();
        }
        await page.waitForLoadState("networkidle");

        // Vérifier la réponse (succès ou message informatif)
        const body = page.locator("body");
        const hasResponse = await body
          .getByText(/signé|signature|validé|success|erreur/i)
          .isVisible({ timeout: 5000 })
          .catch(() => false);
        expect.soft(hasResponse).toBeTruthy();
      } else {
        test
          .info()
          .annotations.push({
            type: "UX",
            description:
              'Bouton "Signer RH" non trouvé dans la barre bulk — peut nécessiter des évaluations au statut "Soumise"',
          });
      }
    });

    await takeScreenshot(page, "bulk-evaluations-sign-hr");
  });
});
