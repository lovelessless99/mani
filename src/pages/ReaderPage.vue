<template>
  <main class="reader">
    <button class="reader__chip reader__back" type="button" aria-label="返回" @click="router.back()">
      <AppIcon name="back" :size="20" />
    </button>
    <div v-if="ready" class="reader__top">
      <select
        v-if="chapters.length > 1"
        class="reader__chip reader__chap"
        :value="curChapterValue"
        aria-label="跳至章節"
        @change="jumpChapter(($event.target as HTMLSelectElement).value)"
      >
        <option v-for="c in chapters" :key="c.value" :value="String(c.value)">{{ c.label }}</option>
      </select>
      <button
        class="reader__chip reader__set"
        type="button"
        :class="{ 'reader__set--on': panelShown }"
        @click="togglePanel"
      >
        設定
      </button>
    </div>

    <div v-if="!ready" class="reader__loading">
      <div class="reader__loadcard">
        <template v-if="!loadError">
          <AppSpinner :size="30" />
          <p class="reader__loadtitle">載入經文中…</p>
          <div class="reader__loadbar"><i :style="{ width: `${loadPct}%` }" /></div>
          <span class="reader__loadpct tnum">{{ Math.round(loadPct) }}%</span>
        </template>
        <template v-else>
          <p class="reader__loadtitle">載入失敗,請重試</p>
          <button class="reader__retry" type="button" @click="retryLoad">重新載入</button>
        </template>
      </div>
    </div>

    <!-- 印經坊 本尊:載入原站,驅動至對應經文 -->
    <iframe
      ref="frame"
      class="reader__frame"
      :class="{ 'reader__frame--ready': ready }"
      src="/yinjingfang/index.html"
      title="印經坊"
      @load="onLoad"
    />

    <!-- Tap left = next, right = prev · drag the bar to scrub -->
    <div v-if="ready && !panelShown" class="reader__hud">
      <span class="reader__ind">{{ cur + 1 }} / {{ total }}</span>
      <div
        ref="barEl"
        class="reader__scrub"
        role="slider"
        :aria-valuenow="cur + 1"
        :aria-valuemax="total"
        @pointerdown="onScrubDown"
        @pointermove="onScrubMove"
        @pointerup="onScrubUp"
        @pointercancel="onScrubUp"
      >
        <div class="reader__track"><i :style="{ transform: `scaleX(${progress})` }" /></div>
        <span class="reader__thumb" :style="{ left: `${progress * 100}%` }" />
      </div>
    </div>
  </main>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppIcon from 'src/components/ui/AppIcon.vue'
import AppSpinner from 'src/components/ui/AppSpinner.vue'
import { getSutraMeta } from 'src/services/sutraService'
import { useReadingStore } from 'src/stores/readingStore'

const route = useRoute()
const router = useRouter()
const reading = useReadingStore()
const sutraId = route.params.sutraId as string
const rawVolume = String(route.params.volumeId ?? '')
const volNum = parseInt(rawVolume, 10) || 1
// ?p=N resumes on an exact leaf (used by the library's 繼續上次 buttons).
const resumePage = (() => {
  const p = parseInt(String(route.query.p ?? ''), 10)
  return Number.isFinite(p) ? p : null
})()
const volumeLabel = (() => {
  const m = /^b(\d+)$/.exec(rawVolume)
  if (sutraId === 'avatamsaka') return m ? `第${m[1]}本` : `卷${volNum}`
  return `第${volNum}卷`
})()

// 印經坊 華嚴 chapters per 本 (measured; 卷-ordered, 104 total). Lets a 卷 link
// from 功課 land near that 卷 inside the right 本.
const HUA_COUNTS = [13, 18, 11, 21, 14, 9, 9, 9]
const HUA_STARTS = [0, 13, 31, 42, 63, 77, 86, 95]
const HUA_TOTAL = 104
function huaTarget(): { ben: number; localChapter: number | null } {
  const m = /^b(\d+)$/.exec(rawVolume)
  if (m) return { ben: Math.min(8, Math.max(1, parseInt(m[1], 10))), localChapter: null }
  const g = Math.min(HUA_TOTAL - 1, Math.max(0, Math.round(((volNum - 0.5) / 80) * HUA_TOTAL)))
  let b = 7
  for (let i = 0; i < 8; i++) {
    if (g < HUA_STARTS[i] + HUA_COUNTS[i]) {
      b = i
      break
    }
  }
  return { ben: b + 1, localChapter: g - HUA_STARTS[b] }
}

const frame = ref<HTMLIFrameElement | null>(null)
const barEl = ref<HTMLElement | null>(null)
const ready = ref(false)
const panelShown = ref(false)
const chapters = ref<{ value: number; label: string }[]>([])
const cur = ref(0)
const total = ref(1)
const twopage = ref(false)

// Loading progress. The 4MB 印經坊 + gzip decompression give no byte events,
// so we ease toward 90% while it loads and snap to 100% when the page renders.
const loadPct = ref(0)
const loadError = ref(false)
let loadTimer: ReturnType<typeof setInterval> | undefined
function startLoadProgress() {
  loadPct.value = 6
  clearInterval(loadTimer)
  loadTimer = setInterval(() => {
    loadPct.value = Math.min(90, loadPct.value + Math.max(0.4, (90 - loadPct.value) * 0.05))
  }, 110)
}
function finishLoadProgress() {
  clearInterval(loadTimer)
  loadPct.value = 100
}
// Never leave the bar stuck at 90% — reload the iframe from the network.
function retryLoad() {
  loadError.value = false
  ready.value = false
  tapInstalled = false
  startLoadProgress()
  if (frame.value) frame.value.src = `/yinjingfang/index.html?r=${Date.now()}`
}
onMounted(() => {
  startLoadProgress()
  reading.load()
})
onBeforeUnmount(() => {
  clearInterval(loadTimer)
  clearTimeout(saveTimer)
})

// Remember where every sutra was left — save the current leaf (debounced) so
// each 部 resumes on its own page, not just the most recent one.
let saveTimer: ReturnType<typeof setTimeout> | undefined
watch(cur, () => {
  if (!ready.value) return
  clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    reading.mark({
      sutraId,
      sutraTitle: getSutraMeta(sutraId)?.titleZh ?? sutraId,
      volumeId: rawVolume,
      volumeLabel,
      progress: total.value > 1 ? (cur.value + 1) / total.value : 1,
      page: cur.value,
      total: total.value,
    })
  }, 700)
})

// App sutra → 印經坊 built-in preset (its own CBETA text/typesetting).
// 華嚴經 is 80 卷 split into eight "本" (華嚴經1..8) — pick the 本 by volume.
const BASE_PRESET: Record<string, string> = {
  'heart-sutra': '心經',
  diamond: '金剛經',
  ksitigarbha: '地藏經',
  shurangama: '楞嚴經',
  lotus: '法華經',
  'medicine-buddha': '藥師經',
}
function presetName(): string {
  if (sutraId === 'avatamsaka') return `華嚴經${huaTarget().ben}`
  return BASE_PRESET[sutraId] ?? ''
}

const progress = computed(() => (total.value > 1 ? (cur.value + 1) / total.value : 1))
// Reflect the chapter the current page actually belongs to (not the last picked).
const curChapterValue = computed(() => {
  if (!chapters.value.length) return ''
  let v = String(chapters.value[0].value)
  for (const c of chapters.value) if (c.value <= cur.value) v = String(c.value)
  return v
})

// Reading view: hide the editor panel, export/preview, and the printer's own
// pager. Also centre every glyph on the column axis so the body reads as an
// even 上下左右 grid instead of hugging the 注音 to one side. 設定 restores
// the panel for font/theme.
const READER_CSS = `
  #btn-download, #btn-preview, #btn-print, #preview, #dl-status { display: none !important; }
  body.app-read #panel { display: none !important; }
  body.app-read .pager { display: none !important; }
  body.app-read { overflow: hidden !important; height: 100vh !important; }
  body.app-read #view { height: 100vh !important; }
  body.app-read #view, body.app-read .stage { user-select: none; }
  body.app-read .cell { justify-content: center !important; }
  body.app-read .cell .base { text-align: center !important; }
  body.app-read .zfont .cell .punc { transform: none !important; margin: 0 auto !important; }
`

function idoc(): Document | null {
  return frame.value?.contentDocument ?? null
}
function iwin(): any {
  return frame.value?.contentWindow ?? null
}
function el<T extends HTMLElement>(id: string): T | null {
  return (idoc()?.getElementById(id) as T | null) ?? null
}
function fire(node: HTMLElement, type = 'change') {
  node.dispatchEvent(new Event(type, { bubbles: true }))
}

function togglePanel() {
  const doc = idoc()
  if (!doc) return
  panelShown.value = !panelShown.value
  doc.body.classList.toggle('app-read', !panelShown.value)
  ;(panelShown.value ? el('panel') : el('view'))?.scrollIntoView()
}

function jumpChapter(value: string) {
  iwin()?.__readerGoto?.(parseInt(value, 10) || 0)
}

// Tap to turn: left half = next (後一頁), right half = prev (前一頁) — matches
// 右翻 vertical reading. Works the same on phone (single) and desktop (spread).
let tapInstalled = false
function installTap() {
  const doc = idoc()
  if (!doc || tapInstalled) return
  tapInstalled = true
  doc.addEventListener('click', (e: MouseEvent) => {
    if (panelShown.value) return
    const w = doc.defaultView?.innerWidth || window.innerWidth
    iwin()?.__readerFlip?.(e.clientX < w / 2 ? 'next' : 'prev')
  })
}

// Draggable progress bar → jump to any page.
let scrubbing = false
function scrubTo(clientX: number) {
  const bar = barEl.value
  if (!bar || total.value <= 1) return
  const r = bar.getBoundingClientRect()
  const f = Math.max(0, Math.min(1, (clientX - r.left) / r.width))
  iwin()?.__readerGoto?.(Math.round(f * (total.value - 1)))
}
function onScrubDown(e: PointerEvent) {
  e.preventDefault()
  ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
  scrubbing = true
  scrubTo(e.clientX)
}
function onScrubMove(e: PointerEvent) {
  if (scrubbing) scrubTo(e.clientX)
}
function onScrubUp() {
  scrubbing = false
}

/**
 * Drive the embedded 印經坊: pick the sutra / 本, re-typeset, jump to the
 * chosen volume's chapter, then switch into the reading view. The bundled
 * library decompresses asynchronously, so readiness is detected by the text
 * box filling after the preset is chosen — clearing it first makes a stale
 * default (金剛經) impossible to mistake for a successful load.
 */
function drive(attempt = 0): void {
  const retry = () => {
    if (attempt < 80) setTimeout(() => drive(attempt + 1), 150)
    else loadError.value = true
  }
  const doc = idoc()
  const win = iwin()
  const preset = el<HTMLSelectElement>('in-preset')
  const body = el<HTMLTextAreaElement>('in-body')
  const name = presetName()
  if (!doc || !win || !preset || !body || !name) {
    retry()
    return
  }
  if (![...preset.options].some((o) => o.value === name)) {
    retry()
    return
  }

  // Clear, then select the sutra so the library reloads its text into the box.
  if (preset.value !== name || body.value.trim().length < 20) {
    body.value = ''
    preset.value = name
    fire(preset)
  }
  if (body.value.trim().length < 20) {
    retry()
    return
  }

  // Keep the reading position / chapters / progress in sync with the printer.
  win.__onReaderRender = (c: number, t: number, chs: { title: string; page: number }[], two: boolean) => {
    cur.value = c
    total.value = t
    twopage.value = two
    chapters.value =
      chs && chs.length > 1 ? chs.map((ch, i) => ({ value: ch.page, label: `${i + 1}. ${ch.title}` })) : []
  }
  // Phones read one page at a time; wider screens keep the two-page spread.
  win.__readerSingle?.(window.innerWidth < 768)

  el<HTMLButtonElement>('btn-run')?.click()

  if (doc.querySelector('.page')) {
    if (!doc.getElementById('app-read-css')) {
      const style = doc.createElement('style')
      style.id = 'app-read-css'
      style.textContent = READER_CSS
      doc.head.appendChild(style)
    }
    doc.body.classList.add('app-read')
    // Where to open. A ?p= resume wins; otherwise jump to the chosen volume.
    const meta = getSutraMeta(sutraId)
    const chs = chapters.value
    if (resumePage != null) {
      win.__readerGoto?.(Math.max(0, Math.min(total.value - 1, resumePage)))
    } else if (sutraId === 'avatamsaka') {
      // 本 links open at the start; 卷 links land on the nearest chapter.
      const lc = huaTarget().localChapter
      if (lc != null && chs.length > lc) win.__readerGoto?.(chs[lc].value)
    } else if (volNum > 1 && meta) {
      if (chs.length > 1 && chs.length === meta.totalVolumes) {
        // 卷 count == 品 count (e.g. 地藏經 13 品 = 13 卷): exact chapter.
        win.__readerGoto?.(chs[volNum - 1]?.value ?? 0)
      } else if (total.value > 1 && meta.totalVolumes > 1) {
        // Otherwise land proportionally by page — 印經坊's chapters don't line
        // up with the 卷 grid (金剛 32 卷 vs 2 章, 法華 7 卷 vs 28 品…).
        win.__readerGoto?.(Math.round(((volNum - 1) / meta.totalVolumes) * (total.value - 1)))
      }
    }
    installTap()
    finishLoadProgress()
    ready.value = true
    return
  }
  retry()
}

function onLoad() {
  ready.value = false
  loadError.value = false
  panelShown.value = false
  tapInstalled = false
  chapters.value = []
  startLoadProgress()
  drive()
}
</script>

<style scoped>
.reader {
  position: relative;
  height: 100vh;
  height: 100dvh;
  background: #0f1115;
  overflow: hidden;
}

.reader__frame {
  width: 100%;
  height: 100%;
  border: 0;
  opacity: 0;
  transition: opacity var(--base) var(--ease);
}
.reader__frame--ready {
  opacity: 1;
}

.reader__loading {
  position: absolute;
  inset: 0;
  z-index: 8;
  display: grid;
  place-items: center;
  background: #0f1115;
}
.reader__loadcard {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--s3);
  width: min(78vw, 18rem);
}
.reader__loadtitle {
  font-size: var(--text-caption);
  letter-spacing: 0.14em;
  color: var(--text-dim);
}
.reader__loadbar {
  width: 100%;
  height: 4px;
  border-radius: var(--r-full);
  background: rgba(255, 255, 255, 0.12);
  overflow: hidden;
}
.reader__loadbar i {
  display: block;
  height: 100%;
  border-radius: var(--r-full);
  background: linear-gradient(90deg, #c9a24e, #e8ce8e);
  transition: width 0.2s var(--ease-out);
}
.reader__loadpct {
  font-size: var(--text-micro);
  letter-spacing: 0.08em;
  color: var(--text-faint);
}
.reader__retry {
  padding: var(--s2) var(--s5);
  border-radius: var(--r-full);
  font-size: var(--text-caption);
  letter-spacing: 0.08em;
  color: #e8ce8e;
  background: rgba(201, 162, 78, 0.14);
  border: 1px solid rgba(201, 162, 78, 0.5);
}

.reader__chip {
  position: absolute;
  z-index: 5;
  top: calc(var(--safe-t) + var(--s3));
  height: 40px;
  display: grid;
  place-items: center;
  border-radius: var(--r-full);
  color: #e6e8ec;
  background: rgba(20, 24, 32, 0.72);
  backdrop-filter: blur(var(--blur));
  -webkit-backdrop-filter: blur(var(--blur));
  border: 1px solid rgba(255, 255, 255, 0.12);
}
.reader__back {
  left: var(--s3);
  width: 40px;
}

.reader__top {
  position: absolute;
  z-index: 5;
  top: calc(var(--safe-t) + var(--s3));
  right: var(--s3);
  display: flex;
  gap: var(--s2);
}
.reader__top .reader__chip {
  position: static;
}
.reader__set {
  padding: 0 var(--s4);
  font-size: var(--text-caption);
  letter-spacing: 0.1em;
}
.reader__set--on {
  color: #e8ce8e;
  border-color: rgba(201, 162, 78, 0.5);
}
.reader__chap {
  max-width: 9rem;
  padding: 0 var(--s3);
  font-size: var(--text-caption);
  letter-spacing: 0.06em;
  appearance: none;
  -webkit-appearance: none;
  cursor: pointer;
}
.reader__chap option {
  color: #1a1a1a;
}

/* — Reading HUD (progress + scrub) ————————————————— */
.reader__hud {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 6;
  padding: var(--s2) var(--s5) calc(var(--safe-b) + var(--s2));
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  pointer-events: none;
  background: linear-gradient(to top, rgba(8, 9, 12, 0.66), transparent);
}
.reader__ind {
  font-size: var(--text-caption);
  letter-spacing: 0.08em;
  color: #d3d6dc;
  font-variant-numeric: tabular-nums;
}
/* Generous touch target around the 3px rail */
.reader__scrub {
  position: relative;
  width: 100%;
  height: 22px;
  display: flex;
  align-items: center;
  pointer-events: auto;
  cursor: pointer;
  touch-action: none;
}
.reader__track {
  width: 100%;
  height: 3px;
  border-radius: var(--r-full);
  background: rgba(255, 255, 255, 0.16);
  overflow: hidden;
}
.reader__track i {
  display: block;
  height: 100%;
  transform-origin: left;
  background: linear-gradient(90deg, #c9a24e, #e8ce8e);
  transition: transform var(--fast) var(--ease-out);
}
.reader__thumb {
  position: absolute;
  top: 50%;
  width: 12px;
  height: 12px;
  margin-left: -6px;
  border-radius: 50%;
  background: #f0d79b;
  transform: translateY(-50%);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.5);
}
</style>
