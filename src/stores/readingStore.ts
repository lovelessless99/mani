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
  /** Page index in the 印經坊 reader, so it resumes on the exact leaf */
  page?: number
  total?: number
  at: string // ISO timestamp
}

interface ReadingDoc {
  last?: ReadingMark
  dedicated?: ReadingMark
  /** Every sutra keeps its own resume point, keyed by sutraId */
  bySutra?: Record<string, ReadingMark>
}

export const useReadingStore = defineStore('reading', () => {
  const last = ref<ReadingMark | null>(null)
  const dedicated = ref<ReadingMark | null>(null)
  const bySutra = ref<Record<string, ReadingMark>>({})
  const loaded = ref(false)

  async function load(): Promise<void> {
    const doc = await getDocData<ReadingDoc>(COL, ID)
    if (doc) {
      last.value = doc.last ?? null
      dedicated.value = doc.dedicated ?? null
      bySutra.value = doc.bySutra ?? {}
    }
    loaded.value = true
  }

  async function persist(): Promise<void> {
    await setDocData(COL, ID, {
      ...(last.value ? { last: last.value } : {}),
      ...(dedicated.value ? { dedicated: dedicated.value } : {}),
      bySutra: bySutra.value,
    })
  }

  /** The saved resume point for one sutra, if any. */
  function forSutra(sutraId: string): ReadingMark | null {
    return bySutra.value[sutraId] ?? null
  }

  /** Record the current reading spot — both the global "last" and per-sutra. */
  async function mark(m: Omit<ReadingMark, 'at'>): Promise<void> {
    const withTime = { ...m, at: new Date().toISOString() }
    last.value = withTime
    bySutra.value = { ...bySutra.value, [m.sutraId]: withTime }
    await persist()
  }

  /** Bookmark the current spot as where merit was dedicated. */
  async function markDedicated(m: Omit<ReadingMark, 'at'>): Promise<void> {
    dedicated.value = { ...m, at: new Date().toISOString() }
    await persist()
  }

  return { last, dedicated, bySutra, loaded, load, forSutra, mark, markDedicated }
})
