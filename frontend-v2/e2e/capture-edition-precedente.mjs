// Captures de la feature « Édition précédente » (Phase 1-2).
// RH (builder + campagne) · Employé (accordéon + contre-exemples) · Manager.
import { chromium, request } from "@playwright/test";
import fs from "fs";

const SHOTS = "e2e/screenshots/edition";
fs.mkdirSync(SHOTS, { recursive: true });
const d = JSON.parse(fs.readFileSync("e2e/.edition-demo.json", "utf8"));
const VP = { width: 1440, height: 1300 };

async function cookiesFor(email, password) {
  const ctx = await request.newContext({ baseURL: "https://localhost", ignoreHTTPSErrors: true, timeout: 30000 });
  const r = await ctx.post("/api/auth/login", { data: { email, password } });
  if (!r.ok()) { console.log(`login ${email} → ${r.status()}`, (await r.text()).slice(0, 120)); }
  const { cookies } = await ctx.storageState();
  await ctx.dispose();
  return cookies;
}

async function newPage(browser, cookies) {
  const ctx = await browser.newContext({ ignoreHTTPSErrors: true, baseURL: "https://localhost", viewport: VP });
  ctx.setDefaultTimeout(45000); ctx.setDefaultNavigationTimeout(60000);
  await ctx.addCookies(cookies);
  const page = await ctx.newPage();
  return page;
}
const shot = (page, n) => page.screenshot({ path: `${SHOTS}/${n}`, fullPage: true });
const expandAccordion = async (page) => {
  const sum = page.getByText("Édition précédente", { exact: false }).last();
  if (await sum.isVisible().catch(() => false)) { await sum.click().catch(() => {}); await page.waitForTimeout(400); }
};
const nextQuestion = async (page) => {
  const b = page.getByRole("button", { name: /Suivant/i });
  if (await b.isVisible().catch(() => false)) { await b.click(); await page.waitForTimeout(500); }
};

const browser = await chromium.launch();

// ── RH (admin) ────────────────────────────────────────────────────────────────
{
  const page = await newPage(browser, await cookiesFor("alice@nxrh.local", "password123"));

  // Builder du form courant : sélectionner Q1 → panneau config avec le toggle
  await page.goto(`/forms/${d.fCurrent}`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3500);
  await page.getByText(/QUESTION 01/).first().click().catch(() => {});
  await page.waitForTimeout(700);
  await shot(page, "rh-01-builder-toggle.png");
  console.log("RH builder OK:", page.url());

  // Édition de campagne : section « Édition précédente »
  await page.goto(`/campaigns/${d.c2026}/edit`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3000);
  await page.getByText(/Édition précédente/i).first().scrollIntoViewIfNeeded().catch(() => {});
  await page.waitForTimeout(400);
  await shot(page, "rh-02-campagne-edition.png");
  console.log("RH campagne OK");
  await page.context().close();
}

// ── Employé (Emma) ──────────────────────────────────────────────────────────────
{
  const page = await newPage(browser, await cookiesFor(`emma.${d.ts}@nxrh.local`, d.emmaPwd));
  page.on("response", (r) => { if (r.url().includes("n1-context")) console.log("  n1-context:", r.status()); });

  await page.goto(`/evaluations/${d.e26self}`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3500);
  await shot(page, "emp-01-accordion-collapsed.png");
  await expandAccordion(page);
  await shot(page, "emp-02-accordion-open.png");
  console.log("Employé Q1 OK");

  // Aller à la dernière question (q-axe, NON reprise) → pas d'accordéon
  await nextQuestion(page); await nextQuestion(page); await nextQuestion(page);
  await shot(page, "emp-03-question-non-reprise.png");
  console.log("Employé Q non reprise OK");

  // Contre-exemple : campagne Humeur (aucune reprise)
  await page.goto(`/evaluations/${d.eHumeur}`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3000);
  await shot(page, "emp-04-humeur-aucune-reprise.png");
  console.log("Employé Humeur OK");
  await page.context().close();
}

// ── Manager (Marc) ──────────────────────────────────────────────────────────────
{
  const page = await newPage(browser, await cookiesFor(`marc.${d.ts}@nxrh.local`, d.marcPwd));
  page.on("response", (r) => { if (r.url().includes("n1-context")) console.log("  n1-context:", r.status()); });

  await page.goto(`/evaluations/${d.e26mgr}`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3500);
  await expandAccordion(page);
  await shot(page, "mgr-01-accordion-open.png");
  console.log("Manager Q1 OK");
  await page.context().close();
}

await browser.close();
console.log("\n✓ Captures dans", SHOTS);
