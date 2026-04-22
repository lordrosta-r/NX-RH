// =============================================================================
// DevColorPicker — floating dev-only color customiser
// Only renders when import.meta.env.DEV is true.
// Lets you tweak topbar / sidebar / card background colors in real time.
// Changes are persisted to localStorage and re-applied on next refresh.
// =============================================================================

import { useState, useEffect } from 'react'
import { Palette, X, RotateCcw } from 'lucide-react'
import './DevColorPicker.css'

const VARS = [
  { key: '--color-topbar-bg',               label: 'Topbar',  default: '#ffffff' },
  { key: '--color-sidebar',                 label: 'Sidebar', default: '#2e1065' },
  { key: '--color-surface-container-lowest', label: 'Cards',  default: '#ffffff' },
]

const LS_KEY   = 'nx-dev-colors'
const DEFAULTS = Object.fromEntries(VARS.map(v => [v.key, v.default]))

function loadColors() {
  try {
    const s = localStorage.getItem(LS_KEY)
    return s ? { ...DEFAULTS, ...JSON.parse(s) } : { ...DEFAULTS }
  } catch {
    return { ...DEFAULTS }
  }
}

function applyAll(colors) {
  VARS.forEach(({ key }) =>
    document.documentElement.style.setProperty(key, colors[key] ?? DEFAULTS[key])
  )
}

export default function DevColorPicker() {
  const [open,   setOpen]   = useState(false)
  const [colors, setColors] = useState(loadColors)

  // Apply saved colors on first mount
  useEffect(() => { applyAll(colors) }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function handleChange(key, value) {
    const next = { ...colors, [key]: value }
    setColors(next)
    document.documentElement.style.setProperty(key, value)
    localStorage.setItem(LS_KEY, JSON.stringify(next))
  }

  function handleReset() {
    setColors({ ...DEFAULTS })
    applyAll(DEFAULTS)
    localStorage.removeItem(LS_KEY)
  }

  return (
    <div className="dcp">
      {open && (
        <div className="dcp__panel">
          <div className="dcp__header">
            <span className="dcp__title">🎨 Dev Colors</span>
            <button className="dcp__close" onClick={() => setOpen(false)} title="Fermer">
              <X size={14} />
            </button>
          </div>

          <div className="dcp__body">
            {VARS.map(({ key, label }) => (
              <div key={key} className="dcp__row">
                <label className="dcp__label" htmlFor={`dcp-${key}`}>{label}</label>
                <input
                  id={`dcp-${key}`}
                  type="color"
                  className="dcp__swatch"
                  value={colors[key]}
                  onChange={e => handleChange(key, e.target.value)}
                />
                <span className="dcp__hex">{colors[key]}</span>
              </div>
            ))}
          </div>

          <button className="dcp__reset" onClick={handleReset}>
            <RotateCcw size={12} /> Réinitialiser
          </button>
        </div>
      )}

      <button
        className={`dcp__toggle${open ? ' dcp__toggle--active' : ''}`}
        onClick={() => setOpen(o => !o)}
        title="Couleurs dev"
      >
        <Palette size={18} />
      </button>
    </div>
  )
}
