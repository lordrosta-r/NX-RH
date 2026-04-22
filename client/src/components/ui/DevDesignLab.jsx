// =============================================================================
// DevDesignLab — outil de configuration visuelle in-situ
//
// Onglets : Couleurs · Typo · Layout · Espaces · Fond · Export
// Toutes les modifications se font via CSS variables + style injecté.
//
// Pour supprimer rapidement :
//   1. Supprimer ce fichier + DevDesignLab.css
//   2. Supprimer <DevDesignLab /> dans App.jsx
//   3. Supprimer <link id="ddl-font-*"> dans le head si polices chargées
// =============================================================================

import { useState, useEffect } from 'react'
import { X, RotateCcw, Copy, Check, Palette, Type, LayoutDashboard, Ruler, Image, Download, SlidersHorizontal } from 'lucide-react'
import './DevDesignLab.css'

// ── Config par défaut ────────────────────────────────────────────────────────
const DEFAULT = {
  colors: {
    pageBg:    '#f0eded',  // fond .db-content
    topbarBg:  '#ffffff',  // --color-topbar-bg
    sidebarBg: '#2e1065',  // --color-sidebar
    cardBg:    '#ffffff',  // --color-surface-container-lowest
    primary:   '#b8000b',  // --color-primary
    secondary: '#5b00df',  // --color-secondary
    text:      '#1c1b1b',  // --color-on-surface
  },
  typo: {
    family:        'Inter',
    sizeBase:      16,
    lineHeight:    1.5,
    letterSpacing: 0,
  },
  layout: {
    mode:         'sidebar', // 'sidebar' | 'topbar'
    sidebarWidth: 256,
    borderRadius: 8,
    maxWidth:     0,         // 0 = pas de limite
    cardCols:     0,         // 0 = défaut CSS (auto)
  },
  spacing: {
    contentPadding: 40,
    cardPadding:    24,
    gap:            20,
  },
  bg: {
    pageUrl:       '',
    pageOverlay:   0.12,
    sidebarUrl:    '',
    topbarUrl:     '',
  },
}

const FONTS = [
  'Inter', 'Roboto', 'Poppins', 'Outfit',
  'Plus Jakarta Sans', 'DM Sans', 'Nunito', 'Raleway',
]

const TABS = [
  { id: 'colors',  Icon: Palette,         label: 'Couleurs' },
  { id: 'typo',    Icon: Type,            label: 'Typo'     },
  { id: 'layout',  Icon: LayoutDashboard, label: 'Layout'   },
  { id: 'spacing', Icon: Ruler,           label: 'Espaces'  },
  { id: 'bg',      Icon: Image,           label: 'Fond'     },
  { id: 'export',  Icon: Download,        label: 'Export'   },
]

const LS_KEY = 'nx-design-lab-v2'

// ── Lire les valeurs réelles depuis le DOM ────────────────────────────────────
function readFromDOM() {
  const cs  = getComputedStyle(document.documentElement)
  const bcs = getComputedStyle(document.body)
  const get = (v) => cs.getPropertyValue(v).trim()

  const rootFontSize = parseFloat(cs.fontSize) || DEFAULT.typo.sizeBase
  let lineHeight = DEFAULT.typo.lineHeight
  const lhRaw = bcs.lineHeight
  if (lhRaw && lhRaw !== 'normal') {
    const lhPx = parseFloat(lhRaw)
    const fsPx = parseFloat(bcs.fontSize)
    if (!isNaN(lhPx) && !isNaN(fsPx) && fsPx > 0) {
      lineHeight = Math.round((lhPx / fsPx) * 100) / 100
    }
  }

  return {
    colors: {
      pageBg:    get('--color-surface-container')         || DEFAULT.colors.pageBg,
      topbarBg:  get('--color-topbar-bg')                 || DEFAULT.colors.topbarBg,
      sidebarBg: get('--color-sidebar')                   || DEFAULT.colors.sidebarBg,
      cardBg:    get('--color-surface-container-lowest')  || DEFAULT.colors.cardBg,
      primary:   get('--color-primary')                   || DEFAULT.colors.primary,
      secondary: get('--color-secondary')                 || DEFAULT.colors.secondary,
      text:      get('--color-on-surface')                || DEFAULT.colors.text,
    },
    typo: {
      family:        DEFAULT.typo.family,
      sizeBase:      rootFontSize,
      lineHeight,
      letterSpacing: 0,
    },
    layout:  structuredClone(DEFAULT.layout),
    spacing: structuredClone(DEFAULT.spacing),
    bg:      structuredClone(DEFAULT.bg),
  }
}

// ── Persistence ──────────────────────────────────────────────────────────────
function load() {
  try {
    const s = localStorage.getItem(LS_KEY)
    if (!s) return readFromDOM()
    const saved = JSON.parse(s)
    return {
      colors:  { ...DEFAULT.colors,  ...saved.colors  },
      typo:    { ...DEFAULT.typo,    ...saved.typo    },
      layout:  { ...DEFAULT.layout,  ...saved.layout  },
      spacing: { ...DEFAULT.spacing, ...saved.spacing },
      bg:      { ...DEFAULT.bg,      ...saved.bg      },
    }
  } catch { return readFromDOM() }
}

function persist(cfg) {
  localStorage.setItem(LS_KEY, JSON.stringify(cfg))
}

// ── Google Fonts loader ───────────────────────────────────────────────────────
function ensureFont(family) {
  if (family === 'Inter') return // déjà chargée
  const id = `ddl-font-${family.replace(/\s+/g, '-').toLowerCase()}`
  if (document.getElementById(id)) return
  const link = document.createElement('link')
  link.id   = id
  link.rel  = 'stylesheet'
  link.href = `https://fonts.googleapis.com/css2?family=${family.replace(/\s/g, '+')}:wght@300;400;500;600;700;800;900&display=swap`
  document.head.appendChild(link)
}

// ── Injection CSS dynamique ───────────────────────────────────────────────────
function injectCSS(cfg) {
  let el = document.getElementById('nx-design-lab-styles')
  if (!el) {
    el = document.createElement('style')
    el.id = 'nx-design-lab-styles'
    document.head.appendChild(el)
  }

  const r      = []
  const sw     = cfg.layout.sidebarWidth
  const cp     = cfg.spacing.contentPadding
  const isTop  = cfg.layout.mode === 'topbar'
  const tbBg   = cfg.colors.topbarBg

  // ── Background page
  if (cfg.bg.pageUrl) {
    r.push(`.db-content { background-color: ${cfg.colors.pageBg} !important; background-image: url('${cfg.bg.pageUrl}') !important; background-size: cover !important; background-position: center !important; background-blend-mode: overlay !important; }`)
  } else {
    r.push(`.db-content { background: ${cfg.colors.pageBg} !important; }`)
  }

  // ── Topbar background image
  if (cfg.bg.topbarUrl) {
    r.push(`.apptb { background-image: url('${cfg.bg.topbarUrl}') !important; background-size: cover !important; }`)
  }

  // ── Layout sidebar vs topbar
  if (isTop) {
    // Transformer la sidebar en barre de nav horizontale
    r.push(`
.app-sidebar {
  position: fixed !important; top: 56px !important; left: 0 !important;
  width: 100vw !important; min-width: 100vw !important; height: 44px !important;
  flex-direction: row !important; padding: 0 1.5rem !important;
  background: ${tbBg} !important;
  border-bottom: 1px solid var(--color-surface-container-high, #e0dddd) !important;
  border-right: none !important; box-shadow: none !important;
  overflow: hidden !important; z-index: 89 !important;
  gap: 0.5rem !important; align-items: center !important;
}
.app-sidebar__brand {
  display: flex !important; flex-direction: row !important;
  align-items: center !important; gap: 0.5rem !important;
  padding: 0 1rem 0 0 !important; margin: 0 !important;
  border-bottom: none !important; flex-shrink: 0 !important;
  border-right: 1px solid var(--color-surface-container-high, #e0dddd) !important;
}
.app-sidebar__brand-name {
  font-size: 0.875rem !important; font-weight: 700 !important;
  color: var(--color-on-surface) !important; white-space: nowrap !important;
}
.app-sidebar__brand-sub { display: none !important; }
.app-sidebar__nav {
  flex-direction: row !important; gap: 0.25rem !important;
  padding: 0 !important; flex: 1 !important;
  overflow: hidden !important; align-items: center !important;
}
.app-sidebar__item, .app-sidebar__item--disabled {
  flex-direction: row !important; padding: 0.3rem 0.625rem !important;
  border-radius: 6px !important; height: 30px !important; min-height: 30px !important;
  gap: 0.375rem !important; font-size: 0.8125rem !important;
  white-space: nowrap !important; color: var(--color-on-surface-variant) !important;
  background: none !important;
}
.app-sidebar__item--active {
  color: var(--color-primary) !important;
  background: var(--color-primary-tint-07, rgba(184,0,11,0.07)) !important;
}
.app-sidebar__overlay { display: none !important; }
.db-main { margin-left: 0 !important; }
.db-content { padding-top: calc(44px + ${cp}px) !important; }
`.trim())
  } else {
    // Sidebar classique
    if (cfg.bg.sidebarUrl) {
      r.push(`.app-sidebar { background-image: url('${cfg.bg.sidebarUrl}') !important; background-size: cover !important; background-position: center !important; background-blend-mode: overlay !important; }`)
    }
    r.push(`.app-sidebar { width: ${sw}px !important; min-width: ${sw}px !important; }`)
    r.push(`.db-main { margin-left: ${sw}px !important; }`)
  }

  // ── Max-width
  if (cfg.layout.maxWidth > 0) {
    r.push(`.db-content > * { max-width: ${cfg.layout.maxWidth}px; margin-left: auto; margin-right: auto; }`)
  }

  // ── Espacement
  r.push(`.db-content { padding: ${cp}px !important; }`)
  r.push(`.db-bento { gap: ${cfg.spacing.gap}px !important; }`)
  r.push(`.db-card { padding: ${cfg.spacing.cardPadding}px !important; }`)

  // ── Colonnes cards
  if (cfg.layout.cardCols > 0) {
    r.push(`.db-bento { grid-template-columns: repeat(${cfg.layout.cardCols}, 1fr) !important; }`)
    r.push(`.db-bento > * { grid-column: auto !important; grid-row: auto !important; }`)
  }

  // ── Typographie
  r.push(`body { line-height: ${cfg.typo.lineHeight}; letter-spacing: ${cfg.typo.letterSpacing}em; }`)

  el.textContent = r.join('\n')
}

// ── Appliquer la config complète ──────────────────────────────────────────────
function applyConfig(cfg) {
  const root = document.documentElement

  // Colors via CSS variables
  root.style.setProperty('--color-topbar-bg',               cfg.colors.topbarBg)
  root.style.setProperty('--color-sidebar',                  cfg.colors.sidebarBg)
  root.style.setProperty('--color-surface-container-lowest', cfg.colors.cardBg)
  root.style.setProperty('--color-primary',                  cfg.colors.primary)
  root.style.setProperty('--color-primary-container',        cfg.colors.primary)
  root.style.setProperty('--color-secondary',               cfg.colors.secondary)
  root.style.setProperty('--color-on-surface',               cfg.colors.text)
  root.style.setProperty('--color-on-background',            cfg.colors.text)

  // Typography
  ensureFont(cfg.typo.family)
  root.style.setProperty('--font-family', `'${cfg.typo.family}', system-ui, -apple-system, sans-serif`)
  root.style.fontSize = `${cfg.typo.sizeBase}px`

  // Layout
  root.setAttribute('data-layout', cfg.layout.mode)
  root.style.setProperty('--radius-md', `${cfg.layout.borderRadius}px`)
  root.style.setProperty('--radius-xl', `${cfg.layout.borderRadius * 2}px`)

  // Dynamic CSS rules
  injectCSS(cfg)
}

// ── Export CSS ────────────────────────────────────────────────────────────────
function buildExportCSS(cfg) {
  const c = cfg.colors
  const lines = [
    '/* ================================================',
    '   Config exportée depuis DevDesignLab',
    '   Date : ' + new Date().toLocaleString('fr-FR'),
    '',
    '   Migration :',
    '   1. Copier les variables dans tokens.css → :root {}',
    '   2. Copier les règles CSS dans global.css',
    '   3. Supprimer DevDesignLab.jsx + DevDesignLab.css',
    '      + retirer <DevDesignLab /> dans App.jsx',
    '   ================================================ */',
    '',
    '/* tokens.css → :root {} */',
    `  --color-topbar-bg:                ${c.topbarBg};`,
    `  --color-sidebar:                  ${c.sidebarBg};`,
    `  --color-surface-container-lowest: ${c.cardBg};`,
    `  --color-primary:                  ${c.primary};`,
    `  --color-primary-container:        ${c.primary};`,
    `  --color-secondary:                ${c.secondary};`,
    `  --color-on-surface:               ${c.text};`,
    `  --font-family:                    '${cfg.typo.family}', system-ui, sans-serif;`,
    `  --radius-md:                      ${cfg.layout.borderRadius}px;`,
    '',
    '/* global.css */',
    `.db-content { background: ${c.pageBg}; padding: ${cfg.spacing.contentPadding}px; }`,
    `.db-bento   { gap: ${cfg.spacing.gap}px; }`,
    `.db-card    { padding: ${cfg.spacing.cardPadding}px; }`,
  ]
  if (cfg.layout.mode === 'topbar') {
    lines.push('')
    lines.push('/* Layout mode : topbar */')
    lines.push('/* → .db-sidebar : display:none | .db-main : margin-left:0 */')
  }
  if (cfg.layout.sidebarWidth !== 256) {
    lines.push(`/* Sidebar width : ${cfg.layout.sidebarWidth}px → modifier .db-main { margin-left } et .appsb { width } */`)
  }
  if (cfg.typo.family !== 'Inter') {
    lines.push(`/* Police : charger '${cfg.typo.family}' via Google Fonts dans index.html */`)
  }
  if (cfg.bg.pageUrl) {
    lines.push(`/* Fond page : url('${cfg.bg.pageUrl}') */`)
  }
  return lines.join('\n')
}

// ── Composants UI internes ────────────────────────────────────────────────────
function Label({ children }) {
  return <span className="ddl-label">{children}</span>
}

function SectionTitle({ children }) {
  return <p className="ddl-section">{children}</p>
}

function ColorRow({ label, section, field, cfg, onChange }) {
  return (
    <div className="ddl-row">
      <Label>{label}</Label>
      <input
        type="color"
        className="ddl-swatch"
        value={cfg[section][field]}
        onChange={e => onChange(section, field, e.target.value)}
      />
      <span className="ddl-hex">{cfg[section][field]}</span>
    </div>
  )
}

function Slider({ label, section, field, min, max, step = 1, unit = '', cfg, onChange }) {
  const val = cfg[section][field]
  return (
    <div className="ddl-slider">
      <div className="ddl-slider__head">
        <Label>{label}</Label>
        <span className="ddl-val">{typeof val === 'number' ? (step < 1 ? val.toFixed(2) : val) : val}{unit}</span>
      </div>
      <input
        type="range"
        className="ddl-range"
        min={min} max={max} step={step}
        value={val}
        onChange={e => onChange(section, field, Number(e.target.value))}
      />
    </div>
  )
}

function Select({ label, section, field, options, cfg, onChange }) {
  return (
    <div className="ddl-row">
      <Label>{label}</Label>
      <select
        className="ddl-select"
        value={cfg[section][field]}
        onChange={e => onChange(section, field, e.target.value)}
      >
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  )
}

function TextInput({ label, section, field, placeholder, cfg, onChange }) {
  return (
    <div className="ddl-text-wrap">
      <Label>{label}</Label>
      <input
        type="text"
        className="ddl-text"
        placeholder={placeholder}
        value={cfg[section][field]}
        onChange={e => onChange(section, field, e.target.value)}
      />
    </div>
  )
}

function ToggleGroup({ label, section, field, options, cfg, onChange }) {
  return (
    <div className="ddl-toggle-wrap">
      {label && <SectionTitle>{label}</SectionTitle>}
      <div className="ddl-toggle-group">
        {options.map(({ value, display }) => (
          <button
            key={value}
            className={`ddl-toggle-btn${cfg[section][field] === value ? ' ddl-toggle-btn--on' : ''}`}
            onClick={() => onChange(section, field, value)}
          >
            {display}
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Composant principal ───────────────────────────────────────────────────────
export default function DevDesignLab() {
  const [open,   setOpen]   = useState(false)
  const [tab,    setTab]    = useState('colors')
  const [cfg,    setCfg]    = useState(load)
  const [copied, setCopied] = useState(false)

  // Appliquer la config sauvegardée au montage
  useEffect(() => { applyConfig(cfg) }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function handleChange(section, key, value) {
    const next = { ...cfg, [section]: { ...cfg[section], [key]: value } }
    setCfg(next)
    persist(next)
    applyConfig(next)
  }

  function handleReset() {
    const fresh = readFromDOM()
    setCfg(fresh)
    persist(fresh)
    applyConfig(fresh)
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(buildExportCSS(cfg))
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch { /* clipboard non dispo */ }
  }

  const p = { cfg, onChange: handleChange }

  return (
    <div className="ddl">
      {open && (
        <div className="ddl__panel">

          {/* ── Header ─────────────────────────────────────────────────── */}
          <div className="ddl__header">
            <span className="ddl__title">Design Lab</span>
            <div className="ddl__hright">
              <button className="ddl__hbtn" onClick={handleReset} title="Réinitialiser tout">
                <RotateCcw size={12} />
              </button>
              <button className="ddl__hbtn" onClick={() => setOpen(false)}>
                <X size={13} />
              </button>
            </div>
          </div>

          {/* ── Tabs ───────────────────────────────────────────────────── */}
          <div className="ddl__tabs">
            {TABS.map(t => (
              <button
                key={t.id}
                className={`ddl__tab${tab === t.id ? ' ddl__tab--on' : ''}`}
                onClick={() => setTab(t.id)}
                title={t.label}
              >
                <t.Icon size={13} />
              </button>
            ))}
          </div>

          {/* ── Body ───────────────────────────────────────────────────── */}
          <div className="ddl__body">

            {/* Couleurs */}
            {tab === 'colors' && (
              <>
                <SectionTitle>Fond & structure</SectionTitle>
                <ColorRow label="Fond page"  section="colors" field="pageBg"    {...p} />
                <ColorRow label="Topbar"     section="colors" field="topbarBg"  {...p} />
                <ColorRow label="Sidebar"    section="colors" field="sidebarBg" {...p} />
                <ColorRow label="Cards"      section="colors" field="cardBg"    {...p} />
                <SectionTitle>Brand</SectionTitle>
                <ColorRow label="Primary"    section="colors" field="primary"   {...p} />
                <ColorRow label="Secondary"  section="colors" field="secondary" {...p} />
                <SectionTitle>Texte</SectionTitle>
                <ColorRow label="Corps texte" section="colors" field="text"     {...p} />
              </>
            )}

            {/* Typo */}
            {tab === 'typo' && (
              <>
                <SectionTitle>Police</SectionTitle>
                <Select label="Famille" section="typo" field="family" options={FONTS} {...p} />
                <Slider label="Taille base"    section="typo" field="sizeBase"      min={12} max={20} unit="px"  {...p} />
                <Slider label="Interligne"     section="typo" field="lineHeight"    min={1.2} max={2.2} step={0.05} unit="×" {...p} />
                <Slider label="Letter-spacing" section="typo" field="letterSpacing" min={-0.03} max={0.12} step={0.005} unit="em" {...p} />
              </>
            )}

            {/* Layout */}
            {tab === 'layout' && (
              <>
                <ToggleGroup
                  label="Navigation"
                  section="layout" field="mode"
                  options={[
                    { value: 'sidebar', display: 'Sidebar' },
                    { value: 'topbar',  display: 'Topbar'  },
                  ]}
                  {...p}
                />
                <Slider label="Largeur sidebar"   section="layout" field="sidebarWidth" min={180} max={360} unit="px" {...p} />
                <Slider label="Border radius"     section="layout" field="borderRadius"  min={0}   max={28}  unit="px" {...p} />
                <Slider label="Max-width contenu" section="layout" field="maxWidth"      min={0}   max={1800} step={50} unit="px" {...p} />
                <p className="ddl-hint">Max-width = 0 → pas de limite</p>
                <SectionTitle>Colonnes cards</SectionTitle>
                <ToggleGroup
                  section="layout" field="cardCols"
                  options={[
                    { value: 0, display: 'Auto' },
                    { value: 1, display: '1'    },
                    { value: 2, display: '2'    },
                    { value: 3, display: '3'    },
                    { value: 4, display: '4'    },
                  ]}
                  {...p}
                />
              </>
            )}

            {/* Espaces */}
            {tab === 'spacing' && (
              <>
                <SectionTitle>Espacement</SectionTitle>
                <Slider label="Padding page"  section="spacing" field="contentPadding" min={8}  max={80} unit="px" {...p} />
                <Slider label="Padding card"  section="spacing" field="cardPadding"    min={8}  max={56} unit="px" {...p} />
                <Slider label="Gap grille"    section="spacing" field="gap"            min={4}  max={56} unit="px" {...p} />
              </>
            )}

            {/* Fond */}
            {tab === 'bg' && (
              <>
                <SectionTitle>Image de fond — page</SectionTitle>
                <TextInput label="URL image" section="bg" field="pageUrl"    placeholder="https://…" {...p} />
                <Slider    label="Opacité overlay" section="bg" field="pageOverlay" min={0} max={1} step={0.01} unit="" {...p} />
                <SectionTitle>Image de fond — sidebar</SectionTitle>
                <TextInput label="URL image" section="bg" field="sidebarUrl" placeholder="https://…" {...p} />
                <SectionTitle>Image de fond — topbar</SectionTitle>
                <TextInput label="URL image" section="bg" field="topbarUrl"  placeholder="https://…" {...p} />
              </>
            )}

            {/* Export */}
            {tab === 'export' && (
              <>
                <SectionTitle>Exporter la config</SectionTitle>
                <p className="ddl-export-desc">
                  Copie → colle dans <code>tokens.css</code> / <code>global.css</code> → supprime <code>DevDesignLab</code>
                </p>
                <pre className="ddl-export-pre">{buildExportCSS(cfg)}</pre>
                <button className="ddl-export-btn" onClick={handleCopy}>
                  {copied
                    ? <><Check size={12} /> Copié !</>
                    : <><Copy size={12} /> Copier le CSS</>
                  }
                </button>
              </>
            )}

          </div>
        </div>
      )}

      <button
        className={`ddl__toggle${open ? ' ddl__toggle--on' : ''}`}
        onClick={() => setOpen(o => !o)}
        title="Design Lab"
      >
        <SlidersHorizontal size={16} />
      </button>
    </div>
  )
}
