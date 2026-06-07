# Analyse ergonomique & psychologique — NanoXplore RH

> Analyse menée sur des **captures réelles**, en se connectant sous chaque rôle. Grille de
> lecture : ergonomie cognitive (lois de Fitts/Hick, patterns F/Z, charge mentale de Miller),
> fatigue visuelle (contraste, densité, longueur de scroll), Gestalt, affect couleur, et
> feedback (toasts/notifications). Chaque constat est rattaché à un écran précis.

---

## 0. Verdict express

L'interface est **reposante par défaut** (beaucoup de blanc, peu d'éléments, hiérarchie claire)
mais **bascule en surcharge sur deux écrans denses** : le dashboard manager « Mon équipe » et
les listes d'évaluations. La position des actions primaires est **majoritairement correcte**
(en haut à droite / en bas à droite, là où l'œil termine sa lecture). La **fatigue visuelle**
est faible sur les écrans employés, **modérée** sur les écrans manager/RH chargés.

---

## 1. Position des boutons — loi de Fitts & patterns de lecture

**Principe.** L'action la plus probable doit être grande, et placée là où le regard finit
(coin haut-droit pour les actions de page, bas-droit pour « Suivant » dans un flux), pour
minimiser le temps d'acquisition (Fitts) et suivre le balayage F/Z occidental.

**Observations.**
- **Action primaire en haut à droite** (`Nouvelle campagne`, `Enregistrer`, `Créer`,
  `Ouvrir l'entretien`) : ✅ conforme. L'œil, après avoir lu le titre à gauche, retombe
  naturellement sur l'action à droite.
- **Wizard campagne / formulaire de remplissage** : bouton **`Suivant →` en bas à droite**,
  `← Précédent` en bas à gauche : ✅ canonique (sens de progression = droite).
- **Menu « Actions » de la fiche utilisateur** (Bloquer / Supprimer) replié sous un `⋮` :
  ✅ bon réflexe — les actions destructrices ne sont pas exposées au survol direct, elles
  demandent une intention (ouvrir le menu) + une confirmation.
- ⚠️ **Le bouton de soumission d'évaluation** est en bas de formulaire **après un long scroll**
  (cf. `eval-2026-fill`) : sur un formulaire à 8 questions, l'action de fin est loin — risque
  d'abandon. Reco : une barre d'action **collante** (sticky) en bas avec progression + bouton.

**Verdict : 8/10.** Placement globalement orthodoxe ; le principal défaut est la distance à
l'action de soumission sur les longs formulaires.

---

## 2. Loi de Hick — nombre de choix

**Principe.** Le temps de décision croît avec le nombre d'options. Réduire/segmenter.

- **Navigation par rôle + perspective** : l'employé voit 5 entrées, pas 20 ; le manager bascule
  « Mon espace / Mon Équipe ». ✅ Excellent — on ne montre que les choix pertinents au contexte.
- **Wizard campagne en 4 étapes** au lieu d'un formulaire géant : ✅ segmentation correcte de
  la décision.
- ⚠️ Le **menu « Plus »** et les sous-menus peuvent cacher des actions clés (découvrabilité).

**Verdict : 9/10.** La perspective est une très bonne application de Hick.

---

## 3. Charge cognitive & densité — Miller (7 ± 2)

**Principe.** La mémoire de travail tient ~4–7 éléments. Au-delà, surcharge → erreurs, fatigue.

- **Tableau de bord employé** (`employe-dashboard`) : 3–4 blocs (évals, événements, ressources,
  demandes). ✅ Sous le seuil — reposant.
- **Espace manager « À traiter »** (`manager-a-traiter`) : cartes par collaborateur, 1 action
  par carte. ✅ Découpage humain, pas un tableau dense.
- ❌ **Dashboard manager « Mon équipe »** (`cloche`) : **37 évaluations à compléter** listées,
  + KPIs + équipe + campagnes + signatures, sur un **scroll très long**. C'est le point noir :
  largement au-dessus de 7±2, lecture épuisante. Reco : **pagination/virtualisation**, regroupement
  par campagne repliable, et un « top 5 à traiter » en tête.

**Verdict : 6/10.** Excellent côté employé, **surcharge réelle côté manager chargé**.

---

## 4. Fatigue visuelle — contraste, longueur, micro-typo

**Principes.** Contraste texte ≥ 4.5:1 (WCAG AA) sans excès (le contraste maximal pur
noir/blanc fatigue) ; éviter les longues colonnes de texte gris pâle ; limiter le scroll.

- **Couleur de texte** : encre `--ink` (gris très foncé, pas noir pur) sur fond clair : ✅ bon
  compromis confort/lisibilité, réduit l'éblouissement.
- **Texte secondaire** (`--ink-3`, gris clair) : ⚠️ sur les sous-titres et libellés « small »,
  le contraste se rapproche de la limite AA — fatigant pour les longues sessions RH. À vérifier
  au contrastomètre, surtout en thème clair.
- **Densité + scroll** : les listes d'évaluations (manager/RH) imposent de **longs balayages
  verticaux** d'éléments quasi identiques → fatigue de répétition (effet « mur de texte »).
- **Aération** : beaucoup d'espace blanc, coins arrondis, cartes : ✅ repose l'œil entre les blocs.

**Verdict : 7/10.** Confortable par défaut ; deux risques : gris secondaire un peu faible et
listes longues monotones.

---

## 5. Gestalt — proximité, similarité, clôture

- **Proximité** : libellé + champ + message d'erreur groupés ; cartes-collaborateurs autonomes.
  ✅ Le regard segmente sans effort.
- **Similarité** : header/footer/cartes identiques d'un rôle à l'autre → **transfert
  d'apprentissage** (on ne réapprend rien). ✅ Fort.
- **Clôture / hiérarchie** : eyebrow (majuscule) → gros titre → sous-titre : ✅ point d'entrée
  visuel clair sur chaque page.

**Verdict : 9/10.**

---

## 6. Couleur & affect

- **Palette** marine `#1b1b78` + rouge brand `#b8000b`, fonds clairs. **Corporate, calme, sérieux**
  — cohérent avec un outil RH où la confiance prime. Pas de couleurs criardes. ✅
- **Couleurs sémantiques** : ambre = « Assignée/à faire », bleu = « en cours », vert = validé,
  rouge = destructif/litige. ✅ Codes intuitifs et constants.
- ⚠️ **Dépendance à la couleur seule** pour certains statuts (badges) : doubler d'une icône/texte
  pour les daltoniens (8 % des hommes). Des `dot` existent déjà ; généraliser.

**Verdict : 8/10.**

---

## 7. Feedback & notifications — *le système marche*

**Vérifié en live :**
- **Notifications in-app** : générées par les évènements métier (soumission, relecture,
  signature, **litige** → RH + manager). Test : le manager Pierre Bernard avait **3 notifications
  non lues** (« Évaluation soumise » ×3). `GET /api/notifications/count` → `{total:3, unreadCount:3}`.
- **Marquage lu** : `read-all` → `unreadCount` passe à **0**. ✅ Le cycle complet fonctionne.
- **Cloche** dans la barre (coin haut-droit, zone de feedback attendue) + panneau déroulant : ✅
  emplacement conforme aux conventions (notifications en haut-droite).
- **Toasts** de confirmation après action (création, blocage…) : ✅ feedback immédiat.

**Pistes :** badge de compteur sur la cloche (rappel passif), regroupement par type, et lien
direct depuis la notif vers l'objet concerné (déjà présent pour les litiges via `link`).

**Verdict notifications : 9/10 — fonctionnel et bien placé.**

---

## 8. Mobile / zone du pouce (à valider)

Le layout est responsive (Tailwind, grilles `auto-fit`), mais l'usage RH réel est surtout
desktop. ⚠️ Sur mobile, les **actions en haut de page** sortent de la **zone du pouce**
(bas de l'écran) — à tester si une cible mobile existe. Reco : barre d'action basse sur mobile.

---

## Synthèse priorisée

| # | Constat | Sévérité | Reco |
|---|---------|:--:|------|
| 1 | Dashboard manager « Mon équipe » : 37+ items, scroll épuisant | **Élevée** | Virtualiser + « top 5 » + regroupement repliable |
| 2 | Soumission d'éval loin (bas de long formulaire) | Moyenne | Barre d'action sticky + progression |
| 3 | Gris secondaire (`--ink-3`) proche de la limite de contraste | Moyenne | Vérifier WCAG AA, foncer légèrement |
| 4 | Statuts dépendants de la couleur seule | Faible | Icône/texte systématique (daltonisme) |
| 5 | Actions hors zone du pouce sur mobile | Faible | Barre basse mobile (si cible mobile) |

**Globalement : une UI psychologiquement juste (calme, lisible, qui respecte l'attention), dont
la seule vraie dette ergonomique est la densité des écrans manager/RH chargés.** Les
notifications, elles, **fonctionnent**.
