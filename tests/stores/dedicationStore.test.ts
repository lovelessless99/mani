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
    merit: 14,
    ...over,
  }
}

describe('dedicationStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('starts with no lamps', () => {
    const store = useDedicationStore()
    expect(store.history).toEqual([])
    expect(store.latest).toBeNull()
    expect(store.totalGiven).toBe(0)
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

  it('totalGiven sums the merit of every lamp', async () => {
    vi.mocked(getAllDedications).mockResolvedValueOnce([
      makeRecord({ id: 'a', merit: 7 }),
      makeRecord({ id: 'b', merit: 49 }),
    ])
    const store = useDedicationStore()
    await store.loadDedications()
    expect(store.totalGiven).toBe(56)
  })

  it('light records a lamp carrying the given merit', async () => {
    vi.mocked(getAllDedications).mockResolvedValueOnce([])
    vi.mocked(createDedication).mockImplementationOnce(async (input) => ({ id: 'd2', ...input }))

    const store = useDedicationStore()
    await store.loadDedications()

    const record = await store.light({
      verseId: 'pureland',
      targetId: 'custom',
      targetName: '先父 王公',
      merit: 108,
    })

    expect(record.merit).toBe(108)
    expect(record.targetName).toBe('先父 王公')
    expect(store.latest?.id).toBe('d2')
    expect(store.totalGiven).toBe(108)
  })
})
