import { test, expect, type Page } from "@playwright/test";
import { loginAs } from "./helpers/auth";

// =============================================================================
// Collecte des formulaires des managers (feature #6)
//
// Parcours complet, tel qu'un humain le ferait, en vérifiant que la feature est
// EXPLIQUÉE (titre + description visibles), ACCESSIBLE (onglet/lien atteignables),
// INTUITIVE (un seul écran, libellés clairs) et SANS ERREUR (console + UI).
//
//   1. RH crée une campagne brouillon et demande un formulaire à un manager.
//   2. Le manager voit la demande sur « À traiter » et soumet un de ses formulaires.
//   3. RH retient le formulaire soumis → il rejoint la campagne.
//
// Pré-requis : stack Docker up + seed e2e (@nxrh.local). Voir e2e/global-setup.ts.
// =============================================================================

// Collecte les erreurs console/page pour prouver « pas d'erreur ».
function trackErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(`console: ${msg.text()}`);
  });
  page.on("pageerror", (err) => errors.push(`pageerror: ${err.message}`));
  return errors;
}

// Bruits réseau bénins à ignorer (favicon, 401 de polling déconnecté, etc.).
function realErrors(errors: string[]): string[] {
  return errors.filter(
    (e) =>
      !/favicon|ResizeObserver|net::ERR_|Failed to load resource/i.test(e),
  );
}

test.describe.serial("Collecte des formulaires des managers", () => {
  let campaignId = "";
  let managerId = "";
  let managerFormId = "";

  test("préparation des données via API (RH + manager)", async ({ browser }) => {
    // ── RH : un formulaire de base + une campagne brouillon ───────────────────
    const hr = await browser.newPage();
    await loginAs(hr, "hr");

    const baseForm = await hr.request.post("/api/forms", {
      data: {
        title: `Auto-éval base ${Date.now()}`,
        formType: "self_evaluation",
        questions: [{ id: "q1", type: "text", label: "Vos réussites ?" }],
      },
    });
    expect(baseForm.ok()).toBeTruthy();
    const baseFormId = (await baseForm.json()).id ?? (await baseForm.json())._id;

    const camp = await hr.request.post("/api/campaigns", {
      data: {
        name: `Campagne collecte ${Date.now()}`,
        formId: baseFormId,
        startDate: "2026-09-01",
        endDate: "2026-12-31",
        status: "draft",
      },
    });
    expect(camp.ok()).toBeTruthy();
    const campBody = await camp.json();
    campaignId = campBody.data?._id ?? campBody.data?.id ?? campBody._id ?? campBody.id;
    expect(campaignId).toBeTruthy();
    await hr.close();

    // ── Manager : son propre formulaire (réutilisable d'une année sur l'autre) ─
    const mgr = await browser.newPage();
    await loginAs(mgr, "manager");

    const me = await mgr.request.get("/api/auth/me");
    const meBody = await me.json();
    managerId = (meBody.data ?? meBody)._id ?? (meBody.data ?? meBody).id;
    expect(managerId).toBeTruthy();

    const mgrForm = await mgr.request.post("/api/forms", {
      data: {
        title: `Formulaire de l'équipe ${Date.now()}`,
        formType: "objectives",
        questions: [{ id: "o1", type: "text", label: "Objectif principal" }],
      },
    });
    expect(mgrForm.ok()).toBeTruthy();
    const mgrFormBody = await mgrForm.json();
    managerFormId = mgrFormBody.id ?? mgrFormBody._id;
    expect(managerFormId).toBeTruthy();
    await mgr.close();
  });

  test("RH : la collecte est expliquée, accessible et permet de demander", async ({
    page,
  }) => {
    const errors = trackErrors(page);
    await loginAs(page, "hr");

    await page.goto(`/campaigns/${campaignId}`);
    await page.waitForLoadState("domcontentloaded");

    // Accessible : l'onglet « Formulaires » est atteignable et ouvre la collecte.
    await page.getByRole("button", { name: "Formulaires" }).click();
    const panel = page.getByTestId("form-collection");
    await expect(panel).toBeVisible();

    // Expliqué : titre + description présents (pas juste des boutons nus).
    await expect(
      panel.getByText("Collecte des formulaires des managers"),
    ).toBeVisible();
    await expect(
      panel.getByText(/Demandez aux managers de soumettre un formulaire/i),
    ).toBeVisible();

    // Intuitif : on coche un manager et on demande en un clic.
    await page.getByTestId(`fc-manager-${managerId}`).check();
    await page.getByTestId("fc-request-btn").click();

    // La demande apparaît, statut « En attente ».
    const row = page.getByTestId(`fc-request-row-${managerId}`);
    await expect(row).toBeVisible();
    await expect(row.getByText("En attente")).toBeVisible();

    expect(realErrors(errors)).toEqual([]);
  });

  test("Manager : la demande est visible sur « À traiter » et soumissible", async ({
    page,
  }) => {
    const errors = trackErrors(page);
    await loginAs(page, "manager");

    await page.goto("/manager/todo");
    await page.waitForLoadState("domcontentloaded");

    // Accessible + expliqué : la carte est présente avec son intitulé et sa consigne.
    const card = page.getByTestId("manager-form-requests");
    await expect(card).toBeVisible();
    await expect(
      card.getByText("Formulaires demandés par la RH"),
    ).toBeVisible();

    // Intuitif : choisir un de ses formulaires + soumettre.
    await page
      .getByTestId(`mfr-select-${campaignId}`)
      .selectOption(managerFormId);
    await page.getByTestId(`mfr-submit-${campaignId}`).click();

    // Après soumission : en attente de validation RH.
    await expect(card.getByText("En attente de validation RH")).toBeVisible();

    expect(realErrors(errors)).toEqual([]);
  });

  test("RH : retenir le formulaire soumis le fait rejoindre la campagne", async ({
    page,
  }) => {
    const errors = trackErrors(page);
    await loginAs(page, "hr");

    await page.goto(`/campaigns/${campaignId}`);
    await page.getByRole("button", { name: "Formulaires" }).click();

    const row = page.getByTestId(`fc-request-row-${managerId}`);
    await expect(row).toBeVisible();
    await expect(row.getByText("Soumis")).toBeVisible();

    // Intuitif : un bouton « Retenir » explicite.
    await row.getByTestId("fc-accept").click();
    await expect(row.getByText("Retenu")).toBeVisible();

    // Le formulaire du manager apparaît désormais dans la liste des formulaires liés.
    await expect(
      page.getByText(/Formulaire de l'équipe/i).first(),
    ).toBeVisible();

    expect(realErrors(errors)).toEqual([]);
  });
});
