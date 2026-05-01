# NX-RH — Contrats des endpoints backend (Frontend v2)

> **Version** : 1.0 · **Date** : 2025 · **Langue** : Français
> **Stack** : React 18 + Vite + TypeScript + Tailwind CSS
> **Source** : `00-master.md` · `03-screens.md`

Ce fichier décrit le contrat d'interface (méthode, chemin, rôles, body, réponses, erreurs) pour chaque endpoint utilisé par le frontend. Il complète les specs écran et sert de référence pour la couche `src/services/`.

---

## Conventions

- **Authentification** : cookie `httpOnly` (JWT) — `withCredentials: true` dans Axios
- **Base URL** : `VITE_API_URL` (ex. `https://nxrh.nanoxplore.com`)
- **Format** : JSON (`Content-Type: application/json`) sauf upload multipart
- **Erreurs standard** :

| Code HTTP | Signification frontend |
|---|---|
| `400` | Validation échouée — afficher erreurs inline |
| `401` | Session expirée — logout + redirect `/login` |
| `403` | Accès interdit — redirect `/` + toast `error` |
| `404` | Ressource introuvable — page 404 inline |
| `409` | Conflit (doublon, état invalide) — toast `error` |
| `429` | Trop de requêtes — toast `warning` avec délai |
| `500` | Erreur serveur — toast `error` + bouton « Réessayer » |

---

## 1. Auth & Profil

---

### `PATCH /api/users/:id/avatar`

**Description** : Mise à jour de l'avatar d'un utilisateur (base64 ou URL).

**Rôles autorisés** : self (l'utilisateur modifie son propre avatar) · admin, hr (tout utilisateur)

**Paramètre URL** : `:id` — identifiant de l'utilisateur

**Body** :
```json
{
  "avatar": "data:image/png;base64,iVBORw0KGgo..." 
}
```
> Accepte une chaîne base64 (data URI) ou une URL HTTPS valide.

**Réponse** `200 OK` :
```json
{
  "id": "uuid",
  "avatarUrl": "https://cdn.example.com/avatars/uuid.jpg"
}
```

**Cas d'erreur** :
| Code | Raison | Comportement UI |
|---|---|---|
| `400` | Format non supporté (ni base64, ni URL valide) | Toast `error` + erreur inline |
| `400` | Image > 2 Mo | Toast `error` « L'image dépasse 2 Mo » |
| `403` | Tentative de modifier l'avatar d'un autre utilisateur sans permission | Toast `error` |
| `404` | Utilisateur introuvable | Toast `error` |

**Règle UI** : Preview locale via `FileReader` avant envoi. Affichage du spinner sur l'avatar pendant l'upload.

---

## 2. Administration système

---

### `PATCH /api/admin/config/batch`

**Description** : Mise à jour groupée de plusieurs clés de configuration système ou RH en une seule requête.

**Rôles autorisés** : admin (toutes les clés) · hr (uniquement les clés préfixées `hr.*`)

**Body** :
```json
{
  "updates": [
    { "key": "general.platformName", "value": "NX-RH" },
    { "key": "smtp.host", "value": "smtp.example.com" },
    { "key": "smtp.port", "value": "587" },
    { "key": "smtp.user", "value": "user@example.com" },
    { "key": "smtp.password", "value": "secret" },
    { "key": "smtp.tls", "value": "true" },
    { "key": "feature.onboarding", "value": "true" },
    { "key": "security.jwtSessionDuration", "value": "8" },
    { "key": "security.maxLoginAttempts", "value": "5" },
    { "key": "hr.n1DefaultEnabled", "value": "true" },
    { "key": "hr.n1VisibleToEmployeeByDefault", "value": "false" }
  ]
}
```

**Réponse** `200 OK` :
```json
{
  "updated": 11,
  "keys": ["general.platformName", "smtp.host", "..."]
}
```

**Cas d'erreur** :
| Code | Raison | Comportement UI |
|---|---|---|
| `400` | Une ou plusieurs clés invalides | Toast `error` avec liste des clés rejetées |
| `403` | hr tente de modifier une clé non-`hr.*` | Toast `error` « Permission insuffisante » |
| `422` | Valeur hors plage (ex. `smtpPort` > 65535) | Toast `error` avec détail de validation |

**Règle UI** : Le bouton « Sauvegarder » passe en état `loading` pendant la requête. Invalidation du cache TanStack Query `['admin', 'config']` après succès.

---

### `GET /api/admin/audit?format=csv`

**Description** : Export du journal d'audit complet au format CSV.

**Rôles autorisés** : admin, hr

**Paramètres query** :
| Param | Type | Obligatoire | Description |
|---|---|---|---|
| `format` | `'csv'` | oui | Déclenche le téléchargement CSV |
| `startDate` | `ISO 8601` | non | Filtre les entrées après cette date |
| `endDate` | `ISO 8601` | non | Filtre les entrées avant cette date |
| `action` | `string` | non | Filtre par type d'action (ex. `login`, `update`) |
| `userId` | `uuid` | non | Filtre par acteur |

**Réponse** `200 OK` :
```
Content-Type: text/csv
Content-Disposition: attachment; filename="audit-log-2025-01-15.csv"

date,acteur,action,cible,statut
2025-01-15T10:30:00Z,jean.dupont@nx.fr,UPDATE,evaluation#abc123,success
...
```

**Cas d'erreur** :
| Code | Raison | Comportement UI |
|---|---|---|
| `403` | Rôle non autorisé | Toast `error` |
| `500` | Génération CSV échouée | Toast `error` + bouton « Réessayer » |

**Règle UI** : Déclenché via `window.location.href` (téléchargement direct) ou `<a href download>`. Ne pas passer par Axios pour éviter de charger le fichier en mémoire.

---

## 3. Notifications RH

---

### `POST /api/hr/notifications/bulk-remind`

**Description** : Envoie un rappel email groupé à tous les évaluateurs d'une campagne n'ayant pas encore soumis leur évaluation.

**Rôles autorisés** : hr, admin

**Body** :
```json
{
  "campaignId": "uuid",
  "message": "string (optionnel — message personnalisé)"
}
```

> Si `message` est absent, le backend utilise le template par défaut `deadlineReminder`.

**Réponse** `200 OK` :
```json
{
  "sent": 12,
  "skipped": 3,
  "recipients": ["user@example.com", "..."]
}
```

**Cas d'erreur** :
| Code | Raison | Comportement UI |
|---|---|---|
| `400` | `campaignId` manquant ou invalide | Toast `error` |
| `404` | Campagne introuvable | Toast `error` |
| `409` | La campagne n'est pas `active` | Toast `error` « La campagne doit être active pour envoyer des rappels » |
| `422` | Aucun évaluateur éligible (tous ont soumis) | Toast `info` « Tous les évaluateurs ont déjà soumis » |

**Règle UI** :
- Bouton désactivé si aucune campagne sélectionnée dans le filtre
- Modal de confirmation avant envoi (S-35-M1)
- Toast `success` « Rappels envoyés à N personnes » après succès

---

## 4. Contexte N-1

---

### `GET /api/evaluations/:id/n1-context`

**Description** : Récupère le contexte N-1 (évaluation de la campagne précédente) pour une évaluation donnée.

**Rôles autorisés** :
- admin, hr, director, manager — accès complet
- employee (évalué) — uniquement si `n1VisibleToEmployee = true` sur la campagne

**Paramètre URL** : `:id` — identifiant de l'évaluation courante

**Réponse** `200 OK` :
```json
{
  "hasN1Context": true,
  "sourceCampaignId": "uuid",
  "sourceCampaignName": "Entretiens annuels 2024",
  "n1VisibleToEmployee": true,
  "answers": [
    {
      "questionId": "uuid",
      "questionText": "Commentaire manager",
      "answer": "Excellent travail sur le projet X.",
      "type": "text"
    }
  ],
  "reviewerScore": 85,
  "reviewerComment": "Très bonne performance globale."
}
```

**Réponse** `200 OK` (contexte absent) :
```json
{
  "hasN1Context": false,
  "sourceCampaignId": null
}
```

**Cas d'erreur** :
| Code | Raison | Comportement UI |
|---|---|---|
| `403` | employee tente d'accéder alors que `n1VisibleToEmployee = false` | Section N-1 masquée, pas de toast |
| `404` | Évaluation introuvable | Affichage état vide dans la section N-1 |

**Règle UI** :
- Appelé uniquement si `evaluation.campaign.enableN1Context = true`
- Si `hasN1Context = false`, afficher un état vide discret : « Aucun contexte N-1 disponible »
- La section N-1 est en lecture seule pour tous les rôles (jamais modifiable)
- Pour le rôle `employee` : vérifier `n1VisibleToEmployee` avant d'afficher la section

---

*Fin du document — NX-RH API Contract v1.0*
