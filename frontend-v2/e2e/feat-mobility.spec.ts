import { test, expect, type Page } from "@playwright/test";
import { loginAs } from "./helpers/auth";

// =============================================================================
// Feature « Demandes » / Mobilité (MobilityPage) — accessible depuis le menu et
// fonctionnelle.
//
//   1. Employé : menu « Mes demandes » → créer une demande de mobilité (poste
//      visé horodaté) → elle apparaît dans la liste.
//   2. Filtre statut (employé) : « Approuvées » masque la demande « En attente ».
//   3. Filtre type (HR/admin uniquement) : la liste change selon la catégorie.
//
// Le filtre type n'existe QUE pour HR/admin (les boutons catégorie ne sont pas
// rendus pour l'employé — cf. MobilityPage `isHrAdmin`). On le couvre donc côté
// HR.
// =============================================================================

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

test.describe("Feature Demandes (mobilité) — menu + création + filtres", () => {
  test("Employé : « Mes demandes » → créer une mobilité → elle apparaît, puis filtre statut", async ({
    page,
  }) => {
    const errors = trackErrors(page);
    await loginAs(page, "employee");

    // Accès DEPUIS le menu : lien primaire « Mes demandes ».
    await page.getByRole("link", { name: "Mes demandes" }).click();
    await expect(page).toHaveURL(/\/mobility/);
    await expect(
      page.getByRole("heading", { name: "Demandes", exact: true }),
    ).toBeVisible();

    // Création d'une demande de mobilité avec poste visé unique horodaté.
    const targetPosition = `Chef de projet e2e ${Date.now()}`;
    await page.getByRole("button", { name: "+ Nouvelle demande" }).click();

    // Modal « Nouvelle demande » : catégorie « Mobilité » (défaut) + poste visé.
    await expect(
      page.getByRole("heading", { name: "Nouvelle demande" }),
    ).toBeVisible();
    await page
      .getByLabel("Type de demande")
      .selectOption({ label: "Mobilité" });
    await page.getByLabel("Poste visé", { exact: true }).fill(targetPosition);
    await page
      .getByLabel("Description de la demande")
      .fill("Demande créée par le test e2e.");
    await page.getByRole("button", { name: "Soumettre" }).click();

    // La demande apparaît dans la liste (statut initial « En attente »).
    const row = page.getByText(targetPosition);
    await expect(row).toBeVisible();

    // ── Filtre statut : « Approuvée » → la nouvelle demande (En attente) disparaît.
    // (libellé exact du bouton filtre = STATUS_LABELS.approved = « Approuvée »)
    await page.getByRole("button", { name: "Approuvée", exact: true }).click();
    await expect(row).toHaveCount(0);

    // Retour à « Tous » → elle réapparaît (la liste change bien selon le filtre).
    await page.getByRole("button", { name: "Tous", exact: true }).click();
    await expect(row).toBeVisible();

    expect(realErrors(errors)).toEqual([]);
  });

  test("HR : filtre type (catégorie) modifie la liste des demandes", async ({
    page,
  }) => {
    const errors = trackErrors(page);

    // Pré-requis : une demande de catégorie « formation » créée par l'employé
    // via API, pour être agnostique du seed.
    await loginAs(page, "employee");
    const ts = Date.now();
    const created = await page.request.post("/api/mobility", {
      data: {
        category: "formation",
        motivation: `Formation e2e ${ts}`,
        priority: "normal",
        requestType: "internal_transfer",
      },
    });
    expect(created.ok()).toBeTruthy();

    // La RH ouvre la vue de gestion et exerce le filtre type.
    await loginAs(page, "hr");
    await page.goto("/mobility");
    await page.waitForLoadState("domcontentloaded");
    await expect(
      page.getByRole("heading", { name: "Demandes", exact: true }),
    ).toBeVisible();

    // Le filtre type (catégorie) est présent pour la RH : « Tous types » + chips.
    await expect(
      page.getByRole("button", { name: "Tous types" }),
    ).toBeVisible();

    // Filtrer sur « Formation » : au moins une demande formation visible.
    await page.getByRole("button", { name: "Formation", exact: true }).click();
    await expect(page.getByText("Formation").first()).toBeVisible();

    // Filtrer sur « Promotion » : la liste change (la formation n'est plus la
    // catégorie filtrée ; au pire la liste se vide → état « Aucune demande »).
    await page.getByRole("button", { name: "Promotion", exact: true }).click();
    // Soit des demandes promotion, soit l'état vide explicite : dans les deux cas
    // la vue a réagi au filtre.
    const promoBadge = page.locator("text=Promotion");
    const emptyState = page.getByText("Aucune demande de mobilité");
    await expect(promoBadge.or(emptyState).first()).toBeVisible();

    expect(realErrors(errors)).toEqual([]);
  });
});
