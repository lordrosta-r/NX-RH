import { renderHook, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useConfirm } from '../useConfirm';

const defaultOpts = {
  title: 'Delete item',
  description: 'Are you sure?',
};

describe('useConfirm', () => {
  it('starts with dialog closed', () => {
    const { result } = renderHook(() => useConfirm());
    expect(result.current.confirmState.isOpen).toBe(false);
  });

  it('confirm() opens the dialog with provided options', async () => {
    const { result } = renderHook(() => useConfirm());

    act(() => {
      result.current.confirm(defaultOpts);
    });

    expect(result.current.confirmState.isOpen).toBe(true);
    expect(result.current.confirmState.title).toBe('Delete item');
    expect(result.current.confirmState.description).toBe('Are you sure?');
  });

  it('handleConfirm() resolves the promise with true', async () => {
    const { result } = renderHook(() => useConfirm());

    let promise: Promise<boolean>;
    act(() => {
      promise = result.current.confirm(defaultOpts);
    });

    act(() => {
      result.current.handleConfirm();
    });

    await expect(promise!).resolves.toBe(true);
    expect(result.current.confirmState.isOpen).toBe(false);
  });

  it('handleCancel() resolves the promise with false', async () => {
    const { result } = renderHook(() => useConfirm());

    let promise: Promise<boolean>;
    act(() => {
      promise = result.current.confirm(defaultOpts);
    });

    act(() => {
      result.current.handleCancel();
    });

    await expect(promise!).resolves.toBe(false);
    expect(result.current.confirmState.isOpen).toBe(false);
  });

  it('passes optional confirmLabel and cancelLabel', async () => {
    const { result } = renderHook(() => useConfirm());

    act(() => {
      result.current.confirm({
        ...defaultOpts,
        confirmLabel: 'Yes, delete',
        cancelLabel: 'Keep it',
      });
    });

    expect(result.current.confirmState.confirmLabel).toBe('Yes, delete');
    expect(result.current.confirmState.cancelLabel).toBe('Keep it');
  });

  it('passes danger variant', async () => {
    const { result } = renderHook(() => useConfirm());

    act(() => {
      result.current.confirm({ ...defaultOpts, variant: 'danger' });
    });

    expect(result.current.confirmState.variant).toBe('danger');
  });

  it('can open a second dialog after the first is confirmed', async () => {
    const { result } = renderHook(() => useConfirm());

    let p1: Promise<boolean>;
    act(() => { p1 = result.current.confirm(defaultOpts); });
    act(() => { result.current.handleConfirm(); });
    await expect(p1!).resolves.toBe(true);
    expect(result.current.confirmState.isOpen).toBe(false);

    let p2: Promise<boolean>;
    act(() => { p2 = result.current.confirm({ title: 'Second', description: 'Again?' }); });
    expect(result.current.confirmState.isOpen).toBe(true);
    act(() => { result.current.handleCancel(); });
    await expect(p2!).resolves.toBe(false);
  });
});
