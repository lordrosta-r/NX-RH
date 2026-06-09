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
      'a[href*="/evaluations/"], [data-testid="evaluation-row"], .tbl-row',
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
          'a[href*="/evaluations/"], [data-testid="evaluation-row"], .tbl-row',
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
          'a[href*="/evaluations/"], [data-testid="evaluation-row"], .tbl-row',
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
      'a[href*="/evaluations/"], [data-testid="evaluation-row"], .tbl-row',
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
        // Catégorie "augmentation" → seule la description est requise (pas de poste visé)
        const typeSelect = page.getByLabel(/type de demande/i).first();
        if (await typeSelect.isVisible()) {
          await typeSelect.selectOption("augmentation").catch(async () => {
            await typeSelect.selectOption({ index: 2 });
          });
        }

        const motifField = page.getByLabel(/description de la demande/i).first();
        if (await motifField.isVisible()) {
          await motifField.fill(
            "Souhait d'évolution salariale au regard des résultats de l'année.",
          );
        }

        const submitBtn = page
          .getByRole("button", { name: /soumettre|envoyer|créer|valider/i })
          .first();
        if (await submitBtn.isVisible()) {
          await submitBtn.click();
          await page.waitForLoadState("networkidle");
        }
      });

      // La liste rend des lignes de tableau (div.tbl-row), pas une <table>
      const list = page.locator('.tbl-row, [data-testid="mobility-row"]');
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

    // Les PDI sont rendus comme des cartes-liens vers /pdi/:id (a.tile.tile-link)
    const objectiveEl = page.locator('a[href*="/pdi/"]').first();
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

    // Le profil est en lecture seule jusqu'au clic sur "Modifier".
    // Seuls prénom/nom sont éditables (#profile-firstname / #profile-lastname).
    await test.step("Passer en mode édition et modifier le prénom", async () => {
      await page
        .getByRole("button", { name: /^modifier$/i })
        .first()
        .click();

      const firstNameInput = page.locator("#profile-firstname");
      await firstNameInput.waitFor({ state: "visible", timeout: 5000 });
      const current = await firstNameInput.inputValue();
      await firstNameInput.fill(current || "Lucas");
    });

    await test.step("Sauvegarder", async () => {
      const saveBtn = page.getByRole("button", {
        name: /sauvegarder|enregistrer/i,
      });
      await saveBtn.click();
      await page.waitForLoadState("networkidle");

      // Pas de toast sur cette mutation : le succès se traduit par la sortie
      // du mode édition (le bouton "Modifier" réapparaît).
      await expect(
        page.getByRole("button", { name: /^modifier$/i }).first(),
      ).toBeVisible({ timeout: 8000 });
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
