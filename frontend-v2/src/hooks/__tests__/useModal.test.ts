import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, afterEach } from 'vitest';
import { useModal } from '../useModal';

describe('useModal', () => {
  afterEach(() => {
    // Reset body overflow after each test
    document.body.style.overflow = '';
  });

  it('starts closed by default', () => {
    const { result } = renderHook(() => useModal());
    expect(result.current.isOpen).toBe(false);
  });

  it('starts open when initialOpen=true', () => {
    const { result } = renderHook(() => useModal(true));
    expect(result.current.isOpen).toBe(true);
  });

  it('open() sets isOpen to true and locks body scroll', () => {
    const { result } = renderHook(() => useModal());
    act(() => result.current.open());
    expect(result.current.isOpen).toBe(true);
    expect(document.body.style.overflow).toBe('hidden');
  });

  it('close() sets isOpen to false and unlocks body scroll', () => {
    const { result } = renderHook(() => useModal(true));
    act(() => result.current.close());
    expect(result.current.isOpen).toBe(false);
    expect(document.body.style.overflow).toBe('');
  });

  it('toggle() opens when closed', () => {
    const { result } = renderHook(() => useModal());
    act(() => result.current.toggle());
    expect(result.current.isOpen).toBe(true);
    expect(document.body.style.overflow).toBe('hidden');
  });

  it('toggle() closes when open', () => {
    const { result } = renderHook(() => useModal(true));
    act(() => result.current.toggle());
    expect(result.current.isOpen).toBe(false);
    expect(document.body.style.overflow).toBe('');
  });

  it('open then close cycles correctly', () => {
    const { result } = renderHook(() => useModal());
    act(() => result.current.open());
    expect(result.current.isOpen).toBe(true);
    act(() => result.current.close());
    expect(result.current.isOpen).toBe(false);
  });

  it('restores body overflow on unmount', () => {
    const { result, unmount } = renderHook(() => useModal());
    act(() => result.current.open());
    expect(document.body.style.overflow).toBe('hidden');
    unmount();
    expect(document.body.style.overflow).toBe('');
  });
});
