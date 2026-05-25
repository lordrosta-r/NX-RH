/**
 * Combinaisons de classes Tailwind réutilisables basées sur les design tokens.
 * Importer ces constantes pour garantir la cohérence visuelle à travers l'app.
 */

export const btnPrimary =
  "bg-primary-500 hover:bg-primary-600 active:bg-primary-700 text-white font-medium rounded-lg px-4 py-2 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";

export const btnDanger =
  "bg-danger-600 hover:bg-danger-700 text-white font-medium rounded-lg px-4 py-2 transition-colors focus:outline-none focus:ring-2 focus:ring-danger-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";

export const btnSecondary =
  "bg-surface hover:bg-surface-subtle text-text border border-border font-medium rounded-lg px-4 py-2 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";

export const inputBase =
  "block w-full rounded-lg border border-border px-3 py-2 text-text placeholder:text-text-disabled focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-none disabled:bg-surface-muted disabled:text-text-disabled disabled:cursor-not-allowed";

export const inputError =
  "block w-full rounded-lg border border-danger-500 ring-2 ring-danger-100 bg-danger-50 px-3 py-2 text-text placeholder:text-text-disabled focus:border-danger-500 focus:ring-danger-200 focus:outline-none";

export const cardBase =
  "bg-surface rounded-xl border border-border shadow-sm p-6";

export const badgeSuccess =
  "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-success-50 text-success-700";

export const badgeDanger =
  "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-danger-50 text-danger-700";

export const badgeWarning =
  "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-warning-50 text-warning-700";

export const badgeInfo =
  "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-info-50 text-info-700";

export const badgeNeutral =
  "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-surface-muted text-text-muted";
