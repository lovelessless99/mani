import { ref as storageRef, getDownloadURL } from 'firebase/storage'
import { storage } from 'src/boot/firebase'
import type { SutraIndexEntry, SutraVolume } from 'src/types/sutra'
import { getCachedVolume, setCachedVolume } from './cacheService'
import sutraIndex from 'src/data/meta/sutras-index.json'

export function getAllSutras(): SutraIndexEntry[] {
  return sutraIndex as SutraIndexEntry[]
}

export function getSutraMeta(sutraId: string): SutraIndexEntry | undefined {
  return (sutraIndex as SutraIndexEntry[]).find((s) => s.id === sutraId)
}

async function loadBundledVolume(sutraId: string, volumeId: string): Promise<SutraVolume> {
  // Multi-chapter texts ship one file per chapter; single ones keep the
  // plain `<id>.json` they have always used.
  try {
    const perVolume = await import(`src/data/sutras/${sutraId}-${volumeId}.json`)
    return perVolume.default as SutraVolume
  } catch {
    const whole = await import(`src/data/sutras/${sutraId}.json`)
    return whole.default as SutraVolume
  }
}

async function loadRemoteVolume(sutraId: string, volumeId: string): Promise<SutraVolume> {
  const cacheKey = `${sutraId}/${volumeId}`
  const cached = await getCachedVolume(cacheKey)
  if (cached) return cached

  const fileRef = storageRef(storage, `sutras/${sutraId}/volume-${volumeId}.json`)
  const url = await getDownloadURL(fileRef)
  const response = await fetch(url)
  const volume = (await response.json()) as SutraVolume

  await setCachedVolume(cacheKey, volume)
  return volume
}

export async function loadVolume(sutraId: string, volumeId: string): Promise<SutraVolume> {
  const meta = getSutraMeta(sutraId)
  if (!meta) throw new Error(`Unknown sutra: ${sutraId}`)

  if (meta.storageType === 'bundled') {
    return loadBundledVolume(sutraId, volumeId)
  }
  return loadRemoteVolume(sutraId, volumeId)
}

export function formatVolumeId(num: number): string {
  return String(num).padStart(3, '0')
}
