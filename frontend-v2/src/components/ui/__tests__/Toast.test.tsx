import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Toast from '../Toast';

describe('Toast', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('renders the title', () => {
    render(<Toast id="1" type="success" title="Succès !" onDismiss={vi.fn()} />);
    expect(screen.getByText('Succès !')).toBeInTheDocument();
  });

  it('renders description when provided', () => {
    render(
      <Toast id="1" type="info" title="Info" description="Détail info" onDismiss={vi.fn()} />
    );
    expect(screen.getByText('Détail info')).toBeInTheDocument();
  });

  it('does not render description when omitted', () => {
    render(<Toast id="1" type="info" title="Sans description" onDismiss={vi.fn()} />);
    expect(screen.queryByText('Détail info')).not.toBeInTheDocument();
  });

  it('has role="alert" for screen readers', () => {
    render(<Toast id="1" type="success" title="OK" onDismiss={vi.fn()} />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('calls onDismiss with the id when close button is clicked', () => {
    const handleDismiss = vi.fn();
    render(<Toast id="toast-42" type="error" title="Erreur" onDismiss={handleDismiss} />);
    fireEvent.click(screen.getByRole('button', { name: /fermer/i }));
    expect(handleDismiss).toHaveBeenCalledWith('toast-42');
  });

  it('auto-dismisses after the specified duration', () => {
    const handleDismiss = vi.fn();
    render(
      <Toast id="toast-1" type="success" title="OK" duration={3000} onDismiss={handleDismiss} />
    );
    act(() => vi.advanceTimersByTime(3000));
    expect(handleDismiss).toHaveBeenCalledWith('toast-1');
  });

  it('does not auto-dismiss when duration=0', () => {
    const handleDismiss = vi.fn();
    render(
      <Toast id="toast-1" type="success" title="Persist" duration={0} onDismiss={handleDismiss} />
    );
    act(() => vi.advanceTimersByTime(10000));
    expect(handleDismiss).not.toHaveBeenCalled();
  });

  it('uses default duration of 4000ms', () => {
    const handleDismiss = vi.fn();
    render(<Toast id="t1" type="warning" title="Warning" onDismiss={handleDismiss} />);
    act(() => vi.advanceTimersByTime(3999));
    expect(handleDismiss).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1));
    expect(handleDismiss).toHaveBeenCalledWith('t1');
  });

  it.each(['success', 'error', 'warning', 'info'] as const)(
    'renders type="%s" without error',
    (type) => {
      render(<Toast id={type} type={type} title={`Toast ${type}`} onDismiss={vi.fn()} />);
      expect(screen.getByText(`Toast ${type}`)).toBeInTheDocument();
    }
  );
});
