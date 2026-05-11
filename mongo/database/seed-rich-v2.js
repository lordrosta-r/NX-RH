// =============================================================================
// database/seed-rich-v2.js — Jeu de données complet NanoXplore RH v2
//
// Crée :
//   - 52 utilisateurs (admin, rh, 1 DG, 4 directeurs, 10 managers, 35 employés)
//   - 6 templates de formulaires (multi-variantes)
//   - 4 campagnes (active 2025, draft 2025-bis, closed 2024, archived 2023)
//   - Formulaires de campagne (copies des templates)
//   - Évaluations C3/2024 toutes signées + C1/2025 partiellement remplies
//
// Usage in Docker:
//   docker exec <container> node /app/seed-rich-v2.js
//
// Usage local (npm script):
//   cd mongo/server && npm run seed:v2
//
// Idempotence :
//   - Drop complet des collections users/campaigns/forms/evaluations puis recréation
// =============================================================================

const path      = require('path')

// Supports two execution contexts:
//   1. In Docker: __dirname=/app, serverDir=/app
//   2. Local (npm run seed:v2): __dirname=<project>/mongo/database, serverDir=<project>/mongo/server
const serverDir = __dirname.endsWith('database')
  ? path.resolve(__dirname, '../server')
  : __dirname  // running from /app in Docker

const resolve = (mod) => {
  try { return require(mod) } catch (_) {}
  return require(path.join(serverDir, 'node_modules', mod))
}

try { resolve('dotenv').config({ path: path.join(serverDir, '.env') }) } catch (_) {}
if (!process.env.MONGO_URI) {
  process.env.MONGO_URI = 'mongodb://nx_mongo:27017/nanoxplore_rh'
}

const bcrypt  = resolve('bcrypt')
const { connect }                                     = require(path.join(serverDir, 'config/db'))
const { User, Campaign, Form, Evaluation, AuditLog }  = require(path.join(serverDir, 'models'))

const PASSWORD   = 'Test1234!'
const SALT_ROUNDS = 10

// ─── Helpers ─────────────────────────────────────────────────────────────────

const rand = (arr) => arr[Math.floor(Math.random() * arr.length)]
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min

function addDays(date, n) {
  return new Date(new Date(date).getTime() + n * 86400000)
}

function fullName(u) {
  return `${u.firstName} ${u.lastName}`
}

// ─── Données de référence ────────────────────────────────────────────────────

const DEPARTMENTS = [
  'Engineering',
  'Product',
  'Design',
  'Data',
  'Security',
  'Infrastructure',
  'Finance',
  'Legal',
  'HR',
  'Sales',
  'Marketing',
  'Customer Success',
  'Operations',
  'Executive',
]

const SECTORS = [
  { name: 'Tech & Produit',  color: '#6366F1' },
  { name: 'Commerce & Vente', color: '#0D9488' },
  { name: 'Support & Fonctions', color: '#F59E0B' },
]

// ─── Définition des utilisateurs ─────────────────────────────────────────────

const RAW_USERS = [
  // ── Comptes système ──
  { email: 'admin@nx-rh.fr',     firstName: 'Admin',     lastName: 'Système',    role: 'admin',    department: 'Executive',     jobTitle: 'Administrateur' },
  { email: 'rh@nx-rh.fr',        firstName: 'Sophie',    lastName: 'Martin',     role: 'hr',       department: 'HR',            jobTitle: 'Responsable RH' },

  // ── DG ──
  { email: 'dg@nx-rh.fr',        firstName: 'François',  lastName: 'Lecomte',    role: 'director', department: 'Executive',     jobTitle: 'Directeur Général', managerRef: null },

  // ── Directeurs ──
  { email: 'dir.tech@nx-rh.fr',  firstName: 'Alexandre', lastName: 'Bonneau',    role: 'director', department: 'Engineering',   jobTitle: 'Directeur Technique',    managerRef: 'dg@nx-rh.fr' },
  { email: 'dir.com@nx-rh.fr',   firstName: 'Claire',    lastName: 'Dupuis',     role: 'director', department: 'Sales',         jobTitle: 'Directrice Commerciale', managerRef: 'dg@nx-rh.fr' },
  { email: 'dir.rh@nx-rh.fr',    firstName: 'Thomas',    lastName: 'Girard',     role: 'director', department: 'HR',            jobTitle: 'Directeur des Ressources Humaines', managerRef: 'dg@nx-rh.fr' },
  { email: 'dir.fin@nx-rh.fr',   firstName: 'Isabelle',  lastName: 'Mercier',    role: 'director', department: 'Finance',       jobTitle: 'Directrice Financière',  managerRef: 'dg@nx-rh.fr' },

  // ── Managers Technique ──
  { email: 'mgr.back@nx-rh.fr',  firstName: 'Nicolas',   lastName: 'Perrin',     role: 'manager', department: 'Engineering',    jobTitle: 'Manager Dev Backend',    managerRef: 'dir.tech@nx-rh.fr' },
  { email: 'mgr.front@nx-rh.fr', firstName: 'Julie',     lastName: 'Lambert',    role: 'manager', department: 'Engineering',    jobTitle: 'Manager Dev Frontend',   managerRef: 'dir.tech@nx-rh.fr' },
  { email: 'mgr.ops@nx-rh.fr',   firstName: 'Sébastien', lastName: 'Fontaine',   role: 'manager', department: 'Infrastructure', jobTitle: 'Manager DevOps',         managerRef: 'dir.tech@nx-rh.fr' },

  // ── Managers Commercial ──
  { email: 'mgr.nord@nx-rh.fr',  firstName: 'Mathilde',  lastName: 'Rousseau',   role: 'manager', department: 'Sales',          jobTitle: 'Manager Équipe Nord',    managerRef: 'dir.com@nx-rh.fr' },
  { email: 'mgr.sud@nx-rh.fr',   firstName: 'Julien',    lastName: 'Blanc',      role: 'manager', department: 'Sales',          jobTitle: 'Manager Équipe Sud',     managerRef: 'dir.com@nx-rh.fr' },

  // ── Managers RH ──
  { email: 'mgr.recru@nx-rh.fr', firstName: 'Aurélie',   lastName: 'Morin',      role: 'manager', department: 'HR',             jobTitle: 'Manager Recrutement',    managerRef: 'dir.rh@nx-rh.fr' },
  { email: 'mgr.paie@nx-rh.fr',  firstName: 'Philippe',  lastName: 'Garnier',    role: 'manager', department: 'HR',             jobTitle: 'Manager Paie & Admin',   managerRef: 'dir.rh@nx-rh.fr' },

  // ── Managers Finance ──
  { email: 'mgr.compta@nx-rh.fr',firstName: 'Nathalie',  lastName: 'Bertin',     role: 'manager', department: 'Finance',        jobTitle: 'Manager Comptabilité',   managerRef: 'dir.fin@nx-rh.fr' },
  { email: 'mgr.ctrl@nx-rh.fr',  firstName: 'David',     lastName: 'Simon',      role: 'manager', department: 'Finance',        jobTitle: 'Manager Contrôle de gestion', managerRef: 'dir.fin@nx-rh.fr' },

  // ── Employés Backend (4) ──
  { email: 'emp.back1@nx-rh.fr', firstName: 'Alexis',    lastName: 'Chevalier',  role: 'employee', department: 'Engineering',   jobTitle: 'Développeur Backend Senior', managerRef: 'mgr.back@nx-rh.fr' },
  { email: 'emp.back2@nx-rh.fr', firstName: 'Camille',   lastName: 'Dubois',     role: 'employee', department: 'Engineering',   jobTitle: 'Développeur Backend',        managerRef: 'mgr.back@nx-rh.fr' },
  { email: 'emp.back3@nx-rh.fr', firstName: 'Romain',    lastName: 'Lefebvre',   role: 'employee', department: 'Engineering',   jobTitle: 'Développeur Backend',        managerRef: 'mgr.back@nx-rh.fr' },
  { email: 'emp.back4@nx-rh.fr', firstName: 'Lucie',     lastName: 'Petit',      role: 'employee', department: 'Engineering',   jobTitle: 'Développeur Backend Junior', managerRef: 'mgr.back@nx-rh.fr' },

  // ── Employés Frontend (4) ──
  { email: 'emp.front1@nx-rh.fr',firstName: 'Baptiste',  lastName: 'Moreau',     role: 'employee', department: 'Engineering',   jobTitle: 'Développeur Frontend Senior',managerRef: 'mgr.front@nx-rh.fr' },
  { email: 'emp.front2@nx-rh.fr',firstName: 'Laura',     lastName: 'Legrand',    role: 'employee', department: 'Engineering',   jobTitle: 'Développeur Frontend',       managerRef: 'mgr.front@nx-rh.fr' },
  { email: 'emp.front3@nx-rh.fr',firstName: 'Théo',      lastName: 'Renard',     role: 'employee', department: 'Engineering',   jobTitle: 'Développeur Frontend',       managerRef: 'mgr.front@nx-rh.fr' },
  { email: 'emp.front4@nx-rh.fr',firstName: 'Manon',     lastName: 'Robert',     role: 'employee', department: 'Engineering',   jobTitle: 'Développeur Frontend Junior',managerRef: 'mgr.front@nx-rh.fr' },

  // ── Employés DevOps (3) ──
  { email: 'emp.ops1@nx-rh.fr',  firstName: 'Pierre',    lastName: 'Martinez',   role: 'employee', department: 'Infrastructure',jobTitle: 'Ingénieur Infrastructure',   managerRef: 'mgr.ops@nx-rh.fr' },
  { email: 'emp.ops2@nx-rh.fr',  firstName: 'Sarah',     lastName: 'Bernard',    role: 'employee', department: 'Infrastructure',jobTitle: 'Ingénieur Cloud & DevOps',   managerRef: 'mgr.ops@nx-rh.fr' },
  { email: 'emp.ops3@nx-rh.fr',  firstName: 'Quentin',   lastName: 'Thomas',     role: 'employee', department: 'Infrastructure',jobTitle: 'SRE',                        managerRef: 'mgr.ops@nx-rh.fr' },

  // ── Employés Commercial Nord (4) ──
  { email: 'emp.nord1@nx-rh.fr', firstName: 'Emma',      lastName: 'Garcia',     role: 'employee', department: 'Sales',         jobTitle: 'Chargé(e) de comptes Senior',managerRef: 'mgr.nord@nx-rh.fr' },
  { email: 'emp.nord2@nx-rh.fr', firstName: 'Hugo',      lastName: 'Lopez',      role: 'employee', department: 'Sales',         jobTitle: 'Chargé(e) de comptes',       managerRef: 'mgr.nord@nx-rh.fr' },
  { email: 'emp.nord3@nx-rh.fr', firstName: 'Clémence',  lastName: 'Rodriguez',  role: 'employee', department: 'Sales',         jobTitle: 'Chargé(e) de comptes',       managerRef: 'mgr.nord@nx-rh.fr' },
  { email: 'emp.nord4@nx-rh.fr', firstName: 'Antoine',   lastName: 'Wilson',     role: 'employee', department: 'Sales',         jobTitle: 'Commercial(e) Junior',       managerRef: 'mgr.nord@nx-rh.fr' },

  // ── Employés Commercial Sud (4) ──
  { email: 'emp.sud1@nx-rh.fr',  firstName: 'Charlotte', lastName: 'Anderson',   role: 'employee', department: 'Sales',         jobTitle: 'Chargé(e) de comptes Senior',managerRef: 'mgr.sud@nx-rh.fr' },
  { email: 'emp.sud2@nx-rh.fr',  firstName: 'Lucas',     lastName: 'Jackson',    role: 'employee', department: 'Sales',         jobTitle: 'Chargé(e) de comptes',       managerRef: 'mgr.sud@nx-rh.fr' },
  { email: 'emp.sud3@nx-rh.fr',  firstName: 'Inès',      lastName: 'Martin',     role: 'employee', department: 'Sales',         jobTitle: 'Chargé(e) de comptes',       managerRef: 'mgr.sud@nx-rh.fr' },
  { email: 'emp.sud4@nx-rh.fr',  firstName: 'Gabriel',   lastName: 'Thompson',   role: 'employee', department: 'Sales',         jobTitle: 'Commercial(e) Junior',       managerRef: 'mgr.sud@nx-rh.fr' },

  // ── Employés Recrutement (3) ──
  { email: 'emp.recru1@nx-rh.fr',firstName: 'Pauline',   lastName: 'Davis',      role: 'employee', department: 'HR',            jobTitle: 'Chargé(e) de Recrutement Senior', managerRef: 'mgr.recru@nx-rh.fr' },
  { email: 'emp.recru2@nx-rh.fr',firstName: 'Florian',   lastName: 'Harris',     role: 'employee', department: 'HR',            jobTitle: 'Chargé(e) de Recrutement',       managerRef: 'mgr.recru@nx-rh.fr' },
  { email: 'emp.recru3@nx-rh.fr',firstName: 'Mélanie',   lastName: 'Clark',      role: 'employee', department: 'HR',            jobTitle: 'Chargé(e) de Recrutement',       managerRef: 'mgr.recru@nx-rh.fr' },

  // ── Employés Paie (3) ──
  { email: 'emp.paie1@nx-rh.fr', firstName: 'Stéphane',  lastName: 'Lewis',      role: 'employee', department: 'HR',            jobTitle: 'Gestionnaire Paie Senior',managerRef: 'mgr.paie@nx-rh.fr' },
  { email: 'emp.paie2@nx-rh.fr', firstName: 'Virginie',  lastName: 'Lee',        role: 'employee', department: 'HR',            jobTitle: 'Gestionnaire Paie',       managerRef: 'mgr.paie@nx-rh.fr' },
  { email: 'emp.paie3@nx-rh.fr', firstName: 'Cédric',    lastName: 'Walker',     role: 'employee', department: 'HR',            jobTitle: 'Gestionnaire Admin RH',   managerRef: 'mgr.paie@nx-rh.fr' },

  // ── Employés Comptabilité (3) ──
  { email: 'emp.cpta1@nx-rh.fr', firstName: 'Marine',    lastName: 'Hall',       role: 'employee', department: 'Finance',       jobTitle: 'Comptable Senior',        managerRef: 'mgr.compta@nx-rh.fr' },
  { email: 'emp.cpta2@nx-rh.fr', firstName: 'Benoît',    lastName: 'Allen',      role: 'employee', department: 'Finance',       jobTitle: 'Comptable',               managerRef: 'mgr.compta@nx-rh.fr' },
  { email: 'emp.cpta3@nx-rh.fr', firstName: 'Laure',     lastName: 'Young',      role: 'employee', department: 'Finance',       jobTitle: 'Comptable Junior',        managerRef: 'mgr.compta@nx-rh.fr' },

  // ── Employés Contrôle de gestion (2) ──
  { email: 'emp.ctrl1@nx-rh.fr', firstName: 'Damien',    lastName: 'King',       role: 'employee', department: 'Finance',       jobTitle: 'Contrôleur de Gestion',   managerRef: 'mgr.ctrl@nx-rh.fr' },
  { email: 'emp.ctrl2@nx-rh.fr', firstName: 'Estelle',   lastName: 'Wright',     role: 'employee', department: 'Finance',       jobTitle: 'Contrôleur de Gestion Junior', managerRef: 'mgr.ctrl@nx-rh.fr' },
]

// ─── Templates de formulaires ─────────────────────────────────────────────────

function makeSelfEvalSimple(adminId) {
  return {
    campaignId: null,
    templateSourceId: null,
    title: 'Auto-évaluation Standard',
    description: 'Formulaire d\'auto-évaluation court (5 questions). Idéal pour les évaluations intermédiaires.',
    formType: 'self_evaluation',
    isAnonymous: false,
    createdBy: adminId,
    questions: [
      { id: 'se_s1', type: 'rating', label: 'Comment évaluez-vous votre performance globale sur la période ?', required: true, scale: 5, phase: 'self' },
      { id: 'se_s2', type: 'text',   label: 'Quels sont vos principales réalisations depuis le dernier entretien ?', required: true, phase: 'self' },
      { id: 'se_s3', type: 'text',   label: 'Quels sont les axes d\'amélioration que vous identifiez ?', required: true, phase: 'self' },
      { id: 'se_s4', type: 'yes_no', label: 'Avez-vous des besoins de formation spécifiques ?', required: false, phase: 'self' },
      { id: 'se_s5', type: 'weather',label: 'Comment vous sentez-vous dans votre poste actuellement ?', required: true, phase: 'self' },
    ],
  }
}

function makeSelfEvalDetailed(adminId) {
  return {
    campaignId: null,
    templateSourceId: null,
    title: 'Auto-évaluation Complète',
    description: 'Formulaire d\'auto-évaluation complet (12 questions) couvrant la performance, les compétences, les aspirations et la mobilité.',
    formType: 'self_evaluation',
    isAnonymous: false,
    createdBy: adminId,
    questions: [
      { id: 'se_d1',  type: 'rating',   label: 'Performance globale sur la période', required: true, scale: 10, phase: 'self' },
      { id: 'se_d2',  type: 'rating',   label: 'Qualité du travail produit', required: true, scale: 5, phase: 'self' },
      { id: 'se_d3',  type: 'rating',   label: 'Collaboration et travail en équipe', required: true, scale: 5, phase: 'self' },
      { id: 'se_d4',  type: 'text',     label: 'Décrivez vos principales réalisations (3 max)', required: true, phase: 'self' },
      { id: 'se_d5',  type: 'text',     label: 'Difficultés rencontrées et comment vous les avez surmontées', required: true, phase: 'self' },
      { id: 'se_d6',  type: 'text',     label: 'Compétences développées sur la période', required: true, phase: 'self' },
      { id: 'se_d7',  type: 'text',     label: 'Quels sont vos objectifs pour la prochaine période ?', required: true, phase: 'objectives' },
      { id: 'se_d8',  type: 'choice',   label: 'Quel est votre souhait d\'évolution à 2 ans ?', required: true, options: ['Progresser dans mon rôle actuel', 'Évoluer vers un poste de management', 'Explorer un autre domaine métier', 'Développer une expertise technique', 'Pas de changement souhaité'], phase: 'aspirations' },
      { id: 'se_d9',  type: 'mobility', label: 'Seriez-vous ouvert(e) à une mobilité géographique ?', required: false, phase: 'aspirations' },
      { id: 'se_d10', type: 'text',     label: 'Quelles formations souhaiteriez-vous suivre ?', required: false, phase: 'aspirations' },
      { id: 'se_d11', type: 'weather',  label: 'Comment évaluez-vous votre bien-être au travail ?', required: true, phase: 'self' },
      { id: 'se_d12', type: 'n1_import',label: 'Comparaison avec les objectifs de l\'année précédente', required: false, phase: 'n-1' },
    ],
  }
}

function makeManagerEvalSimple(adminId) {
  return {
    campaignId: null,
    templateSourceId: null,
    title: 'Évaluation Manager Standard',
    description: 'Grille d\'évaluation manager — 6 critères essentiels.',
    formType: 'manager_evaluation',
    isAnonymous: false,
    createdBy: adminId,
    questions: [
      { id: 'me_s1', type: 'rating', label: 'Performance globale du collaborateur', required: true, scale: 5, phase: 'all' },
      { id: 'me_s2', type: 'rating', label: 'Atteinte des objectifs fixés', required: true, scale: 5, phase: 'all' },
      { id: 'me_s3', type: 'text',   label: 'Points forts observés sur la période', required: true, phase: 'all' },
      { id: 'me_s4', type: 'text',   label: 'Axes de développement prioritaires', required: true, phase: 'all' },
      { id: 'me_s5', type: 'yes_no', label: 'Le collaborateur est-il prêt pour une évolution de responsabilités ?', required: true, phase: 'all' },
      { id: 'me_s6', type: 'text',   label: 'Objectifs proposés pour la prochaine période', required: true, phase: 'objectives' },
    ],
  }
}

function makeManagerEval360(adminId) {
  return {
    campaignId: null,
    templateSourceId: null,
    title: 'Évaluation Manager 360°',
    description: 'Évaluation 360° complète — compétences métier, comportementales et potentiel d\'évolution.',
    formType: 'manager_evaluation',
    isAnonymous: false,
    createdBy: adminId,
    questions: [
      { id: 'me_d1', type: 'rating',  label: 'Performance globale (résultats)', required: true, scale: 10, phase: 'all' },
      { id: 'me_d2', type: 'rating',  label: 'Compétences techniques / métier', required: true, scale: 5, phase: 'all' },
      { id: 'me_d3', type: 'rating',  label: 'Compétences comportementales (soft skills)', required: true, scale: 5, phase: 'all' },
      { id: 'me_d4', type: 'rating',  label: 'Collaboration et esprit d\'équipe', required: true, scale: 5, phase: 'all' },
      { id: 'me_d5', type: 'text',    label: 'Principales réalisations et contributions', required: true, phase: 'all' },
      { id: 'me_d6', type: 'text',    label: 'Axes d\'amélioration prioritaires', required: true, phase: 'all' },
      { id: 'me_d7', type: 'choice',  label: 'Potentiel d\'évolution évalué par le manager', required: true, options: ['Haut potentiel — prêt pour une promotion', 'Bon potentiel — à confirmer sur 12 mois', 'En développement — accompagnement nécessaire', 'Poste tenu correctement sans évolution proche'], phase: 'all' },
      { id: 'me_d8', type: 'text',    label: 'Objectifs SMART pour la prochaine période', required: true, phase: 'objectives' },
      { id: 'me_d9', type: 'text',    label: 'Plan de développement / formations recommandées', required: false, phase: 'objectives' },
      { id: 'me_d10',type: 'n1_import',label: 'Bilan des objectifs de l\'année précédente', required: false, phase: 'n-1' },
    ],
  }
}

function makeUpwardFeedback(adminId) {
  return {
    campaignId: null,
    templateSourceId: null,
    title: 'Feedback Montant (anonyme)',
    description: 'Feedback anonyme des collaborateurs vers leur manager direct.',
    formType: 'upward_feedback',
    isAnonymous: true,
    createdBy: adminId,
    questions: [
      { id: 'uf_1', type: 'rating',  label: 'Votre manager communique clairement les objectifs et les priorités', required: true, scale: 5, phase: 'all' },
      { id: 'uf_2', type: 'rating',  label: 'Votre manager vous soutient dans votre développement professionnel', required: true, scale: 5, phase: 'all' },
      { id: 'uf_3', type: 'rating',  label: 'Votre manager favorise un environnement de travail positif et inclusif', required: true, scale: 5, phase: 'all' },
      { id: 'uf_4', type: 'text',    label: 'Que pourrait faire votre manager différemment pour mieux vous accompagner ?', required: false, phase: 'all' },
    ],
  }
}

function makeDirectorEval(adminId) {
  return {
    campaignId: null,
    templateSourceId: null,
    title: 'Évaluation Directeur',
    description: 'Grille d\'évaluation réservée aux membres de direction.',
    formType: 'director_evaluation',
    isAnonymous: false,
    createdBy: adminId,
    questions: [
      { id: 'de_1', type: 'rating',  label: 'Atteinte des objectifs stratégiques de la direction', required: true, scale: 10, phase: 'all' },
      { id: 'de_2', type: 'rating',  label: 'Leadership et capacité à fédérer les équipes', required: true, scale: 5, phase: 'all' },
      { id: 'de_3', type: 'rating',  label: 'Contribution à la vision et stratégie de l\'entreprise', required: true, scale: 5, phase: 'all' },
      { id: 'de_4', type: 'text',    label: 'Principales réalisations et impact business sur la période', required: true, phase: 'all' },
      { id: 'de_5', type: 'text',    label: 'Enjeux et défis à relever sur la prochaine période', required: true, phase: 'objectives' },
      { id: 'de_6', type: 'choice',  label: 'Évaluation du potentiel de croissance de la direction', required: true, options: ['Forte croissance attendue', 'Croissance stable', 'Consolidation nécessaire', 'Réorientation stratégique recommandée'], phase: 'all' },
      { id: 'de_7', type: 'text',    label: 'Plan de développement personnel et managérial', required: false, phase: 'aspirations' },
      { id: 'de_8', type: 'weather', label: 'Bilan global de la période — ressenti général', required: true, phase: 'self' },
    ],
  }
}

// ─── Génération de réponses réalistes ─────────────────────────────────────────

function generateAnswers(questions, quality = 'good') {
  return questions.map(q => {
    let value
    if (q.type === 'rating') {
      const scale = q.scale || 5
      if (quality === 'excellent') value = Math.min(scale, Math.ceil(scale * 0.85 + Math.random() * scale * 0.15))
      else if (quality === 'good')  value = Math.max(1, Math.ceil(scale * 0.65 + Math.random() * scale * 0.25))
      else                          value = Math.max(1, Math.ceil(scale * 0.45 + Math.random() * scale * 0.3))
    } else if (q.type === 'text') {
      const texts = {
        excellent: ['Excellentes performances avec dépassement des objectifs fixés.', 'Contribution remarquable aux projets stratégiques de l\'équipe.', 'Leadership exemplaire et très bonne collaboration inter-équipes.'],
        good: ['Bonnes performances globales avec atteinte des principaux objectifs.', 'Contribution significative aux projets de l\'équipe.', 'Bonne collaboration et engagement professionnel reconnu.'],
        average: ['Performances correctes malgré quelques difficultés rencontrées.', 'Contribution aux projets avec des axes d\'amélioration identifiés.', 'Collaboration satisfaisante mais des progrès sont attendus.'],
      }
      value = rand(texts[quality] || texts['good'])
    } else if (q.type === 'yes_no') {
      value = quality === 'excellent' ? 'yes' : quality === 'average' ? 'no' : rand(['yes', 'no'])
    } else if (q.type === 'choice') {
      value = q.options ? rand(q.options) : null
    } else if (q.type === 'weather') {
      const weathers = quality === 'excellent' ? ['sunny', 'cloudy'] : quality === 'good' ? ['sunny', 'cloudy', 'windy'] : ['cloudy', 'windy', 'rainy']
      value = rand(weathers)
    } else if (q.type === 'mobility') {
      value = rand(['open', 'limited', 'no'])
    } else if (q.type === 'n1_import') {
      value = null
    }
    return { questionId: q.id, value }
  }).filter(a => a.value !== null && a.value !== undefined)
}

function computeScore(answers, questions) {
  const ratingAnswers = answers.filter(a => {
    const q = questions.find(q => q.id === a.questionId)
    return q && q.type === 'rating'
  })
  if (!ratingAnswers.length) return null
  const total = ratingAnswers.reduce((sum, a) => {
    const q = questions.find(q => q.id === a.questionId)
    const pct = (a.value / (q.scale || 5)) * 100
    return sum + pct
  }, 0)
  return Math.round(total / ratingAnswers.length)
}

// ─── Seed principal ───────────────────────────────────────────────────────────

async function main() {
  console.log('🌱 Connexion à MongoDB...')
  await connect()

  // ── Suppression des données existantes ──
  console.log('🗑️  Suppression des données existantes...')
  await Promise.all([
    User.deleteMany({}),
    Campaign.deleteMany({}),
    Form.deleteMany({}),
    Evaluation.deleteMany({}),
    AuditLog.deleteMany({}),
  ])

  // ── Hash du mot de passe ──
  console.log('🔐 Hash du mot de passe...')
  const hash = await bcrypt.hash(PASSWORD, SALT_ROUNDS)

  // ── Création des utilisateurs ──
  console.log('👥 Création des utilisateurs...')
  const userMap = new Map() // email → ObjectId

  // Première passe : créer tous les utilisateurs sans managerId
  const createdUsers = []
  for (const raw of RAW_USERS) {
    const user = await User.create({
      email:      raw.email,
      password:   hash,
      firstName:  raw.firstName,
      lastName:   raw.lastName,
      role:       raw.role,
      department: raw.department,
      jobTitle:   raw.jobTitle || '',
      isActive:   true,
      authSource: 'local',
    })
    userMap.set(raw.email, user._id)
    createdUsers.push({ raw, id: user._id })
  }

  // Deuxième passe : mettre à jour les managerId
  for (const { raw, id } of createdUsers) {
    if (raw.managerRef) {
      const managerId = userMap.get(raw.managerRef)
      if (managerId) {
        await User.findByIdAndUpdate(id, { managerId })
      }
    }
  }

  console.log(`✅ ${RAW_USERS.length} utilisateurs créés`)

  const adminId = userMap.get('admin@nx-rh.fr')
  const hrId    = userMap.get('rh@nx-rh.fr')

  // ── Création des templates ──
  console.log('📋 Création des templates de formulaires...')
  const tmplSelfSimple   = await Form.create(makeSelfEvalSimple(adminId))
  const tmplSelfDetailed = await Form.create(makeSelfEvalDetailed(adminId))
  const tmplMgrSimple    = await Form.create(makeManagerEvalSimple(adminId))
  const tmplMgr360       = await Form.create(makeManagerEval360(adminId))
  const tmplUpward       = await Form.create(makeUpwardFeedback(adminId))
  const tmplDirector     = await Form.create(makeDirectorEval(adminId))
  console.log('✅ 6 templates créés')

  // ── Création des campagnes ──
  console.log('📅 Création des campagnes...')

  // C4 — Archived 2023
  const c4 = await Campaign.create({
    name: 'Bilan Annuel 2023',
    description: 'Campagne d\'évaluation annuelle — exercice 2023. Archivée.',
    startDate: new Date('2023-09-01'),
    endDate:   new Date('2023-11-30'),
    status:    'archived',
    createdBy: adminId,
    targetDepartments: [],
  })

  // C3 — Closed 2024 (N-1)
  const c3 = await Campaign.create({
    name: 'Bilan Annuel 2024',
    description: 'Campagne d\'évaluation annuelle — exercice 2024. Clôturée avec toutes les évaluations signées.',
    startDate:   new Date('2024-09-01'),
    endDate:     new Date('2024-11-30'),
    status:      'closed',
    createdBy:   adminId,
    targetDepartments: [],
  })

  // C1 — Active 2025
  const c1 = await Campaign.create({
    name: 'Évaluation Annuelle 2025',
    description: 'Campagne d\'évaluation annuelle — exercice 2025. Campagne en cours avec contexte N-1 activé.',
    startDate:   new Date('2025-09-01'),
    endDate:     new Date('2025-11-30'),
    status:      'active',
    createdBy:   adminId,
    targetDepartments: [],
    previousCampaignId:  c3._id,
    enableN1Context:     true,
    n1VisibleToEmployee: false,
  })

  // C2 — Draft 2025-bis
  const c2 = await Campaign.create({
    name: 'Évaluation Mi-parcours 2025',
    description: 'Campagne d\'évaluation intermédiaire — mi-parcours 2025. En cours de préparation.',
    startDate: new Date('2025-06-01'),
    endDate:   new Date('2025-07-31'),
    status:    'draft',
    createdBy: hrId,
    targetDepartments: ['Engineering', 'Sales'],
  })

  console.log('✅ 4 campagnes créées (archived, closed, active, draft)')

  // ── Création des formulaires de campagne (copies des templates) ──
  console.log('📝 Copie des templates vers les campagnes...')

  // C3 (2024) : Auto-éval Standard + Éval Manager Standard
  const c3FormSelf = await Form.create({ ...tmplSelfSimple.toObject(),   _id: undefined, __v: undefined, campaignId: c3._id, templateSourceId: tmplSelfSimple._id,   frozenAt: new Date('2024-09-15'), isFrozen: true, createdBy: adminId })
  const c3FormMgr  = await Form.create({ ...tmplMgrSimple.toObject(),    _id: undefined, __v: undefined, campaignId: c3._id, templateSourceId: tmplMgrSimple._id,    frozenAt: new Date('2024-09-15'), isFrozen: true, createdBy: adminId })

  // C1 (2025) : Auto-éval Complète + Éval Manager Standard + Feedback Montant
  const c1FormSelf   = await Form.create({ ...tmplSelfDetailed.toObject(), _id: undefined, __v: undefined, campaignId: c1._id, templateSourceId: tmplSelfDetailed._id, frozenAt: new Date('2025-09-05'), isFrozen: true, createdBy: adminId })
  const c1FormMgr    = await Form.create({ ...tmplMgrSimple.toObject(),    _id: undefined, __v: undefined, campaignId: c1._id, templateSourceId: tmplMgrSimple._id,    frozenAt: new Date('2025-09-05'), isFrozen: true, createdBy: adminId })
  const c1FormUpward = await Form.create({ ...tmplUpward.toObject(),       _id: undefined, __v: undefined, campaignId: c1._id, templateSourceId: tmplUpward._id,       frozenAt: new Date('2025-09-05'), isFrozen: true, createdBy: adminId })

  // C2 (draft) : Template simple en préparation (non gelé)
  await Form.create({ ...tmplSelfSimple.toObject(), _id: undefined, __v: undefined, campaignId: c2._id, templateSourceId: tmplSelfSimple._id, frozenAt: null, isFrozen: false, createdBy: hrId })

  console.log('✅ Formulaires de campagne créés (C1: 3, C2: 1, C3: 2)')

  // ── Récupération des employés pour les évaluations ──
  const employees = await User.find({ role: 'employee' }).select('_id managerId department').lean()
  const managers  = await User.find({ role: 'manager'  }).select('_id').lean()

  // ── Évaluations C3 (2024) — toutes signées (données historiques) ──
  console.log('📊 Création des évaluations C3/2024 (toutes signées)...')
  const c3Evals = []
  for (const emp of employees) {
    const evaluatorId = emp.managerId || adminId
    const qualities = ['excellent', 'excellent', 'good', 'good', 'good', 'average']
    const quality = rand(qualities)

    const selfAnswers = generateAnswers(c3FormSelf.questions, quality)
    const mgrAnswers  = generateAnswers(c3FormMgr.questions, quality)
    const selfScore   = computeScore(selfAnswers, c3FormSelf.questions)
    const mgrScore    = computeScore(mgrAnswers, c3FormMgr.questions)

    // Auto-évaluation (signed_hr)
    c3Evals.push({
      campaignId:  c3._id,
      formId:      c3FormSelf._id,
      evaluateeId: emp._id,
      evaluatorId: emp._id,
      status:      'signed_hr',
      answers:     selfAnswers,
      score:       selfScore,
      submittedAt: addDays('2024-10-01', randInt(0, 45)),
      reviewedAt:  addDays('2024-10-01', randInt(45, 60)),
    })

    // Évaluation manager (signed_hr)
    c3Evals.push({
      campaignId:  c3._id,
      formId:      c3FormMgr._id,
      evaluateeId: emp._id,
      evaluatorId,
      status:      'signed_hr',
      answers:     mgrAnswers,
      score:       mgrScore,
      submittedAt: addDays('2024-10-01', randInt(30, 60)),
      reviewedAt:  addDays('2024-10-01', randInt(60, 75)),
    })
  }

  // Évaluations des managers (auto-éval + directeur)
  for (const mgr of managers) {
    const selfAnswers = generateAnswers(c3FormSelf.questions, 'good')
    const selfScore   = computeScore(selfAnswers, c3FormSelf.questions)
    c3Evals.push({
      campaignId:  c3._id,
      formId:      c3FormSelf._id,
      evaluateeId: mgr._id,
      evaluatorId: mgr._id,
      status:      'signed_hr',
      answers:     selfAnswers,
      score:       selfScore,
      submittedAt: addDays('2024-10-01', randInt(0, 45)),
      reviewedAt:  addDays('2024-10-01', randInt(45, 60)),
    })
  }

  await Evaluation.insertMany(c3Evals)
  console.log(`✅ ${c3Evals.length} évaluations C3/2024 créées (toutes signed_hr)`)

  // ── Évaluations C1 (2025) — partiellement remplies ──
  console.log('📊 Création des évaluations C1/2025 (partielles)...')
  const c1Evals = []
  const statuses = ['assigned', 'assigned', 'in_progress', 'in_progress', 'in_progress', 'in_progress', 'submitted', 'submitted', 'reviewed', 'signed_evaluatee', 'signed_manager']

  for (const emp of employees) {
    const evaluatorId = emp.managerId || adminId
    const status = rand(statuses)
    const quality = rand(['excellent', 'good', 'good', 'average'])

    let selfAnswers = [], mgrAnswers = [], upwardAnswers = []
    let selfScore = null, mgrScore = null

    if (status !== 'assigned') {
      selfAnswers = generateAnswers(c1FormSelf.questions, quality)
      selfScore   = computeScore(selfAnswers, c1FormSelf.questions)
    }
    if (['reviewed', 'signed_evaluatee', 'signed_manager'].includes(status)) {
      mgrAnswers = generateAnswers(c1FormMgr.questions, quality)
      mgrScore   = computeScore(mgrAnswers, c1FormMgr.questions)
    }
    if (['submitted', 'reviewed', 'signed_evaluatee', 'signed_manager'].includes(status)) {
      upwardAnswers = generateAnswers(c1FormUpward.questions, quality)
    }

    // Auto-évaluation
    c1Evals.push({
      campaignId:  c1._id,
      formId:      c1FormSelf._id,
      evaluateeId: emp._id,
      evaluatorId: emp._id,
      status,
      answers: selfAnswers,
      score: selfScore,
      ...(status !== 'assigned' ? { lastSavedAt: addDays('2025-09-05', randInt(1, 15)) } : {}),
      ...((['submitted', 'reviewed', 'signed_evaluatee', 'signed_manager'].includes(status)) ? { submittedAt: addDays('2025-09-05', randInt(5, 20)) } : {}),
    })

    // Évaluation manager
    c1Evals.push({
      campaignId:  c1._id,
      formId:      c1FormMgr._id,
      evaluateeId: emp._id,
      evaluatorId,
      status: ['reviewed', 'signed_evaluatee', 'signed_manager'].includes(status) ? status : 'assigned',
      answers: mgrAnswers,
      score: mgrScore,
    })

    // Feedback montant (anonyme)
    c1Evals.push({
      campaignId:  c1._id,
      formId:      c1FormUpward._id,
      evaluateeId: evaluatorId,
      evaluatorId: emp._id,
      status: upwardAnswers.length ? 'submitted' : 'assigned',
      answers: upwardAnswers,
    })
  }

  await Evaluation.insertMany(c1Evals)
  console.log(`✅ ${c1Evals.length} évaluations C1/2025 créées (mix statuts)`)

  // ── Résumé ──
  const counts = await Promise.all([
    User.countDocuments(),
    Campaign.countDocuments(),
    Form.countDocuments(),
    Evaluation.countDocuments(),
  ])

  console.log('\n╔═══════════════════════════════════════╗')
  console.log('║        SEED v2 — TERMINÉ ✅            ║')
  console.log('╠═══════════════════════════════════════╣')
  console.log(`║  👥 Utilisateurs   : ${String(counts[0]).padStart(3)} (dont ${RAW_USERS.filter(u => u.role === 'employee').length} employés) ║`)
  console.log(`║  📅 Campagnes      : ${String(counts[1]).padStart(3)}                     ║`)
  console.log(`║  📋 Formulaires    : ${String(counts[2]).padStart(3)} (6 templates + liés) ║`)
  console.log(`║  📊 Évaluations    : ${String(counts[3]).padStart(3)}                     ║`)
  console.log('╠═══════════════════════════════════════╣')
  console.log('║  🔐 MDP : Test1234! (tous)            ║')
  console.log('║  👤 admin@nx-rh.fr / rh@nx-rh.fr     ║')
  console.log('╚═══════════════════════════════════════╝')

  process.exit(0)
}

main().catch(err => {
  console.error('❌ Erreur seed:', err)
  process.exit(1)
})
