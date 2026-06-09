import { test, expect, type Page } from "@playwright/test";
import { loginAs } from "./helpers/auth";

// Capture le parcours complet du builder de formulaires :
// création (avec catégorie personnalisée + questions + drag-and-drop) puis édition.
// Les screenshots atterrissent dans e2e/screenshots/builder-*.png.

const SHOTS = "e2e/screenshots";

async function addQuestion(page: Page) {
  const btn = page.getByRole("button", {
    name: /Ajouter (la première )?une? question|Ajouter la première question/i,
  });
  await btn.first().click();
  await page.waitForTimeout(300);
}

test.describe("Builder de formulaires (admin)", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, "admin");
  });

  test("création : catégorie perso + questions + drag-and-drop", async ({
    page,
  }) => {
    await page.goto("/forms/new");
    await page.waitForLoadState("networkidle");

    // 1. Builder vide
    await page.screenshot({
      path: `${SHOTS}/builder-01-vide.png`,
      fullPage: true,
    });

    // 2. Titre
    await page
      .getByPlaceholder("Titre du formulaire")
      .fill("Questionnaire onboarding 2026");

    // 3. Catégorie personnalisée
    await page.getByRole("button", { name: /Nouvelle/i }).click();
    const catInput = page.getByPlaceholder("Nom de la catégorie");
    await catInput.fill("Onboarding");
    await page.screenshot({
      path: `${SHOTS}/builder-02-nouvelle-categorie.png`,
      fullPage: true,
    });
    await catInput.press("Enter");
    await page.waitForTimeout(600); // POST /api/form-categories

    // 4. Trois questions
    await addQuestion(page);
    await addQuestion(page);
    await addQuestion(page);
    await page.screenshot({
      path: `${SHOTS}/builder-03-trois-questions.png`,
      fullPage: true,
    });

    // 5. Configurer chaque question (panneau de droite)
    const titles = [
      "Comment s'est passée ta première semaine ?",
      "Quels outils dois-tu encore maîtriser ?",
      "Note ton intégration dans l'équipe",
    ];
    const types = ["Texte libre", "Choix multiple", "Note (1-10)"];
    for (let i = 0; i < 3; i++) {
      await page.getByText(new RegExp(`QUESTION 0${i + 1}`)).click();
      await page.getByPlaceholder("Ex : Comment évaluez-vous…").fill(titles[i]);
      // exact:true cible le vrai bouton de type (les cartes question sont aussi
      // des role="button" dont le nom accessible contient le libellé du type).
      await page
        .getByRole("button", { name: types[i], exact: true })
        .click();
      await page.waitForTimeout(200);

      // Une question « Choix multiple » exige au moins 2 options non vides
      // (sinon la validation bloque l'enregistrement). On les ajoute et remplit.
      if (types[i] === "Choix multiple") {
        const optionsField = page
          .locator(".field")
          .filter({ hasText: "Options de choix" });
        const addOption = optionsField.getByRole("button", {
          name: /ajouter une option/i,
        });
        await addOption.click();
        await addOption.click();
        const optionInputs = optionsField.locator("input.input");
        await optionInputs.nth(0).fill("Git & CI/CD");
        await optionInputs.nth(1).fill("Outils internes");
      }
    }
    // Revenir sur la 1re pour montrer le panneau de config peuplé
    await page.getByText(/QUESTION 01/).click();
    await page.screenshot({
      path: `${SHOTS}/builder-04-config-question.png`,
      fullPage: true,
    });

    // 6. Drag-and-drop via le KeyboardSensor de dnd-kit (fiable et déterministe,
    //    contrairement à une simulation souris brute qui laisse le drag en cours
    //    et casse l'enregistrement). On déplace la question 1 d'un cran vers le bas.
    const firstHandle = page
      .getByRole("button", { name: "Déplacer la question" })
      .first();
    await firstHandle.focus();
    await page.keyboard.press("Space"); // saisir l'élément
    await page.waitForTimeout(150);
    await page.keyboard.press("ArrowDown"); // descendre d'une position
    await page.waitForTimeout(150);
    await page.keyboard.press("Space"); // déposer
    await page.waitForTimeout(300);
    await page.screenshot({
      path: `${SHOTS}/builder-05-apres-drag.png`,
      fullPage: true,
    });

    // 7. Enregistrer → redirige vers /forms/:id (édition)
    await page.getByRole("button", { name: /^Enregistrer$/ }).click();
    await page.waitForURL(/\/forms\/[a-f0-9]{24}/, { timeout: 10000 });
    await page.waitForLoadState("networkidle");
    await page.screenshot({
      path: `${SHOTS}/builder-06-edition.png`,
      fullPage: true,
    });

    // Le formulaire est bien créé et réouvert en édition
    await expect(
      page.getByText("Questionnaire onboarding 2026").first(),
    ).toBeVisible();
  });
});
