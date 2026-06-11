import client from "./client";
import type { User, UserPreferences, ItemResponse } from "../types";

export const authApi = {
  // Authentification unifiée : le backend essaie d'abord le compte local puis,
  // si le compte est LDAP ou inconnu, bascule sur l'annuaire LDAP (par email).
  login: (email: string, password: string, remember?: boolean) =>
    client.post<ItemResponse<{ user: User }>>("/api/auth/login", {
      email,
      password,
      remember,
    }),

  logout: () => client.post<{ message: string }>("/api/auth/logout"),

  getMe: () => client.get<User>("/api/auth/me"),

  updatePreferences: (data: Partial<UserPreferences>) =>
    client.patch<{
      _id: string;
      locale: string;
      theme: string;
      notificationPrefs: Record<string, boolean>;
    }>("/api/auth/preferences", data),
};
