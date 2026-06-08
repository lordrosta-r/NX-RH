# CI/CD — Intégration et livraison continues

Ce document décrit les deux pipelines GitHub Actions du projet NanoXplore RH : le pipeline
d'intégration continue (CI) et le pipeline de livraison continue (CD). Il explique ce que chaque
pipeline fait concrètement et comment une release versionnée produit une image Docker publiée.

---

## Vue d'ensemble

| Pipeline | Fichier | Se déclenche sur |
|----------|---------|-----------------|
| CI | `.github/workflows/ci.yml` | push et PR vers `main` |
| CD | `.github/workflows/cd.yml` | push vers `main` et tags `v*` |

---

## Pipeline CI

### Objectif

Vérifier que le code qui entre dans `main` (ou prétend y entrer via une PR) est propre : les tests
passent, le code compile, le lint ne signale rien.

### Déclenchement

```yaml
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
```

### Concurrence

Un mécanisme de concurrence annule automatiquement les runs obsolètes sur une même branche :

```yaml
concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true
```

Si vous faites deux commits rapprochés sur la même branche, le premier run est annulé dès que le
second démarre. Cela évite les files d'attente et le bruit.

### Job Backend

Tourne en parallèle avec le job Frontend sur `ubuntu-latest`.

**Service annexe** : un conteneur MongoDB 7 est lancé et déclaré sain avant les tests, via un
healthcheck `mongosh --eval 'db.runCommand({ ping: 1 })'`.

**Etapes :**

1. Checkout du dépôt.
2. Installation de Node.js 20 (cache `npm` sur `mongo/server/package-lock.json`).
3. `npm ci` dans `mongo/server/`.
4. `npm test -- --coverage` avec les variables d'environnement de test :
   - `MONGO_URI` et `MONGODB_URI` pointent vers le service MongoDB local (`localhost:27017`).
   - `JWT_SECRET` et `JWT_REFRESH_SECRET` sont des valeurs de test dédiées (distinctes des
     secrets de production).

### Job Frontend

Tourne en parallèle avec le job Backend sur `ubuntu-latest`.

**Etapes :**

1. Checkout du dépôt.
2. Installation de Node.js 20 (cache `npm` sur `frontend-v2/package-lock.json`).
3. `npm ci` dans `frontend-v2/`.
4. Vérification TypeScript : `npx tsc --noEmit`.
5. Lint : `npm run lint`.
6. Tests unitaires Vitest : `npm run test:run`.
7. Build de production : `npm run build` — confirme qu'il n'y a aucune erreur de compilation Vite.

---

## Pipeline CD

### Objectif

Construire l'image Docker multi-stage, la pousser sur le registre GitHub Container Registry
(`ghcr.io`), puis vérifier que l'image publiée démarre correctement.

### Déclenchement

```yaml
on:
  push:
    branches: [main]
    tags: ['v*']
```

Le pipeline CD tourne à chaque merge sur `main` **et** à chaque tag de release `v*`.

### Concurrence

Contrairement au CI, la concurrence est configurée avec `cancel-in-progress: false` pour les
runs CD. Un build en cours n'est jamais annulé : on ne veut pas publier une image partielle.

### Permissions

```yaml
permissions:
  contents: read
  packages: write
```

Le token `GITHUB_TOKEN` automatique est suffisant pour pousser sur `ghcr.io` — aucun secret
supplémentaire n'est nécessaire.

### Image de référence

```
ghcr.io/lordrosta-r/nx-rh
```

### Calcul des tags

Le step `Compute tags` détermine quels tags Docker appliquer selon le contexte :

| Contexte | Tags appliqués |
|----------|---------------|
| Push sur `main` | `ghcr.io/lordrosta-r/nx-rh:<sha>`, `ghcr.io/lordrosta-r/nx-rh:latest` |
| Tag `v*` (release) | `ghcr.io/lordrosta-r/nx-rh:<sha>`, `ghcr.io/lordrosta-r/nx-rh:<version>`, `ghcr.io/lordrosta-r/nx-rh:latest` |

### Comment une release produit un package Docker versionné

1. Créez un tag Git annoté sur `main` :

```bash
git tag -a v1.2.0 -m "Release v1.2.0"
git push origin v1.2.0
```

2. Le pipeline CD se déclenche automatiquement sur ce tag.
3. L'image est construite avec le cache GitHub Actions (BuildKit).
4. Elle est poussée avec trois tags simultanément : `<sha>`, `v1.2.0`, `latest`.
5. Un smoke test vérifie que le conteneur démarre et imprime `NanoXplore RH démarré` dans ses
   logs.
6. L'image versionnée est disponible sur :
   `ghcr.io/lordrosta-r/nx-rh:v1.2.0`

Pour déployer cette version précise en production :

```bash
docker pull ghcr.io/lordrosta-r/nx-rh:v1.2.0
```

### Smoke test post-publication

Après la publication, le pipeline lance un test d'intégration rapide :

```bash
docker pull ghcr.io/lordrosta-r/nx-rh:<sha>
docker network create nxnet
docker run -d --name mongo --network nxnet mongo:7
docker run -d --name nxrh-test --network nxnet \
  -e NODE_ENV=production \
  -e MONGO_URI=mongodb://mongo:27017/test \
  -e JWT_SECRET=$(openssl rand -hex 32) \
  -e JWT_REFRESH_SECRET=$(openssl rand -hex 32) \
  ghcr.io/lordrosta-r/nx-rh:<sha>
```

Le job échoue si le conteneur quitte ou si la ligne `NanoXplore RH démarré` n'apparaît pas dans
les logs dans les 10 secondes.

---

## Vérifications locales avant de pousser

Ces commandes reproduisent ce que le CI exécute. Les lancer localement évite de découvrir les
erreurs après coup.

```bash
# Backend
cd mongo/server
npm ci
npm test

# Frontend
cd frontend-v2
npm ci
npx tsc --noEmit
npm run lint
npm run test:run
npm run build
```

Voir aussi [[QA-et-Tests]] pour la stratégie de tests complète.
