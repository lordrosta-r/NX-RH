import { z } from "zod";

// =============================================================================
// schemas/ldap.ts — Validation Zod d'une source LDAP (côté formulaire admin)
//
// Reflète le durcissement Joi côté backend (ldapValidators.js) :
//   • host    : requis, doit commencer par ldap:// ou ldaps://
//   • baseDN  : requis, format DN plausible (contient « = »)
//   • bindDN  : requis (le bind anonyme n'est pas exposé dans l'UI actuelle)
//   • bindPassword : optionnel (vide = réutilise le mot de passe stocké)
//   • userFilter   : optionnel, non vide si fourni
//   • attr*        : optionnels
// Messages en français, explicites.
// =============================================================================

const ldapUrl = z
  .string()
  .min(1, "L'URL de l'annuaire est requise")
  .regex(/^ldaps?:\/\/.+/i, "L'URL doit commencer par ldap:// ou ldaps://");

const dn = z
  .string()
  .min(1, "Ce champ est requis")
  .regex(/=/, "Le DN doit ressembler à « dc=example,dc=com » (contenir un « = »)");

export const ldapSourceSchema = z.object({
  host: ldapUrl,
  baseDN: dn,
  bindDN: dn,
  // Optionnel : vide = on réutilise le mot de passe déjà stocké côté serveur
  bindPassword: z.string().optional(),
  // Non vide si fourni
  userFilter: z
    .string()
    .min(1, "Le filtre ne peut pas être vide")
    .optional()
    .or(z.literal("")),
  attrEmail: z.string().optional(),
  attrFirstName: z.string().optional(),
  attrLastName: z.string().optional(),
  attrDepartment: z.string().optional(),
  attrTitle: z.string().optional(),
  defaultRole: z.string().optional(),
});

export type LdapSourceFormValues = z.infer<typeof ldapSourceSchema>;

// Erreurs par champ : { host?: string, baseDN?: string, ... }
export type LdapFieldErrors = Partial<Record<string, string>>;

/**
 * Valide une source et retourne les erreurs indexées par nom de champ.
 * Objet vide = source valide.
 */
export function validateLdapSource(source: unknown): LdapFieldErrors {
  const result = ldapSourceSchema.safeParse(source);
  if (result.success) return {};
  const errors: LdapFieldErrors = {};
  for (const issue of result.error.issues) {
    const key = issue.path[0];
    if (typeof key === "string" && !errors[key]) {
      errors[key] = issue.message;
    }
  }
  return errors;
}
