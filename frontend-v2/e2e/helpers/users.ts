import { type APIRequestContext, expect } from "@playwright/test";

export interface DisposableUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

/**
 * Crée un utilisateur JETABLE via l'API (POST /api/users) à partir d'un
 * contexte requête déjà authentifié admin/RH.
 *
 * But : isoler les specs qui MUTENT des comptes (désactivation/suppression/
 * réassignation). Ces tests doivent opérer sur des comptes éphémères au lieu
 * des comptes seed PARTAGÉS (alice, marie.dupont, pierre.leclerc,
 * lucas.bernard…), dont la désactivation casse en 401 tous les specs ultérieurs
 * qui s'y loguent (cascade de faux échecs — issue #116).
 *
 * L'email contient un timestamp + suffixe aléatoire → unique et recherchable :
 * les specs filtrent la liste sur cet email avant de cocher, garantissant que
 * seules ces lignes jetables sont sélectionnées.
 */
export async function createDisposableUser(
  request: APIRequestContext,
  overrides: {
    role?: "employee" | "manager" | "hr" | "admin";
    firstName?: string;
    lastName?: string;
    managerId?: string;
    tag?: string;
  } = {},
): Promise<DisposableUser> {
  const stamp = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const tag = overrides.tag ?? "disp";
  const firstName = overrides.firstName ?? "E2E";
  // Préfixe « Zz » : trie en fin de liste (sort lastName asc) pour ne jamais
  // empiéter sur la fenêtre des comptes seed dans les vues paginées.
  const lastName = overrides.lastName ?? `Zz${tag}${stamp}`;
  const email = `e2e.${tag}.${stamp}@nxrh.local`;

  const res = await request.post("/api/users", {
    data: {
      firstName,
      lastName,
      email,
      role: overrides.role ?? "employee",
      ...(overrides.managerId ? { managerId: overrides.managerId } : {}),
      password: "password123",
    },
  });
  expect(
    res.ok(),
    `création user jetable ${email} (HTTP ${res.status()})`,
  ).toBeTruthy();
  const body = (await res.json()) as {
    data?: { id?: string; _id?: string };
  };
  const id = body.data?.id ?? body.data?._id;
  if (!id) {
    throw new Error(
      "Réponse de création sans id : " + JSON.stringify(body),
    );
  }
  return { id: String(id), email, firstName, lastName };
}

/**
 * Supprime (best-effort) une liste d'utilisateurs jetables via l'API.
 * À appeler en afterAll/afterEach pour ne pas accumuler de comptes.
 */
export async function deleteDisposableUsers(
  request: APIRequestContext,
  ids: Array<string | undefined>,
): Promise<void> {
  for (const id of ids) {
    if (id) await request.delete(`/api/users/${id}`).catch(() => {});
  }
}
