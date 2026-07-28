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

    <div v-if="!ready" class="reader__loading"><AppSpinner :size="34" /></div>

    <!-- 印經坊 本尊:載入原站,驅動至對應經文 -->
    <iframe
      ref="frame"
      class="reader__frame"
      :class="{ 'reader__frame--ready': ready }"
      src="/yinjingfang/index.html"
      title="印經坊"
      @load="onLoad"
    />

    <!-- Reading HUD: progress bar + page turn (own controls; printer's are hidden) -->
    <div v-if="ready && !panelShown" class="reader__hud">
      <div class="reader__progress"><i :style="{ transform: `scaleX(${progress})` }" /></div>
      <div class="reader__pager">
        <button type="button" aria-label="上一頁" :disabled="!canPrev" @click="turn('prev')">
          <AppIcon name="back" :size="18" />
        </button>
        <span class="reader__ind">{{ cur + 1 }} / {{ total }}</span>
        <button type="button" class="reader__next" aria-label="下一頁" :disabled="!canNext" @click="turn('next')">
          <AppIcon name="back" :size="18" />
        </button>
      </div>
    </div>
  </main>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppIcon from 'src/components/ui/AppIcon.vue'
import AppSpinner from 'src/components/ui/AppSpinner.vue'

const route = useRoute()
const router = useRouter()
const sutraId = route.params.sutraId as string

const frame = ref<HTMLIFrameElement | null>(null)
const ready = ref(false)
const panelShown = ref(false)
const chapters = ref<{ value: number; label: string }[]>([])
const cur = ref(0)
const total = ref(1)
const twopage = ref(false)
let animating = false

// App sutra → 印經坊 built-in preset (its own CBETA text/typesetting).
const PRESET: Record<string, string> = {
  'heart-sutra': '心經',
  diamond: '金剛經',
  ksitigarbha: '地藏經',
  shurangama: '楞嚴經',
  lotus: '法華經',
  avatamsaka: '華嚴經1',
}

const canPrev = computed(() => cur.value > 0)
const canNext = computed(() => cur.value < total.value - 1)
const progress = computed(() => (total.value > 1 ? (cur.value + 1) / total.value : 1))
// Reflect the chapter the current page actually belongs to (not the last picked).
const curChapterValue = computed(() => {
  if (!chapters.value.length) return ''
  let v = String(chapters.value[0].value)
  for (const c of chapters.value) if (c.value <= cur.value) v = String(c.value)
  return v
})

// Reading view: hide the editor panel, export/preview, and the printer's own
// pager (we render our own HUD). 設定 toggles the panel back for font/theme.
const READER_CSS = `
  #btn-download, #btn-preview, #btn-print, #preview, #dl-status { display: none !important; }
  body.app-read #panel { display: none !important; }
  body.app-read .pager { display: none !important; }
  body.app-read { overflow: hidden !important; height: 100vh !important; }
  body.app-read #view { height: 100vh !important; }
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

/**
 * Page turn with a lifted-paper flip. In single-page mode we clone the
 * current sheet into an overlay, render the next page underneath, then flip
 * the clone away around the binding edge (右翻). Two-page spread just swaps.
 */
function turn(dir: 'next' | 'prev') {
  const win = iwin()
  const doc = idoc()
  if (!win || !doc || animating) return
  if (dir === 'next' ? !canNext.value : !canPrev.value) return

  const sheet = doc.getElementById('frameR')
  if (twopage.value || !sheet) {
    win.__readerFlip?.(dir)
    return
  }
  animating = true
  const r = sheet.getBoundingClientRect()
  const wrap = doc.createElement('div')
  wrap.style.cssText =
    `position:fixed;left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px;` +
    `z-index:9999;perspective:2000px;pointer-events:none;`
  const clone = sheet.cloneNode(true) as HTMLElement
  clone.style.cssText +=
    ';position:absolute;left:0;top:0;width:100%;height:100%;margin:0;' +
    'backface-visibility:hidden;transform-origin:right center;' +
    'transition:transform .58s cubic-bezier(.36,.1,.22,1),box-shadow .58s ease;' +
    'box-shadow:0 8px 26px rgba(0,0,0,.32);'
  wrap.appendChild(clone)
  doc.body.appendChild(wrap)

  win.__readerFlip?.(dir)

  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      clone.style.transform = `rotateY(${dir === 'next' ? 172 : -172}deg)`
      clone.style.boxShadow = '0 28px 66px rgba(0,0,0,.6)'
    }),
  )
  setTimeout(() => {
    wrap.remove()
    animating = false
  }, 640)
}

/**
 * Drive the embedded 印經坊: pick the sutra and re-typeset, switch into the
 * clean reading view, and wire the bridge (reading position / chapters). The
 * bundled library decompresses asynchronously, so readiness is detected by the
 * text box filling after the preset is chosen — clearing it first makes a stale
 * default (金剛經) impossible to mistake for a successful load.
 */
function drive(attempt = 0): void {
  const retry = () => {
    if (attempt < 80) setTimeout(() => drive(attempt + 1), 150)
  }
  const doc = idoc()
  const win = iwin()
  const preset = el<HTMLSelectElement>('in-preset')
  const body = el<HTMLTextAreaElement>('in-body')
  const name = PRESET[sutraId]
  if (!doc || !win || !preset || !body || !name) {
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
    ready.value = true
    return
  }
  retry()
}

function onLoad() {
  ready.value = false
  panelShown.value = false
  chapters.value = []
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
  display: grid;
  place-items: center;
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

/* — Reading HUD ————————————————————————— */
.reader__hud {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 6;
  padding: var(--s3) var(--s4) calc(var(--safe-b) + var(--s3));
  display: flex;
  flex-direction: column;
  gap: var(--s2);
  pointer-events: none;
  background: linear-gradient(to top, rgba(8, 9, 12, 0.72), transparent);
}
.reader__progress {
  height: 3px;
  border-radius: var(--r-full);
  background: rgba(255, 255, 255, 0.14);
  overflow: hidden;
}
.reader__progress i {
  display: block;
  height: 100%;
  transform-origin: left;
  background: linear-gradient(90deg, #c9a24e, #e8ce8e);
  transition: transform var(--base) var(--ease-out);
}
.reader__pager {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--s4);
  pointer-events: auto;
}
.reader__pager button {
  width: 44px;
  height: 44px;
  display: grid;
  place-items: center;
  border-radius: var(--r-full);
  color: #e6e8ec;
  background: rgba(20, 24, 32, 0.72);
  backdrop-filter: blur(var(--blur));
  -webkit-backdrop-filter: blur(var(--blur));
  border: 1px solid rgba(255, 255, 255, 0.12);
}
.reader__pager button:disabled {
  opacity: 0.32;
}
.reader__next {
  transform: scaleX(-1);
}
.reader__ind {
  min-width: 4.5rem;
  text-align: center;
  font-size: var(--text-caption);
  letter-spacing: 0.08em;
  color: #d3d6dc;
  font-variant-numeric: tabular-nums;
}
</style>
