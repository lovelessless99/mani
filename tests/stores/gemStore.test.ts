import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

vi.mock('src/services/gemService', () => ({
  getAllGems: vi.fn(),
  createGem: vi.fn(),
}))

import { getAllGems, createGem } from 'src/services/gemService'
import { useGemStore } from 'src/stores/gemStore'
import type { GemRecord } from 'src/types/gem'

const mockGem: GemRecord = {
  id: 'gem-1',
  earnedAt: '2026-06-03T00:00:00Z',
  source: 'sutra_volume',
  sourceRef: 'avatamsaka/001',
  buddhaId: 'b001',
  constellationId: 'c001',
  params: {
    colorHex: '#9b59b6',
    transmission: 0.9,
    iridescence: 0.5,
    iridescenceIOR: 1.5,
    roughness: 0.05,
    geometry: 'octahedron',
  },
}

describe('gemStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('gemsMap is empty initially', () => {
    const store = useGemStore()
    expect(Object.keys(store.gemsMap)).toHaveLength(0)
  })

  it('loadGems populates gemsMap', async () => {
    vi.mocked(getAllGems).mockResolvedValueOnce([mockGem])
    const store = useGemStore()
    await store.loadGems()
    expect(store.gemsMap['gem-1']).toEqual(mockGem)
  })

  it('hasGemForVolume returns false when no gem exists', () => {
    const store = useGemStore()
    expect(store.hasGemForVolume('avatamsaka', '001')).toBe(false)
  })

  it('hasGemForVolume returns true after gem earned', async () => {
    vi.mocked(getAllGems).mockResolvedValueOnce([mockGem])
    const store = useGemStore()
    await store.loadGems()
    expect(store.hasGemForVolume('avatamsaka', '001')).toBe(true)
  })

  it('earnGem creates gem and adds to gemsMap', async () => {
    vi.mocked(createGem).mockResolvedValueOnce(mockGem)
    const store = useGemStore()
    const gem = await store.earnGem({
      source: 'sutra_volume',
      sourceRef: 'avatamsaka/001',
      buddhaId: 'b001',
      constellationId: 'c001',
    })
    expect(gem.id).toBe('gem-1')
    expect(store.gemsMap['gem-1']).toEqual(mockGem)
    expect(store.pendingUnlock).toEqual(mockGem)
  })

  it('clearPendingUnlock removes pendingUnlock', async () => {
    vi.mocked(createGem).mockResolvedValueOnce(mockGem)
    const store = useGemStore()
    await store.earnGem({ source: 'sutra_volume', sourceRef: 'avatamsaka/001' })
    store.clearPendingUnlock()
    expect(store.pendingUnlock).toBeNull()
  })
})
