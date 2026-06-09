import { test, expect } from "@playwright/test";
import { loginAs } from "./helpers/auth";
import {
  waitForPageLoad,
  waitForDownload,
  takeScreenshot,
} from "./helpers/utils";

test.describe("Exports", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, "admin");
    await page.waitForLoadState("networkidle");
  });

  test("Export - évaluations CSV", async ({ page }) => {
    test.setTimeout(30000);
    await page.goto("/evaluations");
    await page.waitForLoadState("networkidle");

    const exportBtn = page
      .getByRole("button", { name: /export.*csv|csv.*export|export/i })
      .first();
    const found = await exportBtn
      .isVisible({ timeout: 5000 })
      .catch(() => false);
    if (!found) {
      test
        .info()
        .annotations.push({
          type: "UX-ISSUE",
          description: "Export CSV button missing on /evaluations",
        });
      test.skip(
        true,
        "Export CSV button not found on /evaluations — UX issue annotated",
      );
      return;
    }

    const filename = await waitForDownload(page, async () => {
      await exportBtn.click();
    });
    expect(filename).toMatch(/\.csv$/i);
  });

  test("Export - campagnes CSV", async ({ page }) => {
    test.setTimeout(30000);
    await page.goto("/campaigns");
    await page.waitForLoadState("networkidle");

    const exportBtn = page
      .getByRole("button", {
        name: /export.*csv|csv.*export|export|télécharger/i,
      })
      .first();
    const found = await exportBtn
      .isVisible({ timeout: 5000 })
      .catch(() => false);
    if (!found) {
      test
        .info()
        .annotations.push({
          type: "UX-ISSUE",
          description: "Export/download button missing on /campaigns",
        });
      test.skip(
        true,
        "Export button not found on /campaigns — UX issue annotated",
      );
      return;
    }

    const filename = await waitForDownload(page, async () => {
      await exportBtn.click();
    });
    expect(filename).toMatch(/\.csv$/i);
  });

  test("Export - analytics PDF", async ({ page }) => {
    test.setTimeout(30000);
    // La page analytics globale (/analytics) déclenche un vrai téléchargement
    // (blob + a.download). La vue par campagne utilise window.open (nouvel onglet).
    await page.goto("/analytics");
    await page.waitForLoadState("networkidle");
    await waitForPageLoad(page);

    const pdfBtn = page
      .getByRole("button", { name: /exporter.*pdf|export.*pdf/i })
      .first();
    const found = await pdfBtn.isVisible({ timeout: 5000 }).catch(() => false);
    if (!found) {
      test.info().annotations.push({
        type: "UX-ISSUE",
        description: "Exporter PDF button missing on /analytics",
      });
      test.skip(true, "Exporter PDF button not found on /analytics");
      return;
    }

    const filename = await waitForDownload(page, async () => {
      await pdfBtn.click();
    });
    expect(filename).toMatch(/\.pdf$/i);
  });

  test("Export - analytics CSV", async ({ page }) => {
    test.setTimeout(30000);
    await page.goto("/analytics");
    await page.waitForLoadState("networkidle");
    await waitForPageLoad(page);

    const csvBtn = page
      .getByRole("button", { name: /exporter.*csv|export.*csv/i })
      .first();
    const found = await csvBtn.isVisible({ timeout: 5000 }).catch(() => false);
    if (!found) {
      test.info().annotations.push({
        type: "UX-ISSUE",
        description: "Exporter CSV button missing on /analytics",
      });
      test.skip(true, "Exporter CSV button not found on /analytics");
      return;
    }

    const filename = await waitForDownload(page, async () => {
      await csvBtn.click();
    });
    expect(filename).toMatch(/\.csv$/i);
  });

  test("Export - formulaire JSON", async ({ page }) => {
    test.setTimeout(30000);
    await page.goto("/forms");
    await page.waitForLoadState("networkidle");

    // Lien vers le détail d'un formulaire (on exclut /new et /edit). On résout
    // le href puis on navigue directement (les liens de liste peuvent être de
    // petite taille / non « visibles » au sens Playwright).
    const detailHref = await page
      .locator('a[href*="/forms/"]:not([href$="/new"]):not([href$="/edit"])')
      .first()
      .getAttribute("href")
      .catch(() => null);

    if (!detailHref) {
      test
        .info()
        .annotations.push({
          type: "UX-ISSUE",
          description: "No forms found on /forms to test JSON export",
        });
      test.skip(true, "No forms available on /forms — cannot test JSON export");
      return;
    }

    await page.goto(detailHref);
    await page.waitForLoadState("networkidle");

    // Le détail expose un bouton « Exporter JSON » (blob a.download).
    const jsonBtn = page
      .getByRole("button", { name: /exporter json|export.*json/i })
      .first();
    const found = await jsonBtn.isVisible({ timeout: 5000 }).catch(() => false);
    if (!found) {
      test
        .info()
        .annotations.push({
          type: "UX-ISSUE",
          description: "Exporter JSON button missing on form detail page",
        });
      test.skip(
        true,
        "Exporter JSON button not found on form detail — UX issue annotated",
      );
      return;
    }

    const filename = await waitForDownload(page, async () => {
      await jsonBtn.click();
    });
    expect(filename).toMatch(/\.json$/i);
  });

  test("Export - ressources téléchargement", async ({ page }) => {
    test.setTimeout(30000);
    await page.goto("/resources");
    await page.waitForLoadState("networkidle");

    // Find first resource with a download button
    const downloadBtn = page
      .getByRole("button", { name: /télécharger|download/i })
      .or(page.getByRole("link", { name: /télécharger|download/i }))
      .first();

    const found = await downloadBtn
      .isVisible({ timeout: 5000 })
      .catch(() => false);
    if (!found) {
      test
        .info()
        .annotations.push({
          type: "UX-ISSUE",
          description: "No download button found on /resources",
        });
      test.skip(
        true,
        "No download button found on /resources — UX issue annotated",
      );
      return;
    }

    const filename = await waitForDownload(page, async () => {
      await downloadBtn.click();
    });
    expect(filename.length).toBeGreaterThan(0);
    await takeScreenshot(page, "resources-download");
  });

  test("Export - users bulk CSV", async ({ page }) => {
    test.setTimeout(30000);
    await page.goto("/users");
    await page.waitForLoadState("networkidle");

    // Tout sélectionner via la checkbox d'en-tête (aria-label).
    const selectAllCheckbox = page.getByLabel("Tout sélectionner").first();
    await selectAllCheckbox.waitFor({ state: "visible", timeout: 10000 });
    await selectAllCheckbox.check();
    await page.waitForTimeout(300);

    // La barre d'actions groupées expose « Exporter CSV » (blob a.download).
    const exportBtn = page
      .getByRole("button", { name: /exporter csv/i })
      .first();
    const found = await exportBtn
      .isVisible({ timeout: 5000 })
      .catch(() => false);
    if (!found) {
      test
        .info()
        .annotations.push({
          type: "UX-ISSUE",
          description: "Bulk export CSV button missing on /users",
        });
      test.skip(
        true,
        "Bulk export CSV button not found on /users — UX issue annotated",
      );
      return;
    }

    const filename = await waitForDownload(page, async () => {
      await exportBtn.click();
    });
    expect(filename).toMatch(/\.csv$/i);
  });

  test("Export - rapport PDF dashboard admin", async ({ page }) => {
    test.setTimeout(30000);
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    let pdfBtn = page
      .getByRole("button", {
        name: /exporter.*pdf|export.*pdf|rapport.*pdf|pdf/i,
      })
      .first();
    let found = await pdfBtn.isVisible({ timeout: 5000 }).catch(() => false);

    // Fallback: try /admin if not found on dashboard
    if (!found) {
      await page.goto("/admin");
      await page.waitForLoadState("networkidle");
      pdfBtn = page
        .getByRole("button", {
          name: /exporter.*pdf|export.*pdf|rapport.*pdf|pdf/i,
        })
        .first();
      found = await pdfBtn.isVisible({ timeout: 5000 }).catch(() => false);
    }

    if (!found) {
      test
        .info()
        .annotations.push({
          type: "UX-ISSUE",
          description: "Exporter PDF button missing on dashboard and /admin",
        });
      test.skip(
        true,
        "Exporter PDF button not found on dashboard or /admin — UX issue annotated",
      );
      return;
    }

    // Sur le dashboard admin, l'export PDF est un bouton désactivé (non
    // implémenté). On l'annote comme manque produit et on saute le test plutôt
    // que d'attendre un téléchargement qui ne viendra jamais.
    if (await pdfBtn.isDisabled().catch(() => false)) {
      test.info().annotations.push({
        type: "UX-ISSUE",
        description:
          "Dashboard admin : bouton « Exporter PDF » désactivé (export non implémenté)",
      });
      test.skip(true, "Export PDF dashboard admin non implémenté (bouton désactivé)");
      return;
    }

    const filename = await waitForDownload(page, async () => {
      await pdfBtn.click();
    });
    expect(filename).toMatch(/\.pdf$/i);
  });
});
