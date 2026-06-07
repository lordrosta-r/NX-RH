import { z } from "zod";

// Validation côté client : on vérifie seulement la présence des marqueurs PEM
// avant l'envoi. La vraie validation crypto (cohérence clé/cert, expiration)
// est faite par le backend.

const CERT_MARKER = "-----BEGIN CERTIFICATE-----";
const KEY_MARKERS = [
  "-----BEGIN PRIVATE KEY-----",
  "-----BEGIN RSA PRIVATE KEY-----",
  "-----BEGIN EC PRIVATE KEY-----",
];

const MAX_PEM_BYTES = 64 * 1024;

export const sslCertSchema = z.object({
  fullchain: z
    .string()
    .min(1, "Le certificat (fullchain) est requis")
    .max(MAX_PEM_BYTES, "Le fichier dépasse 64 Ko")
    .refine((v) => v.includes(CERT_MARKER), {
      message: "Le fichier ne contient pas de certificat PEM valide",
    }),
  privkey: z
    .string()
    .min(1, "La clé privée est requise")
    .max(MAX_PEM_BYTES, "Le fichier dépasse 64 Ko")
    .refine((v) => KEY_MARKERS.some((m) => v.includes(m)), {
      message: "Le fichier ne contient pas de clé privée PEM valide",
    }),
});

export type SslCertFormValues = z.infer<typeof sslCertSchema>;
