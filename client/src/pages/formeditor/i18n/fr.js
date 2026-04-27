export default {
  // Nav (same HR nav labels reused from HRSidebar)
  'fe.nav.overview':   'Vue d\'ensemble',
  'fe.nav.hr':         'Portail RH',
  'fe.nav.admin':      'Console Admin',
  'fe.nav.users':      'Utilisateurs',
  'fe.nav.campaigns':  'Campagnes',
  'fe.nav.formeditor': 'Éditeur de formulaires',
  'fe.nav.resources':  'Ressources',
  'fe.nav.reports':    'Rapports',
  'fe.nav.settings':   'Paramètres',

  // Banner
  'fe.banner.tagline':     'Créez, personnalisez et publiez vos formulaires d\'évaluation.',
  'fe.banner.desc':        'Construisez des templates réutilisables, associez-les à des équipes et suivez les réponses en temps réel.',
  'fe.banner.headline.part1':  'Vos formulaires,',
  'fe.banner.headline.accent': 'votre façon.',
  'fe.banner.forms':       'Formulaires',
  'fe.banner.active':      'Actifs',
  'fe.banner.responses':   'Réponses',
  'fe.banner.cta':         'Créer un formulaire',

  // Topbar
  'fe.topbar.search':        'Rechercher un formulaire…',
  'fe.topbar.theme':         'Changer le thème',
  'fe.topbar.help':          'Aide',
  'fe.topbar.notifications': 'Notifications',
  'fe.topbar.lang':          'Changer la langue',
  'fe.topbar.avatar':        'RH',

  // Filters
  'fe.filter.all':      'Tous',
  'fe.filter.active':   'Actifs',
  'fe.filter.draft':    'Brouillons',
  'fe.filter.archived': 'Archivés',

  // Status labels
  'fe.status.active':   'Actif',
  'fe.status.draft':    'Brouillon',
  'fe.status.archived': 'Archivé',

  // Form card
  'fe.card.questions':  'questions',
  'fe.card.responses':  'réponses',
  'fe.card.team':       'Équipe',
  'fe.card.edit':       'Modifier',
  'fe.card.duplicate':  'Dupliquer',
  'fe.card.copy':       'Copie',
  'fe.card.updated':    'Modifié le',

  // Section titles
  'fe.section.forms':   'Formulaires',
  'fe.section.empty':   'Aucun formulaire dans cette catégorie.',
  'fe.section.new':     'Nouveau formulaire',

  // Creator view
  'fe.create.title':       'Titre du formulaire',
  'fe.create.title.ph':    'Ex. Auto-évaluation annuelle 2026',
  'fe.create.desc':        'Description',
  'fe.create.desc.ph':     'Décrivez l\'objectif de ce formulaire…',
  'fe.create.team':        'Équipe cible',
  'fe.create.team.all':    'Tous',
  'fe.create.addfield':    'Ajouter un champ',
  'fe.create.fields':      'Champs du formulaire',
  'fe.create.preview':     'Aperçu',
  'fe.create.empty':       'Ajoutez des champs pour voir l\'aperçu.',
  'fe.create.publish':     'Publier',
  'fe.create.save':        'Enregistrer le brouillon',
  'fe.create.cancel':      'Annuler',
  'fe.create.back':        '← Retour à la liste',
  'fe.create.required':    'Obligatoire',
  'fe.create.placeholder': 'Libellé de la question…',

  // Field types
  'fe.field.text':     'Texte court',
  'fe.field.textarea': 'Texte long',
  'fe.field.rating':   'Note (1–5)',
  'fe.field.choice':   'Choix multiple',
  'fe.field.scale':    'Échelle',

  // Interface option labels (response type picker)
  'fe.field.iface.rating': 'Note',
  'fe.field.iface.yes_no': 'Oui / Non',
  'fe.field.iface.text':   'Texte',
  'fe.field.iface.choice': 'Choix multiple',

  // Yes / No button labels
  'fe.field.yes': 'Oui',
  'fe.field.no':  'Non',

  // Tags
  'fe.tags.title': 'Tags',

  // Form types
  'fe.type.self_evaluation':     'Auto-évaluation',
  'fe.type.manager_evaluation':  'Évaluation manager → équipe',
  'fe.type.peer_review':         'Évaluation par les pairs (360°)',
  'fe.type.upward_feedback':     'Feedback ascendant (anonyme)',
  'fe.type.director_evaluation': 'Évaluation directeur',

  // Validation errors
  'fe.error.title_required':    'Le titre du formulaire est obligatoire',
  'fe.error.min_one_question':  'Ajoutez au moins une question',
  'fe.error.question_labels':   'Toutes les questions doivent avoir un intitulé',
  'fe.error.campaign_required': 'Veuillez sélectionner une campagne',
  'fe.error.load_failed':       'Impossible de charger le formulaire.',
  'fe.error.frozen_since':      'Formulaire gelé depuis le {date} — questions non modifiables',
  'fe.error.save_failed':       'Sauvegarde échouée',
  'fe.error.choice_needs_option': 'Les questions à choix doivent avoir au moins une option',

  // Confirm dialogs
  'fe.confirm.unsaved_changes': 'Vous avez des modifications non enregistrées. Quitter quand même ?',
  'fe.confirm.cancel': 'Annuler',
  'fe.confirm.leave':  'Quitter',

  // Frozen form
  'fe.frozen.warning': 'Ce formulaire est gelé — les questions ne peuvent plus être modifiées.',

  // Creator view — team options
  'fe.create.team.direction':  'Direction',
  'fe.create.team.rd':         'R&D',
  'fe.create.team.marketing':  'Marketing',
  'fe.create.team.operations': 'Opérations',

  // Creator view — config panel placeholders
  'fe.create.question_title_ph': 'Ex. Compétences techniques',
  'fe.create.question_desc_ph':  'Décrivez ce que vous évaluez…',
  'fe.create.tags_ph':           'Tags : Annuel, Auto-éval…',

  // Default option label (used in makeDefaultOptions)
  'fe.create.option_default':   'Option {n}',
  'fe.create.option_label_ph':  'Option {n}',
  'fe.create.option_value_ph':  'Valeur',
  'fe.qcard.choice_more':       '+{n} autres',

  // Form builder — section labels
  'fe.fheader.arch':          'ARCHITECTURE DU FORMULAIRE',
  'fe.questions.empty':       'Aucune question pour l\'instant — ajoutez-en une avec le bouton ci-dessous.',
  'fe.qcard.badge':           'QUESTION',
  'fe.create.add_question':   'Ajouter une question',
  'fe.create.add_option':     'Ajouter une option',

  // Config panel labels
  'fe.config.title':           'CONFIGURATION',
  'fe.config.question_title':  'INTITULÉ',
  'fe.config.question_desc':   'DESCRIPTION',
  'fe.config.validation_logic': 'LOGIQUE DE VALIDATION',
  'fe.config.toggle_required': 'Champ obligatoire',
  'fe.config.toggle_weightage': 'Coefficient de pondération',
  'fe.config.toggle_anonymous': 'Réponse anonyme',
  'fe.config.scale_range':    'ÉCHELLE (2–10)',
  'fe.config.interface_opts': 'TYPE DE RÉPONSE',
  'fe.config.options':        'OPTIONS',
  'fe.config.remove_option':  'Supprimer l\'option',
  'fe.config.save':           'Enregistrer',
  'fe.config.idle_hint':      'Sélectionnez une question pour la configurer.',

  // Sidebar accessibility
  'fe.nav.label':       'Navigation principale',
  'fe.nav.coming_soon': 'Bientôt disponible',

  // Aria-labels (HC-01, HC-02)
  'fe.select.campaign_placeholder': '— Campagne —',
  'fe.select.campaign':     'Campagne',
  'fe.select.form_type':    'Type de formulaire',
  'fe.btn.configure':       'Configurer',
  'fe.btn.delete_question': 'Supprimer la question',
  'fe.scale.range':         'Échelle de 1 à {max}',

  // Loading / error / empty states
  'fe.loading':              'Chargement…',
  'fe.error.load':           'Impossible de charger les données. Veuillez rafraîchir la page.',
  'fe.empty.title':          'Aucun formulaire pour le moment',
  'fe.empty.desc':           'Créez votre premier formulaire d\'évaluation pour commencer.',

  // Form Builder (SPA)
  'fb.title': 'Éditeur de formulaire',
  'fb.save': 'Enregistrer',
  'fb.saving': 'Enregistrement…',
  'fb.saved': 'Enregistré',
  'fb.locked': 'Ce formulaire est verrouillé car des évaluations lui sont liées.',
  'fb.add_block': 'Ajouter un bloc',
  'fb.block.text': 'Texte libre',
  'fb.block.rating': 'Note (1-5)',
  'fb.block.yes_no': 'Oui / Non',
  'fb.block.choice': 'Choix multiple',
  'fb.block.weather': 'Météo/Climat',
  'fb.block.mobility': 'Demande de mobilité',
  'fb.block.n1_import': 'Import N-1',
  'fb.config.label': 'Question',
  'fb.config.label.ph': 'Saisissez votre question…',
  'fb.config.required': 'Obligatoire',
  'fb.config.options': 'Options',
  'fb.config.add_option': 'Ajouter une option',
  'fb.config.phase': 'Phase',
  'fb.config.phase.all': 'Toutes les phases',
  'fb.config.phase.self': 'Auto-évaluation',
  'fb.config.phase.n1': 'Bilan N-1',
  'fb.config.phase.objectives': 'Objectifs',
  'fb.config.phase.aspirations': 'Aspirations',
  'fb.empty': 'Ajoutez des blocs pour construire votre formulaire.',
  'fb.error.load': 'Erreur lors du chargement.',
  'fb.error.save': 'Erreur lors de l\'enregistrement.',
  'fb.error.conflict': 'Ce formulaire est lié à des évaluations et ne peut pas être modifié.',
}
