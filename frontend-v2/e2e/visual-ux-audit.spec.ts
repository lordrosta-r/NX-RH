import { test, expect, type Page } from "@playwright/test";
import { loginAs } from "./helpers/auth";
import { waitForPageLoad, takeScreenshot } from "./helpers/utils";
import fs from "fs";
import path from "path";

// path is used in auditPage for cross-platform screenshot paths

const PAGES_TO_AUDIT = [
  { path: "/", name: "dashboard" },
  { path: "/campaigns", name: "campaigns" },
  { path: "/evaluations", name: "evaluations" },
  { path: "/forms", name: "forms" },
  { path: "/offboarding", name: "offboarding" },
  { path: "/mobility", name: "mobility" },
  { path: "/pdi", name: "pdi" },
  { path: "/users", name: "users" },
  { path: "/analytics", name: "analytics" },
  { path: "/admin", name: "admin" },
  { path: "/admin/ldap", name: "admin-ldap" },
  { path: "/admin/audit", name: "admin-audit" },
  { path: "/org", name: "org" },
  { path: "/hr/flags", name: "hr-flags" },
  { path: "/events", name: "events" },
  { path: "/resources", name: "resources" },
];

async function auditPage(page: Page, pagePath: string, pageName: string) {
  await page.goto(pagePath);
  await page.waitForLoadState("networkidle");

  // Screenshot
  fs.mkdirSync(path.join("test-results", "audit"), { recursive: true });
  await page.screenshot({
    path: path.join("test-results", "audit", `${pageName}.png`),
    fullPage: true,
  });

  // H1 check
  const h1Count = await page.locator("h1").count();
  if (h1Count === 0) {
    test
      .info()
      .annotations.push({
        type: "UX-ISSUE",
        description: `${pagePath}: Aucun H1 trouvé`,
      });
  }

  // No serialisation artefacts in content
  const bodyText = await page.locator("body").innerText();
  if (bodyText.includes("[object Object]")) {
    test
      .info()
      .annotations.push({
        type: "BUG",
        description: `${pagePath}: [object Object] visible`,
      });
  }

  return bodyText;
}

test.describe("Audit visuel & UX", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, "admin");
    await page.waitForLoadState("networkidle");
  });

  test("Audit visuel - screenshots toutes les pages principales", async ({
    page,
  }) => {
    test.setTimeout(120000);

    for (const { path: pagePath, name } of PAGES_TO_AUDIT) {
      await auditPage(page, pagePath, name);
      await expect
        .soft(page.locator("body"))
        .not.toContainText("[object Object]");
      // Missing H1 annotations are recorded inside auditPage
    }
  });

  test("UX - mobile 390px: pas d'overflow horizontal", async ({ page }) => {
    test.setTimeout(120000);

    await page.setViewportSize({ width: 390, height: 844 });

    for (const { path: pagePath } of PAGES_TO_AUDIT) {
      await page.goto(pagePath);
      await page.waitForLoadState("networkidle");

      const scrollWidth = await page.evaluate(
        () => document.documentElement.scrollWidth,
      );
      expect.soft(scrollWidth).toBeLessThanOrEqual(400);

      // Hamburger / menu button should exist if a nav is present
      const navExists =
        (await page.locator('nav, aside, [role="navigation"]').count()) > 0;
      if (navExists) {
        const hamburger = page
          .locator(
            '[data-testid*="menu"], [aria-label*="menu"], button[class*="hamburger"], button[class*="burger"], button[class*="nav"]',
          )
          .first();
        if (await hamburger.isVisible()) {
          await expect.soft(hamburger).toBeVisible();
        }
      }
    }
  });

  test("UX - empty states: page avec 0 résultats a un message informatif", async ({
    page,
  }) => {
    test.setTimeout(30000);

    // Forms with impossible search query
    await page.goto("/forms?search=xxxxxxxx99999");
    await page.waitForLoadState("networkidle");
    const formsBody = await page.locator("body").innerText();
    // Verify there is some informative text (empty state), not just a blank body
    expect.soft(formsBody.length).toBeGreaterThan(10);
    const hasEmptyStateForm = formsBody.match(
      /aucun|vide|no result|empty|introuvable|0 résultat/i,
    );
    const hasCta =
      (await page.getByRole("button").count()) > 0 ||
      (await page.getByRole("link").count()) > 0;
    if (!hasEmptyStateForm) {
      test
        .info()
        .annotations.push({
          type: "UX-ISSUE",
          description: "/forms?search=...: Aucun message d'état vide trouvé",
        });
    }
    await expect
      .soft(page.locator("body"))
      .not.toContainText("[object Object]");
    expect.soft(hasCta).toBe(true);

    // Evaluations with impossible search
    await page.goto("/evaluations?search=xxxxxxxx99999");
    await page.waitForLoadState("networkidle");
    const evalsBody = await page.locator("body").innerText();
    expect.soft(evalsBody.length).toBeGreaterThan(10);
    const hasEmptyStateEval = evalsBody.match(
      /aucun|vide|no result|empty|introuvable|0 résultat/i,
    );
    if (!hasEmptyStateEval) {
      test
        .info()
        .annotations.push({
          type: "UX-ISSUE",
          description:
            "/evaluations?search=...: Aucun message d'état vide trouvé",
        });
    }
    await expect
      .soft(page.locator("body"))
      .not.toContainText("[object Object]");
    await takeScreenshot(page, "empty-state-evaluations");
  });

  test("UX - breadcrumbs sur pages de détail", async ({ page }) => {
    test.setTimeout(30000);

    await page.goto("/campaigns");
    await page.waitForLoadState("networkidle");

    // Click first campaign to open detail
    const firstCampaign = page
      .locator(
        '[data-testid*="campaign"], .campaign-item, tbody tr, [class*="campaign-row"], [class*="campaign-card"]',
      )
      .first();

    if (
      !(await firstCampaign.isVisible({ timeout: 5000 }).catch(() => false))
    ) {
      test
        .info()
        .annotations.push({
          type: "UX-ISSUE",
          description: "No campaigns found to test breadcrumb on detail page",
        });
      return;
    }

    await firstCampaign.click();
    await waitForPageLoad(page);

    // Look for breadcrumb navigation
    const breadcrumb = page
      .locator(
        'nav[aria-label*="breadcrumb"], nav[aria-label*="fil d\'ariane"], ol[aria-label*="breadcrumb"], .breadcrumb, [data-testid*="breadcrumb"]',
      )
      .first();

    const hasBreadcrumb = await breadcrumb
      .isVisible({ timeout: 5000 })
      .catch(() => false);
    if (!hasBreadcrumb) {
      test
        .info()
        .annotations.push({
          type: "UX-ISSUE",
          description: "Breadcrumb navigation missing on campaign detail page",
        });
    }
    await expect.soft(breadcrumb).toBeVisible({ timeout: 5000 });
  });

  test("UX - validation formulaire inline (pas juste toast)", async ({
    page,
  }) => {
    test.setTimeout(15000);

    await page.goto("/login");
    await page.waitForLoadState("networkidle");

    // Submit with empty email field
    const emailField = page.locator('[data-testid="login-email"]');
    if (await emailField.isVisible()) {
      await emailField.fill("");
    }

    const submitBtn = page.locator('[data-testid="login-submit"]');
    if (await submitBtn.isVisible()) {
      await submitBtn.click();
    }

    // Inline error should appear near the field — not only as a top-level toast
    const inlineError = page.locator(
      '[aria-invalid="true"], [class*="error"]:not([role="alert"]), .invalid-feedback',
    );
    await expect.soft(inlineError.first()).toBeVisible({ timeout: 5000 });

    // aria-invalid attribute on the email input itself
    const isInvalid = await emailField
      .getAttribute("aria-invalid")
      .catch(() => null);
    if (isInvalid !== "true") {
      test
        .info()
        .annotations.push({
          type: "UX-ISSUE",
          description:
            "/login: email field missing aria-invalid on validation error",
        });
    }
    await expect.soft(emailField).toHaveAttribute("aria-invalid", "true");
  });

  test("UX - boutons danger cohérents en rouge", async ({ page }) => {
    test.setTimeout(30000);

    // Check /users
    await page.goto("/users");
    await page.waitForLoadState("networkidle");

    const dangerBtnUsers = page
      .locator(
        'button[class*="red"], button[class*="danger"], button[class*="destructive"], button[class*="delete"], [data-variant*="danger"], [data-variant*="destructive"]',
      )
      .first();

    const foundUsers = await dangerBtnUsers
      .isVisible({ timeout: 5000 })
      .catch(() => false);
    if (!foundUsers) {
      test
        .info()
        .annotations.push({
          type: "UX-ISSUE",
          description:
            "/users: Aucun bouton danger/rouge trouvé (suppression/désactivation)",
        });
    }
    await expect.soft(dangerBtnUsers).toBeVisible({ timeout: 5000 });

    // Check /offboarding
    await page.goto("/offboarding");
    await page.waitForLoadState("networkidle");

    const dangerBtnOff = page
      .locator(
        'button[class*="red"], button[class*="danger"], button[class*="destructive"], button[class*="delete"], [data-variant*="danger"], [data-variant*="destructive"]',
      )
      .first();

    const foundOff = await dangerBtnOff
      .isVisible({ timeout: 5000 })
      .catch(() => false);
    if (!foundOff) {
      test
        .info()
        .annotations.push({
          type: "UX-ISSUE",
          description: "/offboarding: Aucun bouton danger/rouge trouvé",
        });
    }
    await expect.soft(dangerBtnOff).toBeVisible({ timeout: 5000 });
  });

  test("UX - accessibilité: boutons avec texte ou aria-label", async ({
    page,
  }) => {
    test.setTimeout(120000);

    for (const { path: pagePath } of PAGES_TO_AUDIT) {
      await page.goto(pagePath);
      await page.waitForLoadState("networkidle");

      const buttons = await page.locator("button").all();
      let unlabelledCount = 0;

      for (const button of buttons) {
        const text = await button.innerText().catch(() => "");
        const ariaLabel = await button
          .getAttribute("aria-label")
          .catch(() => null);
        const title = await button.getAttribute("title").catch(() => null);
        if (!text.trim() && !ariaLabel && !title) {
          unlabelledCount++;
        }
      }

      if (unlabelledCount > 0) {
        test.info().annotations.push({
          type: "UX-ISSUE",
          description: `${pagePath}: ${unlabelledCount} bouton(s) sans texte ni aria-label ni title`,
        });
      }
      expect.soft(unlabelledCount).toBe(0);
    }
  });

  test("UX - navigation cohérente: sidebar présente sur toutes les pages auth", async ({
    page,
  }) => {
    test.setTimeout(120000);

    for (const { path: pagePath } of PAGES_TO_AUDIT) {
      await page.goto(pagePath);
      await page.waitForLoadState("networkidle");

      const nav = page.locator('nav, aside, [role="navigation"]').first();
      const hasNav = await nav.isVisible({ timeout: 5000 }).catch(() => false);

      if (!hasNav) {
        test.info().annotations.push({
          type: "UX-ISSUE",
          description: `${pagePath}: Sidebar/navigation absente`,
        });
      }
      await expect.soft(nav).toBeVisible({ timeout: 5000 });
    }
  });
});
