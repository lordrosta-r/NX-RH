import { test, expect } from "@playwright/test";
import { loginAs, loginViaForm, logout } from "./helpers/auth";
import { LoginPage } from "./page-objects/LoginPage";

test.describe("Authentication", () => {
  test("login reussi - admin", async ({ page }) => {
    await loginViaForm(page, "admin");
    await expect(page).toHaveURL("/");
    await expect(page.getByText(/administration/i).first()).toBeVisible({
      timeout: 10000,
    });
  });

  test("login reussi - hr", async ({ page }) => {
    await loginViaForm(page, "hr");
    await expect(page).toHaveURL("/");
    await expect(page.locator("body")).not.toContainText(/erreur|error/i);
  });

  test("login reussi - manager", async ({ page }) => {
    await loginViaForm(page, "manager");
    await expect(page).toHaveURL("/");
    await expect(page.locator("body")).not.toContainText(/erreur|error/i);
  });

  test("login reussi - employee", async ({ page }) => {
    await loginViaForm(page, "employee");
    await expect(page).toHaveURL("/");
    await expect(page.locator("body")).not.toContainText(/erreur|error/i);
  });

  test("login echoue - mauvais mot de passe", async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login("admin@nx-rh.fr", "WrongPassword123");

    await expect(page).toHaveURL(/\/login/);
    await expect(
      page.getByText(/incorrect|invalide|erreur|invalid/i).first(),
    ).toBeVisible({ timeout: 5000 });
  });

  test("login echoue - email inexistant", async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login("inexistant@nx-rh.fr", "Test1234!");

    await expect(page).toHaveURL(/\/login/);
    await expect(
      page
        .getByText(
          /incorrect|invalide|erreur|invalid|utilisateur.*introuvable/i,
        )
        .first(),
    ).toBeVisible({ timeout: 5000 });
  });

  test("logout - redirection vers login", async ({ page }) => {
    await loginAs(page, "admin");
    await logout(page);
    await expect(page).toHaveURL(/\/login/);
  });

  test("acces page protegee sans auth -> redirect /login", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
  });

  test("acces /evaluations sans auth -> redirect /login", async ({ page }) => {
    await page.goto("/evaluations");
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
  });

  test("acces /admin en tant qu'employee -> acces refuse", async ({ page }) => {
    await loginAs(page, "employee");
    await page.goto("/admin");
    await page.waitForLoadState("networkidle");
    await expect(page).not.toHaveURL("/admin");
  });
});
