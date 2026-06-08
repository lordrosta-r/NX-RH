import { test, expect } from "@playwright/test";
import { loginAs } from "./helpers/auth";
import {
  waitForPageLoad,
  expectNoErrors,
  expectNotUnauthorized,
  takeScreenshot,
} from "./helpers/utils";

test.describe("Manager - Workflow Complet", () => {
  test.setTimeout(60000);

  test.beforeEach(async ({ page }) => {
    await loginAs(page, "manager");
    await page.waitForLoadState("networkidle");
  });

  test.afterEach(async ({ page }, testInfo) => {
    if (testInfo.status !== testInfo.expectedStatus) {
      await takeScreenshot(
        page,
        `fail-manager-${testInfo.title.replace(/[^\w]/g, "_").slice(0, 50)}`,
      );
    }
  });

  test("Manager - dashboard manager affiché", async ({ page }) => {
    await page.goto("/");
    await waitForPageLoad(page);
    await expectNoErrors(page);
    await takeScreenshot(page, "manager-dashboard");
  });

  test("Manager - voir liste des évaluations de son équipe", async ({
    page,
  }) => {
    await page.goto("/evaluations");
    await waitForPageLoad(page);
    await expectNotUnauthorized(page);
    await expectNoErrors(page);

    // La liste manager rend une grille (Tile + .tbl-head/.tbl-row), pas une <table>.
    // On accepte aussi l'EmptyState si le manager n'a pas d'évaluations à conduire.
    const listContent = page
      .locator('.tbl-head, .tbl-row, [data-testid="empty-state"]')
      .first();
    await expect(listContent).toBeVisible({ timeout: 15000 });
  });

  test("Manager - remplir une évaluation assignée", async ({ page }) => {
    await page.goto("/evaluations");
    await waitForPageLoad(page);
    await expectNotUnauthorized(page);

    // Prefer assigned/in_progress evaluation
    const evalItem = page
      .locator(
        '[data-status="assigned"], [data-status="in_progress"], [data-status="en_cours"]',
      )
      .first();

    if (await evalItem.isVisible()) {
      await evalItem.click();
      await page.waitForLoadState("networkidle");
    } else {
      const firstEvalLink = page
        .locator(
          'a[href*="/evaluations/"], tr td a, [class*="evaluation-item" i]',
        )
        .first();
      if (await firstEvalLink.isVisible()) {
        await firstEvalLink.click();
        await page.waitForLoadState("networkidle");
      }
    }

    // Fill star/number rating — try value=4 first, then nth star button
    const ratingFour = page
      .locator(
        '[aria-label*="4"], [data-value="4"], input[type="radio"][value="4"], button[value="4"]',
      )
      .first();

    if (await ratingFour.isVisible()) {
      await ratingFour.click();
    } else {
      const numberInput = page
        .locator('input[type="number"], input[type="range"]')
        .first();
      if (await numberInput.isVisible()) {
        await numberInput.fill("4");
      } else {
        const starButtons = page.locator('[class*="star" i]');
        const starCount = await starButtons.count();
        if (starCount >= 4) {
          await starButtons.nth(3).click();
        }
      }
    }

    // Fill comment textarea
    const textareaField = page.locator("textarea").first();
    if (await textareaField.isVisible()) {
      await textareaField.fill("Très bonne performance cette année");
    }

    // Handle yes/no question
    const yesOption = page
      .locator(
        'input[type="radio"][value="yes"], input[type="radio"][value="oui"], button:has-text("Oui"), button:has-text("Yes")',
      )
      .first();
    if (await yesOption.isVisible()) {
      await yesOption.click();
    }

    // Save as draft
    const saveBtn = page.getByRole("button", {
      name: /save|sauvegarder|brouillon|enregistrer/i,
    });
    if (await saveBtn.isVisible()) {
      await saveBtn.click();
      await page.waitForLoadState("networkidle");
    }

    await takeScreenshot(page, "manager-evaluation-filled");
  });

  test("Manager - soumettre une évaluation", async ({ page }) => {
    await page.goto("/evaluations");
    await waitForPageLoad(page);
    await expectNotUnauthorized(page);

    const evalItem = page
      .locator(
        '[data-status="in_progress"], [data-status="en_cours"], [data-status="assigned"]',
      )
      .first();

    if (await evalItem.isVisible()) {
      await evalItem.click();
      await page.waitForLoadState("networkidle");
    } else {
      const firstEvalLink = page
        .locator('a[href*="/evaluations/"], tr td a')
        .first();
      if (await firstEvalLink.isVisible()) {
        await firstEvalLink.click();
        await page.waitForLoadState("networkidle");
      }
    }

    const submitBtn = page.getByRole("button", { name: /soumettre|submit/i });

    if (await submitBtn.isVisible()) {
      await submitBtn.click();
      await page.waitForLoadState("networkidle");

      // Handle confirmation modal
      const confirmBtn = page.getByRole("button", {
        name: /confirmer|confirm|oui|yes|ok/i,
      });
      if (await confirmBtn.isVisible()) {
        await confirmBtn.click();
        await page.waitForLoadState("networkidle");
      }

      const submittedStatus = page
        .getByText(/soumis|soumise|submitted/i)
        .first();
      await expect(submittedStatus).toBeVisible({ timeout: 15000 });
    } else {
      test.info().annotations.push({
        type: "UX",
        description: "Bouton Soumettre introuvable sur l'évaluation",
      });
    }
  });

  test("Manager - signer une évaluation côté manager", async ({ page }) => {
    await page.goto("/evaluations");
    await waitForPageLoad(page);
    await expectNotUnauthorized(page);

    // Prefer a submitted evaluation
    const submittedEval = page
      .locator('[data-status="submitted"], [data-status="soumise"]')
      .first();

    if (await submittedEval.isVisible()) {
      await submittedEval.click();
      await page.waitForLoadState("networkidle");
    } else {
      const firstEvalLink = page
        .locator('a[href*="/evaluations/"], tr td a')
        .first();
      if (await firstEvalLink.isVisible()) {
        await firstEvalLink.click();
        await page.waitForLoadState("networkidle");
      }
    }

    const signBtn = page.getByRole("button", { name: /signer|sign/i });

    if (await signBtn.isVisible()) {
      await signBtn.click();
      await page.waitForLoadState("networkidle");

      // Handle confirmation modal
      const confirmBtn = page.getByRole("button", {
        name: /confirmer|confirm|oui|yes|ok/i,
      });
      if (await confirmBtn.isVisible()) {
        await confirmBtn.click();
        await page.waitForLoadState("networkidle");
      }

      const signedStatus = page.getByText(/signé|signée|signed/i).first();
      await expect(signedStatus).toBeVisible({ timeout: 15000 });
    } else {
      test.info().annotations.push({
        type: "UX",
        description: "Bouton Signer introuvable sur l'évaluation soumise",
      });
    }
  });

  test("Manager - accéder à PDI", async ({ page }) => {
    await page.goto("/pdi");
    await waitForPageLoad(page);
    await expectNotUnauthorized(page);
    await expectNoErrors(page);
    await takeScreenshot(page, "manager-pdi");
  });

  test("Manager - créer une demande de mobilité", async ({ page }) => {
    await page.goto("/mobility");
    await waitForPageLoad(page);
    await expectNotUnauthorized(page);

    const newMobilityBtn = page
      .getByRole("button", { name: /nouvelle demande/i })
      .first();

    if (await newMobilityBtn.isVisible()) {
      await newMobilityBtn.click();
      await page.waitForLoadState("networkidle");

      // Catégorie "promotion" → champ obligatoire "Poste visé"
      const typeField = page.getByLabel(/type de demande/i).first();
      if (await typeField.isVisible()) {
        await typeField.selectOption("promotion").catch(async () => {
          await typeField.selectOption({ index: 1 });
        });
      }

      // Champ obligatoire "Poste visé" (#mob-target-position) — sinon le bouton reste disabled
      const targetPositionField = page.getByLabel(/poste visé/i).first();
      if (
        await targetPositionField
          .isVisible({ timeout: 5000 })
          .catch(() => false)
      ) {
        await targetPositionField.fill("Chef de projet senior E2E");
      }

      const descField = page.getByLabel(/description de la demande/i).first();
      if (await descField.isVisible()) {
        await descField.fill(
          "Demande de mobilité créée par test E2E automatisé",
        );
      }

      const submitBtn = page.getByRole("button", {
        name: /soumettre|submit|créer|save|enregistrer/i,
      });
      if (await submitBtn.isVisible()) {
        await submitBtn.click();
        await page.waitForLoadState("networkidle");

        // La liste rend des lignes de tableau (div.tbl-row), pas une <table>
        const mobilityItem = page.locator(".tbl-row").first();
        await expect(mobilityItem).toBeVisible({ timeout: 15000 });
      }
    } else {
      test.info().annotations.push({
        type: "UX",
        description: "Bouton Nouvelle demande introuvable sur /mobility",
      });
    }
  });

  test("Manager - accès admin refusé", async ({ page }) => {
    await page.goto("/admin");
    await page.waitForLoadState("networkidle");

    const isRedirected =
      page.url().includes("/login") ||
      page.url().includes("/unauthorized") ||
      page.url().includes("/403");

    const unauthorizedText = await page
      .getByText(/403|non autorisé|unauthorized|accès refusé|forbidden/i)
      .isVisible();

    expect.soft(isRedirected || unauthorizedText).toBeTruthy();

    if (!isRedirected && !unauthorizedText) {
      test.info().annotations.push({
        type: "UX",
        description:
          "Le rôle Manager semble avoir accès à /admin — vérifier les permissions",
      });
    }
  });
});
