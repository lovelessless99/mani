<template>
  <main class="page">
    <header>
      <h1 class="page-title">經文庫</h1>
      <p class="page-sub">直排注音 · 自動記住讀到哪裡</p>
    </header>

    <!-- Resume where the book was last left -->
    <button v-if="reading.last" class="resume" type="button" @click="resume">
      <div class="resume__main">
        <p class="resume__eyebrow">繼續上次</p>
        <p class="resume__title">{{ reading.last.sutraTitle }} · {{ reading.last.volumeLabel }}</p>
        <div class="resume__bar"><div class="resume__fill" :style="{ width: `${reading.last.progress * 100}%` }" /></div>
      </div>
      <AppIcon name="chevronRight" :size="18" class="resume__go" />
    </button>

    <ul class="sutra-list">
      <li v-for="(sutra, i) in sutras" :key="sutra.id">
        <GlassCard clickable @click="openSutra(sutra.id)">
          <div class="sutra">
            <div class="sutra__main">
              <h2 class="sutra__title">{{ sutra.short }}</h2>
              <p class="sutra__desc">{{ sutra.title }}</p>
              <p class="sutra__meta tnum">{{ countLabel(sutra) }}</p>
              <p v-if="lastRead(sutra.id)" class="sutra__resume tnum">
                上次讀到 {{ lastRead(sutra.id)!.volumeLabel }}
                <template v-if="lastRead(sutra.id)!.total"> · {{ (lastRead(sutra.id)!.page ?? 0) + 1 }} / {{ lastRead(sutra.id)!.total }} 頁</template>
              </p>
            </div>
            <ProgressRing :value="ringValue(sutra.id)" :size="52" :stroke-width="4" :color="ringColor(i)" :label="''" />
          </div>
        </GlassCard>
      </li>
    </ul>

    <!-- Chapter / 本 picker ---------------------------------------- -->
    <AppSheet v-model="showVolumeSheet" :title="selected?.short" :subtitle="sheetSubtitle">
      <!-- Resume this sutra where it was last left -->
      <button v-if="selectedLastRead" class="sheet-resume" type="button" @click="resumeSutra">
        <span class="sheet-resume__main">
          <span class="sheet-resume__eyebrow">繼續上次</span>
          <span class="sheet-resume__where tnum"
            >{{ selectedLastRead.volumeLabel
            }}<template v-if="selectedLastRead.total"> · 第 {{ (selectedLastRead.page ?? 0) + 1 }} / {{ selectedLastRead.total }} 頁</template></span
          >
        </span>
        <AppIcon name="chevronRight" :size="18" class="sheet-resume__go" />
      </button>

      <!-- 華嚴 = 8 本 -->
      <div v-if="selected?.books" class="chap-list">
        <button v-for="bk in selected.books" :key="bk.id" class="chap" type="button" @click="goTo(bk.id)">
          <span class="chap__t">{{ bk.label }}</span>
          <AppIcon name="chevronRight" :size="16" class="chap__go" />
        </button>
      </div>
      <!-- Multi-chapter: 印經坊's own chapters, jumped to exactly -->
      <div v-else-if="selected?.chapters?.length" class="chap-list">
        <button v-for="(ch, idx) in selected.chapters" :key="idx" class="chap" type="button" @click="goTo(`c${idx}`)">
          <span class="chap__n tnum">{{ idx + 1 }}</span>
          <span class="chap__t">{{ ch }}</span>
          <AppIcon name="chevronRight" :size="16" class="chap__go" />
        </button>
      </div>
      <!-- Single-scroll sutra -->
      <button v-else class="single-read" type="button" @click="goTo('001')">開始誦讀</button>
    </AppSheet>
  </main>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import GlassCard from 'src/components/GlassCard.vue'
import ProgressRing from 'src/components/ProgressRing.vue'
import AppSheet from 'src/components/ui/AppSheet.vue'
import AppIcon from 'src/components/ui/AppIcon.vue'
import { useProgressStore } from 'src/stores/progressStore'
import { useReadingStore } from 'src/stores/readingStore'
import { getSutraMeta } from 'src/services/sutraService'
import readerLibrary from 'src/data/meta/reader-library.json'

interface ReaderBook {
  id: string
  preset: string
  label: string
  chapters: string[]
}
interface ReaderSutra {
  id: string
  title: string
  short: string
  author?: string
  preset?: string
  chapters?: string[]
  books?: ReaderBook[]
}

const router = useRouter()
const progressStore = useProgressStore()
const reading = useReadingStore()
const sutras = readerLibrary as ReaderSutra[]

function resume() {
  const m = reading.last
  if (m) router.push(`/reader/${m.sutraId}/${m.volumeId}?p=${m.page ?? 0}`)
}

const showVolumeSheet = ref(false)
const selectedSutraId = ref('')
const selected = computed(() => sutras.find((s) => s.id === selectedSutraId.value))

const RING_COLORS = ['var(--amethyst)', 'var(--sapphire)', 'var(--emerald)', 'var(--amber)', 'var(--aqua)']
const ringColor = (i: number) => RING_COLORS[i % RING_COLORS.length]

// Completion ring for 功課 sutras; how-far-read for the reading-only ones.
function ringValue(id: string): number {
  if (getSutraMeta(id)) return progressStore.getSutraCompletionRatio(id)
  return reading.forSutra(id)?.progress ?? 0
}
function countLabel(s: ReaderSutra): string {
  if (s.books) return `${s.books.length} 本`
  const n = s.chapters?.length ?? 0
  return n > 0 ? `${n} 章` : '全一卷'
}

// Per-sutra resume point — where each 部 was last read.
const lastRead = (sutraId: string) => reading.forSutra(sutraId)
const selectedLastRead = computed(() => reading.forSutra(selectedSutraId.value))
function resumeSutra() {
  const m = selectedLastRead.value
  if (!m) return
  showVolumeSheet.value = false
  router.push(`/reader/${selectedSutraId.value}/${m.volumeId}?p=${m.page ?? 0}`)
}

const sheetSubtitle = computed(() => {
  const s = selected.value
  if (!s) return ''
  if (s.books) return `分 ${s.books.length} 本 · 點選開始誦讀`
  const n = s.chapters?.length ?? 0
  return n > 0 ? `共 ${n} 章 · 點選章節直接翻到` : '全一卷 · 點選開始誦讀'
})

function openSutra(sutraId: string) {
  selectedSutraId.value = sutraId
  showVolumeSheet.value = true
}
function goTo(volumeId: string) {
  showVolumeSheet.value = false
  router.push(`/reader/${selectedSutraId.value}/${volumeId}`)
}

onMounted(() => {
  progressStore.loadAllProgress()
  reading.load()
})
</script>

<style scoped>
.resume {
  width: 100%;
  margin-top: var(--s5);
  display: flex;
  align-items: center;
  gap: var(--s3);
  padding: var(--s4);
  border-radius: var(--r-lg);
  text-align: left;
  background:
    radial-gradient(circle at 90% 0%, rgba(96, 165, 250, 0.16), transparent 55%),
    rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(96, 165, 250, 0.3);
  transition: transform var(--fast) var(--ease);
}
.resume:active {
  transform: scale(0.99);
}
.resume__main {
  flex: 1;
  min-width: 0;
}
.resume__eyebrow {
  font-size: var(--text-micro);
  letter-spacing: 0.2em;
  text-indent: 0.2em;
  color: var(--sapphire);
}
.resume__title {
  margin-top: 3px;
  font-family: var(--font-serif);
  font-size: var(--text-body);
  letter-spacing: 0.06em;
}
.resume__bar {
  margin-top: var(--s3);
  height: 3px;
  border-radius: var(--r-full);
  background: rgba(255, 255, 255, 0.08);
  overflow: hidden;
}
.resume__fill {
  height: 100%;
  border-radius: var(--r-full);
  background: var(--sapphire);
}
.resume__go {
  flex-shrink: 0;
  color: var(--text-faint);
}

.sutra-list {
  list-style: none;
  margin-top: var(--s5);
}
.sutra-list > li + li {
  margin-top: var(--s3);
}
.sutra {
  display: flex;
  align-items: center;
  gap: var(--s4);
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
.sutra__desc {
  margin-top: var(--s1);
  font-size: var(--text-caption);
  color: var(--text-dim);
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.sutra__meta {
  margin-top: var(--s2);
  font-size: var(--text-micro);
  color: var(--text-faint);
  letter-spacing: 0.08em;
}
.sutra__resume {
  margin-top: var(--s1);
  font-size: var(--text-micro);
  letter-spacing: 0.04em;
  color: var(--sapphire);
}

/* Resume row inside the sheet */
.sheet-resume {
  width: 100%;
  margin-bottom: var(--s3);
  display: flex;
  align-items: center;
  gap: var(--s3);
  padding: var(--s3) var(--s4);
  border-radius: var(--r-md);
  text-align: left;
  background:
    radial-gradient(circle at 92% 0%, rgba(96, 165, 250, 0.16), transparent 60%),
    rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(96, 165, 250, 0.3);
  transition: transform var(--fast) var(--ease);
}
.sheet-resume:active {
  transform: scale(0.99);
}
.sheet-resume__main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.sheet-resume__eyebrow {
  font-size: var(--text-micro);
  letter-spacing: 0.2em;
  color: var(--sapphire);
}
.sheet-resume__where {
  font-size: var(--text-caption);
  color: var(--text);
}
.sheet-resume__go {
  flex-shrink: 0;
  color: var(--text-faint);
}

/* — Chapter / 本 list ————————————————————————— */
.chap-list {
  display: flex;
  flex-direction: column;
  gap: var(--s2);
  padding-bottom: var(--s2);
  max-height: 60vh;
  overflow-y: auto;
}
.chap {
  display: flex;
  align-items: center;
  gap: var(--s3);
  padding: var(--s3) var(--s4);
  border-radius: var(--r-md);
  border: 1px solid var(--hairline);
  background: rgba(255, 255, 255, 0.03);
  text-align: left;
  transition:
    background var(--fast) var(--ease),
    transform var(--fast) var(--ease);
}
.chap:hover {
  background: var(--glass-2);
}
.chap:active {
  transform: scale(0.99);
}
.chap__n {
  flex-shrink: 0;
  width: 1.9rem;
  height: 1.9rem;
  display: grid;
  place-items: center;
  border-radius: var(--r-full);
  background: rgba(167, 139, 250, 0.16);
  color: var(--amethyst);
  font-size: var(--text-micro);
}
.chap__t {
  flex: 1;
  min-width: 0;
  font-family: var(--font-serif);
  font-size: var(--text-body);
  letter-spacing: 0.04em;
}
.chap__go {
  flex-shrink: 0;
  color: var(--text-faint);
}

.single-read {
  width: 100%;
  padding: var(--s4);
  border-radius: var(--r-md);
  font-size: var(--text-body);
  letter-spacing: 0.1em;
  color: #14101f;
  background: linear-gradient(135deg, #e8ce8e, #c9a24e);
  border: 1px solid rgba(201, 162, 78, 0.5);
}
</style>
