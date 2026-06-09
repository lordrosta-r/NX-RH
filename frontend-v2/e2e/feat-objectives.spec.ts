import { test, expect, type Page, type APIRequestContext } from "@playwright/test";
import { loginAs } from "./helpers/auth";

// =============================================================================
// Feature « Objectifs » (ObjectivesPage) — vérifie que la feature MARCHE et est
// ACCESSIBLE depuis le menu.
//
//   1. Manager : menu « Plus » → « Objectifs équipe » → la page affiche les
//      cartes membres/objectifs.
//   2. Employé : voit sa propre carte (badge « Vous ») et peut publier une mise
//      à jour (point clé) sur un objectif → elle apparaît.
//
// Données : on sème via API un entretien avec objectifs N+1 (campagne + form +
// évaluation lucas/pierre, puis PATCH /interviews/state) pour que la feature
// soit exerçable de bout en bout sans dépendre d'un état partagé.
//
// IDs seed e2e (mongo/server/seeds/seed.js) :
//   lucas.bernard (employee) est rattaché à pierre.leclerc (manager).
// =============================================================================

const LUCAS_ID = "6a26b77b70a68b92708869e4"; // employee (seed)
const PIERRE_ID = "6a26b77b70a68b92708869e1"; // manager de lucas (seed)

function trackErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(`console: ${msg.text()}`);
  });
  page.on("pageerror", (err) => errors.push(`pageerror: ${err.message}`));
  return errors;
}
function realErrors(errors: string[]): string[] {
  return errors.filter(
    (e) => !/favicon|ResizeObserver|net::ERR_|Failed to load resource/i.test(e),
  );
}

interface Seeded {
  campaignId: string;
  objectiveText: string;
}

// Sème un entretien (manager pierre / évalué lucas) avec un objectif N+1 unique.
async function seedObjective(req: APIRequestContext): Promise<Seeded> {
  const ts = Date.now();
  const objectiveText = `Objectif e2e ${ts}`;

  const form = await req.post("/api/forms", {
    data: {
      title: `Obj base ${ts}`,
      formType: "self_evaluation",
      questions: [{ id: "q1", type: "text", label: "Vos réussites ?" }],
    },
  });
  expect(form.ok()).toBeTruthy();
  const formBody = await form.json();
  const formId = formBody.id ?? formBody._id;

  const camp = await req.post("/api/campaigns", {
    data: {
      name: `Obj camp ${ts}`,
      formId,
      startDate: "2026-09-01",
      endDate: "2026-12-31",
      status: "active",
    },
  });
  expect(camp.ok()).toBeTruthy();
  const cb = await camp.json();
  const campaignId = cb.data?._id ?? cb.data?.id ?? cb._id ?? cb.id;
  expect(campaignId).toBeTruthy();

  const ev = await req.post("/api/evaluations", {
    data: {
      campaignId,
      formId,
      evaluateeId: LUCAS_ID,
      evaluatorId: PIERRE_ID,
    },
  });
  expect(ev.ok()).toBeTruthy();

  const state = await req.patch("/api/interviews/state", {
    data: {
      campaignId,
      evaluateeId: LUCAS_ID,
      nextYearObjectives: [{ text: objectiveText }],
      objectivesReview: [{ label: `Bilan e2e ${ts}`, status: "achieved" }],
    },
  });
  expect(state.ok()).toBeTruthy();

  return { campaignId, objectiveText };
}

test.describe("Feature Objectifs — accessible depuis le menu et fonctionnelle", () => {
  test("Manager : « Plus » → « Objectifs équipe » affiche les cartes d'objectifs", async ({
    page,
  }) => {
    const errors = trackErrors(page);

    // Pré-requis : sème un objectif via API (session HR pour avoir les droits PATCH state).
    await loginAs(page, "hr");
    const { objectiveText } = await seedObjective(page.request);

    // Connexion manager + accès DEPUIS le menu (pas de goto direct).
    await loginAs(page, "manager");

    await page.getByRole("button", { name: "Plus" }).click();
    await page
      .getByRole("menuitem", { name: /Objectifs équipe/i })
      .click();

    await expect(page).toHaveURL(/\/objectives/);

    // La page s'affiche : au moins une carte membre (heading nom) + l'objectif semé
    // (texte unique → robuste même si plusieurs cartes « Lucas Bernard » existent).
    await expect(
      page.getByRole("heading", { name: "Lucas Bernard" }).first(),
    ).toBeVisible();
    await expect(page.getByText(objectiveText)).toBeVisible();

    expect(realErrors(errors)).toEqual([]);
  });

  test("Employé : voit sa carte (badge « Vous ») et publie une mise à jour", async ({
    page,
  }) => {
    const errors = trackErrors(page);

    // Sème un objectif frais pour cet employé (session HR).
    await loginAs(page, "hr");
    const { objectiveText } = await seedObjective(page.request);

    // L'employé accède à « Objectifs équipe » via le dropdown « Évaluations ».
    await loginAs(page, "employee");

    await page.getByRole("button", { name: "Évaluations" }).click();
    await page
      .getByRole("menuitem", { name: /Objectifs équipe/i })
      .click();

    await expect(page).toHaveURL(/\/objectives/);

    // Sa carte porte le badge « Vous ».
    await expect(page.getByText("Vous", { exact: true }).first()).toBeVisible();

    // Cible la carte de l'objectif semé.
    const objCard = page
      .locator("div", { has: page.getByText(objectiveText) })
      .last();
    await expect(page.getByText(objectiveText)).toBeVisible();

    // Ouvre le formulaire de mise à jour propre à l'évalué propriétaire.
    const note = `Avancement e2e ${Date.now()}`;
    await page
      .getByRole("button", { name: /Ajouter un point clé/i })
      .first()
      .click();
    await page
      .getByPlaceholder("Où en êtes-vous sur cet objectif ?")
      .first()
      .fill(note);
    await page.getByRole("button", { name: "Publier" }).click();

    // La mise à jour apparaît dans la liste des mises à jour de l'objectif.
    await expect(page.getByText(note)).toBeVisible();

    expect(realErrors(errors)).toEqual([]);
    void objCard;
  });
});
