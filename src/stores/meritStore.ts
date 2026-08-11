import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { getDocData, setDocData } from 'src/services/dataAccess'
import { useProgressStore } from './progressStore'
import { useChantStore } from './chantStore'
import { getAllSutras } from 'src/services/sutraService'

/**
 * 功德 — a single running merit currency.
 *
 * `earned` is derived from practice itself (every 遍 誦 or 背, across every
 * sutra) so it never needs its own bookkeeping and can only grow. `spent`
 * is the merit given away at the 迴向燈; `balance` is what is left to give.
 * Lifetime `earned` also carries the ascent through the 諸天 — it is never
 * lowered by dedicating, since the merit of the practice remains.
 */

const COL = 'stats'
const ID = 'merit'

export const useMeritStore = defineStore('merit', () => {
  const progress = useProgressStore()
  const chant = useChantStore()
  const spent = ref(0)
  const loaded = ref(false)

  // One 功德 per 遍 — reciting, memorising, and 持咒/念佛 all count.
  const earned = computed(() => {
    let n = 0
    for (const s of getAllSutras()) {
      const vols = progress.progressMap[s.id]?.volumes ?? {}
      for (const vp of Object.values(vols)) n += vp.count
    }
    return n + chant.grandTotal
  })

  const balance = computed(() => Math.max(0, earned.value - spent.value))

  async function load(): Promise<void> {
    const doc = await getDocData<{ spent: number }>(COL, ID)
    if (doc) spent.value = doc.spent ?? 0
    loaded.value = true
  }

  /** Give merit away at the 迴向燈. Returns false if the balance won't cover it. */
  async function spend(n: number): Promise<boolean> {
    if (n <= 0 || n > balance.value) return false
    spent.value += n
    await setDocData(COL, ID, { spent: spent.value })
    return true
  }

  return { earned, spent, balance, loaded, load, spend }
})
