import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import Button from '../../components/ui/Button.jsx'

// =============================================================================
// Tests — components/ui/Button.jsx
// =============================================================================

describe('Button', () => {
  describe('rendering', () => {
    it('renders children text', () => {
      render(<Button>Click me</Button>)
      expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument()
    })

    it('default type is "button"', () => {
      render(<Button>Test</Button>)
      expect(screen.getByRole('button')).toHaveAttribute('type', 'button')
    })

    it('renders type="submit" when specified', () => {
      render(<Button type="submit">Submit</Button>)
      expect(screen.getByRole('button')).toHaveAttribute('type', 'submit')
    })

    it('applies primary variant class by default', () => {
      render(<Button>Primary</Button>)
      expect(screen.getByRole('button')).toHaveClass('btn--primary')
    })

    it('applies secondary variant class', () => {
      render(<Button variant="secondary">Secondary</Button>)
      expect(screen.getByRole('button')).toHaveClass('btn--secondary')
    })

    it('applies danger variant class', () => {
      render(<Button variant="danger">Delete</Button>)
      expect(screen.getByRole('button')).toHaveClass('btn--danger')
    })

    it('applies ghost variant class', () => {
      render(<Button variant="ghost">Ghost</Button>)
      expect(screen.getByRole('button')).toHaveClass('btn--ghost')
    })

    it('applies md size class by default', () => {
      render(<Button>MD</Button>)
      expect(screen.getByRole('button')).toHaveClass('btn--md')
    })

    it('applies sm size class', () => {
      render(<Button size="sm">Small</Button>)
      expect(screen.getByRole('button')).toHaveClass('btn--sm')
    })

    it('adds btn--full class when fullWidth is true', () => {
      render(<Button fullWidth>Full</Button>)
      expect(screen.getByRole('button')).toHaveClass('btn--full')
    })

    it('does not add btn--full class by default', () => {
      render(<Button>Normal</Button>)
      expect(screen.getByRole('button')).not.toHaveClass('btn--full')
    })

    it('always has base "btn" class', () => {
      render(<Button>Base</Button>)
      expect(screen.getByRole('button')).toHaveClass('btn')
    })
  })

  describe('disabled state', () => {
    it('is disabled when disabled prop is true', () => {
      render(<Button disabled>Disabled</Button>)
      expect(screen.getByRole('button')).toBeDisabled()
    })

    it('is enabled by default', () => {
      render(<Button>Enabled</Button>)
      expect(screen.getByRole('button')).not.toBeDisabled()
    })
  })

  describe('loading state', () => {
    it('is disabled when loading is true', () => {
      render(<Button loading>Loading</Button>)
      expect(screen.getByRole('button')).toBeDisabled()
    })

    it('shows spinner when loading', () => {
      render(<Button loading>Loading</Button>)
      expect(document.querySelector('.btn__spinner')).toBeInTheDocument()
    })

    it('hides spinner when not loading', () => {
      render(<Button>Normal</Button>)
      expect(document.querySelector('.btn__spinner')).not.toBeInTheDocument()
    })

    it('sets aria-busy when loading', () => {
      render(<Button loading>Loading</Button>)
      expect(screen.getByRole('button')).toHaveAttribute('aria-busy', 'true')
    })

    it('does not set aria-busy when not loading', () => {
      render(<Button>Normal</Button>)
      expect(screen.getByRole('button')).not.toHaveAttribute('aria-busy')
    })
  })

  describe('click handler', () => {
    it('calls onClick when clicked', () => {
      const handler = vi.fn()
      render(<Button onClick={handler}>Click</Button>)
      fireEvent.click(screen.getByRole('button'))
      expect(handler).toHaveBeenCalledTimes(1)
    })

    it('does not call onClick when disabled', () => {
      const handler = vi.fn()
      render(<Button onClick={handler} disabled>Disabled</Button>)
      fireEvent.click(screen.getByRole('button'))
      expect(handler).not.toHaveBeenCalled()
    })

    it('does not call onClick when loading', () => {
      const handler = vi.fn()
      render(<Button onClick={handler} loading>Loading</Button>)
      fireEvent.click(screen.getByRole('button'))
      expect(handler).not.toHaveBeenCalled()
    })
  })

  describe('extra props spread', () => {
    it('passes aria-label through rest props', () => {
      render(<Button aria-label="custom label">Icon</Button>)
      expect(screen.getByRole('button', { name: 'custom label' })).toBeInTheDocument()
    })

    it('passes data attributes through rest props', () => {
      render(<Button data-testid="my-btn">Test</Button>)
      expect(screen.getByTestId('my-btn')).toBeInTheDocument()
    })
  })
})
