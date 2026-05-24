# Analyse Psychologique & Design Émotionnel — NX-RH

## Résumé émotionnel global
NX-RH inspire surtout **sérieux, contrôle et fonctionnalité**. L'ensemble est propre et rassurant sur le plan "outil de gestion", mais émotionnellement **assez froid et très administratif**. On sent une volonté de guider, mais rarement de soulager. Le produit est efficace mais pas encore engageant.

## Score émotionnel : 6/10

## 1. Confiance

### ✅ Points forts
- Login sobre et propre, inspire fiabilité — `LoginPage.tsx:75-77`
- Messages d'erreur login humains et rassurants ("Identifiants incorrects", "Réessayez plus tard")
- AdminStatusPage donne une vraie sensation de surveillance infra claire
- Cookie sécurisé et auth robuste (perçu indirectement via fluidité)

### ⚠️ Friction
- Certains messages techniques abrupts ("endpoint indisponible") cassent la confiance — `AdminStatusPage.tsx:94-97`
- La page AdminConfig avec ses tableaux de variables d'env peut sembler intimidante

## 2. Clarté & Charge cognitive

### ✅ Points forts
- `PageGuide` est un bon mécanisme d'orientation douce et non intrusif
- Wizard de création de campagne bien structuré en 4 étapes
- Dashboard admin hiérarchise bien les urgences (Actions requises / Raccourcis)

### ⚠️ Friction
- **AdminHub** : 11+ cartes = "mur d'options". Trop pour une porte d'entrée admin.
- **EvaluationsPage** : filtres + bulk actions + table = charge cognitive élevée au premier coup d'œil
- **AdminConfigPage** : la page la plus intimidante — tableaux de clés, variables d'env, modales
- Wizard campagne : la section périmètre/visibilité peut vite devenir dense avec tous les scopeTypes

## 3. Engagement

### ✅ Points forts
- Dashboard admin : raccourcis utiles, hiérarchisation des urgences
- Bon usage des états de chargement sur plusieurs pages (spinners contextuels)
- Microcopy globalement correcte et compréhensible

### ⚠️ Friction
- **Dashboard employé** faible : peu d'accueil, peu de contexte, pas de "que faire maintenant ?"
- Le login et le profil sont fonctionnels mais peu chaleureux
- Pas de "empty state" motivant sur le dashboard par défaut

## 4. Frustrations potentielles

### ⚠️ Friction identifiée
- **Demande employé trop enterrée** : profil → onglet "Mes demandes" → menu contextuel → recherche formulaire = trop de clics
- **Navbar dense** : le nombre d'entrées selon le rôle peut être mentalement coûteux
- Certaines erreurs d'action utilisent `alert()` — casse la sensation de maîtrise (`ProfilePage.tsx:168-172`)
- Textes EN encore présents dans des zones techniques

## Points forts globaux ✅
- Ton professionnel et cohérent, entièrement en français
- Bons états de chargement systématiques
- Erreurs login non-anxiogènes
- Design sobre, crédible pour un outil RH entreprise

## Recommandations UX émotionnelles

1. **Humaniser le dashboard** : ajouter une phrase d'accueil personnalisée ("Bonjour [Prénom], voici ce qui vous attend aujourd'hui")
2. **Simplifier AdminHub** : regrouper les 11 cartes en 4-5 familles thématiques (Utilisateurs, Campagnes, Config, Système)
3. **Empty states orientants** : sur tout dashboard vide, afficher une action principale claire
4. **Raccourcir le chemin des demandes employé** : bouton "Faire une demande" directement visible sur le dashboard employé
5. **Remplacer les `alert()`** par des notifications toast intégrées
6. **Ajouter une promesse de valeur** sur la page login : une phrase courte qui explique à quoi sert l'app
7. **Mode simplifié** sur pages lourdes (Config, Evaluations) : "vue essentielle" vs "vue avancée"
