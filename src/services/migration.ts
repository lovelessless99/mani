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
  await mergeStats(snap.stats as unknown as Record<string, Record<string, unknown>>)

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

interface StreakDoc {
  count: number
  best: number
  total: number
  lastDay: string
}

/**
 * Guest `stats` docs: the 菩提種子 streak, the 立願 vow, the achievement
 * seen-list. The streak is merged toward the stronger record; the others
 * are only copied up when the account has none of its own, so signing in
 * never overwrites progress already recorded on the account.
 */
async function mergeStats(localStats: Record<string, Record<string, unknown>>): Promise<void> {
  if (!localStats) return

  if (localStats.streak) {
    const guest = localStats.streak as unknown as StreakDoc
    const existingSnap = await getDoc(userDoc('stats', 'streak'))
    const existing = existingSnap.exists() ? (existingSnap.data() as StreakDoc) : null
    const keepGuestCurrent = !existing || guest.lastDay >= existing.lastDay
    await setDoc(userDoc('stats', 'streak'), {
      count: keepGuestCurrent ? guest.count : existing.count,
      lastDay: keepGuestCurrent ? guest.lastDay : existing.lastDay,
      best: Math.max(guest.best ?? 0, existing?.best ?? 0),
      total: Math.max(guest.total ?? 0, existing?.total ?? 0),
    })
  }

  for (const id of ['vow', 'achievements', 'pureland', 'daily', 'heaven', 'reading', 'observance'] as const) {
    const guestDoc = localStats[id]
    if (!guestDoc || Object.keys(guestDoc).length === 0) continue
    const existingSnap = await getDoc(userDoc('stats', id))
    if (!existingSnap.exists()) await setDoc(userDoc('stats', id), guestDoc)
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
