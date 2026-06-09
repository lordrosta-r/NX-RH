import { test, expect, type Page, type APIRequestContext } from "@playwright/test";
import { loginAs } from "./helpers/auth";

// =============================================================================
// Features Profil + Notifications — accessibles depuis le menu et fonctionnelles.
//
//   1. Profil : menu avatar → « Mon profil » → éditer un champ (Prénom) →
//      « Sauvegarder » → la valeur est persistée. On restaure le prénom d'origine
//      pour ne pas polluer le seed partagé.
//   2. Notifications : cloche → « Voir tout » → « Tout marquer comme lu »
//      fonctionne (le bouton disparaît, plus de non-lues).
//
// Pré-requis notifications : on génère une notification PERSONNELLE pour
// l'employé (lucas) via la création d'une évaluation côté HR — action métier
// scopée (notifie uniquement l'évalué), pas un broadcast.
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

// Génère une notification in-app personnelle pour lucas (eval_assigned) via une
// création d'évaluation côté HR. Action scopée à l'évalué, pas de broadcast.
async function notifyEmployee(req: APIRequestContext): Promise<void> {
  const ts = Date.now();
  const form = await req.post("/api/forms", {
    data: {
      title: `Notif base ${ts}`,
      formType: "self_evaluation",
      questions: [{ id: "q1", type: "text", label: "x" }],
    },
  });
  expect(form.ok()).toBeTruthy();
  const formId = (await form.json()).id ?? (await form.json())._id;

  const camp = await req.post("/api/campaigns", {
    data: {
      name: `Notif camp ${ts}`,
      formId,
      startDate: "2026-09-01",
      endDate: "2026-12-31",
      status: "active",
    },
  });
  expect(camp.ok()).toBeTruthy();
  const cb = await camp.json();
  const campaignId = cb.data?._id ?? cb.data?.id ?? cb._id ?? cb.id;

  const ev = await req.post("/api/evaluations", {
    data: { campaignId, formId, evaluateeId: LUCAS_ID, evaluatorId: PIERRE_ID },
  });
  expect(ev.ok()).toBeTruthy();
}

test.describe("Features Profil + Notifications — menu + actions", () => {
  test("Profil : menu avatar → éditer le prénom → sauvegarde OK (puis restauration)", async ({
    page,
  }) => {
    const errors = trackErrors(page);
    await loginAs(page, "employee");

    // Accès DEPUIS le menu : ouvre le menu avatar puis « Mon profil ».
    await page.getByTestId("user-menu-button").click();
    await page.getByRole("menuitem", { name: "Mon profil" }).click();
    await expect(page).toHaveURL(/\/profile/);

    // Passe en édition (bouton « Modifier » exact — distinct de « Modifier l'avatar »).
    await page.getByRole("button", { name: "Modifier", exact: true }).click();
    const firstNameInput = page.locator("#profile-firstname");
    await expect(firstNameInput).toBeVisible();

    // Lit le prénom courant (depuis le champ) pour pouvoir le restaurer ensuite.
    const originalFirstName = (await firstNameInput.inputValue()).trim() || "Lucas";

    // Modifie le prénom (valeur horodatée unique) puis sauvegarde.
    const edited = `Lucas${Date.now().toString().slice(-5)}`;
    await firstNameInput.fill(edited);
    await page.getByRole("button", { name: "Sauvegarder" }).click();

    // Après sauvegarde : sortie du mode édition + valeur persistée affichée.
    await expect(page.locator("#profile-firstname")).toHaveCount(0);
    await expect(page.getByText(edited, { exact: true }).first()).toBeVisible();

    // ── Restauration du prénom d'origine (ne pas polluer le seed partagé) ──────
    await page.getByRole("button", { name: "Modifier", exact: true }).click();
    const restoreInput = page.locator("#profile-firstname");
    await expect(restoreInput).toBeVisible();
    await restoreInput.fill(originalFirstName);
    await page.getByRole("button", { name: "Sauvegarder" }).click();
    await expect(page.locator("#profile-firstname")).toHaveCount(0);
    await expect(
      page.getByText(originalFirstName, { exact: true }).first(),
    ).toBeVisible();

    expect(realErrors(errors)).toEqual([]);
  });

  test("Notifications : cloche → « Voir tout » → « Tout marquer comme lu » fonctionne", async ({
    page,
  }) => {
    const errors = trackErrors(page);

    // Pré-requis : génère une notification non lue pour lucas (action HR scopée).
    await loginAs(page, "hr");
    await notifyEmployee(page.request);

    await loginAs(page, "employee");

    // Ouvre la cloche de notifications (badge de non-lues présent).
    await page
      .getByRole("button", { name: /^Notifications/ })
      .click();

    // Navigue vers la page complète via « Voir tout ».
    await page.getByRole("button", { name: "Voir tout" }).click();
    await expect(page).toHaveURL(/\/notifications/);
    await expect(
      page.getByRole("heading", { name: "Notifications" }),
    ).toBeVisible();

    // Le bouton « Tout marquer comme lu » est présent (il existe car non-lues > 0).
    const markAll = page.getByRole("button", { name: "Tout marquer comme lu" });
    await expect(markAll).toBeVisible();
    await markAll.click();

    // Après l'action : plus de non-lues → le bouton « Tout marquer comme lu »
    // disparaît (le compteur de non-lues de la page tombe à 0).
    await expect(markAll).toHaveCount(0);

    // Recharger la page confirme la persistance : toujours aucune non-lue
    // (le bouton ne réapparaît pas).
    await page.reload();
    await page.waitForLoadState("domcontentloaded");
    await expect(
      page.getByRole("heading", { name: "Notifications" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Tout marquer comme lu" }),
    ).toHaveCount(0);

    expect(realErrors(errors)).toEqual([]);
  });
});
