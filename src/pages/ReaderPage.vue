<template>
  <main class="reader">
    <button class="reader__chip reader__back" type="button" aria-label="返回" @click="router.back()">
      <AppIcon name="back" :size="20" />
    </button>
    <div v-if="ready" class="reader__top">
      <select
        v-if="chapters.length > 1"
        class="reader__chip reader__chap"
        :value="curChapter"
        aria-label="跳至章節"
        @change="jumpChapter(($event.target as HTMLSelectElement).value)"
      >
        <option v-for="c in chapters" :key="c.value" :value="c.value">{{ c.label }}</option>
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
  </main>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppIcon from 'src/components/ui/AppIcon.vue'
import AppSpinner from 'src/components/ui/AppSpinner.vue'

const route = useRoute()
const router = useRouter()
const sutraId = route.params.sutraId as string

const frame = ref<HTMLIFrameElement | null>(null)
const ready = ref(false)
const panelShown = ref(false)
const chapters = ref<{ value: string; label: string }[]>([])
const curChapter = ref('')

// App sutra → 印經坊 built-in preset (its own CBETA text/typesetting).
const PRESET: Record<string, string> = {
  'heart-sutra': '心經',
  diamond: '金剛經',
  ksitigarbha: '地藏經',
  shurangama: '楞嚴經',
  lotus: '法華經',
  avatamsaka: '華嚴經1',
}

// Reading view: hide the editor panel + export/preview, let the two-page
// spread fill the screen, and give each turned page a gentle flip. 設定
// toggles the panel back for font/theme; the top chapter select jumps.
const READER_CSS = `
  #btn-download, #btn-preview, #btn-print, #preview, #dl-status { display: none !important; }
  body.app-read #panel { display: none !important; }
  body.app-read { overflow: hidden !important; height: 100vh !important; }
  body.app-read #view { height: 100vh !important; }
  body.app-read .stage { perspective: 2000px; }
  body.app-read .page.active { animation: app-turn .42s cubic-bezier(.22,.61,.36,1) both; }
  @keyframes app-turn {
    from { opacity: 0; transform: rotateY(9deg) translateX(16px); }
    to   { opacity: 1; transform: none; }
  }
`

function idoc(): Document | null {
  return frame.value?.contentDocument ?? null
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

// Mirror the printer's own chapter <select> into the overlay chip, and keep
// the chip in sync as page-turns move between chapters.
function syncChapters() {
  const sel = el<HTMLSelectElement>('in-chapter')
  chapters.value = sel ? [...sel.options].map((o) => ({ value: o.value, label: o.textContent ?? '' })) : []
  curChapter.value = sel?.value ?? ''
}
function jumpChapter(value: string) {
  const sel = el<HTMLSelectElement>('in-chapter')
  if (!sel) return
  sel.value = value
  fire(sel)
  curChapter.value = value
}

/**
 * Drive the embedded 印經坊: pick the sutra and re-typeset, then switch into
 * the clean reading view (keeping its two-page spread). The bundled sutra
 * library decompresses asynchronously, so readiness is detected by the text
 * box actually filling after the preset is chosen — clearing it first makes a
 * stale default (金剛經) impossible to mistake for a successful load.
 */
function drive(attempt = 0): void {
  const retry = () => {
    if (attempt < 80) setTimeout(() => drive(attempt + 1), 150)
  }
  const doc = idoc()
  const preset = el<HTMLSelectElement>('in-preset')
  const body = el<HTMLTextAreaElement>('in-body')
  const name = PRESET[sutraId]
  if (!doc || !preset || !body || !name) {
    retry()
    return
  }

  // Clear, then select the sutra so the library reloads its text into the box.
  if (preset.value !== name || body.value.trim().length < 20) {
    body.value = ''
    preset.value = name
    fire(preset)
  }
  // Not ready until the sutra's text is actually in the box.
  if (body.value.trim().length < 20) {
    retry()
    return
  }

  el<HTMLButtonElement>('btn-run')?.click()

  if (doc.querySelector('.page')) {
    if (!doc.getElementById('app-read-css')) {
      const style = doc.createElement('style')
      style.id = 'app-read-css'
      style.textContent = READER_CSS
      doc.head.appendChild(style)
    }
    doc.body.classList.add('app-read')
    // Keep the chapter chip current as the reader pages through the book.
    doc.getElementById('btn-next')?.addEventListener('click', () => setTimeout(syncChapters, 0))
    doc.getElementById('btn-prev')?.addEventListener('click', () => setTimeout(syncChapters, 0))
    syncChapters()
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
</style>
