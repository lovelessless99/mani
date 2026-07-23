import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

vi.mock('src/services/dedicationService', () => ({
  getAllDedications: vi.fn(),
  createDedication: vi.fn(),
}))

import { getAllDedications, createDedication } from 'src/services/dedicationService'
import { useDedicationStore } from 'src/stores/dedicationStore'
import type { DedicationRecord } from 'src/types/dedication'

function makeRecord(over: Partial<DedicationRecord> = {}): DedicationRecord {
  return {
    id: 'd1',
    dedicatedAt: '2026-07-01T00:00:00.000Z',
    verseId: 'universal',
    targetId: 'all',
    targetName: '法界一切眾生',
    snapshot: { recite: 10, memorize: 4 },
    merit: { recite: 10, memorize: 4 },
    ...over,
  }
}

describe('dedicationStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('starts with no records', () => {
    const store = useDedicationStore()
    expect(store.history).toEqual([])
    expect(store.latest).toBeNull()
  })

  it('loadDedications populates records', async () => {
    vi.mocked(getAllDedications).mockResolvedValueOnce([makeRecord()])
    const store = useDedicationStore()
    await store.loadDedications()
    expect(store.history).toHaveLength(1)
  })

  it('history is newest first and latest is the most recent', async () => {
    vi.mocked(getAllDedications).mockResolvedValueOnce([
      makeRecord({ id: 'old', dedicatedAt: '2026-07-01T00:00:00.000Z' }),
      makeRecord({ id: 'new', dedicatedAt: '2026-07-20T00:00:00.000Z' }),
    ])
    const store = useDedicationStore()
    await store.loadDedications()
    expect(store.history.map((r) => r.id)).toEqual(['new', 'old'])
    expect(store.latest?.id).toBe('new')
  })

  it('pendingMerit is the full total when nothing has been dedicated', () => {
    const store = useDedicationStore()
    expect(store.pendingMerit({ recite: 12, memorize: 3 })).toEqual({
      recite: 12,
      memorize: 3,
    })
  })

  it('pendingMerit subtracts the latest snapshot', async () => {
    vi.mocked(getAllDedications).mockResolvedValueOnce([
      makeRecord({ snapshot: { recite: 10, memorize: 4 } }),
    ])
    const store = useDedicationStore()
    await store.loadDedications()
    expect(store.pendingMerit({ recite: 17, memorize: 4 })).toEqual({
      recite: 7,
      memorize: 0,
    })
  })

  it('pendingMerit never goes negative when totals trail the snapshot', async () => {
    vi.mocked(getAllDedications).mockResolvedValueOnce([
      makeRecord({ snapshot: { recite: 50, memorize: 20 } }),
    ])
    const store = useDedicationStore()
    await store.loadDedications()
    expect(store.pendingMerit({ recite: 10, memorize: 5 })).toEqual({
      recite: 0,
      memorize: 0,
    })
  })

  it('dedicate records the merit since the last snapshot and keeps the new totals', async () => {
    vi.mocked(getAllDedications).mockResolvedValueOnce([
      makeRecord({ snapshot: { recite: 10, memorize: 4 } }),
    ])
    vi.mocked(createDedication).mockImplementationOnce(async (input) => ({
      id: 'd2',
      ...input,
    }))

    const store = useDedicationStore()
    await store.loadDedications()

    const record = await store.dedicate({
      verseId: 'pureland',
      targetId: 'all',
      targetName: '法界一切眾生',
      totals: { recite: 25, memorize: 9 },
    })

    expect(record.merit).toEqual({ recite: 15, memorize: 5 })
    expect(record.snapshot).toEqual({ recite: 25, memorize: 9 })
    expect(store.latest?.id).toBe('d2')
  })

  it('dedicating twice with no practice in between yields zero merit', async () => {
    vi.mocked(getAllDedications).mockResolvedValueOnce([])
    vi.mocked(createDedication).mockImplementation(async (input) => ({
      id: `d-${Math.random()}`,
      ...input,
    }))

    const store = useDedicationStore()
    await store.loadDedications()

    await store.dedicate({
      verseId: 'universal',
      targetId: 'all',
      targetName: '法界一切眾生',
      totals: { recite: 8, memorize: 2 },
    })
    const second = await store.dedicate({
      verseId: 'universal',
      targetId: 'all',
      targetName: '法界一切眾生',
      totals: { recite: 8, memorize: 2 },
    })

    expect(second.merit).toEqual({ recite: 0, memorize: 0 })
  })
})
