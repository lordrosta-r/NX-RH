# Configuration

Ce guide couvre la configuration de NanoXplore RH effectuée par l'administrateur via l'interface web. Tous les paramètres décrits ici sont persistés dans MongoDB (collection `Config`) et prennent effet immédiatement sans redémarrage du serveur, sauf indication contraire.

La référence complète en anglais se trouve dans `docs/CONFIGURATION.md`.

---

## 1. Première connexion et changement du mot de passe par défaut

Le tout premier compte administrateur est créé par le script de bootstrap lors de l'installation initiale (voir [[Installation]]).

**Si `ADMIN_PASSWORD` n'est pas fourni au script**, le compte est créé avec le mot de passe codé en dur `Admin@Change2026` et l'indicateur `mustChangePassword` est positionné à `true` sur le compte. Cet indicateur est visible dans le tableau de bord de statut de configuration pour signaler qu'une action est requise.

A la première connexion avec ce mot de passe par défaut, l'application impose un flux de changement de mot de passe avant d'autoriser l'accès à toute autre page. Une fois le mot de passe changé, l'indicateur `mustChangePassword` est effacé et ne réapparait plus dans le tableau de bord.

La longueur minimale du mot de passe imposée est de 12 caractères.

---

## 2. Annuaires LDAP

**Chemin UI :** Administration > Annuaire LDAP (`/admin/ldap`)

L'application prend en charge plusieurs sources LDAP simultanées. Chaque source est un bloc de configuration indépendant. Les modifications de la liste des sources sont conservées localement dans le navigateur jusqu'à ce que l'administrateur clique sur **Enregistrer** — un avertissement de modifications non enregistrées s'affiche tant qu'un brouillon existe. Le bouton Enregistrer est désactivé en présence d'erreurs de validation.

### Ajouter une source

Cliquer sur **Ajouter un annuaire**. Un nouveau bloc de source apparaît avec les champs suivants :

| Champ | Description | Défaut |
|---|---|---|
| Nom | Nom d'affichage libre pour cet annuaire | "Nouvel annuaire" |
| Activé | Si cette source est active pour l'authentification et la synchronisation | coché |
| Hôte (URL) | URL du serveur LDAP, ex. `ldap://openldap:389` ou `ldaps://dc.exemple.com:636` | `ldap://` |
| Base DN | Racine de recherche, ex. `dc=exemple,dc=com` | — |
| Bind DN | DN du compte de service, ex. `cn=admin,dc=exemple,dc=com` | — |
| Mot de passe Bind | Mot de passe du compte de service | — |
| Filtre utilisateur | Filtre LDAP pour sélectionner les entrées utilisateur | `(objectClass=person)` |
| Rôle par défaut | Rôle attribué aux nouveaux utilisateurs lors de la synchronisation | `employee` |
| Patterns d'exclusion | Patterns glob séparés par des virgules pour exclure les comptes de service, ex. `svc-*, *@bots.local` | — |

**Correspondance des attributs** — un second ensemble de champs fait correspondre les attributs LDAP aux champs de l'application :

| Champ | Attribut LDAP par défaut |
|---|---|
| Attribut email | `mail` |
| Attribut prénom | `givenName` |
| Attribut nom | `sn` |

L'attribut LDAP `manager` (défaut : `manager`) est résolu automatiquement lors de la synchronisation pour renseigner le champ hiérarchique `managerId`. Il n'apparait pas comme champ configurable dans l'UI.

### Comportement TLS

En production (`NODE_ENV=production`), la vérification des certificats TLS est toujours appliquée et ne peut pas être désactivée par la configuration d'une source. En développement, elle peut être contournée via `LDAP_TLS_REJECT_UNAUTHORIZED=false`.

### Test, Aperçu, Synchronisation

Ces trois actions sont disponibles par source. Elles sont désactivées tant qu'il y a un brouillon non enregistré — enregistrer d'abord.

- **Test** : ouvre une connexion bind/unbind pour vérifier que l'hôte, le Bind DN et le mot de passe sont corrects. Retourne un message de succès ou d'erreur en ligne.
- **Aperçu** : récupère jusqu'à 500 entrées de l'annuaire (en utilisant le filtre et la correspondance d'attributs configurés) et les affiche dans un tableau montrant le CN, l'email et le DN. Aucune donnée n'est écrite en base.
- **Synchronisation** : effectue un upsert complet vers MongoDB (jusqu'à 1 000 entrées par exécution) :
  - Les entrées correspondant à un pattern d'exclusion sont ignorées. Si un compte correspondant avait été importé précédemment, il est **bloqué** (pas supprimé) avec la raison "Compte système/service exclu (synchronisation LDAP)".
  - Les nouvelles entrées sont créées avec un mot de passe bcrypt aléatoire ; elles s'authentifient via LDAP.
  - Les entrées existantes voient leur nom, département, poste et DN mis à jour ; leur mot de passe n'est jamais écrasé.
  - L'attribut DN `manager` est résolu en un second passage pour lier `managerId` dans la hiérarchie. Les relations manager auto-référentes sont silencieusement ignorées.
  - Après synchronisation, l'UI affiche un résumé : **créés**, **mis à jour**, **ignorés**, **erreurs**.

**Important :** les rôles ne sont jamais déduits des attributs Active Directory. Tous les utilisateurs sont créés avec le `rôle par défaut` configuré. Un administrateur attribue les rôles individuellement dans l'application.

---

## 3. Email SMTP

**Chemin UI :** Administration > Configuration mail (`/admin/mail-config`)

### Champs

| Champ | Description |
|---|---|
| Hôte SMTP | Nom d'hôte du serveur mail, ex. `smtp.exemple.com` |
| Port SMTP | Numéro de port (valeurs courantes : 587 pour STARTTLS, 465 pour TLS implicite) |
| Nom d'utilisateur | Nom d'utilisateur pour l'authentification SMTP |
| Mot de passe | Mot de passe SMTP. Si un mot de passe est déjà enregistré (indicateur `passwordSet`), laisser le champ vide conserve la valeur existante. |
| Expéditeur (email) | Adresse d'expédition, ex. `<adresse-expéditeur>` |
| Expéditeur (nom) | Nom d'affichage de l'expéditeur |
| TLS (sécurisé) | Case à cocher — activer le TLS implicite (port 465). Laisser décoché pour STARTTLS sur le port 587. |

### Preset OVH

Cliquer sur le bouton **OVH** remplit automatiquement `smtpHost` avec `smtp.ovh.net` et `smtpPort` avec `587`, en laissant tous les autres champs inchangés.

### Envoi de test

Un panneau de test dédié sur la même page permet à l'administrateur de saisir une adresse destinataire et de déclencher un email de test immédiatement via le bouton **Envoyer un test**. La page expose également un lien vers `/admin/test-mail` pour un flux de test plus détaillé.

### Comportement de repli (aucun hôte configuré)

Lorsqu'aucun hôte SMTP n'est enregistré, le mailer bascule sur un compte de test Ethereal créé automatiquement (`ethereal.email`). Les emails ne sont pas réellement délivrés mais sont capturés et une URL d'aperçu est journalisée côté serveur. Ce comportement est destiné aux environnements de développement uniquement.

### Priorité de configuration

Le mailer lit les paramètres depuis MongoDB au démarrage (clés `smtp.host`, `smtp.port`, etc.), avec les variables d'environnement comme repli. Après enregistrement via l'UI, le transporteur en mémoire est invalidé et reconstruit avec les nouveaux paramètres au prochain email sortant.

---

## 4. Certificat SSL

**Chemin UI :** Administration > Certificat SSL

### Bootstrap du certificat au premier déploiement

Lors d'un premier déploiement, aucune configuration manuelle de certificat n'est requise avant le démarrage de la pile. Le service Docker `cert-init` s'exécute une seule fois au démarrage de la pile et, si `nginx/certs/fullchain.pem` ou `nginx/certs/privkey.pem` sont absents, génère un certificat RSA 2048 auto-signé pour `localhost` dans ce répertoire. Nginx ne démarre qu'après la complétion réussie de `cert-init`.

Le navigateur affichera un avertissement de certificat pour le certificat auto-signé ; accepter l'exception ou remplacer le certificat comme décrit ci-dessous.

### Statut du certificat actuel

La page affiche le nom commun (CN) du certificat actuellement installé, la date d'expiration et le nombre de jours restants. Un badge passe au rouge quand il reste moins de 30 jours.

### Option A — Téléverser un vrai certificat via l'UI admin (recommandé)

1. Se connecter en tant qu'administrateur et aller dans **Administration > Certificat SSL**.
2. Téléverser le fichier `fullchain.pem` (certificat + chaîne intermédiaire) et `privkey.pem`.
3. L'API valide les fichiers (marqueurs PEM, expiration, correspondance clé/certificat) et les écrit de manière atomique dans le volume partagé `nginx/certs/`.
4. Recharger nginx pour activer le nouveau certificat (sans interruption de service) :

```bash
docker compose kill -s HUP nginx
```

### Option B — Placer les fichiers de certificat manuellement

```bash
cp /chemin/vers/fullchain.pem ./nginx/certs/fullchain.pem
cp /chemin/vers/privkey.pem   ./nginx/certs/privkey.pem
chmod 600 ./nginx/certs/privkey.pem

docker compose kill -s HUP nginx
```

### Option C — Générer un certificat auto-signé pour un domaine spécifique

```bash
bash scripts/gen-certs.sh votre.domaine.com
# Ecrit nginx/certs/fullchain.pem et nginx/certs/privkey.pem
docker compose kill -s HUP nginx
```

---

## 5. Logo / Identité visuelle

**Chemin UI :** Administration > Configuration système (`/admin/config`)

L'administrateur peut téléverser un logo d'entreprise qui apparait dans la navigation de l'application.

Le logo doit être fourni sous forme d'URL de données base64 dans l'un des formats suivants : PNG, JPEG, SVG, WebP ou GIF. La taille maximale acceptée est d'environ 500 Ko (la chaîne base64 brute doit faire moins de 700 Ko en incluant le préfixe de l'URL de données). Le logo est stocké dans la collection `Config` sous la clé `branding.logo` — aucun fichier statique n'est écrit sur le disque.

Définir le logo à `null` l'efface.

---

Etapes suivantes : [[Gestion-des-comptes]]
