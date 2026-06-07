# Audit — Events + Resources + Notifications + Analytics

## Résumé
- Pages auditées: 8
- ✅ Conformes: 5
- ⚠️ Mineures: 3
- ❌ Manquantes: 1

---

## EventsPage (S-19)
### ✅ Conforme
- Vue calendrier mois avec grille 7 colonnes ok
- Vue liste alternative présente (toggle month/list)
- Couleurs par type via `EVENT_CONFIG` + `EventTypeChip`
- Filtre par type fonctionnel

### ⚠️ Anomalies
- Chargement événements avec `limit: 200` sans pagination vraie

### API calls
| Endpoint | Status |
|---|---|
| `GET /api/events` (type, date range) | ✅ |
| `POST /api/events` | ✅ |
| `DELETE /api/events/:id` | ✅ |

---

## EventDetailPage (S-20)
### ✅ Conforme
- CRUD standard, slide-over édition présent

---

## ResourcesPage (S-21) + ResourceDetailPage (S-22)
### ✅ Conformes
- Filtres type/statut + recherche
- Couleurs/labels par type
- Publication/dépublication, téléchargement, édition slide-over

### API calls
| Endpoint | Status |
|---|---|
| `GET /api/resources` | ✅ |
| `POST /api/resources/:id/publish` | ✅ |
| `POST /api/resources/:id/unpublish` | ✅ |

---

## Navbar — Badge notifications
### ✅ Conforme
- `refetchInterval: 30000` (polling 30s) présent
- Badge rouge avec cap 9+
- Clic cloche → `/notifications`

### ❌ Manquant
- **Pas de dropdown des 10 dernières notifications** dans la Navbar
- **Pas de "mark all read"** dans la navbar

### API calls
| Endpoint | Status |
|---|---|
| `GET /api/notifications/count` | ✅ |

---

## NotificationsPage (S-42)
### ✅ Conforme
- Groupement par date (Aujourd'hui / Cette semaine / Plus tôt)
- Tout marquer comme lu si unreadCount > 0
- PATCH mark read au clic
- "Charger plus" + empty state

### API calls
| Endpoint | Status |
|---|---|
| `GET /api/notifications` | ✅ |
| `PATCH /api/notifications/:id/read` | ✅ |
| `POST /api/notifications/read-all` | ✅ |

---

## AnalyticsPage (S-25)
### ✅ Conforme
- Endpoint canonique `GET /api/analytics/summary`
- 4 KPIs présents
- Donut chart statuts + bar chart scores (Recharts)
- Top 5 performers + tableau par département
- Export PDF + CSV avec bons endpoints

### ⚠️ Anomalies
- Sélecteur campagne charge via `/api/campaigns` (acceptable)

### API calls
| Endpoint | Status |
|---|---|
| `GET /api/analytics/summary` | ✅ |
| `GET /api/analytics/export/pdf` | ✅ |
| `GET /api/analytics/export/csv` | ✅ |
| `GET /api/analytics/campaigns/:id` | ✅ |

---

## AnalyticsCampaignPage (S-43)
### ✅ Conforme
- Utilise bien `GET /api/analytics/campaigns/:id` (endpoint canonique)
- Donut + bar + 4 KPIs présents

### ⚠️ Anomalies
- Pas d'export PDF/CSV dédié (centralisé dans `/analytics`)

### API calls
| Endpoint | Status |
|---|---|
| `GET /api/analytics/campaigns/:id` | ✅ |
