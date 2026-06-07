/* data.jsx — jeux de données fictifs partagés (prototype) */
window.NXDATA = {
  team: [
    { n:"Camille Rousseau", j:"Ingénieure procédés", in:"CR", st:"Auto-évaluation reçue", tone:"amber", pct:100, action:"Évaluer", primary:true },
    { n:"Thomas Petit", j:"Technicien maintenance", in:"TP", st:"En cours", tone:"blue", pct:60, action:"Relancer" },
    { n:"Léa Moreau", j:"Ingénieure qualité", in:"LM", st:"À démarrer", tone:"grey", pct:0, action:"Relancer" },
    { n:"Yanis Cherif", j:"Opérateur production", in:"YC", st:"Entretien validé", tone:"green", pct:100, action:"Voir le compte-rendu" },
    { n:"Inès Faure", j:"Ingénieure R&D", in:"IF", st:"En cours", tone:"blue", pct:40, action:"Relancer" },
  ],
  depts: [
    { d:"Production", done:82, total:64 },
    { d:"R&D", done:71, total:38 },
    { d:"Qualité", done:64, total:22 },
    { d:"Commercial", done:58, total:29 },
    { d:"Support & IT", done:49, total:31 },
    { d:"Direction", done:90, total:12 },
  ],
  campaigns: [
    { id:"c2026", name:"Entretiens annuels 2026", period:"Janv. – Févr. 2026", status:"En cours", tone:"blue", part:210, done:142, form:"Entretien annuel — standard", close:"28 févr. 2026" },
    { id:"pro2026", name:"Entretiens professionnels 2026", period:"Mars 2026", status:"Planifiée", tone:"grey", part:96, done:0, form:"Entretien professionnel", close:"31 mars 2026" },
    { id:"c2025", name:"Entretiens annuels 2025", period:"Janv. – Févr. 2025", status:"Clôturée", tone:"green", part:198, done:198, form:"Entretien annuel — standard", close:"28 févr. 2025" },
    { id:"onb2025", name:"Suivi de période d'essai — S2 2025", period:"Sept. 2025", status:"Clôturée", tone:"green", part:24, done:24, form:"Rapport d'étonnement", close:"30 sept. 2025" },
  ],
  forms: [
    { id:"f-annuel", name:"Entretien annuel — standard", sections:5, questions:24, used:3, status:"Publié", tone:"green" },
    { id:"f-pro", name:"Entretien professionnel", sections:4, questions:18, used:2, status:"Publié", tone:"green" },
    { id:"f-cadre", name:"Entretien annuel — cadres", sections:6, questions:30, used:1, status:"Publié", tone:"green" },
    { id:"f-essai", name:"Rapport d'étonnement (période d'essai)", sections:3, questions:12, used:1, status:"Brouillon", tone:"amber" },
  ],
  hrflags: [
    { id:"h1", who:"Thomas Petit", type:"Souhait de mobilité", level:"Moyen", tone:"amber", date:"02 févr.", from:"Sophie Lemaire", st:"À traiter" },
    { id:"h2", who:"Léa Moreau", type:"Risque de départ", level:"Élevé", tone:"red", date:"31 janv.", from:"Sophie Lemaire", st:"À traiter" },
    { id:"h3", who:"Inès Faure", type:"Besoin de formation", level:"Faible", tone:"blue", date:"28 janv.", from:"Marc Diallo", st:"En cours" },
    { id:"h4", who:"Yanis Cherif", type:"Demande d'augmentation", level:"Moyen", tone:"amber", date:"24 janv.", from:"Sophie Lemaire", st:"Traité" },
  ],
  mobility: [
    { who:"Thomas Petit", j:"Technicien maintenance", wish:"Évoluer vers un poste de chef d'équipe", site:"Site de Grenoble", when:"6–12 mois", tone:"blue" },
    { who:"Inès Faure", j:"Ingénieure R&D", wish:"Mobilité géographique — site de Toulouse", site:"Toulouse", when:"12 mois", tone:"blue" },
    { who:"Camille Rousseau", j:"Ingénieure procédés", wish:"Élargir vers la gestion de projet", site:"Site de Grenoble", when:"Indifférent", tone:"grey" },
  ],
  users: [
    { n:"Camille Rousseau", mail:"camille.rousseau@nanoxplore.com", role:"Collaborateur", dept:"Production", src:"LDAP", active:true, in:"CR" },
    { n:"Sophie Lemaire", mail:"sophie.lemaire@nanoxplore.com", role:"Manager", dept:"Production", src:"LDAP", active:true, in:"SL" },
    { n:"Karim Benali", mail:"karim.benali@nanoxplore.com", role:"RH", dept:"Ressources Humaines", src:"LDAP", active:true, in:"KB" },
    { n:"Marc Diallo", mail:"marc.diallo@nanoxplore.com", role:"Manager", dept:"R&D", src:"LDAP", active:true, in:"MD" },
    { n:"Julie Hoarau", mail:"julie.hoarau@nanoxplore.com", role:"Admin", dept:"SI", src:"Local", active:true, in:"JH" },
    { n:"Paul Mercier", mail:"paul.mercier@nanoxplore.com", role:"Collaborateur", dept:"Commercial", src:"LDAP", active:false, in:"PM" },
  ],
  audit: [
    ["Connexion réussie — karim.benali","RH","il y a 8 min"],
    ["Campagne « Entretiens 2026 » modifiée","Admin","il y a 1 h"],
    ["Import LDAP : 4 comptes synchronisés","Système","il y a 3 h"],
    ["Modèle d'e-mail « Relance » mis à jour","Admin","hier"],
    ["Export RGPD généré (utilisateur P. Mercier)","RH","hier"],
  ],
  competences: [
    { id:"expertise", label:"Expertise technique", desc:"Maîtrise des outils et savoir-faire de votre poste" },
    { id:"autonomie", label:"Autonomie & initiative", desc:"Capacité à organiser son travail et à proposer" },
    { id:"collaboration", label:"Travail en équipe", desc:"Communication et coopération avec les collègues" },
    { id:"qualite", label:"Rigueur & qualité", desc:"Fiabilité et soin apporté aux livrables" },
  ],
};
