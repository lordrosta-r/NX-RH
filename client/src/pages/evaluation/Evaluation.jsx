// =============================================================================
// Evaluation — Employee portal
// View 'home'  : hero banner + active campaign + my forms list
// View 'form'  : form-filling UI matching Stitch reference design
// Layout : fixed sidebar 256px + db-style scrollable main
// =============================================================================
import React, { useState } from 'react'
import './evaluation.css'
import EvaluationSidebar from './EvaluationSidebar'
import { t as pageT }    from './i18n'
import { useLocale }     from '../../hooks/useLocale'
import { useTheme }      from '../../hooks/useTheme'
import {
  SearchIcon, PaletteIcon, BellIcon, HelpIcon,
  SparklesIcon, HeartIcon, GearIcon, ArrowNEIcon,
} from '../../components/ui/icons'

// ── Images ────────────────────────────────────────────────────────────────────
const HERO_IMG = 'https://images.unsplash.com/photo-1521737852567-6949f3f9f2b5?auto=format&fit=crop&w=1400&q=70'

// ── Mock data ─────────────────────────────────────────────────────────────────

const MOCK_FORMS = [
  {
    id: 'f1',
    title: 'Auto-évaluation annuelle 2026',
    subtitle: 'Cycle Annuel 2026 · 3 sections · 8 questions',
    status: 'inprogress',
    answeredPct: 25,
    deadline: '30 avril 2026',
  },
  {
    id: 'f2',
    title: 'Évaluation des compétences techniques',
    subtitle: 'Cycle Annuel 2026 · 2 sections · 5 questions',
    status: 'todo',
    answeredPct: 0,
    deadline: '30 avril 2026',
  },
  {
    id: 'f3',
    title: 'Bilan de mi-année 2025',
    subtitle: 'Campagne archivée · 2 sections · 6 questions',
    status: 'done',
    answeredPct: 100,
    deadline: '15 oct. 2025',
  },
]

const FORM_DATA = {
  title: 'Auto-évaluation & Développement Professionnel',
  sections: [
    {
      id: 's1',
      number: '01',
      title: 'ÉVALUATION DES COMPÉTENCES',
      required: true,
      questions: [
        {
          id: 'q1', type: 'scale',
          label: 'Communication et collaboration',
          desc: 'Évaluez votre capacité à communiquer clairement, à partager l\'information et à travailler efficacement avec vos collègues.',
        },
        {
          id: 'q2', type: 'scale',
          label: 'Résolution de problèmes',
          desc: 'Appréciez votre aptitude à identifier les problèmes, analyser les causes et proposer des solutions adaptées.',
        },
        {
          id: 'q3', type: 'scale',
          label: 'Atteinte des objectifs',
          desc: 'Dans quelle mesure avez-vous atteint les objectifs fixés lors du dernier entretien ?',
        },
        {
          id: 'q4', type: 'slider',
          label: 'Niveau de satisfaction globale',
          desc: 'Sur une échelle de 0 à 100, quel est votre niveau de satisfaction dans votre poste actuel ?',
        },
      ],
    },
    {
      id: 's2',
      number: '02',
      title: 'RÉFLEXION NARRATIVE',
      required: true,
      questions: [
        {
          id: 'q5', type: 'textarea',
          label: 'Quelles ont été vos principales réalisations cette année ?',
          desc: 'Décrivez 2 à 3 accomplissements dont vous êtes fier(e), en précisant votre contribution personnelle et l\'impact obtenu.',
        },
        {
          id: 'q6', type: 'textarea',
          label: 'Quels défis avez-vous rencontrés et comment les avez-vous surmontés ?',
          desc: 'Identifiez les principaux obstacles et expliquez les actions mises en place pour y faire face.',
        },
      ],
    },
    {
      id: 's3',
      number: '03',
      title: 'ASPIRATIONS & DÉVELOPPEMENT',
      required: false,
      questions: [
        {
          id: 'q7', type: 'textarea',
          label: 'Quels sont vos objectifs professionnels pour la prochaine période ?',
          desc: 'Décrivez vos ambitions à court terme (6 mois) et à moyen terme (1–2 ans).',
        },
        {
          id: 'q8', type: 'scale',
          label: 'Intérêt pour une mobilité interne',
          desc: 'Êtes-vous ouvert(e) à de nouvelles opportunités au sein de l\'organisation ?',
        },
      ],
    },
  ],
}

const SCALE_LABELS = { 1: 'Insuffisant', 2: 'À améliorer', 3: 'Satisfaisant', 4: 'Bien', 5: 'Excellent' }

const STATUS_META = {
  todo:       { label: 'À compléter',  cls: 'todo'       },
  inprogress: { label: 'En cours',     cls: 'inprogress' },
  done:       { label: 'Complété',     cls: 'done'       },
}

// ─────────────────────────────────────────────────────────────────────────────

export default function Evaluation() {
  const { t, locale, setLocale } = useLocale(pageT)
  const { theme, cycleTheme }    = useTheme()

  const [view,    setView]    = useState('home')   // 'home' | 'form'
  const [answers, setAnswers] = useState({})
  const [status,  setStatus]  = useState('draft')  // 'draft' | 'saved' | 'submitted'
  const [saving,  setSaving]  = useState(false)

  // ── Answer helpers ─────────────────────────────────────────────────────────
  function setAnswer(id, value) {
    setAnswers(prev => ({ ...prev, [id]: value }))
    if (status === 'saved') setStatus('draft')
  }

  function handleSave() {
    setSaving(true)
    setTimeout(() => { setSaving(false); setStatus('saved') }, 700)
  }

  function handleDiscard() {
    setAnswers({})
    setStatus('draft')
  }

  function handleSubmit() {
    setStatus('submitted')
  }

  // ── Progress ───────────────────────────────────────────────────────────────
  const allQ     = FORM_DATA.sections.flatMap(s => s.questions)
  const answered = allQ.filter(q => answers[q.id] !== undefined && answers[q.id] !== '').length
  const pct      = Math.round((answered / allQ.length) * 100)

  const statusLabel = { draft: 'Brouillon', saved: 'Enregistré', submitted: 'Soumis' }[status]

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="ev">
      <EvaluationSidebar t={t} />

      <div className="ev-main">

        {/* Topbar */}
        <header className="ev-topbar">
          <div className="ev-topbar__left">
            {view === 'form' && (
              <button className="ev-back-btn" onClick={() => setView('home')}>
                {t('ev.form.back')}
              </button>
            )}
            <span className="ev-topbar__title">
              {view === 'form' ? t('ev.topbar.form') : t('ev.topbar.home')}
            </span>
          </div>

          <div className="ev-topbar__right">
            <div className="ev-search">
              <SearchIcon size={14} color="var(--color-on-surface-variant)" />
              <input placeholder={t('ev.topbar.search')} />
            </div>
            <button className="ev-icon-btn" onClick={cycleTheme} title="Thème">
              <PaletteIcon size={17} color="var(--color-on-surface-variant)" />
            </button>
            <button className="ev-icon-btn" title="Aide">
              <HelpIcon size={17} color="var(--color-on-surface-variant)" strokeWidth={1.5} />
            </button>
            <button className="ev-icon-btn" title="Notifications">
              <BellIcon size={17} color="var(--color-on-surface-variant)" />
            </button>
            <button
              className="ev-icon-btn"
              onClick={() => setLocale(locale === 'fr' ? 'en' : 'fr')}
              title="Langue"
            >
              <span className="ev-locale">{locale.toUpperCase()}</span>
            </button>
          </div>
        </header>

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
                <button className="ev-banner__cta" onClick={() => setView('form')}>
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
                <div className="ev-campaign-card__deadline">
                  <span className="ev-campaign-card__deadline-lbl">{t('ev.home.campaign.deadline')}</span>
                  <span className="ev-campaign-card__deadline-val">30 avril 2026</span>
                </div>
              </div>
              <div className="ev-campaign-card__right">
                <span className="ev-campaign-card__pct-lbl">{t('ev.home.campaign.progress')}</span>
                <span className="ev-campaign-card__pct-val">67%</span>
                <div className="ev-campaign-card__bar">
                  <div className="ev-campaign-card__fill" style={{ width: '67%' }} />
                </div>
                <span className="ev-campaign-card__sub">85 / 128 collaborateurs</span>
              </div>
            </section>

            {/* My forms */}
            <section className="ev-myforms">
              <h2 className="ev-myforms__title">{t('ev.home.forms.title')}</h2>
              <div className="ev-myforms__list">
                {MOCK_FORMS.map(f => {
                  const meta = STATUS_META[f.status]
                  const isDone = f.status === 'done'
                  return (
                    <div key={f.id} className={`ev-fcard ev-fcard--${f.status}`}>
                      <div className="ev-fcard__top">
                        <span className={`ev-fcard__badge ev-fcard__badge--${f.status}`}>{meta.label}</span>
                        <span className="ev-fcard__deadline">{f.deadline}</span>
                      </div>
                      <h3 className="ev-fcard__title">{f.title}</h3>
                      <p className="ev-fcard__sub">{f.subtitle}</p>
                      {!isDone && (
                        <div className="ev-fcard__bar">
                          <div className="ev-fcard__fill" style={{ width: `${f.answeredPct}%` }} />
                        </div>
                      )}
                      <button
                        className={`ev-fcard__cta${isDone ? ' ev-fcard__cta--ghost' : ''}`}
                        onClick={() => !isDone && setView('form')}
                      >
                        {f.status === 'inprogress' ? t('ev.form.continue') : f.status === 'done' ? t('ev.form.view') : t('ev.form.start')}
                        {!isDone && <ArrowNEIcon size={13} strokeWidth={2} />}
                      </button>
                    </div>
                  )
                })}
              </div>
            </section>

          </div>
        )}

        {/* ── FORM VIEW ──────────────────────────────────────────────────── */}
        {view === 'form' && (
          <div className="ev-content">

            {/* Form hero */}
            <div className="ev-fhero">
              <div className="ev-fhero__meta">
                <span className="ev-fhero__badge">{t('ev.form.campaign')}</span>
                <span className={`ev-fhero__status ev-fhero__status--${status}`}>
                  {status === 'draft' ? 'Status: Draft' : status === 'saved' ? 'Status: Saved' : 'Status: Submitted'}
                </span>
              </div>
              <h1 className="ev-fhero__title">{FORM_DATA.title}</h1>
              <p className="ev-fhero__desc">
                Prenez le temps de réfléchir à vos accomplissements, vos défis et vos aspirations.
                Vos réponses serviront de base à l'entretien avec votre manager.
              </p>
              <div className="ev-progress">
                <div className="ev-progress__bar">
                  <div className="ev-progress__fill" style={{ width: `${pct}%` }} />
                </div>
                <span className="ev-progress__lbl">{answered} / {allQ.length} questions</span>
              </div>
            </div>

            {/* Submitted state */}
            {status === 'submitted' ? (
              <div className="ev-submitted">
                <SparklesIcon size={28} color="var(--color-secondary)" strokeWidth={1.5} />
                <h2 className="ev-submitted__title">Évaluation soumise</h2>
                <p className="ev-submitted__desc">
                  Votre auto-évaluation a bien été transmise. Vous serez notifié(e) de la date de votre entretien prochainement.
                </p>
                <button className="ev-banner__cta" onClick={() => { setView('home'); setStatus('draft'); setAnswers({}) }}>
                  ← Retour à l'accueil
                </button>
              </div>
            ) : (
              <>
                {/* Form card */}
                <div className="ev-form">
                  {FORM_DATA.sections.map(section => (
                    <section key={section.id} className="ev-section">

                      {/* Section header — matching Stitch: "01 / SKILL ASSESSMENT" + REQUIRED right */}
                      <div className="ev-section__hd">
                        <span className="ev-section__id">
                          {section.number} / {section.title}
                        </span>
                        <span className={`ev-section__tag ev-section__tag--${section.required ? 'req' : 'opt'}`}>
                          {section.required ? t('ev.section.required') : t('ev.section.optional')}
                        </span>
                      </div>

                      {/* Questions */}
                      {section.questions.map(q => (
                        <div key={q.id} className="ev-q">

                          {/* Scale — 2-col layout */}
                          {q.type === 'scale' && (
                            <div className="ev-q__row">
                              <div className="ev-q__text">
                                <p className="ev-q__label">{q.label}</p>
                                <p className="ev-q__desc">{q.desc}</p>
                              </div>
                              <div className="ev-q__scale">
                                <div className="ev-scale">
                                  {[1, 2, 3, 4, 5].map(n => (
                                    <button
                                      key={n}
                                      type="button"
                                      className={`ev-scale__btn${answers[q.id] === n ? ' ev-scale__btn--active' : ''}`}
                                      onClick={() => setAnswer(q.id, n)}
                                      title={SCALE_LABELS[n]}
                                    >
                                      {n}
                                    </button>
                                  ))}
                                </div>
                                {answers[q.id] && (
                                  <span className="ev-scale__lbl">{SCALE_LABELS[answers[q.id]]}</span>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Slider — 1-col */}
                          {q.type === 'slider' && (
                            <div className="ev-q__col">
                              <p className="ev-q__label">{q.label}</p>
                              <p className="ev-q__desc">{q.desc}</p>
                              <div className="ev-slider">
                                <span className="ev-slider__edge">{t('ev.slider.low')}</span>
                                <input
                                  type="range"
                                  className="ev-slider__input"
                                  min={0} max={100} step={5}
                                  value={answers[q.id] ?? 50}
                                  onChange={e => setAnswer(q.id, Number(e.target.value))}
                                />
                                <span className="ev-slider__edge">{t('ev.slider.high')}</span>
                                <span className="ev-slider__val">{answers[q.id] ?? 50}%</span>
                              </div>
                            </div>
                          )}

                          {/* Textarea — 1-col */}
                          {q.type === 'textarea' && (
                            <div className="ev-q__col">
                              <p className="ev-q__label">{q.label}</p>
                              <p className="ev-q__desc">{q.desc}</p>
                              <textarea
                                className="ev-textarea"
                                placeholder="Votre réponse…"
                                rows={5}
                                value={answers[q.id] ?? ''}
                                onChange={e => setAnswer(q.id, e.target.value)}
                              />
                            </div>
                          )}

                        </div>
                      ))}

                    </section>
                  ))}
                </div>

                {/* Footer — matching Stitch */}
                <footer className="ev-footer">
                  <div className="ev-footer__left">
                    <button className="ev-footer__ghost" onClick={handleDiscard}>
                      🗑 {t('ev.footer.discard')}
                    </button>
                    <button className="ev-footer__save" onClick={handleSave} disabled={saving}>
                      💾 {saving ? 'Enregistrement…' : t('ev.footer.save')}
                    </button>
                  </div>
                  <button className="ev-footer__submit" onClick={handleSubmit}>
                    {t('ev.footer.submit')}
                  </button>
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
          </div>
        )}

      </div>
    </div>
  )
}
