import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

vi.mock('src/services/dataAccess', () => ({
  getDocData: vi.fn(),
  setDocData: vi.fn(),
}))

import { getDocData, setDocData } from 'src/services/dataAccess'
import { useStreakStore } from 'src/stores/streakStore'

function at(dateStr: string) {
  vi.setSystemTime(new Date(dateStr))
}

describe('streakStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    vi.useFakeTimers()
    vi.mocked(getDocData).mockResolvedValue(null)
    vi.mocked(setDocData).mockResolvedValue(undefined)
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('first touch starts the streak at one', async () => {
    at('2026-07-21T09:00:00')
    const s = useStreakStore()
    const delta = await s.touchToday()
    expect(delta).toBe(1)
    expect(s.count).toBe(1)
    expect(s.best).toBe(1)
    expect(s.total).toBe(1)
  })

  it('a second touch the same day is a no-op', async () => {
    at('2026-07-21T09:00:00')
    const s = useStreakStore()
    await s.touchToday()
    at('2026-07-21T22:00:00')
    const delta = await s.touchToday()
    expect(delta).toBe(0)
    expect(s.count).toBe(1)
  })

  it('a touch the next day extends the streak', async () => {
    at('2026-07-21T09:00:00')
    const s = useStreakStore()
    await s.touchToday()
    at('2026-07-22T08:00:00')
    await s.touchToday()
    expect(s.count).toBe(2)
    expect(s.best).toBe(2)
    expect(s.total).toBe(2)
  })

  it('missing a day resets the streak but keeps the best', async () => {
    at('2026-07-21T09:00:00')
    const s = useStreakStore()
    await s.touchToday()
    at('2026-07-22T09:00:00')
    await s.touchToday() // count 2
    at('2026-07-25T09:00:00') // skipped 23, 24
    await s.touchToday()
    expect(s.count).toBe(1)
    expect(s.best).toBe(2)
    expect(s.total).toBe(3)
  })

  it('a lapsed streak reads as broken and shows zero until the next touch', async () => {
    at('2026-07-21T09:00:00')
    const s = useStreakStore()
    await s.touchToday()
    // Two days later, before any new touch
    at('2026-07-23T09:00:00')
    expect(s.isBroken).toBe(true)
    expect(s.shownCount).toBe(0)
    expect(s.count).toBe(1) // raw value untouched until the next touch
  })

  it('the seed stage advances with the streak length', async () => {
    at('2026-07-01T09:00:00')
    const s = useStreakStore()
    // Walk seven consecutive days
    for (let d = 1; d <= 7; d++) {
      at(`2026-07-0${d}T09:00:00`)
      await s.touchToday()
    }
    expect(s.count).toBe(7)
    expect(s.stage.name).toBe('幼苗')
  })
})
