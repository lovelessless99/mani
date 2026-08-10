import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { getDocData, setDocData } from 'src/services/dataAccess'
import heavensData from 'src/data/meta/heavens.json'
import { useMeritStore } from './meritStore'

/**
 * 諸天巡禮 — rise through the twenty-eight heavens by accumulated 功德.
 *
 * There is nothing to build or manage: lifetime merit (every 遍 of practice)
 * carries the practitioner up on its own. Cross a heaven's 功德 threshold and
 * you are already there, from the ruined 娑婆 up to 非想非非想天. Each heaven
 * simply shows its own scenery.
 */

const COL = 'stats'
const ID = 'heaven'

export type StructureType = 'light' | 'tree' | 'pagoda' | 'palace'

export interface Structure {
  cost: number
  name: string
  glyph: string
}

export const STRUCTURES: Record<StructureType, Structure> = {
  light: { cost: 1, name: '明燈', glyph: '✦' },
  tree: { cost: 2, name: '菩提樹', glyph: '🌳' },
  pagoda: { cost: 4, name: '寶塔', glyph: '🗼' },
  palace: { cost: 8, name: '宮殿', glyph: '🏯' },
}

export type Motif =
  | 'ruin'
  | 'gates'
  | 'city'
  | 'air'
  | 'court'
  | 'mirage'
  | 'darkpalace'
  | 'brahma'
  | 'brahmaking'
  | 'spark'
  | 'beam'
  | 'radiance'
  | 'petal'
  | 'pure'
  | 'lake'
  | 'cloudless'
  | 'terrace'
  | 'frost'
  | 'suddhavasa'
  | 'crystal'
  | 'summit'
  | 'voidspace'
  | 'voidmind'
  | 'voidnil'
  | 'voidapex'
  | 'sukhavati'
  | 'vaidurya'
  | 'fragrance'
  | 'lotusstore'

export interface Heaven {
  id: string
  name: string
  realm: '欲界' | '色界' | '無色界' | '佛土'
  motif: Motif
  sky: string[]
  ground: string
  blurb: string
  cause: string
  /** The Buddha who presides over a 佛土 (pure land); absent for the heavens. */
  buddha?: string
}

export const HEAVENS = heavensData as Heaven[]

// Counts of each structure built on one heaven.
export type Build = Record<StructureType, number>

function emptyBuild(): Build {
  return { light: 0, tree: 0, pagoda: 0, palace: 0 }
}

interface HeavenDoc {
  tier: number
}

export const useHeavenStore = defineStore('heaven', () => {
  const merit = useMeritStore()
  const tier = ref(0) // which heaven is being viewed
  const loaded = ref(false)

  // Cumulative 功德 to reach each heaven — gentle at the base so the first
  // heavens come quickly, aspirational up high. The whole climb is automatic:
  // accumulate merit and you rise.
  function meritForTier(t: number): number {
    return t <= 0 ? 0 : Math.round(t * (t + 3))
  }
  const maxTier = computed(() => {
    let m = 0
    for (let t = 1; t < HEAVENS.length; t++) {
      if (merit.earned >= meritForTier(t)) m = t
      else break
    }
    return m
  })

  const heaven = computed(() => HEAVENS[tier.value] ?? HEAVENS[0])
  // Structures are retired — each heaven shows its own scenery only.
  const build = computed<Build>(() => emptyBuild())

  const atTop = computed(() => maxTier.value >= HEAVENS.length - 1)
  const nextTier = computed(() => Math.min(HEAVENS.length - 1, maxTier.value + 1))
  const nextHeaven = computed(() => HEAVENS[nextTier.value] ?? null)
  const prevNeed = computed(() => meritForTier(maxTier.value))
  const nextNeed = computed(() => meritForTier(maxTier.value + 1))
  const toNext = computed(() => Math.max(0, nextNeed.value - merit.earned))
  const ascendRatio = computed(() => {
    if (atTop.value) return 1
    const span = nextNeed.value - prevNeed.value
    return span <= 0 ? 1 : Math.min(1, (merit.earned - prevNeed.value) / span)
  })
  const earned = computed(() => merit.earned)

  async function load(): Promise<void> {
    const doc = await getDocData<HeavenDoc>(COL, ID)
    // Open on the highest heaven reached; the arrows look back from there.
    tier.value =
      doc && typeof doc.tier === 'number' ? Math.min(doc.tier, maxTier.value) : maxTier.value
    loaded.value = true
  }

  async function persist(): Promise<void> {
    await setDocData(COL, ID, { tier: tier.value })
  }

  async function goTo(t: number): Promise<void> {
    if (t < 0 || t > maxTier.value) return
    tier.value = t
    await persist()
  }

  return {
    tier,
    maxTier,
    loaded,
    heaven,
    build,
    earned,
    meritForTier,
    nextTier,
    nextHeaven,
    prevNeed,
    nextNeed,
    toNext,
    ascendRatio,
    atTop,
    load,
    goTo,
  }
})
