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
