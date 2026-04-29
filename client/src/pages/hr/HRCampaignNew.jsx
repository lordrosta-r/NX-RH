// =============================================================================
// HRCampaignNew.jsx — Wizard 5 étapes création de campagne, route /hr/campaigns/new
//
// Pas de sidebar ni topbar : pris en charge par AuthedLayout.
// Étapes :
//   1. Identité (nom, description, dates)
//   2. Ciblage (départements + presets)
//   3. Historique (import N-1, campagne source)
//   4. Calendrier & alertes (deadlines, notif 48h)
//   5. Revue & go-live (résumé + activation)
// =============================================================================

import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useNavigate }    from 'react-router-dom'
import { useAuth }        from '../../contexts/AuthContext'
import { useTranslate }   from '../../contexts/LocaleContext'
import { t as pageT }     from './i18n'
import { ChevronLeft, ChevronRight, Check, AlertTriangle } from 'lucide-react'
import { apiFetch } from '../../lib/apiFetch'
import { showToast } from '../../components/ui/Toast'

// ── Constants ─────────────────────────────────────────────────────────────────

const STEPS = ['step1', 'step2', 'step3', 'step4', 'step5']

// Doit correspondre EXACTEMENT à la liste backend (config/constants.js DEPARTMENTS)
const DEPARTMENTS = [
  'Engineering', 'Product', 'Design', 'Data', 'Security', 'Infrastructure',
  'Finance', 'Legal', 'HR', 'Sales', 'Marketing', 'Customer Success',
  'Operations', 'Executive',
]

// ── Step components ───────────────────────────────────────────────────────────

function Step1({ form, setForm, t }) {
  return (
    <div>
      <div className="cmp-field">
        <label className="cmp-label">{t('cmp.new.name')} *</label>
        <input
          className="cmp-input"
          type="text"
          value={form.name}
          placeholder={t('cmp.new.name.ph')}
          onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
        />
      </div>
      <div className="cmp-field">
        <label className="cmp-label">{t('cmp.new.desc')}</label>
        <textarea
          className="cmp-textarea"
          value={form.description}
          placeholder={t('cmp.new.desc.ph')}
          rows={3}
          onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
        />
      </div>
      <div className="cmp-field-row">
        <div className="cmp-field">
          <label className="cmp-label">{t('cmp.new.startDate')}</label>
          <input
            className="cmp-input"
            type="date"
            value={form.startDate}
            onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
          />
        </div>
        <div className="cmp-field">
          <label className="cmp-label">{t('cmp.new.endDate')}</label>
          <input
            className="cmp-input"
            type="date"
            value={form.endDate}
            onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))}
          />
        </div>
      </div>
    </div>
  )
}

function Step2({ form, setForm, t }) {
  function toggleDept(dept) {
    setForm(f => ({
      ...f,
      targetDepartments: f.targetDepartments.includes(dept)
        ? f.targetDepartments.filter(d => d !== dept)
        : [...f.targetDepartments, dept],
    }))
  }

  function applyPreset(preset) {
    if (preset === 'all')      setForm(f => ({ ...f, targetDepartments: [...DEPARTMENTS] }))
    if (preset === 'cdi')      setForm(f => ({ ...f, targetDepartments: ['Engineering', 'Product', 'Design', 'Data', 'Security'] }))
    if (preset === 'managers') setForm(f => ({ ...f, targetDepartments: ['Executive', 'Engineering', 'Product'] }))
  }

  const count = form.targetDepartments.length * 10

  return (
    <div>
      <div className="cmp-field">
        <label className="cmp-label">{t('cmp.new.depts')}</label>
        <div className="cmp-preset-btns">
          <button type="button" className="cmp-preset-btn" onClick={() => applyPreset('all')}>
            {t('cmp.new.preset.all')}
          </button>
          <button type="button" className="cmp-preset-btn" onClick={() => applyPreset('cdi')}>
            {t('cmp.new.preset.cdi')}
          </button>
          <button type="button" className="cmp-preset-btn" onClick={() => applyPreset('managers')}>
            {t('cmp.new.preset.managers')}
          </button>
        </div>
        <div className="cmp-dept-list">
          {DEPARTMENTS.map(dept => (
            <button
              key={dept}
              type="button"
              className={`cmp-dept-chip${form.targetDepartments.includes(dept) ? ' cmp-dept-chip--selected' : ''}`}
              onClick={() => toggleDept(dept)}
            >
              {dept}
            </button>
          ))}
        </div>
        {count > 0 && (
          <p className="cmp-targeted-count">~{count} {t('cmp.new.targeted')}</p>
        )}
      </div>
    </div>
  )
}

function Step3({ form, setForm, campaigns, t }) {
  return (
    <div>
      <div className="cmp-toggle-row">
        <span className="cmp-toggle-label">{t('cmp.new.import_n1')}</span>
        <label className="cmp-toggle">
          <input
            type="checkbox"
            checked={form.importN1}
            onChange={e => setForm(f => ({ ...f, importN1: e.target.checked }))}
          />
          <span className="cmp-toggle__track" />
          <span className="cmp-toggle__thumb" />
        </label>
      </div>

      {form.importN1 && (
        <div className="cmp-field" style={{ marginTop: '1rem' }}>
          <label className="cmp-label">{t('cmp.new.source_campaign')}</label>
          <select
            className="cmp-select"
            value={form.sourceCampaignId}
            onChange={e => setForm(f => ({ ...f, sourceCampaignId: e.target.value }))}
          >
            <option value="">—</option>
            {(campaigns ?? []).map(c => (
              <option key={c._id} value={c._id}>{c.name}</option>
            ))}
          </select>
        </div>
      )}
    </div>
  )
}

function Step4({ form, setForm, t }) {
  return (
    <div>
      <div className="cmp-field-row">
        <div className="cmp-field">
          <label className="cmp-label">{t('cmp.new.deadline_emp')}</label>
          <input
            className="cmp-input"
            type="date"
            value={form.deadlineEmployee}
            onChange={e => setForm(f => ({ ...f, deadlineEmployee: e.target.value }))}
          />
        </div>
        <div className="cmp-field">
          <label className="cmp-label">{t('cmp.new.deadline_mgr')}</label>
          <input
            className="cmp-input"
            type="date"
            value={form.deadlineManager}
            onChange={e => setForm(f => ({ ...f, deadlineManager: e.target.value }))}
          />
        </div>
      </div>
      <div className="cmp-toggle-row">
        <span className="cmp-toggle-label">{t('cmp.new.notify_48h')}</span>
        <label className="cmp-toggle">
          <input
            type="checkbox"
            checked={form.notify48h}
            onChange={e => setForm(f => ({ ...f, notify48h: e.target.checked }))}
          />
          <span className="cmp-toggle__track" />
          <span className="cmp-toggle__thumb" />
        </label>
      </div>
    </div>
  )
}

function Step5({ form, t }) {
  return (
    <div>
      <h3 style={{ fontSize: '0.875rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--color-on-surface)' }}>
        {t('cmp.new.summary')}
      </h3>
      <div className="cmp-summary">
        <div className="cmp-summary__row">
          <span className="cmp-summary__key">{t('cmp.new.name')}</span>
          <span className="cmp-summary__val">{form.name || '—'}</span>
        </div>
        <div className="cmp-summary__row">
          <span className="cmp-summary__key">{t('cmp.new.desc')}</span>
          <span className="cmp-summary__val">{form.description || '—'}</span>
        </div>
        <div className="cmp-summary__row">
          <span className="cmp-summary__key">{t('cmp.new.startDate')}</span>
          <span className="cmp-summary__val">{form.startDate || '—'}</span>
        </div>
        <div className="cmp-summary__row">
          <span className="cmp-summary__key">{t('cmp.new.endDate')}</span>
          <span className="cmp-summary__val">{form.endDate || '—'}</span>
        </div>
        <div className="cmp-summary__row">
          <span className="cmp-summary__key">{t('cmp.new.depts')}</span>
          <span className="cmp-summary__val">
            {form.targetDepartments.length > 0
              ? form.targetDepartments.join(', ')
              : '—'}
          </span>
        </div>
        <div className="cmp-summary__row">
          <span className="cmp-summary__key">{t('cmp.new.deadline_emp')}</span>
          <span className="cmp-summary__val">{form.deadlineEmployee || '—'}</span>
        </div>
        <div className="cmp-summary__row">
          <span className="cmp-summary__key">{t('cmp.new.deadline_mgr')}</span>
          <span className="cmp-summary__val">{form.deadlineManager || '—'}</span>
        </div>
      </div>

      <div className="cmp-warning-block" style={{ marginTop: '1.5rem' }}>
        <AlertTriangle size={16} />
        La campagne sera créée et immédiatement activée. Cette action est irréversible.
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

const INIT = {
  name: '', description: '', startDate: '', endDate: '',
  targetDepartments: [],
  importN1: false, sourceCampaignId: '',
  deadlineEmployee: '', deadlineManager: '', notify48h: true,
}

export default function HRCampaignNew() {
  const { user }    = useAuth()
  const t           = useTranslate(pageT)
  const navigate    = useNavigate()
  const [step, setStep]     = useState(0)
  const [form, setForm]     = useState(INIT)

  const { data: campaigns } = useQuery({
    queryKey: ['hr-campaigns-list'],
    queryFn:  () =>
      apiFetch('/api/campaigns').then(d => Array.isArray(d) ? d : (d.data || [])),
    enabled: !!user,
    staleTime: 60 * 1000,
  })

  const createMutation = useMutation({
    mutationFn: (payload) =>
      apiFetch('/api/campaigns', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      }),
    onSuccess: () => {
      showToast({ message: 'Campagne créée avec succès', type: 'success' })
      navigate('/hr/campaigns')
    },
    onError: (err) => showToast({ message: err.message, type: 'error' }),
  })

  function handleActivate() {
    createMutation.mutate({
      name:              form.name,
      description:       form.description,
      startDate:         form.startDate,
      endDate:           form.endDate,
      targetDepartments: form.targetDepartments,
      deadlineEmployee:  form.deadlineEmployee  || null,
      deadlineManager:   form.deadlineManager   || null,
      status:            'active',
    })
  }

  const isLastStep  = step === STEPS.length - 1
  const isFirstStep = step === 0

  return (
    <div className="cmp-new">

      {/* ── Hero ──────────────────────────────────────────── */}
      <header className="cmp-hero">
        <p className="cmp-hero__eyebrow">{t('cmp.hero.eyebrow')}</p>
        <h1 className="cmp-hero__headline">{t('cmp.new.title')}</h1>
      </header>

      {/* ── Stepper ───────────────────────────────────────── */}
      <div className="cmp-stepper" role="list" aria-label="Étapes">
        {STEPS.map((s, i) => (
          <div key={s} className="cmp-step" role="listitem">
            <div
              className={`cmp-step__dot${i === step ? ' cmp-step--active' : ''}${i < step ? ' cmp-step--done' : ''}`
                .replace('cmp-step__dot cmp-step--', 'cmp-step__dot') /* simplify */}
            >
              <span
                className={`cmp-step__dot${i === step ? ' cmp-step--active' : i < step ? ' cmp-step--done' : ''}`}
              >
                {i < step ? <Check size={12} /> : i + 1}
              </span>
            </div>
            <span
              className={`cmp-step__label${i === step ? ' cmp-step--active' : ''}`}
            >
              {t(`cmp.new.${s}`)}
            </span>
            {i < STEPS.length - 1 && <div className="cmp-step__line" />}
          </div>
        ))}
      </div>

      {/* ── Step content ──────────────────────────────────── */}
      <div className="cmp-new__card">
        <h2 className="cmp-new__card-title">{t(`cmp.new.${STEPS[step]}`)}</h2>

        {step === 0 && <Step1 form={form} setForm={setForm} t={t} />}
        {step === 1 && <Step2 form={form} setForm={setForm} t={t} />}
        {step === 2 && <Step3 form={form} setForm={setForm} campaigns={campaigns} t={t} />}
        {step === 3 && <Step4 form={form} setForm={setForm} t={t} />}
        {step === 4 && <Step5 form={form} t={t} />}
      </div>

      {/* ── Navigation ────────────────────────────────────── */}
      <div className="cmp-new__nav">
        <div className="cmp-new__nav-left">
          <button
            type="button"
            className="cmp-nav-btn cmp-nav-btn--cancel"
            onClick={() => navigate('/hr/campaigns')}
          >
            {t('cmp.new.cancel')}
          </button>
        </div>
        <div className="cmp-new__nav-right">
          {!isFirstStep && (
            <button
              type="button"
              className="cmp-nav-btn"
              onClick={() => setStep(s => s - 1)}
            >
              <ChevronLeft size={15} /> {t('cmp.new.prev')}
            </button>
          )}
          {isLastStep ? (
            <button
              type="button"
              className="cmp-nav-btn cmp-nav-btn--primary"
              onClick={handleActivate}
              disabled={!form.name || createMutation.isPending}
            >
              <Check size={15} /> {t('cmp.new.activate')}
            </button>
          ) : (
            <button
              type="button"
              className="cmp-nav-btn cmp-nav-btn--primary"
              onClick={() => setStep(s => s + 1)}
              disabled={step === 0 && !form.name}
            >
              {t('cmp.new.next')} <ChevronRight size={15} />
            </button>
          )}
        </div>
      </div>

    </div>
  )
}
