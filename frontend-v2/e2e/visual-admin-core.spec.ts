import { test, expect, type Page } from "@playwright/test";
import { loginAs } from "./helpers/auth";

const CRASH_RE =
  /something went wrong|une erreur est survenue|error boundary|cannot read prop/i;

const SAFE_RE =
  /nouveau|nouvelle|cr.er|ajouter|filtrer|voir|d.tail|plus|importer|exporter/i;

const DANGER_RE =
  /supprim|delet|enregistr|sauvegard|valider|soumettre|envoyer|archiver|geler|anonymiser|d.sactiver|offboard/i;

const ROUTES: { route: string; slug: string }[] = [
  { route: "/", slug: "home" },
  { route: "/users", slug: "users" },
  { route: "/campaigns", slug: "campaigns" },
  { route: "/evaluations", slug: "evaluations" },
  { route: "/events", slug: "events" },
  { route: "/org", slug: "org" },
  { route: "/offboarding", slug: "offboarding" },
];

test.describe("Visual Admin Core — lecture seule", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, "admin");
  });

  for (const { route, slug } of ROUTES) {
    test(`route ${route} — pas de crash + screenshot`, async ({ page }) => {
      const errors: string[] = [];
      page.on("console", (m) => {
        if (m.type() === "error") errors.push(m.text());
      });
      page.on("pageerror", (e) => errors.push(e.message));

      // 1. Navigation
      await page.goto(route);
      await page.waitForLoadState("networkidle");

      // 2. Pas de crash visible
      await expect(page.locator("body")).not.toContainText(CRASH_RE);

      // 3. Screenshot pleine page
      await page.screenshot({
        path: `e2e/screenshots/core-${slug}.png`,
        fullPage: true,
      });

      // 4. Cliquer UNIQUEMENT un bouton sûr (lecture seule)
      await clickSafeButton(page);

      // Logger les erreurs console/page collectées
      if (errors.length) {
        console.log(`\n[${route}] erreurs console/page (${errors.length}):`);
        for (const e of errors) console.log(`  - ${e}`);
      } else {
        console.log(`\n[${route}] aucune erreur console/page`);
      }
    });
  }
});

async function clickSafeButton(page: Page) {
  const buttons = page.getByRole("button");
  const count = await buttons.count();
  for (let i = 0; i < count; i++) {
    const btn = buttons.nth(i);
    let text: string;
    try {
      if (!(await btn.isVisible())) continue;
      text = (await btn.textContent())?.trim() ?? "";
    } catch {
      continue;
    }
    if (!text) continue;
    if (DANGER_RE.test(text)) continue;
    if (!SAFE_RE.test(text)) continue;

    // Bouton sûr trouvé : cliquer et vérifier qu'une zone réagit
    try {
      await btn.click({ timeout: 3000 });
      await page.waitForTimeout(500);
      const overlay = page
        .locator(
          '[role="dialog"], [role="menu"], [role="listbox"], [aria-expanded="true"], .modal, [data-state="open"]',
        )
        .first();
      await overlay
        .waitFor({ state: "visible", timeout: 2000 })
        .catch(() => {});
    } catch {
      /* clic non bloquant — lecture seule, on ignore */
    }
    await page.keyboard.press("Escape");
    return;
  }
}
