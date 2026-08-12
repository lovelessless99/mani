import { getDocData, setDocData } from './dataAccess'
import type { SutraProgress, VolumeProgress } from 'src/types/sutra'

export async function getProgress(sutraId: string): Promise<SutraProgress | null> {
  return getDocData<SutraProgress>('progress', sutraId)
}

export async function recordRecitation(
  sutraId: string,
  volumeId: string,
  totalVolumes: number,
): Promise<SutraProgress> {
  const existing = await getProgress(sutraId)
  const now = new Date().toISOString()

  const prevVolume: VolumeProgress = existing?.volumes?.[volumeId] ?? { count: 0, lastRead: now }
  const updatedVolume: VolumeProgress = {
    count: prevVolume.count + 1,
    lastRead: now,
  }

  const volumes = { ...(existing?.volumes ?? {}), [volumeId]: updatedVolume }
  const totalCompleted = Object.values(volumes).filter((v) => v.count >= 1).length
  const isFullyComplete = totalCompleted >= totalVolumes

  const progress: SutraProgress = {
    sutraId,
    volumes,
    totalCompleted,
    isFullyComplete,
    ...(isFullyComplete && !existing?.isFullyComplete ? { completedAt: now } : {}),
  }

  await setDocData('progress', sutraId, progress)
  return progress
}

/** Correct a volume's tally to an exact count (0 clears it). */
export async function setVolumeCount(
  sutraId: string,
  volumeId: string,
  count: number,
  totalVolumes: number,
): Promise<SutraProgress> {
  const existing = await getProgress(sutraId)
  const now = new Date().toISOString()
  const volumes = { ...(existing?.volumes ?? {}) }
  const c = Math.max(0, Math.round(count) || 0)
  if (c <= 0) delete volumes[volumeId]
  else volumes[volumeId] = { count: c, lastRead: existing?.volumes?.[volumeId]?.lastRead ?? now }

  const totalCompleted = Object.values(volumes).filter((v) => v.count >= 1).length
  const isFullyComplete = totalCompleted >= totalVolumes
  const progress: SutraProgress = {
    sutraId,
    volumes,
    totalCompleted,
    isFullyComplete,
    ...(existing?.completedAt ? { completedAt: existing.completedAt } : {}),
  }
  await setDocData('progress', sutraId, progress)
  return progress
}
