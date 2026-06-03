import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

vi.mock('src/services/progressService', () => ({
  getProgress: vi.fn(),
  recordRecitation: vi.fn(),
}))

vi.mock('src/services/sutraService', () => ({
  getAllSutras: vi.fn(() => [
    { id: 'heart-sutra', titleZh: '心經', totalVolumes: 1, storageType: 'bundled', titleEn: '', description: '' },
    { id: 'avatamsaka', titleZh: '華嚴經', totalVolumes: 80, storageType: 'remote', titleEn: '', description: '' },
  ]),
}))

import { recordRecitation } from 'src/services/progressService'
import { useProgressStore } from 'src/stores/progressStore'

describe('progressStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('getSutraCompletionRatio returns 0 when no progress loaded', () => {
    const store = useProgressStore()
    expect(store.getSutraCompletionRatio('avatamsaka')).toBe(0)
  })

  it('getVolumeCount returns 0 for unknown volume', () => {
    const store = useProgressStore()
    expect(store.getVolumeCount('avatamsaka', '001')).toBe(0)
  })

  it('markVolumeComplete updates progressMap', async () => {
    const updated = {
      sutraId: 'heart-sutra',
      volumes: { '001': { count: 1, lastRead: '2026-06-03T00:00:00.000Z' } },
      totalCompleted: 1,
      isFullyComplete: true,
    }
    vi.mocked(recordRecitation).mockResolvedValueOnce(updated)

    const store = useProgressStore()
    await store.markVolumeComplete('heart-sutra', '001')

    expect(store.getVolumeCount('heart-sutra', '001')).toBe(1)
    expect(store.getSutraCompletionRatio('heart-sutra')).toBe(1)
  })
})
