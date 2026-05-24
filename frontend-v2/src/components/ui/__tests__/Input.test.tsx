import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Input from '../Input';

describe('Input', () => {
  it('renders the label', () => {
    render(<Input label="Nom" />);
    expect(screen.getByText('Nom')).toBeInTheDocument();
  });

  it('label is associated with input via htmlFor (getByLabelText)', () => {
    render(<Input label="Email" id="email-input" />);
    const input = screen.getByLabelText('Email');
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('id', 'email-input');
  });

  it('auto-generates id when none provided (label still links to input)', () => {
    render(<Input label="Prénom" />);
    const input = screen.getByLabelText('Prénom');
    expect(input).toBeInTheDocument();
  });

  it('calls onChange when value changes', () => {
    const handleChange = vi.fn();
    render(<Input label="Test" onChange={handleChange} />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'hello' } });
    expect(handleChange).toHaveBeenCalledTimes(1);
  });

  it('displays error message when error is a string', () => {
    render(<Input error="Ce champ est obligatoire" />);
    expect(screen.getByText('Ce champ est obligatoire')).toBeInTheDocument();
  });

  it('sets aria-invalid when error is truthy', () => {
    render(<Input error="Erreur" />);
    expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'true');
  });

  it('does not set aria-invalid when no error', () => {
    render(<Input />);
    expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'false');
  });

  it('is disabled when disabled=true', () => {
    render(<Input disabled />);
    expect(screen.getByRole('textbox')).toBeDisabled();
  });

  it('renders placeholder text', () => {
    render(<Input placeholder="Entrez votre nom" />);
    expect(screen.getByPlaceholderText('Entrez votre nom')).toBeInTheDocument();
  });

  it('displays hint text when provided', () => {
    render(<Input hint="Exemple: jean@email.com" />);
    expect(screen.getByText('Exemple: jean@email.com')).toBeInTheDocument();
  });

  it('does not display hint when error is also set', () => {
    render(<Input hint="Aide" error="Erreur" />);
    expect(screen.queryByText('Aide')).not.toBeInTheDocument();
    expect(screen.getByText('Erreur')).toBeInTheDocument();
  });

  it('shows required asterisk when required prop is set', () => {
    render(<Input label="Nom" required />);
    expect(screen.getByText('*')).toBeInTheDocument();
  });
});
