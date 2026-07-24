import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getDocData, setDocData } from 'src/services/dataAccess'

/**
 * 今日已修 — which chapters have been recorded today.
 *
 * The daily draw needs to tick off each assigned passage as it is recited,
 * which the running per-chapter totals cannot show (they never say *when*).
 * So today's completed slots are kept here, keyed by the local day and reset
 * the moment a new day begins.
 */

const COL = 'stats'
const ID = 'daily'

function dayKey(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export const useDailyStore = defineStore('daily', () => {
  const day = ref('')
  const done = ref<string[]>([])
  const drawn = ref(false) // whether today's cards have been drawn from the deck
  const loaded = ref(false)

  function rolloverIfStale(): void {
    const today = dayKey()
    if (day.value !== today) {
      day.value = today
      done.value = []
      drawn.value = false
    }
  }

  async function persist(): Promise<void> {
    await setDocData(COL, ID, { day: day.value, done: done.value, drawn: drawn.value })
  }

  async function load(): Promise<void> {
    const doc = await getDocData<{ day: string; done: string[]; drawn?: boolean }>(COL, ID)
    if (doc) {
      day.value = doc.day ?? ''
      done.value = doc.done ?? []
      drawn.value = doc.drawn ?? false
    }
    rolloverIfStale()
    loaded.value = true
  }

  function isDone(slot: string): boolean {
    if (day.value !== dayKey()) return false
    return done.value.includes(slot)
  }

  /** Turn today's deck face-up. Once drawn it stays drawn for the day. */
  async function markDrawn(): Promise<void> {
    if (!loaded.value) await load()
    rolloverIfStale()
    if (drawn.value) return
    drawn.value = true
    await persist()
  }

  /** Record `sutraId/chapterId` as practised today. */
  async function markDone(slot: string): Promise<void> {
    if (!loaded.value) await load()
    rolloverIfStale()
    if (done.value.includes(slot)) return
    done.value.push(slot)
    await persist()
  }

  return { day, done, drawn, loaded, load, isDone, markDrawn, markDone }
})
