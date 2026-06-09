import { test, expect } from "@playwright/test";
import { loginAs } from "./helpers/auth";
import {
  createDisposableUser,
  deleteDisposableUsers,
  type DisposableUser,
} from "./helpers/users";
import {
  waitForPageLoad,
  waitForDownload,
  takeScreenshot,
} from "./helpers/utils";

// L'UI rend des "tableaux" en grille CSS (div.tbl-head / div.tbl-row), pas de
// <table>/<thead>/<tbody>. Les sélecteurs ci-dessous sont alignés sur ce DOM.

test.describe("Bulk Actions - Users", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, "admin");
    await page.waitForLoadState("networkidle");
    await page.goto("/users");
    await waitForPageLoad(page);
  });

  test("checkbox select-all sélectionne tous les users", async ({ page }) => {
    test.setTimeout(60000);

    // Checkbox "tout sélectionner" dans l'en-tête du tableau (aria-label).
    const selectAllCheckbox = page.getByLabel("Tout sélectionner").first();
    await selectAllCheckbox.waitFor({ state: "visible", timeout: 15000 });
    await selectAllCheckbox.check();
    await page.waitForTimeout(300);

    // Toutes les lignes sont cochées.
    const rowCheckboxes = page.locator(
      '[data-testid="users-table"] .tbl-row input[type="checkbox"]',
    );
    const total = await rowCheckboxes.count();
    const checked = await page
      .locator(
        '[data-testid="users-table"] .tbl-row input[type="checkbox"]:checked',
      )
      .count();
    expect.soft(checked).toBeGreaterThan(1);
    expect.soft(checked).toBe(total);

    // La barre d'actions groupées (div fixe) affiche le compteur de sélection
    // et les boutons Désactiver / Exporter CSV.
    await expect(page.getByText(/sélectionné\(s\)/i)).toBeVisible();
    await expect(
      page.getByRole("button", { name: /^désactiver$/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /exporter csv/i }),
    ).toBeVisible();

    await takeScreenshot(page, "bulk-users-select-all");
  });

  test("barre d'actions bulk apparaît lors d'une sélection", async ({
    page,
  }) => {
    test.setTimeout(60000);

    // Sélectionner un user (première ligne).
    const firstRowCheckbox = page
      .locator('[data-testid="users-table"] .tbl-row input[type="checkbox"]')
      .first();
    await firstRowCheckbox.waitFor({ state: "visible", timeout: 15000 });
    await firstRowCheckbox.check();
    await page.waitForTimeout(300);

    // La barre d'actions groupées apparaît avec ses boutons.
    await expect(page.getByText(/sélectionné\(s\)/i)).toBeVisible({
      timeout: 10000,
    });
    await expect(
      page.getByRole("button", { name: /^désactiver$/i }),
    ).toBeVisible();

    await takeScreenshot(page, "bulk-users-bar-visible");
  });

  test("bulk deactivate - désactiver users sélectionnés", async ({ page }) => {
    test.setTimeout(60000);

    // Isolation #116 : on désactive UNIQUEMENT des comptes JETABLES créés à la
    // volée, jamais les comptes seed partagés. On filtre la liste par leur tag
    // d'email unique avant de cocher → seules ces lignes sont sélectionnées.
    const tag = `bulkdeact${Date.now()}`;
    const disposables: DisposableUser[] = [];

    await test.step("Créer 2 users jetables via API", async () => {
      disposables.push(
        await createDisposableUser(page.request, {
          tag,
          lastName: `Zz${tag}A`,
        }),
      );
      disposables.push(
        await createDisposableUser(page.request, {
          tag,
          lastName: `Zz${tag}B`,
        }),
      );
    });

    try {
      await test.step("Filtrer la liste sur les jetables et les sélectionner", async () => {
        // Recherche sur le tag commun (présent dans email + nom) → la liste ne
        // contient plus que nos comptes jetables.
        const search = page.getByTestId("users-search");
        await search.fill(tag);
        // Debounce 400ms côté hook ; on attend la requête réseau et le rendu.
        await page.waitForLoadState("networkidle");
        await page.waitForTimeout(600);

        const rows = page.locator('[data-testid="users-table"] .tbl-row');
        await expect(rows.first()).toBeVisible({ timeout: 15000 });
        const rowCount = await rows.count();
        expect(rowCount).toBeGreaterThanOrEqual(disposables.length);

        // Cocher toutes les lignes filtrées (toutes jetables).
        const selectAll = page.getByLabel("Tout sélectionner").first();
        await selectAll.check();
        await page.waitForTimeout(200);
      });

      await test.step("Cliquer sur Désactiver", async () => {
        const deactivateBtn = page
          .getByRole("button", { name: /^désactiver$/i })
          .first();
        await deactivateBtn.waitFor({ state: "visible", timeout: 10000 });
        await deactivateBtn.click();

        // La désactivation groupée est immédiate (pas de modal de confirmation).
        await page.waitForLoadState("networkidle");
      });

      await test.step("Vérifier statut inactif (API, sur les jetables)", async () => {
        // Vérification ciblée : les comptes jetables sont bien désactivés.
        for (const u of disposables) {
          const res = await page.request.get(`/api/users/${u.id}`);
          expect(res.ok()).toBeTruthy();
          const body = (await res.json()) as {
            data?: { isActive?: boolean };
          };
          expect.soft(body.data?.isActive, `${u.email} inactif`).toBe(false);
        }
      });

      await takeScreenshot(page, "bulk-users-deactivated");
    } finally {
      await deleteDisposableUsers(
        page.request,
        disposables.map((u) => u.id),
      );
    }
  });

  test("bulk export CSV users", async ({ page }) => {
    test.setTimeout(60000);

    await test.step("Sélectionner tous les users", async () => {
      const selectAllCheckbox = page.getByLabel("Tout sélectionner").first();
      await selectAllCheckbox.waitFor({ state: "visible", timeout: 15000 });
      await selectAllCheckbox.check();
      await page.waitForTimeout(300);
    });

    await test.step("Déclencher l'export CSV et vérifier le téléchargement", async () => {
      const exportBtn = page
        .getByRole("button", { name: /exporter csv/i })
        .first();
      await expect(exportBtn).toBeVisible();
      const filename = await waitForDownload(page, async () => {
        await exportBtn.click();
      });

      expect.soft(filename).toMatch(/\.csv$/i);
    });

    await takeScreenshot(page, "bulk-users-csv-export");
  });
});

test.describe("Bulk Actions - Evaluations", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, "admin");
    await page.waitForLoadState("networkidle");
    await page.goto("/evaluations");
    await waitForPageLoad(page);
  });

  test("sélection d'évaluations - actions bulk apparaissent", async ({
    page,
  }) => {
    test.setTimeout(60000);

    // Cocher la première évaluation (aria-label "Sélectionner cette évaluation").
    const firstCheckbox = page
      .getByLabel("Sélectionner cette évaluation")
      .first();
    await firstCheckbox.waitFor({ state: "visible", timeout: 15000 });
    await firstCheckbox.check();
    await page.waitForTimeout(300);

    // Les actions bulk apparaissent dans l'en-tête : compteur + boutons.
    await expect(page.getByText(/sélectionnée/i).first()).toBeVisible({
      timeout: 10000,
    });
    const archiveBtn = page
      .getByRole("button", { name: /^archiver$/i })
      .first();
    const signBtn = page.getByRole("button", { name: /signer rh/i }).first();
    await expect(archiveBtn).toBeVisible();
    await expect(signBtn).toBeVisible();

    await takeScreenshot(page, "bulk-evaluations-bar");
  });

  test("bulk archive évaluations", async ({ page }) => {
    test.setTimeout(60000);

    await test.step("Sélectionner 2 évaluations non archivées", async () => {
      const rows = page.locator(".tbl-row");
      await rows.first().waitFor({ state: "visible", timeout: 15000 });
      const rowCount = await rows.count();

      let selected = 0;
      for (let i = 0; i < rowCount && selected < 2; i++) {
        const row = rows.nth(i);
        const isArchived = await row
          .getByText(/archivée/i)
          .isVisible()
          .catch(() => false);
        if (!isArchived) {
          const checkbox = row.locator('input[type="checkbox"]').first();
          if (await checkbox.isVisible()) {
            await checkbox.check();
            selected++;
          }
        }
      }
      expect(selected).toBeGreaterThanOrEqual(1);
    });

    await test.step("Cliquer sur Archiver puis confirmer", async () => {
      const archiveBtn = page
        .getByRole("button", { name: /^archiver$/i })
        .first();
      await archiveBtn.waitFor({ state: "visible", timeout: 10000 });
      await archiveBtn.click();

      // Modal de confirmation bulk.
      const confirmBtn = page
        .getByRole("button", { name: /^confirmer$/i })
        .first();
      await confirmBtn.waitFor({ state: "visible", timeout: 5000 });
      await confirmBtn.click();
      await page.waitForLoadState("networkidle");

      // Succès : la modal se ferme et la sélection est réinitialisée.
      await expect(confirmBtn).toBeHidden({ timeout: 10000 });
      await expect(page.getByText(/sélectionnée\(s\)/i)).toBeHidden();
    });

    await takeScreenshot(page, "bulk-evaluations-archived");
  });

  test("bulk sign_hr évaluations", async ({ page }) => {
    test.setTimeout(60000);

    await test.step("Sélectionner des évaluations", async () => {
      const rows = page.locator(".tbl-row");
      await rows.first().waitFor({ state: "visible", timeout: 15000 });
      const rowCount = await rows.count();

      let selected = 0;
      for (let i = 0; i < rowCount && selected < 3; i++) {
        const row = rows.nth(i);
        const checkbox = row.locator('input[type="checkbox"]').first();
        if (await checkbox.isVisible()) {
          await checkbox.check();
          selected++;
        }
      }
      expect(selected).toBeGreaterThanOrEqual(1);
    });

    await test.step("Cliquer sur Signer RH puis confirmer", async () => {
      const signBtn = page.getByRole("button", { name: /signer rh/i }).first();
      await signBtn.waitFor({ state: "visible", timeout: 10000 });
      await signBtn.click();

      const confirmBtn = page
        .getByRole("button", { name: /^confirmer$/i })
        .first();
      await confirmBtn.waitFor({ state: "visible", timeout: 5000 });
      await confirmBtn.click();
      await page.waitForLoadState("networkidle");

      // Succès : la modal se ferme et la sélection est réinitialisée
      // (signature RH appliquée ou évaluations ignorées si statut incompatible).
      await expect(confirmBtn).toBeHidden({ timeout: 10000 });
      await expect(page.getByText(/sélectionnée\(s\)/i)).toBeHidden();
    });

    await takeScreenshot(page, "bulk-evaluations-sign-hr");
  });
});
