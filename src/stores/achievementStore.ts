import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { getDocData, setDocData } from 'src/services/dataAccess'
import achievementsData from 'src/data/meta/achievements.json'
import { useProgressStore } from './progressStore'
import { useGemStore } from './gemStore'
import { useStreakStore } from './streakStore'
import { useDedicationStore } from './dedicationStore'
import { useChantStore } from './chantStore'
import { useNotesStore } from './notesStore'
import { getAllSutras } from 'src/services/sutraService'
import chaptersData from 'src/data/meta/sutra-chapters.json'

const CHAPTERS = chaptersData as unknown as Record<string, { items: { id: string }[] }>

const COL = 'stats'
const ID = 'achievements'

export type Tier = 'bronze' | 'silver' | 'gold'
export type Metric =
  | 'reciteTotal'
  | 'memorizeTotal'
  | 'gems'
  | 'streak'
  | 'bestStreak'
  | 'maxRounds'
  | 'sutrasCompleted'
  | 'maxMastery'
  | 'dedications'
  | 'dedicatedMerit'
  | 'chantTotal'
  | 'chantRounds'
  | 'talks'

export interface Achievement {
  id: string
  name: string
  desc: string
  metric: Metric
  goal: number
  tier: Tier
  glyph: string
}

const DEFS = achievementsData as Achievement[]

type Metrics = Record<Metric, number>

/**
 * 獎牌 · 成就
 *
 * Achievements are *derived*, never a separate source of truth: each one is
 * a metric read off the practice already recorded, so they can never drift
 * out of sync with reality and there is nothing extra to write when practice
 * happens. The only thing persisted is which medals have already been seen —
 * that lets a newly crossed threshold ring out once and then rest.
 */
export const useAchievementStore = defineStore('achievements', () => {
  const seen = ref<string[]>([])
  const loaded = ref(false)
  const pendingMedal = ref<Achievement | null>(null)

  async function load(): Promise<void> {
    const doc = await getDocData<{ seen: string[] }>(COL, ID)
    if (doc?.seen) seen.value = doc.seen
    loaded.value = true
  }

  // Read the current metrics straight from the other stores. Kept as a plain
  // read (not a watcher) so evaluation is explicit and cheap to test.
  function metrics(): Metrics {
    const progress = useProgressStore()
    const gems = useGemStore()
    const streak = useStreakStore()
    const dedications = useDedicationStore()
    const chant = useChantStore()
    const notes = useNotesStore()
    let chantRounds = 0
    for (const e of Object.values(chant.entries)) chantRounds += e.rounds ?? 0

    let reciteTotal = 0
    let memorizeTotal = 0
    let maxRounds = 0
    let sutrasCompleted = 0
    let maxMastery = 0

    for (const s of getAllSutras()) {
      const volumes = progress.progressMap[s.id]?.volumes ?? {}
      const items = CHAPTERS[s.id]?.items ?? []
      let lowest = items.length ? Infinity : 0

      for (const c of items) {
        const recite = volumes[`${c.id}-recite`]?.count ?? volumes[c.id]?.count ?? 0
        const memorize = volumes[`${c.id}-memorize`]?.count ?? 0
        maxMastery = Math.max(maxMastery, memorize)
        lowest = Math.min(lowest, recite + memorize)
      }
      // Fold in any counts under legacy whole-sutra keys for the totals.
      for (const [key, vp] of Object.entries(volumes)) {
        if (key.endsWith('-memorize') || key === 'memorize') memorizeTotal += vp.count
        else reciteTotal += vp.count
      }

      const rounds = items.length && lowest !== Infinity ? lowest : 0
      maxRounds = Math.max(maxRounds, rounds)
      if (rounds >= 1) sutrasCompleted += 1
    }

    return {
      reciteTotal,
      memorizeTotal,
      gems: gems.gemsList.length,
      streak: streak.shownCount,
      bestStreak: streak.best,
      maxRounds,
      sutrasCompleted,
      maxMastery,
      dedications: dedications.records.length,
      dedicatedMerit: dedications.totalGiven,
      chantTotal: chant.grandTotal,
      chantRounds,
      talks: notes.notes.length,
    }
  }

  // Every achievement paired with its live progress toward the goal.
  const list = computed(() => {
    const m = metrics()
    return DEFS.map((a) => {
      const value = m[a.metric] ?? 0
      return {
        ...a,
        value,
        unlocked: value >= a.goal,
        ratio: Math.min(1, value / a.goal),
      }
    })
  })

  const unlockedCount = computed(() => list.value.filter((a) => a.unlocked).length)

  /**
   * Find any medal newly crossed since it was last seen, queue the first for
   * its ceremony, and mark them all seen so this fires once. Returns the
   * medal queued, if any, so callers can pace it against other overlays.
   */
  async function check(): Promise<Achievement | null> {
    if (!loaded.value) await load()
    const nowUnlocked = list.value.filter((a) => a.unlocked).map((a) => a.id)
    const fresh = nowUnlocked.filter((id) => !seen.value.includes(id))
    if (!fresh.length) return null

    seen.value = Array.from(new Set([...seen.value, ...nowUnlocked]))
    await setDocData(COL, ID, { seen: seen.value })

    const medal = DEFS.find((d) => d.id === fresh[0]) ?? null
    if (medal) pendingMedal.value = medal
    return medal
  }

  function clearPendingMedal(): void {
    pendingMedal.value = null
  }

  return { seen, loaded, pendingMedal, list, unlockedCount, load, check, clearPendingMedal }
})
