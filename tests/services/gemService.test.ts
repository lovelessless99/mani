import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('firebase/firestore', () => ({
  doc: vi.fn(() => ({})),
  collection: vi.fn(() => ({})),
  getDocs: vi.fn(),
  addDoc: vi.fn(),
  query: vi.fn(() => ({})),
}))
vi.mock('src/boot/firebase', () => ({ db: {} }))

import { generateGemParams, createGem, getAllGems } from 'src/services/gemService'
import { getDocs, addDoc } from 'firebase/firestore'
import type { GemRecord } from 'src/types/gem'

describe('gemService', () => {
  beforeEach(() => vi.clearAllMocks())

  describe('generateGemParams', () => {
    it('returns valid gem params within expected ranges', () => {
      const params = generateGemParams()
      expect(params.transmission).toBeGreaterThanOrEqual(0.7)
      expect(params.transmission).toBeLessThanOrEqual(1.0)
      expect(params.roughness).toBeGreaterThanOrEqual(0)
      expect(params.roughness).toBeLessThanOrEqual(0.15)
      expect(params.iridescence).toBeGreaterThanOrEqual(0)
      expect(params.iridescence).toBeLessThanOrEqual(1)
      expect(['octahedron','icosahedron','dodecahedron','sphere','tetrahedron']).toContain(params.geometry)
      expect(params.colorHex).toMatch(/^#[0-9a-f]{6}$/i)
    })

    it('generates different params each time (probabilistic)', () => {
      const a = generateGemParams()
      const b = generateGemParams()
      expect(a.colorHex).toBeDefined()
      expect(b.colorHex).toBeDefined()
    })
  })

  describe('createGem', () => {
    it('saves gem to Firestore and returns record with id', async () => {
      vi.mocked(addDoc).mockResolvedValueOnce({ id: 'gem-abc-123' } as any)

      const record = await createGem({
        source: 'sutra_volume',
        sourceRef: 'avatamsaka/001',
        buddhaId: 'b001',
        constellationId: 'c001',
      })

      expect(record.id).toBe('gem-abc-123')
      expect(record.source).toBe('sutra_volume')
      expect(record.buddhaId).toBe('b001')
      expect(record.params).toBeDefined()
      expect(addDoc).toHaveBeenCalledOnce()
    })
  })

  describe('getAllGems', () => {
    it('returns empty array when no gems in Firestore', async () => {
      vi.mocked(getDocs).mockResolvedValueOnce({ docs: [] } as any)
      const gems = await getAllGems()
      expect(gems).toEqual([])
    })

    it('returns array of gem records from Firestore', async () => {
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
      vi.mocked(getDocs).mockResolvedValueOnce({
        docs: [{ id: 'gem-1', data: () => mockGem }],
      } as any)

      const gems = await getAllGems()
      expect(gems).toHaveLength(1)
      expect(gems[0].id).toBe('gem-1')
    })
  })
})
