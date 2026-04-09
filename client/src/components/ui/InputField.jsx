import './InputField.css'

// =============================================================================
// InputField — Minimalist Tray input
// Design spec: docs/design/login/DESIGN.md § Components > Input Fields
//
// Props:
//   id           {string}   — links label to input (required for a11y)
//   label        {string}   — ALL CAPS label text
//   type         {string}   — input type (default: 'text')
//   placeholder  {string}
//   value        {string}
//   onChange     {function}
//   autoComplete {string}
//   error        {boolean}  — activates error state styling
// =============================================================================

export default function InputField({
  id,
  label,
  type         = 'text',
  placeholder  = '',
  value,
  onChange,
  autoComplete,
  error        = false,
}) {
  return (
    <div className={`input-field${error ? ' input-field--error' : ''}`}>
      <label htmlFor={id} className="input-field__label">
        {label}
      </label>
      <div className="input-field__tray">
        <input
          id={id}
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          autoComplete={autoComplete}
          className="input-field__input"
        />
      </div>
    </div>
  )
}
