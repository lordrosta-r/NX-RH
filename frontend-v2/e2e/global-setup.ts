import { request } from "@playwright/test";

/**
 * global-setup.ts — Vérifie que la stack Docker est up avant les tests.
 * Si https://localhost/api/health ne répond pas, les tests échouent immédiatement
 * avec un message clair plutôt qu'une série d'erreurs cryptiques.
 */
export default async function globalSetup() {
  const baseURL = process.env.E2E_BASE_URL || "https://localhost";

  const ctx = await request.newContext({ ignoreHTTPSErrors: true });

  try {
    const res = await ctx.get(`${baseURL}/api/health`, { timeout: 10_000 });
    if (!res.ok()) {
      throw new Error(`Health check returned ${res.status()}`);
    }
    const body = await res.json();
    console.log(
      `\n✅ Stack up — env: ${body.environment}, DB: ${body.database?.status}\n`,
    );
  } catch (err) {
    throw new Error(
      `\n❌ Stack Docker non disponible sur ${baseURL}\n` +
        `   Lance d'abord: docker compose -f docker-compose.yml up -d\n` +
        `   Erreur: ${err}\n`,
      { cause: err },
    );
  } finally {
    await ctx.dispose();
  }
}
