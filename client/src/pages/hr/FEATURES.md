# NanoXplore RH — Features RH (à valider)

> Liste exhaustive des fonctionnalités attendues pour un RH.
> **Légende** : ✅ Fonctionnel | ⚠️ Partiel | ❌ Absent | 🔒 Admin requis

---

## 1. Gestion des formulaires d'évaluation

| Fonctionnalité | État | Notes |
|---|---|---|
| Créer un modèle (titre, description) | ✅ | `/hr/templates` |
| Lister les modèles (libres, verrouillés) | ✅ | |
| Dupliquer un modèle | ✅ | |
| Supprimer un modèle non verrouillé | ✅ | |
| Ajouter une question (texte libre) | ✅ | FormBuilder |
| Ajouter une question (note 1-5) | ✅ | |
| Ajouter une question (choix multiple) | ✅ | |
| Ajouter une question (météo 1-10) | ✅ | type `weather` |
| Ajouter une question (mobilité oui/non) | ✅ | type `mobility` |
| Associer une question à une phase (auto-éval, N-1, objectifs…) | ✅ | champ `phase` |
| Marquer une question comme obligatoire | ✅ | |
| Réordonner les questions (drag & drop) | ✅ | |
| Aperçu visuel du type de question dans la carte | ❌ | Design non appliqué |
| Grille de sélection du type (Scale/Text/Dropdown/Multiple) | ❌ | Design non appliqué |
| Les questions s'affichent dans EvaluationForm | ⚠️ | MOCK_PHASES encore en fallback principal |
| Verrouillage automatique si évaluation assignée | ✅ | `frozenAt` |

---

## 2. Gestion des campagnes

| Fonctionnalité | État | Notes |
|---|---|---|
| Créer une campagne (wizard 5 étapes) | ✅ | `/hr/campaigns/new` |
| Cibler des départements spécifiques | ✅ | |
| Définir des deadlines employé et manager | ✅ | |
| Lister les campagnes (avec statut) | ✅ | |
| Voir le détail d'une campagne | ✅ | `/hr/campaigns/:id` |
| Modifier une campagne (nom, dates, depts) | ✅ | si statut draft |
| Activer une campagne | ✅ | |
| Clore une campagne | ✅ | |
| Archiver une campagne | ✅ | |
| Supprimer une campagne | ✅ | cascade évals |
| Cloner une campagne existante | ✅ | |
| Assigner des évaluations à une campagne | ✅ | |
| Suivre le taux de complétion en temps réel | ✅ | |
| Prévisualiser le formulaire avant lancement | ❌ | |

---

## 3. Gestion des évaluations

| Fonctionnalité | État | Notes |
|---|---|---|
| Voir toutes les évaluations | ✅ | `/hr/requests` |
| Filtrer par statut | ✅ | |
| Filtrer par département | ✅ | |
| Signer des évaluations (RH) | ✅ | |
| Archiver des évaluations | ✅ | |
| Actions en masse (sign_hr, archive, assign_reviewer) | ✅ | max 200/batch |
| Réaffecter un évaluateur | ✅ | ReassignModal |
| Traiter une contestation (disagreementFlag) | ✅ | |
| Exporter les évaluations en CSV | ✅ | `/api/evaluations/export` |
| Exporter en PDF | ❌ | |

---

## 4. Analytics

| Fonctionnalité | État | Notes |
|---|---|---|
| Dashboard Flight Risk | ✅ | données réelles |
| Dashboard Goal Gap | ✅ | données réelles |
| Dashboard Skills Gap | ✅ | données réelles |
| Dashboard Sentiment | ✅ | données réelles |
| Dashboard 9-Box | ✅ | données réelles |
| Filtre par département | ✅ | |
| Filtre par campagne | ✅ | |
| Filtre par période (date range) | ⚠️ | UI présente, connexion partielle |
| Export CSV des données analytics | ✅ | bouton dans la page |
| Export PDF pour la direction | ❌ | |

---

## 5. Annuaire

| Fonctionnalité | État | Notes |
|---|---|---|
| Lister tous les employés | ✅ | `/hr/directory` |
| Rechercher par nom / poste / département | ✅ | |
| Voir la fiche d'un employé | ✅ | |
| Voir l'historique des évaluations d'un employé | ✅ | |
| Modifier un employé | 🔒 | `/admin/users` |
| Désactiver / offboarding | 🔒 | `/admin/users` |

---

## 6. Demandes RH

| Fonctionnalité | État | Notes |
|---|---|---|
| Voir les contestations | ✅ | `/hr/requests` |
| Traiter / ignorer une contestation | ✅ | |
| Voir les demandes de mobilité | ⚠️ | Filtre fragile sur texte libre |
| Voir les demandes d'augmentation | ⚠️ | Filtre fragile sur texte libre |
| Envoyer une réponse à l'employé | ❌ | |

---

## 7. Ressources

| Fonctionnalité | État | Notes |
|---|---|---|
| Lister les ressources | ✅ | `/hr/resources` |
| Ajouter une ressource (titre, type, URL) | ✅ | |
| Supprimer une ressource | ✅ | |
| Filtrer par type | ✅ | |
| Upload fichier (PDF natif) | ❌ | liens URL uniquement |

---

## 8. Notifications et communications

| Fonctionnalité | État | Notes |
|---|---|---|
| Notifications internes (badge) | ✅ | via topbar |
| Envoi d'email (config SMTP) | ⚠️ | backend mailer.js prêt, UI basique |
| Test d'envoi email | ✅ | `/admin/integrations` |
| Relancer un employé depuis l'interface | ❌ | |
| Notifications automatiques (deadline -48h) | ❌ | CRON non implémenté |

---

## 9. RGPD et conformité

| Fonctionnalité | État | Notes |
|---|---|---|
| Exporter les données d'un utilisateur | 🔒 | `/admin/users` → Export RGPD |
| Anonymiser un utilisateur | 🔒 | `/admin/users` → Anonymiser |
| Piste d'audit (qui a signé quoi, quand) | 🔒 | `/admin/audit` |
| Rétention automatique des logs (2 ans) | ✅ | TTL MongoDB |
| Politique de rétention configurable | ❌ | |

---

## 10. Administration (rôle admin)

| Fonctionnalité | État | Notes |
|---|---|---|
| Créer / modifier / désactiver un utilisateur | ✅ | `/admin/users` |
| Offboarding (départ employé) | ✅ | OffboardModal |
| Synchronisation LDAP | ⚠️ | backend prêt, non testé prod |
| Piste d'audit complète | ✅ | `/admin/audit` |
| Test email | ✅ | |
| Voir l'organigramme | ✅ | `/admin/org-chart` |
| Gérer les rôles | ✅ | `/admin/roles` |

---

## Résumé rapide

| Catégorie | ✅ | ⚠️ | ❌ |
|---|---|---|---|
| Formulaires | 12 | 1 | 2 |
| Campagnes | 13 | 0 | 1 |
| Évaluations | 10 | 0 | 1 |
| Analytics | 8 | 1 | 1 |
| Annuaire | 4 | 0 | 0 |
| Demandes RH | 3 | 2 | 1 |
| Ressources | 4 | 0 | 1 |
| Notifications | 3 | 1 | 2 |
| RGPD | 4 | 0 | 1 |
| **Total** | **61** | **5** | **10** |

**~80% des fonctionnalités attendues sont opérationnelles.**

Les 3 manques les plus bloquants pour une utilisation réelle :
1. 🔴 EvaluationForm n'affiche pas les questions du FormBuilder
2. 🟡 FormBuilder design non conforme au fichier fourni
3. 🟡 Pas de relance email ni de notifications automatiques
