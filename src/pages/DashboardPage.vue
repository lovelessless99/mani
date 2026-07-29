<template>
  <main class="page">
    <header>
      <h1 class="page-title">修行軌跡</h1>
      <p class="page-sub">近期打卡 · 誦讀足跡</p>
    </header>

    <!-- Check-in heatmap ------------------------------------- -->
    <GlassCard class="board">
      <div class="board__head">
        <p class="section-label">打卡軌跡</p>
        <span class="board__legend">
          <span class="cell cell--off" /><span class="cell cell--on" /> 有修
        </span>
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
      <p class="board__foot tnum">
        近 {{ activeInWindow }} 天有修 · 連續 {{ streak.shownCount }} 天 · 最長 {{ streak.best }} 天
      </p>
    </GlassCard>

    <!-- Totals ----------------------------------------------- -->
    <ul class="stats">
      <li v-for="s in stats" :key="s.label" class="stat">
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
import { useReadingStore } from 'src/stores/readingStore'
import { getAllSutras } from 'src/services/sutraService'
import chaptersData from 'src/data/meta/sutra-chapters.json'
import { useToast, describeError } from 'src/composables/useToast'

const CHAPTERS = chaptersData as unknown as Record<string, { items: { id: string }[] }>

const router = useRouter()
const progressStore = useProgressStore()
const gemStore = useGemStore()
const streak = useStreakStore()
const reading = useReadingStore()
const toast = useToast()

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
  { label: '念經遍', value: totals.value.recite, color: 'var(--sapphire)' },
  { label: '背誦遍', value: totals.value.memorize, color: 'var(--amethyst)' },
  { label: '圓滿部', value: totals.value.rounds, color: 'var(--emerald)' },
  { label: '寶石', value: gemStore.gemsList.length, color: 'var(--amber)' },
  { label: '累計天', value: streak.total, color: 'var(--aqua)' },
  { label: '菩提種子', value: streak.shownCount, color: '#86efac' },
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
      reading.load(),
    ])
  } catch (e) {
    toast.error(describeError(e))
  }
})
</script>

<style scoped>
.board {
  margin-top: var(--s5);
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

.heat {
  margin-top: var(--s3);
  display: flex;
  gap: 3px;
  overflow-x: auto;
  padding-bottom: var(--s2);
}
.heat::-webkit-scrollbar {
  display: none;
}
.heat__col {
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.cell {
  width: 13px;
  height: 13px;
  border-radius: 3px;
  background: rgba(255, 255, 255, 0.06);
  flex-shrink: 0;
}
.cell--off {
  display: inline-block;
}
.cell--on {
  background: #86efac;
  box-shadow: 0 0 6px -1px rgba(134, 239, 172, 0.7);
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
  gap: 3px;
  padding: var(--s3) 0;
  border-radius: var(--r-md);
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid var(--hairline);
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
