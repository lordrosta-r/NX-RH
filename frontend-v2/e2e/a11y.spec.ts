import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { loginAs, type AppRole } from "./helpers/auth";

/**
 * a11y.spec.ts — Audit d'accessibilité automatisé (axe-core / WCAG 2 A & AA).
 *
 * Pour chaque rôle et chacune de ses pages clés, on lance axe et on ne retient
 * que les violations `serious` + `critical`. On agrège tout dans un rapport
 * lisible (console.log en fin de run) afin d'ouvrir des issues `bug`.
 *
 * Les assertions sont SOUPLES (`expect.soft`) : une page avec violations
 * n'arrête pas le run, on veut le rapport COMPLET.
 *
 * Lancer : npx playwright test e2e/a11y.spec.ts --workers=1
 */

const SEVERITIES = ["serious", "critical"] as const;

// Pages clés par rôle (routes réelles vérifiées dans src/router/index.tsx).
const PAGES_BY_ROLE: Record<AppRole, string[]> = {
  admin: [
    "/",
    "/users",
    "/org",
    "/campaigns",
    "/forms",
    "/admin",
    "/analytics",
    "/hr/flags",
    "/evaluations",
  ],
  hr: [
    "/",
    "/users",
    "/campaigns",
    "/forms",
    "/evaluations",
    "/hr/flags",
    "/objectives",
    "/documents",
  ],
  manager: [
    "/",
    "/manager/todo",
    "/users",
    "/org",
    "/campaigns",
    "/evaluations",
    "/objectives",
    "/mobility",
    "/pdi",
  ],
  employee: [
    "/",
    "/evaluations",
    "/objectives",
    "/mobility",
    "/pdi",
    "/events",
    "/documents",
  ],
};

interface ViolationRow {
  role: AppRole;
  page: string;
  ruleId: string;
  impact: string;
  nodes: number;
  exampleSelector: string;
  help: string;
}

// Accumulateur global partagé entre tous les tests du fichier.
const report: ViolationRow[] = [];
// Pages auditées sans violation serious/critical (pour lister le "100% propre").
const cleanPages: { role: AppRole; page: string }[] = [];

for (const role of Object.keys(PAGES_BY_ROLE) as AppRole[]) {
  test.describe(`a11y — ${role}`, () => {
    test.beforeEach(async ({ page }) => {
      await loginAs(page, role);
    });

    for (const path of PAGES_BY_ROLE[role]) {
      test(`${role} :: ${path}`, async ({ page }) => {
        await page.goto(path);
        await page.waitForLoadState("networkidle").catch(() => {
          // networkidle peut ne jamais arriver (polling) — fallback domcontentloaded
        });
        await page.waitForTimeout(800); // laisse le lazy-render se poser

        const results = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa"])
          .analyze();

        const serious = results.violations.filter((v) =>
          SEVERITIES.includes((v.impact ?? "") as (typeof SEVERITIES)[number]),
        );

        for (const v of serious) {
          report.push({
            role,
            page: path,
            ruleId: v.id,
            impact: v.impact ?? "unknown",
            nodes: v.nodes.length,
            exampleSelector: v.nodes[0]?.target?.join(" ") ?? "(n/a)",
            help: v.help,
          });
        }

        if (serious.length === 0) {
          cleanPages.push({ role, page: path });
        }

        // Assertion souple : on signale mais on n'arrête pas le run.
        expect.soft(
          serious,
          `[a11y] ${role} ${path} — ${serious.length} violation(s) serious/critical : ` +
            serious.map((v) => v.id).join(", "),
        ).toEqual([]);
      });
    }
  });
}

test.afterAll(() => {
  const line = "=".repeat(78);
  console.log(`\n${line}`);
  console.log("RAPPORT A11Y — violations serious/critical (WCAG 2 A & AA)");
  console.log(line);

  if (report.length === 0) {
    console.log("Aucune violation serious/critical détectée. 🎉");
  } else {
    // Tri par rôle puis page pour un rapport lisible.
    const sorted = [...report].sort(
      (a, b) =>
        a.role.localeCompare(b.role) ||
        a.page.localeCompare(b.page) ||
        a.ruleId.localeCompare(b.ruleId),
    );

    let curKey = "";
    for (const r of sorted) {
      const key = `${r.role} | ${r.page}`;
      if (key !== curKey) {
        curKey = key;
        console.log(`\n● ${key}`);
      }
      console.log(
        `    - [${r.impact.toUpperCase()}] ${r.ruleId} ` +
          `(${r.nodes} nœud${r.nodes > 1 ? "s" : ""}) — ${r.help}\n` +
          `      ex: ${r.exampleSelector}`,
      );
    }

    // Agrégat par règle (combien de pages touchées).
    console.log(`\n${line}`);
    console.log("AGRÉGAT PAR RÈGLE axe");
    console.log(line);
    const byRule = new Map<
      string,
      { impact: string; pages: Set<string>; nodes: number }
    >();
    for (const r of report) {
      const entry = byRule.get(r.ruleId) ?? {
        impact: r.impact,
        pages: new Set<string>(),
        nodes: 0,
      };
      entry.pages.add(`${r.role}:${r.page}`);
      entry.nodes += r.nodes;
      byRule.set(r.ruleId, entry);
    }
    for (const [ruleId, e] of [...byRule.entries()].sort(
      (a, b) => b[1].pages.size - a[1].pages.size,
    )) {
      console.log(
        `  ${ruleId} [${e.impact}] — ${e.pages.size} page(s), ${e.nodes} nœud(s) au total`,
      );
    }
  }

  // Pages 100% propres.
  console.log(`\n${line}`);
  console.log("PAGES SANS VIOLATION serious/critical");
  console.log(line);
  if (cleanPages.length === 0) {
    console.log("(aucune)");
  } else {
    for (const c of cleanPages.sort(
      (a, b) => a.role.localeCompare(b.role) || a.page.localeCompare(b.page),
    )) {
      console.log(`  ✓ ${c.role} | ${c.page}`);
    }
  }
  console.log(`\n${line}\n`);
});
