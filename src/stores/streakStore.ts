import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { getDocData, setDocData } from 'src/services/dataAccess'

/**
 * 連續天數 · 菩提種子
 *
 * A day counts the moment the practitioner records anything — a recitation
 * or a memorised passage. Miss a day and the seed resets, so the pull is to
 * come back tomorrow. The seed grows through stages as the streak lengthens;
 * that visible growth is the reward the raw number alone cannot give.
 */

const COL = 'stats'
const ID = 'streak'

interface StreakDoc {
  count: number
  best: number
  lastDay: string // local YYYY-MM-DD of the most recent active day
  total: number // lifetime active days
}

// Local-time day key — the practitioner's own calendar day, not UTC, so a
// late-night recitation still lands on the day it felt like.
function dayKey(d = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function daysBetween(a: string, b: string): number {
  const [ay, am, ad] = a.split('-').map(Number)
  const [by, bm, bd] = b.split('-').map(Number)
  const ta = Date.UTC(ay, am - 1, ad)
  const tb = Date.UTC(by, bm - 1, bd)
  return Math.round((tb - ta) / 86_400_000)
}

interface SeedStage {
  at: number
  name: string
  glyph: string
  blurb: string
}

// Each stage names what the streak has grown into; the glyph rides along in
// the home widget so progress is felt, not just counted.
const STAGES: SeedStage[] = [
  { at: 0, name: '淨土', glyph: '◌', blurb: '播下第一顆種子' },
  { at: 1, name: '種子', glyph: '🌰', blurb: '菩提種子已種下' },
  { at: 3, name: '發芽', glyph: '🌱', blurb: '芽已破土' },
  { at: 7, name: '幼苗', glyph: '🌿', blurb: '苗已成形' },
  { at: 21, name: '成樹', glyph: '🌳', blurb: '樹已成蔭' },
  { at: 50, name: '菩提樹', glyph: '🪷', blurb: '菩提樹下,花開見佛' },
]

export const useStreakStore = defineStore('streak', () => {
  const count = ref(0)
  const best = ref(0)
  const total = ref(0)
  const lastDay = ref('')
  const loaded = ref(false)

  const stage = computed(() => {
    let s = STAGES[0]
    for (const level of STAGES) if (count.value >= level.at) s = level
    return s
  })

  // Days already banked toward the next stage threshold, for a progress ring.
  const nextStage = computed(() => STAGES.find((s) => s.at > count.value) ?? null)

  // True when the last active day is neither today nor yesterday — the streak
  // has lapsed and the displayed count is stale until the next touch resets it.
  const isBroken = computed(() => {
    if (!lastDay.value) return false
    const gap = daysBetween(lastDay.value, dayKey())
    return gap > 1
  })

  // The count to show: a lapsed streak reads as 0 even before the next touch
  // rewrites the record.
  const shownCount = computed(() => (isBroken.value ? 0 : count.value))

  async function load(): Promise<void> {
    const doc = await getDocData<StreakDoc>(COL, ID)
    if (doc) {
      count.value = doc.count ?? 0
      best.value = doc.best ?? 0
      total.value = doc.total ?? 0
      lastDay.value = doc.lastDay ?? ''
    }
    loaded.value = true
  }

  /**
   * Mark today active. Returns the day-over-day delta so callers can
   * celebrate a streak that just grew ( >0 ) versus a same-day no-op ( 0 ).
   */
  async function touchToday(): Promise<number> {
    if (!loaded.value) await load()
    const today = dayKey()
    if (lastDay.value === today) return 0 // already counted today

    const gap = lastDay.value ? daysBetween(lastDay.value, today) : Infinity
    count.value = gap === 1 ? count.value + 1 : 1
    total.value += 1
    if (count.value > best.value) best.value = count.value
    lastDay.value = today

    await setDocData(COL, ID, {
      count: count.value,
      best: best.value,
      total: total.value,
      lastDay: lastDay.value,
    })
    return 1
  }

  return { count, best, total, lastDay, loaded, stage, nextStage, isBroken, shownCount, load, touchToday }
})
