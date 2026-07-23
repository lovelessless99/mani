import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

vi.mock('src/services/dataAccess', () => ({
  getDocData: vi.fn(),
  setDocData: vi.fn(),
}))
vi.mock('src/services/gemService', () => ({
  getAllGems: vi.fn(),
  createGem: vi.fn(),
}))

import { getDocData, setDocData } from 'src/services/dataAccess'
import { getAllGems } from 'src/services/gemService'
import { useHeavenStore } from 'src/stores/heavenStore'
import { useGemStore } from 'src/stores/gemStore'
import { useProgressStore } from 'src/stores/progressStore'
import type { GemRecord } from 'src/types/gem'
import type { SutraProgress } from 'src/types/sutra'

// Seed cumulative 華嚴 卷 recited, which now gates the ascent.
function setHuayan(vols: number) {
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

function gems(n: number): GemRecord[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `g${i}`,
    earnedAt: '2026-06-01T00:00:00Z',
    source: 'sutra_volume',
    sourceRef: `k/${i}`,
    params: {
      colorHex: '#4f9dff',
      transmission: 0.8,
      iridescence: 0.4,
      iridescenceIOR: 1.5,
      roughness: 0.03,
      geometry: 'octahedron',
    },
  }))
}

async function withGems(n: number) {
  vi.mocked(getAllGems).mockResolvedValue(gems(n))
  const gemStore = useGemStore()
  await gemStore.loadGems()
  const store = useHeavenStore()
  await store.load()
  return store
}

describe('heavenStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    vi.mocked(getDocData).mockResolvedValue(null)
    vi.mocked(setDocData).mockResolvedValue(undefined)
  })

  it('starts at the ruined 娑婆 with power equal to the gem count', async () => {
    const store = await withGems(10)
    expect(store.tier).toBe(0)
    expect(store.heaven.name).toBe('娑婆穢土')
    expect(store.totalPower).toBe(10)
    expect(store.freePower).toBe(10)
  })

  it('placing a structure allocates its power without destroying gems', async () => {
    const store = await withGems(10)
    await store.place('palace') // cost 8
    expect(store.build.palace).toBe(1)
    expect(store.freePower).toBe(2)
    expect(store.totalPower).toBe(10) // gems untouched
  })

  it('refuses to build beyond available power', async () => {
    const store = await withGems(3)
    const ok = await store.place('palace') // cost 8 > 3
    expect(ok).toBe(false)
    expect(store.build.palace).toBe(0)
    expect(store.freePower).toBe(3)
  })

  it('removing a structure returns its power', async () => {
    const store = await withGems(10)
    await store.place('pagoda') // 4
    expect(store.freePower).toBe(6)
    await store.remove('pagoda')
    expect(store.build.pagoda).toBe(0)
    expect(store.freePower).toBe(10)
  })

  it('ascent is gated by 華嚴 recitation, not by building', async () => {
    const store = await withGems(20)
    expect(store.nextNeed).toBe(3) // tier 0 → 1 needs 3 卷
    expect(store.canAscend).toBe(false)
    await store.place('pagoda') // building alone does not open the ascent
    expect(store.canAscend).toBe(false)
    setHuayan(3)
    expect(store.canAscend).toBe(true)
  })

  it('ascend moves up a heaven and raises the ceiling', async () => {
    const store = await withGems(20)
    setHuayan(3)
    const ok = await store.ascend()
    expect(ok).toBe(true)
    expect(store.tier).toBe(1)
    expect(store.maxTier).toBe(1)
    expect(store.heaven.name).toBe('四天王天')
  })

  it('lightLamp kindles one more lamp each call', async () => {
    const store = await withGems(5)
    expect(store.litLamps).toBe(0)
    await store.lightLamp()
    await store.lightLamp()
    expect(store.litLamps).toBe(2)
  })

  it('cannot navigate above the highest unlocked heaven', async () => {
    const store = await withGems(20)
    await store.goTo(5)
    expect(store.tier).toBe(0) // maxTier still 0
  })
})
