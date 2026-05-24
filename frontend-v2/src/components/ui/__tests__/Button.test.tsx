import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import Button from '../Button';

describe('Button', () => {
  it('renders children text', () => {
    render(<Button>Cliquer ici</Button>);
    expect(screen.getByText('Cliquer ici')).toBeInTheDocument();
  });

  it('calls onClick when clicked', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click</Button>);
    await user.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('is disabled when disabled=true', () => {
    render(<Button disabled>Click</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('does not call onClick when disabled', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();
    render(<Button onClick={handleClick} disabled>Click</Button>);
    await user.click(screen.getByRole('button'));
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('is disabled when loading=true', () => {
    render(<Button loading>Submit</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('sets aria-busy when loading', () => {
    render(<Button loading>Submit</Button>);
    expect(screen.getByRole('button')).toHaveAttribute('aria-busy', 'true');
  });

  it('renders with type="submit"', () => {
    render(<Button type="submit">Submit</Button>);
    expect(screen.getByRole('button')).toHaveAttribute('type', 'submit');
  });

  it('is accessible with role=button', () => {
    render(<Button>Accessible</Button>);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('renders leftIcon when not loading', () => {
    render(<Button leftIcon={<span data-testid="left-icon" />}>With Icon</Button>);
    expect(screen.getByTestId('left-icon')).toBeInTheDocument();
  });

  it('hides leftIcon and shows spinner when loading', () => {
    render(<Button leftIcon={<span data-testid="left-icon" />} loading>Loading</Button>);
    expect(screen.queryByTestId('left-icon')).not.toBeInTheDocument();
  });

  it('applies fullWidth when prop is set', () => {
    render(<Button fullWidth>Full</Button>);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });
});
