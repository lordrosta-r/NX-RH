# Gestion des comptes

Cette page decrit le cycle de vie des comptes utilisateurs dans NanoXplore RH : creation, modification, synchronisation LDAP, blocage/deblocage, suppression et offboarding. Pour la configuration technique du serveur LDAP, voir [[Configuration]].

---

## Creation d'un compte

Seuls les roles `admin` et `hr` peuvent creer des comptes (`/users/new`, `/admin/users/import`).

A la creation, le service (`services/userService.js`, fonction `createUser`) :

1. Valide la presence obligatoire de `firstName`, `lastName` et `email`.
2. Verifie que le role fourni appartient a la liste des roles valides ; si aucun role n'est precise ou si le role est invalide, l'utilisateur est cree avec le role `employee` par defaut.
3. Genere un mot de passe temporaire aleatoire (16 octets hexadecimaux) et le hache avec bcrypt (12 tours).
4. Cree le document utilisateur avec `isActive: true` et `authSource: 'local'`.
5. Retourne l'utilisateur cree sans les champs sensibles (`passwordHash`, `ldapDn`), accompagne du mot de passe temporaire a communiquer a l'utilisateur.

### Import en masse

L'import CSV/JSON (`/admin/users/import`, service `bulkUpsertUsers`) effectue un upsert par adresse email :
- Si l'email existe deja : mise a jour des champs autorises (whitelist stricte).
- Si l'email est nouveau : creation avec un mot de passe par defaut et le flag `mustChangePassword: true`, qui force le changement de mot de passe a la premiere connexion.

La whitelist d'import est limitee aux champs : `firstName`, `lastName`, `department`, `position`, `sectorId`, `managerId`, `isActive`, `role`. Tout champ hors liste est silencieusement ignore afin d'empecher toute elevation de privileges (injection de `passwordHash`, `authSource`, etc.) via l'API d'import.

---

## Modification d'un compte

La mise a jour (`updateUser`) applique une whitelist stricte des champs modifiables :

```
email, firstName, lastName, department, position, role, managerId,
isActive, avatar, phone, canViewSubtree
```

Un utilisateur sans role `admin` ou `hr` ne peut modifier que ses propres champs non proteges (profil, avatar, telephone). Les champs `role`, `managerId`, `isActive`, `department`, `position`, `email` et `canViewSubtree` sont reserves aux roles `admin` et `hr`.

### Garde-fou anti-verrouillage

Le systeme refuse toute operation qui supprimerait le dernier administrateur actif, que ce soit par demotion de role (`admin` vers un autre role) ou par desactivation du compte. Si un seul compte `admin` est actif, l'action est bloquee avec un message explicite demandant de promouvoir un autre administrateur avant.

---

## Synchronisation LDAP

L'authentification LDAP est utilisee uniquement au moment de la connexion pour verifier les identifiants. Une fois la session etablie, un cookie JWT `httpOnly` est utilise pour toutes les requetes suivantes : il n'y a aucun aller-retour LDAP par requete.

Les roles sont attribues et geres exclusivement par l'administrateur dans l'interface de l'application. LDAP ne transporte pas de role ; il fournit uniquement la verification d'identite. La configuration de la connexion LDAP est accessible via `/admin/ldap` (role `admin` uniquement). Voir [[Configuration]] pour les details de parametrage.

---

## Bloquer et debloquer un compte

Le blocage d'un compte revient a passer `isActive` a `false`. Cette operation est reversible : un compte bloque peut etre reactivite en repassant `isActive` a `true`.

Consequences du blocage :
- L'utilisateur ne peut plus se connecter.
- Ses donnees et evaluations sont conservees.
- Ses evaluations en cours restent dans leur etat : elles ne sont pas archivees automatiquement.

Le deblocage restaure l'acces sans perte de donnees.

---

## Suppression (desactivation)

La fonction `deleteUser` effectue une **suppression logique** (soft delete) : elle passe `isActive` a `false` sans supprimer le document de la base. Un administrateur ne peut pas se supprimer lui-meme. La protection anti-verrouillage s'applique egalement ici : on ne peut pas desactiver le dernier administrateur actif.

### Anonymisation RGPD

Pour exercer le droit a l'effacement (RGPD), la fonction `gdprAnonymizeUser` remplace les donnees personnelles par des valeurs neutres (`Anonyme`, adresse email anonymisee) et desactive le compte. Cette operation est **bloquee** si l'utilisateur a des evaluations en cours aux statuts `assigned`, `in_progress` ou `submitted`.

L'export RGPD (`gdprExportUser`) permet de telecharger l'ensemble des donnees personnelles et des evaluations associees a un compte.

---

## Comptes systeme

L'administrateur doit exclure de toute gestion ordinaire les comptes techniques ou systeme qui peuvent exister dans la base (comptes de service, comptes de test). Ces comptes ne doivent pas etre utilises comme comptes nominatifs, ni bloques ou supprimes sans precaution, car certains peuvent etre relies a des integrations techniques.

---

## Offboarding

L'offboarding est le processus structure de sortie d'un employe. Il est declenche via l'API `/api/v1/offboarding` et requiert les champs `reason` (motif du depart) et `effectiveDate` (date effective de depart).

### Etapes du processus

1. **Previsualisation** (`getOffboardPreview`) : avant de lancer l'offboarding, le systeme calcule l'impact : nombre d'evaluations en attente et liste des campagnes actives concernees. Cette etape permet a la RH de prendre une decision eclairee.

2. **Reaffectation des subordonnes** : si l'employe offboarde encadre des subordonnes directs actifs, le systeme **refuse l'offboarding** tant qu'un remplaçant valide n'est pas designe (`replacementManagerId`). Le remplaçant doit etre :
   - Un utilisateur actif et existant.
   - De role `manager`, `hr` ou `admin`.
   - Diferent de l'employe qui part.
   - Ne pas etre lui-meme un des subordonnes reassignes (garde-fou anti-boucle hierarchique).
   
   Une fois valide, tous les subordonnes directs actifs sont reassignes vers le remplaçant en une seule operation (`User.updateMany`).

3. **Archivage des evaluations** : les evaluations dont l'employe est l'**evalue** et qui ne sont pas dans un etat terminal sont archivees (statut `archived`).

4. **Reassignation des evaluations d'evaluateur** : les evaluations dont l'employe est l'**evaluateur** d'autres personnes ne sont pas archivees (cela detruirait les evaluations de collaborateurs encore presents). Elles sont reassignees vers le N+1 de l'employe (`user.managerId`). Si l'employe n'a pas de N+1 (sommet de hierarchie), les evaluations sont laissees en place pour une reassignation manuelle par la RH via `PATCH /evaluations/:id/reassign`. Un avertissement est emis dans les logs.

5. **Marquage du compte** : le compte est marque `offboardingStatus: 'offboarding'` avec le motif et la date de depart. La desactivation definitive (`isActive: false`) intervient separement.

Toutes les mutations (archivage, reassignation) s'executent dans une transaction MongoDB si les replicas sont disponibles ; sinon en mode sequentiel avec journalisation d'avertissement.
