import '@testing-library/jest-dom'

// Mock localStorage for all tests
const localStorageMock = (() => {
  let store = {}
  return {
    getItem:   (k) => store[k] ?? null,
    setItem:   (k, v) => { store[k] = String(v) },
    removeItem:(k) => { delete store[k] },
    clear:     () => { store = {} },
  }
})()

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  writable: true,
})
