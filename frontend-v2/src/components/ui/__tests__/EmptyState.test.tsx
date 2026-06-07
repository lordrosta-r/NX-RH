import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import EmptyState from '../EmptyState';

describe('EmptyState', () => {
  it('renders default title and description', () => {
    render(<EmptyState />);
    expect(screen.getByText('Aucun résultat')).toBeInTheDocument();
    expect(screen.getByText("Il n'y a rien à afficher pour le moment.")).toBeInTheDocument();
  });

  it('renders custom title', () => {
    render(<EmptyState title="Aucun employé" />);
    expect(screen.getByText('Aucun employé')).toBeInTheDocument();
  });

  it('renders custom description', () => {
    render(<EmptyState description="Aucun résultat pour ce filtre." />);
    expect(screen.getByText('Aucun résultat pour ce filtre.')).toBeInTheDocument();
  });

  it('renders action button when action object is provided', () => {
    render(<EmptyState action={{ label: 'Ajouter', onClick: vi.fn() }} />);
    expect(screen.getByRole('button', { name: 'Ajouter' })).toBeInTheDocument();
  });

  it('calls onClick when action button is clicked', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();
    render(<EmptyState action={{ label: 'Ajouter', onClick: handleClick }} />);
    await user.click(screen.getByRole('button', { name: 'Ajouter' }));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('renders ReactNode action when passed', () => {
    render(<EmptyState action={<a href="#">Lien action</a>} />);
    expect(screen.getByText('Lien action')).toBeInTheDocument();
  });

  it('renders without action (no button shown)', () => {
    render(<EmptyState />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('renders custom icon when provided', () => {
    render(<EmptyState icon={<span data-testid="custom-icon" />} />);
    expect(screen.getByTestId('custom-icon')).toBeInTheDocument();
  });
});
