# Gestion des comptes

Trois mécanismes distincts, du plus doux au plus définitif.

## 1. Bloquer / Débloquer  (réversible) — admin & RH

Pour un compte **système/service** qui ressemble à un utilisateur, ou un compte suspect.

- **Bloquer** (fiche utilisateur → menu Actions → *Bloquer le compte*) : `isActive=false`,
  `blocked=true`, `blockedAt`, `blockedReason`. **Le compte ne peut plus se connecter** (login 401).
- **Débloquer** (*Débloquer le compte*) : restaure `isActive=true`, efface les champs de blocage.
  **Un faux positif est donc récupérable** — c'est l'intérêt du blocage vs la suppression.

Backend : `PATCH /api/users/:id/block` · `PATCH /api/users/:id/unblock`.

## 2. Exclusion à la synchro LDAP  (réversible) — admin

Dans la config d'un annuaire, le champ **Comptes exclus (motifs)** (`svc-*`, `*@bots.local`…) :
- Les comptes matchés sont **ignorés à l'import**.
- S'ils avaient déjà été synchronisés, ils sont **bloqués** (réversible) avec
  `blockedReason = "Compte système/service exclu (synchro LDAP)"`.

→ Ils apparaissent comme bloqués et sont **débloquables** si c'est un faux positif.

## 3. Supprimer définitivement  (irréversible) — admin uniquement

Fiche utilisateur → *Supprimer définitivement* (double confirmation). `DELETE /api/users/:id`.

Garde-fous : on ne supprime **ni soi-même** (400) **ni le dernier admin actif** (409).
À réserver aux comptes sans historique (système/service). Pour un vrai collaborateur,
préférer le **blocage** ou l'**offboarding**.

## Récapitulatif

| Action | Réversible ? | Qui | Effet |
|--------|:--:|-----|-------|
| Bloquer | ✅ (Débloquer) | admin, hr | Connexion impossible |
| Exclusion LDAP | ✅ (Débloquer) | admin | Ignoré à l'import + bloqué si déjà présent |
| Offboarding | partiel | admin, hr | Départ planifié, évals archivées |
| Supprimer | ❌ | admin | Effacement définitif |
