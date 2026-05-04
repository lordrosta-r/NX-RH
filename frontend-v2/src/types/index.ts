// ─── Rôles & Auth ─────────────────────────────────────────────────────────────
export type Role = 'admin' | 'hr' | 'director' | 'manager' | 'employee'
export type AuthSource = 'local' | 'ldap'

export interface User {
  id: string
  _id?: string
  email: string
  firstName: string
  lastName: string
  role: Role
  sectorId?: string
  managerId?: string
  department?: string
  position?: string
  isActive: boolean
  authSource: AuthSource
  gdprAnonymized?: boolean
  createdAt?: string
  updatedAt?: string
}

export interface AuthPayload {
  id: string
  email: string
  role: Role
  firstName: string
  lastName: string
}

// ─── Campagnes ─────────────────────────────────────────────────────────────────
export type CampaignStatus = 'draft' | 'active' | 'closed' | 'archived'

export interface Campaign {
  id: string
  name: string
  description?: string
  status: CampaignStatus
  startDate: string
  endDate: string
  deadlineEmployee?: string
  deadlineManager?: string
  targetDepartments?: string[]
  extendedVisibility?: boolean
  enableN1Context?: boolean
  formId?: string
  objectivesFormId?: string
  createdBy?: string
  createdAt?: string
  updatedAt?: string
}

// ─── Évaluations ───────────────────────────────────────────────────────────────
export type EvaluationStatus =
  | 'assigned'
  | 'in_progress'
  | 'submitted'
  | 'reviewed'
  | 'signed_evaluatee'
  | 'signed_manager'
  | 'signed_hr'
  | 'validated'
  | 'expired'
  | 'archived'

export interface Evaluation {
  id: string
  campaignId: string
  evaluateeId: string
  evaluatorId: string
  formId: string
  status: EvaluationStatus
  answers?: Record<string, unknown>
  reviewerScore?: number
  nextYearObjectives?: string
  reviewerComment?: string
  evaluateeComment?: string
  disagreementFlag?: boolean
  signedByEvaluateeAt?: string
  signedByManagerAt?: string
  signedByHrAt?: string
  createdAt?: string
  updatedAt?: string
  // Relations peuplées
  evaluatee?: User
  evaluator?: User
  campaign?: Campaign
  form?: Form
}

// ─── Formulaires ───────────────────────────────────────────────────────────────
export type QuestionType = 'text' | 'textarea' | 'rating' | 'multiple_choice' | 'yes_no'
export type QuestionPhase = 'employee' | 'manager' | 'both'

export interface FormQuestion {
  id: string
  type: QuestionType
  text: string
  required: boolean
  phase?: QuestionPhase
  options?: string[]
  order?: number
}

export interface Form {
  id: string
  title: string
  description?: string
  formType: string
  questions: FormQuestion[]
  isFrozen: boolean
  frozenAt?: string
  createdAt?: string
  updatedAt?: string
}

// ─── Notifications ─────────────────────────────────────────────────────────────
export type NotificationPriority = 'low' | 'normal' | 'high'

export interface Notification {
  id: string
  type: string
  title: string
  body: string
  link?: string
  read: boolean
  priority?: NotificationPriority
  createdAt: string
}

// ─── Signaux RH (HrFlags) ──────────────────────────────────────────────────────
export type HrFlagStatus = 'open' | 'resolved' | 'dismissed'
export type HrFlagType = 'disagreement' | 'hr_review' | 'manual'

export interface HrFlag {
  id: string
  evaluationId: string
  type: HrFlagType
  status: HrFlagStatus
  note?: string
  evaluation?: Evaluation
  createdAt: string
  updatedAt?: string
}

// ─── Organisation ──────────────────────────────────────────────────────────────
export interface Sector {
  id: string
  name: string
  managerId?: string
  manager?: User
  userCount?: number
}

export interface OrgTreeNode {
  user: User
  sector?: Sector
  reports?: OrgTreeNode[]
}

// ─── Événements calendrier ─────────────────────────────────────────────────────
export type EventType = 'evaluation' | 'meeting' | 'deadline' | 'offboarding' | 'other'

export interface CalendarEvent {
  id: string
  title: string
  description?: string
  type: EventType
  startDate: string
  endDate?: string
  allDay?: boolean
  participants?: string[]
  createdBy?: string
  createdAt?: string
}

// ─── Ressources ────────────────────────────────────────────────────────────────
export interface Resource {
  id: string
  title: string
  description?: string
  content?: string
  category?: string
  tags?: string[]
  isPublished: boolean
  attachments?: ResourceAttachment[]
  createdAt?: string
  updatedAt?: string
}

export interface ResourceAttachment {
  id: string
  name: string
  url: string
  mimeType?: string
  size?: number
}

// ─── Analytics ─────────────────────────────────────────────────────────────────
export interface AnalyticsSummary {
  totalCampaigns: number
  activeCampaigns: number
  totalEvaluations: number
  completionRate: number
  averageScore?: number
  byStatus: Record<EvaluationStatus, number>
  byDepartment?: Record<string, number>
}

export interface CampaignAnalytics {
  campaignId: string
  totalAssigned: number
  submitted: number
  validated: number
  completionRate: number
  averageScore?: number
  scoreDistribution?: Record<string, number>
  byDepartment?: Array<{ department: string; total: number; completed: number }>
}

// ─── Pagination ────────────────────────────────────────────────────────────────
export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages?: number
}

export interface PaginationParams {
  page?: number
  limit?: number
  search?: string
  sort?: string
  order?: 'asc' | 'desc'
}

// ─── Erreurs API ───────────────────────────────────────────────────────────────
export interface ApiError {
  error: string
  message?: string
  statusCode?: number
}

// ─── Config Admin ──────────────────────────────────────────────────────────────
export interface AppConfig {
  appName?: string
  primaryColor?: string
  logoUrl?: string
  emailFrom?: string
  enableNotifications?: boolean
  defaultLanguage?: string
}

export interface LdapConfig {
  url: string
  baseDN: string
  userSearchBase?: string
  bindDN?: string
  tlsEnabled?: boolean
}

export interface MailTemplate {
  id: string
  name: string
  subject: string
  body: string
  variables?: string[]
}

export interface AuditLogEntry {
  id: string
  action: string
  actorId: string
  actorEmail?: string
  targetType?: string
  targetId?: string
  metadata?: Record<string, unknown>
  createdAt: string
}

// ─── Import/Export ─────────────────────────────────────────────────────────────
export interface ImportResult {
  success: number
  errors: number
  skipped?: number
  details?: Array<{ row: number; error: string }>
}
