import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import InputField from '../../components/ui/InputField.jsx'

// =============================================================================
// Tests — components/ui/InputField.jsx
// =============================================================================

describe('InputField', () => {
  describe('rendering', () => {
    it('renders label text', () => {
      render(<InputField id="name" label="Full Name" value="" onChange={() => {}} />)
      expect(screen.getByText('Full Name')).toBeInTheDocument()
    })

    it('associates label with input via htmlFor/id', () => {
      render(<InputField id="email" label="Email" value="" onChange={() => {}} />)
      expect(screen.getByLabelText('Email')).toBeInTheDocument()
    })

    it('renders placeholder text', () => {
      render(<InputField id="search" label="Search" placeholder="Type here..." value="" onChange={() => {}} />)
      expect(screen.getByPlaceholderText('Type here...')).toBeInTheDocument()
    })

    it('renders with default type "text"', () => {
      render(<InputField id="f" label="Field" value="" onChange={() => {}} />)
      expect(screen.getByRole('textbox')).toHaveAttribute('type', 'text')
    })

    it('renders with controlled value', () => {
      render(<InputField id="f" label="Field" value="hello" onChange={() => {}} />)
      expect(screen.getByRole('textbox')).toHaveValue('hello')
    })
  })

  describe('onChange', () => {
    it('calls onChange when value changes', () => {
      const handler = vi.fn()
      render(<InputField id="f" label="Field" value="" onChange={handler} />)
      fireEvent.change(screen.getByRole('textbox'), { target: { value: 'new' } })
      expect(handler).toHaveBeenCalledTimes(1)
    })
  })

  describe('disabled state', () => {
    it('disables the input', () => {
      render(<InputField id="f" label="Field" value="" onChange={() => {}} disabled />)
      expect(screen.getByRole('textbox')).toBeDisabled()
    })

    it('adds input-field--disabled class to wrapper', () => {
      const { container } = render(<InputField id="f" label="Field" value="" onChange={() => {}} disabled />)
      expect(container.firstChild).toHaveClass('input-field--disabled')
    })
  })

  describe('required state', () => {
    it('marks input as required', () => {
      render(<InputField id="f" label="Field" value="" onChange={() => {}} required />)
      expect(screen.getByRole('textbox')).toBeRequired()
    })

    it('sets aria-required on input', () => {
      render(<InputField id="f" label="Field" value="" onChange={() => {}} required />)
      expect(screen.getByRole('textbox')).toHaveAttribute('aria-required', 'true')
    })

    it('renders asterisk indicator in label', () => {
      render(<InputField id="f" label="Field" value="" onChange={() => {}} required />)
      expect(screen.getByText('*')).toBeInTheDocument()
    })
  })

  describe('error state', () => {
    it('adds input-field--error class to wrapper', () => {
      const { container } = render(<InputField id="f" label="Field" value="" onChange={() => {}} error />)
      expect(container.firstChild).toHaveClass('input-field--error')
    })

    it('renders error message when provided', () => {
      render(<InputField id="f" label="Field" value="" onChange={() => {}} error errorMessage="Required field" />)
      expect(screen.getByText('Required field')).toBeInTheDocument()
    })

    it('error message has role="alert"', () => {
      render(<InputField id="f" label="Field" value="" onChange={() => {}} error errorMessage="Bad input" />)
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })

    it('error message is linked via aria-describedby', () => {
      render(<InputField id="myfield" label="Field" value="" onChange={() => {}} error errorMessage="Bad" />)
      const input = screen.getByRole('textbox')
      expect(input).toHaveAttribute('aria-describedby', 'myfield-error')
      expect(document.getElementById('myfield-error')).toBeInTheDocument()
    })

    it('sets aria-invalid on input when error', () => {
      render(<InputField id="f" label="Field" value="" onChange={() => {}} error />)
      expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'true')
    })
  })

  describe('password type', () => {
    it('renders input with type password', () => {
      render(<InputField id="pwd" label="Password" type="password" value="" onChange={() => {}} />)
      const input = document.getElementById('pwd')
      expect(input).toHaveAttribute('type', 'password')
    })

    it('renders show/hide toggle button for password field', () => {
      render(
        <InputField
          id="pwd"
          label="Password"
          type="password"
          value=""
          onChange={() => {}}
          labelShowPassword="Show password"
          labelHidePassword="Hide password"
        />
      )
      expect(screen.getByRole('button', { name: 'Show password' })).toBeInTheDocument()
    })

    it('toggles to text type when show button clicked', () => {
      render(
        <InputField
          id="pwd"
          label="Password"
          type="password"
          value=""
          onChange={() => {}}
          labelShowPassword="Show password"
          labelHidePassword="Hide password"
        />
      )
      const toggle = screen.getByRole('button', { name: 'Show password' })
      fireEvent.click(toggle)
      expect(document.getElementById('pwd')).toHaveAttribute('type', 'text')
    })

    it('toggles aria-label to hide after showing', () => {
      render(
        <InputField
          id="pwd"
          label="Password"
          type="password"
          value=""
          onChange={() => {}}
          labelShowPassword="Show password"
          labelHidePassword="Hide password"
        />
      )
      fireEvent.click(screen.getByRole('button', { name: 'Show password' }))
      expect(screen.getByRole('button', { name: 'Hide password' })).toBeInTheDocument()
    })

    it('does not render toggle for non-password fields', () => {
      render(<InputField id="txt" label="Text" type="text" value="" onChange={() => {}} />)
      expect(screen.queryByRole('button')).not.toBeInTheDocument()
    })
  })
})
