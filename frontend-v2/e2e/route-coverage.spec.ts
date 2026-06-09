import { test, expect, type Page, type ConsoleMessage } from "@playwright/test";
import { loginAs, type AppRole } from "./helpers/auth";

/**
 * AUDIT DE COUVERTURE — ROUTES & NAVIGATION
 *
 * Spec neuf, lecture seule sur `src/`. Pour chaque rôle :
 *  A. Reachability — chaque route AUTORISÉE charge sans écran d'erreur, sans
 *     redirection vers /login, sans erreur console "error".
 *  B. RBAC — quelques routes réservées admin/hr sont bien bloquées pour employee.
 *  C. Nav links — les liens de navConfig (primary + more) sont présents et les
 *     liens primary mènent à une page sans erreur.
 *
 * Tout en `expect.soft` pour produire un RAPPORT COMPLET (pas le 1er échec).
 * Lancer : cd frontend-v2 && npx playwright test route-coverage --workers=1 --retries=0
 */

// ─── Inventaire des routes (src/router/index.tsx) ─────────────────────────────
// roles=null → toute personne authentifiée (pas de guard de rôle).
type RoleSet = AppRole[] | null;
interface RouteDef {
  /** template, avec :id pour les routes paramétrées */
  path: string;
  roles: RoleSet;
  /** type de ressource pour résoudre :id via l'API */
  param?: "campaign" | "user" | "evaluation" | "form" | "event" | "pdi";
}

const ALL: AppRole[] = ["admin", "hr", "manager", "employee"];

const ROUTES: RouteDef[] = [
  // Tous rôles authentifiés
  { path: "/", roles: null },
  { path: "/campaigns", roles: null },
  { path: "/campaigns/:id", roles: null, param: "campaign" },
  { path: "/forms", roles: null },
  { path: "/forms/:id", roles: null, param: "form" },
  { path: "/evaluations", roles: null },
  { path: "/evaluations/history", roles: null },
  { path: "/evaluations/:id", roles: null, param: "evaluation" },
  { path: "/events", roles: null },
  { path: "/events/:id", roles: null, param: "event" },
  { path: "/help", roles: null },
  { path: "/mobility", roles: null },
  { path: "/pdi", roles: null },
  { path: "/pdi/:id", roles: null, param: "pdi" },
  { path: "/profile", roles: null },
  { path: "/profile/preferences", roles: null },
  { path: "/notifications", roles: null },
  { path: "/org", roles: null },
  // Restreintes par rôle
  { path: "/objectives", roles: ALL },
  { path: "/users", roles: ["admin", "hr", "manager"] },
  { path: "/users/:id", roles: ["admin", "hr", "manager"], param: "user" },
  { path: "/users/new", roles: ["admin", "hr"] },
  { path: "/users/:id/edit", roles: ["admin", "hr"], param: "user" },
  { path: "/users/groups", roles: ["admin", "hr"] },
  { path: "/campaigns/new", roles: ["admin", "hr"] },
  { path: "/campaigns/:id/edit", roles: ["admin", "hr"], param: "campaign" },
  {
    path: "/campaigns/:id/analytics",
    roles: ["admin", "hr", "manager"],
    param: "campaign",
  },
  { path: "/forms/new", roles: ["admin", "hr", "manager"] },
  { path: "/evaluations/new", roles: ["admin", "hr"] },
  { path: "/documents", roles: ["hr", "manager", "employee"] },
  // /documents/:id : pas de liste publique exploitable par tous → on teste la liste seule.
  { path: "/manager/todo", roles: ["manager", "hr", "admin"] },
  { path: "/interview", roles: ["manager", "hr", "admin"] },
  { path: "/hr/flags", roles: ["admin", "hr"] },
  { path: "/analytics", roles: ["admin", "hr", "manager"] },
  {
    path: "/analytics/campaigns/:id",
    roles: ["admin", "hr", "manager"],
    param: "campaign",
  },
  { path: "/admin", roles: ["admin", "hr"] },
  { path: "/admin/users", roles: ["admin", "hr"] },
  { path: "/admin/settings", roles: ["admin", "hr"] },
  { path: "/hr/settings", roles: ["admin", "hr"] },
  { path: "/admin/users/import", roles: ["admin", "hr"] },
  { path: "/admin/forms/import", roles: ["admin", "hr"] },
  { path: "/admin/audit", roles: ["admin", "hr"] },
  { path: "/admin/mail-templates", roles: ["admin", "hr"] },
  { path: "/admin/stats", roles: ["admin", "hr"] },
  { path: "/admin/departments", roles: ["admin", "hr"] },
  { path: "/admin/ldap", roles: ["admin"] },
  { path: "/admin/ssl", roles: ["admin"] },
  { path: "/admin/config", roles: ["admin"] },
  { path: "/admin/mail-config", roles: ["admin"] },
  { path: "/admin/status", roles: ["admin"] },
  { path: "/admin/setup", roles: ["admin"] },
  { path: "/admin/test-mail", roles: ["admin"] },
];

function allowed(route: RouteDef, role: AppRole): boolean {
  return route.roles === null || route.roles.includes(role);
}

// ─── Détection d'erreurs ──────────────────────────────────────────────────────
const ERROR_TEXT =
  /erreur interne|something went wrong|page introuvable|404|acc[eè]s refus|non autoris|unauthorized|forbidden/i;

/** Bruit console à ignorer (pas un vrai bug applicatif). */
function isNoiseConsole(text: string): boolean {
  return /favicon|ResizeObserver|net::ERR_|hydrat|Download the React DevTools|\[vite\]/i.test(
    text,
  );
}

interface ConsoleCollector {
  errors: string[];
  dispose: () => void;
}

function collectConsoleErrors(page: Page): ConsoleCollector {
  const errors: string[] = [];
  const onConsole = (msg: ConsoleMessage) => {
    if (msg.type() !== "error") return;
    const text = msg.text();
    if (isNoiseConsole(text)) return;
    errors.push(text);
  };
  page.on("console", onConsole);
  return { errors, dispose: () => page.off("console", onConsole) };
}

/** Résolution d'un id réel par ressource (1 fetch / ressource / rôle, caché). */
async function resolveId(
  page: Page,
  param: NonNullable<RouteDef["param"]>,
): Promise<string | null> {
  const endpoint: Record<NonNullable<RouteDef["param"]>, string> = {
    campaign: "/api/campaigns?limit=1",
    user: "/api/users?limit=1",
    evaluation: "/api/evaluations?limit=1",
    form: "/api/forms?limit=1",
    event: "/api/events?limit=1",
    pdi: "/api/pdi?limit=1",
  };
  try {
    const res = await page.request.get(endpoint[param]);
    if (!res.ok()) return null;
    const body: unknown = await res.json();
    const arr =
      body && typeof body === "object" && "data" in body
        ? (body as { data: unknown }).data
        : body;
    const first = Array.isArray(arr) ? arr[0] : null;
    if (first && typeof first === "object") {
      const rec = first as Record<string, unknown>;
      const id = rec._id ?? rec.id;
      return typeof id === "string" ? id : null;
    }
    return null;
  } catch {
    return null;
  }
}

/** Remplit :id dans le template, ou null si non résolvable. */
async function concreteRoute(
  page: Page,
  route: RouteDef,
  idCache: Map<string, string | null>,
): Promise<string | null> {
  if (!route.path.includes(":id")) return route.path;
  if (!route.param) return null;
  if (!idCache.has(route.param)) {
    idCache.set(route.param, await resolveId(page, route.param));
  }
  const id = idCache.get(route.param);
  if (!id) return null;
  return route.path.replace(":id", id);
}

interface Visit {
  /** Échec dur : écran d'erreur, redirection /login, ou exception. */
  ok: boolean;
  reasons: string[];
  /** Bruit console (advisory, n'invalide pas la route — évite le bleed inter-routes). */
  warnings: string[];
}

/**
 * Charge `url`, renvoie diagnostic (sans assertion — pour réutilisation).
 *
 * Note anti-faux-positif : le listener console est attaché APRÈS que `goto`
 * a résolu, pour ne pas capter une réponse 4xx encore en vol de la route
 * PRÉCÉDENTE (les pages lazy déclenchent des fetch asynchrones qui peuvent
 * retomber pendant le goto suivant). Les erreurs console restent purement
 * indicatives : le verdict OK/FAIL repose sur le corps de page + l'URL finale.
 */
async function visit(page: Page, url: string): Promise<Visit> {
  const reasons: string[] = [];
  let collector: ConsoleCollector | null = null;
  try {
    await page.goto(url, { waitUntil: "domcontentloaded" });
    // On attache MAINTENANT : seules les erreurs de CETTE page comptent.
    collector = collectConsoleErrors(page);
    // Laisse les lazy chunks + 1er render se stabiliser.
    await page
      .waitForLoadState("networkidle", { timeout: 8000 })
      .catch(() => undefined);

    const finalUrl = new URL(page.url()).pathname;
    if (/\/login$/.test(finalUrl)) {
      reasons.push(`redirigé vers /login (URL=${finalUrl})`);
    }

    // Anti-flicker : un écran d'erreur réel PERSISTE ; un reste de transition
    // SPA disparaît. On ne retient l'erreur que si elle tient après re-lecture.
    let bodyText = (await page.locator("body").innerText()) || "";
    if (ERROR_TEXT.test(bodyText)) {
      await page.waitForTimeout(700);
      bodyText = (await page.locator("body").innerText()) || "";
      if (ERROR_TEXT.test(bodyText)) {
        const m = bodyText.match(ERROR_TEXT);
        reasons.push(`écran d'erreur ("${m?.[0]}")`);
      }
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    reasons.push(`exception navigation: ${msg}`);
  }
  // Petite marge pour laisser remonter les erreurs console asynchrones.
  await page.waitForTimeout(150);
  const warnings: string[] = [];
  if (collector) {
    collector.dispose();
    if (collector.errors.length) {
      warnings.push(
        `console error: ${collector.errors.slice(0, 3).join(" | ").slice(0, 300)}`,
      );
    }
  }
  return { ok: reasons.length === 0, reasons, warnings };
}

// ─── A + Reachability par rôle ────────────────────────────────────────────────
for (const role of ALL) {
  test(`Reachability — routes autorisées pour ${role}`, async ({ page }) => {
    // Admin parcourt ~44 routes (networkidle jusqu'à 8s chacune) → timeout large.
    test.setTimeout(180_000);
    await loginAs(page, role);
    const idCache = new Map<string, string | null>();
    const lines: string[] = [];
    let tested = 0;
    let skipped = 0;

    for (const route of ROUTES) {
      if (!allowed(route, role)) continue;
      const url = await concreteRoute(page, route, idCache);
      if (url === null) {
        skipped++;
        lines.push(`  SKIP  ${route.path} — pas d'id réel disponible`);
        continue;
      }
      tested++;
      const res = await visit(page, url);
      expect
        .soft(
          res.ok,
          `[${role}] ${route.path} (${url}) — ${res.reasons.join("; ")}`,
        )
        .toBe(true);
      const warn = res.warnings.length ? ` [warn: ${res.warnings.join("; ")}]` : "";
      lines.push(
        res.ok
          ? `  OK    ${route.path}${warn}`
          : `  FAIL  ${route.path} (${url}) → ${res.reasons.join("; ")}${warn}`,
      );
    }

    const fails = lines.filter((l) => l.includes("FAIL")).length;
    console.log(
      `\n===== REACHABILITY [${role}] — ${tested} routes testées, ${skipped} skip, ${fails} en échec =====\n` +
        lines.join("\n"),
    );
  });
}

// ─── B. RBAC — routes réservées admin/hr inaccessibles à employee ─────────────
test("RBAC — employee bloqué sur les routes réservées admin/hr", async ({
  page,
}) => {
  await loginAs(page, "employee");
  // Échantillon de routes sensibles (création/admin/analytics).
  const restricted = [
    "/admin",
    "/admin/users",
    "/admin/config",
    "/users/new",
    "/analytics",
    "/evaluations/new",
  ];
  const lines: string[] = [];

  for (const url of restricted) {
    await page.goto(url, { waitUntil: "domcontentloaded" });
    await page
      .waitForLoadState("networkidle", { timeout: 8000 })
      .catch(() => undefined);

    const finalUrl = new URL(page.url()).pathname;
    const bodyText = (await page.locator("body").innerText()) || "";

    // Bloqué = redirigé hors de la route (login/unauthorized) OU message d'accès
    // refusé affiché. Le routeur redirige vers /unauthorized via AuthGuard.
    const redirectedAway = finalUrl !== url;
    const deniedMsg = /acc[eè]s refus|non autoris|unauthorized|forbidden/i.test(
      bodyText,
    );
    const blocked = redirectedAway || deniedMsg;

    expect
      .soft(
        blocked,
        `[employee] devrait être bloqué sur ${url} — URL finale=${finalUrl}, message refus=${deniedMsg}`,
      )
      .toBe(true);
    lines.push(
      blocked
        ? `  BLOCKED ${url} → ${finalUrl}${deniedMsg ? " (msg refus)" : ""}`
        : `  LEAK!   ${url} → ${finalUrl} (page accessible, aucun blocage)`,
    );
  }

  const leaks = lines.filter((l) => l.includes("LEAK")).length;
  console.log(
    `\n===== RBAC [employee] — ${restricted.length} routes sensibles, ${leaks} fuite(s) =====\n` +
      lines.join("\n"),
  );
});

// ─── C. Nav links — présence + clic des liens primary par rôle ────────────────
/**
 * Réplique de navConfig.getPerspectiveNav par rôle, hrefs attendus.
 * On ne vérifie que les hrefs (les libellés sont i18n et peu stables).
 */
function expectedNav(role: AppRole): {
  /** liens primary rendus en lien DIRECT (cliquables sans ouvrir de dropdown) */
  primaryDirect: string[];
  /** tous les hrefs attendus (direct + items de dropdown + more) */
  primary: string[];
  more: string[];
} {
  // Vue « Mon espace » — l'employé y reste toujours ; les rôles spéciaux sont
  // testés en perspective « work » (défaut au login, sans localStorage).
  // L'employé a un dropdown « Évaluations » groupant éval/historique/objectifs.
  const me = {
    primaryDirect: ["/", "/mobility", "/pdi"],
    primary: ["/", "/evaluations", "/evaluations/history", "/objectives", "/mobility", "/pdi"],
    more: ["/events", "/documents"],
  };
  if (role === "employee") return me;
  if (role === "manager") {
    // Tous les primary sont des liens directs (pas de groupe dropdown).
    const direct = ["/", "/manager/todo", "/users", "/org", "/campaigns", "/evaluations"];
    return {
      primaryDirect: direct,
      primary: direct,
      more: ["/evaluations/history", "/objectives", "/events", "/documents"],
    };
  }
  if (role === "hr") {
    // dashboard + administration = directs ; collaborateurs/campagnes/évaluations = groupes.
    return {
      primaryDirect: ["/", "/admin"],
      primary: [
        "/",
        "/users",
        "/org",
        "/campaigns",
        "/forms",
        "/evaluations",
        "/evaluations/history",
        "/hr/flags",
        "/admin",
      ],
      more: ["/objectives", "/events", "/documents", "/analytics", "/admin/departments"],
    };
  }
  // admin
  return {
    primaryDirect: ["/", "/admin"],
    primary: [
      "/",
      "/users",
      "/org",
      "/campaigns",
      "/forms",
      "/evaluations",
      "/evaluations/history",
      "/hr/flags",
      "/mobility",
      "/admin",
    ],
    more: ["/objectives", "/events", "/analytics", "/admin/departments"],
  };
}

/**
 * Force la perspective « work » si un switch existe (manager/hr). L'admin est
 * déjà en « work » ; l'employé n'a pas de switch. Idempotent.
 */
async function ensureWorkPerspective(page: Page) {
  const workTab = page.locator("nav .perspective-switch button[role='tab']").nth(1);
  if ((await workTab.count()) === 0) return; // pas de switch (employee/admin)
  if ((await workTab.getAttribute("aria-selected")) !== "true") {
    await workTab.click().catch(() => undefined);
    await page.locator("nav.subnav").first().waitFor({ timeout: 10000 }).catch(() => undefined);
  }
}

/**
 * Collecte TOUS les hrefs joignables dans la sous-nav : liens directs +
 * contenu de chaque dropdown (groupes primary + « Plus »). Les enfants d'un
 * dropdown ne sont dans le DOM que lorsqu'il est ouvert, et un seul dropdown
 * reste ouvert à la fois → on ouvre chaque toggle l'un après l'autre.
 */
async function collectNavHrefs(page: Page): Promise<Set<string>> {
  const found = new Set<string>();
  const grab = async () => {
    const hrefs = await page.locator("nav.subnav a[href]").evaluateAll((els) =>
      els.map((e) => e.getAttribute("href") ?? ""),
    );
    for (const h of hrefs) if (h) found.add(h);
  };
  await grab(); // liens directs
  const toggles = page.locator("nav.subnav button.subnav-link[aria-haspopup='menu']");
  const count = await toggles.count();
  for (let i = 0; i < count; i++) {
    const btn = toggles.nth(i);
    await btn.click().catch(() => undefined);
    await page.waitForTimeout(80);
    await grab();
    // Referme (re-clic) pour repartir d'un état propre avant le toggle suivant.
    await btn.click().catch(() => undefined);
    await page.waitForTimeout(40);
  }
  return found;
}

for (const role of ALL) {
  test(`Nav links — présence & clic des liens primary pour ${role}`, async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await loginAs(page, role);
    await page.locator("nav.subnav").first().waitFor({ timeout: 10000 });
    await ensureWorkPerspective(page);

    const exp = expectedNav(role);
    const lines: string[] = [];

    // Présence : chaque href attendu joignable dans la sous-nav (direct ou dropdown).
    const navHrefs = await collectNavHrefs(page);
    const allHrefs = [...exp.primary, ...exp.more];
    for (const href of allHrefs) {
      const present = navHrefs.has(href);
      expect
        .soft(present, `[${role}] lien de nav manquant : ${href}`)
        .toBe(true);
      lines.push(present ? `  HAS  ${href}` : `  MISSING ${href}`);
    }

    // Clic des liens PRIMARY DIRECTS → page sans erreur (les liens de dropdown
    // sont déjà couverts par la Reachability ; ici on valide la nav cliquable).
    for (const href of exp.primaryDirect) {
      await ensureWorkPerspective(page);
      const link = page.locator(`nav.subnav a[href='${href}']`).first();
      if ((await link.count()) === 0) {
        lines.push(`  NAV-SKIP ${href} (lien absent)`);
        continue;
      }
      await link.click().catch(() => undefined);
      await page
        .waitForLoadState("networkidle", { timeout: 8000 })
        .catch(() => undefined);
      const finalUrl = new URL(page.url()).pathname;
      const bodyText = (await page.locator("body").innerText()) || "";
      const reasons: string[] = [];
      if (/\/login$/.test(finalUrl)) reasons.push(`redirigé /login`);
      if (ERROR_TEXT.test(bodyText)) {
        reasons.push(`écran d'erreur ("${bodyText.match(ERROR_TEXT)?.[0]}")`);
      }
      const ok = reasons.length === 0;
      expect
        .soft(ok, `[${role}] clic nav ${href} → ${reasons.join("; ")}`)
        .toBe(true);
      lines.push(
        ok ? `  NAV-OK   ${href}` : `  NAV-FAIL ${href} → ${reasons.join("; ")}`,
      );
      // Revenir à un état nav stable pour le lien suivant.
      await page.locator("nav.subnav").first().waitFor({ timeout: 10000 }).catch(() => undefined);
    }

    const missing = lines.filter((l) => l.includes("MISSING")).length;
    const navFails = lines.filter((l) => l.includes("NAV-FAIL")).length;
    console.log(
      `\n===== NAV [${role}] — ${allHrefs.length} liens, ${missing} manquant(s), ${navFails} clic(s) en échec =====\n` +
        lines.join("\n"),
    );
  });
}
