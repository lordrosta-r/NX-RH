import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import Checkbox from '../../components/ui/Checkbox.jsx'

// =============================================================================
// Tests — components/ui/Checkbox.jsx
// =============================================================================

describe('Checkbox', () => {
  describe('rendering', () => {
    it('renders label text', () => {
      render(<Checkbox id="ck" label="Remember me" checked={false} onChange={() => {}} />)
      expect(screen.getByText('Remember me')).toBeInTheDocument()
    })

    it('renders a checkbox input', () => {
      render(<Checkbox id="ck" label="Option" checked={false} onChange={() => {}} />)
      expect(screen.getByRole('checkbox')).toBeInTheDocument()
    })

    it('associates label with checkbox via htmlFor/id', () => {
      render(<Checkbox id="ck-agree" label="I agree" checked={false} onChange={() => {}} />)
      expect(screen.getByLabelText('I agree')).toBeInTheDocument()
    })
  })

  describe('checked state', () => {
    it('is unchecked when checked=false', () => {
      render(<Checkbox id="ck" label="Option" checked={false} onChange={() => {}} />)
      expect(screen.getByRole('checkbox')).not.toBeChecked()
    })

    it('is checked when checked=true', () => {
      render(<Checkbox id="ck" label="Option" checked={true} onChange={() => {}} />)
      expect(screen.getByRole('checkbox')).toBeChecked()
    })
  })

  describe('onChange', () => {
    it('calls onChange when clicked', () => {
      const handler = vi.fn()
      render(<Checkbox id="ck" label="Option" checked={false} onChange={handler} />)
      fireEvent.click(screen.getByRole('checkbox'))
      expect(handler).toHaveBeenCalledTimes(1)
    })

    it('passes the event to onChange', () => {
      const handler = vi.fn()
      render(<Checkbox id="ck" label="Option" checked={false} onChange={handler} />)
      fireEvent.click(screen.getByRole('checkbox'))
      expect(handler).toHaveBeenCalledWith(expect.any(Object))
    })
  })

  describe('structure', () => {
    it('wraps everything in a <label>', () => {
      const { container } = render(<Checkbox id="ck" label="Option" checked={false} onChange={() => {}} />)
      const label = container.firstChild
      expect(label.tagName).toBe('LABEL')
      expect(label).toHaveClass('checkbox')
    })

    it('renders the custom checkbox box span', () => {
      const { container } = render(<Checkbox id="ck" label="Option" checked={false} onChange={() => {}} />)
      expect(container.querySelector('.checkbox__box')).toBeInTheDocument()
    })

    it('renders label text in a span', () => {
      const { container } = render(<Checkbox id="ck" label="My label" checked={false} onChange={() => {}} />)
      const labelSpan = container.querySelector('.checkbox__label')
      expect(labelSpan).toBeInTheDocument()
      expect(labelSpan.textContent).toBe('My label')
    })
  })
})
