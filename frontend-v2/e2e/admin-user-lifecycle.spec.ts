import { test, expect } from "@playwright/test";
import { loginAs } from "./helpers/auth";

// Valide deux parcours admin de bout en bout, avec captures à chaque étape :
//  • Partie 3 — réassignation de l'équipe au retrait du rôle « manager »
//  • Partie 2 — suppression d'un utilisateur = anonymisation RGPD
//
// Les utilisateurs manipulés sont JETABLES (créés au setup), pour ne pas
// polluer le jeu de démonstration. Captures dans e2e/screenshots/flow-*.png.

const SHOTS = "e2e/screenshots";
const ts = Date.now();

function newId(body: { data?: { id?: string; _id?: string } }): string {
  const id = body.data?.id ?? body.data?._id;
  if (!id)
    throw new Error("Réponse de création sans id : " + JSON.stringify(body));
  return String(id);
}

test.describe.serial("Admin — cycle de vie utilisateur", () => {
  let managerId = "";
  let subId = "";

  test("setup — créer un manager + un subordonné jetables", async ({
    page,
  }) => {
    await loginAs(page, "admin");

    const mRes = await page.request.post("/api/users", {
      data: {
        firstName: "Test",
        lastName: `Manager${ts}`,
        email: `test.manager.${ts}@nxrh.local`,
        role: "manager",
        password: "password123",
      },
    });
    expect(mRes.ok(), `création manager (HTTP ${mRes.status()})`).toBeTruthy();
    managerId = newId(await mRes.json());

    const sRes = await page.request.post("/api/users", {
      data: {
        firstName: "Test",
        lastName: `Sub${ts}`,
        email: `test.sub.${ts}@nxrh.local`,
        role: "employee",
        managerId,
        password: "password123",
      },
    });
    expect(
      sRes.ok(),
      `création subordonné (HTTP ${sRes.status()})`,
    ).toBeTruthy();
    subId = newId(await sRes.json());
  });

  test("partie 3 — réassignation au retrait du rôle manager", async ({
    page,
  }) => {
    await loginAs(page, "admin");
    await page.goto(`/users/${managerId}/edit`);
    await expect(page.locator("#role")).toBeVisible();
    await page.screenshot({
      path: `${SHOTS}/flow-01-edit-manager.png`,
      fullPage: true,
    });

    // Retirer le rôle manager → Collaborateur : le champ « Remplaçant » apparaît.
    await page.locator("#role").selectOption("employee");
    await expect(page.locator("#replacementManagerId")).toBeVisible();
    await page.screenshot({
      path: `${SHOTS}/flow-02-champ-remplacant.png`,
      fullPage: true,
    });

    // Tenter d'enregistrer SANS remplaçant → erreur de validation bloquante.
    await page.getByRole("button", { name: /Enregistrer/i }).click();
    await expect(page.locator(".field-error").first()).toBeVisible();
    await page.screenshot({
      path: `${SHOTS}/flow-03-erreur-validation.png`,
      fullPage: true,
    });

    // Choisir le 1er remplaçant proposé (manager actif du jeu de données).
    await page.locator("#replacementManagerId").selectOption({ index: 1 });
    await page.screenshot({
      path: `${SHOTS}/flow-04-remplacant-choisi.png`,
      fullPage: true,
    });

    // Enregistrer → succès (redirection hors de /edit).
    await page.getByRole("button", { name: /Enregistrer/i }).click();
    await page.waitForURL((u) => !u.pathname.endsWith("/edit"), {
      timeout: 10000,
    });
    await page.screenshot({
      path: `${SHOTS}/flow-05-apres-enregistrement.png`,
      fullPage: true,
    });

    // Vérification en base (API) : le subordonné a changé de manager.
    const sRes = await page.request.get(`/api/users/${subId}`);
    expect(sRes.ok()).toBeTruthy();
    const sBody = await sRes.json();
    const newManagerId = String(sBody.data?.managerId ?? "");
    expect(newManagerId).not.toBe("");
    expect(newManagerId).not.toBe(managerId); // réassigné au remplaçant
  });

  test("partie 2 — suppression RGPD (anonymisation)", async ({ page }) => {
    await loginAs(page, "admin");
    await page.goto(`/users/${subId}`);
    await expect(
      page.getByRole("button", { name: "Plus d'actions" }),
    ).toBeVisible();
    await page.screenshot({
      path: `${SHOTS}/flow-06-fiche-utilisateur.png`,
      fullPage: true,
    });

    // Ouvrir le menu d'actions → l'action « Supprimer (RGPD) » est visible.
    await page.getByRole("button", { name: "Plus d'actions" }).click();
    await expect(
      page.getByRole("button", { name: /Supprimer l'utilisateur \(RGPD\)/i }),
    ).toBeVisible();
    await page.screenshot({
      path: `${SHOTS}/flow-07-menu-actions.png`,
      fullPage: true,
    });

    // Cliquer → boîte de confirmation.
    await page
      .getByRole("button", { name: /Supprimer l'utilisateur \(RGPD\)/i })
      .click();
    await expect(
      page.getByRole("button", { name: /Supprimer définitivement/i }),
    ).toBeVisible();
    // Capture en viewport (pas fullPage) : le backdrop est `fixed` et couvre
    // l'écran visible — une capture fullPage montrerait la zone hors-écran.
    await page.screenshot({ path: `${SHOTS}/flow-08-confirmation.png` });

    // Confirmer → anonymisation + retour à la liste.
    await page
      .getByRole("button", { name: /Supprimer définitivement/i })
      .click();
    await page.waitForURL(/\/users(\?|$)/, { timeout: 10000 });
    await page.waitForLoadState("networkidle");
    // S'assurer que la liste est chargée (plus de spinner ni d'overlay résiduel).
    await expect(
      page.getByRole("heading", { name: /Collaborateurs/i }),
    ).toBeVisible();
    await page.screenshot({
      path: `${SHOTS}/flow-09-apres-suppression.png`,
      fullPage: true,
    });
  });

  test.afterAll(async ({ request }) => {
    // Nettoyage best-effort (les comptes jetables sont désactivés).
    for (const id of [subId, managerId]) {
      if (id) await request.delete(`/api/users/${id}`).catch(() => {});
    }
  });
});
