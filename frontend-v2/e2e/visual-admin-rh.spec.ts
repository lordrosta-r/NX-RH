import { test, expect, type Page } from "@playwright/test";
import { loginAs } from "./helpers/auth";

const CRASH_RE =
  /something went wrong|une erreur est survenue|error boundary|cannot read prop/i;

const UNSAFE_RE =
  /supprim|delet|enregistr|sauvegard|valider|soumettre|envoyer|archiver|geler|anonymiser|d.sactiver/i;

const SAFE_RE =
  /nouveau|nouvelle|cr.er|ajouter|filtrer|voir|d.tail|plus|importer|exporter/i;

type RouteCase = { route: string; slug: string };

const ROUTES: RouteCase[] = [
  { route: "/resources", slug: "resources" },
  { route: "/analytics", slug: "analytics" },
  { route: "/mobility", slug: "mobility" },
  { route: "/forms", slug: "forms" },
  { route: "/evaluations/history", slug: "evaluations-history" },
  { route: "/hr/flags", slug: "hr-flags" },
  { route: "/pdi", slug: "pdi" },
  { route: "/help", slug: "help" },
];

function attachConsoleCapture(page: Page, errors: string[]) {
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(`[console] ${msg.text()}`);
  });
  page.on("pageerror", (err) => {
    errors.push(`[pageerror] ${err.message}`);
  });
}

/**
 * Clique le premier bouton SÛR visible (ouvre une modale/onglet) puis Escape.
 * Ne clique jamais un bouton destructeur (UNSAFE_RE).
 */
async function clickFirstSafeButton(page: Page) {
  const buttons = page.getByRole("button");
  const count = await buttons.count();
  for (let i = 0; i < count; i++) {
    const btn = buttons.nth(i);
    if (!(await btn.isVisible().catch(() => false))) continue;
    const label = ((await btn.textContent().catch(() => "")) || "").trim();
    if (!label) continue;
    if (UNSAFE_RE.test(label)) continue;
    if (!SAFE_RE.test(label)) continue;

    await btn.click().catch(() => {});
    await page.waitForTimeout(500);

    // Vérifie l'apparition d'une modale / zone (best-effort, non bloquant)
    const overlay = page.locator(
      '[role="dialog"], [aria-modal="true"], .modal, [data-modal]',
    );
    await overlay
      .first()
      .waitFor({ state: "visible", timeout: 2000 })
      .catch(() => {});

    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);
    return label;
  }
  return null;
}

test.describe("Visual RH (admin) - lecture seule", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, "admin");
  });

  for (const { route, slug } of ROUTES) {
    test(`visuel ${route}`, async ({ page }) => {
      const errors: string[] = [];
      attachConsoleCapture(page, errors);

      await page.goto(route);
      await page.waitForLoadState("networkidle");

      // 2. Pas de crash
      await expect(page.locator("body")).not.toContainText(CRASH_RE);

      // 3. Screenshot pleine page
      await page.screenshot({
        path: `e2e/screenshots/rh-${slug}.png`,
        fullPage: true,
      });

      // 4. Interaction SÛRE
      if (route === "/mobility") {
        // Ouvre la modale « Nouvelle demande » + vérifie le sélecteur de catégorie
        const newBtn = page
          .getByRole("button", { name: /nouvelle demande|nouvelle/i })
          .first();
        if (await newBtn.isVisible().catch(() => false)) {
          await newBtn.click().catch(() => {});
          await page.waitForTimeout(500);
          const categorySelector = page.getByText(
            /mobilit.|promotion|augmentation|formation|autre/i,
          );
          await expect(categorySelector.first()).toBeVisible({ timeout: 5000 });
          await page.keyboard.press("Escape");
          await page.waitForTimeout(300);
        }
      } else {
        await clickFirstSafeButton(page);
      }

      // Re-check crash après interaction
      await expect(page.locator("body")).not.toContainText(CRASH_RE);

      if (errors.length) {
        console.log(`\n[${route}] erreurs console/page (${errors.length}):`);
        for (const e of errors) console.log(`  ${e}`);
      } else {
        console.log(`\n[${route}] aucune erreur console/page`);
      }
    });
  }
});
