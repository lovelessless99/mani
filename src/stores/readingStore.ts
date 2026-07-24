import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getDocData, setDocData } from 'src/services/dataAccess'

/**
 * 讀經進度 — where the practitioner last had the book open.
 *
 * Remembers the sutra, the 卷/品, and how far down the text they had read
 * (a scroll ratio, standing in for the line), so 讀經 always resumes where
 * it was left. A separate 回向 bookmark records the spot a dedication was
 * made, to return to later.
 */

const COL = 'stats'
const ID = 'reading'

export interface ReadingMark {
  sutraId: string
  sutraTitle: string
  volumeId: string
  volumeLabel: string
  /** 0–1 down the text — the line, near enough */
  progress: number
  at: string // ISO timestamp
}

interface ReadingDoc {
  last?: ReadingMark
  dedicated?: ReadingMark
}

export const useReadingStore = defineStore('reading', () => {
  const last = ref<ReadingMark | null>(null)
  const dedicated = ref<ReadingMark | null>(null)
  const loaded = ref(false)

  async function load(): Promise<void> {
    const doc = await getDocData<ReadingDoc>(COL, ID)
    if (doc) {
      last.value = doc.last ?? null
      dedicated.value = doc.dedicated ?? null
    }
    loaded.value = true
  }

  async function persist(): Promise<void> {
    await setDocData(COL, ID, {
      ...(last.value ? { last: last.value } : {}),
      ...(dedicated.value ? { dedicated: dedicated.value } : {}),
    })
  }

  /** Record the current reading spot as the place to resume from. */
  async function mark(m: Omit<ReadingMark, 'at'>): Promise<void> {
    last.value = { ...m, at: new Date().toISOString() }
    await persist()
  }

  /** Bookmark the current spot as where merit was dedicated. */
  async function markDedicated(m: Omit<ReadingMark, 'at'>): Promise<void> {
    dedicated.value = { ...m, at: new Date().toISOString() }
    await persist()
  }

  return { last, dedicated, loaded, load, mark, markDedicated }
})
