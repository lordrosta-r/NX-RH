import { test, expect, type Page } from "@playwright/test";
import { loginAs, type AppRole } from "./helpers/auth";

// =============================================================================
// Challenge bout-à-bout par rôle (issues #74–#77).
//
// Pour chaque rôle, on visite chaque page accessible et on :
//   1. capture les erreurs console + les réponses réseau 5xx (signal DUR : échec),
//   2. clique chaque bouton « sûr » (ouvre modale/onglet/nav) et ANNULE toute
//      confirmation destructrice (le bouton est « utilisé » sans casser le seed),
//   3. consigne chaque bouton en échec (signal SOUPLE : reporté, n'arrête pas le run).
//
// Pré-requis : stack Docker seedée. Lancer par rôle pour ménager le rate-limit :
//   npx playwright test role-challenge --grep @admin --workers=1 --retries=0
// =============================================================================

const ROUTES: Record<AppRole, string[]> = {
  admin: [
    "/", "/users", "/org", "/campaigns", "/forms", "/admin",
    "/admin/departments", "/analytics", "/hr/flags", "/mobility",
    "/evaluations", "/evaluations/history", "/events",
  ],
  hr: [
    "/", "/users", "/org", "/campaigns", "/forms", "/evaluations",
    "/evaluations/history", "/hr/flags", "/events", "/documents",
    "/analytics", "/objectives",
  ],
  manager: [
    "/", "/manager/todo", "/users", "/org", "/campaigns", "/evaluations",
    "/evaluations/history", "/objectives", "/mobility", "/pdi", "/events",
    "/documents",
  ],
  employee: [
    "/", "/evaluations", "/evaluations/history", "/objectives", "/mobility",
    "/pdi", "/events", "/documents",
  ],
};

// Boutons « sûrs » : ouvrent une modale (qu'on annule), un onglet, un filtre, ou
// naviguent — SANS muter le seed. On exclut volontairement créer/dupliquer/générer
// (effets de bord) et tout le destructeur.
const SAFE = /nouve|ajout|filtr|voir|détail|detail|plus|ouvrir|consulter|programm|exporter|recherch|suivant|précédent|precedent|onglet|aperçu|apercu|modifier|éditer|editer|actualiser|rafra/i;
// Boutons destructeurs / mutants / hors-périmètre : on NE déclenche PAS (annule la modale).
const DESTRUCTIVE = /supprim|delete|archiv|retir|bloqu|désactiv|desactiv|déconnex|deconnex|logout|réinitial|reinitial|révoqu|revoqu|clôtur|clotur|valider|confirmer|enregistr|soumett|générer les|dupliqu/i;

// Bruits réseau/console à ignorer (non bloquants).
function isRealConsole(text: string): boolean {
  return !/favicon|ResizeObserver|net::ERR_|Failed to load resource|Download the React DevTools|hydrat/i.test(
    text,
  );
}

interface Finding {
  route: string;
  kind: "console" | "network" | "button";
  detail: string;
}

async function challengeRoute(
  page: Page,
  route: string,
  findings: Finding[],
): Promise<void> {
  const consoleErrors: string[] = [];
  const networkErrors: string[] = [];
  const onConsole = (msg: import("@playwright/test").ConsoleMessage) => {
    if (msg.type() === "error" && isRealConsole(msg.text()))
      consoleErrors.push(msg.text());
  };
  const onResponse = (res: import("@playwright/test").Response) => {
    if (res.status() >= 500) networkErrors.push(`${res.status()} ${res.url()}`);
  };
  page.on("console", onConsole);
  page.on("response", onResponse);

  try {
    await page.goto(route, { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});

    // La page ne doit pas afficher d'erreur d'accès/écran d'erreur.
    await expect(page.locator("body")).not.toContainText(
      /acces refuse|accès refusé|unauthorized|forbidden|erreur interne|something went wrong/i,
    );

    // Exercer les boutons « sûrs » visibles (max 12 par page pour rester tenable).
    const buttons = page.getByRole("button");
    const count = Math.min(await buttons.count(), 12);
    for (let i = 0; i < count; i++) {
      const btn = buttons.nth(i);
      let label = "";
      try {
        if (!(await btn.isVisible()) || !(await btn.isEnabled())) continue;
        label = ((await btn.textContent()) ?? "").trim().slice(0, 40);
        if (!label || DESTRUCTIVE.test(label) || !SAFE.test(label)) continue;

        await btn.click({ timeout: 4000 });
        await page.waitForTimeout(250);

        // Si une modale/confirmation s'est ouverte, on la ferme proprement.
        const cancel = page
          .getByRole("button", { name: /annuler|fermer|cancel|retour/i })
          .first();
        if (await cancel.isVisible().catch(() => false)) {
          await cancel.click({ timeout: 3000 }).catch(() => {});
          await page.waitForTimeout(150);
        }
        await page.keyboard.press("Escape").catch(() => {});
      } catch (err) {
        const msg = err instanceof Error ? err.message.split("\n")[0] : String(err);
        findings.push({ route, kind: "button", detail: `« ${label} » → ${msg}` });
      }
    }
  } finally {
    page.off("console", onConsole);
    page.off("response", onResponse);
  }

  for (const c of consoleErrors)
    findings.push({ route, kind: "console", detail: c });
  for (const n of networkErrors)
    findings.push({ route, kind: "network", detail: n });
}

(["admin", "hr", "manager", "employee"] as AppRole[]).forEach((role) => {
  test.describe(`Challenge @${role}`, () => {
    test(`parcourt et exerce chaque page (@${role})`, async ({ page }) => {
      test.setTimeout(180000);
      await loginAs(page, role);

      const findings: Finding[] = [];
      for (const route of ROUTES[role]) {
        await challengeRoute(page, route, findings);
      }

      // Rapport lisible dans la sortie du test.
      if (findings.length) {
        const report = findings
          .map((f) => `  [${f.kind}] ${f.route} :: ${f.detail}`)
          .join("\n");
        console.log(`\n=== Findings @${role} (${findings.length}) ===\n${report}\n`);
      }

      // Signal DUR : aucune erreur console ni 5xx réseau. Les soucis de boutons
      // sont reportés (console.log) sans casser, pour trier en issues `bug`.
      const hard = findings.filter(
        (f) => f.kind === "console" || f.kind === "network",
      );
      expect(
        hard,
        `Erreurs dures @${role} :\n${hard.map((f) => `${f.route} :: ${f.detail}`).join("\n")}`,
      ).toEqual([]);
    });
  });
});
