<template>
  <main class="page">
    <header>
      <h1 class="page-title">功課</h1>
      <p class="page-sub">逐品逐卷計數,不必整部才算一遍</p>
    </header>

    <div v-if="progressStore.loading" class="loading">
      <AppSpinner :size="34" />
    </div>

    <!-- 今日功課籤 — the day's drawn reading, sized by rank -->
    <section
      v-if="!progressStore.loading && dailyItems.length"
      class="draw"
      :class="{ 'draw--done': allDailyDone }"
    >
      <div class="draw__head">
        <div class="draw__ribbon">今日功課</div>
        <span class="draw__rank">{{ rankInfo.rank.value.name }}</span>
      </div>
      <ul class="draw__list">
        <li v-for="it in dailyItems" :key="it.slot">
          <button class="ditem" type="button" @click="goDailyItem(it)">
            <span class="ditem__check" :class="{ 'ditem__check--on': dailyStore.isDone(it.slot) }">
              <AppIcon v-if="dailyStore.isDone(it.slot)" name="check" :size="13" />
            </span>
            <span class="ditem__main">
              <span class="ditem__sutra">{{ it.sutraTitle }}</span>
              <span class="ditem__chapter">{{ it.chapterName }}</span>
            </span>
            <span class="ditem__go">›</span>
          </button>
        </li>
      </ul>
      <p v-if="allDailyDone" class="draw__all-done">✦ 今日功課圓滿 ✦</p>
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
              <h2 class="sutra__title">{{ s.titleZh }}</h2>
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

const progressStore = useProgressStore()
const gemStore = useGemStore()
const streakStore = useStreakStore()
const achievementStore = useAchievementStore()
const chime = useChime()
const dailyStore = useDailyStore()
const daily = useDailyTask()
const rankInfo = useRank()

const dailyItems = computed(() => daily.items.value)
const allDailyDone = computed(
  () => dailyItems.value.length > 0 && dailyItems.value.every((it) => dailyStore.isDone(it.slot))
)

// Open the drawn chapter's sutra sheet so it can be recited straight away.
function goDailyItem(it: DailyItem) {
  open(it.sutraId)
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

.sutra__title {
  font-size: var(--text-title);
  font-weight: 300;
  letter-spacing: 0.08em;
}

.sutra__round {
  margin-top: var(--s2);
  font-size: var(--text-micro);
  color: var(--text-faint);
  letter-spacing: 0.06em;
}

/* — 今日功課籤 ————————————————————————————————— */
.draw {
  margin-top: var(--s5);
  padding: var(--s3) var(--s4) var(--s4);
  border-radius: var(--r-lg);
  background:
    radial-gradient(circle at 88% 0%, rgba(251, 191, 36, 0.14), transparent 55%),
    rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(251, 191, 36, 0.26);
  transition: border-color var(--base) var(--ease), background var(--base) var(--ease);
}

.draw--done {
  border-color: rgba(134, 239, 172, 0.32);
  background: rgba(134, 239, 172, 0.06);
}

.draw__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--s3);
}

.draw__ribbon {
  padding: 4px var(--s3);
  border-radius: var(--r-full);
  font-size: var(--text-micro);
  letter-spacing: 0.2em;
  text-indent: 0.2em;
  color: var(--amber);
  background: rgba(251, 191, 36, 0.12);
  border: 1px solid rgba(251, 191, 36, 0.3);
}
.draw--done .draw__ribbon {
  color: #86efac;
  background: rgba(134, 239, 172, 0.12);
  border-color: rgba(134, 239, 172, 0.3);
}

.draw__rank {
  font-size: var(--text-micro);
  letter-spacing: 0.12em;
  color: var(--text-faint);
}

.draw__list {
  list-style: none;
  margin-top: var(--s3);
  display: grid;
  gap: var(--s2);
}

.ditem {
  width: 100%;
  display: flex;
  align-items: center;
  gap: var(--s3);
  padding: var(--s2) var(--s3);
  border-radius: var(--r-md);
  text-align: left;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid var(--hairline);
  transition: background var(--fast) var(--ease);
}
.ditem:hover {
  background: rgba(255, 255, 255, 0.08);
}
.ditem:active {
  transform: scale(0.99);
}

.ditem__check {
  flex-shrink: 0;
  width: 20px;
  height: 20px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  border: 1px solid var(--hairline-strong);
  color: #071108;
}
.ditem__check--on {
  background: #86efac;
  border-color: #86efac;
}

.ditem__main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.ditem__sutra {
  font-size: var(--text-micro);
  letter-spacing: 0.1em;
  color: var(--text-faint);
}

.ditem__chapter {
  margin-top: 1px;
  font-family: var(--font-serif);
  font-size: var(--text-body);
  letter-spacing: 0.06em;
}

.ditem__go {
  flex-shrink: 0;
  color: var(--text-faint);
  font-size: 1.1rem;
}

.draw__all-done {
  margin-top: var(--s3);
  text-align: center;
  font-size: var(--text-caption);
  letter-spacing: 0.16em;
  text-indent: 0.16em;
  color: #86efac;
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
