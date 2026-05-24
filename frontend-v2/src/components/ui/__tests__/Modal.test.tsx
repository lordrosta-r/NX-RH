import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import Modal from '../Modal';

describe('Modal', () => {
  it('renders nothing when isOpen=false', () => {
    render(
      <Modal isOpen={false} onClose={vi.fn()} title="Test Modal">
        <p>Content</p>
      </Modal>
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders content when isOpen=true', () => {
    render(
      <Modal isOpen={true} onClose={vi.fn()} title="Test Modal">
        <p>Contenu modal</p>
      </Modal>
    );
    expect(screen.getByText('Contenu modal')).toBeInTheDocument();
  });

  it('displays the title', () => {
    render(
      <Modal isOpen={true} onClose={vi.fn()} title="Mon Titre">
        <p>Content</p>
      </Modal>
    );
    expect(screen.getByText('Mon Titre')).toBeInTheDocument();
  });

  it('has role="dialog" and aria-modal="true"', () => {
    render(
      <Modal isOpen={true} onClose={vi.fn()} title="Test">
        <p>Content</p>
      </Modal>
    );
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
  });

  it('is labelled by the title (aria-labelledby)', () => {
    render(
      <Modal isOpen={true} onClose={vi.fn()} title="Titre accessible">
        <p>Content</p>
      </Modal>
    );
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-labelledby', 'modal-title');
  });

  it('calls onClose when close button is clicked', async () => {
    const user = userEvent.setup();
    const handleClose = vi.fn();
    render(
      <Modal isOpen={true} onClose={handleClose} title="Test">
        <p>Content</p>
      </Modal>
    );
    await user.click(screen.getByRole('button', { name: /fermer/i }));
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when backdrop is clicked', () => {
    const handleClose = vi.fn();
    const { container } = render(
      <Modal isOpen={true} onClose={handleClose} title="Test">
        <p>Content</p>
      </Modal>
    );
    const backdrop = container.querySelector('[role="dialog"] > [aria-hidden]');
    if (backdrop) fireEvent.click(backdrop);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when Escape key is pressed', () => {
    const handleClose = vi.fn();
    render(
      <Modal isOpen={true} onClose={handleClose} title="Test">
        <p>Content</p>
      </Modal>
    );
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('renders footer when provided', () => {
    render(
      <Modal
        isOpen={true}
        onClose={vi.fn()}
        title="Test"
        footer={<button>Confirmer</button>}
      >
        <p>Content</p>
      </Modal>
    );
    expect(screen.getByText('Confirmer')).toBeInTheDocument();
  });

  it('does not render footer when not provided', () => {
    render(
      <Modal isOpen={true} onClose={vi.fn()} title="Test">
        <p>Content</p>
      </Modal>
    );
    // Only the close button should be present
    expect(screen.getAllByRole('button')).toHaveLength(1);
  });
});
