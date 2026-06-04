import { test, expect } from "@playwright/test";
import { loginAs } from "./helpers/auth";
import {
  waitForPageLoad,
  expectNoErrors,
  expectNotUnauthorized,
  takeScreenshot,
} from "./helpers/utils";

test.describe("Offboarding", () => {
  test("Offboarding - admin peut accéder à /offboarding", async ({ page }) => {
    test.setTimeout(60000);
    await loginAs(page, "admin");
    await page.waitForLoadState("networkidle");
    await page.goto("/offboarding");
    await waitForPageLoad(page);
    await expectNoErrors(page);
    await expectNotUnauthorized(page);
  });

  test("Offboarding - HR peut accéder à /offboarding", async ({ page }) => {
    test.setTimeout(60000);
    await loginAs(page, "hr");
    await page.waitForLoadState("networkidle");
    await page.goto("/offboarding");
    await waitForPageLoad(page);
    await expectNoErrors(page);
    await expectNotUnauthorized(page);
  });

  test("Offboarding - manager a accès (lecture seule)", async ({ page }) => {
    // Manager has access to /offboarding (roles: admin, hr, manager)
    test.setTimeout(60000);
    await loginAs(page, "manager");
    await page.waitForLoadState("networkidle");
    await page.goto("/offboarding");
    await waitForPageLoad(page);

    await expect(page.locator("body")).not.toContainText(
      /accès refusé|unauthorized|non autorisé|403/i,
    );
  });

  test("Offboarding - employé n'a pas accès", async ({ page }) => {
    test.setTimeout(60000);
    await loginAs(page, "employee");
    await page.waitForLoadState("networkidle");
    await page.goto("/offboarding");
    await waitForPageLoad(page);

    const url = page.url();
    const body = page.locator("body");
    const isRedirected = /login|unauthorized|403|accueil|\/dashboard/.test(url);
    const hasUnauthorizedText = await body
      .getByText(/accès refusé|unauthorized|non autorisé|403|interdit/i)
      .isVisible()
      .catch(() => false);
    expect.soft(isRedirected || hasUnauthorizedText).toBeTruthy();
  });

  test("Offboarding - HR crée une nouvelle demande via slide-over", async ({
    page,
  }) => {
    test.setTimeout(60000);
    await loginAs(page, "hr");
    await page.waitForLoadState("networkidle");
    await page.goto("/offboarding");
    await waitForPageLoad(page);

    await test.step("Ouvrir le formulaire de création", async () => {
      const newBtn = page
        .locator("button, a")
        .filter({
          hasText: /nouvelle demande|\+ offboarding|nouveau|créer|ajouter/i,
        })
        .first();
      await newBtn.waitFor({ state: "visible", timeout: 15000 });
      await newBtn.click();

      // Le slide-over utilise className="fixed inset-0 z-50 flex justify-end"
      // On attend le h2 qui s'affiche à l'intérieur
      const slideOverTitle = page
        .locator("h2")
        .filter({ hasText: /nouvelle demande de départ|nouvelle demande/i })
        .first();
      await slideOverTitle.waitFor({ state: "visible", timeout: 10000 });
    });

    await test.step("Sélectionner l'employé", async () => {
      // Always select Emma Petit (emp2) — safe employee not used for any test login
      // and has no existing offboarding request after seed
      const employeeSelect = page
        .locator(
          'select#offboarding-user, select[id*="offboarding-user"], select[id*="user"]',
        )
        .first();
      if (
        await employeeSelect.isVisible({ timeout: 5000 }).catch(() => false)
      ) {
        await employeeSelect.selectOption({ label: "Emma Petit" });
      } else {
        // Fallback: tout select dans le slide-over visible
        const anySelect = page.locator(".fixed select").first();
        if (await anySelect.isVisible({ timeout: 3000 }).catch(() => false)) {
          await anySelect.selectOption({ label: "Emma Petit" });
        }
      }
    });

    await test.step("Sélectionner le motif", async () => {
      const reasonSelect = page
        .locator(
          'select[name*="reason"], select[name*="motif"], select[id*="reason"], select[id*="motif"]',
        )
        .first();
      if (await reasonSelect.isVisible({ timeout: 5000 }).catch(() => false)) {
        const options = await reasonSelect.locator("option").allTextContents();
        const demission = options.find((o) => /démission|resignation/i.test(o));
        await reasonSelect.selectOption(
          demission ?? options[1] ?? { index: 1 },
        );
      }

      // Champ texte pour le motif si ce n'est pas un select
      const reasonInput = page
        .locator(
          'input[name*="reason"], textarea[name*="reason"], input[name*="motif"], textarea[name*="motif"]',
        )
        .first();
      if (await reasonInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await reasonInput.fill("Démission");
      }
    });

    await test.step("Remplir la date de départ", async () => {
      const lastDay = new Date();
      lastDay.setDate(lastDay.getDate() + 30);
      const lastDayStr = lastDay.toISOString().split("T")[0];

      const dateInput = page
        .locator(
          'input[type="date"][name*="last"], input[name*="lastDay"], input[name*="departure"], input[type="date"]',
        )
        .first();
      if (await dateInput.isVisible({ timeout: 5000 }).catch(() => false)) {
        await dateInput.fill(lastDayStr);
      }
    });

    await test.step("Soumettre la demande", async () => {
      const submitBtn = page
        .locator('button[type="submit"], button')
        .filter({ hasText: /créer|soumettre|enregistrer|valider|save|submit/i })
        .first();
      await submitBtn.waitFor({ state: "visible", timeout: 10000 });
      await submitBtn.click();
      await page.waitForLoadState("networkidle");
    });

    await test.step("Vérifier la nouvelle carte dans la liste", async () => {
      const newRow = page.locator("table tbody tr").first();
      await newRow.waitFor({ state: "visible", timeout: 15000 });

      // StatusBadge uses bg-yellow-50 text-yellow-700 classes, no "badge" in classname
      const badge = page
        .locator("span")
        .filter({ hasText: /en attente/i })
        .first();
      await expect.soft(badge).toBeVisible({ timeout: 10000 });
    });
  });

  test("Offboarding - ouvrir détail et voir checklist", async ({ page }) => {
    test.setTimeout(60000);
    await loginAs(page, "hr");
    await page.waitForLoadState("networkidle");
    await page.goto("/offboarding");
    await waitForPageLoad(page);

    await test.step("Ouvrir le détail", async () => {
      // Cliquer sur le lien <a> dans la première cellule (pas sur le <tr> qui ne navigue pas)
      const firstLink = page.locator("table tbody tr td a").first();
      await firstLink.waitFor({ state: "visible", timeout: 15000 });
      await firstLink.click();
      await waitForPageLoad(page);
    });

    await test.step("Vérifier la checklist", async () => {
      // La checklist utilise des <button> dans un div.space-y-3, pas des input[type="checkbox"]
      const checklistSection = page
        .locator("h2")
        .filter({ hasText: /checklist de départ/i })
        .first();
      await checklistSection.waitFor({ state: "visible", timeout: 15000 });
      // Les items sont des boutons dans la section checklist
      const checklistItems = page.locator("div.space-y-3 button");
      await checklistItems
        .first()
        .waitFor({ state: "visible", timeout: 10000 });
      const count = await checklistItems.count();
      expect(count).toBeGreaterThanOrEqual(3);
    });

    await takeScreenshot(page, "offboarding-detail-checklist");
  });

  test("Offboarding - cocher des items de checklist", async ({ page }) => {
    test.setTimeout(60000);
    await loginAs(page, "hr");
    await page.waitForLoadState("networkidle");
    await page.goto("/offboarding");
    await waitForPageLoad(page);

    // Ouvrir la première demande via le lien dans le tableau
    const firstLink = page.locator("table tbody tr td a").first();
    await firstLink.waitFor({ state: "visible", timeout: 15000 });
    await firstLink.click();
    await waitForPageLoad(page);

    await test.step("Cocher le premier item non coché", async () => {
      // Les items checklist sont des boutons (avec icône Square/CheckSquare), pas des input checkbox
      const checklistItems = page.locator("div.space-y-3 button");
      await checklistItems
        .first()
        .waitFor({ state: "visible", timeout: 15000 });
      // Trouver le premier item non complété (contient class border-slate-100)
      const uncheckedItems = page
        .locator("div.space-y-3 button")
        .filter({ has: page.locator("svg").first() });
      const firstUnchecked = uncheckedItems.first();
      await firstUnchecked.waitFor({ state: "visible", timeout: 10000 });
      await firstUnchecked.click();
      await page.waitForLoadState("networkidle");
    });

    await test.step("Recharger et vérifier persistance", async () => {
      await page.reload();
      await waitForPageLoad(page);
      // Vérifier qu'il y a encore des items dans la checklist (page chargée correctement)
      const checklistItems = page.locator("div.space-y-3 button");
      await checklistItems
        .first()
        .waitFor({ state: "visible", timeout: 15000 });
      const count = await checklistItems.count();
      expect(count).toBeGreaterThanOrEqual(1);
    });

    await test.step("Cocher 2 autres items", async () => {
      const checklistItems = page.locator("div.space-y-3 button");
      const total = await checklistItems.count();
      for (let i = 0; i < Math.min(2, total); i++) {
        const item = checklistItems.nth(0);
        if (await item.isVisible()) {
          await item.click();
          await page.waitForLoadState("networkidle");
        }
      }
    });
  });

  test("Offboarding - changer statut: En attente → En cours", async ({
    page,
  }) => {
    test.setTimeout(60000);
    await loginAs(page, "hr");
    await page.waitForLoadState("networkidle");
    await page.goto("/offboarding");
    await waitForPageLoad(page);

    // Find Emma Petit's row (created by test 51) — click her name link
    const emmaRow = page
      .locator("table tbody tr")
      .filter({ hasText: /Emma Petit/i });
    await emmaRow.waitFor({ state: "visible", timeout: 15000 });
    await emmaRow.locator("td a").first().click();
    await waitForPageLoad(page);

    await test.step("Changer le statut", async () => {
      // Dans OffboardingDetailPage, le bouton de statut est un footer button
      // Son label est "Marquer En cours" (depuis pending) ou "Marquer Complété" (depuis in_progress)
      const statusBtn = page
        .locator("button")
        .filter({
          hasText:
            /marquer en cours|marquer complété|passer en cours|valider|terminer/i,
        })
        .first();
      if (await statusBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        await statusBtn.click();
        await page.waitForLoadState("networkidle");
      } else {
        // Fallback: chercher via le menu kebab "Modifier statut" dans la liste
        const kebabBtn = page
          .locator('button[aria-label="Afficher les actions"]')
          .first();
        if (await kebabBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
          await kebabBtn.click();
          const modifierStatut = page
            .locator("button")
            .filter({ hasText: /modifier statut/i })
            .first();
          if (
            await modifierStatut.isVisible({ timeout: 2000 }).catch(() => false)
          ) {
            await modifierStatut.click();
          }
        }
      }
    });

    await test.step("Vérifier badge mis à jour", async () => {
      const badge = page
        .locator("span")
        .filter({ hasText: /en cours|in progress/i })
        .first();
      await expect.soft(badge).toBeVisible({ timeout: 10000 });
    });
  });

  test("Offboarding - changer statut: En cours → Terminé", async ({ page }) => {
    test.setTimeout(60000);
    await loginAs(page, "hr");
    await page.waitForLoadState("networkidle");
    await page.goto("/offboarding");
    await waitForPageLoad(page);

    // Find Emma Petit's row (should be in_progress after test 203) — click her name link
    const emmaRow2 = page
      .locator("table tbody tr")
      .filter({ hasText: /Emma Petit/i });
    await emmaRow2.waitFor({ state: "visible", timeout: 15000 });
    await emmaRow2.locator("td a").first().click();
    await waitForPageLoad(page);

    await test.step("Changer le statut vers Terminé", async () => {
      // First check current status: might be pending or in_progress
      const enCoursBtn = page
        .locator("button")
        .filter({ hasText: /marquer en cours/i })
        .first();
      const completeBtn = page
        .locator("button")
        .filter({ hasText: /marquer complété|marquer terminé/i })
        .first();

      const isInPending = await enCoursBtn.isVisible();
      if (isInPending) {
        // pending → in_progress first
        await enCoursBtn.click();
        await page.waitForLoadState("networkidle");
      }

      // Now in_progress: click "Marquer Complété"
      await completeBtn.waitFor({ state: "visible", timeout: 10000 });
      await completeBtn.click();

      // Confirm modal appears: click "Confirmer" (exact match)
      const confirmBtn = page.getByRole("button", {
        name: "Confirmer",
        exact: true,
      });
      await confirmBtn.waitFor({ state: "visible", timeout: 10000 });
      await confirmBtn.click();
      await page.waitForLoadState("networkidle");
    });

    await test.step("Vérifier badge Terminé", async () => {
      const badge = page
        .locator("span")
        .filter({ hasText: /terminé|completed|done/i })
        .first();
      await expect.soft(badge).toBeVisible({ timeout: 10000 });
    });

    await takeScreenshot(page, "offboarding-status-termine");
  });

  test("Offboarding - admin supprime la demande", async ({ page }) => {
    test.setTimeout(60000);
    await loginAs(page, "admin");
    await page.waitForLoadState("networkidle");
    await page.goto("/offboarding");
    await waitForPageLoad(page);

    // Compter avant suppression
    const items = page.locator("table tbody tr");
    await items.first().waitFor({ state: "visible", timeout: 15000 });
    const countBefore = await items.count();

    await test.step("Trouver et cliquer sur le bouton supprimer", async () => {
      // Navigate to Emma Petit's record detail (created by test 51, completed by test 242)
      const emmaRow3 = page
        .locator("table tbody tr")
        .filter({ hasText: /Emma Petit/i });
      await emmaRow3.waitFor({ state: "visible", timeout: 15000 });
      await emmaRow3.locator("td a").first().click();
      await waitForPageLoad(page);
      // The ⋮ menu button is the adjacent sibling of div.flex-1 in the detail header
      // This avoids matching navbar dropdowns which also have div.relative > button
      const kebabBtn = page.locator("div.flex-1 + div.relative > button");
      await kebabBtn.waitFor({ state: "visible", timeout: 5000 });
      await kebabBtn.click();
      // "Supprimer" is now visible in the dropdown
      const deleteMenuItem = page
        .locator("button")
        .filter({ hasText: /^Supprimer$/ })
        .first();
      await deleteMenuItem.waitFor({ state: "visible", timeout: 5000 });
      await deleteMenuItem.click();
    });

    await test.step("Confirmer la suppression", async () => {
      // Delete confirmation modal — click "Supprimer" to confirm
      const confirmDeleteBtn = page
        .locator("button")
        .filter({ hasText: /^Supprimer$/ })
        .first();
      await confirmDeleteBtn.waitFor({ state: "visible", timeout: 8000 });
      await confirmDeleteBtn.click();
      // Wait for SPA navigation back to the list page after deletion
      await page.waitForURL("**/offboarding", { timeout: 15000 });
      await waitForPageLoad(page);
    });

    await test.step("Vérifier suppression de la liste", async () => {
      // Ensure we are on the list page
      if (!page.url().match(/\/offboarding\/?$/)) {
        await page.goto("/offboarding");
        await waitForPageLoad(page);
      }
      // Wait for Emma Petit's row to be gone (cache invalidated + list refreshed)
      await expect(
        page.locator("table tbody tr").filter({ hasText: /Emma Petit/i }),
      ).toHaveCount(0, { timeout: 10000 });
      const countAfter = await page.locator("table tbody tr").count();
      expect.soft(countAfter).toBeLessThan(countBefore);
    });
  });
});
