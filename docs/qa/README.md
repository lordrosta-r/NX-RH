# Système QA — NanoXplore RH

Ce dossier est le **système de QA** de l'application : des backlogs exhaustifs par
rôle (revue manuelle) **et** un harness automatisé rejouable (RBAC + connexion
réelle sous chaque identité).

## 1. Backlogs par rôle (402 cas)

Chaque fichier énumère **toutes les actions** du rôle (chaque bouton, champ, lien,
menu, soumission, signature) avec : préconditions, étapes, résultat attendu, priorité.

| Rôle | Fichier | Cas |
|------|---------|-----|
| Employé | [Backlog-employe.md](Backlog-employe.md) | 121 |
| Manager | [Backlog-manager.md](Backlog-manager.md) | 80 |
| RH | [Backlog-rh.md](Backlog-rh.md) | 116 |
| Admin | [Backlog-admin.md](Backlog-admin.md) | 85 |

Couvrent les parcours nominaux, les **cas d'erreur** (champ requis, transition
interdite, dates invalides…) et les **invariants de sécurité** (périmètre manager,
RH ne signe que la synthèse, impersonation lecture seule, anti-auto-blocage…).

## 2. Harness automatisé — connexion en tant que chaque utilisateur

`frontend-v2/e2e/qa-harness.mjs` — **rejouable**. Compose un panel de **10 utilisateurs**
(rôles répartis : 1 admin, 2 RH, 3 managers, 4 employés), se **connecte réellement
sous chaque identité**, et exécute par rôle une matrice d'assertions RBAC
(actions **autorisées** vs **interdites**). Produit [Rapport-QA.md](Rapport-QA.md).

```bash
# Prérequis : stack prod up + RELAX_RATE_LIMIT=true (outil interne)
cd frontend-v2 && node e2e/qa-harness.mjs
```

Dernier run : **10/10 connexions, 60/60 assertions conformes**. Chaque rôle peut
faire ce qu'il doit et est refusé (401/403) sur ce qu'il ne doit pas. Bonus : un
**compte système bloqué** (`svc-*`) est correctement rejeté à la connexion (401).

## 3. Comment étendre

- **Nouvelle action** → l'ajouter dans le backlog du rôle concerné.
- **Nouvel invariant RBAC** → l'ajouter à la matrice `plan` du harness (1 ligne :
  `['libellé', method, path, 'ok'|'forbidden', body?]`).
- **Re-jouer** après chaque changement : le harness reconstruit le panel et le
  rapport automatiquement.

## 4. Constats relevés pendant la QA (à arbitrer)

- **Tuile « Documents RH »** (dashboard employé) → `/documents` : route possiblement
  absente (404 à vérifier).
- **Drag-and-drop d'organigramme** réservé à `admin`/`hr` (`canEdit`) — le manager
  ne peut pas rattacher par glisser-déposer ; il passe par la fiche (« Responsable
  direct »). Comportement voulu, à documenter.
- **`userService.deleteUser`** (ancien soft-delete) est devenu inutilisé après
  l'unification de `DELETE /:id` en suppression définitive ; conservé sans danger,
  peut être retiré.
