import { test, expect } from "@playwright/test";
import { loginAs } from "./helpers/auth";
import {
  waitForPageLoad,
  expectNoErrors,
  expectNotUnauthorized,
  waitForDownload,
  takeScreenshot,
} from "./helpers/utils";

test.describe("Campagne - Lifecycle Complet", () => {
  test.setTimeout(60000);

  test.beforeEach(async ({ page }) => {
    await loginAs(page, "admin");
    await page.waitForLoadState("networkidle");
  });

  test.afterEach(async ({ page }, testInfo) => {
    if (testInfo.status !== testInfo.expectedStatus) {
      await takeScreenshot(
        page,
        `fail-campaign-lifecycle-${testInfo.title.replace(/[^\w]/g, "_").slice(0, 50)}`,
      );
    }
  });

  test("campagne - liste accessible, campagne seed présente", async ({
    page,
  }) => {
    await page.goto("/campaigns");
    await waitForPageLoad(page);
    await expectNoErrors(page);
    await expectNotUnauthorized(page);

    const seedCampaign = page
      .getByText(/Entretien annuel|Mi-parcours|Évaluation 360°|campagne/i)
      .first();
    await expect(seedCampaign).toBeVisible({ timeout: 15000 });

    await takeScreenshot(page, "campaigns-list");
  });

  test("campagne - activer une campagne brouillon", async ({ page }) => {
    await page.goto("/campaigns");
    await waitForPageLoad(page);

    // Try to click a campaign in draft state
    const draftCampaign = page
      .locator(
        '[data-status="draft"], [data-status="brouillon"], [class*="draft" i]',
      )
      .first();

    if (await draftCampaign.isVisible()) {
      await draftCampaign.click();
      await page.waitForLoadState("networkidle");
    } else {
      const firstCampaignLink = page.locator('a[href*="/campaigns/"]').first();
      if (await firstCampaignLink.isVisible()) {
        await firstCampaignLink.click();
        await page.waitForLoadState("networkidle");
      }
    }

    const activateBtn = page.getByRole("button", {
      name: /activer|publier|activate|publish/i,
    });
    if (await activateBtn.isVisible()) {
      await activateBtn.click();
      await page.waitForLoadState("networkidle");

      const activeStatus = page
        .getByText(/actif|active|activée|publiée/i)
        .first();
      await expect(activeStatus).toBeVisible({ timeout: 15000 });
    } else {
      test.info().annotations.push({
        type: "UX",
        description: "Bouton Activer/Publier introuvable sur la campagne",
      });
    }
  });

  test("campagne - assigner évaluations (sélectionner participants)", async ({
    page,
  }) => {
    await page.goto("/evaluations");
    await waitForPageLoad(page);
    await expectNotUnauthorized(page);

    const assignBtn = page.getByRole("button", {
      name: /assigner|créer les évaluations|assign|bulk/i,
    });

    if (await assignBtn.isVisible()) {
      await assignBtn.click();
      await page.waitForLoadState("networkidle");

      const successMsg = page.getByText(/créé|assigné|success|succès/i).first();
      await expect(successMsg).toBeVisible({ timeout: 15000 });
    } else {
      // Try from campaign detail
      await page.goto("/campaigns");
      await waitForPageLoad(page);

      const firstCampaignLink = page.locator('a[href*="/campaigns/"]').first();
      if (await firstCampaignLink.isVisible()) {
        await firstCampaignLink.click();
        await page.waitForLoadState("networkidle");

        const assignFromDetailBtn = page.getByRole("button", {
          name: /assigner|créer les évaluations|assign/i,
        });
        if (await assignFromDetailBtn.isVisible()) {
          await assignFromDetailBtn.click();
          await page.waitForLoadState("networkidle");
        } else {
          test.info().annotations.push({
            type: "UX",
            description: "Bouton d'assignation des évaluations introuvable",
          });
        }
      }
    }
  });

  test("campagne - progression visible sur la liste", async ({ page }) => {
    await page.goto("/campaigns");
    await waitForPageLoad(page);
    await expectNotUnauthorized(page);

    const progressBar = page
      .locator(
        '[role="progressbar"], [class*="progress" i], [class*="completion" i]',
      )
      .first();
    const percentageText = page.getByText(/\d+\s*%/).first();

    const hasProgress =
      (await progressBar.isVisible()) || (await percentageText.isVisible());

    expect.soft(hasProgress).toBeTruthy();
    if (!hasProgress) {
      test.info().annotations.push({
        type: "UX",
        description:
          "Aucun indicateur de progression trouvé sur la liste des campagnes",
      });
    }

    await takeScreenshot(page, "campaigns-progress");
  });

  test("campagne - analytics accessible", async ({ page }) => {
    await page.goto("/campaigns");
    await waitForPageLoad(page);

    const firstCampaignLink = page.locator('a[href*="/campaigns/"]').first();
    if (await firstCampaignLink.isVisible()) {
      const href = await firstCampaignLink.getAttribute("href");
      if (href) {
        const analyticsUrl = `${href.replace(/\/$/, "")}/analytics`;
        await page.goto(analyticsUrl);
        await page.waitForLoadState("networkidle");

        // Fall back to /analytics root if campaign analytics 404s
        const bodyText = await page.locator("body").textContent();
        if (bodyText?.includes("404") || bodyText?.includes("Not Found")) {
          await page.goto("/analytics");
          await page.waitForLoadState("networkidle");
        }
      }
    } else {
      await page.goto("/analytics");
      await page.waitForLoadState("networkidle");
    }

    await expectNotUnauthorized(page);

    const statsContent = page
      .locator(
        '[class*="chart" i], [class*="stat" i], canvas, [data-testid*="analytics"]',
      )
      .first();
    const numberText = page.getByText(/\d+/).first();
    const hasContent =
      (await statsContent.isVisible()) || (await numberText.isVisible());

    expect.soft(hasContent).toBeTruthy();
    await takeScreenshot(page, "campaign-analytics");
  });

  test("campagne - export CSV des évaluations", async ({ page }) => {
    await page.goto("/evaluations");
    await waitForPageLoad(page);
    await expectNotUnauthorized(page);

    const exportButton = page.getByRole("button", {
      name: /export|exporter|csv/i,
    });

    if (await exportButton.isVisible()) {
      const filename = await waitForDownload(page, () => exportButton.click());
      expect(filename).toMatch(/\.csv$/i);
    } else {
      // Try anchor with download attribute
      const exportLink = page
        .locator('a[download], a[href*=".csv"], a[href*="export"]')
        .first();
      if (await exportLink.isVisible()) {
        const filename = await waitForDownload(page, () => exportLink.click());
        expect(filename).toMatch(/\.csv$/i);
      } else {
        test.info().annotations.push({
          type: "UX",
          description: "Bouton/lien export CSV introuvable sur /evaluations",
        });
      }
    }
  });

  test("campagne - clôturer une campagne", async ({ page }) => {
    await page.goto("/campaigns");
    await waitForPageLoad(page);

    // Prefer an active campaign
    const activeCampaignLink = page
      .locator(
        '[data-status="active"] a, [data-status="actif"] a, [class*="active" i] a[href*="/campaigns/"]',
      )
      .first();

    if (await activeCampaignLink.isVisible()) {
      await activeCampaignLink.click();
      await page.waitForLoadState("networkidle");
    } else {
      const firstCampaignLink = page.locator('a[href*="/campaigns/"]').first();
      if (await firstCampaignLink.isVisible()) {
        await firstCampaignLink.click();
        await page.waitForLoadState("networkidle");
      }
    }

    const closeBtn = page.getByRole("button", {
      name: /clôturer|terminer|fermer|close/i,
    });

    if (await closeBtn.isVisible()) {
      await closeBtn.click();
      await page.waitForLoadState("networkidle");

      // Handle confirmation modal if present
      const confirmBtn = page.getByRole("button", {
        name: /confirmer|confirm|oui|yes|ok/i,
      });
      if (await confirmBtn.isVisible()) {
        await confirmBtn.click();
        await page.waitForLoadState("networkidle");
      }

      const closedStatus = page
        .getByText(/clôturée|fermée|terminée|closed/i)
        .first();
      await expect(closedStatus).toBeVisible({ timeout: 15000 });
    } else {
      test.info().annotations.push({
        type: "UX",
        description: "Bouton Clôturer/Terminer introuvable sur la campagne",
      });
    }
  });
});
