import { test, expect, type Page, type ConsoleMessage } from "@playwright/test";
import { loginAs } from "./helpers/auth";

const CRASH_RE =
  /something went wrong|une erreur est survenue|error boundary|cannot read prop|404|introuvable/i;

// Routes du hub Configuration admin → slug pour le screenshot.
const ROUTES: { route: string; slug: string }[] = [
  { route: "/admin", slug: "hub" },
  { route: "/admin/config", slug: "config" },
  { route: "/admin/mail-config", slug: "mail-config" },
  { route: "/admin/mail-templates", slug: "mail-templates" },
  { route: "/admin/ldap", slug: "ldap" },
  { route: "/admin/status", slug: "status" },
  { route: "/admin/audit", slug: "audit" },
  { route: "/admin/settings", slug: "settings" },
  { route: "/admin/setup", slug: "setup" },
  { route: "/admin/users/import", slug: "users-import" },
  { route: "/admin/forms/import", slug: "forms-import" },
];

// Branche la capture des erreurs console + pageerror sur la page.
function captureErrors(page: Page) {
  const errors: string[] = [];
  page.on("console", (msg: ConsoleMessage) => {
    if (msg.type() === "error") errors.push(`[console] ${msg.text()}`);
  });
  page.on("pageerror", (err: Error) => {
    errors.push(`[pageerror] ${err.message}`);
  });
  return errors;
}

test.describe("Visuel — Hub Configuration admin (lecture seule)", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, "admin");
  });

  for (const { route, slug } of ROUTES) {
    test(`config visuel — ${route}`, async ({ page }) => {
      const errors = captureErrors(page);

      await page.goto(route);
      await page.waitForLoadState("networkidle");

      // Pas de crash visible dans le DOM.
      await expect(page.locator("body")).not.toContainText(CRASH_RE);

      // Screenshot pleine page.
      await page.screenshot({
        path: `e2e/screenshots/config-${slug}.png`,
        fullPage: true,
      });

      // ----- Vérifications spécifiques au hub /admin -----
      if (route === "/admin") {
        await expect(
          page
            .getByText(/Syst.me|E-mail|LDAP|Audit|Import|Param.tres RH/i)
            .first(),
        ).toBeVisible();

        // Compte les cartes-liens vers /admin/*.
        const cards = page.locator('a[href^="/admin/"]');
        const cardCount = await cards.count();
        console.log(`[hub] cartes-liens vers /admin/* : ${cardCount}`);

        // Clique la carte « Configuration e-mail » → /admin/mail-config puis retour.
        const mailCard = page
          .getByRole("link", { name: /configuration e-?mail|e-?mail/i })
          .first();
        if (await mailCard.isVisible().catch(() => false)) {
          await mailCard.click();
          await page.waitForLoadState("networkidle");
          await expect(page).toHaveURL(/\/admin\/mail-config/);
          await page.goBack();
          await page.waitForLoadState("networkidle");
        } else {
          console.log("[hub] carte « Configuration e-mail » introuvable");
        }
      }

      // ----- Vérifications spécifiques à /admin/mail-config -----
      if (route === "/admin/mail-config") {
        const host = page
          .getByLabel(/h.te|host|serveur|smtp/i)
          .or(page.locator('input[name*="host" i], input[id*="host" i]'))
          .first();
        const port = page
          .getByLabel(/port/i)
          .or(page.locator('input[name*="port" i], input[id*="port" i]'))
          .first();
        const user = page
          .getByLabel(/utilisateur|user|login|identifiant/i)
          .or(page.locator('input[name*="user" i], input[id*="user" i]'))
          .first();

        const hostVisible = await host.isVisible().catch(() => false);
        const portVisible = await port.isVisible().catch(() => false);
        const userVisible = await user.isVisible().catch(() => false);
        console.log(
          `[mail-config] champs SMTP — hôte:${hostVisible} port:${portVisible} utilisateur:${userVisible}`,
        );
        expect(hostVisible || portVisible || userVisible).toBeTruthy();
      }

      if (errors.length) {
        console.log(`[${route}] erreurs:\n  ${errors.join("\n  ")}`);
      } else {
        console.log(`[${route}] aucune erreur console/page`);
      }
    });
  }
});
