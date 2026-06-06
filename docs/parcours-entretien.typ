// =============================================================================
// NanoXplore RH — Parcours complet du cycle d'évaluation et de l'entretien
// Compilation : typst compile --root <repo> docs/parcours-entretien.typ
// =============================================================================

#set document(title: "NanoXplore RH — Parcours de l'entretien annuel", author: "Équipe NanoXplore RH")
#set page(
  paper: "a4",
  margin: (x: 2.2cm, y: 2.4cm),
  numbering: "1",
  footer: context [
    #set text(8pt, fill: rgb("#777"))
    NanoXplore RH — Cycle d'évaluation et entretien
    #h(1fr)
    #counter(page).display("1 / 1", both: true)
  ],
)
#set text(font: ("Helvetica Neue", "Helvetica", "Arial"), size: 10.5pt, lang: "fr")
#set par(justify: true, leading: 0.7em)
#set heading(numbering: "1.1")

#let brand = rgb("#b8000b")
#let ink = rgb("#1c1b1b")
#show heading.where(level: 1): it => [
  #set text(fill: brand, size: 16pt, weight: "bold")
  #block(above: 1.4em, below: 0.7em)[#it]
]
#show heading.where(level: 2): it => [
  #set text(fill: ink, size: 12.5pt, weight: "bold")
  #block(above: 1.0em, below: 0.5em)[#it]
]

#let shot(path, cap) = figure(
  block(stroke: 0.5pt + rgb("#ccc"), radius: 4pt, inset: 3pt, image(path, width: 100%)),
  caption: cap,
)
#let dir = "/frontend-v2/e2e/screenshots/edition/"

// ───────────────────────── Couverture ──────────────────────────────────────
#align(center)[
  #v(3cm)
  #text(28pt, weight: "bold", fill: brand)[NanoXplore RH]
  #v(0.3cm)
  #text(18pt, weight: "bold")[Le cycle d'évaluation et l'entretien annuel]
  #v(0.2cm)
  #text(13pt, fill: rgb("#555"))[Parcours complet, du paramétrage RH à la signature du compte-rendu,\ et gestion de tous les cas]
  #v(2cm)
  #line(length: 40%, stroke: 1pt + brand)
  #v(0.5cm)
  #text(10pt, fill: rgb("#777"))[Document de spécification fonctionnelle — illustré]
]
#pagebreak()

#outline(title: [Sommaire], indent: auto)
#pagebreak()

// ───────────────────────── 1. Introduction & lexique ───────────────────────
= Introduction et lexique

Ce document décrit, de bout en bout, le déroulement d'un cycle d'évaluation dans
NanoXplore RH : depuis la création du dispositif par les Ressources Humaines
jusqu'à la signature du compte-rendu d'entretien, en passant par le remplissage
par chaque partie et le face-à-face. Il couvre également l'ensemble des cas de
gestion (départ d'un manager, départ d'un collaborateur, arrivée en cours de
campagne, échéances dépassées) et le traitement des désaccords.

Cinq concepts structurent l'application. Leur distinction est essentielle car
elle détermine l'architecture des données.

#table(
  columns: (auto, 1fr),
  inset: 7pt,
  align: (left, left),
  stroke: 0.5pt + rgb("#ddd"),
  fill: (_, row) => if row == 0 { rgb("#f4f0f0") },
  [*Concept*], [*Définition*],
  [Formulaire], [Le schéma de questions, vide et réutilisable (un _template_). Il ne contient pas de réponses.],
  [Campagne], [L'évènement temporel borné (un cycle RH). Elle référence un ou plusieurs formulaires et définit un périmètre de collaborateurs.],
  [Évaluation], [L'instance remplie : un formulaire assigné à un couple (évaluateur → évalué) dans une campagne. Identité unique : (campagne, formulaire, évaluateur, évalué).],
  [Entretien], [Le _face-à-face_ : l'entité qui agrège toutes les évaluations d'un même évalué dans une campagne. Identité unique : (campagne, évalué). Porte le travail qualitatif et les signatures.],
  [Édition précédente], [Projection en lecture seule des réponses de la campagne antérieure, reprise — au choix de la RH — sous certaines questions à titre de rappel.],
)

#block(inset: 8pt, radius: 4pt, fill: rgb("#fbf2f2"), stroke: 0.5pt + brand)[
  *Invariant fondamental.* L'_Évaluation_ est individuelle et quantifiable ;
  l'_Entretien_ est collectif et qualitatif. L'entretien ne contient *aucune
  note* : il sert à confronter les regards, commenter, et acter une position
  commune. La notation, si elle existe, appartient à l'évaluation, jamais à
  l'entretien.
]

// ───────────────────────── 2. Cycle de vie ─────────────────────────────────
= Le cycle de vie d'une évaluation

Chaque évaluation suit une machine à états stricte. Les transitions sont
contrôlées côté serveur et conditionnées par le rôle de l'utilisateur.

#align(center, block(inset: 10pt, radius: 6pt, fill: rgb("#f7f7f9"), width: 100%)[
  #set text(9.5pt)
  #set align(left)
  `assigned` → `in_progress` → `submitted` → `reviewed` \
  #h(2em) `reviewed` → `signed_evaluatee` → `signed_manager` → `signed_hr` → `validated` \
  #h(2em) `reviewed` → `disputed` (désaccord, arbitrage RH) \
  #v(0.3em)
  États terminaux additionnels : `expired` (échéance dépassée),
  `archived` (annulée suite à un départ), `rejected` (demande refusée).
])

Lecture des étapes de signature : l'évalué signe (`signed_evaluatee`), puis le
manager co-signe (`signed_manager`), et enfin la RH *valide le compte-rendu*
(`signed_hr` → `validated`). *La RH ne signe que cette étape finale* : elle clôt
le dossier sans modifier les réponses.

// ───────────────────────── 3. Parcours nominal ─────────────────────────────
= Le parcours nominal, étape par étape

== Étape 1 — La RH conçoit le formulaire

La RH construit le questionnaire dans l'éditeur de formulaire. Pour chaque
question, elle décide si la *réponse de l'édition précédente* doit être rappelée
en contexte (interrupteur « Reprendre l'édition précédente », désactivé par
défaut). Cette curation évite de surcharger les campagnes courtes : une campagne
« humeur » trimestrielle ne reprendra rien de l'entretien annuel.

#shot(dir + "rh-01-builder-toggle.png", [Éditeur de formulaire : curation par question de la reprise de l'édition précédente.])

== Étape 2 — La RH configure la campagne

La campagne fixe les dates, le périmètre (toute l'entreprise, un département, un
secteur, une liste d'utilisateurs ou un groupe) et la campagne de référence pour
l'édition précédente. Elle référence le ou les formulaires sans les copier.

#shot(dir + "rh-02-campagne-edition.png", [Configuration de campagne : activation et source de l'« édition précédente ».])

== Étape 3 — Génération des évaluations et des entretiens

À l'activation, le système parcourt les collaborateurs du périmètre et crée,
pour chacun et chaque formulaire, une évaluation au statut `assigned`.
L'évaluateur est le manager du collaborateur (`managerId`), ou le collaborateur
lui-même pour une auto-évaluation. La création est *idempotente* : relancer la
génération n'affecte pas les évaluations déjà créées. En parallèle, l'_entretien_
de chaque collaborateur est généré pour agréger ses évaluations.

== Étape 4 — Le collaborateur remplit son auto-évaluation

Le collaborateur répond question par question. Sous les questions que la RH a
marquées, un rappel repliable affiche sa réponse de l'an dernier — sans jamais
quitter la page.

#grid(columns: (1fr, 1fr), gutter: 10pt,
  shot(dir + "emp-02-accordion-open.png", [Rappel « édition précédente » ouvert sous une question.]),
  shot(dir + "emp-03-question-non-reprise.png", [Question non marquée : aucun rappel (curation respectée).]),
)

Sur une campagne courte sans reprise, l'écran reste épuré :

#shot(dir + "emp-04-humeur-aucune-reprise.png", [Campagne « humeur » : aucun rappel, conformément à la curation RH.])

== Étape 5 — Le manager traite ses évaluations

Le manager dispose d'un tableau de bord « À traiter » qui liste les évaluations
de ses collaborateurs, triées par action requise (à relire, en retard, à venir),
avec un accès direct à l'entretien.

#shot(dir + "v3-mgr-todo-lien.png", [Tableau de bord manager : file d'attente et accès « Entretien ».])

== Étape 6 — L'entretien : le face-à-face

L'entretien réunit, sur un *écran partagé*, les deux brouillons côte à côte. Il
se compose de six sections : (1) l'échange par question, (2) la revue des
objectifs de l'an dernier, (3) les objectifs de l'année suivante, (4) la
synthèse, (5) les signatures, (6) le marquage d'un désaccord.

#shot(dir + "v5-entretien-clean.png", [Vue Entretien : échange par question, revue d'objectifs, synthèse et signatures.])

Pour chaque question, l'entretien affiche les réponses des deux parties en
lecture seule (les brouillons restent intacts, traçabilité), puis ouvre une zone
d'échange : *commentaire de l'évalué*, *commentaire du manager*, et *position
retenue commune*. La revue des objectifs reprend les objectifs fixés à l'édition
précédente et les qualifie (atteint, partiel, non atteint). Les objectifs de
l'année suivante sont saisis en séance. Une synthèse libre clôt l'échange.

#block(inset: 8pt, radius: 4pt, fill: rgb("#f0f4fb"), stroke: 0.5pt + rgb("#5b9bd5"))[
  *Édition simultanée.* L'entretien étant mené sur un seul écran partagé, il n'y
  a pas de conflit d'édition. Si, exceptionnellement, les deux parties éditaient
  à distance sur deux appareils, la dernière sauvegarde prévaudrait
  (_last-write-wins_) ; la co-édition temps réel n'est pas implémentée en V1.
]

== Étape 7 — Signatures et validation du compte-rendu

L'évalué puis le manager signent à la souris, directement dans l'entretien.
Chaque signature fait progresser le statut de l'évaluation
(`signed_evaluatee` → `signed_manager`). Enfin, la *RH valide le compte-rendu*
(`signed_hr` → `validated`) : c'est l'unique signature de la RH, qui clôt
définitivement le dossier.

// ───────────────────────── 4. Désaccords ───────────────────────────────────
= La gestion des désaccords

Lorsqu'un accord n'est pas trouvé, le manager (ou l'évalué) déclenche, depuis
l'entretien, l'action « Marquer un désaccord » et en précise le motif.

*Effet système.* L'évaluation bascule en `disputed` et l'entretien passe en état
« litige ». Le dossier sort alors du circuit de signature normal et requiert un
*arbitrage RH*.

*Traitement par la RH.* Seule la RH (ou un administrateur) arbitre un litige.
Deux issues sont possibles :

#table(columns: (auto, 1fr), inset: 7pt, stroke: 0.5pt + rgb("#ddd"),
  fill: (_, row) => if row == 0 { rgb("#f4f0f0") },
  [*Décision RH*], [*Transition*],
  [Renvoyer en correction], [`disputed` → `reviewed` : l'évaluation repart en relecture pour amender la synthèse.],
  [Acter le désaccord], [`disputed` → `signed_evaluatee` : le désaccord est consigné et la signature de l'évalué est enregistrée malgré le différend.],
)

Le motif et l'auteur du désaccord sont horodatés et conservés ; un bandeau
d'alerte signale le litige sur l'entretien tant qu'il n'est pas arbitré.

// ───────────────────────── 5. Cas de gestion ───────────────────────────────
= Cas de gestion (organisation mouvante)

Une campagne s'étale dans le temps ; l'organisation, elle, évolue. Le système
prévoit chaque situation.

== Un manager quitte l'entreprise en cours de campagne

Les évaluations dont il était l'évaluateur ne doivent pas rester orphelines. La
RH procède à une *réaffectation* (`PATCH /evaluations/:id/reassign`) vers un
nouveau manager. Le système vérifie que le remplaçant est *actif* et a bien le
rôle *manager*, refuse les doublons (une même évaluation ne peut être assignée
deux fois), et consigne l'opération dans le journal d'audit de l'évaluation
(évaluateur précédent, nouvel évaluateur, motif, horodatage).

== Un collaborateur quitte l'entreprise (offboarding)

Le départ d'un collaborateur déclenche une demande d'_offboarding_. À sa
finalisation, *toutes ses évaluations non encore validées* passent
automatiquement en `archived` (l'archivage épargne les évaluations déjà
`validated`). Elles cessent ainsi de peser sur les taux d'avancement de la
campagne, sans être détruites — la traçabilité est préservée.

== Une personne rejoint l'entreprise en cours de campagne

Qu'il s'agisse d'un collaborateur ou d'un manager nouvellement arrivé, la RH
relance la *génération des évaluations* de la campagne. Grâce à l'idempotence
(insertion conditionnelle `$setOnInsert` sur la clé campagne+formulaire+évalué),
seules les évaluations *manquantes* sont créées : les évaluations existantes, et
le travail déjà saisi, demeurent intacts. L'entretien du nouvel arrivant est
généré dans la foulée. Si un *manager* rejoint et reprend une équipe, ses
nouvelles responsabilités se traduisent par des réaffectations (cf. §5.1).

== Échéances dépassées

Un planificateur (_scheduler_) surveille les dates limites. Il envoie des
rappels par courriel à l'approche de l'échéance, puis bascule en `expired` les
évaluations *non répondues* (`assigned`/`in_progress`) dont la date limite de
phase est dépassée — sans jamais toucher aux évaluations déjà soumises ou en
cours de signature. Les évaluations proches de l'expiration sont signalées
(`nearExpiry`) pour alerter la RH.

== Cycle de vie de la campagne

La campagne elle-même suit : `draft` → `active` → `closed` → `archived`
(irréversible). La clôture fige le dispositif ; l'archivage le retire des vues
courantes.

// ───────────────────────── 6. Invariants ───────────────────────────────────
= Synthèse des invariants

#table(columns: (auto, 1fr), inset: 7pt, stroke: 0.5pt + rgb("#ddd"),
  fill: (_, row) => if row == 0 { rgb("#f4f0f0") },
  [*Principe*], [*Garantie*],
  [Pas de note dans l'entretien], [L'entretien est strictement qualitatif : commentaires et position retenue, pas de score.],
  [Signature RH unique], [La RH ne signe que le compte-rendu final (`signed_hr` → `validated`).],
  [Aucune duplication], [L'entretien référence les évaluations ; il ne recopie ni les réponses ni les notes.],
  [Brouillons intacts], [Les réponses initiales des deux parties restent en lecture seule pendant l'entretien.],
  [Idempotence], [Régénérer les évaluations d'une campagne ne détruit jamais l'existant.],
  [Traçabilité], [Réaffectations, désaccords et archivages sont horodatés et journalisés.],
)

#v(1cm)
#align(center, text(9pt, fill: rgb("#999"))[— Fin du document —])
