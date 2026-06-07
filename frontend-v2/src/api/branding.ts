import client from "./client";

export const brandingApi = {
  get: () => client.get<{ logo: string | null }>("/api/branding"),
  set: (logo: string | null) =>
    client.put<{ logo: string | null }>("/api/branding", { logo }),
};
