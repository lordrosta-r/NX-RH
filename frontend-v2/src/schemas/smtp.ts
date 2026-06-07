import { z } from 'zod'

// ─── Configuration SMTP (page « Configuration e-mail ») ─────────────────────────
//
// Miroir frontend du schéma Joi backend (validators/smtpValidators.js).
// Le mot de passe est optionnel à l'édition : vide = réutiliser la valeur stockée.
// La page valide « password déjà défini » via `passwordSet` renvoyé par l'API ;
// ce schéma ne porte donc pas cette règle conditionnelle (gérée au submit).

// Hostname simple : libellés alphanumériques séparés par des points (ex : smtp.ovh.net).
const HOSTNAME_RE = /^(?=.{1,253}$)([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/

export const mailConfigSchema = z.object({
  smtpHost: z
    .string()
    .min(1, "L'hôte SMTP est requis")
    .regex(HOSTNAME_RE, "L'hôte SMTP doit être un nom d'hôte valide (ex : smtp.ovh.net)"),
  smtpPort: z
    .number({ message: 'Le port doit être un nombre' })
    .int('Le port doit être un entier')
    .min(1, 'Le port doit être compris entre 1 et 65535')
    .max(65535, 'Le port doit être compris entre 1 et 65535'),
  smtpSecure: z.boolean(),
  smtpUser: z.string().optional(),
  smtpPass: z.string().optional(),
  fromEmail: z
    .string()
    .min(1, "L'adresse expéditeur est requise")
    .email("L'adresse expéditeur doit être un e-mail valide"),
  fromName: z.string().optional(),
})
export type MailConfigFormValues = z.infer<typeof mailConfigSchema>

// ─── Email de test ──────────────────────────────────────────────────────────────

export const mailTestSchema = z.object({
  to: z
    .string()
    .min(1, "L'adresse du destinataire est requise")
    .email('Adresse e-mail du destinataire invalide'),
})
export type MailTestFormValues = z.infer<typeof mailTestSchema>
