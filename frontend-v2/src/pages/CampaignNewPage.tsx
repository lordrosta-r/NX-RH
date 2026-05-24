import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { campaignsApi } from '../api/campaigns'
import { orgApi } from '../api/org'
import { groupsApi } from '../api/groups'
import type { Campaign, CampaignStatus, UserGroup } from '../types'
import Button from '../components/ui/Button'
import Stepper from '../components/shared/Stepper'

// ─── Shared sub-components ────────────────────────────────────────────────────

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100">
      <div className="px-6 py-4 border-b border-slate-100">
        <h2 className="text-sm font-semibold text-slate-800 uppercase tracking-wide">{title}</h2>
      </div>
      <div className="p-6 space-y-4">{children}</div>
    </div>
  )
}

function Field({
  label,
  required,
  error,
  children,
}: {
  label: string
  required?: boolean
  error?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  )
}

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
}) {
  return (
    <label className="flex items-center gap-3 cursor-pointer">
      <div
        className={`relative w-11 h-6 rounded-full transition-colors ${checked ? 'bg-primary-500' : 'bg-slate-200'}`}
        onClick={() => onChange(!checked)}
      >
        <div
          className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'}`}
        />
      </div>
      <span className="text-sm font-medium text-slate-700">{label}</span>
    </label>
  )
}

function ChipInput({
  values,
  onChange,
  placeholder,
}: {
  values: string[]
  onChange: (values: string[]) => void
  placeholder?: string
}) {
  const [input, setInput] = useState('')

  function add() {
    const v = input.trim()
    if (v && !values.includes(v)) onChange([...values, v])
    setInput('')
  }

  return (
    <div>
      <div className="flex gap-2 mb-2">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add() } }}
          placeholder={placeholder}
          className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
        />
        <button
          type="button"
          onClick={add}
          className="px-3 py-2 text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md transition-colors"
        >
          Ajouter
        </button>
      </div>
      {values.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {values.map(v => (
            <span
              key={v}
              className="inline-flex items-center gap-1 px-2 py-1 bg-primary-50 text-primary-700 text-xs rounded-full"
            >
              {v}
              <button
                type="button"
                onClick={() => onChange(values.filter(x => x !== v))}
                className="ml-0.5 hover:text-primary-900 font-bold"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

const inputCls =
  'w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500'

// ─── Page ─────────────────────────────────────────────────────────────────────

type FormState = {
  name: string
  description: string
  startDate: string
  endDate: string
  deadlineEmployee: string
  deadlineManager: string
  status: CampaignStatus
  targetDepartments: string[]
  extendedVisibility: boolean
  enableN1Context: boolean
  n1VisibleToEmployee: boolean
  previousCampaignId: string
  targetScope: 'all' | 'department' | 'sector' | 'users' | 'group'
  targetSectorIds: string[]
  targetUserIds: string[]
  targetGroupId: string
}

const initialForm: FormState = {
  name: '',
  description: '',
  startDate: '',
  endDate: '',
  deadlineEmployee: '',
  deadlineManager: '',
  status: 'draft',
  targetDepartments: [],
  extendedVisibility: false,
  enableN1Context: false,
  n1VisibleToEmployee: false,
  previousCampaignId: '',
  targetScope: 'all',
  targetSectorIds: [],
  targetUserIds: [],
  targetGroupId: '',
}

function buildPayload(form: FormState): Partial<Campaign> {
  return {
    name: form.name.trim(),
    description: form.description || undefined,
    status: form.status,
    startDate: form.startDate,
    endDate: form.endDate,
    deadlineEmployee: form.deadlineEmployee || undefined,
    deadlineManager: form.deadlineManager || undefined,
    targetDepartments: form.targetDepartments.length > 0 ? form.targetDepartments : undefined,
    extendedVisibility: form.extendedVisibility,
    enableN1Context: form.enableN1Context,
    n1VisibleToEmployee: form.enableN1Context ? form.n1VisibleToEmployee : undefined,
    previousCampaignId: form.enableN1Context && form.previousCampaignId ? form.previousCampaignId : undefined,
    targetScope: form.targetScope,
    targetSectorIds: form.targetScope === 'sector' ? form.targetSectorIds : undefined,
    targetUserIds: form.targetScope === 'users' ? form.targetUserIds : undefined,
    targetGroupIds: form.targetScope === 'group' && form.targetGroupId ? [form.targetGroupId] : undefined,
  }
}

const WIZARD_STEPS = [
  { label: 'Informations', description: 'Identité & dates' },
  { label: 'Formulaires', description: 'Association' },
  { label: 'Public cible', description: 'Périmètre' },
  { label: 'Récapitulatif', description: 'Validation' },
]

export default function CampaignNewPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [form, setForm] = useState<FormState>(initialForm)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [currentStep, setCurrentStep] = useState(0)

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm(f => ({ ...f, [key]: value }))

  function validateStep1() {
    const e: Record<string, string> = {}
    if (!form.name.trim()) e.name = 'Le nom est requis'
    if (!form.startDate) e.startDate = 'La date de début est requise'
    if (!form.endDate) e.endDate = 'La date de fin est requise'
    if (form.startDate && form.endDate && form.endDate <= form.startDate)
      e.endDate = 'La date de fin doit être après la date de début'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const { data: prevCampaigns } = useQuery({
    queryKey: ['campaigns-prev'],
    queryFn: () =>
      Promise.all([
        campaignsApi.getCampaigns({ status: 'closed', limit: 100 }).then(r => r.data.data),
        campaignsApi.getCampaigns({ status: 'archived', limit: 100 }).then(r => r.data.data),
      ]).then(([c, a]) => [...c, ...a]),
    enabled: form.enableN1Context,
  })

  const { data: sectorsData } = useQuery({
    queryKey: ['org-sectors'],
    queryFn: () => orgApi.getSectors().then(r => r.data),
    enabled: form.targetScope === 'sector',
  })

  const { data: groupsData } = useQuery({
    queryKey: ['admin-groups'],
    queryFn: () => groupsApi.list().then(r => r.data as UserGroup[]),
    enabled: form.targetScope === 'group',
  })

  const createMutation = useMutation({
    mutationFn: (data: Partial<Campaign>) =>
      campaignsApi.createCampaign(data).then(r => r.data),
    onSuccess: (campaign: Campaign) => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] })
      navigate(`/campaigns/${campaign.id}`)
    },
  })

  function handleNext() {
    if (currentStep === 0 && !validateStep1()) return
    setCurrentStep(s => s + 1)
  }

  function handlePrev() {
    setCurrentStep(s => s - 1)
  }

  function handleSubmit() {
    createMutation.mutate(buildPayload(form))
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <nav className="text-sm text-slate-500 mb-1">
          <Link to="/" className="hover:text-slate-700">Accueil</Link>
          <span className="mx-1.5">›</span>
          <Link to="/campaigns" className="hover:text-slate-700">Campagnes</Link>
          <span className="mx-1.5">›</span>
          <span>Nouvelle campagne</span>
        </nav>
        <h1 className="text-2xl font-bold text-slate-900">Nouvelle campagne</h1>
      </div>

      <Stepper steps={WIZARD_STEPS} currentStep={currentStep} />

      {/* Step 1 — Informations générales */}
      {currentStep === 0 && (
        <div className="space-y-6">
          <Card title="Informations générales">
            <Field label="Nom" required error={errors.name}>
              <input
                type="text"
                value={form.name}
                onChange={e => set('name', e.target.value)}
                placeholder="Ex: Entretiens annuels 2025"
                className={inputCls}
              />
            </Field>
            <Field label="Description">
              <textarea
                value={form.description}
                onChange={e => set('description', e.target.value)}
                rows={3}
                placeholder="Description de la campagne (optionnel)"
                className={inputCls}
              />
            </Field>
            <Field label="Statut initial">
              <div className="flex gap-4">
                {(['draft', 'active'] as CampaignStatus[]).map(s => (
                  <label key={s} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="status"
                      value={s}
                      checked={form.status === s}
                      onChange={() => set('status', s)}
                      className="w-4 h-4 border-slate-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm text-slate-700">
                      {s === 'draft' ? 'Brouillon' : 'Activer immédiatement'}
                    </span>
                  </label>
                ))}
              </div>
            </Field>
          </Card>

          <Card title="Calendrier">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Date de début" required error={errors.startDate}>
                <input
                  type="date"
                  value={form.startDate}
                  onChange={e => set('startDate', e.target.value)}
                  className={inputCls}
                />
              </Field>
              <Field label="Date de fin" required error={errors.endDate}>
                <input
                  type="date"
                  value={form.endDate}
                  onChange={e => set('endDate', e.target.value)}
                  className={inputCls}
                />
              </Field>
              <Field label="Deadline employé">
                <input
                  type="date"
                  value={form.deadlineEmployee}
                  onChange={e => set('deadlineEmployee', e.target.value)}
                  className={inputCls}
                />
              </Field>
              <Field label="Deadline manager">
                <input
                  type="date"
                  value={form.deadlineManager}
                  onChange={e => set('deadlineManager', e.target.value)}
                  className={inputCls}
                />
              </Field>
            </div>
          </Card>

          <Card title="Contexte N-1">
            <Toggle
              checked={form.enableN1Context}
              onChange={v => set('enableN1Context', v)}
              label="Activer le contexte N-1"
            />
            {form.enableN1Context && (
              <div className="mt-2 space-y-4 pl-4 border-l-2 border-primary-100">
                <Toggle
                  checked={form.n1VisibleToEmployee}
                  onChange={v => set('n1VisibleToEmployee', v)}
                  label="Visible par l'employé"
                />
                <Field label="Campagne source (optionnel)">
                  <select
                    value={form.previousCampaignId}
                    onChange={e => set('previousCampaignId', e.target.value)}
                    className={inputCls}
                  >
                    <option value="">Auto-sélection (campagne précédente la plus récente)</option>
                    {prevCampaigns?.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </Field>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Step 2 — Formulaires */}
      {currentStep === 1 && (
        <Card title="Formulaires">
          <p className="text-sm text-slate-500">
            Les formulaires se gèrent depuis la page de la campagne, une fois celle-ci créée.
            Rendez-vous dans l'onglet <span className="font-medium text-slate-700">Formulaires</span> pour
            associer un ou plusieurs formulaires depuis la bibliothèque.
          </p>
        </Card>
      )}

      {/* Step 3 — Public cible */}
      {currentStep === 2 && (
        <div className="space-y-6">
          <Card title="Périmètre de la campagne">
            <div className="space-y-3">
              {(
                [
                  { value: 'all', label: 'Tous les collaborateurs actifs' },
                  { value: 'department', label: 'Par département' },
                  { value: 'sector', label: 'Par secteur' },
                  { value: 'users', label: 'Sélection manuelle' },
                  { value: 'group', label: 'Par groupe' },
                ] as const
              ).map(opt => (
                <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="targetScope"
                    value={opt.value}
                    checked={form.targetScope === opt.value}
                    onChange={() => set('targetScope', opt.value)}
                    className="w-4 h-4 border-slate-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm text-slate-700">{opt.label}</span>
                </label>
              ))}
            </div>

            {form.targetScope === 'department' && (
              <div className="mt-4 pl-6">
                <Field label="Départements sélectionnés">
                  <ChipInput
                    values={form.targetDepartments}
                    onChange={v => set('targetDepartments', v)}
                    placeholder="Ajouter un département…"
                  />
                </Field>
              </div>
            )}

            {form.targetScope === 'sector' && (
              <div className="mt-4 pl-6">
                <Field label="Secteurs">
                  {sectorsData && sectorsData.length > 0 ? (
                    <div className="space-y-2">
                      {sectorsData.map(sector => (
                        <label key={sector._id ?? sector.id} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={form.targetSectorIds.includes(sector._id ?? sector.id ?? '')}
                            onChange={e => {
                              const sid = sector._id ?? sector.id ?? ''
                              if (e.target.checked) {
                                set('targetSectorIds', [...form.targetSectorIds, sid])
                              } else {
                                set('targetSectorIds', form.targetSectorIds.filter(id => id !== sid))
                              }
                            }}
                            className="rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                          />
                          <span className="text-sm text-slate-700">{sector.name}</span>
                        </label>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic">Chargement des secteurs…</p>
                  )}
                </Field>
              </div>
            )}

            {form.targetScope === 'users' && (
              <div className="mt-4 pl-6">
                <Field label="Utilisateurs sélectionnés">
                  <ChipInput
                    values={form.targetUserIds}
                    onChange={v => set('targetUserIds', v)}
                    placeholder="Identifiant ou nom d'utilisateur…"
                  />
                </Field>
              </div>
            )}

            {form.targetScope === 'group' && (
              <div className="mt-4 pl-6">
                <Field label="Groupe cible">
                  <select
                    value={form.targetGroupId}
                    onChange={e => set('targetGroupId', e.target.value)}
                    className={inputCls}
                  >
                    <option value="">Sélectionner un groupe…</option>
                    {Array.isArray(groupsData) && groupsData.map((g: UserGroup) => (
                      <option key={g._id} value={g._id}>{g.name}</option>
                    ))}
                  </select>
                </Field>
              </div>
            )}
          </Card>

          <Card title="Visibilité">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.extendedVisibility}
                onChange={e => set('extendedVisibility', e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm text-slate-700">Visibilité étendue (managers voient N+2)</span>
            </label>
          </Card>
        </div>
      )}

      {/* Step 4 — Récapitulatif */}
      {currentStep === 3 && (
        <Card title="Récapitulatif">
          <dl className="space-y-3">
            <div className="flex justify-between text-sm">
              <dt className="text-slate-500 font-medium">Nom</dt>
              <dd className="text-slate-800 font-semibold">{form.name || <span className="text-slate-400 italic">—</span>}</dd>
            </div>
            {form.description && (
              <div className="flex justify-between text-sm">
                <dt className="text-slate-500 font-medium">Description</dt>
                <dd className="text-slate-800 max-w-xs text-right">{form.description}</dd>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <dt className="text-slate-500 font-medium">Statut initial</dt>
              <dd className="text-slate-800">{form.status === 'draft' ? 'Brouillon' : 'Actif'}</dd>
            </div>
            <div className="flex justify-between text-sm">
              <dt className="text-slate-500 font-medium">Début</dt>
              <dd className="text-slate-800">{form.startDate || <span className="text-slate-400 italic">—</span>}</dd>
            </div>
            <div className="flex justify-between text-sm">
              <dt className="text-slate-500 font-medium">Fin</dt>
              <dd className="text-slate-800">{form.endDate || <span className="text-slate-400 italic">—</span>}</dd>
            </div>
            {form.deadlineEmployee && (
              <div className="flex justify-between text-sm">
                <dt className="text-slate-500 font-medium">Deadline employé</dt>
                <dd className="text-slate-800">{form.deadlineEmployee}</dd>
              </div>
            )}
            {form.deadlineManager && (
              <div className="flex justify-between text-sm">
                <dt className="text-slate-500 font-medium">Deadline manager</dt>
                <dd className="text-slate-800">{form.deadlineManager}</dd>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <dt className="text-slate-500 font-medium">Périmètre</dt>
              <dd className="text-slate-800">
                {form.targetScope === 'all' && 'Tous les collaborateurs'}
                {form.targetScope === 'department' && `Départements (${form.targetDepartments.join(', ') || '—'})`}
                {form.targetScope === 'sector' && `Secteurs (${form.targetSectorIds.length} sélectionné(s))`}
                {form.targetScope === 'users' && `Sélection manuelle (${form.targetUserIds.length} utilisateur(s))`}
                {form.targetScope === 'group' && (() => {
                  const g = Array.isArray(groupsData) && groupsData.find((x: UserGroup) => x._id === form.targetGroupId)
                  return `Groupe : ${g ? g.name : form.targetGroupId || '—'}`
                })()}
              </dd>
            </div>
            {form.enableN1Context && (
              <div className="flex justify-between text-sm">
                <dt className="text-slate-500 font-medium">Contexte N-1</dt>
                <dd className="text-slate-800">Activé{form.n1VisibleToEmployee ? ', visible par l'employé' : ''}</dd>
              </div>
            )}
            {form.extendedVisibility && (
              <div className="flex justify-between text-sm">
                <dt className="text-slate-500 font-medium">Visibilité étendue</dt>
                <dd className="text-slate-800">Oui</dd>
              </div>
            )}
          </dl>
        </Card>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between pt-2">
        <div>
          {currentStep > 0 ? (
            <Button variant="secondary" onClick={handlePrev}>
              ← Précédent
            </Button>
          ) : (
            <Link
              to="/campaigns"
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Annuler
            </Link>
          )}
        </div>
        <div>
          {currentStep < WIZARD_STEPS.length - 1 ? (
            <Button variant="primary" onClick={handleNext}>
              Suivant →
            </Button>
          ) : (
            <Button
              variant="primary"
              onClick={handleSubmit}
              loading={createMutation.isPending}
              disabled={createMutation.isPending}
            >
              Créer la campagne
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
