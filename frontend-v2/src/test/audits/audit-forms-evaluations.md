# Audit — Forms + Evaluations

## Résumé
- Pages auditées: 8
- ✅ Conformes: 3
- ⚠️ Mineures: 3
- ❌ Manquantes/Incorrectes: 2

---

## FormsPage (S-07)
### ✅ Conforme
- Liste + filtre type + recherche + clonage + suppression admin/hr ok

### ⚠️ Anomalies
- Filtre **campagne** manquant (spec S-13 l'exige) — seulement type + recherche

---

## FormDetailPage (S-08)
### ✅ Conforme
- Gel/dégel, export JSON, suppression, lecture seule si gelé ok

### ⚠️ Anomalies
- Drag & drop absent (spec S-15) — seulement boutons up/down

---

## FormNewPage
### ⚠️ Anomalies
- Pas de champ **campagne** ni **anonyme** (spec S-10-M2)
- Types de phases incorrects: `employee/manager/both/all` vs spec `self/n-1/objectives/aspirations/all`
- Types de questions incomplets vs spec (manque `choice`, `n1_import`)

---

## EvaluationsPage (S-16)
### ⚠️ Anomalies
- Filtres incomplets: manque filtre département, statut multi
- Actions ligne: seulement Voir + PDF — manque Réaffecter + Expirer (spec)

---

## EvaluationDetailPage (S-17) — 4 modes
### ✅ Conforme
- Modes A/B/C/D détectés par statut/rôle
- Autosave debounce 2s ok
- Flag désaccord gérable
- Export PDF présent

### ❌ Non conforme
- **Mode B**: manque bouton explicite "Revoir →" (transition `submitted → reviewed`)
- **Mode C**: stepper affiche **6 étapes** au lieu de **5** attendues par spec
- **Mode D**: titre non conforme ("Compte-rendu — [Prénom Nom]" attendu)
- **API**: utilise `PUT /api/evaluations/:id` au lieu de `PATCH /api/evaluations/:id` (spec)

---

## EvaluationNewPage
### ❌ Manquant
- Encore stub "À implémenter"

---

## API Contract Summary
| Endpoint | Spec | Impl | Status |
|---|---|---|---|
| `GET /api/forms` | Oui | Oui | ✅ |
| `POST /api/forms/:id/freeze` | Oui | Oui | ✅ |
| `POST /api/forms/:id/clone` | Oui | Oui | ✅ |
| `GET /api/forms/:id/export` | Oui | Oui | ✅ |
| `PATCH /api/evaluations/:id` | Oui (debounce) | **PUT** utilisé | ❌ |
| `POST /api/evaluations/:id/submit` | Oui | Oui | ✅ |
| `POST /api/evaluations/:id/sign` | Oui | Oui | ✅ |
| `GET /api/evaluations/:id/pdf` | Oui | `window.open` | ✅ |
