// =============================================================================
// database/mongo-init.js — Initialisation Docker MongoDB
//
// Ce script est exécuté UNE SEULE FOIS au premier démarrage du container
// MongoDB, dans le contexte mongosh (pas Node.js).
//
// Il crée l'utilisateur applicatif "nanoxplore" avec les droits readWrite
// sur la base nanoxplore_rh.
//
// IMPORTANT : ici on utilise process.env.MONGO_APP_PASSWORD
// qui est passé via l'entrypoint Docker (--eval ou variable dans docker-compose).
// Voir docker-compose.yml → environment: MONGO_APP_PASSWORD
// =============================================================================

// En mongosh, les variables d'environnement sont disponibles via process.env
// à condition d'être dans l'entrypoint d'init (pas via --eval seul).
// Si MONGO_APP_PASSWORD n'est pas défini, on bloque avec une erreur claire.

const appPassword = process.env.MONGO_APP_PASSWORD
if (!appPassword) {
  print('[mongo-init] ERREUR : MONGO_APP_PASSWORD non définie')
  quit(1)
}

// Sélectionner (ou créer) la base applicative
// Renommé en appDb pour éviter le shadowing de la variable globale mongosh `db`
const appDb = db.getSiblingDB('nanoxplore_rh')

// Créer l'utilisateur applicatif avec droits readWrite uniquement
// (pas de droits admin sur le cluster)
appDb.createUser({
  user: 'nanoxplore',
  pwd:  appPassword,
  roles: [
    { role: 'readWrite', db: 'nanoxplore_rh' }
  ]
})

print('[mongo-init] Utilisateur "nanoxplore" créé sur la base nanoxplore_rh')
