import { computed } from 'vue'
import { getAllSutras } from 'src/services/sutraService'
import chaptersData from 'src/data/meta/sutra-chapters.json'
import { useRank } from 'src/composables/useRank'

/**
 * 今日功課籤 — a small assigned reading, drawn for the day and sized by rank.
 *
 * The draw is deterministic from the calendar day, so the card holds steady
 * from morning to midnight and everyone on the same day is pointed at the
 * same passages. Composition follows the rule the practice asks for:
 *   · 華嚴經 always contributes at least one 卷 (rank sets how many), and the
 *     very last 卷 is held back — 入法界品's close is not a warm-up.
 *   · other sutras contribute one 品/卷 each, as many as the rank allows,
 *     drawn from different texts so the day has variety.
 * Rank scales both counts, so a beginner gets a gentle single passage and a
 * seasoned practitioner a fuller course.
 */

interface ChapterMeta {
  id: string
  name: string
  gist?: string
}
interface SutraChapters {
  unit: string
  items: ChapterMeta[]
}

const CHAPTERS = chaptersData as unknown as Record<string, SutraChapters>
const HUAYAN_ID = 'avatamsaka'

export interface DailyItem {
  sutraId: string
  sutraTitle: string
  unit: string
  chapterId: string
  chapterName: string
  gist?: string
  slot: string // `${sutraId}/${chapterId}`, matching progress + daily keys
}

export function useDailyTask() {
  const { rank } = useRank()

  const items = computed<DailyItem[]>(() => {
    const day = Math.floor(Date.now() / 86_400_000)
    const out: DailyItem[] = []

    const sutras = getAllSutras()
    const byId = new Map(sutras.map((s) => [s.id, s]))

    function push(sutraId: string, c: ChapterMeta, unit: string) {
      const s = byId.get(sutraId)
      if (!s) return
      out.push({
        sutraId,
        sutraTitle: s.titleZh,
        unit,
        chapterId: c.id,
        chapterName: c.name,
        gist: c.gist,
        slot: `${sutraId}/${c.id}`,
      })
    }

    // 華嚴經 — take rank.huayan consecutive 卷, never the last one.
    const hua = CHAPTERS[HUAYAN_ID]
    if (hua && hua.items.length > 1) {
      const pool = hua.items.slice(0, hua.items.length - 1) // exclude final 卷
      const want = Math.min(rank.value.huayan, pool.length)
      const start = day % pool.length
      for (let k = 0; k < want; k++) push(HUAYAN_ID, pool[(start + k) % pool.length], hua.unit)
    }

    // Other sutras — one unit each, from as many distinct texts as the rank
    // allows, chosen deterministically so the set is stable for the day.
    const others = sutras.filter((s) => s.id !== HUAYAN_ID && (CHAPTERS[s.id]?.items.length ?? 0) > 0)
    const wantOthers = Math.min(rank.value.others, others.length)
    for (let k = 0; k < wantOthers; k++) {
      const s = others[(day + k) % others.length]
      const meta = CHAPTERS[s.id]
      const c = meta.items[(day + k) % meta.items.length]
      push(s.id, c, meta.unit)
    }

    return out
  })

  return { items }
}
