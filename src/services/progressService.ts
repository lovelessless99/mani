import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from 'src/boot/firebase'
import type { SutraProgress, VolumeProgress } from 'src/types/sutra'

function progressRef(sutraId: string) {
  return doc(db, 'progress', sutraId)
}

export async function getProgress(sutraId: string): Promise<SutraProgress | null> {
  const snap = await getDoc(progressRef(sutraId))
  return snap.exists() ? (snap.data() as SutraProgress) : null
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

  await setDoc(progressRef(sutraId), progress)
  return progress
}
