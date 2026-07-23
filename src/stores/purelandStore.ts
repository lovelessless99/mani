import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getDocData, setDocData } from 'src/services/dataAccess'

/**
 * 淨土 — the practitioner names the land their gems build.
 *
 * Only the name is stored; the land itself is rendered from the gems
 * already collected, so it grows on its own as practice accrues and never
 * needs its own bookkeeping.
 */

const COL = 'stats'
const ID = 'pureland'

export const usePureLandStore = defineStore('pureland', () => {
  const name = ref('')
  const loaded = ref(false)

  async function load(): Promise<void> {
    const doc = await getDocData<{ name: string }>(COL, ID)
    if (doc?.name) name.value = doc.name
    loaded.value = true
  }

  async function rename(next: string): Promise<void> {
    name.value = next.trim()
    await setDocData(COL, ID, { name: name.value })
  }

  return { name, loaded, load, rename }
})
