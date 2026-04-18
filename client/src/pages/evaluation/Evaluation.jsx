// =============================================================================
// Evaluation — Employee portal
// View 'home'  : hero banner + active campaign + my forms list
// View 'form'  : form-filling UI matching Stitch reference design
// Layout : fixed sidebar 256px + db-style scrollable main
// =============================================================================
import React, { useState, useEffect } from 'react'
import './evaluation.css'
import EvaluationSidebar from './EvaluationSidebar'
import AppTopbar         from '../../components/ui/AppTopbar'
import { t as pageT }    from './i18n'
import { useLocale }     from '../../hooks/useLocale'
import { useTheme }      from '../../hooks/useTheme'
import { useAuthUser }   from '../../hooks/useAuthUser'
import {
  SparklesIcon, HeartIcon, GearIcon, ArrowNEIcon,
} from '../../components/ui/icons'

// ── Images ────────────────────────────────────────────────────────────────────
const HERO_IMG = 'https://images.unsplash.com/photo-1521737852567-6949f3f9f2b5?auto=format&fit=crop&w=1400&q=70'

// Returns a label for a scale button based on scale size
function getScaleLabel(n, max, t) {
  if (max === 5) return t(`ev.scale.${n}`) || String(n)
  // For other scales: label the extremes, rest is numeric
  if (n === 1)   return t('ev.scale.1')
  if (n === max) return t('ev.scale.5')
  return String(n)
}

// Statuts où les réponses ne peuvent plus être modifiées
const ANSWER_LOCKED_STATUSES = ['submitted', 'reviewed', 'signed_evaluatee', 'signed_manager', 'signed_hr', 'validated']
// Statuts où aucune action n'est possible (banner "soumis" uniquement)
const FULLY_LOCKED_STATUSES  = ['submitted', 'signed_evaluatee', 'signed_manager', 'signed_hr', 'validated']

const STATUS_META = {
  // MongoDB statuses (used in form view)
  assigned:         { labelKey: 'ev.status.assigned',         cls: 'todo'       },
  in_progress:      { labelKey: 'ev.status.inprogress',       cls: 'inprogress' },
  submitted:        { labelKey: 'ev.status.submitted',        cls: 'done'       },
  reviewed:         { labelKey: 'ev.status.reviewed',         cls: 'done'       },
  signed_evaluatee: { labelKey: 'ev.status.signed_evaluatee', cls: 'done'       },
  signed_manager:   { labelKey: 'ev.status.signed_manager',   cls: 'done'       },
  signed_hr:        { labelKey: 'ev.status.signed_hr',        cls: 'done'       },
  validated:        { labelKey: 'ev.status.validated',        cls: 'done'       },
}

// ─────────────────────────────────────────────────────────────────────────────

export default function Evaluation() {
  const { t, locale, setLocale } = useLocale(pageT)
  const { theme, cycleTheme }    = useTheme()
  const { user, loading: authLoading } = useAuthUser()

  const evaluationId = new URLSearchParams(window.location.search).get('id')

  const [view,        setView]       = useState('home')   // 'home' | 'form'
  const [evaluation,  setEvaluation] = useState(null)
  const [answers,     setAnswers]    = useState({})
  const [status,      setStatus]     = useState('assigned')
  const [saving,      setSaving]     = useState(false)
  const [submitting,  setSubmitting] = useState(false)
  const [evalLoading, setEvalLoading]= useState(false)
  const [error,       setError]      = useState(null)
  const [lastSaved,   setLastSaved]  = useState(null)   // "HH:mm" string or null

  // ── Load assigned evaluations for home view ────────────────────────────────
  const [myEvals,       setMyEvals]       = useState([])
  const [myEvalsLoading, setMyEvalsLoading] = useState(true)
  const [myEvalsError,  setMyEvalsError]  = useState(null)

  useEffect(() => {
    let cancelled = false
    fetch('/api/evaluations', { credentials: 'include' })
      .then(r => {
        if (r.status === 401 || r.status === 403) { window.location.href = '/'; return null }
        if (!r.ok) throw new Error(t('ev.error.load_failed') || 'load error')
        return r.json()
      })
      .then(data => { if (!cancelled && data) setMyEvals(data) })
      .catch(() => { if (!cancelled) setMyEvalsError(t('ev.home.error.load')) })
      .finally(() => { if (!cancelled) setMyEvalsLoading(false) })
    return () => { cancelled = true }
  }, [t])

  // ── Load evaluation from API on mount ───────────────────────────────────────
  useEffect(() => {
    if (!evaluationId) return
    let cancelled = false
    setEvalLoading(true)
    fetch(`/api/evaluations/${evaluationId}`, { credentials: 'include' })
      .then(r => {
        if (r.status === 401 || r.status === 403) { window.location.href = '/'; return null }
        if (!r.ok) throw new Error(t('ev.error.not_found'))
        return r.json()
      })
      .then(data => {
        if (cancelled || !data) return
        setEvaluation(data)
        setStatus(data.status)
        const initial = {}
        data.answers?.forEach(a => { initial[a.questionId] = a.value })
        setAnswers(initial)
      })
      .catch(err => { if (!cancelled) setError(err.message) })
      .finally(() => { if (!cancelled) setEvalLoading(false) })
    return () => { cancelled = true }
  }, [evaluationId, t])

  if (authLoading) return null
  if (!user)       return null

  function setAnswer(id, value) {
    setAnswers(prev => ({ ...prev, [id]: value }))
  }

  async function handleSave() {
    if (!evaluationId) return
    setSaving(true)
    try {
      const payload = {
        answers: Object.entries(answers).map(([questionId, value]) => ({ questionId, value }))
      }
      const r = await fetch(`/api/evaluations/${evaluationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      })
      if (!r.ok) throw new Error(t('ev.error.save_failed'))
      setLastSaved(new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }))
      if (status === 'assigned') setStatus('in_progress')
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  function handleDiscard() {
    setAnswers({})
    setLastSaved(null)
  }

  async function handleSubmit() {
    if (!evaluationId || submitting) return
    setSubmitting(true)
    await handleSave()
    try {
      const r = await fetch(`/api/evaluations/${evaluationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: 'submitted' }),
      })
      if (!r.ok) throw new Error(t('ev.error.submit_failed'))
      setStatus('submitted')
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleSign() {
    if (!evaluationId || submitting) return
    setSubmitting(true)
    try {
      const r = await fetch(`/api/evaluations/${evaluationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: 'signed_evaluatee' }),
      })
      if (!r.ok) throw new Error(t('ev.error.submit_failed'))
      setStatus('signed_evaluatee')
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  // ── Progress ───────────────────────────────────────────────────────────────
  const allQ     = evaluation?.formId?.questions || []
  const answered = allQ.filter(q => answers[q.id] !== undefined && answers[q.id] !== '').length
  const pct      = allQ.length > 0 ? Math.round((answered / allQ.length) * 100) : 0

  const statusLabel = STATUS_META[status] ? t(STATUS_META[status].labelKey) : status

  const isAnonymous = evaluation?.formId?.isAnonymous || false
  const isReadOnly  = ANSWER_LOCKED_STATUSES.includes(status)

  // ── Render ─────────────────────────────────────────────────────────────────

  async function handleLogout() {
    try { await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }) } catch { /* ignore */ }
    sessionStorage.clear()
    window.location.href = '/'
  }

  return (
    <div className="ev">
      <EvaluationSidebar t={t} />

      <div className="ev-main" role="main" id="main-content">

        <AppTopbar
          searchPlaceholder={t('ev.topbar.search')}
          locale={locale} setLocale={setLocale}
          theme={theme} cycleTheme={cycleTheme}
          user={user} onLogout={handleLogout}
        />

        {/* ── HOME VIEW ──────────────────────────────────────────────────── */}
        {view === 'home' && (
          <div className="ev-content">

            {/* Hero banner */}
            <section className="ev-banner">
              <div className="ev-banner__content">
                <p className="ev-banner__tagline">{t('ev.home.hero.tagline')}</p>
                <h1 className="ev-banner__headline">
                  {t('ev.home.hero.headline1')}{' '}
                  <span className="ev-banner__accent">{t('ev.home.hero.headline2')}</span>
                </h1>
                <p className="ev-banner__desc">{t('ev.home.hero.desc')}</p>
                <button type="button" className="ev-banner__cta" onClick={() => setView('form')}>
                  {t('ev.home.hero.cta')} →
                </button>
              </div>
              <div className="ev-banner__visual">
                <img
                  src={HERO_IMG}
                  alt=""
                  className="ev-banner__img"
                  aria-hidden="true"
                  onError={e => { e.target.style.display = 'none' }}
                />
                <div className="ev-banner__overlay" aria-hidden="true" />
              </div>
              <div className="ev-banner__glow" aria-hidden="true" />
            </section>

            {/* Campaign info card */}
            <section className="ev-campaign-card">
              <div className="ev-campaign-card__left">
                <span className="ev-campaign-card__label">{t('ev.home.campaign.label')}</span>
                <h2 className="ev-campaign-card__title">{t('ev.home.campaign.title')}</h2>
                <p className="ev-campaign-card__meta">{t('ev.home.campaign.team')}</p>
                {/* Deadline hidden until API exposes campaignId.endDate */}
              </div>
              <div className="ev-campaign-card__right">
                <span className="ev-campaign-card__pct-lbl">{t('ev.home.campaign.progress')}</span>
                <span className="ev-campaign-card__pct-val">67%</span>
                <div className="ev-campaign-card__bar">
                  <div className="ev-campaign-card__fill" style={{ width: '67%' }} />
                </div>
                {/* TODO: fetch from API */}
                <span className="ev-campaign-card__sub">{t('ev.home.campaign.stats_placeholder')}</span>
              </div>
            </section>

            {/* My forms */}
            <section className="ev-myforms">
              <h2 className="ev-myforms__title">{t('ev.home.forms.title')}</h2>

              {myEvalsLoading && (
                <p className="ev-myforms__loading">{t('ev.home.loading')}</p>
              )}
              {myEvalsError && !myEvalsLoading && (
                <p className="ev-myforms__error" role="alert">{myEvalsError}</p>
              )}

              {!myEvalsLoading && !myEvalsError && (
                <div className="ev-myforms__list">
                  {myEvals.length === 0 ? (
                    <p className="ev-myforms__empty">{t('ev.home.forms.empty')}</p>
                  ) : myEvals.map(ev => {
                    const meta   = STATUS_META[ev.status] || STATUS_META['assigned']
                    const isDone = ANSWER_LOCKED_STATUSES.includes(ev.status)
                    const answeredCount = ev.answers?.length ?? 0
                    return (
                      <div key={ev._id} className={`ev-fcard ev-fcard--${ev.status}`}>
                        <div className="ev-fcard__top">
                          <span className={`ev-fcard__badge ev-fcard__badge--${ev.status}`}>{t(meta.labelKey)}</span>
                        </div>
                        <h3 className="ev-fcard__title">{ev.formId?.title}</h3>
                        <p className="ev-fcard__sub">{ev.campaignId?.name}</p>
                        {!isDone && answeredCount > 0 && (
                          <div
                            className="ev-fcard__bar"
                            role="progressbar"
                            aria-valuenow={Math.min(answeredCount * 10, 100)}
                            aria-valuemin={0}
                            aria-valuemax={100}
                          >
                            <div className="ev-fcard__fill" style={{ width: `${Math.min(answeredCount * 10, 100)}%` }} aria-hidden="true" />
                          </div>
                        )}
                     <button
                          type="button"
                          className={`ev-fcard__cta${isDone ? ' ev-fcard__cta--ghost' : ''}`}
                          onClick={() => { window.location.href = `/evaluation?id=${ev._id}` }}
                        >
                          {ev.status === 'in_progress' ? t('ev.form.continue') : isDone ? t('ev.form.view') : t('ev.form.start')}
                          {!isDone && <ArrowNEIcon size={13} strokeWidth={2} />}
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </section>

          </div>
        )}

        {/* ── FORM VIEW ──────────────────────────────────────────────────── */}
        {view === 'form' && (
          <div className="ev-content">

            {/* Loading / Error states */}
            {evalLoading && (
              <div className="ev-fhero">
                <p className="ev-fhero__desc">{t('ev.form.loading')}</p>
              </div>
            )}
            {error && !evalLoading && (
              <div className="ev-fhero">
                <p className="ev-fhero__desc" style={{ color: 'var(--color-error)' }}>{error}</p>
              </div>
            )}

            {!evalLoading && !error && evaluation && (
              <>
                {/* Form hero */}
                <div className="ev-fhero">
                  <div className="ev-fhero__meta">
                    <span className="ev-fhero__badge">
                      {evaluation.campaignId?.name || t('ev.form.campaign')}
                    </span>
                    <span className={`ev-fhero__status ev-fhero__status--${STATUS_META[status]?.cls || 'todo'}`}>
                      {statusLabel}
                    </span>
                    {lastSaved && (
                      <span
                        className="ev-fhero__saved"
                        aria-live="polite"
                        aria-atomic="true"
                      >
                        💾 {t('ev.form.last_saved')} {lastSaved}
                      </span>
                    )}
                  </div>
                  <h1 className="ev-fhero__title">{evaluation.formId?.title}</h1>
                  {evaluation.formId?.description && (
                    <p className="ev-fhero__desc">{evaluation.formId.description}</p>
                  )}
                  <div className="ev-progress">
                    <div
                      className="ev-progress__bar"
                      role="progressbar"
                      aria-valuenow={pct}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={`${answered} / ${allQ.length} questions`}
                    >
                      <div className="ev-progress__fill" style={{ width: `${pct}%` }} aria-hidden="true" />
                    </div>
                    <span className="ev-progress__lbl" aria-hidden="true">{answered} / {allQ.length} questions</span>
                  </div>
                </div>

                {/* Fully locked — no action possible (submitted/signed/validated) */}
                {FULLY_LOCKED_STATUSES.includes(status) ? (
                  <div className="ev-submitted">
                    <SparklesIcon size={28} color="var(--color-secondary)" strokeWidth={1.5} />
                    <h2 className="ev-submitted__title">{t('ev.submitted.title')}</h2>
                    <p className="ev-submitted__desc">
                      {t('ev.submitted.desc')}
                    </p>
                    <button type="button" className="ev-banner__cta" onClick={() => setView('home')}>
                      {t('ev.submitted.back')}
                    </button>
                  </div>
                ) : (
                  <>
                    {/* Form card — flat question list from evaluation.formId.questions */}
                    <div className="ev-form">
                      <section className="ev-section">
                        <div className="ev-section__hd">
                          <span className="ev-section__id">{evaluation.formId?.title}</span>
                          <span className="ev-section__tag ev-section__tag--req">
                            {t('ev.section.mandatory')}
                          </span>
                        </div>

                        {allQ.map(q => (
                          <div key={q.id} className="ev-q">

                            {/* Rating — 2-col layout with variable scale (2-10 from question.scale) */}
                            {q.type === 'rating' && (
                              <div className="ev-q__row">
                                <div className="ev-q__text">
                                  <p className="ev-q__label">{q.label}</p>
                                </div>
                                <div className="ev-q__scale">
                                  <div className="ev-scale">
                                    {Array.from({ length: q.scale || 5 }, (_, i) => i + 1).map(n => (
                                      <button
                                        key={n}
                                        type="button"
                                        className={`ev-scale__btn${answers[q.id] === n ? ' ev-scale__btn--active' : ''}`}
                                        onClick={() => !isReadOnly && setAnswer(q.id, n)}
                                        aria-pressed={answers[q.id] === n}
                                        title={getScaleLabel(n, q.scale || 5, t)}
                                        disabled={isReadOnly}
                                      >
                                        {n}
                                      </button>
                                    ))}
                                  </div>
                                  {answers[q.id] && (
                                    <span className="ev-scale__lbl">{getScaleLabel(answers[q.id], q.scale || 5, t)}</span>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Yes/No — 2-col layout */}
                            {q.type === 'yes_no' && (
                              <div className="ev-q__row">
                                <div className="ev-q__text">
                                  <p className="ev-q__label">{q.label}</p>
                                </div>
                                <div className="ev-q__yesno">
                                  {['yes', 'no'].map(val => (
                                    <button
                                      key={val}
                                      type="button"
                                      className={`ev-yesno__btn${answers[q.id] === val ? ' ev-yesno__btn--active' : ''}`}
                                      onClick={() => !isReadOnly && setAnswer(q.id, val)}
                                      aria-pressed={answers[q.id] === val}
                                      disabled={isReadOnly}
                                    >
                                      {val === 'yes' ? t('ev.yesno.yes') : t('ev.yesno.no')}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Text — long text answer */}
                            {q.type === 'text' && (
                              <div className="ev-q__col">
                                <p className="ev-q__label" id={`q-label-${q.id}`}>{q.label}</p>
                                <textarea
                                  aria-labelledby={`q-label-${q.id}`}
                                  className="ev-textarea"
                                  placeholder={t('ev.form.textarea_placeholder')}
                                  rows={5}
                                  value={answers[q.id] ?? ''}
                                  onChange={e => setAnswer(q.id, e.target.value)}
                                  readOnly={isReadOnly}
                                />
                              </div>
                            )}

                            {/* Choice — radio group */}
                            {q.type === 'choice' && (
                              <div className="ev-q__col">
                                <p className="ev-q__label" id={`q-label-${q.id}`}>{q.label}</p>
                                <div className="ev-q__choices" role="radiogroup" aria-labelledby={`q-label-${q.id}`}>
                                  {(q.options || []).map((opt, oi) => (
                                    <label key={oi} className={`ev-q__choice${answers[q.id] === opt ? ' ev-q__choice--selected' : ''}`}>
                                      <input
                                        type="radio"
                                        name={`choice-${q.id}`}
                                        value={opt}
                                        checked={answers[q.id] === opt}
                                        onChange={() => !isReadOnly && setAnswer(q.id, opt)}
                                        className="ev-q__choice-input"
                                        disabled={isReadOnly}
                                      />
                                      <span className="ev-q__choice-label">{opt}</span>
                                    </label>
                                  ))}
                                </div>
                              </div>
                            )}

                          </div>
                        ))}
                      </section>
                    </div>

                    {/* Footer — matching Stitch */}
                    <footer className="ev-footer">
                      <div aria-live="polite" aria-atomic="true" className="sr-only">
                        {saving ? t('ev.footer.saving') : ''}
                      </div>
                      {status === 'reviewed' ? (
                        <button type="button" className="ev-footer__submit" onClick={handleSign} disabled={submitting}>
                          {t('ev.footer.sign')}
                        </button>
                      ) : (
                        <>
                          <div className="ev-footer__left">
                            <button type="button" className="ev-footer__ghost" onClick={handleDiscard}>
                              {t('ev.footer.discard')}
                            </button>
                            <button type="button" className="ev-footer__save" onClick={handleSave} disabled={saving}>
                              {saving ? t('ev.footer.saving') : t('ev.footer.save')}
                            </button>
                          </div>
                          <button type="button" className="ev-footer__submit" onClick={handleSubmit} disabled={submitting}>
                            {t('ev.footer.submit')}
                          </button>
                        </>
                      )}
                    </footer>

                    {/* Tips */}
                    <div className="ev-tips">
                      <div className="ev-tip">
                        <SparklesIcon size={16} color="var(--color-on-surface-variant)" strokeWidth={1.5} />
                        <div>
                          <p className="ev-tip__title">{t('ev.tip1.title')}</p>
                          <p className="ev-tip__body">{t('ev.tip1.body')}</p>
                        </div>
                      </div>
                      <div className="ev-tip">
                        <HeartIcon size={16} color="var(--color-on-surface-variant)" strokeWidth={1.5} />
                        <div>
                          <p className="ev-tip__title">{t('ev.tip2.title')}</p>
                          <p className="ev-tip__body">{t('ev.tip2.body')}</p>
                        </div>
                      </div>
                      <div className="ev-tip">
                        <GearIcon size={16} color="var(--color-on-surface-variant)" strokeWidth={1.5} />
                        <div>
                          <p className="ev-tip__title">{t('ev.tip3.title')}</p>
                          <p className="ev-tip__body">{t('ev.tip3.body')}</p>
                        </div>
                      </div>
                    </div>

                  </>
                )}
              </>
            )}
          </div>
        )}

      </div>
    </div>
  )
}
