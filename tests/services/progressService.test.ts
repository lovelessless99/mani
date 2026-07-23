import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('firebase/firestore', () => ({
  doc: vi.fn(() => ({})),
  getDoc: vi.fn(),
  setDoc: vi.fn(),
  updateDoc: vi.fn(),
}))
vi.mock('src/boot/firebase', () => ({ db: {}, auth: { currentUser: { uid: 'test-uid' } } }))

import { getDoc, setDoc } from 'firebase/firestore'
import { recordRecitation } from 'src/services/progressService'
import type { SutraProgress } from 'src/types/sutra'

describe('progressService', () => {
  beforeEach(() => vi.clearAllMocks())

  it('creates new progress when none exists', async () => {
    vi.mocked(getDoc).mockResolvedValueOnce({ exists: () => false } as any)
    vi.mocked(setDoc).mockResolvedValueOnce(undefined)

    const result = await recordRecitation('heart-sutra', '001', 1)

    expect(result.volumes['001'].count).toBe(1)
    expect(result.totalCompleted).toBe(1)
    expect(result.isFullyComplete).toBe(true)
    expect(setDoc).toHaveBeenCalledOnce()
  })

  it('increments count on repeat recitation', async () => {
    const existing: SutraProgress = {
      sutraId: 'heart-sutra',
      volumes: { '001': { count: 2, lastRead: '2026-01-01T00:00:00.000Z' } },
      totalCompleted: 1,
      isFullyComplete: true,
    }
    vi.mocked(getDoc).mockResolvedValueOnce({ exists: () => true, data: () => existing } as any)
    vi.mocked(setDoc).mockResolvedValueOnce(undefined)

    const result = await recordRecitation('heart-sutra', '001', 1)

    expect(result.volumes['001'].count).toBe(3)
  })

  it('sets isFullyComplete when all volumes done', async () => {
    const existing: SutraProgress = {
      sutraId: 'avatamsaka',
      volumes: { '001': { count: 1, lastRead: '2026-01-01T00:00:00.000Z' } },
      totalCompleted: 1,
      isFullyComplete: false,
    }
    vi.mocked(getDoc).mockResolvedValueOnce({ exists: () => true, data: () => existing } as any)
    vi.mocked(setDoc).mockResolvedValueOnce(undefined)

    const result = await recordRecitation('avatamsaka', '002', 2)

    expect(result.totalCompleted).toBe(2)
    expect(result.isFullyComplete).toBe(true)
    expect(result.completedAt).toBeDefined()
  })
})
