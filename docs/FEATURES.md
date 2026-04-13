# NanoXplore RH — Idées de fonctionnalités futures

Ce fichier recense les améliorations envisageables pour enrichir la plateforme. Elles ne sont pas planifiées — elles constituent un backlog d'inspiration pour les prochaines itérations.

---

## Expérience employé

| Fonctionnalité | Description |
|---|---|
| **Historique des entretiens** | L'employé peut consulter toutes ses évaluations passées dans une timeline claire |
| **Progression visible** | Barre de progression dans le dashboard montrant l'avancement phase par phase |
| **Brouillon auto-sauvegardé** | Sauvegarde automatique toutes les X secondes pour éviter la perte de saisie |
| **Mode lecture entretien final** | Après validation, l'employé peut relire l'intégralité de son entretien finalisé (sa version + commentaires manager) |
| **Signature électronique** | L'employé "signe" son entretien validé pour confirmer qu'il en a pris connaissance |
| **Comparaison N vs N-1** | Vue côte à côte de l'évaluation actuelle et de la précédente pour mesurer l'évolution |
| **Export PDF personnel** | L'employé peut télécharger un PDF propre de son entretien validé |

---

## Expérience manager / directeur

| Fonctionnalité | Description |
|---|---|
| **Tableau de suivi avancé** | Vue kanban des évaluations par statut (assigned → in_progress → submitted → validated) |
| **Alertes et rappels** | Notifications email/in-app automatiques pour les évaluations en retard |
| **Calendrier d'entretiens** | Planifier les entretiens avec intégration Google Calendar / Outlook (ICS) |
| **Notes privées** | Le manager peut prendre des notes privées sur un collaborateur, visibles uniquement par lui |
| **Délégation d'entretien** | Un manager peut déléguer la conduite d'un entretien à un autre manager avec traçabilité |
| **Vue consolidée directeur** | Dashboard avec KPIs agrégés : distribution des notes, taux de complétion, alertes d'équipe |
| **Comparaison d'équipes** | Le directeur peut comparer les métriques agrégées de ses différentes équipes |

---

## Outils RH

| Fonctionnalité | Description |
|---|---|
| **Bibliothèque de questions** | Bank de questions réutilisables pour accélérer la création de templates |
| **Templates versionnés** | Garder l'historique des versions d'un template, pouvoir revenir à une version précédente |
| **Clonage de campagne** | Dupliquer une campagne passée pour relancer rapidement un cycle similaire |
| **Rapports analytiques** | Dashboard avec graphiques : distribution des notes, évolution d'une année à l'autre, corrélations |
| **Export multi-format** | Export CSV, Excel, ou PDF de n'importe quelle vue (par équipe, par campagne, par période) |
| **Plan de formation agrégé** | Synthèse automatique des aspirations (phase 5) pour alimenter les plans de formation RH |
| **Anonymisation** | Possibilité d'exporter des données anonymisées pour des analyses externes |
| **Audit log** | Historique horodaté de toutes les actions significatives (qui a modifié quoi, quand) |

---

## Intégrations

| Fonctionnalité | Description |
|---|---|
| **SCIM / provisioning automatique** | Créer/désactiver automatiquement des comptes depuis l'Active Directory ou un IdP |
| **SSO (SAML 2.0 / OIDC)** | Authentification via Okta, Azure AD, Keycloak, etc. |
| **Webhook sortant** | Notifier un système externe (SIRH, Slack, Teams) lors d'événements clés (entretien validé, campagne lancée) |
| **API REST publique** | Permettre à d'autres outils internes de lire les données d'évaluation |
| **Intégration calendrier** | Proposer un lien "Ajouter à mon agenda" pour planifier l'entretien |
| **Intégration SIRH** | Synchroniser les données organisationnelles depuis un SIRH existant (Workday, SAP HR, etc.) |

---

## Performance & technique

| Fonctionnalité | Description |
|---|---|
| **Mise en cache Redis** | Mettre en cache les données de session et les requêtes fréquentes pour alléger la base |
| **Queue d'emails** | File d'attente (Bull/BullMQ) pour les envois massifs lors du lancement d'une campagne |
| **Rate limiting** | Limiter les tentatives de connexion pour prévenir les attaques brute force |
| **Chiffrement des réponses** | Chiffrer les colonnes sensibles (`answers`, `manager_comment`) au repos |
| **Backup automatique** | Script de sauvegarde MySQL planifié avec rotation et alerte en cas d'échec |
| **Observabilité** | Intégration de métriques (Prometheus) et traces (OpenTelemetry) pour le monitoring en prod |
| **Multi-instances stateless** | S'assurer que la session JWT est suffisante pour scaler horizontalement sans sticky session |

---

## Accessibilité & UX

| Fonctionnalité | Description |
|---|---|
| **Navigation clavier complète** | Tous les formulaires et actions accessibles au clavier (WCAG 2.1 AA) |
| **Mode haut contraste** | Thème additionnel pour les utilisateurs malvoyants |
| **Internationalisation des formulaires** | Les questions des templates peuvent être rédigées en plusieurs langues |
| **Responsive mobile amélioré** | Optimiser l'expérience sur petits écrans pour les managers en déplacement |
| **Indicateurs de progression animés** | Feedback visuel clair lors des soumissions, validations, chargements |
| **Tour guidé / onboarding** | Overlay interactif pour les nouveaux utilisateurs expliquant les étapes clés |
| **Aperçu avant soumission** | L'employé peut relire son formulaire entier avant de cliquer "Soumettre" |
