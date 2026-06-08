import "@testing-library/jest-dom";
import { beforeAll, afterEach, afterAll, vi } from "vitest";
import { server } from "./msw/server";
// Initialise i18next (effet de bord à l'import) pour que les composants utilisant
// useTranslation() rendent les libellés FR au lieu des clés brutes dans les tests.
import i18n from "../i18n";

// Force le FR (le LanguageDetector choisirait sinon la locale du navigateur jsdom).
beforeAll(() => {
  void i18n.changeLanguage("fr");
});

beforeAll(() => server.listen({ onUnhandledRequest: "warn" }));
afterEach(() => {
  server.resetHandlers();
  // Évite toute fuite de faux timers / mocks entre fichiers de test (sinon les
  // appels async réels — blobs, axios — peuvent rester bloqués jusqu'au timeout).
  vi.useRealTimers();
  vi.restoreAllMocks();
});
afterAll(() => server.close());
