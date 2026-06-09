import { test, expect, type Page, type APIRequestContext } from "@playwright/test";
import { loginAs } from "./helpers/auth";

// =============================================================================
// Feature « Suivi / PDI » (PDIPage + PDIDetailPage) — accessible depuis le menu
// et fonctionnelle.
//
//   1. Employé : menu « Suivi » → la page PDI s'affiche + le guide (PageGuide).
//   2. Ouvrir un PDI → la page de détail s'affiche.
//
// Le seed e2e fournit déjà un PDI à l'employé lucas. Si aucun n'existe, on en
// sème un via API (HR) ciblant lucas/pierre pour rendre le test déterministe.
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

// Garantit qu'au moins un PDI existe pour lucas (sème via session HR si besoin).
async function ensurePdi(req: APIRequestContext): Promise<void> {
  const ts = Date.now();
  const res = await req.post("/api/pdi", {
    data: {
      employee: LUCAS_ID,
      manager: PIERRE_ID,
      period: { start: "2026-01-01", end: "2026-12-31" },
      notes: `PDI e2e ${ts}`,
    },
  });
  // 201 attendu ; on tolère un échec si la création n'est pas idempotente côté
  // métier (un PDI existe déjà), tant qu'un PDI sera présent pour l'employé.
  expect([200, 201, 400, 409]).toContain(res.status());
}

test.describe("Feature Suivi / PDI — menu + affichage + ouverture", () => {
  test("Employé : menu « Suivi » → page PDI + guide affichés, puis ouverture d'un PDI", async ({
    page,
  }) => {
    const errors = trackErrors(page);

    // Pré-requis : sème un PDI (session HR) pour garantir au moins une carte.
    await loginAs(page, "hr");
    await ensurePdi(page.request);

    // Accès DEPUIS le menu : lien primaire « Suivi » (perspective « Mon espace »).
    await loginAs(page, "employee");
    await page.getByRole("link", { name: "Suivi" }).click();
    await expect(page).toHaveURL(/\/pdi$/);

    // La page s'affiche : titre métier.
    await expect(
      page.getByText("Plans de Développement Individuel"),
    ).toBeVisible();

    // Le guide PageGuide est présent (titre du guide PDI).
    await expect(
      page.getByText("Comment fonctionne le Suivi (PDI) ?"),
    ).toBeVisible();

    // Une carte PDI au moins est listée (lien vers le détail).
    const firstPdiLink = page.locator('a[href^="/pdi/"]').first();
    await expect(firstPdiLink).toBeVisible();

    // Ouvrir le PDI → page de détail.
    await firstPdiLink.click();
    await expect(page).toHaveURL(/\/pdi\/[a-f0-9]{8,}/);
    // La page de détail a chargé sans rester sur la liste (un fil d'Ariane PDI
    // ou un contenu de détail est présent).
    await expect(page.getByText(/PDI|Plan de Développement/i).first()).toBeVisible();

    expect(realErrors(errors)).toEqual([]);
  });
});
