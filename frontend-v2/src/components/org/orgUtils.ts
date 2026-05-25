// Shared org chart utilities

export const ROLE_COLORS_HEX: Record<string, string> = {
  admin: "#0D9488",
  hr: "#059669",
  manager: "#2563EB",
  employee: "#64748B",
  director: "#7C3AED",
};

export function initials(firstName?: string, lastName?: string): string {
  return `${firstName?.[0] ?? ""}${lastName?.[0] ?? ""}`.toUpperCase();
}
