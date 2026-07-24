import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { getDocData, setDocData } from 'src/services/dataAccess'
import heavensData from 'src/data/meta/heavens.json'
import { useGemStore } from './gemStore'
import { useProgressStore } from './progressStore'

// 華嚴經 is the spine of the ascent: the heavens open by reciting it. This is
// its sutra id and how many 卷 of it each rung asks for.
const HUAYAN_ID = 'avatamsaka'
const HUAYAN_PER_TIER = 3 // 卷 of 華嚴 needed for each heaven above the last

/**
 * 諸天巡禮 — build a world up through the twenty-eight heavens.
 *
 * Every gem collected lends one 功德之力 (power). That power is *allocated*,
 * never spent away: the gems stay in the collection, but how much you can
 * build at once is bounded by how many you hold. You raise structures on the
 * current heaven — trees, pagodas, palaces, lamps — and once a heaven is
 * built up enough it opens the ascent to the next, from the ruined 娑婆 all
 * the way to 非想非非想天. Removing a structure returns its power, so the
 * land can always be rearranged.
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

// How much building a heaven needs before its ascent opens. Gentle at the
// base, a little steeper with altitude, but capped so the whole climb stays
// within reach of a near-complete collection.
function threshold(tier: number): number {
  return Math.min(3 + Math.floor(tier / 4), 7)
}

function buildValue(b: Build): number {
  return (
    b.light * STRUCTURES.light.cost +
    b.tree * STRUCTURES.tree.cost +
    b.pagoda * STRUCTURES.pagoda.cost +
    b.palace * STRUCTURES.palace.cost
  )
}

interface HeavenDoc {
  tier: number
  maxTier: number
  builds: Record<string, Build>
  litLamps?: number
}

// Cumulative 卷 of 華嚴經 recited (repeats count — every pass is merit).
function huayanRecited(): number {
  const p = useProgressStore()
  const vols = p.progressMap[HUAYAN_ID]?.volumes ?? {}
  let n = 0
  for (const [key, vp] of Object.entries(vols)) {
    if (!key.endsWith('-memorize') && key !== 'memorize') n += vp.count
  }
  return n
}

export const useHeavenStore = defineStore('heaven', () => {
  const tier = ref(0) // which heaven is being viewed
  const maxTier = ref(0) // highest heaven unlocked
  const builds = ref<Record<string, Build>>({})
  const litLamps = ref(0) // lamps kindled at the 無盡燈, one tap each
  const loaded = ref(false)

  const heaven = computed(() => HEAVENS[tier.value] ?? HEAVENS[0])
  const build = computed(() => builds.value[tier.value] ?? emptyBuild())

  // Total power tied up across every heaven built so far.
  const spent = computed(() =>
    Object.values(builds.value).reduce((n, b) => n + buildValue(b), 0)
  )
  const totalPower = computed(() => useGemStore().gemsList.length)
  const freePower = computed(() => Math.max(0, totalPower.value - spent.value))

  // Building is now adornment, not the gate — it beautifies each heaven.
  const tierValue = computed(() => buildValue(build.value))
  const tierGoal = computed(() => threshold(tier.value))
  const tierRatio = computed(() => Math.min(1, tierValue.value / tierGoal.value))

  // 華嚴經 gates the ascent. Reaching heaven N asks for N·HUAYAN_PER_TIER 卷
  // recited in all, so the whole climb is roughly one full 華嚴 — the sutra
  // carries the practitioner up through the heavens.
  const huayanVols = computed(() => huayanRecited())
  function ascendNeed(t: number): number {
    return t * HUAYAN_PER_TIER
  }
  const nextNeed = computed(() => ascendNeed(tier.value + 1))
  const ascendRatio = computed(() => Math.min(1, huayanVols.value / Math.max(1, nextNeed.value)))

  const canAscend = computed(
    () => tier.value < HEAVENS.length - 1 && huayanVols.value >= nextNeed.value
  )
  const atTop = computed(() => maxTier.value >= HEAVENS.length - 1)

  async function load(): Promise<void> {
    const doc = await getDocData<HeavenDoc>(COL, ID)
    if (doc) {
      maxTier.value = doc.maxTier ?? 0
      tier.value = Math.min(doc.tier ?? 0, maxTier.value)
      builds.value = doc.builds ?? {}
      litLamps.value = doc.litLamps ?? 0
    }
    loaded.value = true
  }

  async function persist(): Promise<void> {
    await setDocData(COL, ID, {
      tier: tier.value,
      maxTier: maxTier.value,
      builds: builds.value,
      litLamps: litLamps.value,
    })
  }

  /** Kindle one more lamp at the 無盡燈 — an unbounded, cumulative act. */
  async function lightLamp(): Promise<void> {
    litLamps.value += 1
    await persist()
  }

  function affordable(type: StructureType): boolean {
    return freePower.value >= STRUCTURES[type].cost
  }

  async function place(type: StructureType): Promise<boolean> {
    if (!affordable(type)) return false
    const b = { ...(builds.value[tier.value] ?? emptyBuild()) }
    b[type] += 1
    builds.value = { ...builds.value, [tier.value]: b }
    await persist()
    return true
  }

  async function remove(type: StructureType): Promise<void> {
    const cur = builds.value[tier.value]
    if (!cur || cur[type] <= 0) return
    const b = { ...cur, [type]: cur[type] - 1 }
    builds.value = { ...builds.value, [tier.value]: b }
    await persist()
  }

  /** Reclaim everything built on the current heaven, freeing its power. */
  async function clearTier(): Promise<void> {
    if (!builds.value[tier.value]) return
    const next = { ...builds.value }
    delete next[tier.value]
    builds.value = next
    await persist()
  }

  async function ascend(): Promise<boolean> {
    if (!canAscend.value) return false
    tier.value += 1
    if (tier.value > maxTier.value) maxTier.value = tier.value
    await persist()
    return true
  }

  async function goTo(t: number): Promise<void> {
    if (t < 0 || t > maxTier.value) return
    tier.value = t
    await persist()
  }

  return {
    tier,
    maxTier,
    builds,
    litLamps,
    loaded,
    heaven,
    build,
    spent,
    totalPower,
    freePower,
    tierValue,
    tierGoal,
    tierRatio,
    huayanVols,
    nextNeed,
    ascendRatio,
    ascendNeed,
    canAscend,
    atTop,
    load,
    lightLamp,
    affordable,
    place,
    remove,
    clearTier,
    ascend,
    goTo,
  }
})
