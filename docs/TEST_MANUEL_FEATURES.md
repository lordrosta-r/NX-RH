# Guide de test manuel — features récentes

> But : vérifier à la main que chaque feature est **expliquée**, **accessible**,
> **intuitive** et **sans erreur**. Pour chaque feature : où la trouver, quoi
> cliquer, ce qui doit se passer.
>
> Tests automatisés Playwright associés : `frontend-v2/e2e/` (voir fin de doc).

---

## 1. Collecte des formulaires des managers (campagne) ⭐ nouveau

**Pourquoi** : la RH demande à des managers de fournir leurs formulaires pour une
campagne ; les managers en choisissent un ; la RH retient ceux à utiliser.

### Côté RH/Admin
1. **Campagnes → ouvrir une campagne en _brouillon_ → onglet « Formulaires ».**
2. En haut : encart **« Collecte des formulaires des managers »** avec une phrase
   d'explication (✅ _expliqué_).
3. Cocher un ou plusieurs managers → bouton **« Demander (n) »**.
4. ✅ Attendu : chaque manager sollicité apparaît dans la liste avec le badge
   **« En attente »**. Le manager reçoit une **notification**.
5. Bouton **« Annuler »** sur une demande encore en attente → la retire.

### Côté Manager
6. **À traiter** (`/manager/todo`) : carte bleue **« Formulaires demandés par la RH »**
   en haut (✅ _accessible_, _expliqué_).
7. Choisir un de **ses** formulaires dans la liste déroulante → **« Soumettre »**.
   - Pas encore de formulaire ? Lien **« Créer un nouveau formulaire »**.
8. ✅ Attendu : la ligne passe à **« En attente de validation RH »**.

### Retour RH/Admin
9. Onglet « Formulaires » de la campagne : la demande affiche **« Soumis »** + le
   titre du formulaire, avec deux boutons **« Retenir »** / **« Écarter »**.
10. **« Retenir »** → badge **« Retenu »** et le formulaire **rejoint la liste des
    formulaires liés** de la campagne (visible dessous). **« Écarter »** → « Non retenu ».
11. La RH peut toujours ajouter **ses propres** formulaires via « Ajouter un formulaire ».

**Erreurs à surveiller** : un manager ne doit jamais pouvoir soumettre le formulaire
d'un autre (refus 403) ; la collecte n'apparaît que sur une campagne **brouillon**.

---

## 2. Création de formulaires par les managers

1. **Manager → Plus / Campagnes → Formulaires.** Bouton **« Nouveau formulaire »** visible.
2. Encart d'aide expliquant qu'on peut **dédier un formulaire à une personne**
   (« Formulaire de Nathan ») et le **réutiliser/dupliquer** l'année suivante.
3. ✅ Le manager ne voit en édition/suppression que **ses propres** formulaires ;
   la RH peut les réutiliser.

---

## 3. Suivi des objectifs de l'équipe

1. **Manager → menu « Plus » → « Objectifs ».** (`/objectives`)
2. ✅ Cartes par membre : avatar à initiales, objectifs N+1 encadrés, barre
   d'avancement du bilan (« x/y atteints — z % »).
3. Un **employé** voit sa propre carte (badge « Vous ») et peut **ajouter une mise à
   jour** (point clé + commentaire optionnel) sur un objectif. Le manager la voit.

---

## 4. Remplissage & soumission d'évaluation + entretien

1. **Mon espace → Évaluations → ouvrir une évaluation à remplir.**
2. Remplir → la saisie est **auto-sauvegardée** ; **« Soumettre »** fonctionne et
   redirige vers l'**entretien**.
3. Entretien : on ne peut pas le démarrer tant qu'il n'est pas **programmé**
   (bouton de programmation accessible en fin d'évaluation et dans l'entretien).
   Choix de le faire **maintenant ou plus tard**. La **signature** ne se verrouille
   plus toute seule (bouton « Valider la signature » explicite). Champs texte **bordés**.

---

## 5. PDI (plan de développement individuel)

1. **Mon espace → PDI.** Encart-guide expliquant comment le remplir.
2. ✅ « Mon espace » n'affiche que **mes** PDI ; la vue équipe (manager) affiche ceux
   des subordonnés.

---

## 6. Demandes de mobilité — filtres

1. **Mon espace → Mes demandes.** Filtrer par **statut** et par **type**.
2. ✅ Les filtres modifient réellement la liste (plus de filtre inopérant).

---

## 7. Tableau de bord manager & campagnes

1. **Manager → Tableau de bord → « Mon équipe »** : les **noms** s'affichent
   (plus d'IDs bruts).
2. **Manager → Campagnes** : le bouton **« Exporter »** est **masqué** (réservé RH/Admin).

---

## Lancer les tests Playwright automatisés

Les specs supposent la **stack Docker + seed e2e** (utilisateurs `@nxrh.local`) :

```bash
# 1. Démarrer la stack de test seedée (pas la prod avec tes données réelles)
docker compose -f docker-compose.yml up -d

# 2. Lancer les tests
cd frontend-v2
npx playwright test                               # toute la suite
npx playwright test campaign-form-collection      # feature #6 seule
npx playwright test --ui                          # mode interactif (voir chaque étape)
```

- `e2e/campaign-form-collection.spec.ts` — parcours complet feature #6 (RH → manager → RH),
  avec assertions « expliqué / accessible / intuitif » et **vérification d'absence
  d'erreur console**.
- Login e2e : `e2e/helpers/auth.ts` (`loginAs(page, 'hr'|'manager'|'admin'|'employee')`).

> ⚠️ Ces tests créent/affichent des données via l'UI/API du **seed e2e**. Ne pas les
> pointer sur l'instance de prod contenant tes vraies données.
