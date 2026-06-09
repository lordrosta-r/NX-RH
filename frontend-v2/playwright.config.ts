import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: 1,
  reporter: process.env.CI ? "github" : "list",
  globalSetup: "./e2e/global-setup.ts",
  use: {
    // Par défaut : stack Docker prod sur https://localhost
    // Override avec: E2E_BASE_URL=http://localhost:5173 pour le dev Vite
    baseURL: process.env.E2E_BASE_URL || "https://localhost",
    ignoreHTTPSErrors: true, // Certificat auto-signé en local
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    headless: process.env.HEADED !== "true",
    launchOptions: {
      // Rapide par défaut, même en headed. Mettre SLOWMO=500 pour suivre à l'œil.
      slowMo: Number(process.env.SLOWMO) || 0,
    },
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        locale: "fr-FR", // Force le français pour que i18n soit cohérent avec les labels UI
        video: "retain-on-failure",
      },
    },
  ],
  // Pas de webServer — la stack Docker doit tourner avant les tests
  // Lancer avec: docker compose --env-file .env -f docker/docker-compose.yml up -d
});
