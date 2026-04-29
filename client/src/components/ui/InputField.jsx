import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'


// =============================================================================
// InputField — Minimalist Tray input
// Design spec: docs/design/login/DESIGN.md § Components > Input Fields
//
// Props:
//   id                  {string}   — links label to input (required for a11y)
//   label               {string}   — ALL CAPS label text
//   type                {string}   — input type (default: 'text')
//   placeholder         {string}
//   value               {string}
//   onChange            {function}
//   autoComplete        {string}
//   error               {boolean}  — activates error state styling
//   errorMessage        {string}   — error text shown below input
//   disabled            {boolean}  — disables the input
//   required            {boolean}  — marks field as required (label asterisk + aria)
//   labelShowPassword   {string}   — aria-label for the show-password toggle button
//   labelHidePassword   {string}   — aria-label for the hide-password toggle button
// =============================================================================

export default function InputField({
  id,
  label,
  type              = 'text',
  placeholder       = '',
  value,
  onChange,
  autoComplete,
  error             = false,
  errorMessage      = null,
  disabled          = false,
  required          = false,
  labelShowPassword = 'Show password',
  labelHidePassword = 'Hide password',
}) {
  const [showPassword, setShowPassword] = useState(false)
  const isPassword = type === 'password'
  const inputType  = isPassword ? (showPassword ? 'text' : 'password') : type

  return (
    <div className={`input-field${error ? ' input-field--error' : ''}${disabled ? ' input-field--disabled' : ''}`}>
      <label className="input-field__label" htmlFor={id}>
        {label}
        {required && <span className="input-field__required" aria-hidden="true"> *</span>}
      </label>
      <div className="input-field__wrapper">
        <input
          id={id}
          type={inputType}
          className="input-field__input"
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          autoComplete={autoComplete}
          disabled={disabled}
          required={required}
          aria-required={required}
          aria-invalid={error}
          aria-describedby={errorMessage ? `${id}-error` : undefined}
        />
        {isPassword && (
          <button
            type="button"
            className="input-field__toggle"
            onClick={() => setShowPassword(s => !s)}
            aria-label={showPassword ? labelHidePassword : labelShowPassword}
            tabIndex={0}
          >
            <span aria-hidden="true">
              {showPassword
                ? <EyeOff size={16} color="currentColor" />
                : <Eye    size={16} color="currentColor" />
              }
            </span>
          </button>
        )}
      </div>
      {errorMessage && (
        <p id={`${id}-error`} className="input-field__error-msg" role="alert">
          {errorMessage}
        </p>
      )}
    </div>
  )
}

