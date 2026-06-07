import { test, expect } from "@playwright/test";
import { loginAs } from "./helpers/auth";

// Vérifie que les actions destructrices migrées passent bien par le
// ConfirmDialog standard (hook useConfirm) — backdrop opaque commun.
// Test NON destructif : on ouvre la confirmation puis on annule.

test("confirmation standardisée — suppression de clé config (useConfirm)", async ({
  page,
}) => {
  await loginAs(page, "admin");
  await page.goto("/admin/config");
  await page.waitForLoadState("networkidle");

  // Bouton « Supprimer <clé> » d'une ligne de configuration.
  const deleteBtn = page.getByRole("button", { name: /^Supprimer / }).first();
  await expect(deleteBtn).toBeVisible();
  await deleteBtn.click();

  // Le ConfirmDialog standard apparaît (même composant que partout).
  await expect(
    page.getByText("Supprimer la clé de configuration ?"),
  ).toBeVisible();
  await page.screenshot({ path: "e2e/screenshots/confirm-standard.png" });

  // Annuler → non destructif, le dialog se ferme.
  await page.getByRole("button", { name: /^Annuler$/ }).click();
  await expect(
    page.getByText("Supprimer la clé de configuration ?"),
  ).not.toBeVisible();
});
