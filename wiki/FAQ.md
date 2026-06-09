# FAQ — Questions fréquentes

---

## Installation et démarrage

### Comment installer NanoXplore RH ?

L'installation repose sur Docker et Docker Compose. Les grandes étapes sont :

1. Cloner le dépôt.
2. Copier le fichier `.env.example` en `.env` et renseigner les variables obligatoires (`MONGO_URI`, `JWT_SECRET`, `CLIENT_ORIGIN`, etc.).
3. Lancer la stack de production :

```bash
docker compose up -d
```

Un certificat auto-signé pour `localhost` est généré automatiquement au premier démarrage par le service `cert-init`, de sorte que nginx puisse démarrer immédiatement. Consulter [[Installation]] pour le guide complet pas à pas.

### Quel est le mot de passe administrateur par défaut ?

Il n'y a pas de mot de passe par défaut codé en dur. Un assistant de configuration initial (`/admin/setup`) guide la création du premier compte administrateur au premier lancement. Le serveur refuse de démarrer si `JWT_SECRET` ou `MONGO_URI` sont absents ou non conformes — il n'existe pas d'état "démarré sans sécurité".

### Le serveur refuse de démarrer, que faire ?

Vérifier que toutes les variables d'environnement obligatoires sont présentes dans `.env`. Le serveur effectue des contrôles au démarrage et journalise la variable manquante. Consulter [[Depannage]] pour les cas courants.

---

## Certificat SSL

### Comment remplacer le certificat SSL ?

Deux méthodes :

- **Depuis l'interface** (recommandée) : Administration > Certificat SSL. L'administrateur dépose le certificat et la clé privée ; nginx recharge automatiquement.
- **En ligne de commande** : déposer les fichiers dans `nginx/certs/` puis relancer le conteneur nginx. Les certificats ne sont jamais committés dans le dépôt.

Consulter [[Configuration]] pour le détail de la procédure.

---

## Gestion des utilisateurs

### Comment ajouter un utilisateur ?

Deux voies :

- **Import LDAP** : depuis Administration > LDAP, déclencher une synchronisation. Les comptes présents dans l'annuaire sont importés automatiquement avec leur hiérarchie manager.
- **Création manuelle** : depuis `/users/new` (rôles admin et RH uniquement). Renseigner le nom, l'e-mail et le rôle.

Consulter [[Gestion-des-comptes]] et [[Configuration]] pour la configuration LDAP.

### Comment connecter un annuaire LDAP / Active Directory ?

La configuration LDAP se fait entièrement depuis l'interface : Administration > LDAP. Il est possible de déclarer plusieurs annuaires. Les paramètres incluent l'URL du serveur, le DN de liaison, le DN de base de recherche et l'attribut manager pour construire la hiérarchie. Aucune modification de fichier de configuration n'est nécessaire.

Consulter [[Configuration]] pour les champs attendus.

### Comment bloquer ou supprimer un compte ?

Depuis la fiche utilisateur (`/users/:id`), les rôles admin et RH peuvent bloquer, débloquer ou supprimer un compte. La suppression d'un compte système (compte de service ou compte propre à l'application) est réversible via un mécanisme d'exclusion dédié. Consulter [[Gestion-des-comptes]].

---

## Mises à jour

### Comment mettre à jour l'application ?

La procédure standard est :

1. Effectuer une sauvegarde MongoDB avant toute opération.
2. Tirer la nouvelle image depuis le registre (`ghcr.io/lordrosta-r/nx-rh`) ou reconstruire localement.
3. Relancer la stack avec `docker compose up -d`.

En cas de problème, la procédure de rollback consiste à relancer l'image de la version précédente et à restaurer la sauvegarde si nécessaire. Consulter [[Mise-a-jour]] pour les commandes exactes.

---

## Déploiement et distribution

### Où est disponible l'image Docker de l'application ?

L'image est publiée sur le registre de conteneurs GitHub (GHCR) à chaque release taguée :

```
ghcr.io/lordrosta-r/nx-rh:<version>
```

Le pipeline CD (GitHub Actions) construit et pousse l'image automatiquement. Consulter [[CI-CD]] et [[Deploiement]].

### Où trouver les releases ?

Les releases sont publiées sur la page GitHub du projet avec versionnement sémantique. Chaque release inclut les notes de changement. Consulter [[Mise-a-jour]] pour la procédure d'application d'une release.

### Peut-on faire tourner plusieurs instances de l'application ?

Oui. Docker Compose supporte la mise à l'échelle horizontale du service `app` :

```bash
docker compose up -d --scale app=3
```

Nginx, configuré comme reverse proxy, répartit la charge entre les instances.

---

## Sauvegardes

### Où sont stockées les sauvegardes ?

Les données applicatives sont stockées dans MongoDB. La procédure de sauvegarde recommandée utilise `mongodump` pour produire une archive de la base, à stocker sur un support externe au conteneur. Consulter [[Sauvegarde-Restauration]] pour les commandes de sauvegarde et de restauration complètes.

---

## Navigation rapide

- Mise en place initiale : [[Installation]]
- Configuration LDAP / SMTP / SSL : [[Configuration]]
- Déploiement Docker : [[Deploiement]]
- Mise à jour et rollback : [[Mise-a-jour]]
- Gestion des comptes utilisateurs : [[Gestion-des-comptes]]
- Problèmes courants : [[Depannage]]
- Sauvegardes : [[Sauvegarde-Restauration]]
