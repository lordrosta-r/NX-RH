import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useDebounce } from '../useDebounce';

describe('useDebounce', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('returns initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('initial', 400));
    expect(result.current).toBe('initial');
  });

  it('does not update before delay elapses', () => {
    const { result, rerender } = renderHook(({ value }) => useDebounce(value, 400), {
      initialProps: { value: 'initial' },
    });
    rerender({ value: 'updated' });
    act(() => vi.advanceTimersByTime(200));
    expect(result.current).toBe('initial');
  });

  it('updates after delay elapses', () => {
    const { result, rerender } = renderHook(({ value }) => useDebounce(value, 400), {
      initialProps: { value: 'initial' },
    });
    rerender({ value: 'updated' });
    act(() => vi.advanceTimersByTime(400));
    expect(result.current).toBe('updated');
  });

  it('cancels pending update when value changes rapidly', () => {
    const { result, rerender } = renderHook(({ value }) => useDebounce(value, 400), {
      initialProps: { value: 'a' },
    });
    rerender({ value: 'b' });
    act(() => vi.advanceTimersByTime(200));
    rerender({ value: 'c' });
    act(() => vi.advanceTimersByTime(400));
    expect(result.current).toBe('c');
  });

  it('works with number values', () => {
    const { result, rerender } = renderHook(({ value }) => useDebounce(value, 300), {
      initialProps: { value: 0 },
    });
    rerender({ value: 42 });
    act(() => vi.advanceTimersByTime(300));
    expect(result.current).toBe(42);
  });

  it('uses default delay of 400ms', () => {
    const { result, rerender } = renderHook(({ value }) => useDebounce(value), {
      initialProps: { value: 'a' },
    });
    rerender({ value: 'b' });
    act(() => vi.advanceTimersByTime(399));
    expect(result.current).toBe('a');
    act(() => vi.advanceTimersByTime(1));
    expect(result.current).toBe('b');
  });
});
