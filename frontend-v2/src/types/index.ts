// ─── Rôles & Auth ─────────────────────────────────────────────────────────────
export type Role = "admin" | "hr" | "manager" | "employee";
export type AuthSource = "local" | "ldap";

export interface BaseEntity {
  _id: string;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  _id?: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  sectorId?: string;
  managerId?: string;
  department?: string;
  position?: string;
  isActive: boolean;
  blocked?: boolean;
  blockedReason?: string | null;
  canViewSubtree?: boolean;
  dottedLineManagerIds?: string[];
  impersonatedBy?: string | null;
  authSource: AuthSource;
  gdprAnonymized?: boolean;
  deactivatedAt?: string;
  offboardingStatus?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface AuthPayload {
  id: string;
  email: string;
  role: Role;
  firstName: string;
  lastName: string;
}

// ─── Campagnes ─────────────────────────────────────────────────────────────────
export type CampaignStatus = "draft" | "active" | "closed" | "archived";

/** Format objet stocké en base et renvoyé par l'API */
export interface TargetScope {
  scopeType: "all" | "role" | "department" | "sector" | "users" | "group";
  ids: string[];
}

/** Une demande de formulaire adressée à un manager pour une campagne. */
export interface CampaignFormRequest {
  managerId:
    | string
    | { _id: string; firstName?: string; lastName?: string; email?: string };
  status: "pending" | "submitted" | "accepted" | "declined";
  formId?:
    | string
    | { _id: string; title?: string; formType?: string }
    | null;
  requestedAt?: string;
  submittedAt?: string | null;
  decidedAt?: string | null;
}

/** Aperçu RH/Admin d'une collecte de formulaires (GET /campaigns/form-requests/overview). */
export interface CampaignFormCollectionSummary {
  campaignId: string;
  campaignName: string;
  total: number;
  pending: number;
  submitted: number;
  accepted: number;
  declined: number;
}

/** Une demande de formulaire vue côté manager (GET /campaigns/mine/form-requests). */
export interface MyFormRequest {
  campaignId: string;
  campaignName: string;
  campaignStatus: CampaignStatus;
  status: "pending" | "submitted" | "accepted" | "declined";
  formId?: string | null;
  requestedAt?: string;
}

export interface Campaign {
  id: string;
  _id?: string;
  name: string;
  description?: string;
  status: CampaignStatus;
  startDate: string;
  endDate: string;
  deadlineEmployee?: string;
  deadlineManager?: string;
  targetDepartments?: string[];
  extendedVisibility?: boolean;
  enableN1Context?: boolean;
  n1VisibleToEmployee?: boolean;
  previousCampaignId?: string;
  /**
   * Périmètre de la campagne — format objet renvoyé par l'API.
   * Pour la création/mise à jour, le payload envoie les champs plats
   * (targetScope = scopeType string + targetRoleIds/targetSectorIds/…).
   */
  targetScope?: TargetScope;
  /** Champs plats utilisés uniquement dans les payloads d'écriture (POST/PATCH). */
  targetRoleIds?: string[];
  targetSectorIds?: string[];
  targetUserIds?: string[];
  targetGroupIds?: string[];
  formIds?: string[];
  /** Collecte des formulaires des managers (campagne brouillon). */
  formRequests?: CampaignFormRequest[];
  completionPct?: number;
  stats?: {
    total: number;
    started: number;
    submitted: number;
    validated: number;
  };
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

// ─── Évaluations ───────────────────────────────────────────────────────────────
export type EvaluationStatus =
  | "assigned"
  | "in_progress"
  | "submitted"
  | "reviewed"
  | "disputed"
  | "signed_evaluatee"
  | "signed_manager"
  | "signed_hr"
  | "validated"
  | "expired"
  | "archived";

export interface SystemStatus {
  smtp: { ok: boolean; error?: string };
  version?: string;
  uptime?: number;
}

export interface EvaluationSignature {
  userId: string;
  role: "evaluator" | "evaluatee" | "hr" | "manager";
  signedAt: string;
  ipAddress?: string;
}

export interface Evaluation {
  id: string;
  campaignId: string | Campaign;
  evaluateeId: string;
  evaluatorId: string;
  formId: string;
  status: EvaluationStatus;
  deadline?: string;
  /** Le serveur stocke les réponses en tableau [{questionId, value}]. */
  answers?: Array<{ questionId: string; value: unknown }>;
  reviewerScore?: number;
  nextYearObjectives?: string;
  reviewerComment?: string;
  evaluateeComment?: string;
  disagreementFlag?: boolean;
  signedByEvaluateeAt?: string;
  signedByManagerAt?: string;
  signedByHrAt?: string;
  signatures?: EvaluationSignature[];
  signatureStatus?:
    | "none"
    | "pending_evaluatee"
    | "pending_evaluator"
    | "complete";
  createdAt?: string;
  updatedAt?: string;
  // Relations peuplées
  evaluatee?: User;
  evaluator?: User;
  campaign?: Campaign;
  form?: Form;
}

// Données de l'évaluation N-1 — renvoyées par GET /api/evaluations/:id/n1-context
// (204 No Content si la feature est désactivée ou si aucune éval N-1 n'existe).
export interface N1Context {
  n1Campaign: {
    id?: string;
    name?: string;
    startDate?: string;
    endDate?: string;
  };
  reviewerScore: number | null;
  reviewerComment: string | null;
  nextYearObjectives: string | null;
  objectiveRatings: Record<string, string>;
  status: EvaluationStatus;
  objectivesAnswers: Array<{
    questionId: string;
    questionLabel: string;
    questionType?: string;
    value: unknown;
  }>;
  // Résolution par question (clé = id de la question COURANTE) pour
  // l'accordéon inline « Édition précédente ».
  byQuestion?: Record<
    string,
    { value: unknown; label: string | null; type?: string; scale?: number }
  >;
  formTitle: string | null;
  formType: string | null;
  evaluateeComment?: string | null;
  disagreementFlag?: boolean;
}

// ─── Formulaires ───────────────────────────────────────────────────────────────
export type QuestionType =
  | "text"
  | "textarea"
  | "rating"
  | "choice"
  | "yes_no"
  | "weather"
  | "mobility"
  | "n1_import"
  | "scale"
  | "objective_item";
export type QuestionPhase =
  | "self"
  | "n-1"
  | "objectives"
  | "aspirations"
  | "all";

export interface FormQuestion {
  id: string;
  type: QuestionType;
  text: string;
  required: boolean;
  phase?: QuestionPhase;
  options?: string[];
  order?: number;
  // Édition précédente (ex « N-1 ») — curation RH par question.
  carryPrevious?: boolean;
  // Lignée de la question à travers les campagnes (clonage de formulaire).
  parentQuestionId?: string | null;
}

/** Catégorie de formulaire (groupe du sélecteur de type, gérée en DB). */
export interface FormCategory {
  id: string;
  label: string;
  types?: string[];
}

export interface Form {
  id: string;
  title: string;
  description?: string;
  formType: string;
  category?: string | null;
  questions: FormQuestion[];
  isFrozen: boolean;
  frozenAt?: string;
  filledBy?: "employee" | "manager" | "hr";
  visibleToEvaluatee?: boolean;
  createdBy?:
    | string
    | { _id: string; firstName?: string; lastName?: string };
  createdAt?: string;
  updatedAt?: string;
}

// ─── Notifications ─────────────────────────────────────────────────────────────
export type NotificationPriority = "low" | "normal" | "high";

export interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  link?: string;
  read: boolean;
  priority?: NotificationPriority;
  createdAt: string;
}

// ─── Signaux RH (HrFlags) ──────────────────────────────────────────────────────
export type HrFlagStatus = "pending" | "in_progress" | "treated" | "rejected";
export type HrFlagType =
  | "mobility_request"
  | "salary_raise_request"
  | "promotion_request"
  | "training_request"
  | "other";

export interface HrFlag {
  id: string;
  type: HrFlagType;
  status: HrFlagStatus;
  userId: string;
  userName?: string;
  description?: string;
  note?: string;
  createdAt: string;
  updatedAt?: string;
}

// ─── Organisation ──────────────────────────────────────────────────────────────
export interface OrgUser {
  _id: string;
  firstName: string;
  lastName: string;
  role: Role;
  department?: string;
  email?: string;
  sectorId?: string | null;
  managerId?: string | null;
  dottedLineManagerIds?: string[];
  avatar?: string | null;
}

export interface OrgTreeNode extends OrgUser {
  children: OrgTreeNode[];
}

export interface OrgLegendEntry {
  label: string;
  color: string;
}
export interface OrgLegend {
  edges: {
    hierarchical: OrgLegendEntry;
    transverse: OrgLegendEntry;
  };
  roles: Record<"admin" | "hr" | "manager" | "employee", OrgLegendEntry>;
}

export interface OrgTeamGroup {
  manager: OrgUser;
  directReports: OrgUser[];
  // Managers rattachés à ce manager (sous-équipes) — renvoyés par l'API org/tree?view=teams
  subManagers?: OrgUser[];
}

export interface OrgSectorGroup {
  sector: (Sector & { color?: string }) | null;
  users: OrgUser[];
}

export interface Sector {
  id: string;
  _id?: string;
  name: string;
  color?: string;
  managerId?: string;
  manager?: User;
  userCount?: number;
}

// ─── Événements calendrier ─────────────────────────────────────────────────────
export type EventType =
  | "evaluation"
  | "meeting"
  | "deadline"
  | "offboarding"
  | "other"
  | "interview"
  | "feedback"
  | "campaign";

export interface CalendarEvent {
  id: string;
  /** L'API events renvoie `_id` (docs lean, pas de virtual `id`) — normalisé côté api/events.ts. */
  _id?: string;
  title: string;
  description?: string;
  type: EventType;
  date?: string;
  startDate?: string;
  endDate?: string;
  allDay?: boolean;
  participants?: string[];
  createdBy?: string;
  createdAt?: string;
  location?: string;
  campaignId?: string;
  targetRoles?: string[];
}

// ─── Ressources ────────────────────────────────────────────────────────────────
export type ResourceType =
  | "pdf"
  | "xlsx"
  | "doc"
  | "video"
  | "link"
  | "image"
  | "other";

export interface Resource {
  id: string;
  title: string;
  description?: string;
  content?: string;
  category?: string;
  tags?: string[];
  isPublished: boolean;
  attachments?: ResourceAttachment[];
  createdAt?: string;
  updatedAt?: string;
  // S8 extensions
  type?: ResourceType;
  fileSize?: number;
  fileUrl?: string;
  visibleTo?: string[];
  status?: "published" | "draft";
}

export interface ResourceAttachment {
  id: string;
  name: string;
  url: string;
  mimeType?: string;
  size?: number;
}

// ─── Analytics ─────────────────────────────────────────────────────────────────
export interface AnalyticsSummary {
  totalCampaigns: number;
  activeCampaigns: number;
  totalEvaluations: number;
  completionRate: number;
  averageScore?: number;
  byStatus: Record<EvaluationStatus, number>;
  byDepartment?: Record<string, number>;
  topPerformers?: Array<{
    userId: string;
    name: string;
    score: number;
    campaignName: string;
  }>;
  byDepartmentCompletion?: Array<{
    department: string;
    total: number;
    submitted: number;
    validated: number;
    rate: number;
  }>;
}

export interface MonthlyTrendPoint {
  month: string;
  total: number;
  completed: number;
}

// ─── Dashboard HR Stats ────────────────────────────────────────────────────────
export interface DashboardHrStats {
  users: { total: number; active: number; inactive: number };
  campaigns: {
    active: number;
    draft: number;
    completed: number;
    overdue: number;
  };
  evaluations: {
    total: number;
    completed: number;
    pending: number;
    signedBoth: number;
    signedBothRate: number;
    avgCompletionDays: number | null;
    completionRate: number;
  };
  mobility: { pending: number };
  recentCampaigns: Array<{
    _id: string;
    name: string;
    status: string;
    createdAt: string;
  }>;
}

// ─── Dashboard Manager Stats ───────────────────────────────────────────────────
export interface DashboardManagerStats {
  evaluations: {
    total: number;
    completed: number;
    pending: number;
    overdue: number;
    signedByManager: number;
  };
  campaigns: { total: number };
  completionRate: number;
  teamSize: number;
  pendingSignatures: Array<{
    _id: string;
    id: string;
    evaluateeId: { _id: string; firstName: string; lastName: string } | string;
    campaignId: { _id: string; name: string } | string;
    signedByEvaluateeAt: string;
  }>;
}

export interface CampaignAnalytics {
  campaignId: string;
  campaignName?: string;
  totalAssigned: number;
  submitted: number;
  validated: number;
  completionRate: number;
  averageScore?: number;
  scoreDistribution?: Record<string, number>;
  statusDistribution?: {
    assigned?: number;
    in_progress?: number;
    submitted?: number;
    reviewed?: number;
    validated?: number;
  };
  byDepartment?: Array<{
    department: string;
    total: number;
    completed: number;
  }>;
}

// ─── Pagination ────────────────────────────────────────────────────────────────
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages?: number;
}

export interface ItemResponse<T> {
  data: T;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  search?: string;
  sort?: string;
  order?: "asc" | "desc";
  formType?: string;
  q?: string;
  campaignId?: string;
}

// ─── Erreurs API ───────────────────────────────────────────────────────────────
export interface ApiError {
  error: string;
  message?: string;
  statusCode?: number;
}

// ─── Config Admin ──────────────────────────────────────────────────────────────
export interface AppConfig {
  appName?: string;
  primaryColor?: string;
  logoUrl?: string;
  emailFrom?: string;
  enableNotifications?: boolean;
  defaultLanguage?: string;
}

export interface LdapConfig {
  url: string;
  baseDN: string;
  userSearchBase?: string;
  bindDN?: string;
  tlsEnabled?: boolean;
}

// Source LDAP (multi-annuaires). Champs alignés sur le backend (host/attr*).
export interface LdapSource {
  id: string;
  label: string;
  enabled: boolean;
  host: string;
  baseDN: string;
  bindDN: string;
  bindPassword?: string;
  userFilter?: string;
  attrEmail?: string;
  attrFirstName?: string;
  attrLastName?: string;
  attrDepartment?: string;
  attrTitle?: string;
  attrManager?: string;
  defaultRole?: string;
  /** Motifs (glob) des comptes système/service à exclure et désactiver au sync. */
  excludePatterns?: string[];
}

export interface MailTemplate {
  id?: string;
  _id?: string;
  slug: string;
  name?: string;
  subject: string;
  bodyText: string;
  bodyHtml?: string;
  lastEditedBy?: string;
  updatedAt?: string;
}

export interface AuditLogEntry {
  id: string;
  action: string;
  actorId: string;
  actorEmail?: string;
  actorName?: string;
  targetType?: string;
  targetId?: string;
  targetLabel?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

// ─── Préférences utilisateur ───────────────────────────────────────────────────
export interface UserPreferences {
  locale?: "fr" | "en";
  theme?: "light" | "dark" | "system";
  notificationPrefs?: Record<string, boolean>;
}

// ─── Onboarding ────────────────────────────────────────────────────────────────
export interface OnboardingState {
  currentStep: number;
  completed: boolean;
}

// ─── Import/Export ─────────────────────────────────────────────────────────────
export interface ImportResult {
  success: number;
  errors: number;
  skipped?: number;
  details?: Array<{ row: number; error: string }>;
}

// ─── Groupes utilisateurs ──────────────────────────────────────────────────────
export interface UserGroup {
  _id: string;
  name: string;
  description?: string;
  members: Pick<User, "_id" | "firstName" | "lastName" | "email" | "role">[];
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Entretiens ───────────────────────────────────────────────────────────────

/**
 * Un entretien matérialise le duo Manager/Évalué au sein d'une campagne.
 * Le champ `evaluations` est la version peuplée de `evaluationIds` (renvoyée par
 * GET /api/interviews?campaignId=&evaluateeId=).
 */
export interface Interview {
  _id: string;
  id?: string;
  campaignId: string;
  evaluateeId: string | User;
  managerId?: string | User | null;
  /** Rendez-vous d'entretien programmé sur le calendrier (null = non programmé). */
  scheduledAt?: string | null;
  scheduledLocation?: string;
  /** Évaluations peuplées (formId, evaluatorId, evaluateeId renseignés).
   *  L'API renvoie le champ sous le nom `evaluationIds` (réf peuplée Mongoose). */
  evaluationIds: InterviewEvaluation[];
  // ── Travail d'entretien (qualitatif, pas de note) ───────────────────────────
  /** Échange par question : commentaires des 2 parties + réponse retenue commune. */
  discussion?: Array<{
    questionId: string;
    employeeComment?: string;
    managerComment?: string;
    agreedAnswer?: string;
  }>;
  /** Revue des objectifs de l'an dernier (atteint / partiel / non). */
  objectivesReview?: Array<{
    label: string;
    status?: "achieved" | "partial" | "not_achieved" | "";
    comment?: string;
  }>;
  /** Objectifs fixés pour l'année suivante. */
  nextYearObjectives?: Array<{ text: string }>;
  /** Synthèse finale de l'entretien. */
  synthesis?: { text: string };
  /** Signatures manuscrites (image data URL). */
  signatures?: Array<{
    role: "evaluatee" | "manager";
    dataUrl: string;
    signedAt: string;
  }>;
  /** Désaccord formel → litige. */
  disagreement?: {
    flagged: boolean;
    by?: string;
    reason?: string;
    at?: string;
  };
  status?: "draft" | "signed" | "disputed" | "done";
  /** Objectifs N+1 fixés à l'édition précédente (texte brut), pour la revue. */
  previousObjectives?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Version d'une Evaluation telle que peuplée dans un Interview.
 * formId → { title, questions }, evaluatorId → { firstName, lastName }, etc.
 */
export interface InterviewEvaluation {
  _id: string;
  id?: string;
  formId: {
    _id: string;
    title: string;
    questions: FormQuestion[];
  };
  evaluatorId: {
    _id: string;
    firstName: string;
    lastName: string;
  };
  evaluateeId: {
    _id: string;
    firstName: string;
    lastName: string;
  };
  status: EvaluationStatus;
  /** Réponses stockées en tableau {questionId, value} (forme Mongoose brute). */
  answers?: Array<{ questionId: string; value: unknown }>;
  reviewerScore?: number | null;
  reviewerComment?: string | null;
  nextYearObjectives?: string | null;
  objectiveRatings?: Record<string, string>;
  signatureStatus?:
    | "none"
    | "pending_evaluatee"
    | "pending_evaluator"
    | "complete";
  lastSavedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

// ─── Utilities ────────────────────────────────────────────────────────────────

/** Extracts the campaign name from a campaignId field that may be a string ID or a populated Campaign object. */
export function getCampaignName(campaignId: string | Campaign): string {
  return typeof campaignId === "string" ? campaignId : campaignId.name;
}
