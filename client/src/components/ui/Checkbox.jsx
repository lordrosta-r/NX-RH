import './Checkbox.css'

// =============================================================================
// Checkbox — Accessible custom checkbox
//
// Props:
//   id       {string}
//   label    {string}
//   checked  {boolean}
//   onChange {function}
// =============================================================================

export default function Checkbox({ id, label, checked, onChange }) {
  return (
    <label htmlFor={id} className="checkbox">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="checkbox__input"
      />
      <span className="checkbox__box" />
      <span className="checkbox__label">{label}</span>
    </label>
  )
}
