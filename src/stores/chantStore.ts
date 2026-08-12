import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { getDocData, setDocData } from 'src/services/dataAccess'
import { useStreakStore } from './streakStore'
import chantsData from 'src/data/meta/chants.json'

// id → 目標遍數, so a lifetime 遍 total can be summed from the stored rounds.
const TARGETS: Record<string, number> = {}
for (const c of [
  ...(chantsData as { mantras: { id: string; target: number }[] }).mantras,
  ...(chantsData as { names: { id: string; target: number }[] }).names,
]) {
  TARGETS[c.id] = c.target
}

/**
 * 持咒 · 念佛 — a 念珠 counter for mantras and Buddha-names.
 *
 * Each chant counts up to its 目標 (108, 21, 7…); crossing it banks one 輪 and
 * resets the bead count, exactly like turning a mala. Any tap marks the day
 * active, so the counting practice feeds the same streak as reciting a sutra.
 * Writes are debounced so a fast round of 108 taps is one save, not 108.
 */

const COL = 'practice'
const ID = 'chant'

interface Entry {
  count: number
  rounds: number
}

export const useChantStore = defineStore('chant', () => {
  const entries = ref<Record<string, Entry>>({})
  const loaded = ref(false)
  let saveTimer: ReturnType<typeof setTimeout> | undefined

  function get(id: string): Entry {
    return entries.value[id] ?? { count: 0, rounds: 0 }
  }
  /** Lifetime 遍數 = completed rounds × target + the current bead count. */
  function total(id: string, target: number): number {
    const e = get(id)
    return e.rounds * target + e.count
  }

  // Every 遍 chanted, across all mantras/names — feeds 功德 (and so 迴向).
  const grandTotal = computed(() => {
    let n = 0
    for (const [id, e] of Object.entries(entries.value)) {
      n += e.rounds * (TARGETS[id] ?? 108) + e.count
    }
    return n
  })

  async function load(): Promise<void> {
    if (loaded.value) return
    const doc = await getDocData<{ entries: Record<string, Entry> }>(COL, ID)
    if (doc?.entries) entries.value = doc.entries
    loaded.value = true
  }

  function save(): void {
    void setDocData(COL, ID, { entries: entries.value })
  }
  function persist(): void {
    clearTimeout(saveTimer)
    saveTimer = setTimeout(save, 700)
  }
  /** Write any pending change immediately (call before leaving the page). */
  function flush(): void {
    clearTimeout(saveTimer)
    save()
  }

  /** Count one bead. Returns true when this tap completed a 輪. */
  async function tick(id: string, target: number): Promise<boolean> {
    const e = { ...get(id) }
    e.count += 1
    let completed = false
    if (e.count >= target) {
      e.count = 0
      e.rounds += 1
      completed = true
    }
    entries.value = { ...entries.value, [id]: e }
    persist()
    await useStreakStore().touchToday()
    return completed
  }

  /** Finish the current 輪 in one tap — bank a full round without tapping 108×. */
  async function completeRound(id: string): Promise<void> {
    const e = { ...get(id) }
    e.count = 0
    e.rounds += 1
    entries.value = { ...entries.value, [id]: e }
    persist()
    await useStreakStore().touchToday()
  }

  /** Correct a tally directly — for a mis-tap, or an honest downward fix. */
  function setEntry(id: string, count: number, rounds: number, target: number): void {
    const c = Math.max(0, Math.min(target - 1, Math.round(count) || 0))
    const r = Math.max(0, Math.round(rounds) || 0)
    entries.value = { ...entries.value, [id]: { count: c, rounds: r } }
    persist()
  }

  /** Step back one bead (undo a mis-tap). */
  function undo(id: string, target: number): void {
    const e = { ...get(id) }
    if (e.count > 0) e.count -= 1
    else if (e.rounds > 0) {
      e.rounds -= 1
      e.count = target - 1
    }
    entries.value = { ...entries.value, [id]: e }
    persist()
  }

  return { entries, loaded, get, total, grandTotal, load, tick, completeRound, setEntry, undo, flush }
})
