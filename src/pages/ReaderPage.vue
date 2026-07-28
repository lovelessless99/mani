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

    <!-- Progress only — pages turn by dragging the bottom corner -->
    <div v-if="ready && !panelShown" class="reader__hud">
      <span class="reader__ind">{{ cur + 1 }} / {{ total }}</span>
      <div class="reader__progress"><i :style="{ transform: `scaleX(${progress})` }" /></div>
    </div>
  </main>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppIcon from 'src/components/ui/AppIcon.vue'
import AppSpinner from 'src/components/ui/AppSpinner.vue'
import { getSutraMeta } from 'src/services/sutraService'

const route = useRoute()
const router = useRouter()
const sutraId = route.params.sutraId as string
const volNum = parseInt(route.params.volumeId as string, 10) || 1

const frame = ref<HTMLIFrameElement | null>(null)
const ready = ref(false)
const panelShown = ref(false)
const chapters = ref<{ value: number; label: string }[]>([])
const cur = ref(0)
const total = ref(1)
const twopage = ref(false)

// App sutra → 印經坊 built-in preset (its own CBETA text/typesetting).
// 華嚴經 is 80 卷 split into eight "本" (華嚴經1..8) — pick the 本 by volume.
const BASE_PRESET: Record<string, string> = {
  'heart-sutra': '心經',
  diamond: '金剛經',
  ksitigarbha: '地藏經',
  shurangama: '楞嚴經',
  lotus: '法華經',
}
function presetName(): string {
  if (sutraId === 'avatamsaka') return `華嚴經${Math.min(8, Math.max(1, Math.ceil(volNum / 10)))}`
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
// pager. 設定 toggles the panel back for font/theme.
const READER_CSS = `
  #btn-download, #btn-preview, #btn-print, #preview, #dl-status { display: none !important; }
  body.app-read #panel { display: none !important; }
  body.app-read .pager { display: none !important; }
  body.app-read { overflow: hidden !important; height: 100vh !important; }
  body.app-read #view { height: 100vh !important; }
  body.app-read #view, body.app-read .stage { touch-action: none; user-select: none; }
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

/* ───────────────────────── Corner-peel page turn ─────────────────────────
   Dragging the bottom corner lifts the sheet like paper: the current page is
   cloned on top, the next page renders underneath, and a folded flap follows
   the finger. Release past the midpoint completes the turn; short drags snap
   back. Two-page spreads (wide screens) fall back to a simple flip. */
let peelInstalled = false
function installPeel() {
  const doc = idoc()
  if (!doc || peelInstalled) return
  peelInstalled = true
  const paper = getComputedStyle(doc.documentElement).getPropertyValue('--paper').trim() || '#f3ecd8'

  let dir: 'next' | 'prev' | null = null
  let dragging = false
  let sx = 0
  let sy = 0
  let W = 0
  let H = 0
  let left = 0
  let top = 0
  let cx = 0
  let wrap: HTMLElement | null = null
  let clone: HTMLElement | null = null
  let flap: HTMLElement | null = null
  let busy = false

  const canGo = (d: 'next' | 'prev') => (d === 'next' ? cur.value < total.value - 1 : cur.value > 0)

  function fold(fx: number, fy: number) {
    fx = Math.max(0, Math.min(W, fx))
    fy = Math.max(0, Math.min(H, fy))
    const dx = fx - cx
    const dy = fy - H
    const mx = (fx + cx) / 2
    const my = (fy + H) / 2
    const px = -dy
    const py = dx
    const B = Math.abs(py) > 1e-3 ? { x: mx + ((H - my) / py) * px, y: H } : { x: cx, y: H }
    const S = Math.abs(px) > 1e-3 ? { x: cx, y: my + ((cx - mx) / px) * py } : { x: cx, y: 0 }
    B.x = Math.max(0, Math.min(W, B.x))
    S.y = Math.max(0, Math.min(H, S.y))
    return { B, S, fx, fy }
  }

  function paint(fx: number, fy: number) {
    if (!clone || !flap) return
    const { B, S } = fold(fx, fy)
    if (dir === 'next') {
      clone.style.clipPath = `polygon(0 0, ${W}px 0, ${W}px ${S.y}px, ${B.x}px ${H}px, 0 ${H}px)`
    } else {
      clone.style.clipPath = `polygon(0 0, ${W}px 0, ${W}px ${H}px, ${B.x}px ${H}px, 0 ${S.y}px)`
    }
    flap.style.clipPath = `polygon(${S.x}px ${S.y}px, ${fx}px ${fy}px, ${B.x}px ${H}px)`
    const ang = dir === 'next' ? 135 : 225
    flap.style.background = `linear-gradient(${ang}deg, rgba(0,0,0,.16), ${paper} 42%, rgba(255,255,255,.4))`
  }

  function begin(d: 'next' | 'prev') {
    const sheet = doc!.getElementById('frameR')
    if (!sheet) return false
    const r = sheet.getBoundingClientRect()
    W = r.width
    H = r.height
    left = r.left
    top = r.top
    cx = d === 'next' ? W : 0
    wrap = doc!.createElement('div')
    wrap.style.cssText = `position:fixed;left:${left}px;top:${top}px;width:${W}px;height:${H}px;z-index:9999;pointer-events:none;`
    clone = sheet.cloneNode(true) as HTMLElement
    clone.style.cssText += ';position:absolute;left:0;top:0;width:100%;height:100%;margin:0;'
    flap = doc!.createElement('div')
    flap.style.cssText =
      'position:absolute;left:0;top:0;width:100%;height:100%;filter:drop-shadow(0 4px 8px rgba(0,0,0,.4));'
    wrap.appendChild(clone)
    wrap.appendChild(flap)
    doc!.body.appendChild(wrap)
    iwin()?.__readerFlip?.(d) // render the destination page underneath
    paint(cx, H)
    return true
  }

  function teardown() {
    wrap?.remove()
    wrap = clone = flap = null
    dir = null
    dragging = false
  }

  function settle(commit: boolean) {
    if (!clone || !flap) {
      teardown()
      return
    }
    busy = true
    if (commit) {
      // Fade the lifted sheet away, revealing the destination underneath.
      ;(clone.style.transition = 'opacity .18s ease'), (flap.style.transition = 'opacity .18s ease')
      clone.style.opacity = '0'
      flap.style.opacity = '0'
      setTimeout(() => {
        teardown()
        busy = false
      }, 190)
    } else {
      // Unfold back to the corner, then restore the original page.
      const startX = lastX
      const startY = lastY
      const t0 = performance.now()
      const step = (t: number) => {
        const k = Math.min(1, (t - t0) / 200)
        paint(startX + (cx - startX) * k, startY + (H - startY) * k)
        if (k < 1) requestAnimationFrame(step)
        else {
          iwin()?.__readerFlip?.(dir === 'next' ? 'prev' : 'next')
          teardown()
          busy = false
        }
      }
      requestAnimationFrame(step)
    }
  }

  let lastX = 0
  let lastY = 0

  doc.addEventListener(
    'pointerdown',
    (e: PointerEvent) => {
      if (busy || panelShown.value || twopage.value) return
      if (!doc!.getElementById('frameR')) return
      sx = e.clientX
      sy = e.clientY
      dir = null
      dragging = false
    },
    { passive: true },
  )
  doc.addEventListener('pointermove', (e: PointerEvent) => {
    if (busy || panelShown.value || twopage.value) return
    const dx = e.clientX - sx
    const dy = e.clientY - sy
    if (!dragging) {
      if (Math.abs(dx) < 12 || Math.abs(dx) < Math.abs(dy)) return
      const d = dx < 0 ? 'next' : 'prev'
      if (!canGo(d) || !begin(d)) {
        dir = null
        return
      }
      dragging = true
    }
    e.preventDefault()
    lastX = e.clientX - left
    lastY = e.clientY - top
    paint(lastX, lastY)
  })
  const end = () => {
    if (!dragging) return
    const travelled = Math.abs(lastX - cx)
    settle(travelled > W * 0.42)
  }
  doc.addEventListener('pointerup', end)
  doc.addEventListener('pointercancel', end)
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
    // Open at the chosen volume's chapter when the mapping is 1:1 (e.g. 地藏經
    // 13 品 = 13 卷); 華嚴 already opens the right 本 via the preset above.
    const meta = getSutraMeta(sutraId)
    const chs = chapters.value
    if (sutraId !== 'avatamsaka' && meta && chs.length > 1 && chs.length === meta.totalVolumes && volNum > 1) {
      win.__readerGoto?.(chs[volNum - 1]?.value ?? 0)
    }
    installPeel()
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

/* — Reading HUD (progress only) ————————————————— */
.reader__hud {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 6;
  padding: var(--s3) var(--s5) calc(var(--safe-b) + var(--s3));
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--s2);
  pointer-events: none;
  background: linear-gradient(to top, rgba(8, 9, 12, 0.66), transparent);
}
.reader__ind {
  font-size: var(--text-caption);
  letter-spacing: 0.08em;
  color: #d3d6dc;
  font-variant-numeric: tabular-nums;
}
.reader__progress {
  width: 100%;
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
</style>
