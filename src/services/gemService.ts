import { collection, getDocs, addDoc, query } from 'firebase/firestore'
import { db } from 'src/boot/firebase'
import type { GemParams, GemRecord, GemGeometry } from 'src/types/gem'

const GEM_COLORS = [
  '#9b59b6', '#8e44ad', '#2980b9', '#1a5276',
  '#27ae60', '#1e8449', '#c0392b', '#922b21',
  '#f39c12', '#d35400', '#16a085', '#0e6655',
  '#f1948a', '#5dade2',
]

const GEM_GEOMETRIES: GemGeometry[] = [
  'octahedron', 'icosahedron', 'dodecahedron', 'sphere', 'tetrahedron',
]

export function generateGemParams(): GemParams {
  const colorHex = GEM_COLORS[Math.floor(Math.random() * GEM_COLORS.length)]
  const geometry = GEM_GEOMETRIES[Math.floor(Math.random() * GEM_GEOMETRIES.length)]

  return {
    colorHex,
    transmission: 0.7 + Math.random() * 0.3,
    iridescence: Math.random(),
    iridescenceIOR: 1.2 + Math.random() * 0.8,
    roughness: Math.random() * 0.15,
    geometry,
  }
}

interface CreateGemInput {
  source: GemRecord['source']
  sourceRef: string
  buddhaId?: string
  constellationId?: string
}

export async function createGem(input: CreateGemInput): Promise<GemRecord> {
  const params = generateGemParams()
  const now = new Date().toISOString()

  const data: Omit<GemRecord, 'id'> = {
    earnedAt: now,
    source: input.source,
    sourceRef: input.sourceRef,
    params,
    ...(input.buddhaId ? { buddhaId: input.buddhaId } : {}),
    ...(input.constellationId ? { constellationId: input.constellationId } : {}),
  }

  const ref = await addDoc(collection(db, 'gems'), data)
  return { id: ref.id, ...data }
}

export async function getAllGems(): Promise<GemRecord[]> {
  const snap = await getDocs(query(collection(db, 'gems')))
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<GemRecord, 'id'>) }))
}
