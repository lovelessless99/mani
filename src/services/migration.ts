import { getDoc, setDoc, addDoc, getDocs, query } from 'firebase/firestore'
import { userCollection, userDoc } from './userScope'
import * as local from './localStore'
import type { SutraProgress } from 'src/types/sutra'
import type { GemRecord } from 'src/types/gem'
import type { DedicationRecord } from 'src/types/dedication'

/**
 * Move everything recorded as a guest up to the account just signed into.
 *
 * Runs only with a live Firebase user, so the writes land under the new
 * uid. It merges rather than overwrites — a guest who had also used the
 * account before must lose nothing:
 *   · progress — recitation counts are taken at their maximum per volume
 *   · gems      — one stone per chapter, so a sourceRef already present
 *                 in the account is skipped
 *   · dedications — de-duplicated on their timestamp
 * When it is done the local copy is cleared, so signing in again is a
 * no-op rather than a second upload.
 */
export async function migrateGuestData(): Promise<void> {
  const snap = local.snapshot()

  await mergeProgress(snap.progress as unknown as Record<string, SutraProgress>)
  await mergeGems(snap.gems as unknown as Record<string, Omit<GemRecord, 'id'>>)
  await mergeDedications(snap.dedications as unknown as Record<string, Omit<DedicationRecord, 'id'>>)

  local.clearAll()
}

async function mergeProgress(localProgress: Record<string, SutraProgress>): Promise<void> {
  for (const [sutraId, guest] of Object.entries(localProgress)) {
    const existingSnap = await getDoc(userDoc('progress', sutraId))
    const existing = existingSnap.exists() ? (existingSnap.data() as SutraProgress) : null

    const volumes = { ...(existing?.volumes ?? {}) }
    for (const [vid, gv] of Object.entries(guest.volumes ?? {})) {
      const cur = volumes[vid]
      // Keep the higher count, and the later timestamp
      if (!cur || gv.count > cur.count) volumes[vid] = gv
      else if (gv.lastRead > cur.lastRead) volumes[vid] = { ...cur, lastRead: gv.lastRead }
    }

    const totalCompleted = Object.values(volumes).filter((v) => v.count >= 1).length
    const merged: SutraProgress = {
      sutraId,
      volumes,
      totalCompleted,
      isFullyComplete: !!existing?.isFullyComplete || !!guest.isFullyComplete,
      ...(existing?.completedAt || guest.completedAt
        ? { completedAt: existing?.completedAt ?? guest.completedAt }
        : {}),
    }
    await setDoc(userDoc('progress', sutraId), merged)
  }
}

async function mergeGems(localGems: Record<string, Omit<GemRecord, 'id'>>): Promise<void> {
  const rows = Object.values(localGems)
  if (!rows.length) return

  const existing = await getDocs(query(userCollection('gems')))
  const seen = new Set(existing.docs.map((d) => (d.data() as GemRecord).sourceRef))

  for (const gem of rows) {
    if (seen.has(gem.sourceRef)) continue
    await addDoc(userCollection('gems'), gem)
    seen.add(gem.sourceRef)
  }
}

async function mergeDedications(
  localDed: Record<string, Omit<DedicationRecord, 'id'>>
): Promise<void> {
  const rows = Object.values(localDed)
  if (!rows.length) return

  const existing = await getDocs(query(userCollection('dedications')))
  const seen = new Set(existing.docs.map((d) => (d.data() as DedicationRecord).dedicatedAt))

  for (const rec of rows) {
    if (seen.has(rec.dedicatedAt)) continue
    await addDoc(userCollection('dedications'), rec)
    seen.add(rec.dedicatedAt)
  }
}
