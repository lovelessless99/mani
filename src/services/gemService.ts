import { addDocData, listDocs } from './dataAccess'
import type { GemParams, GemRecord, GemGeometry } from 'src/types/gem'

// These feed MeshPhysicalMaterial's attenuationColor — the tint light
// takes on passing through the stone. Saturated, mid-to-bright jewel
// tones read best; dark values just turn the gem muddy.
const GEM_COLORS = [
  '#b06bff', // amethyst
  '#8b5cf6', // violet
  '#4f9dff', // sapphire
  '#22d3ee', // aquamarine
  '#34d399', // emerald
  '#84cc16', // peridot
  '#ff5d7a', // ruby
  '#f43f5e', // garnet
  '#fbbf24', // citrine
  '#fb923c', // amber
  '#2dd4bf', // tourmaline
  '#f0abfc', // morganite
  '#60a5fa', // topaz
  '#e879f9', // kunzite
]

const GEM_GEOMETRIES: GemGeometry[] = [
  'octahedron', 'icosahedron', 'dodecahedron', 'sphere', 'tetrahedron',
]

/**
 * The form each sutra's stones take. Avatamsaka is absent on purpose:
 * its gems draw a random cut instead.
 */
export const SUTRA_GEM_SHAPE: Record<string, GemGeometry> = {
  'heart-sutra': 'vase',   // 寶瓶 — the vessel that holds the teaching
  ksitigarbha: 'lotus',    // 蓮華 — 地藏 seated on the lotus of the vow
  lotus: 'stupa',          // 寶塔 — 見寶塔品, the tower of Many Treasures
  shurangama: 'dome',      // 佛頂 — 大佛頂首楞嚴
}

export function generateGemParams(shape?: GemGeometry): GemParams {
  const colorHex = GEM_COLORS[Math.floor(Math.random() * GEM_COLORS.length)]
  const geometry = shape ?? GEM_GEOMETRIES[Math.floor(Math.random() * GEM_GEOMETRIES.length)]

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
  /** Fixed cut for this sutra; omitted means pick one at random */
  geometry?: GemGeometry
}

export async function createGem(input: CreateGemInput): Promise<GemRecord> {
  const params = generateGemParams(input.geometry)
  const now = new Date().toISOString()

  const data: Omit<GemRecord, 'id'> = {
    earnedAt: now,
    source: input.source,
    sourceRef: input.sourceRef,
    params,
    ...(input.buddhaId ? { buddhaId: input.buddhaId } : {}),
    ...(input.constellationId ? { constellationId: input.constellationId } : {}),
  }

  const id = await addDocData('gems', data)
  return { id, ...data }
}

export async function getAllGems(): Promise<GemRecord[]> {
  return listDocs<Omit<GemRecord, 'id'>>('gems')
}
