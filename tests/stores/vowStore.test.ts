import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

vi.mock('src/services/dataAccess', () => ({
  getDocData: vi.fn(),
  setDocData: vi.fn(),
}))

import { getDocData, setDocData } from 'src/services/dataAccess'
import { useVowStore } from 'src/stores/vowStore'

describe('vowStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    vi.mocked(getDocData).mockResolvedValue(null)
    vi.mocked(setDocData).mockResolvedValue(undefined)
  })

  it('has no vow before one is made', async () => {
    const v = useVowStore()
    await v.load()
    expect(v.vow).toBeNull()
    expect(v.active).toBe(false)
  })

  it('setVow creates an active vow at zero progress', async () => {
    const v = useVowStore()
    await v.setVow('先父 王公', 1000, 'medicine-buddha')
    expect(v.active).toBe(true)
    expect(v.vow?.goal).toBe(1000)
    expect(v.vow?.progress).toBe(0)
    expect(v.ratio).toBe(0)
    expect(v.remaining).toBe(1000)
  })

  it('addProgress accumulates and reports fulfilment only when the goal is met', async () => {
    const v = useVowStore()
    await v.setVow('母親', 100, 'universal')

    expect(await v.addProgress(40)).toBe(false)
    expect(v.vow?.progress).toBe(40)
    expect(v.ratio).toBeCloseTo(0.4)
    expect(v.remaining).toBe(60)
    expect(v.active).toBe(true)

    expect(await v.addProgress(60)).toBe(true)
    expect(v.vow?.fulfilledAt).toBeTruthy()
    expect(v.active).toBe(false)
    expect(v.justFulfilled).toBe(true)
    expect(v.ratio).toBe(1)
  })

  it('ratio never exceeds one even when progress overshoots', async () => {
    const v = useVowStore()
    await v.setVow('眾生', 10, 'universal')
    await v.addProgress(25)
    expect(v.ratio).toBe(1)
    expect(v.remaining).toBe(0)
  })

  it('addProgress on a fulfilled vow does nothing', async () => {
    const v = useVowStore()
    await v.setVow('眾生', 10, 'universal')
    await v.addProgress(10) // fulfils
    const before = v.vow?.progress
    expect(await v.addProgress(5)).toBe(false)
    expect(v.vow?.progress).toBe(before)
  })

  it('non-positive merit is ignored', async () => {
    const v = useVowStore()
    await v.setVow('眾生', 10, 'universal')
    expect(await v.addProgress(0)).toBe(false)
    expect(v.vow?.progress).toBe(0)
  })

  it('clear removes the vow', async () => {
    const v = useVowStore()
    await v.setVow('眾生', 10, 'universal')
    await v.clear()
    expect(v.vow).toBeNull()
    expect(v.active).toBe(false)
    expect(setDocData).toHaveBeenLastCalledWith('stats', 'vow', {})
  })
})
