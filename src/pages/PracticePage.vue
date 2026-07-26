<template>
  <main class="page">
    <header>
      <h1 class="page-title">功課</h1>
      <p class="page-sub">逐品逐卷計數,不必整部才算一遍</p>
    </header>

    <div v-if="progressStore.loading" class="loading">
      <AppSpinner :size="34" />
    </div>

    <!-- 今日功課籤 — a deck of task cards, drawn once a day and sized by rank -->
    <section
      v-if="!progressStore.loading && dailyItems.length"
      class="deck"
      :class="{ 'deck--done': allDailyDone }"
    >
      <div class="deck__head">
        <div class="deck__ribbon">{{ daily.fastDay.value ? '十齋日 · 念地藏經' : '今日功課' }}</div>
        <span v-if="daily.lightened.value" class="deck__ease">量力而修 · 今日從簡</span>
        <span class="deck__rank">{{ rankInfo.rank.value.name }}</span>
      </div>

      <!-- Face-down: draw the day's cards from the deck -->
      <button v-if="!dailyStore.drawn" class="deck__draw" type="button" @click="drawDeck">
        <span class="deck__stack">
          <span v-for="n in 3" :key="n" class="deck__back" :style="{ transform: `translate(${(n - 2) * 6}px, ${(n - 2) * 5}px) rotate(${(n - 2) * 3}deg)` }">
            <span class="deck__back-mark">卍</span>
          </span>
        </span>
        <span class="deck__draw-main">
          <span class="deck__draw-t">抽今日功課籤</span>
          <span class="deck__draw-s">翻開 {{ dailyItems.length }} 張任務卡</span>
        </span>
      </button>

      <!-- Revealed cards -->
      <ul v-else class="deck__cards">
        <li
          v-for="(it, i) in dailyItems"
          :key="it.slot"
          class="tcard"
          :class="{ 'tcard--done': dailyStore.isDone(it.slot), 'tcard--reveal': justDrew }"
          :style="{ animationDelay: `${i * 110}ms` }"
        >
          <span class="tcard__sutra">{{ it.sutraTitle }}</span>
          <span class="tcard__chapter">{{ it.chapterName }}</span>
          <span v-if="it.gist" class="tcard__gist">{{ it.gist }}</span>
          <div class="tcard__foot">
            <button
              v-if="!dailyStore.isDone(it.slot)"
              class="tcard__do"
              type="button"
              :disabled="busy !== null"
              @click="completeDaily(it)"
            >
              <AppIcon name="check" :size="14" /> 念畢 ＋1
            </button>
            <span v-else class="tcard__done"><AppIcon name="check" :size="14" /> 今日已修</span>
          </div>
          <button class="tcard__open" type="button" @click="goDailyItem(it)">全文 ›</button>
        </li>
      </ul>
      <p v-if="allDailyDone" class="deck__all-done">✦ 今日功課圓滿 ✦</p>
    </section>

    <!-- 加分持戒 — daily bonus observances -->
    <section v-if="!progressStore.loading" class="obs">
      <p class="obs__head">加分持戒 · 今日</p>
      <ul class="obs__list">
        <li v-for="o in OBSERVANCES" :key="o.id">
          <button
            class="ob"
            type="button"
            :class="{ 'ob--on': observance.isChecked(o.id) }"
            @click="observance.toggle(o.id)"
          >
            <span class="ob__check">
              <AppIcon v-if="observance.isChecked(o.id)" name="check" :size="13" />
            </span>
            <span class="ob__main">
              <span class="ob__name">{{ o.name }}</span>
              <span class="ob__desc">{{ o.desc }}</span>
            </span>
          </button>
        </li>
      </ul>
    </section>

    <GlassCard v-if="!progressStore.loading && drillable.length" clickable class="memo" @click="pickerOpen = true">
      <div class="memo__row">
        <AppIcon name="book" :size="20" class="memo__icon" />
        <div class="memo__main">
          <h2 class="memo__title">背經</h2>
          <p class="memo__sub">以句為單位挖空,拉字塊填回原文</p>
        </div>
        <AppIcon name="chevronRight" :size="18" class="sutra__go" />
      </div>
    </GlassCard>

    <ul v-if="!progressStore.loading" class="sutras">
      <li v-for="s in sutras" :key="s.id">
        <GlassCard clickable @click="open(s.id)">
          <div class="sutra">
            <div class="sutra__main">
              <div class="sutra__titlerow">
                <h2 class="sutra__title">{{ s.titleZh }}</h2>
                <span class="mtag" :class="`mtag--t${sutraMasteryOf(s.rounds).tier}`">
                  {{ sutraMasteryOf(s.rounds).name }}
                  <span class="mtag__dots">
                    <span v-for="n in 5" :key="n" class="mtag__dot" :class="{ 'mtag__dot--on': n <= sutraMasteryOf(s.rounds).tier }" />
                  </span>
                </span>
              </div>
              <p class="sutra__meta tnum">
                <template v-if="s.rounds">已圓滿 {{ s.rounds }} 部 · </template>
                共 {{ s.total }} {{ s.unit }} · 累計 {{ s.sum }} 遍
              </p>
              <!-- A single-unit text has nothing to be part-way through:
                   one recitation is a whole 部, so the bar would only ever
                   read empty or full. -->
              <div v-if="s.total > 1" class="bar">
                <div class="bar__fill" :style="{ width: `${s.ratio * 100}%` }" />
              </div>
              <p v-if="s.total > 1" class="sutra__round tnum">
                本部進度 {{ s.inRound }} / {{ s.total }} {{ s.unit }}
              </p>
            </div>
            <AppIcon name="chevronRight" :size="18" class="sutra__go" />
          </div>

          <!-- 圓滿一部: a standalone one-tap for the whole sutra, so
               finishing all chapters at once never means opening the sheet
               and tapping every circle. Single-unit texts don't need it. -->
          <button
            v-if="s.total > 1"
            class="whole"
            type="button"
            :disabled="busy !== null"
            :class="{ 'whole--busy': busy === wholeKey(s.id) }"
            @click.stop="recordWhole(s.id)"
          >
            <AppIcon name="check" :size="15" class="whole__ico" />
            <span>圓滿一部 · 每{{ s.unit }}各＋1</span>
          </button>
        </GlassCard>
      </li>
    </ul>

    <!-- Chapter list ------------------------------------------ -->
    <AppSheet
      v-model="sheetOpen"
      :title="activeSutra?.titleZh"
      :subtitle="`點右側圓圈記錄一${activeSutra?.unit ?? '遍'}`"
    >
      <!-- 本經成就 · 念了幾遍 -->
      <div v-if="activeSutra" class="ssheet">
        <p class="ssheet__stats tnum">
          念滿 <b>{{ activeSutra.sum }}</b> 遍 · 圓滿 <b>{{ activeSutra.rounds }}</b> 部 ·
          <span class="ssheet__master">{{ sutraMasteryOf(activeSutra.rounds).name }}</span>
        </p>
        <div class="ssheet__ach">
          <span v-for="a in sutraAchievements" :key="a.name" class="ach" :class="{ 'ach--on': a.done }">
            {{ a.done ? '✦ ' : '' }}{{ a.name }}
          </span>
        </div>
        <AppButton variant="glass" icon="book" block class="ssheet__read" @click="readSutra">
          直排注音讀經
        </AppButton>
      </div>

      <ul class="chapters">
        <li v-for="c in chapters" :key="c.id" class="chapter glass">
          <div class="chapter__main">
            <p class="chapter__name">{{ c.name }}</p>
            <p v-if="c.part" class="chapter__part">{{ c.part }}</p>
          </div>

          <button
            class="tap tap--recite"
            :class="{ 'tap--busy': busy === c.id }"
            type="button"
            :disabled="busy !== null"
            :aria-label="`${c.name} 記錄一遍`"
            @click="record(c)"
          >
            <span v-if="pulse === c.id" :key="pulseKey" class="tap__ripple" />
            <span class="tap__num tnum">{{ c.count }}</span>
            <span class="tap__plus">＋1</span>
          </button>
        </li>
      </ul>
    </AppSheet>

    <!-- 背經: pick a sutra, then a range -->
    <AppSheet
      v-model="pickerOpen"
      :title="rangeSutra ? rangeMeta?.titleZh : '背經'"
      :subtitle="rangeSutra ? '選擇背誦範圍' : '選擇要背誦的經典'"
    >
      <template v-if="!rangeSutra">
        <ul class="chapters">
          <li v-for="d in drillable" :key="d.id" class="chapter glass">
            <div class="chapter__main">
              <p class="chapter__name">{{ d.titleZh }}</p>
              <p class="chapter__part">共 {{ d.count }} {{ d.unit }}</p>
            </div>
            <AppButton variant="glass" @click="openRange(d.id)">選範圍</AppButton>
          </li>
        </ul>
        <p class="memo__hint">其餘經典的全文尚未收錄,收錄後會自動出現在這裡。</p>
      </template>

      <template v-else>
        <button class="range range--all" type="button" @click="startDrill('all')">
          <span class="range__name">全部 · 不限範圍</span>
          <span class="range__sub">整部經隨機出題</span>
        </button>
        <ul class="ranges">
          <li v-for="c in rangeItems" :key="c.id">
            <button class="range" type="button" @click="startDrill(c.id)">
              <span class="range__row">
                <span class="range__name">{{ c.name }}</span>
                <span class="range__mastery" :title="masteryOf(rangeSutra, c.id).label">
                  <span
                    v-for="n in 4"
                    :key="n"
                    class="star"
                    :class="{ 'star--on': n <= masteryOf(rangeSutra, c.id).stars }"
                  >★</span>
                </span>
              </span>
              <span v-if="c.gist" class="range__gist">{{ c.gist }}</span>
            </button>
          </li>
        </ul>
        <AppButton variant="ghost" block class="range__back" @click="rangeSutra = ''">
          ← 換一部經
        </AppButton>
      </template>
    </AppSheet>

    <FillBlankDrill
      v-if="drillOpen && drillSections.length"
      :title="drillTitle"
      :sections="drillSections"
      :source="drillSource"
      @close="drillOpen = false"
      @solved="onDrillSolved"
    />

    <SutraCompleteCeremony
      :sutra-id="completed?.id ?? null"
      :sutra-title="completed?.title ?? ''"
      :round="completed?.round ?? 1"
      :gem-colors="completedGemColors"
      @dismiss="completed = null"
    />

    <UnlockCeremony :gem="gemStore.pendingUnlock" @dismiss="gemStore.clearPendingUnlock()" />
  </main>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import GlassCard from 'src/components/GlassCard.vue'
import AppIcon from 'src/components/ui/AppIcon.vue'
import AppSpinner from 'src/components/ui/AppSpinner.vue'
import AppSheet from 'src/components/ui/AppSheet.vue'
import FillBlankDrill from 'src/components/practice/FillBlankDrill.vue'
import SutraCompleteCeremony from 'src/components/practice/SutraCompleteCeremony.vue'
import UnlockCeremony from 'src/components/gems/UnlockCeremony.vue'
import { useProgressStore } from 'src/stores/progressStore'
import { useGemStore } from 'src/stores/gemStore'
import { useStreakStore } from 'src/stores/streakStore'
import { useAchievementStore } from 'src/stores/achievementStore'
import { useDailyStore } from 'src/stores/dailyStore'
import { useObservanceStore } from 'src/stores/observanceStore'
import observancesData from 'src/data/meta/observances.json'
import { getAllSutras, getSutraMeta, loadVolume } from 'src/services/sutraService'
import { SUTRA_GEM_SHAPE } from 'src/services/gemService'
import { useToast, describeError } from 'src/composables/useToast'
import { useChime } from 'src/composables/useChime'
import { useDailyTask, type DailyItem } from 'src/composables/useDailyTask'
import { useRank } from 'src/composables/useRank'
import chaptersData from 'src/data/meta/sutra-chapters.json'

type Mode = 'recite' | 'memorize'

interface ChapterMeta {
  id: string
  name: string
  part?: string
  gist?: string
}
interface SutraChapters {
  unit: string
  items: ChapterMeta[]
}

const CHAPTERS = chaptersData as unknown as Record<string, SutraChapters>

const GEM_CAP = 88

const router = useRouter()
const progressStore = useProgressStore()
const gemStore = useGemStore()
const streakStore = useStreakStore()
const achievementStore = useAchievementStore()
const chime = useChime()
const dailyStore = useDailyStore()
const observance = useObservanceStore()
const OBSERVANCES = observancesData as { id: string; name: string; desc: string }[]
const daily = useDailyTask()
const rankInfo = useRank()

const dailyItems = computed(() => daily.items.value)
const allDailyDone = computed(
  () => dailyItems.value.length > 0 && dailyItems.value.every((it) => dailyStore.isDone(it.slot))
)

// Only animate the deal when the deck is turned over in this session, not
// every time the page loads on an already-drawn day.
const justDrew = ref(false)
async function drawDeck() {
  justDrew.value = true
  await dailyStore.markDrawn()
}

// Open the drawn chapter's sutra sheet so it can be read in full.
function goDailyItem(it: DailyItem) {
  open(it.sutraId)
}

/**
 * Finish a task card: record one recitation for exactly its chapter, so the
 * card completes and the count tallies in one tap — the same crediting path
 * as the counter, streak, gem, and daily-done marking.
 */
async function completeDaily(it: DailyItem) {
  if (busy.value || dailyStore.isDone(it.slot)) return
  busy.value = it.slot
  const roundsBefore = sutras.value.find((x) => x.id === it.sutraId)?.rounds ?? 0
  try {
    await progressStore.markVolumeComplete(it.sutraId, slotKey(it.chapterId, 'recite'))
    chime.strike(0.5)
    await earnGemIfFirst(it.sutraId, it.chapterId, true)
    await streakStore.touchToday()
    await dailyStore.markDone(it.slot)
    checkMedals(1800)
    celebrateIfRoundDone(it.sutraId, roundsBefore, 1400)
  } catch (e) {
    toast.error(describeError(e))
  } finally {
    busy.value = null
  }
}

/**
 * Ask the achievement store whether this action crossed any medal
 * threshold. Delayed a beat so a gem-unlock or completion ceremony has the
 * stage first; the medal then follows rather than fighting for it.
 */
function checkMedals(delay = 900) {
  setTimeout(() => {
    achievementStore.check().catch(() => {})
  }, delay)
}
const toast = useToast()

const sheetOpen = ref(false)
const activeId = ref('')
const busy = ref<string | null>(null)
const ALL = '__all__' // busy sentinel for the whole-sutra action
const pulse = ref<string | null>(null)
const pulseKey = ref(0)
interface DrillSection {
  id: string
  name: string
  gist?: string
  paragraphs: string[]
}

const drillOpen = ref(false)
const drillSections = ref<DrillSection[]>([])
const drillSource = ref('')
const drillSutraId = ref('')
const drillChapterId = ref('')

// The drill runs against drillSutraId, which is not necessarily the sutra
// whose chapter sheet is open — so its title comes from here, not activeSutra.
const drillTitle = computed(
  () => getAllSutras().find((s) => s.id === drillSutraId.value)?.titleZh ?? ''
)

const pickerOpen = ref(false)
// Which sutra's ranges are being shown; empty means the sutra list.
const rangeSutra = ref('')
const rangeMeta = computed(() => getSutraMeta(rangeSutra.value))
const rangeItems = computed(() => CHAPTERS[rangeSutra.value]?.items ?? [])

/** Texts bundled with the app, and so available to drill against. */
const drillable = computed(() =>
  getAllSutras()
    .filter((s) => s.storageType === 'bundled')
    .map((s) => ({
      id: s.id,
      titleZh: s.titleZh,
      unit: CHAPTERS[s.id]?.unit ?? '卷',
      count: CHAPTERS[s.id]?.items.length ?? 0,
    }))
)

function openRange(sutraId: string) {
  rangeSutra.value = sutraId
}

/** chapterId 'all' loads every chapter; otherwise just that one. */
async function startDrill(chapterId: string) {
  const sutraId = rangeSutra.value
  const meta = CHAPTERS[sutraId]
  if (!meta) return
  const items = chapterId === 'all' ? meta.items : meta.items.filter((c) => c.id === chapterId)
  if (!items.length) return

  try {
    const sections: DrillSection[] = []
    let source = ''
    for (const c of items) {
      const vol = await loadVolume(sutraId, c.id)
      source = vol.source ?? source
      sections.push({
        id: c.id,
        name: c.name,
        gist: c.gist,
        paragraphs: vol.blocks.filter((b) => b.type !== 'heading').map((b) => b.text),
      })
    }
    drillSections.value = sections
    drillSource.value = source
    drillSutraId.value = sutraId
    drillChapterId.value = chapterId === 'all' ? meta.items[0].id : chapterId
    pickerOpen.value = false
    rangeSutra.value = ''
    drillOpen.value = true
  } catch (e) {
    toast.error(describeError(e))
  }
}

/**
 * A clean round is one recitation from memory, credited to the chapter
 * the question actually came from — which is why the game reports it, so
 * 全部 range still builds each 品's mastery separately. Repeated mastery
 * of a chapter also earns its gem, the same as reciting it.
 */
async function onDrillSolved(chapterId: string) {
  const id = chapterId || drillChapterId.value || CHAPTERS[drillSutraId.value]?.items[0]?.id
  if (!id) return
  try {
    await progressStore.markVolumeComplete(drillSutraId.value, `${id}-memorize`)
    chime.strike(0.6)
    await earnGemIfFirst(drillSutraId.value, id, false)
    await streakStore.touchToday()
    checkMedals()
  } catch (e) {
    toast.error(describeError(e))
  }
}

/**
 * 熟練度 — how well a chapter is known, from how many times it has been
 * recalled in the 背經 games. Recitation counting and memory practice are
 * different acts, so mastery reads the memorize tally alone.
 */
const MASTERY = [
  { at: 0, label: '生疏', stars: 0 },
  { at: 1, label: '漸熟', stars: 1 },
  { at: 3, label: '純熟', stars: 2 },
  { at: 6, label: '精熟', stars: 3 },
  { at: 12, label: '滾瓜爛熟', stars: 4 },
]

/**
 * 精通程度 — a whole sutra's proficiency, from how many 部 have been
 * completed (each 部 folds in both reciting and memorising). Every sutra
 * carries its own level and climbs its own ladder.
 */
const SUTRA_MASTERY = [
  { at: 0, name: '初習', tier: 0 },
  { at: 1, name: '通讀', tier: 1 },
  { at: 3, name: '漸熟', tier: 2 },
  { at: 7, name: '純熟', tier: 3 },
  { at: 21, name: '精通', tier: 4 },
  { at: 49, name: '圓通', tier: 5 },
]
function sutraMasteryOf(rounds: number) {
  let m = SUTRA_MASTERY[0]
  for (const level of SUTRA_MASTERY) if (rounds >= level.at) m = level
  const next = SUTRA_MASTERY.find((l) => l.at > rounds) ?? null
  return { ...m, next, toNext: next ? next.at - rounds : 0 }
}

// 本經成就 — milestones each sutra can reach, by its own 遍數 / 部數.
const SUTRA_ACH = [
  { name: '初誦', metric: 'sum', at: 1 },
  { name: '十遍', metric: 'sum', at: 10 },
  { name: '百遍', metric: 'sum', at: 100 },
  { name: '圓滿一部', metric: 'rounds', at: 1 },
  { name: '圓滿十部', metric: 'rounds', at: 10 },
] as const

const sutraAchievements = computed(() => {
  const s = activeSutra.value
  return SUTRA_ACH.map((a) => ({
    name: a.name,
    done: (a.metric === 'sum' ? (s?.sum ?? 0) : (s?.rounds ?? 0)) >= a.at,
  }))
})

// Open the sutra in the 直排注音 e-book reader, at its first 卷/品.
function readSutra() {
  const s = activeSutra.value
  if (!s) return
  const first = CHAPTERS[s.id]?.items[0]?.id
  if (first) router.push(`/reader/${s.id}/${first}`)
}
function masteryOf(sutraId: string, chapterId: string) {
  const n = countFor(sutraId, chapterId, 'memorize')
  let m = MASTERY[0]
  for (const level of MASTERY) if (n >= level.at) m = level
  return m
}
const completed = ref<{ id: string; title: string; round: number } | null>(null)

/** Stones earned from the sutra being completed, for the summoning. */
const completedGemColors = computed(() =>
  completed.value
    ? gemStore.gemsList
        .filter((g) => g.sourceRef.startsWith(`${completed.value!.id}/`))
        .map((g) => g.params.colorHex)
    : []
)

/**
 * Progress is stored per chapter and mode, as `<chapterId>-<mode>`.
 *
 * Earlier builds counted a whole sutra under a single slot ('recite',
 * 'memorize', or '001' from the original reader). Those totals are read
 * back into the first chapter so nothing recorded before is lost.
 */
function slotKey(chapterId: string, m: Mode): string {
  return `${chapterId}-${m}`
}

const LEGACY: Record<Mode, string[]> = {
  recite: ['recite', '001'],
  memorize: ['memorize'],
}

function countFor(sutraId: string, chapterId: string, m: Mode): number {
  const volumes = progressStore.progressMap[sutraId]?.volumes ?? {}
  let n = volumes[slotKey(chapterId, m)]?.count ?? 0
  if (chapterId === '001') {
    for (const k of LEGACY[m]) n += volumes[k]?.count ?? 0
  }
  return n
}

function chapterTotal(sutraId: string, chapterId: string): number {
  return countFor(sutraId, chapterId, 'recite') + countFor(sutraId, chapterId, 'memorize')
}

const sutras = computed(() =>
  getAllSutras().map((s) => {
    const meta = CHAPTERS[s.id]
    const items = meta?.items ?? []
    let sum = 0
    let lowest = Infinity
    for (const c of items) {
      const t = chapterTotal(s.id, c.id)
      sum += t
      lowest = Math.min(lowest, t)
    }

    /*
     * A 部 is one complete pass over every chapter, so the number of
     * completed 部 is the *lowest* count across them — you have not been
     * through the sutra twice until the least-read chapter has been read
     * twice. Progress toward the next 部 counts the chapters already
     * ahead of that floor, which is why the bar returns to zero the
     * moment the last straggler catches up.
     */
    const rounds = items.length ? (lowest === Infinity ? 0 : lowest) : 0
    const inRound = items.filter((c) => chapterTotal(s.id, c.id) > rounds).length

    return {
      id: s.id,
      titleZh: s.titleZh,
      unit: meta?.unit ?? '卷',
      total: items.length,
      rounds,
      inRound,
      sum,
      ratio: items.length ? inRound / items.length : 0,
    }
  })
)

const activeSutra = computed(() => sutras.value.find((s) => s.id === activeId.value))

const chapters = computed(() => {
  const meta = CHAPTERS[activeId.value]
  if (!meta) return []
  return meta.items.map((c) => ({
    ...c,
    count: countFor(activeId.value, c.id, 'recite'),
  }))
})

function open(sutraId: string) {
  activeId.value = sutraId
  sheetOpen.value = true
}

/**
 * Award the chapter's gem the first time it is opened.
 *
 * Asks the collection, not the counter: `chapterTotal` folds in the
 * legacy keys from the builds where a whole sutra shared one slot, so a
 * chapter practised back then never looks untouched — and never earned
 * its stone. Whether a gem exists is the question actually being asked,
 * and it is idempotent: a chapter that missed its gem gets one next tap.
 *
 * Each sutra keeps its own set, so the gem is fixed by the chapter's
 * position within its sutra. The 88 Buddhas/constellations belong to
 * 華嚴經 alone; other sutras are identified by their gem shape.
 */
async function earnGemIfFirst(sutraId: string, chapterId: string, announce: boolean) {
  if (gemStore.hasGemForVolume(sutraId, chapterId)) return
  const idx = (CHAPTERS[sutraId]?.items.findIndex((c) => c.id === chapterId) ?? 0) + 1
  const pair = String(Math.min(idx, 88)).padStart(3, '0')
  const isAvatamsaka = sutraId === 'avatamsaka'
  await gemStore.earnGem(
    {
      source: 'sutra_volume',
      sourceRef: `${sutraId}/${chapterId}`,
      ...(isAvatamsaka ? { buddhaId: `b${pair}`, constellationId: `c${pair}` } : {}),
      ...(SUTRA_GEM_SHAPE[sutraId] ? { geometry: SUTRA_GEM_SHAPE[sutraId] } : {}),
    },
    announce
  )
}

/** Fire the completion ceremony if this recording finished a 部. */
function celebrateIfRoundDone(sutraId: string, roundsBefore: number, delay: number) {
  const meta = sutras.value.find((x) => x.id === sutraId)
  if (meta && meta.rounds > roundsBefore) {
    chime.strike(1) // a fuller bell for a finished 部
    setTimeout(() => {
      completed.value = { id: sutraId, title: meta.titleZh, round: meta.rounds }
    }, delay)
  }
}

async function record(chapter: ChapterMeta) {
  if (busy.value) return
  busy.value = chapter.id

  pulse.value = chapter.id
  pulseKey.value += 1

  const sutraId = activeId.value
  const roundsBefore = sutras.value.find((x) => x.id === sutraId)?.rounds ?? 0

  try {
    await progressStore.markVolumeComplete(sutraId, slotKey(chapter.id, 'recite'))
    chime.strike(0.5)
    await earnGemIfFirst(sutraId, chapter.id, true)
    await streakStore.touchToday()
    await dailyStore.markDone(`${sutraId}/${chapter.id}`)
    checkMedals(1800)
    celebrateIfRoundDone(sutraId, roundsBefore, 1400)
  } catch (e) {
    toast.error(describeError(e))
  } finally {
    busy.value = null
  }
}

/**
 * One tap for a whole 部: +1 on every chapter at once, for people who
 * finished the sutra in one sitting and would otherwise tap 13 circles.
 * Gems are earned silently — the completion ceremony celebrates the set.
 */
// A per-sutra busy sentinel, so only the tapped card's button shows its
// spinner while a whole-sutra pass runs.
function wholeKey(sutraId: string): string {
  return `${ALL}:${sutraId}`
}

async function recordWhole(sutraId: string) {
  if (busy.value) return
  const items = CHAPTERS[sutraId]?.items ?? []
  if (!items.length) return
  busy.value = wholeKey(sutraId)

  const roundsBefore = sutras.value.find((x) => x.id === sutraId)?.rounds ?? 0
  try {
    for (const c of items) {
      await progressStore.markVolumeComplete(sutraId, slotKey(c.id, 'recite'))
      await earnGemIfFirst(sutraId, c.id, false)
      await dailyStore.markDone(`${sutraId}/${c.id}`)
    }
    await streakStore.touchToday()
    checkMedals(1000)
    celebrateIfRoundDone(sutraId, roundsBefore, 600)
  } catch (e) {
    toast.error(describeError(e))
  } finally {
    busy.value = null
  }
}

onMounted(async () => {
  try {
    await Promise.all([
      progressStore.loadAllProgress(),
      gemStore.loadGems(),
      streakStore.load(),
      dailyStore.load(),
      observance.load(),
    ])
  } catch (e) {
    toast.error(describeError(e))
  }
})
</script>

<style scoped>
.loading {
  display: flex;
  justify-content: center;
  padding: var(--s7) 0;
}

/* — Sutra list ————————————————————————————— */
.sutras {
  list-style: none;
  margin-top: var(--s4);
}

.sutras > li + li {
  margin-top: var(--s3);
}

.sutra {
  display: flex;
  align-items: center;
  gap: var(--s3);
}

.sutra__main {
  flex: 1;
  min-width: 0;
}

.sutra__titlerow {
  display: flex;
  align-items: center;
  gap: var(--s3);
  flex-wrap: wrap;
}
.sutra__title {
  font-size: var(--text-title);
  font-weight: 300;
  letter-spacing: 0.08em;
}

/* 精通程度 tag */
.mtag {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 2px var(--s2);
  border-radius: var(--r-full);
  font-size: var(--text-micro);
  letter-spacing: 0.08em;
  color: var(--text-faint);
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--hairline);
}
.mtag--t1 { color: #9cc8f0; border-color: rgba(96, 165, 250, 0.35); }
.mtag--t2 { color: #86efac; border-color: rgba(134, 239, 172, 0.35); }
.mtag--t3 { color: #a5f0d8; border-color: rgba(45, 212, 191, 0.4); }
.mtag--t4 { color: #e6c07a; border-color: rgba(251, 191, 36, 0.45); background: rgba(251, 191, 36, 0.08); }
.mtag--t5 { color: #f0abfc; border-color: rgba(232, 121, 249, 0.5); background: rgba(232, 121, 249, 0.1); }
.mtag__dots {
  display: inline-flex;
  gap: 2px;
}
.mtag__dot {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: currentColor;
  opacity: 0.25;
}
.mtag__dot--on {
  opacity: 1;
}

.sutra__round {
  margin-top: var(--s2);
  font-size: var(--text-micro);
  color: var(--text-faint);
  letter-spacing: 0.06em;
}

/* — 今日功課籤 · 牌組 ————————————————————————————— */
.deck {
  margin-top: var(--s5);
  padding: var(--s3) var(--s4) var(--s4);
  border-radius: var(--r-lg);
  background:
    radial-gradient(circle at 88% 0%, rgba(251, 191, 36, 0.14), transparent 55%),
    rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(251, 191, 36, 0.26);
  transition: border-color var(--base) var(--ease), background var(--base) var(--ease);
}
.deck--done {
  border-color: rgba(134, 239, 172, 0.32);
  background: rgba(134, 239, 172, 0.06);
}

.deck__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--s3);
}
.deck__ribbon {
  padding: 4px var(--s3);
  border-radius: var(--r-full);
  font-size: var(--text-micro);
  letter-spacing: 0.2em;
  text-indent: 0.2em;
  color: var(--amber);
  background: rgba(251, 191, 36, 0.12);
  border: 1px solid rgba(251, 191, 36, 0.3);
}
.deck--done .deck__ribbon {
  color: #86efac;
  background: rgba(134, 239, 172, 0.12);
  border-color: rgba(134, 239, 172, 0.3);
}
.deck__rank {
  font-size: var(--text-micro);
  letter-spacing: 0.12em;
  color: var(--text-faint);
}
.deck__ease {
  margin-left: auto;
  margin-right: var(--s2);
  font-size: var(--text-micro);
  letter-spacing: 0.06em;
  color: #86efac;
}

/* Face-down deck */
.deck__draw {
  margin-top: var(--s3);
  width: 100%;
  display: flex;
  align-items: center;
  gap: var(--s5);
  padding: var(--s4);
  border-radius: var(--r-md);
  background: rgba(255, 255, 255, 0.03);
  border: 1px dashed rgba(251, 191, 36, 0.4);
  transition: background var(--fast) var(--ease), transform var(--fast) var(--ease);
}
.deck__draw:hover {
  background: rgba(251, 191, 36, 0.08);
}
.deck__draw:active {
  transform: scale(0.99);
}
.deck__stack {
  position: relative;
  flex-shrink: 0;
  width: 52px;
  height: 68px;
}
.deck__back {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  border-radius: 6px;
  background: linear-gradient(150deg, #3a2f5e, #241d3e);
  border: 1px solid rgba(251, 191, 36, 0.4);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
}
.deck__back-mark {
  color: rgba(251, 191, 36, 0.7);
  font-size: 1.2rem;
}
.deck__draw-main {
  display: flex;
  flex-direction: column;
  text-align: left;
}
.deck__draw-t {
  font-size: var(--text-body);
  letter-spacing: 0.08em;
  color: var(--amber);
}
.deck__draw-s {
  margin-top: 2px;
  font-size: var(--text-micro);
  color: var(--text-faint);
}

/* Revealed cards — a swipeable row */
.deck__cards {
  list-style: none;
  margin-top: var(--s3);
  display: flex;
  gap: var(--s3);
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  padding-bottom: var(--s2);
  -webkit-overflow-scrolling: touch;
}
.deck__cards::-webkit-scrollbar {
  display: none;
}

.tcard {
  scroll-snap-align: start;
  flex: 0 0 66%;
  max-width: 15rem;
  display: flex;
  flex-direction: column;
  min-height: 9.5rem;
  padding: var(--s3) var(--s4);
  border-radius: var(--r-md);
  background: linear-gradient(160deg, rgba(255, 255, 255, 0.07), rgba(255, 255, 255, 0.02));
  border: 1px solid var(--hairline-strong);
}
.tcard--done {
  background: rgba(134, 239, 172, 0.06);
  border-color: rgba(134, 239, 172, 0.32);
}
.tcard--reveal {
  animation: card-deal 0.5s var(--ease-out) both;
}
@keyframes card-deal {
  from {
    opacity: 0;
    transform: translateY(-36px) rotateX(35deg) scale(0.86);
  }
}

.tcard__sutra {
  font-size: var(--text-micro);
  letter-spacing: 0.1em;
  color: var(--text-faint);
}
.tcard__chapter {
  margin-top: 3px;
  font-family: var(--font-serif);
  font-size: 1.25rem;
  letter-spacing: 0.06em;
}
.tcard__gist {
  margin-top: var(--s2);
  font-size: var(--text-micro);
  line-height: 1.6;
  color: var(--text-dim);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.tcard__foot {
  margin-top: auto;
  padding-top: var(--s3);
}
.tcard__do {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: var(--s2) var(--s4);
  border-radius: var(--r-full);
  font-size: var(--text-caption);
  letter-spacing: 0.06em;
  color: var(--amber);
  background: rgba(251, 191, 36, 0.14);
  border: 1px solid rgba(251, 191, 36, 0.4);
  transition: background var(--fast) var(--ease);
}
.tcard__do:hover {
  background: rgba(251, 191, 36, 0.24);
}
.tcard__do:disabled {
  opacity: 0.5;
}
.tcard__done {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: var(--text-caption);
  letter-spacing: 0.06em;
  color: #86efac;
}
.tcard__open {
  margin-top: var(--s2);
  align-self: flex-start;
  font-size: var(--text-micro);
  color: var(--text-faint);
}
.tcard__open:hover {
  color: var(--text-dim);
}

.deck__all-done {
  margin-top: var(--s3);
  text-align: center;
  font-size: var(--text-caption);
  letter-spacing: 0.16em;
  text-indent: 0.16em;
  color: #86efac;
}

/* — 本經成就 sheet header ——————————————————————— */
.ssheet {
  margin-bottom: var(--s4);
  padding-bottom: var(--s4);
  border-bottom: 1px solid var(--hairline);
}
.ssheet__stats {
  font-size: var(--text-caption);
  color: var(--text-dim);
}
.ssheet__stats b {
  color: var(--text);
  font-weight: 500;
}
.ssheet__master {
  color: var(--amber);
}
.ssheet__ach {
  margin-top: var(--s3);
  display: flex;
  flex-wrap: wrap;
  gap: var(--s2);
}
.ach {
  padding: 3px var(--s2);
  border-radius: var(--r-full);
  font-size: var(--text-micro);
  letter-spacing: 0.06em;
  color: var(--text-faint);
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid var(--hairline);
}
.ach--on {
  color: var(--amber);
  background: rgba(251, 191, 36, 0.1);
  border-color: rgba(251, 191, 36, 0.4);
}
.ssheet__read {
  margin-top: var(--s3);
}

/* — 加分持戒 observances ——————————————————————— */
.obs {
  margin-top: var(--s3);
  padding: var(--s3) var(--s4) var(--s4);
  border-radius: var(--r-lg);
  background: rgba(134, 239, 172, 0.05);
  border: 1px solid rgba(134, 239, 172, 0.22);
}
.obs__head {
  font-size: var(--text-micro);
  letter-spacing: 0.16em;
  text-indent: 0.16em;
  color: #86efac;
}
.obs__list {
  list-style: none;
  margin-top: var(--s3);
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--s2);
}
.ob {
  width: 100%;
  display: flex;
  align-items: center;
  gap: var(--s2);
  padding: var(--s2) var(--s3);
  border-radius: var(--r-md);
  text-align: left;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid var(--hairline);
  transition: background var(--fast) var(--ease);
}
.ob--on {
  background: rgba(134, 239, 172, 0.1);
  border-color: rgba(134, 239, 172, 0.4);
}
.ob__check {
  flex-shrink: 0;
  width: 18px;
  height: 18px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  border: 1px solid var(--hairline-strong);
  color: #071108;
}
.ob--on .ob__check {
  background: #86efac;
  border-color: #86efac;
}
.ob__main {
  min-width: 0;
  display: flex;
  flex-direction: column;
}
.ob__name {
  font-size: var(--text-caption);
  letter-spacing: 0.04em;
}
.ob__desc {
  font-size: 10px;
  color: var(--text-faint);
  line-height: 1.4;
}

.memo {
  margin-top: var(--s3);
}

.memo__row {
  display: flex;
  align-items: center;
  gap: var(--s3);
}

.memo__icon {
  color: var(--amethyst);
}

.memo__main {
  flex: 1;
  min-width: 0;
}

.memo__title {
  font-size: var(--text-title);
  font-weight: 300;
  letter-spacing: 0.1em;
}

.memo__sub {
  margin-top: var(--s1);
  font-size: var(--text-micro);
  color: var(--text-faint);
  letter-spacing: 0.05em;
}

.ranges {
  list-style: none;
  display: grid;
  gap: var(--s2);
}

.range {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: var(--s3) var(--s4);
  border-radius: var(--r-md);
  border: 1px solid var(--hairline);
  background: rgba(255, 255, 255, 0.03);
  text-align: left;
  transition:
    background var(--fast) var(--ease),
    border-color var(--fast) var(--ease),
    transform var(--fast) var(--ease);
}

.range:hover {
  background: var(--glass-2);
  border-color: rgba(167, 139, 250, 0.4);
  transform: translateY(-2px);
}

.range:active {
  transform: scale(0.99);
}

.range--all {
  margin-bottom: var(--s3);
  border-color: rgba(167, 139, 250, 0.45);
  background: rgba(167, 139, 250, 0.1);
}

.range__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--s2);
}

.range__mastery {
  flex-shrink: 0;
  font-size: 11px;
  letter-spacing: 1px;
}

.star {
  color: rgba(255, 255, 255, 0.14);
}

.star--on {
  color: var(--amber);
}

.range__name {
  font-size: var(--text-body);
  letter-spacing: 0.06em;
  color: var(--text);
}

.range__sub,
.range__gist {
  font-size: var(--text-micro);
  line-height: 1.6;
  color: var(--text-faint);
  letter-spacing: 0.04em;
}

.range__back {
  margin-top: var(--s4);
}

.memo__hint {
  margin-top: var(--s4);
  font-size: var(--text-micro);
  line-height: 1.7;
  color: var(--text-faint);
}

/* — 圓滿一部 standalone action on each sutra card —————— */
.whole {
  margin-top: var(--s3);
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--s2);
  padding: var(--s2) var(--s3);
  border-radius: var(--r-md);
  font-size: var(--text-caption);
  letter-spacing: 0.06em;
  color: var(--amber);
  background: rgba(251, 191, 36, 0.1);
  border: 1px solid rgba(251, 191, 36, 0.3);
  transition:
    background var(--fast) var(--ease),
    opacity var(--fast) var(--ease);
}
.whole:hover {
  background: rgba(251, 191, 36, 0.18);
}
.whole:active {
  transform: scale(0.99);
}
.whole:disabled {
  opacity: 0.5;
}
.whole--busy {
  opacity: 0.6;
}
.whole__ico {
  flex-shrink: 0;
}

.drill-cta {
  margin-bottom: var(--s4);
}

.sutra__meta {
  margin-top: var(--s1);
  font-size: var(--text-micro);
  color: var(--text-faint);
  letter-spacing: 0.06em;
}

.sutra__go {
  color: var(--text-faint);
}

.bar {
  margin-top: var(--s3);
  height: 2px;
  border-radius: var(--r-full);
  background: rgba(255, 255, 255, 0.07);
  overflow: hidden;
}

.bar__fill {
  height: 100%;
  background: linear-gradient(90deg, var(--sapphire), var(--amethyst));
  transition: width var(--slow) var(--ease-out);
}

/* — Chapter list ——————————————————————————— */
.chapters {
  list-style: none;
}

.chapter {
  display: flex;
  align-items: center;
  gap: var(--s3);
  padding: var(--s3) var(--s3) var(--s3) var(--s4);
  border-radius: var(--r-md);
}

.chapters > .chapter + .chapter {
  margin-top: var(--s2);
}

.chapter__main {
  flex: 1;
  min-width: 0;
}

.chapter__name {
  font-size: var(--text-caption);
  letter-spacing: 0.05em;
  line-height: 1.5;
}

.chapter__part {
  margin-top: 1px;
  font-size: var(--text-micro);
  color: var(--text-faint);
  letter-spacing: 0.08em;
}

/* — Tap target ————————————————————————————— */
.tap {
  position: relative;
  flex-shrink: 0;
  width: 46px;
  height: 46px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  color: var(--text);
  border: 1px solid;
  transition:
    transform var(--fast) var(--ease),
    background var(--fast) var(--ease),
    border-color var(--fast) var(--ease);
}

.tap--recite {
  background: rgba(96, 165, 250, 0.1);
  border-color: rgba(96, 165, 250, 0.3);
}
.tap--recite:hover:not(:disabled) {
  background: rgba(96, 165, 250, 0.2);
  border-color: rgba(96, 165, 250, 0.55);
}
.tap--recite .tap__plus {
  color: var(--sapphire);
}

.tap--memorize {
  background: rgba(167, 139, 250, 0.1);
  border-color: rgba(167, 139, 250, 0.3);
}
.tap--memorize:hover:not(:disabled) {
  background: rgba(167, 139, 250, 0.2);
  border-color: rgba(167, 139, 250, 0.55);
}
.tap--memorize .tap__plus {
  color: var(--amethyst);
}

.tap:active:not(:disabled) {
  transform: scale(0.9);
}
.tap:disabled {
  cursor: default;
}
.tap--busy {
  opacity: 0.6;
}
.tap:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 3px;
}

.tap__num,
.tap__plus {
  grid-area: 1 / 1;
  transition:
    opacity var(--fast) var(--ease),
    transform var(--fast) var(--ease);
}

.tap__num {
  font-size: 0.95rem;
  font-weight: 300;
}

.tap__plus {
  font-size: var(--text-micro);
  opacity: 0;
  transform: scale(0.7);
}

.tap:hover:not(:disabled) .tap__num,
.tap:active:not(:disabled) .tap__num {
  opacity: 0;
  transform: scale(0.7);
}

.tap:hover:not(:disabled) .tap__plus,
.tap:active:not(:disabled) .tap__plus {
  opacity: 1;
  transform: scale(1);
}

.tap__ripple {
  position: absolute;
  inset: -1px;
  border-radius: 50%;
  border: 1.5px solid currentColor;
  pointer-events: none;
  animation: ripple 620ms var(--ease-out) forwards;
}

@keyframes ripple {
  0% {
    opacity: 0.9;
    transform: scale(1);
  }
  100% {
    opacity: 0;
    transform: scale(1.9);
  }
}
</style>
