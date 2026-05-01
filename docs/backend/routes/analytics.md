# Route : `/api/analytics`

**Fichier :** `mongo/server/routes/analytics.js`
**Protégé :** `authGuard` + `apiLimiter`

## Endpoints

### `GET /api/analytics/export/pdf`

Génère un rapport PDF analytique RH (admin/hr uniquement).

**Query :** `?campaignId` (optionnel — sans = toutes les campagnes actives)

**Réponse :** `Content-Type: application/pdf`

**Contenu du PDF :**
- En-tête NanoXplore RH
- Statistiques globales : total évaluations, taux de complétion, répartition par statut
- Détail par campagne si `?campaignId` fourni

## Notes

- Accès restreint aux `ADMIN_ROLES` (admin, hr) malgré la présence de `authenticated` en middleware global
