import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useRef } from 'react';
import { useFocusTrap } from '../useFocusTrap';

describe('useFocusTrap', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('does not throw when isOpen=false', () => {
    expect(() => {
      renderHook(() => {
        const ref = useRef<HTMLDivElement>(null);
        useFocusTrap(ref, false);
      });
    }).not.toThrow();
  });

  it('does not throw when isOpen=true', () => {
    expect(() => {
      renderHook(() => {
        const ref = useRef<HTMLDivElement>(null);
        useFocusTrap(ref, true);
      });
    }).not.toThrow();
  });

  it('accepts a ref object', () => {
    const { result } = renderHook(() => {
      const ref = useRef<HTMLDivElement>(null);
      useFocusTrap(ref, false);
      return ref;
    });
    expect(result.current).toBeDefined();
    expect(result.current).toHaveProperty('current');
  });

  it('saves previous focus and restores it on close', () => {
    const button = document.createElement('button');
    document.body.appendChild(button);
    button.focus();
    expect(document.activeElement).toBe(button);

    const container = document.createElement('div');
    const inner = document.createElement('button');
    container.appendChild(inner);
    document.body.appendChild(container);

    const { rerender, unmount } = renderHook(
      ({ isOpen }) => {
        const ref = { current: container };
        useFocusTrap(ref, isOpen);
      },
      { initialProps: { isOpen: false } }
    );

    rerender({ isOpen: true });
    act(() => vi.advanceTimersByTime(20));
    expect(document.activeElement).toBe(inner);

    rerender({ isOpen: false });
    act(() => vi.advanceTimersByTime(20));
    expect(document.activeElement).toBe(button);

    unmount();
    document.body.removeChild(button);
    document.body.removeChild(container);
  });

  it('traps Tab key within container', () => {
    const container = document.createElement('div');
    const first = document.createElement('button');
    const last = document.createElement('button');
    container.appendChild(first);
    container.appendChild(last);
    document.body.appendChild(container);

    renderHook(() => {
      const ref = { current: container };
      useFocusTrap(ref, true);
    });

    last.focus();
    const tabEvent = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true });
    const preventDefaultSpy = vi.spyOn(tabEvent, 'preventDefault');
    document.dispatchEvent(tabEvent);
    expect(preventDefaultSpy).toHaveBeenCalled();

    document.body.removeChild(container);
  });

  it('traps Shift+Tab key within container', () => {
    const container = document.createElement('div');
    const first = document.createElement('button');
    const last = document.createElement('button');
    container.appendChild(first);
    container.appendChild(last);
    document.body.appendChild(container);

    renderHook(() => {
      const ref = { current: container };
      useFocusTrap(ref, true);
    });

    first.focus();
    const shiftTabEvent = new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true });
    const preventDefaultSpy = vi.spyOn(shiftTabEvent, 'preventDefault');
    document.dispatchEvent(shiftTabEvent);
    expect(preventDefaultSpy).toHaveBeenCalled();

    document.body.removeChild(container);
  });
});
