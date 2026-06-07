# Rôle — Admin (Administrateur système)

> **Design complet :** voir [`designs/roles/designadmin_campagne.txt`](../../designs/designadmin_campagne.txt)

## Qui est-il ?

L'Admin est le **gardien technique** de la plateforme. Il ne pilote pas le processus RH — c'est le rôle de HR. Il s'assure que la plateforme fonctionne, que les utilisateurs existent avec le bon rôle, et que les intégrations (LDAP, SMTP) sont correctement configurées.

**Redirection après connexion :** `/admin`

---

## Navigation — Routes Admin (SPA)

| Item | Route | Description |
|---|---|---|
| Dashboard | `/admin` | Vue d'ensemble système |
| Utilisateurs | `/admin/users` | CRUD utilisateurs, rôles, rattachements |
| Organigramme | `/admin/org-chart` | Smart Org-Chart (4 modes : All, Ligne Managériale, Hub Équipe, Diagnostic) |
| Rôles | `/admin/roles` | RBAC personnalisable |
| Import Templates | `/admin/templates-import` | Import CSV/JSON de formulaires (AI-ready) |
| Communications | `/admin/communications` | Email templating avec variables |
| Conformité RGPD | `/admin/compliance` | Rétention, anonymisation, exports |
| Sécurité | `/admin/security` | Audit logs, impersonation mode |
| Intégrations | `/admin/integrations` | LDAP/AD, SMTP |
| Sandbox | `/admin/sandbox` | Mode test pour valider les campagnes |
| Paramètres | `/admin/settings` | White-labeling, branding |

---

## Ce qui le différencie de HR

| | HR | Admin |
|---|---|---|
| Crée les templates et campagnes | ✓ | ✓ (accès total) |
| Voit toutes les évaluations | ✓ | ✓ |
| Gère les utilisateurs | — | ✓ |
| Configure LDAP | — | ✓ |
| Configure SMTP | — | ✓ |
| Modifie les rôles | — | ✓ |

---

## Gestion des utilisateurs

L'Admin a accès à un panel de gestion des utilisateurs :

### Créer un utilisateur

```
Paramètres → Utilisateurs → Nouvel utilisateur
  ├─ Email professionnel
  ├─ Nom, prénom, poste
  ├─ Rôle : admin / hr / manager / employee
  ├─ Rattachement hiérarchique (manager_id) si applicable
  └─ Mot de passe initial (ou invitation par email)
```

### Modifier un utilisateur

- Changer le rôle (ex : promouvoir un employee en manager)
- Modifier le rattachement hiérarchique (changer de manager)
- Réinitialiser le mot de passe
- Désactiver le compte (soft delete — les données sont conservées)

Un manager peut superviser d'autres managers via `managerId` sans rôle dédié "director".

### Désactiver un utilisateur

Un compte désactivé ne peut plus se connecter mais ses évaluations passées restent archivées. Si cet utilisateur était manager, ses anciens rapports directs doivent être réattribués avant désactivation.

---

## Configuration LDAP / Active Directory

```
Paramètres → Intégrations → LDAP
  ├─ Type : activedirectory | openldap
  ├─ URL du serveur (ldap:// ou ldaps://)
  ├─ Compte de service (bind DN + mot de passe)
  ├─ Base DN pour la recherche d'utilisateurs
  ├─ Filtre de recherche (ex : (mail=%s))
  └─ Tester la connexion → résultat immédiat
```

> La variable d'environnement `LDAP_TYPE` détermine le mode à l'initialisation. L'interface permet de la reconfigurer sans redémarrage.

Si LDAP est activé :
- Les utilisateurs s'authentifient avec leurs identifiants AD/LDAP
- Ils n'ont pas de mot de passe local dans NanoXplore RH
- Leur compte doit quand même exister dans la base (provisioning manuel ou automatique)

---

## Configuration SMTP

```
Paramètres → Intégrations → Email
  ├─ Hôte SMTP
  ├─ Port (465 SSL / 587 STARTTLS)
  ├─ Utilisateur / mot de passe
  ├─ Adresse expéditeur (From)
  └─ Envoyer un email de test
```

Les emails sont utilisés pour :
- Notifier les employés de l'ouverture d'une campagne
- Envoyer des rappels aux retardataires
- Notifier les managers des soumissions de leurs équipes
- Confirmation de validation d'entretien

---

## Campagnes (droits étendus)

L'Admin peut tout faire sur les campagnes que HR peut faire, plus :
- Forcer la clôture d'une campagne même avec des entretiens non validés
- Modifier les dates d'une campagne active
- Supprimer une campagne en état `draft`
- Archiver ou restaurer des campagnes

---

## Ce que l'Admin ne peut PAS faire

- Agir sur une évaluation à la place d'un employé ou d'un manager (intégrité des données)
- Supprimer définitivement des évaluations soumises (audit trail obligatoire)
- Bypasser l'ordre des phases du cycle (les règles métier s'appliquent à tous)
