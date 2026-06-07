// Captures Vague 2 : dashboard manager « À traiter » + Vue Entretien.
import { chromium, request } from "@playwright/test";
import fs from "fs";

const SHOTS = "e2e/screenshots/edition";
fs.mkdirSync(SHOTS, { recursive: true });
const d = JSON.parse(fs.readFileSync("e2e/.edition-demo.json", "utf8"));
const VP = { width: 1440, height: 1300 };

async function cookiesFor(email, password) {
  const ctx = await request.newContext({ baseURL: "https://localhost", ignoreHTTPSErrors: true, timeout: 30000 });
  const r = await ctx.post("/api/auth/login", { data: { email, password } });
  if (!r.ok()) console.log(`login ${email} → ${r.status()}`);
  const { cookies } = await ctx.storageState();
  await ctx.dispose();
  return cookies;
}
async function newPage(browser, cookies) {
  const ctx = await browser.newContext({ ignoreHTTPSErrors: true, baseURL: "https://localhost", viewport: VP });
  ctx.setDefaultTimeout(45000); ctx.setDefaultNavigationTimeout(60000);
  await ctx.addCookies(cookies);
  return ctx.newPage();
}
const shot = (page, n) => page.screenshot({ path: `${SHOTS}/${n}`, fullPage: true });

const browser = await chromium.launch();

// Dashboard manager « À traiter » (Marc)
{
  const page = await newPage(browser, await cookiesFor(`marc.${d.ts}@nxrh.local`, d.marcPwd));
  await page.goto("/manager/todo", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3500);
  await shot(page, "v2-mgr-todo.png");
  console.log("manager todo OK:", page.url());
  await page.context().close();
}

// Vue Entretien (admin, accès total) pour le duo Emma/C2026
{
  const page = await newPage(browser, await cookiesFor("alice@nxrh.local", "password123"));
  page.on("response", (r) => { if (r.url().includes("/api/interviews")) console.log("  interviews:", r.status()); });
  await page.goto(`/interview?campaignId=${d.c2026}&evaluateeId=${d.emma}`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3500);
  await shot(page, "v2-interview.png");
  console.log("interview OK:", page.url());
  await page.context().close();
}

await browser.close();
console.log("\n✓ Captures Vague 2 dans", SHOTS);
