export type GemGeometry = 'octahedron' | 'icosahedron' | 'dodecahedron' | 'sphere' | 'tetrahedron'

export interface GemParams {
  colorHex: string
  transmission: number
  iridescence: number
  iridescenceIOR: number
  roughness: number
  geometry: GemGeometry
}

export interface GemRecord {
  id: string
  earnedAt: string
  source: 'sutra_volume' | 'mantra' | 'memorization'
  sourceRef: string
  buddhaId?: string
  constellationId?: string
  params: GemParams
}

export interface BuddhaInfo {
  id: string
  nameZh: string
  nameEn: string
  color: string
  description: string
}

export interface ConstellationInfo {
  id: string
  nameZh: string
  nameEn: string
  iauCode: string
  buddhaId: string
}
