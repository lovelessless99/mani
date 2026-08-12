<template>
  <main class="page">
    <header>
      <h1 class="page-title">修行軌跡</h1>
      <p class="page-sub">近期打卡 · 誦讀足跡</p>
    </header>

    <!-- 菩提種子 · streak hero ------------------------------- -->
    <section class="hero" :class="{ 'hero--lit': streak.shownCount > 0 }">
      <span class="hero__glyph">{{ streak.stage.glyph }}</span>
      <div class="hero__body">
        <p class="hero__count">
          <b class="tnum">{{ streak.shownCount }}</b><span class="hero__unit">天連續</span>
        </p>
        <p class="hero__stage">{{ streak.stage.name }} · {{ streak.stage.blurb }}</p>
        <div class="hero__bar"><div class="hero__fill" :style="{ width: `${nextPct}%` }" /></div>
        <p class="hero__next tnum">
          <template v-if="streak.nextStage">
            再 {{ streak.nextStage.at - streak.shownCount }} 天成「{{ streak.nextStage.name }}」
          </template>
          <template v-else>已臻菩提樹 ✦</template>
          · 最長 {{ streak.best }} 天
        </p>
      </div>
    </section>

    <!-- Check-in heatmap ------------------------------------- -->
    <GlassCard class="board">
      <div class="board__head">
        <p class="section-label">打卡軌跡</p>
        <span class="board__legend">
          <span class="cell cell--off" /><span class="cell cell--on" /> 有修
        </span>
      </div>
      <div class="heat-scroll">
        <div class="heat-months">
          <span v-for="(m, i) in monthLabels" :key="i" class="heat-month">{{ m }}</span>
        </div>
        <div class="heat">
          <div v-for="(week, wi) in weeks" :key="wi" class="heat__col">
            <span
              v-for="d in week"
              :key="d.key"
              class="cell"
              :class="{
                'cell--on': d.active,
                'cell--today': d.key === todayKey,
                'cell--blank': d.blank,
              }"
              :title="d.key"
            />
          </div>
        </div>
      </div>
      <p class="board__foot tnum">
        近 {{ activeInWindow }} 天有修 · 連續 {{ streak.shownCount }} 天 · 最長 {{ streak.best }} 天
      </p>
    </GlassCard>

    <!-- Totals ----------------------------------------------- -->
    <ul class="stats">
      <li v-for="s in stats" :key="s.label" class="stat">
        <span class="stat__icon">{{ s.icon }}</span>
        <span class="stat__n tnum" :style="{ color: s.color }">{{ s.value }}</span>
        <span class="stat__l">{{ s.label }}</span>
      </li>
    </ul>

    <!-- 讀經 resume ------------------------------------------ -->
    <GlassCard v-if="reading.last" class="read" clickable @click="resume">
      <p class="section-label">上次讀到</p>
      <p class="read__title">{{ reading.last.sutraTitle }} · {{ reading.last.volumeLabel }}</p>
      <div class="read__bar"><div class="read__fill" :style="{ width: `${reading.last.progress * 100}%` }" /></div>
      <p class="read__meta tnum">
        {{ relDate(reading.last.at) }} · 讀到約 {{ Math.round(reading.last.progress * 100) }}%
      </p>
      <p v-if="reading.dedicated" class="read__ded">
        ✦ 迴向書籤:{{ reading.dedicated.sutraTitle }} · {{ reading.dedicated.volumeLabel }}
      </p>
    </GlassCard>
  </main>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import GlassCard from 'src/components/GlassCard.vue'
import { useProgressStore } from 'src/stores/progressStore'
import { useGemStore } from 'src/stores/gemStore'
import { useStreakStore } from 'src/stores/streakStore'
import { useChantStore } from 'src/stores/chantStore'
import { useReadingStore } from 'src/stores/readingStore'
import { getAllSutras } from 'src/services/sutraService'
import chaptersData from 'src/data/meta/sutra-chapters.json'
import { useToast, describeError } from 'src/composables/useToast'

const CHAPTERS = chaptersData as unknown as Record<string, { items: { id: string }[] }>

const router = useRouter()
const progressStore = useProgressStore()
const gemStore = useGemStore()
const streak = useStreakStore()
const chant = useChantStore()
const reading = useReadingStore()
const toast = useToast()

// Progress through the current 菩提種子 stage toward the next.
const nextPct = computed(() => {
  const s = streak.stage
  const n = streak.nextStage
  if (!n) return 100
  const span = n.at - s.at
  return span > 0 ? Math.min(100, Math.max(0, ((streak.shownCount - s.at) / span) * 100)) : 0
})

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const todayKey = dayKey(new Date())

const WEEKS = 18 // ~4 months of check-ins

// A GitHub-style grid: columns are weeks, rows are weekdays (Sun→Sat), the
// last column ending today. Days before the window are blank spacers.
const weeks = computed(() => {
  const active = streak.activeSet
  const today = new Date()
  const end = new Date(today)
  end.setDate(end.getDate() + (6 - end.getDay())) // pad to end of this week
  const start = new Date(end)
  start.setDate(start.getDate() - (WEEKS * 7 - 1))

  const cols: { key: string; active: boolean; blank: boolean }[][] = []
  const cur = new Date(start)
  for (let w = 0; w < WEEKS; w++) {
    const col: { key: string; active: boolean; blank: boolean }[] = []
    for (let d = 0; d < 7; d++) {
      const key = dayKey(cur)
      const future = cur > today
      col.push({ key, active: active.has(key), blank: future })
      cur.setDate(cur.getDate() + 1)
    }
    cols.push(col)
  }
  return cols
})

const activeInWindow = computed(() => {
  let n = 0
  for (const w of weeks.value) for (const d of w) if (d.active) n++
  return n
})

// Month markers above the grid: label a column when its month first appears.
const monthLabels = computed(() =>
  weeks.value.map((col, i) => {
    const first = col.find((d) => !d.blank) ?? col[0]
    const m = new Date(first.key).getMonth()
    const prevCol = i > 0 ? weeks.value[i - 1] : null
    const prevFirst = prevCol ? (prevCol.find((d) => !d.blank) ?? prevCol[0]) : null
    const pm = prevFirst ? new Date(prevFirst.key).getMonth() : -1
    return m !== pm ? `${m + 1}月` : ''
  })
)

// Cumulative totals across every sutra.
const totals = computed(() => {
  let recite = 0
  let memorize = 0
  let rounds = 0
  for (const s of getAllSutras()) {
    const volumes = progressStore.progressMap[s.id]?.volumes ?? {}
    const items = CHAPTERS[s.id]?.items ?? []
    let lowest = items.length ? Infinity : 0
    for (const c of items) {
      const r = volumes[`${c.id}-recite`]?.count ?? volumes[c.id]?.count ?? 0
      const m = volumes[`${c.id}-memorize`]?.count ?? 0
      lowest = Math.min(lowest, r + m)
    }
    for (const [key, vp] of Object.entries(volumes)) {
      if (key.endsWith('-memorize') || key === 'memorize') memorize += vp.count
      else recite += vp.count
    }
    rounds += items.length && lowest !== Infinity ? lowest : 0
  }
  return { recite, memorize, rounds }
})

const stats = computed(() => [
  { label: '念經遍', value: totals.value.recite, color: 'var(--sapphire)', icon: '📖' },
  { label: '背誦遍', value: totals.value.memorize, color: 'var(--amethyst)', icon: '🧠' },
  { label: '持咒遍', value: chant.grandTotal, color: 'var(--amber)', icon: '📿' },
  { label: '圓滿部', value: totals.value.rounds, color: 'var(--emerald)', icon: '✦' },
  { label: '寶石', value: gemStore.gemsList.length, color: '#f0abfc', icon: '💎' },
  { label: '累計天', value: streak.total, color: 'var(--aqua)', icon: '🗓️' },
])

function relDate(iso: string): string {
  const d = new Date(iso)
  const days = Math.floor((Date.now() - d.getTime()) / 86_400_000)
  if (days <= 0) return '今天'
  if (days === 1) return '昨天'
  if (days < 7) return `${days} 天前`
  return d.toLocaleDateString('zh-TW', { month: 'long', day: 'numeric' })
}

function resume() {
  const m = reading.last
  if (m) router.push(`/reader/${m.sutraId}/${m.volumeId}?p=${m.page ?? 0}`)
}

onMounted(async () => {
  try {
    await Promise.all([
      progressStore.loadAllProgress(),
      gemStore.loadGems(),
      streak.load(),
      chant.load(),
      reading.load(),
    ])
  } catch (e) {
    toast.error(describeError(e))
  }
})
</script>

<style scoped>
/* — 菩提種子 hero — */
.hero {
  margin-top: var(--s5);
  display: flex;
  align-items: center;
  gap: var(--s4);
  padding: var(--s4) var(--s5);
  border-radius: var(--r-lg);
  background:
    radial-gradient(circle at 12% 0%, rgba(134, 239, 172, 0.16), transparent 60%),
    radial-gradient(circle at 100% 100%, rgba(96, 165, 250, 0.12), transparent 55%),
    rgba(255, 255, 255, 0.04);
  border: 1px solid var(--hairline-strong);
}
.hero__glyph {
  flex-shrink: 0;
  font-size: 2.8rem;
  line-height: 1;
  filter: grayscale(0.4);
  opacity: 0.65;
  transition: opacity var(--base) var(--ease), filter var(--base) var(--ease);
}
.hero--lit .hero__glyph {
  filter: none;
  opacity: 1;
  text-shadow: 0 0 24px rgba(134, 239, 172, 0.5);
}
.hero__body {
  flex: 1;
  min-width: 0;
}
.hero__count {
  display: flex;
  align-items: baseline;
  gap: var(--s2);
}
.hero__count b {
  font-size: 2.4rem;
  font-weight: 200;
  line-height: 1;
  color: #86efac;
}
.hero__unit {
  font-size: var(--text-caption);
  letter-spacing: 0.1em;
  color: var(--text-faint);
}
.hero__stage {
  margin-top: var(--s2);
  font-size: var(--text-caption);
  letter-spacing: 0.06em;
  color: var(--text-dim);
}
.hero__bar {
  margin-top: var(--s3);
  height: 4px;
  border-radius: var(--r-full);
  background: rgba(255, 255, 255, 0.08);
  overflow: hidden;
}
.hero__fill {
  height: 100%;
  border-radius: var(--r-full);
  background: linear-gradient(90deg, #86efac, #34d399);
  box-shadow: 0 0 8px rgba(134, 239, 172, 0.6);
  transition: width var(--slow) var(--ease-out);
}
.hero__next {
  margin-top: var(--s2);
  font-size: var(--text-micro);
  letter-spacing: 0.04em;
  color: var(--text-faint);
}

.board {
  margin-top: var(--s4);
}
.board__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.board__legend {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: var(--text-micro);
  color: var(--text-faint);
}

.heat-scroll {
  margin-top: var(--s3);
  overflow-x: auto;
  padding-bottom: var(--s2);
}
.heat-scroll::-webkit-scrollbar {
  display: none;
}
.heat-months {
  display: flex;
  gap: 3px;
  margin-bottom: 4px;
}
.heat-month {
  width: 14px;
  flex-shrink: 0;
  font-size: 9px;
  letter-spacing: 0.02em;
  color: var(--text-faint);
  white-space: nowrap;
  overflow: visible;
}
.heat {
  display: flex;
  gap: 3px;
}
.heat__col {
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.cell {
  width: 14px;
  height: 14px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.05);
  flex-shrink: 0;
}
.cell--off {
  display: inline-block;
}
.cell--on {
  background: linear-gradient(135deg, #86efac, #34d399);
  box-shadow: 0 0 7px -1px rgba(134, 239, 172, 0.75);
  display: inline-block;
}
.cell--today {
  outline: 1px solid var(--amber);
  outline-offset: 1px;
}
.cell--blank {
  background: transparent;
}

.board__foot {
  margin-top: var(--s3);
  font-size: var(--text-micro);
  color: var(--text-dim);
  letter-spacing: 0.04em;
}

.stats {
  list-style: none;
  margin-top: var(--s4);
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--s3);
}
.stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: var(--s4) 0 var(--s3);
  border-radius: var(--r-md);
  background:
    radial-gradient(circle at 50% 0%, rgba(255, 255, 255, 0.05), transparent 70%),
    rgba(255, 255, 255, 0.035);
  border: 1px solid var(--hairline);
}
.stat__icon {
  font-size: 1.05rem;
  line-height: 1;
  opacity: 0.9;
}
.stat__n {
  font-size: 1.5rem;
  font-weight: 200;
  line-height: 1;
}
.stat__l {
  font-size: var(--text-micro);
  letter-spacing: 0.1em;
  color: var(--text-faint);
}

.read {
  margin-top: var(--s4);
}
.read__title {
  margin-top: var(--s2);
  font-family: var(--font-serif);
  font-size: var(--text-body);
  letter-spacing: 0.06em;
}
.read__bar {
  margin-top: var(--s3);
  height: 3px;
  border-radius: var(--r-full);
  background: rgba(255, 255, 255, 0.08);
  overflow: hidden;
}
.read__fill {
  height: 100%;
  border-radius: var(--r-full);
  background: var(--sapphire);
}
.read__meta {
  margin-top: var(--s2);
  font-size: var(--text-micro);
  color: var(--text-faint);
}
.read__ded {
  margin-top: var(--s2);
  font-size: var(--text-micro);
  color: var(--amber);
}
</style>
