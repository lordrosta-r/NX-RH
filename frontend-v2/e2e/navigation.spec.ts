import { test, expect } from "@playwright/test";

// Helper pour se connecter
async function login(
  page: import("@playwright/test").Page,
  email = "admin@test.com",
  password = "password123",
) {
  await page.goto("/login");
  await page.fill('[data-testid="login-email"]', email);
  await page.fill('[data-testid="login-password"]', password);
  await page.click('[data-testid="login-submit"]');
  await page.waitForURL(/dashboard|home|\/$/);
}

test.describe("Navigation — après login", () => {
  // Ces tests nécessitent un backend running — skip en CI sans backend
  test.skip(
    !!process.env.CI && !process.env.E2E_BACKEND_URL,
    "Requires backend",
  );

  test("redirect vers login si non auth", async ({ page }) => {
    await page.goto("/campaigns");
    await expect(page).toHaveURL(/login/);
  });
});

// Exported for potential reuse in other specs
export { login };
