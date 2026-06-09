# Mise a jour

Ce guide décrit comment mettre à jour en toute sécurité un déploiement en production de NanoXplore RH (nginx + app + mongo, orchestré avec Docker Compose).

Lire ce document en entier avant d'exécuter la moindre commande.

La référence complète en anglais se trouve dans `docs/UPDATE.md`.

---

## Prérequis

- Accès SSH au serveur de production
- `git` disponible sur le serveur (le dépôt y est cloné)
- Docker et Docker Compose v2 installés (commande `docker compose`, pas `docker-compose`)
- Une sauvegarde récente de la base de données (voir étape 1)

---

## Etape 1 — Sauvegarder d'abord, toujours

**Ne jamais mettre à jour sans une sauvegarde vérifiée.** En cas de problème, c'est le seul filet de sécurité.

Procédure de sauvegarde complète : voir [[Sauvegarde-Restauration]].

Commande rapide pour exporter la base de données depuis l'intérieur du conteneur en cours d'exécution :

```bash
docker compose exec mongo mongodump \
  --username "$MONGO_ROOT_USER" \
  --password "$MONGO_ROOT_PASSWORD" \
  --authenticationDatabase admin \
  --db "${MONGO_DB:-nanoxplore_rh}" \
  --out /tmp/backup-avant-update

# Copier l'export hors du conteneur
docker compose cp mongo:/tmp/backup-avant-update ./backup-avant-update-$(date +%Y%m%d%H%M%S)
```

Vérifier que le répertoire de sauvegarde n'est pas vide avant de continuer :

```bash
ls -lh ./backup-avant-update-*/
```

---

## Etape 2 — Récupérer la nouvelle version

### En utilisant un tag de release (recommandé pour la production)

```bash
git fetch --tags

# Lister les tags disponibles pour identifier la version cible
git tag --sort=-creatordate | head -20

# Basculer sur le tag cible
git checkout v1.2.3   # remplacer par le tag réel
```

### En utilisant la pointe de la branche main

```bash
git fetch origin
git checkout main
git pull origin main
```

Confirmer que la version attendue est en place avant de construire :

```bash
git log -1 --oneline
```

---

## Etape 3 — Reconstruire et redémarrer

Le Dockerfile utilise un build en deux étapes : l'étape 1 compile le frontend Vite/React, l'étape 2 produit l'image Express de production. Les deux étapes s'exécutent dans Docker ; aucune installation Node.js locale n'est requise sur le serveur.

### Construire la nouvelle image

```bash
docker compose build
```

### Déployer avec une interruption minimale

```bash
docker compose up -d
```

Docker Compose remplace les conteneurs service par service. Le service `nginx` dépend de la santé du service `app` (`condition: service_healthy`), donc nginx n'est rechargé qu'une fois que le nouveau conteneur applicatif passe son contrôle de santé (`GET /api/health`, intervalle de 30 s, 3 tentatives, période de démarrage de 15 s). Attendre une brève fenêtre (moins d'une minute) pendant laquelle les requêtes en cours peuvent être interrompues.

En mode haute disponibilité (plusieurs répliques) :

```bash
docker compose up -d --scale app=3
```

Docker Compose fait tourner les répliques en séquence, en maintenant au moins quelques instances en service tout au long du processus.

---

## Etape 4 — Vérifier le déploiement

```bash
# Vérifier le statut des conteneurs
docker compose ps
```

Les trois services doivent afficher le statut `Up` et, pour `app` et `mongo`, `(healthy)`.

```bash
# Via nginx et TLS
curl -s https://votre-domaine/api/health

# Directement vers le conteneur applicatif
curl -s http://localhost:3000/api/health
```

Réponse attendue : `{"status":"ok"}`

Surveiller les journaux applicatifs pendant quelques minutes :

```bash
docker compose logs -f app

# Ou les 200 dernières lignes
docker compose logs --tail=200 app
```

Surveiller les erreurs au démarrage, les exceptions non gérées ou les échecs de connexion à la base de données.

---

## Etape 5 — Procédure de rollback

Si la nouvelle version est défectueuse et qu'il faut revenir en arrière :

### Revenir à la version précédente

```bash
# Si la mise à jour a utilisé un tag, basculer sur le tag précédent
git checkout v1.2.2   # la dernière version connue comme fonctionnelle

# Si la branche main a été utilisée, retrouver le SHA du commit précédent
git log --oneline | head -10
git checkout <sha-precedent>
```

### Reconstruire et redémarrer depuis cette version

```bash
docker compose build
docker compose up -d
```

Vérifier avec `docker compose ps` et le point de contrôle de santé comme décrit à l'étape 4.

### Restaurer la base de données si nécessaire

Si la nouvelle version a écrit des changements de schéma ou corrompu des données, restaurer depuis la sauvegarde prise à l'étape 1 :

```bash
# Copier l'export dans le conteneur mongo
docker compose cp ./backup-avant-update-<horodatage>/ mongo:/tmp/restore/

# Exécuter mongorestore dans le conteneur
docker compose exec mongo mongorestore \
  --username "$MONGO_ROOT_USER" \
  --password "$MONGO_ROOT_PASSWORD" \
  --authenticationDatabase admin \
  --db "${MONGO_DB:-nanoxplore_rh}" \
  --drop \
  /tmp/restore/nanoxplore_rh/
```

L'option `--drop` supprime les collections existantes avant la restauration pour garantir un état propre. Ne l'utiliser que lorsque la cible de restauration est certaine.

Procédure de restauration complète : voir [[Sauvegarde-Restauration]].

---

## Mises à jour de dépendances (PRs Dependabot)

Le dépôt utilise Dependabot pour ouvrir des pull requests lorsque des dépendances npm ou des images Docker ont de nouvelles versions disponibles (ex. `node:20-alpine`, `nginx:1.27-alpine`, `mongo:7`, packages npm frontend et serveur).

Règles avant de fusionner une PR Dependabot :

1. Lire le diff — comprendre ce qui est mis à jour et s'il s'agit d'une mise à jour corrective, mineure ou majeure.
2. La CI doit être au vert (toutes les vérifications passées) avant la fusion.
3. Pour les mises à jour majeures de version (ex. `mongo:7` -> `mongo:8`, Node.js 20 -> 22), tester d'abord sur un environnement de staging.
4. Après fusion, déployer en production en suivant les étapes 1 à 4 de ce document.

Ne jamais fusionner une PR Dependabot directement en production sans sauvegarde.

---

## Migrations de base de données

NanoXplore RH utilise Mongoose (ODM MongoDB). Il n'y a pas de framework de migration dédié dans la base de code. L'évolution du schéma est gérée au niveau applicatif :

- Les schémas Mongoose définissent la forme attendue des documents.
- Les nouveaux champs optionnels ajoutés à un schéma sont automatiquement tolérés par les documents existants (qui retourneront simplement `undefined` pour le nouveau champ).
- Les documents existants ne sont **pas** automatiquement remplis lorsqu'un nouveau champ est ajouté. Si un remplissage est nécessaire, il doit être effectué via un script ponctuel exécuté manuellement contre la base de données après le déploiement.
- Supprimer ou renommer un champ dans le schéma ne supprime pas les données des documents existants dans MongoDB ; les champs orphelins restent dans la collection jusqu'à ce qu'ils soient explicitement purgés.

Pratique recommandée : avant de déployer une version qui modifie un schéma Mongoose de manière incompatible, prendre une sauvegarde complète de la base de données (étape 1), déployer, et vérifier que l'application gère correctement les documents dans l'ancien et le nouveau format. En cas de problème, revenir en arrière immédiatement (étape 5).

---

Voir aussi : [[Sauvegarde-Restauration]]
