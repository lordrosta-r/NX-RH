import { test, expect } from "@playwright/test";

test.describe("Smoke tests — parcours critiques", () => {
  test("page login accessible", async ({ page }) => {
    await page.goto("/");
    // Doit rediriger vers login si non authentifié
    await expect(page).toHaveURL(/login/);
    await expect(page.locator('[data-testid="login-email"]')).toBeVisible();
    await expect(page.locator('[data-testid="login-password"]')).toBeVisible();
    await expect(page.locator('[data-testid="login-submit"]')).toBeVisible();
  });

  test("titre de page login correct", async ({ page }) => {
    await page.goto("/login");
    await expect(page).toHaveTitle(/NX-RH|NanoXplore/i);
  });

  test("formulaire login — champs requis", async ({ page }) => {
    await page.goto("/login");
    await page.click('[data-testid="login-submit"]');
    // Doit afficher une erreur de validation
    await expect(
      page.locator("text=/requis|required|obligatoire/i"),
    ).toBeVisible();
  });

  test("login avec mauvais credentials", async ({ page }) => {
    await page.goto("/login");
    await page.fill('[data-testid="login-email"]', "wrong@example.com");
    await page.fill('[data-testid="login-password"]', "wrongpassword");
    await page.click('[data-testid="login-submit"]');
    await expect(page.locator("text=/invalide|incorrect|erreur/i")).toBeVisible(
      { timeout: 5000 },
    );
  });
});
