import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    environmentOptions: {
      jsdom: { url: "http://localhost:5050" },
    },
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    // Tests unitaires/intégration uniquement dans src/. Les specs Playwright
    // (e2e/*.spec.ts) sont exécutées par Playwright, pas par Vitest.
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    css: false,
    // Tests d'intégration lourds (rendu + MSW + waitFor) : timeout généreux +
    // exécution séquentielle des fichiers (évite la contention CPU qui cause des
    // timeouts sur les runners CI). Le nettoyage des timers/mocks dans setup.ts
    // empêche toute fuite entre fichiers en mode worker unique.
    testTimeout: 20000,
    hookTimeout: 20000,
    fileParallelism: false,
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
