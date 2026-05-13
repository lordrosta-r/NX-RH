import { useState, useEffect } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { campaignsApi } from '../api/campaigns'
import { orgApi } from '../api/org'
import type { Campaign, CampaignStatus } from '../types'

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
          className="px-3 py-2 text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
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
  targetDepartments: string[]
  extendedVisibility: boolean
  enableN1Context: boolean
  n1VisibleToEmployee: boolean
  previousCampaignId: string
  targetScope: 'all' | 'department' | 'sector' | 'users'
  targetSectorIds: string[]
  targetUserIds: string[]
}

const initialForm: FormState = {
  name: '',
  description: '',
  startDate: '',
  endDate: '',
  deadlineEmployee: '',
  deadlineManager: '',
  targetDepartments: [],
  extendedVisibility: false,
  enableN1Context: false,
  n1VisibleToEmployee: false,
  previousCampaignId: '',
  targetScope: 'all',
  targetSectorIds: [],
  targetUserIds: [],
}

function buildPayload(form: FormState, status?: CampaignStatus): Partial<Campaign> {
  return {
    name: form.name.trim(),
    description: form.description || undefined,
    ...(status ? { status } : {}),
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
  }
}

export default function CampaignEditPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [form, setForm] = useState<FormState>(initialForm)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm(f => ({ ...f, [key]: value }))

  const { data: campaign, isLoading: campaignLoading } = useQuery({
    queryKey: ['campaign', id],
    queryFn: () => campaignsApi.getCampaign(id!).then(r => r.data),
    enabled: !!id,
  })

  useEffect(() => {
    if (campaign) {
      setForm({
        name: campaign.name,
        description: campaign.description ?? '',
        startDate: campaign.startDate,
        endDate: campaign.endDate,
        deadlineEmployee: campaign.deadlineEmployee ?? '',
        deadlineManager: campaign.deadlineManager ?? '',
        targetDepartments: campaign.targetDepartments ?? [],
        extendedVisibility: campaign.extendedVisibility ?? false,
        enableN1Context: campaign.enableN1Context ?? false,
        n1VisibleToEmployee: campaign.n1VisibleToEmployee ?? false,
        previousCampaignId: campaign.previousCampaignId ?? '',
        targetScope: campaign.targetScope ?? 'all',
        targetSectorIds: campaign.targetSectorIds ?? [],
        targetUserIds: campaign.targetUserIds ?? [],
      })
    }
  }, [campaign])

  function validate() {
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

  const updateMutation = useMutation({
    mutationFn: (data: Partial<Campaign>) =>
      campaignsApi.updateCampaign(id!, data).then(r => r.data),
    onSuccess: (updated: Campaign) => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] })
      queryClient.invalidateQueries({ queryKey: ['campaign', id] })
      navigate(`/campaigns/${updated.id}`)
    },
  })

  function handleSave() {
    if (!validate()) return
    updateMutation.mutate(buildPayload(form))
  }

  if (campaignLoading) {
    return (
      <div className="flex items-center justify-center h-48 text-slate-400 text-sm">
        Chargement…
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <nav className="text-sm text-slate-500 mb-1">
            <Link to="/" className="hover:text-slate-700">Accueil</Link>
            <span className="mx-1.5">›</span>
            <Link to="/campaigns" className="hover:text-slate-700">Campagnes</Link>
            <span className="mx-1.5">›</span>
            <Link to={`/campaigns/${id}`} className="hover:text-slate-700">{campaign?.name ?? '…'}</Link>
            <span className="mx-1.5">›</span>
            <span>Modifier</span>
          </nav>
          <h1 className="text-2xl font-bold text-slate-900">
            Modifier — {campaign?.name ?? '…'}
          </h1>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
          <Link
            to={`/campaigns/${id}`}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Annuler
          </Link>
          <button
            onClick={handleSave}
            disabled={updateMutation.isPending}
            className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
          >
            Enregistrer
          </button>
        </div>
      </div>

      {/* Card 1 — Identité */}
      <Card title="Identité de la campagne">
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
      </Card>

      {/* Card 2 — Calendrier */}
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

      {/* Card 3 — Ciblage */}
      <Card title="Ciblage">
        <Field label="Départements cibles">
          <ChipInput
            values={form.targetDepartments}
            onChange={v => set('targetDepartments', v)}
            placeholder="Ajouter un département…"
          />
        </Field>
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

      {/* Card 4 — Contexte N-1 */}
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

      {/* Card 5 — Périmètre */}
      <Card title="Périmètre de la campagne">
        <div className="space-y-3">
          {(
            [
              { value: 'all', label: 'Tous les collaborateurs actifs' },
              { value: 'department', label: 'Par département' },
              { value: 'sector', label: 'Par secteur' },
              { value: 'users', label: 'Sélection manuelle' },
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
      </Card>

      {/* Card 6 — Formulaires */}
      <Card title="Formulaires">
        <p className="text-sm text-slate-500">
          Les formulaires se gèrent depuis la page de la campagne, dans l'onglet{' '}
          <span className="font-medium text-slate-700">Formulaires</span>.
          Accédez à la page de détail pour ajouter ou retirer des formulaires.
        </p>
      </Card>

      {/* Sticky bottom bar (mobile) */}
      <div className="md:hidden sticky bottom-0 bg-white border-t border-slate-100 p-4 flex gap-2">
        <Link
          to={`/campaigns/${id}`}
          className="flex-1 text-center px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg"
        >
          Annuler
        </Link>
        <button
          onClick={handleSave}
          disabled={updateMutation.isPending}
          className="flex-1 px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg disabled:opacity-50"
        >
          Enregistrer
        </button>
      </div>
    </div>
  )
}
