# Rôles & RBAC

Quatre rôles : **employee**, **manager**, **hr**, **admin**. (Le rôle legacy `director`
n'existe plus ; les comptes legacy sont traités comme managers.)

## Qui voit quoi

La navigation est calculée par `getPerspectiveNav(role, perspective, t)`
(`components/layout/navConfig.ts`). Le **manager** et la **RH**/**admin** ont **deux
perspectives** (« Mon espace » / « Mon Équipe ») via un switch central dans la barre.

| Capacité | employee | manager | hr | admin |
|----------|:--:|:--:|:--:|:--:|
| Remplir sa propre évaluation, signer sa fiche | ✅ | ✅ | ✅ | ✅ |
| Faire une demande (mobilité, PDI) | ✅ | ✅ | ✅ | ✅ |
| Voir / traiter son équipe (`/manager/todo`, entretien) | — | ✅ | ✅ | ✅ |
| Relire/réviser une éval de son périmètre, signer l'entretien | — | ✅ | ✅ | ✅ |
| Lister les utilisateurs / organigramme | — | ✅ | ✅ | ✅ |
| Créer/lancer/clôturer une campagne, créer un formulaire | — | — | ✅ | ✅ |
| Gérer utilisateurs/départements, analytique, flags RH | — | — | ✅ | ✅ |
| Bloquer / débloquer un compte | — | — | ✅ | ✅ |
| Supprimer définitivement, LDAP/SSL/SMTP, audit, impersonation | — | — | — | ✅ |

## Invariants de sécurité (non négociables)

- Les **transitions d'évaluation sont gatées par l'identité** : l'employé soumet *sa* fiche,
  le manager relit celles de *son* équipe. Aucun rôle ne signe à la place d'un autre.
- **La RH ne signe que `signed_hr`** (la synthèse), elle ne se substitue pas au face-à-face.
- **Le manager** n'agit que dans **son périmètre** (sa file `/manager/todo` est filtrée sur
  `evaluatorId = lui`). Le **drag-and-drop** de rattachement dans l'organigramme est réservé à
  admin/hr ; le manager rattache via la fiche (« Responsable direct »).
- **Impersonation** (admin → voir en tant que) : **lecture seule**, jamais un autre admin,
  toute écriture renvoie 403, seule la sortie est autorisée.
- On ne peut **ni se bloquer ni se supprimer soi-même** ; on ne supprime pas **le dernier admin**.

> Ces invariants sont couverts par le harness QA (matrice autorisé/interdit) et par
> ~402 cas de backlog. cf. [QA & Tests](QA-et-Tests).
