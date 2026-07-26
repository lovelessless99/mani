import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getDocData, setDocData } from 'src/services/dataAccess'

/**
 * 加分持戒 — daily observances checked off for the day (過午不食、吃素…).
 *
 * Day-scoped like the daily task: each morning starts clean, and what was
 * kept today is remembered so the marks survive a reload.
 */

const COL = 'stats'
const ID = 'observance'

function dayKey(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export const useObservanceStore = defineStore('observance', () => {
  const day = ref('')
  const checked = ref<string[]>([])
  const loaded = ref(false)

  function rolloverIfStale(): void {
    const today = dayKey()
    if (day.value !== today) {
      day.value = today
      checked.value = []
    }
  }

  async function load(): Promise<void> {
    const doc = await getDocData<{ day: string; checked: string[] }>(COL, ID)
    if (doc) {
      day.value = doc.day ?? ''
      checked.value = doc.checked ?? []
    }
    rolloverIfStale()
    loaded.value = true
  }

  function isChecked(id: string): boolean {
    if (day.value !== dayKey()) return false
    return checked.value.includes(id)
  }

  async function toggle(id: string): Promise<void> {
    if (!loaded.value) await load()
    rolloverIfStale()
    checked.value = checked.value.includes(id)
      ? checked.value.filter((x) => x !== id)
      : [...checked.value, id]
    await setDocData(COL, ID, { day: day.value, checked: checked.value })
  }

  return { day, checked, loaded, load, isChecked, toggle }
})
