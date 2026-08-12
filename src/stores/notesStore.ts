import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { listDocs, addDocData, setDocData } from 'src/services/dataAccess'

/**
 * 聽法筆記 — a shelf of dharma-talk videos, each with timestamped reflections.
 *
 * A note holds a YouTube link and a list of 標記: a time (seconds into the
 * talk) and a thought. Tapping a 標記 later jumps the player straight back to
 * that moment. Marks live inside the note doc, so editing them is one write.
 */

export interface TalkMark {
  t: number // seconds into the video
  note: string
}
interface TalkData {
  url: string
  videoId: string
  title: string
  createdAt: string
  marks: TalkMark[]
}
export interface TalkNote extends TalkData {
  id: string
}

const COL = 'notes'

export const useNotesStore = defineStore('notes', () => {
  const notes = ref<TalkNote[]>([])
  const loaded = ref(false)

  const list = computed(() => [...notes.value].sort((a, b) => b.createdAt.localeCompare(a.createdAt)))

  async function load(): Promise<void> {
    if (loaded.value) return
    notes.value = await listDocs<TalkData>(COL)
    loaded.value = true
  }

  function strip(n: TalkNote): TalkData {
    return { url: n.url, videoId: n.videoId, title: n.title, createdAt: n.createdAt, marks: n.marks }
  }

  async function add(url: string, videoId: string, title: string): Promise<void> {
    const data: TalkData = {
      url,
      videoId,
      title: title.trim() || '未命名法談',
      createdAt: new Date().toISOString(),
      marks: [],
    }
    const id = await addDocData(COL, data)
    notes.value.push({ id, ...data })
  }

  async function addMark(id: string, t: number, note: string): Promise<void> {
    const n = notes.value.find((x) => x.id === id)
    if (!n) return
    n.marks = [...n.marks, { t, note: note.trim() }].sort((a, b) => a.t - b.t)
    await setDocData(COL, id, strip(n))
  }

  async function removeMark(id: string, index: number): Promise<void> {
    const n = notes.value.find((x) => x.id === id)
    if (!n) return
    n.marks = n.marks.filter((_, i) => i !== index)
    await setDocData(COL, id, strip(n))
  }

  return { notes, loaded, list, load, add, addMark, removeMark }
})
