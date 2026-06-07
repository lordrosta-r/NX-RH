// Script autonome (hors test-runner) pour capturer le builder de formulaires.
// Timeouts généreux car la stack Docker locale est lente sous charge mongo.
//   node e2e/capture-builder.mjs
import { chromium, request } from "@playwright/test";
import fs from "fs";

const BASE = process.env.E2E_BASE_URL || "https://localhost";
const SHOTS = "e2e/screenshots";
const CACHE = "e2e/.auth-admin.json";
const CRED = { email: "alice@nxrh.local", password: "password123" };

async function loginCookies() {
  // Réutilise un cookie en cache (< 30 min) pour éviter le rate-limit login (5/15min).
  try {
    const st = fs.statSync(CACHE);
    if (Date.now() - st.mtimeMs < 30 * 60 * 1000) {
      console.log("login: réutilisation du cookie en cache");
      return JSON.parse(fs.readFileSync(CACHE, "utf8"));
    }
  } catch {
    /* pas de cache */
  }
  const ctx = await request.newContext({
    baseURL: BASE,
    ignoreHTTPSErrors: true,
    timeout: 30000,
  });
  const res = await ctx.post("/api/auth/login", { data: CRED });
  if (!res.ok()) {
    await ctx.dispose();
    throw new Error(`login HTTP ${res.status()} (rate-limit ? attends 15 min)`);
  }
  const { cookies } = await ctx.storageState();
  await ctx.dispose();
  fs.writeFileSync(CACHE, JSON.stringify(cookies));
  console.log("login: ok, cookie mis en cache");
  return cookies;
}

const shot = (page, name) =>
  page.screenshot({ path: `${SHOTS}/${name}`, fullPage: true });

async function main() {
  const cookies = await loginCookies();
  const browser = await chromium.launch();
  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
    baseURL: BASE,
    viewport: { width: 1440, height: 1000 },
  });
  context.setDefaultTimeout(45000);
  context.setDefaultNavigationTimeout(60000);
  await context.addCookies(cookies);
  const page = await context.newPage();
  page.on("console", (m) => {
    if (m.type() === "error") console.log("CONSOLE ERR:", m.text());
  });
  page.on("response", async (r) => {
    const u = r.url();
    if (u.includes("/api/forms") || u.includes("/api/form-categories")) {
      let body = "";
      if (r.status() >= 400) {
        try {
          body = " BODY=" + (await r.text());
        } catch {
          /* ignore */
        }
      }
      console.log("RESP", r.status(), r.request().method(), u + body);
    }
  });

  // ── CRÉATION ──
  await page.goto("/forms/new", { waitUntil: "domcontentloaded" });
  await page.waitForSelector('input[placeholder="Titre du formulaire"]');
  await page.waitForTimeout(1500);
  await shot(page, "builder-01-vide.png");

  await page
    .getByPlaceholder("Titre du formulaire")
    .fill("Questionnaire onboarding 2026");

  // Catégorie personnalisée
  await page.getByRole("button", { name: /Nouvelle/i }).click();
  const catInput = page.getByPlaceholder("Nom de la catégorie");
  await catInput.fill("Onboarding");
  await shot(page, "builder-02-nouvelle-categorie.png");
  await catInput.press("Enter");
  await page.waitForTimeout(2500); // POST /api/form-categories (mongo lent)
  // Sélection explicite (robuste même si la catégorie préexiste d'un run antérieur).
  await page
    .locator('select:has(option:text-is("Onboarding"))')
    .selectOption({ label: "Onboarding" });
  await page.waitForTimeout(400);

  // Trois questions
  const addBtn = () =>
    page.getByRole("button", {
      name: /Ajouter (la première question|une question)/i,
    });
  await addBtn().first().click();
  await page.waitForTimeout(400);
  await addBtn().first().click();
  await page.waitForTimeout(400);
  await addBtn().first().click();
  await page.waitForTimeout(400);
  await shot(page, "builder-03-trois-questions.png");

  // Configurer chaque question
  const titles = [
    "Comment s'est passée ta première semaine ?",
    "Quels outils dois-tu encore maîtriser ?",
    "Note ton intégration dans l'équipe",
  ];
  const types = ["Texte libre", "Note (1-10)", "Oui / Non"];
  for (let i = 0; i < 3; i++) {
    await page.getByText(new RegExp(`QUESTION 0${i + 1}`)).click();
    await page.getByPlaceholder("Ex : Comment évaluez-vous…").fill(titles[i]);
    await page.getByRole("button", { name: types[i], exact: true }).click();
    await page.waitForTimeout(300);
  }
  await page.getByText(/QUESTION 01/).click();
  await page.waitForTimeout(300);
  await shot(page, "builder-04-config-question.png");

  // Drag-and-drop : question 1 → sous la 3
  const handles = page.getByRole("button", {
    name: "Déplacer la question",
    exact: true,
  });
  const sb = await handles.nth(0).boundingBox();
  const db = await handles.nth(2).boundingBox();
  if (sb && db) {
    await page.mouse.move(sb.x + sb.width / 2, sb.y + sb.height / 2);
    await page.mouse.down();
    await page.mouse.move(sb.x + sb.width / 2, sb.y + sb.height / 2 + 10);
    await page.mouse.move(db.x + db.width / 2, db.y + db.height / 2 + 30, {
      steps: 14,
    });
    await page.mouse.up();
    await page.waitForTimeout(600);
  }
  await shot(page, "builder-05-apres-drag.png");

  // Enregistrer → édition
  await page.getByRole("button", { name: /^Enregistrer$/ }).click();
  await page.waitForTimeout(2000);
  await shot(page, "builder-05b-apres-clic-save.png");
  await page.waitForURL(/\/forms\/[a-f0-9]{24}/, { timeout: 90000 });
  await page.waitForLoadState("domcontentloaded");
  await page.waitForTimeout(2000);
  await shot(page, "builder-06-edition.png");

  // ── MODIFICATION ── : changer un intitulé + ajouter une question
  await page.getByText(/QUESTION 02/).click();
  await page.waitForTimeout(300);
  await page
    .getByPlaceholder("Ex : Comment évaluez-vous…")
    .fill("Quels outils maîtrises-tu déjà ? (modifié)");
  await page.waitForTimeout(300);
  await shot(page, "builder-07-modification.png");

  const url = page.url();
  console.log("OK — formulaire créé/édité:", url);
  await browser.close();
}

main().catch((e) => {
  console.error("ÉCHEC:", e);
  process.exit(1);
});
