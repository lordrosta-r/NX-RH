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
  deactivatedAt?: string
  offboardingStatus?: string
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
  _id?: string
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
  n1VisibleToEmployee?: boolean
  previousCampaignId?: string
  targetScope?: 'all' | 'department' | 'sector' | 'users'
  targetSectorIds?: string[]
  targetUserIds?: string[]
  formIds?: string[]
  completionPct?: number
  stats?: {
    total: number
    started: number
    submitted: number
    validated: number
  }
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
  deadline?: string
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
export type QuestionType = 'text' | 'textarea' | 'rating' | 'choice' | 'yes_no' | 'weather' | 'mobility' | 'n1_import' | 'scale' | 'objective_item'
export type QuestionPhase = 'self' | 'n-1' | 'objectives' | 'aspirations' | 'all'

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
export type HrFlagStatus = 'pending' | 'in_progress' | 'treated' | 'rejected'
export type HrFlagType = 'mobility_request' | 'salary_raise_request' | 'promotion_request' | 'training_request' | 'other'

export interface HrFlag {
  id: string
  type: HrFlagType
  status: HrFlagStatus
  userId: string
  userName?: string
  description?: string
  note?: string
  createdAt: string
  updatedAt?: string
}

// ─── Organisation ──────────────────────────────────────────────────────────────
export interface OrgUser {
  _id: string
  firstName: string
  lastName: string
  role: Role
  department?: string
  email?: string
  sectorId?: string | null
  managerId?: string | null
  avatar?: string | null
}

export interface OrgTreeNode extends OrgUser {
  children: OrgTreeNode[]
}

export interface OrgTeamGroup {
  manager: OrgUser
  directReports: OrgUser[]
  subManagers?: OrgTeamGroup[]
}

export interface OrgSectorGroup {
  sector: (Sector & { color?: string }) | null
  users: OrgUser[]
}

export interface Sector {
  id: string
  _id?: string
  name: string
  color?: string
  managerId?: string
  manager?: User
  userCount?: number
}

export interface OrgTreeNode_LEGACY {
  user: User
  sector?: Sector
  reports?: OrgTreeNode_LEGACY[]
}

// ─── Événements calendrier ─────────────────────────────────────────────────────
export type EventType =
  | 'evaluation'
  | 'meeting'
  | 'deadline'
  | 'offboarding'
  | 'other'
  | 'interview'
  | 'feedback'
  | 'campaign'

export interface CalendarEvent {
  id: string
  title: string
  description?: string
  type: EventType
  date?: string
  startDate?: string
  endDate?: string
  allDay?: boolean
  participants?: string[]
  createdBy?: string
  createdAt?: string
  location?: string
  campaignId?: string
  targetRoles?: string[]
}

// ─── Ressources ────────────────────────────────────────────────────────────────
export type ResourceType = 'pdf' | 'xlsx' | 'doc' | 'video' | 'link' | 'image' | 'other'

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
  // S8 extensions
  type?: ResourceType
  fileSize?: number
  fileUrl?: string
  visibleTo?: string[]
  status?: 'published' | 'draft'
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
  topPerformers?: Array<{ userId: string; name: string; score: number; campaignName: string }>
  byDepartmentCompletion?: Array<{ department: string; total: number; submitted: number; validated: number; rate: number }>
}

export interface CampaignAnalytics {
  campaignId: string
  campaignName?: string
  totalAssigned: number
  submitted: number
  validated: number
  completionRate: number
  averageScore?: number
  scoreDistribution?: Record<string, number>
  statusDistribution?: {
    assigned?: number
    in_progress?: number
    submitted?: number
    reviewed?: number
    validated?: number
  }
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
  formType?: string
  q?: string
  campaignId?: string
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
  id?: string
  _id?: string
  slug: string
  name?: string
  subject: string
  bodyText: string
  bodyHtml?: string
  lastEditedBy?: string
  updatedAt?: string
}

export interface AuditLogEntry {
  id: string
  action: string
  actorId: string
  actorEmail?: string
  actorName?: string
  targetType?: string
  targetId?: string
  targetLabel?: string
  metadata?: Record<string, unknown>
  createdAt: string
}

// ─── Préférences utilisateur ───────────────────────────────────────────────────
export interface UserPreferences {
  locale?: 'fr' | 'en'
  theme?: 'light' | 'dark' | 'system'
  notificationPrefs?: Record<string, boolean>
}

// ─── Onboarding ────────────────────────────────────────────────────────────────
export interface OnboardingState {
  currentStep: number
  completed: boolean
}

// ─── Import/Export ─────────────────────────────────────────────────────────────
export interface ImportResult {
  success: number
  errors: number
  skipped?: number
  details?: Array<{ row: number; error: string }>
}
