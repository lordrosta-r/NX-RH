import { describe, it, expect } from 'vitest'

describe('Infrastructure smoke test', () => {
  it('vitest runs correctly', () => {
    expect(1 + 1).toBe(2)
  })

  it('MSW server is available', async () => {
    const { server } = await import('./msw/server')
    expect(server).toBeDefined()
  })
})
