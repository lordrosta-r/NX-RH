import { test, expect } from "@playwright/test";
import { loginAs } from "./helpers/auth";
import {
  waitForPageLoad,
  expectNoErrors,
  expectNotUnauthorized,
  takeScreenshot,
} from "./helpers/utils";

test.describe("Workflow Employé Complet", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, "employee");
    await page.waitForLoadState("networkidle");
  });

  test("Employé - dashboard employé affiché", async ({ page }) => {
    test.setTimeout(60000);
    await page.goto("/");
    await waitForPageLoad(page);
    await expectNoErrors(page);
    await takeScreenshot(page, "employee-dashboard");

    const evaluationWidget = page
      .locator(
        '[data-testid="evaluation-widget"], .evaluation-widget, [class*="evaluation"]',
      )
      .first();
    const welcomeMsg = page.locator("body");
    const hasWidget = await evaluationWidget.isVisible().catch(() => false);
    if (!hasWidget) {
      await expect(welcomeMsg).toContainText(
        /bienvenue|dashboard|tableau de bord|bonjour/i,
      );
    }
  });

  test("Employé - voir son évaluation assignée", async ({ page }) => {
    test.setTimeout(60000);
    await page.goto("/evaluations");
    await waitForPageLoad(page);
    await expectNotUnauthorized(page);

    const rows = page.locator(
      'table tbody tr, [data-testid="evaluation-row"], .evaluation-item, [class*="evaluation-card"]',
    );
    await rows.first().waitFor({ state: "visible", timeout: 15000 });
    const count = await rows.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test("Employé - remplir le formulaire d'évaluation (défini par RH)", async ({
    page,
  }) => {
    test.setTimeout(60000);
    await page.goto("/evaluations");
    await waitForPageLoad(page);

    await test.step("Ouvrir une évaluation en cours", async () => {
      const enCoursLink = page
        .locator("a, button")
        .filter({ hasText: /en cours/i })
        .first();
      const firstRow = page
        .locator(
          'table tbody tr, [data-testid="evaluation-row"], .evaluation-item, [class*="evaluation-card"]',
        )
        .first();

      if (await enCoursLink.isVisible()) {
        await enCoursLink.click();
      } else if (await firstRow.isVisible()) {
        await firstRow.click();
      }
      await waitForPageLoad(page);
    });

    await test.step("Remplir les champs de notation", async () => {
      // Star ratings ou boutons numérotés
      const starFour = page
        .locator(
          '[aria-label*="4"], [data-value="4"], .star:nth-child(4), button:has-text("4")',
        )
        .first();
      if (await starFour.isVisible()) {
        await starFour.click();
      }

      // Inputs numériques (sliders / number inputs)
      const numberInputs = page.locator(
        'input[type="number"], input[type="range"]',
      );
      const numCount = await numberInputs.count();
      for (let i = 0; i < Math.min(numCount, 3); i++) {
        const inp = numberInputs.nth(i);
        if (await inp.isVisible()) {
          await inp.fill("4");
        }
      }
    });

    await test.step("Remplir les champs texte", async () => {
      const textarea = page.locator("textarea").first();
      if (await textarea.isVisible()) {
        await textarea.fill("J'ai atteint mes objectifs cette année");
      }

      // Autres textareas
      const allTextareas = page.locator("textarea");
      const taCount = await allTextareas.count();
      for (let i = 1; i < Math.min(taCount, 4); i++) {
        const ta = allTextareas.nth(i);
        if (await ta.isVisible()) {
          await ta.fill("Bonne progression sur les objectifs définis.");
        }
      }
    });

    await test.step("Enregistrer le brouillon", async () => {
      const saveBtn = page
        .locator("button")
        .filter({ hasText: /enregistrer|sauvegarder|save|brouillon/i })
        .first();
      if (await saveBtn.isVisible()) {
        await saveBtn.click();
        await page.waitForLoadState("networkidle");
      }
    });
  });

  test("Employé - soumettre l'évaluation", async ({ page }) => {
    test.setTimeout(60000);
    await page.goto("/evaluations");
    await waitForPageLoad(page);

    await test.step("Ouvrir évaluation", async () => {
      const enCoursLink = page
        .locator("a, button")
        .filter({ hasText: /en cours/i })
        .first();
      const firstRow = page
        .locator(
          'table tbody tr, [data-testid="evaluation-row"], .evaluation-item, [class*="evaluation-card"]',
        )
        .first();
      if (await enCoursLink.isVisible()) {
        await enCoursLink.click();
      } else if (await firstRow.isVisible()) {
        await firstRow.click();
      }
      await waitForPageLoad(page);
    });

    await test.step("Remplir champs obligatoires si vides", async () => {
      const textarea = page.locator("textarea").first();
      if (await textarea.isVisible()) {
        const val = await textarea.inputValue();
        if (!val) await textarea.fill("Objectifs atteints, bonne année.");
      }
    });

    await test.step("Soumettre", async () => {
      const submitBtn = page
        .locator("button")
        .filter({ hasText: /soumettre|submit|envoyer/i })
        .first();
      if (await submitBtn.isVisible()) {
        await submitBtn.click();

        // Confirmation modale éventuelle
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

    await test.step("Vérifier le statut", async () => {
      const statusEl = page.locator("body");
      await expect
        .soft(statusEl)
        .toContainText(/soumise|en cours de validation|submitted|validat/i);
    });
  });

  test("Employé - voir historique évaluations", async ({ page }) => {
    test.setTimeout(60000);
    await page.goto("/evaluations");
    await waitForPageLoad(page);
    await expectNotUnauthorized(page);

    const rows = page.locator(
      'table tbody tr, [data-testid="evaluation-row"], .evaluation-item, [class*="evaluation-card"]',
    );
    await rows.first().waitFor({ state: "visible", timeout: 15000 });
    const count = await rows.count();
    expect(count).toBeGreaterThanOrEqual(1);

    await takeScreenshot(page, "employee-evaluation-history");
  });

  test("Employé - accepter un événement RDV", async ({ page }) => {
    test.setTimeout(60000);
    await page.goto("/events");
    await waitForPageLoad(page);
    await expectNotUnauthorized(page);

    const eventItem = page
      .locator(
        'table tbody tr, [data-testid="event-row"], .event-item, [class*="event-card"]',
      )
      .first();
    if (await eventItem.isVisible({ timeout: 10000 }).catch(() => false)) {
      await eventItem.click();
      await waitForPageLoad(page);

      const actionBtn = page
        .locator("button")
        .filter({ hasText: /participer|s'inscrire|accepter|rejoindre/i })
        .first();
      if (await actionBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        await actionBtn.click();
        await page.waitForLoadState("networkidle");

        const confirmation = page.locator("body");
        await expect
          .soft(confirmation)
          .toContainText(/inscrit|accepté|confirmé|success|participat/i);
      }
    } else {
      test
        .info()
        .annotations.push({
          type: "UX",
          description: "Aucun événement disponible pour l'employé dans /events",
        });
    }
  });

  test("Employé - créer une demande de mobilité", async ({ page }) => {
    test.setTimeout(60000);
    await page.goto("/mobility");
    await waitForPageLoad(page);
    await expectNotUnauthorized(page);

    const newBtn = page
      .locator("button, a")
      .filter({ hasText: /nouvelle demande|\+ demande|nouveau|créer/i })
      .first();
    if (await newBtn.isVisible({ timeout: 10000 }).catch(() => false)) {
      await newBtn.click();
      await waitForPageLoad(page);

      await test.step("Remplir le formulaire de mobilité", async () => {
        const typeSelect = page.locator("select").first();
        if (await typeSelect.isVisible()) {
          const options = await typeSelect.locator("option").allTextContents();
          const lateral = options.find((o) => /latéral|lateral/i.test(o));
          await typeSelect.selectOption(lateral ?? options[1] ?? { index: 1 });
        }

        const motifField = page
          .locator(
            'textarea, input[name*="motif"], input[name*="description"], input[placeholder*="motif"], input[placeholder*="description"]',
          )
          .first();
        if (await motifField.isVisible()) {
          await motifField.fill(
            "Souhait d'évolution vers un poste similaire dans une autre équipe.",
          );
        }

        const submitBtn = page
          .locator('button[type="submit"], button')
          .filter({ hasText: /soumettre|envoyer|créer|valider/i })
          .first();
        if (await submitBtn.isVisible()) {
          await submitBtn.click();
          await page.waitForLoadState("networkidle");
        }
      });

      const list = page.locator(
        'table tbody tr, .mobility-item, [data-testid="mobility-row"], [class*="mobility-card"]',
      );
      await expect.soft(list.first()).toBeVisible({ timeout: 10000 });
    } else {
      test
        .info()
        .annotations.push({
          type: "UX",
          description: "Bouton nouvelle demande de mobilité non trouvé",
        });
    }
  });

  test("Employé - consulter son PDI", async ({ page }) => {
    test.setTimeout(60000);
    await page.goto("/pdi");
    await waitForPageLoad(page);
    await expectNotUnauthorized(page);

    const objectiveEl = page
      .locator(
        '[data-testid="pdi-objective"], .pdi-item, [class*="objective"], [class*="pdi"]',
      )
      .first();
    await expect.soft(objectiveEl).toBeVisible({ timeout: 15000 });
    await takeScreenshot(page, "employee-pdi");
  });

  test("Employé - notifications - marquer tout comme lu", async ({ page }) => {
    test.setTimeout(60000);
    await page.goto("/");
    await waitForPageLoad(page);

    const bellBtn = page
      .locator(
        '[data-testid="notification-bell"], [aria-label*="notification"], button[class*="bell"], button[class*="notif"]',
      )
      .first();
    if (await bellBtn.isVisible({ timeout: 10000 }).catch(() => false)) {
      const badgeBefore = page
        .locator(
          '[data-testid="notification-badge"], .notification-badge, [class*="badge"]',
        )
        .first();
      const hadBadge = await badgeBefore.isVisible().catch(() => false);

      await bellBtn.click();
      await page.waitForTimeout(500);

      const markAllBtn = page
        .locator("button, a")
        .filter({ hasText: /tout marquer comme lu|mark all|tout lire/i })
        .first();
      if (await markAllBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        await markAllBtn.click();
        await page.waitForLoadState("networkidle");

        if (hadBadge) {
          await expect.soft(badgeBefore).not.toBeVisible({ timeout: 5000 });
        }
      }
    } else {
      test
        .info()
        .annotations.push({
          type: "UX",
          description:
            "Icône de cloche de notifications non trouvée dans le header",
        });
    }
  });

  test("Employé - modifier son profil", async ({ page }) => {
    test.setTimeout(60000);
    await page.goto("/profile");
    await waitForPageLoad(page);
    await expectNotUnauthorized(page);

    await test.step("Modifier un champ", async () => {
      const phoneField = page
        .locator(
          'input[name*="phone"], input[placeholder*="téléphone"], input[placeholder*="phone"], input[type="tel"]',
        )
        .first();
      if (await phoneField.isVisible({ timeout: 5000 }).catch(() => false)) {
        await phoneField.fill("+33 6 12 34 56 78");
      } else {
        const firstTextField = page.locator('input[type="text"]').first();
        if (await firstTextField.isVisible()) {
          const current = await firstTextField.inputValue();
          await firstTextField.fill(current || "Lucas Bernard");
        }
      }
    });

    await test.step("Sauvegarder", async () => {
      const saveBtn = page
        .locator('button[type="submit"], button')
        .filter({
          hasText: /enregistrer|sauvegarder|save|mettre à jour|modifier/i,
        })
        .first();
      if (await saveBtn.isVisible()) {
        await saveBtn.click();
        await page.waitForLoadState("networkidle");

        const toast = page
          .locator(
            '[data-testid="toast"], .toast, [class*="toast"], [role="status"], [role="alert"]',
          )
          .first();
        await expect.soft(toast).toBeVisible({ timeout: 8000 });
      }
    });
  });

  test("Employé - contrôles accès: admin interdit", async ({ page }) => {
    test.setTimeout(60000);
    await page.goto("/admin");
    await waitForPageLoad(page);

    const url = page.url();
    const body = page.locator("body");
    expect
      .soft(
        /login|unauthorized|403/.test(url) ||
          (await body
            .getByText(/accès refusé|unauthorized|non autorisé|403/i)
            .isVisible()
            .catch(() => false)),
      )
      .toBeTruthy();
  });

  test("Employé - contrôles accès: users interdit", async ({ page }) => {
    test.setTimeout(60000);
    await page.goto("/users");
    await waitForPageLoad(page);

    const url = page.url();
    const body = page.locator("body");
    expect
      .soft(
        /login|unauthorized|403/.test(url) ||
          (await body
            .getByText(/accès refusé|unauthorized|non autorisé|403/i)
            .isVisible()
            .catch(() => false)),
      )
      .toBeTruthy();
  });
});
