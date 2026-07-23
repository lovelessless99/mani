import { computed } from 'vue'
import ranksData from 'src/data/meta/ranks.json'
import { useProgressStore } from 'src/stores/progressStore'
import { getAllSutras } from 'src/services/sutraService'

/**
 * 稱號 · rank
 *
 * A single ladder the whole app reads off. Rank rises with 修行分 — the
 * lifetime count of recitations and memorised passes — and each rung sets
 * how much the daily draw asks for (華嚴 品數 + 其它經份數). Beginners get a
 * gentle single-chapter day; seasoned practitioners are handed more.
 */

export interface Rank {
  at: number
  name: string
  epithet: string
  huayan: number
  others: number
}

export const RANKS = ranksData as Rank[]

export function rankForScore(score: number): Rank {
  let r = RANKS[0]
  for (const level of RANKS) if (score >= level.at) r = level
  return r
}

/** 修行分 across every sutra: every recorded 遍 counts, recite or memorise. */
export function practiceScore(): number {
  const progress = useProgressStore()
  let score = 0
  for (const s of getAllSutras()) {
    const volumes = progress.progressMap[s.id]?.volumes ?? {}
    for (const vp of Object.values(volumes)) score += vp.count
  }
  return score
}

export function useRank() {
  const score = computed(() => practiceScore())
  const rank = computed(() => rankForScore(score.value))
  const nextRank = computed(() => RANKS.find((r) => r.at > score.value) ?? null)
  const toNext = computed(() =>
    nextRank.value ? Math.max(0, nextRank.value.at - score.value) : 0
  )
  return { score, rank, nextRank, toNext }
}
