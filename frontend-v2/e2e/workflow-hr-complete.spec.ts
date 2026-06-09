import { test, expect } from "@playwright/test";
import { loginAs } from "./helpers/auth";
import {
  waitForPageLoad,
  expectNoErrors,
  expectNotUnauthorized,
  takeScreenshot,
} from "./helpers/utils";

test.describe("RH - Workflow Complet", () => {
  test.setTimeout(60000);

  test.beforeEach(async ({ page }) => {
    await loginAs(page, "hr");
    await page.waitForLoadState("networkidle");
  });

  test.afterEach(async ({ page }, testInfo) => {
    if (testInfo.status !== testInfo.expectedStatus) {
      await takeScreenshot(
        page,
        `fail-hr-${testInfo.title.replace(/[^\w]/g, "_").slice(0, 50)}`,
      );
    }
  });

  test("HR - dashboard spécifique RH affiché", async ({ page }) => {
    await page.goto("/");
    await waitForPageLoad(page);
    await expectNoErrors(page);
    await takeScreenshot(page, "hr-dashboard");
  });

  test("HR - liste des évaluations accessible", async ({ page }) => {
    await page.goto("/evaluations");
    await waitForPageLoad(page);
    await expectNotUnauthorized(page);
    await expectNoErrors(page);

    // La liste RH rend une grille (Tile + .tbl-head/.tbl-row), pas une <table>.
    const listContent = page.locator(".tbl-head, .tbl-row").first();
    await expect(listContent).toBeVisible({ timeout: 15000 });
  });

  test("HR - bulk sign_hr sur évaluations soumises", async ({ page }) => {
    await page.goto("/evaluations");
    await waitForPageLoad(page);
    await expectNotUnauthorized(page);

    // Sélectionner une ligne précise (case "Sélectionner cette évaluation" /
    // "Select this evaluation"), ce qui révèle les actions bulk dans le PageHead.
    const rowCheckbox = page
      .getByRole("checkbox", {
        name: /sélectionner cette évaluation|select this evaluation/i,
      })
      .first();
    const checkboxCount = await page
      .locator('input[type="checkbox"]')
      .count();

    if (await rowCheckbox.isVisible({ timeout: 10000 }).catch(() => false)) {
      await rowCheckbox.check();

      const signBtn = page.getByRole("button", {
        name: /signer rh|sign hr/i,
      });
      if (await signBtn.isVisible()) {
        await signBtn.click();

        // Modale de confirmation bulk → bouton "Confirmer" / "Confirm"
        const confirmBtn = page
          .getByRole("button", { name: /^confirmer$|^confirm$/i })
          .first();
        await confirmBtn.waitFor({ state: "visible", timeout: 5000 });
        await confirmBtn.click();
        await page.waitForLoadState("networkidle");

        // Toast de succès "… signée(s) RH" / "… signed by HR".
        // Scoper au toast (role=alert) : sinon /signé/ matche l'option cachée "Assignée".
        const successMsg = page
          .locator('[role="alert"]')
          .filter({ hasText: /sign|succ/i })
          .first();
        await expect(successMsg).toBeVisible({ timeout: 15000 });
      } else {
        test.info().annotations.push({
          type: "UX",
          description:
            "Bouton Signer RH (bulk) introuvable après sélection de cases à cocher",
        });
      }
    } else if (checkboxCount === 0) {
      test.info().annotations.push({
        type: "UX",
        description:
          "Aucune case à cocher trouvée pour les actions bulk sur /evaluations",
      });
    }
  });

  test("HR - créer une demande d'offboarding", async ({ page }) => {
    await page.goto("/offboarding");
    await waitForPageLoad(page);
    await expectNotUnauthorized(page);

    const newRequestBtn = page.getByRole("button", {
      name: /nouvelle demande|new request|\+ offboarding|ajouter/i,
    });

    if (await newRequestBtn.isVisible()) {
      await newRequestBtn.click();
      await page.waitForLoadState("networkidle");

      // Employee field (select or autocomplete)
      const employeeField = page
        .locator(
          'input[name*="employee" i], input[name*="employé" i], select[name*="employee" i], [data-testid*="employee"]',
        )
        .first();
      if (await employeeField.isVisible()) {
        const tagName = await employeeField.evaluate((el) =>
          el.tagName.toLowerCase(),
        );
        if (tagName === "select") {
          const opts = await employeeField.locator("option").allInnerTexts();
          if (opts.length > 1) {
            await employeeField.selectOption({ index: 1 });
          }
        } else {
          await employeeField.fill("Lucas");
          await page.waitForTimeout(500);
          const suggestion = page
            .locator('[class*="suggestion" i], [role="option"]')
            .first();
          if (await suggestion.isVisible()) {
            await suggestion.click();
          }
        }
      }

      // Reason field
      const reasonField = page
        .locator(
          'select[name*="reason" i], select[name*="raison" i], select[name*="motif" i]',
        )
        .first();
      if (await reasonField.isVisible()) {
        const opts = await reasonField.locator("option").allTextContents();
        const resignOpt = opts.find((o) =>
          /résignation|démission|resignation/i.test(o),
        );
        if (resignOpt) {
          await reasonField.selectOption({ label: resignOpt });
        } else if (opts.length > 1) {
          await reasonField.selectOption({ index: 1 });
        }
      }

      // Last day: 30 days from now
      const lastDayField = page.locator('input[type="date"]').first();
      if (await lastDayField.isVisible()) {
        const lastDay = new Date();
        lastDay.setDate(lastDay.getDate() + 30);
        await lastDayField.fill(lastDay.toISOString().split("T")[0]);
      }

      const submitBtn = page.getByRole("button", {
        name: /soumettre|submit|créer|save|enregistrer/i,
      });
      if (await submitBtn.isVisible()) {
        await submitBtn.click();
        await page.waitForLoadState("networkidle");

        const newEntry = page
          .locator('[class*="offboarding" i], table tr, [role="listitem"]')
          .first();
        await expect(newEntry).toBeVisible({ timeout: 15000 });
      }
    } else {
      test.info().annotations.push({
        type: "UX",
        description: "Bouton Nouvelle demande introuvable sur /offboarding",
      });
    }
  });

  test("HR - créer un signalement (flag)", async ({ page }) => {
    await page.goto("/hr/flags");
    await waitForPageLoad(page);
    await expectNotUnauthorized(page);

    const newFlagBtn = page.getByRole("button", {
      name: /nouveau signalement|new flag|\+|ajouter/i,
    });

    if (await newFlagBtn.isVisible()) {
      await newFlagBtn.click();
      await page.waitForLoadState("networkidle");

      const typeField = page
        .locator(
          'select[name*="type" i], input[name*="type" i], [data-testid*="type"]',
        )
        .first();
      if (await typeField.isVisible()) {
        const tagName = await typeField.evaluate((el) =>
          el.tagName.toLowerCase(),
        );
        if (tagName === "select") {
          const opts = await typeField.locator("option").allTextContents();
          if (opts.length > 1) {
            await typeField.selectOption({ index: 1 });
          }
        } else {
          await typeField.fill("Performance");
        }
      }

      const descField = page
        .locator(
          'textarea[name*="description" i], textarea[name*="desc" i], textarea',
        )
        .first();
      if (await descField.isVisible()) {
        await descField.fill("Signalement créé par test E2E automatisé");
      }

      const submitBtn = page.getByRole("button", {
        name: /soumettre|submit|créer|save|enregistrer/i,
      });
      if (await submitBtn.isVisible()) {
        await submitBtn.click();
        await page.waitForLoadState("networkidle");

        const flagItem = page
          .locator('[class*="flag" i], table tr, [role="listitem"]')
          .first();
        await expect(flagItem).toBeVisible({ timeout: 15000 });
      }
    } else {
      test.info().annotations.push({
        type: "UX",
        description: "Bouton Nouveau signalement introuvable sur /hr/flags",
      });
    }
  });

  test("HR - accès campagnes", async ({ page }) => {
    await page.goto("/campaigns");
    await waitForPageLoad(page);
    await expectNotUnauthorized(page);
    await expectNoErrors(page);
  });

  test("HR - accès admin autorisé (RBAC: admin+hr)", async ({ page }) => {
    // Le hub /admin est ouvert aux rôles admin ET hr (cf. router AuthGuard
    // roles={["admin","hr"]}). La RH n'est donc PAS bloquée — elle voit le hub.
    await page.goto("/admin");
    await page.waitForLoadState("networkidle");

    expect(page.url()).toContain("/admin");
    await expectNotUnauthorized(page);
    await expect(
      page.getByText(/administration|configuration/i).first(),
    ).toBeVisible({ timeout: 15000 });
  });
});
