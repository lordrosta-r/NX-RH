import { Page } from "@playwright/test";

export type AppRole = "admin" | "hr" | "manager" | "employee";

// Credentials du seed prod (seeds/seed.js) — domain @nxrh.local
const CREDENTIALS: Record<AppRole, { email: string; password: string }> = {
  admin: { email: "alice@nxrh.local", password: "password123" },
  hr: { email: "marie.dupont@nxrh.local", password: "password123" },
  manager: { email: "pierre.leclerc@nxrh.local", password: "password123" },
  employee: { email: "lucas.bernard@nxrh.local", password: "password123" },
};

export async function loginAs(page: Page, role: AppRole) {
  await page.goto("/login");
  // Attendre que la page soit complètement chargée (JS hydraté)
  await page.waitForLoadState("networkidle");
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
  // Ouvrir le menu utilisateur
  await page.locator('[data-testid="user-menu-button"]').click();
  // Attendre que le dropdown soit visible avant d'agir
  const menuItem = page.getByRole("menuitem", {
    name: /se déconnecter|déconnexion|logout/i,
  });
  await menuItem.waitFor({ state: "visible", timeout: 5000 });
  await menuItem.click();
  await page.waitForURL(/\/login/, { timeout: 10000 });
}
