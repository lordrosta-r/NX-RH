# NanoXplore RH — Analyse UX & ressenti par rôle

> Analyse menée **sur la prod réelle** (HTTPS, 120 collaborateurs importés depuis 2 annuaires
> LDAP, 123 évaluations générées par une campagne entreprise), en me connectant **réellement**
> avec un compte de chaque rôle. Captures à l'appui dans `frontend-v2/e2e/screenshots/roles/`.
> Objectif : décrire ce qu'on **ressent** en utilisant l'outil, pas seulement ce qu'il fait.

---

## Méthodologie

- **Admin** : `admin-rh@nanoxplore.com` (compte bootstrap du déploiement).
- **Manager** : Pierre Bernard (`nx002`, directeur avec une grande équipe).
- **Employé** : Clara Andre (`nx023`, département Ingénierie).
- **RH** : Marie Bernard (`nx051`, promue RH par l'admin).

Les rôles n'ont **pas** été importés de l'annuaire (l'AD réel n'est pas fiable là-dessus) : l'admin
les a attribués dans l'app (31 managers + 2 RH). La **hiérarchie**, elle, vient de l'attribut
`manager` de l'annuaire → organigramme complet, **aucun orphelin**.

---

## 1. L'employé — « je veux faire mon truc et qu'on me lâche »

**Ce qu'on ressent (Clara, `employe-dashboard.png`).** Soulagement. La navigation est réduite à
l'essentiel : *Tableau de bord · Mes Évaluations · Historique · Demandes · PDI*. Aucune notion
d'« équipe », d'« admin », de « campagne à créer » : l'employé n'est jamais exposé à la complexité
RH. Le bandeau « ESPACE COLLABORATEUR / Bonjour Clara » + le badge département donne tout de suite
le sentiment d'être *chez soi*, pas dans un back-office.

**Psychologie.** L'employé arrive avec une légère appréhension (« qu'est-ce qu'on attend de moi ? »).
Le tableau de bord répond par des **cartes d'action claires** : *Mes évaluations en cours*,
*Prochains événements*, *Mon historique*, et surtout une rangée *Mes demandes* (mobilité, mise à
jour profil, documents RH) qui transforme l'employé de **sujet passif** d'une évaluation en
**acteur** de son parcours. C'est psychologiquement juste : on ne se sent pas *évalué*, on se sent
*accompagné*.

**Friction réelle repérée (importante).** Clara a bien une auto-évaluation **assignée** (la campagne
entreprise l'a générée), mais le tableau de bord affiche *« Aucune évaluation en cours »*. Le widget
ne montre que le statut `in_progress`, pas `assigned`. **Conséquence** : un collaborateur qui n'a pas
encore *ouvert* son évaluation peut croire qu'il n'a rien à faire et **rater une échéance**. C'est le
point n°1 à corriger : le dashboard doit mettre en avant les évaluations *assignées* (« À commencer »),
idéalement avec l'échéance et un bouton « Commencer ». → cf. backlog E1/E2.

**Look.** Épuré, aéré, beaucoup de blanc, cartes à coins arrondis, accents bleu marine. Cohérent et
rassurant. Le vide des cartes (événements/ressources « Aucun… ») sur une base fraîche donne toutefois
une impression d'outil « pas encore vivant » — des **états vides plus engageants** (illustration +
1 phrase d'amorce) aideraient.

---

## 2. Le manager — « montre-moi mon équipe et ce que je dois faire, vite »

**Ce qu'on ressent (Pierre, `manager-a-traiter.png`).** Maîtrise. Dès la connexion, un **sélecteur de
perspective « Mon espace / Mon Équipe »** apparaît en haut : le manager bascule entre son propre
parcours (il est aussi évalué) et son rôle d'encadrant. C'est l'idée la plus forte de l'app : un
manager **n'est pas un sur-utilisateur**, c'est quelqu'un qui porte **deux casquettes**, et l'UI le
matérialise littéralement. La nav s'enrichit au bon endroit : *À traiter · Mon équipe · Organigramme*.

**Psychologie.** Le manager est pressé et anxieux de « rien oublier ». La page **« À traiter »**
répond exactement à ça : **une carte par collaborateur** (Camille, Julie, Thomas…), avec le statut
(*Assignée*) et **un seul bouton** : *Ouvrir l'entretien*. Pas de tableau dense, pas de filtres à
régler : une *to-do list humaine*. Le petit encart de guidage (« 1. Repérez les soumises… 2. Ouvrez…
3. Lancez l'entretien ») désamorce l'angoisse du « par où je commence ».

**Le moment fort : l'entretien (`process/16-interview.png`).** C'est là que l'outil prend tout son
sens. Pour chaque question, la **réponse d'auto-évaluation du collaborateur est rappelée à gauche**,
le manager commente à droite, et ensemble ils fixent une **« position retenue »**. On revoit les
objectifs de l'an dernier (*Atteint / Partiel / Non atteint*), on fixe ceux de l'année à venir, on
rédige une **synthèse**, et le manager **signe à la souris**. Un bouton **« Marquer un désaccord »**
assume le conflit possible (litige). Psychologiquement, c'est un **outil de dialogue**, pas de
notation : aucune note globale, aucune moyenne — on est dans le qualitatif, le face-à-face. C'est
rare et précieux.

**Friction.** Pierre apparaît dans sa propre liste « À traiter » (il a une éval *et* une équipe) — à
clarifier (séparer « mon évaluation » de « celles de mon équipe »). La perspective « Mon Équipe » est
géniale mais **peu découvrable** : rien n'indique au premier login qu'il faut basculer le switch pour
voir son équipe.

**Look.** Identique à l'employé (cohérence forte), enrichi des cartes-collaborateurs. Très lisible.

---

## 3. La RH — « je pilote, je vois tout, je décide »

**Ce qu'on ressent (Marie, `rh-*`).** Puissance maîtrisée. La RH a la vue d'ensemble : *Campagnes,
Collaborateurs, Analytique*. C'est elle qui **crée les campagnes** (wizard en 4 étapes : infos →
formulaires → public cible → récap), **choisit le périmètre** (tous / rôle / département / secteur /
groupe / sélection), et **cure les questions** rappelées de « l'édition précédente ». Le pouvoir est
réel mais **canalisé par des garde-fous** (wizard pas à pas, validation Zod, bannière « configuration
initiale incomplète » tant que tout n'est pas prêt).

**Psychologie.** La RH veut *de la couverture* (« est-ce que tout le monde a fait son éval ? ») et
*de la finesse* (« cibler exactement la bonne population »). Le **ciblage par département**
(`departments/campaign-scope-departement.png`) répond au besoin de finesse ; l'**analytique** au
besoin de couverture. La RH ne signe **que la synthèse** en bout de chaîne : elle orchestre sans se
substituer au face-à-face manager/collaborateur — bon équilibre de responsabilité.

**Friction.** L'analytique est un peu **statique sur une base fraîche** (peu de courbes tant que les
évaluations ne sont pas remplies). Le lien « édition précédente » ne prend toute sa valeur qu'après
**plusieurs campagnes annuelles** (historique pluriannuel) — c'est l'objet du chantier « 10 campagnes
sur 5 ans ».

---

## 4. L'admin — « je branche, je configure, je n'ai pas envie d'ouvrir un fichier de conf »

**Ce qu'on ressent (`process/18..21`, `ldap/*`).** Autonomie totale. **Tout** se configure depuis
l'UI : connexion des **annuaires LDAP/AD** (test → prévisualisation → synchronisation),
**téléversement du certificat SSL** (avec validation cryptographique réelle), **SMTP** (preset OVH).
L'admin ne touche jamais à un terminal. C'est la promesse « maintenable par n'importe qui » tenue.

**Le moment fort : connecter 2 annuaires indépendants (`ldap/admin-ldap.png`).** Deux cartes
« Annuaire NanoXplore » et « Annuaire Partner », chacune autonome, *Tester / Prévisualiser /
Synchroniser*. En un clic, **120 collaborateurs** arrivent avec leur **hiérarchie** (organigramme
complet, `ldap/orgchart.png`). L'admin garde la main sur ce que l'annuaire ne sait pas faire
proprement : **les rôles**, qu'il attribue dans l'app.

**Friction.** La distinction **département** (texte libre, vient de l'annuaire) vs **secteur** (entité
app) peut prêter à confusion. La liste de départements proposée au ciblage doit rester **alignée** sur
les valeurs réelles des collaborateurs (corrigé pendant cette session).

---

## 5. Design transversal — ce qui fait l'unité

| Aspect | Verdict |
|--------|---------|
| **Couleurs** | Marine `#1b1b78` + rouge brand `#b8000b`, beaucoup de blanc. Sobre, corporate, jamais criard. Le cyan parasite a été éliminé. |
| **Typographie** | Hiérarchie claire (eyebrow majuscule + gros titre + sous-titre). Très lisible. |
| **Navigation** | **La perspective Mon espace/Mon Équipe** est la signature UX. La nav s'adapte au rôle ET à la casquette. |
| **Guidage** | Encarts `PageGuide` (dismissables) sur les pages clés + fils d'Ariane généralisés → on n'est jamais perdu. |
| **Cohérence** | Header/footer/cartes identiques d'un rôle à l'autre : on **réapprend rien** en changeant de rôle. |
| **Icônes** | `lucide-react` (SVG stroke), jamais d'emoji. Propre. |
| **États vides** | Point faible : fonctionnels mais peu engageants sur une base neuve. |

---

## 6. Cycles de vie — ce que l'outil encaisse

| Situation | Vécu / support actuel | Reco |
|-----------|----------------------|------|
| **Nouvel arrivant** | Apparaît via sync LDAP avec son manager → immédiatement dans l'organigramme. S'il arrive **après** le lancement d'une campagne, il faut **re-générer** les évaluations. | Bouton « générer les manquants » sur la campagne active. |
| **Départ collaborateur** | Offboarding → archivage ; ses évaluations en cours doivent être clôturées proprement. | Vérifier qu'aucune éval « fantôme » ne reste assignée à un inactif. |
| **Départ d'un manager** | **Cas sensible** : ses subordonnés deviendraient orphelins. La réaffectation (nouveau `managerId`) est nécessaire **avant** désactivation. | Forcer la réaffectation à l'offboarding d'un manager (garde-fou). |
| **Changement de poste / département** | Mise à jour de la fiche ; impacte le ciblage des **futures** campagnes, pas les évals en cours. | OK. |
| **Changement de manager** | `managerId` mis à jour, anti-cycle respecté ; l'entretien suit la nouvelle hiérarchie. | OK (bien géré). |
| **Désaccord en entretien** | Bouton dédié → bascule en **litige** (`disputed`), suivi RH. | OK, à rendre visible côté RH (file des litiges). |

---

## 7. Top frictions à corriger (priorisé)

1. **P1 — Évaluations « assignées » invisibles sur le dashboard employé** : risque de rater une
   échéance. Afficher « À commencer » + échéance + bouton.
2. **P1 — Réaffectation obligatoire au départ d'un manager** : éviter de créer des orphelins.
3. **P2 — Découvrabilité du switch « Mon Équipe »** : amener le manager vers sa vue équipe au 1er login.
4. **P2 — Séparer, dans « À traiter », l'évaluation du manager lui-même de celles de son équipe.**
5. **P3 — États vides plus engageants** (dashboard employé/RH sur base fraîche).
6. **P3 — Clarifier département vs secteur** dans l'UI.

---

## 8. Ressenti global

NanoXplore RH ne *ressemble* pas à un outil RH classique (dense, austère, orienté formulaire). Il
*ressemble* à un produit grand public : peu d'éléments par écran, un chemin évident, un ton humain
(« Bonjour Clara », « confronter les regards »). Sa **meilleure idée** est d'avoir refusé la note :
l'entretien est un **dialogue outillé**, pas un barème. Sa **deuxième meilleure idée** est la
**perspective** : un même humain, deux casquettes, une UI qui le respecte. Ce qui lui manque encore,
c'est surtout du **vécu** (historique pluriannuel, états vides peuplés) et **deux ou trois garde-fous**
de cycle de vie. Rien de structurel : des finitions.
