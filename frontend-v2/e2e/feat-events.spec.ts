import { test, expect, type Page, type APIRequestContext } from "@playwright/test";
import { loginAs } from "./helpers/auth";

// =============================================================================
// Feature « Calendrier » / Événements (EventsPage + EventDetailPage) —
// accessible depuis le menu et fonctionnelle, AVEC RSVP (#87).
//
//   1. RH : menu « Plus » → « Calendrier » → le calendrier s'affiche (Mois/Liste).
//   2. Vue liste → ouvrir un événement → la page de détail s'affiche (nav #86 OK).
//   3. RSVP (#87) : un employé peut Accepter / Incertain / Décliner un RDV ; sa
//      réponse est persistée et affichée.
// =============================================================================

function trackErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(`console: ${msg.text()}`);
  });
  page.on("pageerror", (err) => errors.push(`pageerror: ${err.message}`));
  return errors;
}
function realErrors(errors: string[]): string[] {
  return errors.filter(
    (e) => !/favicon|ResizeObserver|net::ERR_|Failed to load resource/i.test(e),
  );
}

// Crée un événement visible par tous les rôles (POST → Event.create → targetRoles
// par défaut = tous). Retourne son id.
async function createEvent(req: APIRequestContext): Promise<string> {
  const r = await req.post("/api/events", {
    data: {
      title: `RDV e2e ${Date.now()}`,
      date: "2026-07-01T10:00:00.000Z",
      type: "meeting",
      location: "Salle B",
      description: "RDV de test",
    },
  });
  expect(r.status()).toBe(201);
  const e = await r.json();
  return e._id ?? e.id;
}

test.describe("Feature Calendrier / Événements — menu + détail + RSVP", () => {
  test("RH : « Plus » → « Calendrier » affiche le calendrier, puis ouverture d'un événement", async ({
    page,
  }) => {
    const errors = trackErrors(page);
    await loginAs(page, "hr");

    await page.getByRole("button", { name: "Plus" }).click();
    await page.getByRole("menuitem", { name: "Calendrier" }).click();
    await expect(page).toHaveURL(/\/events/);

    await expect(page.getByRole("heading", { name: "Calendrier" })).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Mois", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Liste", exact: true }),
    ).toBeVisible();
    await expect(page.getByLabel("Filtrer par type d'événement")).toBeVisible();

    await page.getByRole("button", { name: "Liste", exact: true }).click();
    const eventTitleButtons = page.locator(".tbl-row .link");
    const emptyState = page.getByText("Aucun événement à venir.");
    await expect(eventTitleButtons.first().or(emptyState)).toBeVisible();

    if ((await eventTitleButtons.count()) > 0) {
      await eventTitleButtons.first().click();
      // Nav réparée (#86) : on atterrit bien sur le détail (plus de /events/undefined).
      await expect(page).toHaveURL(/\/events\/[a-f0-9]{8,}/);
      await expect(
        page.getByRole("button", { name: "Retour au calendrier" }),
      ).toBeVisible();
    }

    expect(realErrors(errors)).toEqual([]);
  });

  test("Employé : répondre à un RDV (Accepter → Décliner) — RSVP persisté (#87)", async ({
    page,
  }) => {
    const errors = trackErrors(page);

    // La RH crée un RDV visible par tous.
    await loginAs(page, "hr");
    const eventId = await createEvent(page.request);

    // L'employé ouvre le détail et répond.
    await loginAs(page, "employee");
    await page.goto(`/events/${eventId}`);
    await page.waitForLoadState("domcontentloaded");

    const rsvp = page.getByTestId("event-rsvp");
    await expect(rsvp).toBeVisible();

    // Accepter → la réponse s'affiche.
    await page.getByTestId("rsvp-accepted").click();
    await expect(rsvp.getByText(/Vous avez répondu :/)).toContainText(
      "Accepter",
    );

    // Changer d'avis → Décliner.
    await page.getByTestId("rsvp-declined").click();
    await expect(rsvp.getByText(/Vous avez répondu :/)).toContainText(
      "Décliner",
    );

    // Persistance serveur : GET renvoie bien la dernière réponse de l'employé.
    const after = await page.request.get(`/api/events/${eventId}`);
    const body = await after.json();
    expect(
      (body.responses ?? []).map((r: { status: string }) => r.status),
    ).toContain("declined");

    expect(realErrors(errors)).toEqual([]);
  });
});
