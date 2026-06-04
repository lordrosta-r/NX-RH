import { type Page, type BrowserContext, request } from "@playwright/test";

export type AppRole = "admin" | "hr" | "manager" | "employee";

// Credentials du seed e2e (mongo/server/seeds/seed.js) — domain @nxrh.local
const CREDENTIALS: Record<AppRole, { email: string; password: string }> = {
  admin: { email: "alice@nxrh.local", password: "password123" },
  hr: { email: "marie.dupont@nxrh.local", password: "password123" },
  manager: { email: "pierre.leclerc@nxrh.local", password: "password123" },
  employee: { email: "lucas.bernard@nxrh.local", password: "password123" },
};

const BASE_URL = process.env.E2E_BASE_URL || "https://localhost";

type CookieParam = Parameters<BrowserContext["addCookies"]>[0][number];

// Cache des cookies de session par rôle (1 login API par rôle pour tout le run).
// Évite de marteler /api/auth/login (rate-limit) et accélère massivement la suite :
// les beforeEach injectent les cookies au lieu de rejouer le formulaire.
const cookieCache: Partial<Record<AppRole, CookieParam[]>> = {};

async function getAuthCookies(role: AppRole): Promise<CookieParam[]> {
  const cached = cookieCache[role];
  if (cached) return cached;

  const ctx = await request.newContext({
    baseURL: BASE_URL,
    ignoreHTTPSErrors: true,
  });
  const res = await ctx.post("/api/auth/login", { data: CREDENTIALS[role] });
  if (!res.ok()) {
    await ctx.dispose();
    throw new Error(
      `Login ${role} échoué (HTTP ${res.status()}) — seed e2e chargé ?`,
    );
  }
  const { cookies } = await ctx.storageState();
  await ctx.dispose();
  cookieCache[role] = cookies;
  return cookies;
}

/**
 * Authentifie la page via injection de cookies (rapide, sans formulaire).
 * Utiliser dans les beforeEach — un seul vrai login par rôle pour tout le run.
 */
export async function loginAs(page: Page, role: AppRole) {
  const cookies = await getAuthCookies(role);
  await page.context().addCookies(cookies);
  await page.goto("/");
  await page.waitForLoadState("domcontentloaded");
}

/**
 * Authentifie via le formulaire de login réel (teste l'UX de connexion).
 * Réservé aux specs qui valident explicitement le parcours de login (auth.spec).
 */
export async function loginViaForm(page: Page, role: AppRole) {
  await page.goto("/login");
  await page.waitForSelector('[data-testid="login-email"]', { timeout: 10000 });
  await page
    .locator('[data-testid="login-email"]')
    .fill(CREDENTIALS[role].email);
  await page
    .locator('[data-testid="login-password"]')
    .fill(CREDENTIALS[role].password);
  await page.locator('[data-testid="login-submit"]').click();
  await page.waitForURL("/", { timeout: 20000 });
}

export async function logout(page: Page) {
  await page.locator('[data-testid="user-menu-button"]').click();
  const menuItem = page.getByRole("menuitem", {
    name: /se déconnecter|déconnexion|logout/i,
  });
  await menuItem.waitFor({ state: "visible", timeout: 5000 });
  await menuItem.click();
  await page.waitForURL(/\/login/, { timeout: 10000 });
}
