<template>
  <main class="reader">
    <button class="reader__chip reader__back" type="button" aria-label="返回" @click="router.back()">
      <AppIcon name="back" :size="20" />
    </button>
    <button
      v-if="ready"
      class="reader__chip reader__set"
      type="button"
      :class="{ 'reader__set--on': panelShown }"
      @click="togglePanel"
    >
      設定
    </button>

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

// App sutra → 印經坊 built-in preset (its own CBETA text/typesetting).
const PRESET: Record<string, string> = {
  'heart-sutra': '心經',
  diamond: '金剛經',
  ksitigarbha: '地藏經',
  shurangama: '楞嚴經',
  lotus: '法華經',
  avatamsaka: '華嚴經1',
}

// Reading view: hide the editor panel + export/preview, let the single page
// fill the screen. 設定 toggles the panel back for font/theme/chapter.
const READER_CSS = `
  #btn-download, #btn-preview, #btn-print, #preview, #dl-status { display: none !important; }
  body.app-read #panel { display: none !important; }
  body.app-read { overflow: hidden !important; height: 100vh !important; }
  body.app-read #view { height: 100vh !important; }
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

let configured = false

/**
 * Drive the embedded 印經坊: pick the sutra, force single-page, re-typeset,
 * then switch into the clean reading view. The bundled sutra library
 * decompresses asynchronously, so readiness is detected by the text box
 * actually filling after the preset is chosen — clearing it first makes a
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

  // Single page for the phone (the site defaults to a two-page spread).
  if (!configured) {
    for (const id of ['opt-spread', 'opt-twopage']) {
      const c = el<HTMLInputElement>(id)
      if (c?.checked) {
        c.checked = false
        fire(c)
      }
    }
    configured = true
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
    ready.value = true
    return
  }
  retry()
}

function onLoad() {
  ready.value = false
  panelShown.value = false
  configured = false
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
.reader__set {
  right: var(--s3);
  padding: 0 var(--s4);
  font-size: var(--text-caption);
  letter-spacing: 0.1em;
}
.reader__set--on {
  color: #e8ce8e;
  border-color: rgba(201, 162, 78, 0.5);
}
</style>
