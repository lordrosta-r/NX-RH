import { test, expect, type Page, type Response } from "@playwright/test";
import { loginAs, type AppRole } from "./helpers/auth";

// =============================================================================
// ISSUE #96 — INTÉGRITÉ DES ENDPOINTS & SOUMISSIBILITÉ DES ACTIONS
//
// Objectif : PROUVER qu'aucun bouton ne tape un endpoint inexistant et qu'aucune
// action clé n'est impossible à soumettre. Spec neuf, LECTURE SEULE sur `src/`,
// ne modifie aucun fichier existant. NE redémarre PAS l'app. Rate-limit relâché.
//
// Pour chaque rôle (admin, hr, manager, employee) :
//  1. Listener réseau capturant TOUTES les réponses /api/* (méthode+URL+statut).
//  2. Parcourt chaque page accessible (routes de route-coverage.spec.ts) ET clique
//     les boutons « sûrs » (ouvre modales/onglets/filtres, ANNULE le destructeur —
//     comme role-challenge.spec.ts).
//  3. Échec SOFT si une requête /api a renvoyé 404 / 405 / 501 / 5xx (= endpoint
//     mort/cassé). Les 401/403 attendus sont loggés mais NON bloquants.
//  4. Soumissibilité des formulaires clés sans effet destructeur :
//       - création mobilité (employee)
//       - création formulaire (manager / hr)
//       - création campagne (hr)
//     Ouvre, remplit le minimum requis (horodaté), soumet → 2xx OU validation
//     inline cohérente. PAS de 404/500, PAS de bouton submit inerte.
//
// Tout en expect.soft → rapport complet. Données horodatées (pas d'état partagé).
//
// Lancer : cd frontend-v2 && npx playwright test endpoint-integrity --workers=1 --retries=0
// =============================================================================

const ALL: AppRole[] = ["admin", "hr", "manager", "employee"];

// ─── Routes accessibles par rôle (dérivées de route-coverage.spec.ts / router) ─
// On parcourt les LISTES (pas les routes :id qui exigent un id réel — la
// soumissibilité couvre les flux de création).
const ROUTES: Record<AppRole, string[]> = {
  admin: [
    "/", "/users", "/users/groups", "/org", "/campaigns", "/forms",
    "/evaluations", "/evaluations/history", "/objectives", "/mobility",
    "/pdi", "/events", "/documents", "/hr/flags", "/analytics", "/manager/todo",
    "/interview", "/admin", "/admin/users", "/admin/settings", "/admin/audit",
    "/admin/mail-templates", "/admin/stats", "/admin/departments",
    "/admin/ldap", "/admin/config", "/admin/status", "/notifications",
    "/profile", "/profile/preferences", "/help",
  ],
  hr: [
    "/", "/users", "/users/groups", "/org", "/campaigns", "/forms",
    "/evaluations", "/evaluations/history", "/objectives", "/mobility",
    "/pdi", "/events", "/documents", "/hr/flags", "/analytics", "/manager/todo",
    "/interview", "/admin", "/admin/users", "/admin/settings", "/admin/audit",
    "/admin/mail-templates", "/admin/stats", "/admin/departments",
    "/notifications", "/profile", "/profile/preferences", "/help",
  ],
  manager: [
    "/", "/manager/todo", "/interview", "/users", "/org", "/campaigns",
    "/evaluations", "/evaluations/history", "/objectives", "/mobility",
    "/pdi", "/events", "/documents", "/notifications", "/profile",
    "/profile/preferences", "/help",
  ],
  employee: [
    "/", "/evaluations", "/evaluations/history", "/objectives", "/mobility",
    "/pdi", "/events", "/documents", "/notifications", "/profile",
    "/profile/preferences", "/help",
  ],
};

// Boutons « sûrs » : ouvrent une modale (annulée), un onglet, un filtre, ou
// naviguent — SANS muter le seed. (cf. role-challenge.spec.ts)
const SAFE =
  /nouve|ajout|filtr|voir|détail|detail|plus|ouvrir|consulter|programm|exporter|recherch|suivant|précédent|precedent|onglet|aperçu|apercu|modifier|éditer|editer|actualiser|rafra|tous|approuv|en attente|formation|promotion|mobilit/i;
// Boutons destructeurs / mutants : on NE déclenche PAS (annule la modale).
const DESTRUCTIVE =
  /supprim|delete|archiv|retir|bloqu|désactiv|desactiv|déconnex|deconnex|logout|réinitial|reinitial|révoqu|revoqu|clôtur|clotur|valider|confirmer|enregistr|soumett|générer les|générer|generer|dupliqu|envoyer|relanc|importer|synchron/i;

// ─── Capture réseau /api/* ────────────────────────────────────────────────────
interface ApiHit {
  method: string;
  url: string;
  status: number;
  route: string; // page où la requête a été observée
}

// Un statut « cassé » = endpoint mort/cassé côté serveur ou routage.
function isBroken(status: number): boolean {
  return (
    status === 404 ||
    status === 405 ||
    status === 501 ||
    (status >= 500 && status <= 599)
  );
}
// 401/403 = attendu sur action non autorisée → loggé, non bloquant.
function isAuthExpected(status: number): boolean {
  return status === 401 || status === 403;
}

// Normalise l'URL (retire le host + querystring) pour un rapport lisible/groupable.
function shortUrl(rawUrl: string): string {
  try {
    const u = new URL(rawUrl);
    return u.pathname;
  } catch {
    return rawUrl;
  }
}

/** Attache le listener réseau et renvoie la liste accumulée + un détacheur. */
function attachApiListener(
  page: Page,
  hits: ApiHit[],
  currentRoute: () => string,
) {
  const onResponse = (r: Response) => {
    const url = r.url();
    if (!url.includes("/api/")) return;
    hits.push({
      method: r.request().method(),
      url: shortUrl(url),
      status: r.status(),
      route: currentRoute(),
    });
  };
  page.on("response", onResponse);
  return () => page.off("response", onResponse);
}

// ─── Parcours « sûr » d'une page ──────────────────────────────────────────────
async function exerciseRoute(page: Page, route: string): Promise<void> {
  await page.goto(route, { waitUntil: "domcontentloaded" }).catch(() => {});
  await page
    .waitForLoadState("networkidle", { timeout: 12000 })
    .catch(() => {});

  // Exercer les boutons « sûrs » visibles (max 14/page pour rester tenable).
  const buttons = page.getByRole("button");
  const count = Math.min(await buttons.count().catch(() => 0), 14);
  for (let i = 0; i < count; i++) {
    const btn = buttons.nth(i);
    try {
      if (!(await btn.isVisible()) || !(await btn.isEnabled())) continue;
      const label = ((await btn.textContent()) ?? "").trim().slice(0, 40);
      if (!label || DESTRUCTIVE.test(label) || !SAFE.test(label)) continue;

      await btn.click({ timeout: 4000 });
      await page.waitForTimeout(300);

      // Si une modale/confirmation s'est ouverte → on la ferme proprement.
      const cancel = page
        .getByRole("button", { name: /annuler|fermer|cancel|retour/i })
        .first();
      if (await cancel.isVisible().catch(() => false)) {
        await cancel.click({ timeout: 3000 }).catch(() => {});
        await page.waitForTimeout(150);
      }
      await page.keyboard.press("Escape").catch(() => {});
      await page.waitForTimeout(100);
    } catch {
      // Un clic en échec n'est pas le sujet ici (couvert par role-challenge) :
      // on cherche les requêtes /api cassées, captées par le listener réseau.
    }
  }
  // Marge pour laisser retomber les fetch asynchrones de la page.
  await page.waitForTimeout(250);
}

// ─── 1+2+3 : intégrité endpoints par rôle ─────────────────────────────────────
for (const role of ALL) {
  test(`Intégrité endpoints — aucun /api cassé en parcourant les pages (${role})`, async ({
    page,
  }) => {
    test.setTimeout(240_000);
    await loginAs(page, role);

    const hits: ApiHit[] = [];
    let current = "/(login)";
    const detach = attachApiListener(page, hits, () => current);

    try {
      for (const route of ROUTES[role]) {
        current = route;
        await exerciseRoute(page, route);
      }
    } finally {
      detach();
    }

    // Tri des anomalies.
    const broken = hits.filter((h) => isBroken(h.status));
    const authExpected = hits.filter((h) => isAuthExpected(h.status));
    const total = hits.length;

    // Dédup pour un rapport lisible (méthode+URL+statut+route unique).
    const dedupe = (arr: ApiHit[]) => {
      const seen = new Set<string>();
      const out: ApiHit[] = [];
      for (const h of arr) {
        const key = `${h.method} ${h.url} ${h.status} @${h.route}`;
        if (seen.has(key)) continue;
        seen.add(key);
        out.push(h);
      }
      return out;
    };
    const brokenU = dedupe(broken);
    const authU = dedupe(authExpected);

    const fmt = (h: ApiHit) =>
      `  [${h.status}] ${h.method} ${h.url}  (page: ${h.route})`;

    console.log(
      `\n===== ENDPOINT INTEGRITY [${role}] =====\n` +
        `  Total requêtes /api observées : ${total}\n` +
        `  Cassées (404/405/501/5xx)     : ${brokenU.length} (uniques)\n` +
        `  401/403 attendus (loggés)     : ${authU.length} (uniques)\n` +
        (brokenU.length
          ? `\n  --- ENDPOINTS MORTS / CASSÉS ---\n${brokenU.map(fmt).join("\n")}\n`
          : `\n  Aucun endpoint cassé. ✅\n`) +
        (authU.length
          ? `\n  --- 401/403 (attendus, non bloquants) ---\n${authU.map(fmt).join("\n")}\n`
          : ``),
    );

    // SOFT : un endpoint mort/cassé est un bug à reporter, sans stopper le rapport.
    expect
      .soft(
        brokenU,
        `[${role}] endpoint(s) /api mort(s)/cassé(s) :\n${brokenU.map(fmt).join("\n")}`,
      )
      .toEqual([]);
  });
}

// ─── 4 : soumissibilité des formulaires clés ──────────────────────────────────
// Pour chaque flux : on ouvre, remplit le minimum requis (horodaté), soumet, et
// on vérifie soit un 2xx sur la requête de soumission, soit une validation inline
// cohérente — JAMAIS un 404/500 ni un bouton submit inerte.

interface SubmitOutcome {
  /** Au moins une réponse /api 2xx observée pour la soumission. */
  got2xx: boolean;
  /** Une réponse /api cassée (404/405/501/5xx) a été observée. */
  gotBroken: boolean;
  /** Liste des réponses /api cassées (pour rapport). */
  brokenHits: ApiHit[];
  /**
   * Validation côté serveur (400/409/422 sur la mutation) : l'endpoint est VIVANT
   * et a rendu un verdict de validation cohérent → l'action EST soumissible.
   */
  serverValidation: ApiHit[];
  /** Validation inline visible (l'UI a réagi proprement). */
  inlineValidation: boolean;
  /** Navigation observée (URL changée → succès probable). */
  navigated: boolean;
}

/**
 * Exécute `submit()` en capturant les réponses /api, et juge l'issue :
 * succès si 2xx OU navigation OU validation inline ; échec uniquement si /api cassé
 * ou si rien ne s'est produit (bouton inerte).
 */
async function judgeSubmit(
  page: Page,
  label: string,
  submit: () => Promise<void>,
): Promise<SubmitOutcome> {
  const hits: ApiHit[] = [];
  const urlBefore = page.url();
  const detach = attachApiListener(page, hits, () => label);
  try {
    await submit();
    // Laisse la requête de soumission + redirection éventuelle retomber.
    await page.waitForTimeout(1500);
    await page.waitForLoadState("networkidle", { timeout: 8000 }).catch(() => {});
  } finally {
    detach();
  }

  const mutations = hits.filter((h) =>
    ["POST", "PUT", "PATCH"].includes(h.method),
  );
  const got2xx = mutations.some((h) => h.status >= 200 && h.status < 300);
  // 400/409/422 = validation/conflit côté serveur : endpoint vivant, verdict
  // cohérent. (401/403 = autorisation, traité ailleurs ; pas un échec de soumis.)
  const serverValidation = mutations.filter((h) =>
    [400, 409, 422].includes(h.status),
  );
  const brokenHits = hits.filter((h) => isBroken(h.status));
  const navigated = page.url() !== urlBefore;

  // Validation inline : message d'erreur de champ visible (l'UI a réagi).
  const inlineValidation = await page
    .locator(
      "[role='alert'], .error, .field-error, .input-error, [aria-invalid='true'], .text-error",
    )
    .first()
    .isVisible()
    .catch(() => false);

  return {
    got2xx,
    gotBroken: brokenHits.length > 0,
    brokenHits,
    serverValidation,
    inlineValidation,
    navigated,
  };
}

function assertSubmittable(
  role: AppRole,
  flow: string,
  o: SubmitOutcome,
): void {
  const fmt = (h: ApiHit) => `[${h.status}] ${h.method} ${h.url}`;
  const validationStatuses = o.serverValidation.map((h) => h.status).join(",");
  console.log(
    `\n----- SUBMITTABILITY [${role}] ${flow} -----\n` +
      `  2xx mutation : ${o.got2xx} | navigated : ${o.navigated} | ` +
      `server-validation : ${o.serverValidation.length ? validationStatuses : "non"} | ` +
      `inline-validation : ${o.inlineValidation} | broken /api : ${o.gotBroken}\n` +
      (o.brokenHits.length
        ? `  CASSÉ : ${o.brokenHits.map(fmt).join(", ")}\n`
        : ``),
  );

  // 1) JAMAIS de /api cassé sur la soumission (404/405/501/5xx = endpoint mort).
  expect
    .soft(
      o.gotBroken,
      `[${role}] ${flow} : soumission a tapé un endpoint cassé → ${o.brokenHits
        .map(fmt)
        .join(", ")}`,
    )
    .toBe(false);

  // 2) Le bouton submit FAIT quelque chose : succès (2xx/navigation) OU verdict
  //    de validation cohérent (serveur 400/409/422 OU message inline). Sinon =
  //    action impossible à soumettre (bouton inerte, aucune requête partie).
  const acted =
    o.got2xx ||
    o.navigated ||
    o.serverValidation.length > 0 ||
    o.inlineValidation;
  expect
    .soft(
      acted,
      `[${role}] ${flow} : action IMPOSSIBLE à soumettre — ni 2xx, ni navigation, ni validation serveur (400/409/422), ni validation inline (bouton inerte ?)`,
    )
    .toBe(true);
}

// ── Employee : création mobilité ──────────────────────────────────────────────
test("Soumissibilité — création mobilité (employee)", async ({ page }) => {
  test.setTimeout(90_000);
  await loginAs(page, "employee");
  await page.goto("/mobility", { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {});

  await page.getByRole("button", { name: "+ Nouvelle demande" }).click();
  await expect(
    page.getByRole("heading", { name: "Nouvelle demande" }),
  ).toBeVisible();

  // Catégorie « Mobilité » (défaut, POSITION_CATEGORY) → seul « Poste visé » requis.
  await page.getByLabel("Type de demande").selectOption({ label: "Mobilité" });
  const targetPosition = `E2E endpoint-integrity ${Date.now()}`;
  await page
    .getByLabel("Poste visé", { exact: true })
    .fill(targetPosition);
  await page
    .getByLabel("Description de la demande")
    .fill("Soumissibilité endpoint-integrity (issue #96).");

  const outcome = await judgeSubmit(page, "mobilité/create", async () => {
    await page.getByRole("button", { name: "Soumettre" }).click();
  });
  assertSubmittable("employee", "création mobilité", outcome);
});

// ── Manager & HR : création formulaire (builder /forms/new) ────────────────────
async function fillAndSubmitForm(page: Page): Promise<SubmitOutcome> {
  await page.goto("/forms/new", { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {});

  // Titre (minimum requis pour enregistrer un brouillon de formulaire).
  await page
    .getByPlaceholder("Titre du formulaire")
    .fill(`Formulaire E2E #96 ${Date.now()}`);

  // Une question texte libre (le builder exige ≥ 1 question valide).
  const addQ = page
    .getByRole("button", {
      name: /Ajouter (la première )?une? question|Ajouter la première question/i,
    })
    .first();
  if (await addQ.isVisible().catch(() => false)) {
    await addQ.click();
    await page.waitForTimeout(300);
    const qTitle = page.getByPlaceholder("Ex : Comment évaluez-vous…").first();
    if (await qTitle.isVisible().catch(() => false)) {
      await qTitle.fill("Question E2E intégrité");
      // « Texte libre » → pas d'options à fournir.
      await page
        .getByRole("button", { name: "Texte libre", exact: true })
        .first()
        .click()
        .catch(() => {});
      await page.waitForTimeout(200);
    }
  }

  return judgeSubmit(page, "formulaire/create", async () => {
    await page.getByRole("button", { name: /^Enregistrer$/ }).click();
  });
}

test("Soumissibilité — création formulaire (manager)", async ({ page }) => {
  test.setTimeout(90_000);
  await loginAs(page, "manager");
  const outcome = await fillAndSubmitForm(page);
  assertSubmittable("manager", "création formulaire", outcome);
});

test("Soumissibilité — création formulaire (hr)", async ({ page }) => {
  test.setTimeout(90_000);
  await loginAs(page, "hr");
  const outcome = await fillAndSubmitForm(page);
  assertSubmittable("hr", "création formulaire", outcome);
});

// ── HR : création campagne (wizard /campaigns/new, 4 étapes) ───────────────────
test("Soumissibilité — création campagne (hr)", async ({ page }) => {
  test.setTimeout(90_000);
  await loginAs(page, "hr");
  await page.goto("/campaigns/new", { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {});

  const ts = Date.now();
  // Étape 0 — Informations (nom + dates requis ; description optionnelle).
  await page.locator("#campaign-name").fill(`Campagne E2E #96 ${ts}`);
  await page
    .locator("#campaign-description")
    .fill("Soumissibilité endpoint-integrity.")
    .catch(() => {});
  await page.locator("#campaign-start-date").fill("2026-10-01");
  await page.locator("#campaign-end-date").fill("2026-12-31");

  // 0 → 1 → 2 → 3 : trois « Suivant ».
  for (let i = 0; i < 3; i++) {
    await page.getByRole("button", { name: /suivant/i }).click();
    await page.waitForTimeout(400);
  }

  const outcome = await judgeSubmit(page, "campagne/create", async () => {
    await page.getByRole("button", { name: /créer la campagne/i }).click();
  });
  assertSubmittable("hr", "création campagne", outcome);
});
