import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

vi.mock('src/services/dataAccess', () => ({
  getDocData: vi.fn(),
  setDocData: vi.fn(),
}))
// meritStore derives 功德 from progressStore, which reaches sutraService and
// the Firebase boot module — stub both, as the other store tests do.
vi.mock('src/services/progressService', () => ({
  getProgress: vi.fn(),
  recordRecitation: vi.fn(),
}))
vi.mock('src/services/sutraService', () => ({
  getAllSutras: vi.fn(() => [{ id: 'avatamsaka', totalVolumes: 80 }]),
  getSutraMeta: vi.fn(),
  loadVolume: vi.fn(),
}))

import { getDocData, setDocData } from 'src/services/dataAccess'
import { useHeavenStore } from 'src/stores/heavenStore'
import { useProgressStore } from 'src/stores/progressStore'
import type { SutraProgress } from 'src/types/sutra'

// Seed lifetime 功德 = total 遍 recited/memorised across sutras.
function setMerit(vols: number) {
  const progress = useProgressStore()
  const volumes: SutraProgress['volumes'] = {}
  for (let i = 0; i < vols; i++) {
    volumes[`v${i}-recite`] = { count: 1, lastRead: '2026-06-01T00:00:00Z' }
  }
  progress.progressMap['avatamsaka'] = {
    sutraId: 'avatamsaka',
    volumes,
    totalCompleted: vols,
    isFullyComplete: false,
  }
}

describe('heavenStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    vi.mocked(getDocData).mockResolvedValue(null)
    vi.mocked(setDocData).mockResolvedValue(undefined)
  })

  it('starts at the ruined 娑婆 with no merit', async () => {
    const store = useHeavenStore()
    await store.load()
    expect(store.tier).toBe(0)
    expect(store.maxTier).toBe(0)
    expect(store.heaven.name).toBe('娑婆穢土')
    expect(store.earned).toBe(0)
  })

  it('meritForTier climbs and gates each heaven', () => {
    const store = useHeavenStore()
    expect(store.meritForTier(0)).toBe(0)
    expect(store.meritForTier(1)).toBe(4) // 1*(1+3)
    expect(store.meritForTier(2)).toBe(10) // 2*(2+3)
    expect(store.meritForTier(3)).toBe(18)
  })

  it('maxTier rises automatically as 功德 accumulates', async () => {
    setMerit(10) // opens tier 1 (4) and tier 2 (10), not tier 3 (18)
    const store = useHeavenStore()
    await store.load()
    expect(store.maxTier).toBe(2)
  })

  it('opens on the highest heaven reached and goTo clamps to it', async () => {
    setMerit(10) // opens tier 2
    const store = useHeavenStore()
    await store.load()
    expect(store.tier).toBe(2) // load opens on the highest reached
    await store.goTo(5) // beyond maxTier — ignored
    expect(store.tier).toBe(2)
    await store.goTo(1) // look back at a lower heaven
    expect(store.tier).toBe(1)
  })

  it('atTop only when merit has opened the final heaven', async () => {
    setMerit(100000)
    const store = useHeavenStore()
    await store.load()
    expect(store.atTop).toBe(true)
  })
})
