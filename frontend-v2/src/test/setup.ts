import "@testing-library/jest-dom";
import { beforeAll, afterEach, afterAll } from "vitest";
import { server } from "./msw/server";
// Initialise i18next (effet de bord à l'import) pour que les composants utilisant
// useTranslation() rendent les libellés FR au lieu des clés brutes dans les tests.
import i18n from "../i18n";

// Force le FR (le LanguageDetector choisirait sinon la locale du navigateur jsdom).
beforeAll(() => {
  void i18n.changeLanguage("fr");
});

beforeAll(() => server.listen({ onUnhandledRequest: "warn" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
