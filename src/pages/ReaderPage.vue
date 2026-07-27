<template>
  <main class="reader" :style="{ '--fs': fs + 'px', '--paper': paper, '--ink': ink, '--sutra-font': font + ', serif' }">
    <header class="bar">
      <AppButton icon="back" icon-only variant="ghost" aria-label="返回" @click="router.back()" />
      <h1 class="bar__title">{{ volume?.titleZh ?? '載入中' }}</h1>
      <button class="bar__z" type="button" :class="{ 'bar__z--on': showZ }" @click="showZ = !showZ; saveSettings()">注音</button>
      <button class="bar__z" type="button" aria-label="設定" @click="settingsOpen = true">設定</button>
      <AppButton
        v-if="volume"
        :icon="recitedThisSession ? 'checkCircle' : 'circle'"
        icon-only
        :variant="recitedThisSession ? 'accent' : 'ghost'"
        :loading="saving"
        aria-label="標記完成"
        :class="{ 'bar__done': recitedThisSession }"
        @click="markComplete"
      />
    </header>

    <div v-if="loading" class="reader__loading"><AppSpinner :size="34" /></div>

    <!-- 線裝書頁:書脊 · 界欄 · 書名籤 · 翻頁分頁 -->
    <div
      v-else-if="volume"
      class="stage"
      @click="onTapFlip"
      @touchstart.passive="onTouchStart"
      @touchend.passive="onTouchEnd"
    >
      <div :key="pageIndex" class="page page--flip" :class="{ 'z-on': showZ }">
        <div class="spine">
          <span class="spine__lbl">{{ volume.titleZh }}</span>
          <span class="spine__num tnum">{{ volumeIdDisplay }}</span>
        </div>
        <div class="middle">
          <div class="cartouche">
            <span class="cartouche__title">{{ volume.titleZh }}</span>
          </div>
          <div ref="frameEl" class="frame">
            <div class="cols">
              <div v-for="(col, ci) in currentPage" :key="ci" class="col">
                <div v-for="(c, i) in col" :key="i" class="cell">
                  <template v-if="c.t === 'punc'">
                    <span v-if="c.kind === 'rule'" class="vrule" />
                    <span v-else-if="c.kind === 'dots'" class="vdots"><i /><i /><i /></span>
                    <span v-else class="punc">{{ c.ch }}</span>
                  </template>
                  <template v-else>
                    <span class="base">{{ c.ch }}</span>
                    <span v-if="showZ && c.zy.syms" class="zh">
                      <span class="syms">{{ c.zy.syms }}</span>
                      <span v-if="c.zy.tone" class="tone" :class="c.zy.neutral ? 'neutral' : 'side'">{{ c.zy.tone }}</span>
                    </span>
                  </template>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="pager" @click.stop>
        <button class="pager__btn" type="button" :disabled="pageIndex >= pageCount - 1" @click="flip(1)">‹ 次頁</button>
        <span class="pager__n tnum">{{ pageIndex + 1 }} / {{ pageCount }}</span>
        <button class="pager__btn" type="button" :disabled="pageIndex <= 0" @click="flip(-1)">前頁 ›</button>
      </div>
    </div>

    <div v-else class="reader__loading"><p class="empty">無法載入此卷</p></div>

    <!-- 讀經設定:字級 · 字體 · 紙色 -->
    <AppSheet v-model="settingsOpen" title="讀經設定">
      <p class="set-label">字級</p>
      <div class="set-row">
        <button
          v-for="s in FONT_SIZES"
          :key="s.px"
          class="set-opt"
          :class="{ 'set-opt--on': fs === s.px }"
          type="button"
          @click="setFs(s.px)"
        >
          {{ s.name }}
        </button>
      </div>
      <p class="set-label">字體</p>
      <div class="set-row">
        <button
          v-for="f in FONTS"
          :key="f.name"
          class="set-opt"
          :class="{ 'set-opt--on': font === f.css }"
          type="button"
          :style="{ fontFamily: f.css }"
          @click="setFont(f.css)"
        >
          {{ f.name }}
        </button>
      </div>
      <p class="set-label">紙色</p>
      <div class="set-row">
        <button
          v-for="t in THEMES"
          :key="t.name"
          class="set-swatch"
          :class="{ 'set-swatch--on': paper === t.paper }"
          type="button"
          :style="{ background: t.paper, color: t.ink }"
          @click="setTheme(t)"
        >
          {{ t.name }}
        </button>
      </div>
    </AppSheet>

    <AppSheet v-model="showCompleteDialog">
      <div class="done">
        <AppIcon name="sparkle" :size="40" class="done__icon" />
        <h2 class="done__title">回向完成</h2>
        <p class="done__body">
          第 {{ volumeIdDisplay }} 卷已記錄<br />累計誦讀 <span class="tnum">{{ newCount }}</span> 遍
        </p>
        <AppButton variant="glass" block @click="showCompleteDialog = false">繼續</AppButton>
      </div>
    </AppSheet>

    <UnlockCeremony :gem="gemStore.pendingUnlock" @dismiss="onCeremonyDismiss" />
    <MilestoneOverlay
      :visible="showMilestone"
      :type="milestoneType"
      :sutra-title="volume?.titleZh"
      @dismiss="showMilestone = false"
    />
  </main>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppButton from 'src/components/ui/AppButton.vue'
import AppIcon from 'src/components/ui/AppIcon.vue'
import AppSpinner from 'src/components/ui/AppSpinner.vue'
import AppSheet from 'src/components/ui/AppSheet.vue'
import UnlockCeremony from 'src/components/gems/UnlockCeremony.vue'
import MilestoneOverlay from 'src/components/gems/MilestoneOverlay.vue'
import { loadVolume } from 'src/services/sutraService'
import { useProgressStore } from 'src/stores/progressStore'
import { useGemStore } from 'src/stores/gemStore'
import { useReadingStore } from 'src/stores/readingStore'
import { zhuyinForChars, splitZhuyin, type Zhuyin } from 'src/composables/useZhuyin'
import type { SutraVolume } from 'src/types/sutra'
import avatamsakaMap from 'src/data/meta/avatamsaka-gem-map.json'

const route = useRoute()
const router = useRouter()
const progressStore = useProgressStore()
const gemStore = useGemStore()
const reading = useReadingStore()

const sutraId = route.params.sutraId as string
const volumeId = route.params.volumeId as string

const volume = ref<SutraVolume | null>(null)
const loading = ref(true)
const saving = ref(false)
const recitedThisSession = ref(false)
const showCompleteDialog = ref(false)
const newCount = ref(0)
const showMilestone = ref(false)
const milestoneType = ref<'sutra_complete' | 'ten_complete' | 'hundred_complete'>('sutra_complete')

const frameEl = ref<HTMLElement | null>(null)
const showZ = ref(true)
const fs = ref(30)
const perCol = ref(18)
const colsPerPage = ref(8)
const pageIndex = ref(0)

// — Reader settings (字級 · 字體 · 紙色), remembered locally ——
const settingsOpen = ref(false)
const paper = ref('#f5f3da')
const ink = ref('#14110c')
const font = ref('"LXGW WenKai TC"')
const FONT_SIZES = [
  { name: '小', px: 24 },
  { name: '中', px: 30 },
  { name: '大', px: 38 },
]
const FONTS = [
  { name: '楷書', css: '"LXGW WenKai TC"' },
  { name: '宋體', css: '"Noto Serif TC"' },
  { name: '黑體', css: '"Noto Sans TC"' },
]
const THEMES = [
  { name: '經黃', paper: '#f5f3da', ink: '#14110c' },
  { name: '素白', paper: '#faf8f0', ink: '#1a1712' },
  { name: '仿古', paper: '#ece0c0', ink: '#2a1c0f' },
  { name: '夜讀', paper: '#1a1712', ink: '#e8dcc0' },
]

function loadSettings() {
  try {
    const s = JSON.parse(localStorage.getItem('reader-prefs') || '{}')
    if (s.fs) fs.value = s.fs
    if (s.paper) paper.value = s.paper
    if (s.ink) ink.value = s.ink
    if (s.font) font.value = s.font
    if (typeof s.showZ === 'boolean') showZ.value = s.showZ
  } catch {
    /* no saved prefs */
  }
}
function saveSettings() {
  try {
    localStorage.setItem(
      'reader-prefs',
      JSON.stringify({ fs: fs.value, paper: paper.value, ink: ink.value, font: font.value, showZ: showZ.value })
    )
  } catch {
    /* storage unavailable */
  }
}
async function relayout() {
  saveSettings()
  await nextTick()
  measure()
  clampPage()
}
async function setFs(px: number) {
  fs.value = px
  await relayout()
}
async function setFont(css: string) {
  font.value = css
  await relayout()
}
function setTheme(t: { paper: string; ink: string }) {
  paper.value = t.paper
  ink.value = t.ink
  saveSettings()
}

const volumeIdDisplay = computed(() => parseInt(volumeId, 10).toString())

// — Cell building (漢字 + 注音, 標點) ————————————————
type RenderCell =
  | { t: 'han'; ch: string; zy: Zhuyin }
  | { t: 'punc'; ch: string; kind: 'rule' | 'dots' | 'mark' }
type Cell = RenderCell | { t: 'break' }

const DASH = new Set(['—', '―', '─', '－', '━'])
const ELLIPSIS = new Set(['…', '⋯', '‥'])
function isCJK(ch: string): boolean {
  const c = ch.codePointAt(0) ?? 0
  return (c >= 0x3400 && c <= 0x9fff) || (c >= 0xf900 && c <= 0xfaff) || (c >= 0x20000 && c <= 0x2fa1f)
}

function buildCells(text: string): Cell[] {
  const chars = [...text]
  // Phrase-aware 注音, so 破音詞 (般若、南無、兜率…) read correctly.
  const zy = zhuyinForChars(chars)
  const cells: Cell[] = []
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i]
    if (ch === '\n') {
      cells.push({ t: 'break' })
    } else if (isCJK(ch)) {
      cells.push({ t: 'han', ch, zy: splitZhuyin(zy[i]) })
    } else if (ch.trim() === '') {
      // skip whitespace
    } else if (DASH.has(ch)) {
      cells.push({ t: 'punc', ch, kind: 'rule' })
    } else if (ELLIPSIS.has(ch)) {
      cells.push({ t: 'punc', ch, kind: 'dots' })
    } else {
      cells.push({ t: 'punc', ch, kind: 'mark' })
    }
  }
  return cells
}

// All cells, with a break between blocks so headings start a fresh column.
const cells = computed<Cell[]>(() => {
  const v = volume.value
  if (!v) return []
  const parts = v.blocks.map((b) => b.text).join('\n')
  return buildCells(parts)
})

// Wrap the flat cells into vertical columns of perCol; a break ends a column.
const columns = computed<RenderCell[][]>(() => {
  const out: RenderCell[][] = []
  let col: RenderCell[] = []
  for (const c of cells.value) {
    if (c.t === 'break') {
      if (col.length) out.push(col)
      col = []
      continue
    }
    col.push(c)
    if (col.length >= perCol.value) {
      out.push(col)
      col = []
    }
  }
  if (col.length) out.push(col)
  return out
})

// The columns split into discrete pages that flip.
const pages = computed<RenderCell[][][]>(() => {
  const cols = columns.value
  const per = Math.max(1, colsPerPage.value)
  const out: RenderCell[][][] = []
  for (let i = 0; i < cols.length; i += per) out.push(cols.slice(i, i + per))
  return out.length ? out : [[]]
})
const pageCount = computed(() => pages.value.length)
const currentPage = computed(() => pages.value[pageIndex.value] ?? [])

// How many cells fit down a column, and how many columns across a page.
function measure() {
  const el = frameEl.value
  if (!el) return
  const cs = getComputedStyle(el)
  const padY = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom)
  const padX = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight)
  perCol.value = Math.max(6, Math.floor((el.clientHeight - padY) / (fs.value * 1.5)))
  colsPerPage.value = Math.max(1, Math.floor((el.clientWidth - padX) / (fs.value * 1.5)))
}
function clampPage() {
  if (pageIndex.value > pageCount.value - 1) pageIndex.value = pageCount.value - 1
  if (pageIndex.value < 0) pageIndex.value = 0
}

// — Reading position ≈ which page ————————————————————
function currentProgress(): number {
  return pageCount.value > 1 ? pageIndex.value / (pageCount.value - 1) : 0
}
function markInput(progress: number) {
  return {
    sutraId,
    sutraTitle: volume.value?.titleZh ?? '',
    volumeId,
    volumeLabel: `第 ${parseInt(volumeId, 10) || volumeId} 卷`,
    progress,
  }
}
async function saveMark() {
  if (volume.value) await reading.mark(markInput(currentProgress()))
}

// dir +1 = 次頁 (leftward, forward); -1 = 前頁.
function flip(dir: number) {
  const next = pageIndex.value + dir
  if (next < 0 || next > pageCount.value - 1) return
  pageIndex.value = next
  void saveMark()
}
// Tapping the left third of the page advances (text reads leftward).
function onTapFlip(ev: MouseEvent) {
  const w = (ev.currentTarget as HTMLElement).clientWidth
  if (ev.clientX < w * 0.33) flip(1)
  else if (ev.clientX > w * 0.67) flip(-1)
}

// Swipe like an e-book: leftward advances, rightward goes back.
let touchX = 0
function onTouchStart(ev: TouchEvent) {
  touchX = ev.changedTouches[0]?.clientX ?? 0
}
function onTouchEnd(ev: TouchEvent) {
  const dx = (ev.changedTouches[0]?.clientX ?? 0) - touchX
  if (Math.abs(dx) > 40) flip(dx < 0 ? 1 : -1)
}

onMounted(async () => {
  try {
    loadSettings()
    await reading.load()
    volume.value = await loadVolume(sutraId, volumeId)
    await nextTick()
    measure()
    await nextTick()
    // Resume at roughly the page last read in this same volume.
    const m = reading.last
    if (m && m.sutraId === sutraId && m.volumeId === volumeId && pageCount.value > 1) {
      pageIndex.value = Math.round(m.progress * (pageCount.value - 1))
      clampPage()
    }
    window.addEventListener('resize', onResize)
    await saveMark()
  } finally {
    loading.value = false
  }
})

async function onResize() {
  measure()
  await nextTick()
  clampPage()
}

onBeforeUnmount(() => {
  window.removeEventListener('resize', onResize)
  void saveMark()
})

async function markComplete() {
  if (saving.value) return
  saving.value = true
  try {
    const slot = `${volumeId}-recite`
    const updated = await progressStore.markVolumeComplete(sutraId, slot)
    newCount.value = updated.volumes[slot]?.count ?? 1
    recitedThisSession.value = true
    await reading.markDedicated(markInput(currentProgress()))

    if (newCount.value === 1) {
      const gemInput: Parameters<typeof gemStore.earnGem>[0] = {
        source: 'sutra_volume',
        sourceRef: `${sutraId}/${volumeId}`,
      }
      if (sutraId === 'avatamsaka') {
        const mapEntry = (avatamsakaMap as Record<string, { buddhaId: string; constellationId: string }>)[volumeId]
        if (mapEntry) {
          gemInput.buddhaId = mapEntry.buddhaId
          gemInput.constellationId = mapEntry.constellationId
        }
      }
      await gemStore.earnGem(gemInput)
      if (updated.isFullyComplete) {
        const done = Object.values(progressStore.progressMap).filter((p) => p.isFullyComplete).length
        milestoneType.value = done >= 100 ? 'hundred_complete' : done >= 10 ? 'ten_complete' : 'sutra_complete'
        setTimeout(() => (showMilestone.value = true), 2000)
      }
    } else {
      showCompleteDialog.value = true
    }
  } finally {
    saving.value = false
  }
}

function onCeremonyDismiss() {
  gemStore.clearPendingUnlock()
}
</script>

<style scoped>
/* Printed sutra, after the 印經坊 reference: cream paper, 界欄 frame,
   cinnabar 書名籤, 書脊, and 楷書 characters set in vertical columns with
   注音 ruby beside each. */
.reader {
  --paper: #f5f3da;
  --paper-edge: #efebcb;
  --ink: #14110c;
  --gold: #b9973f;
  --gold-lt: #e9ce8b;
  --cinnabar: #4a1712;
  --cinnabar-dk: #2c0b08;
  --tan: #bf9f62;
  --sutra-font: 'LXGW WenKai TC', 'BiauKai', 'DFKai-SB', serif;
  --cell-h: calc(var(--fs) * 1.5);
  --col-pitch: calc(var(--fs) * 1.5);
  height: 100vh;
  height: 100dvh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--paper);
}

.bar {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: var(--s2);
  padding: calc(var(--safe-t) + var(--s2)) var(--s3) var(--s2);
  color: var(--ink);
  background: rgba(245, 243, 218, 0.92);
  backdrop-filter: blur(var(--blur)) saturate(160%);
  -webkit-backdrop-filter: blur(var(--blur)) saturate(160%);
  border-bottom: 1px solid rgba(20, 17, 12, 0.14);
}
.bar__title {
  flex: 1;
  min-width: 0;
  font-family: var(--sutra-font);
  font-size: var(--text-body);
  letter-spacing: 0.1em;
  text-align: center;
  color: var(--ink);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.bar__z {
  flex-shrink: 0;
  font-size: var(--text-micro);
  letter-spacing: 0.14em;
  padding: 4px 8px;
  border-radius: var(--r-full);
  color: #6b5a34;
  border: 1px solid rgba(185, 151, 63, 0.5);
}
.bar__z--on {
  color: #4a1712;
  background: rgba(185, 151, 63, 0.24);
}
.bar__done {
  color: var(--emerald);
}

.reader__loading {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}
.empty {
  color: var(--ink);
}

/* — The page, scrolled horizontally (columns flow leftward) —— */
.stage {
  flex: 1;
  min-height: 0;
  position: relative;
  overflow: hidden;
  cursor: pointer;
}
.page {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: row;
}
.page--flip {
  animation: page-in 0.22s var(--ease) both;
}
@keyframes page-in {
  from {
    opacity: 0;
  }
}

/* Page turn controls */
.pager {
  position: absolute;
  left: 0;
  right: 0;
  bottom: calc(var(--tabbar-h) + var(--safe-b) + var(--s2));
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--s3);
  pointer-events: none;
}
.pager__btn {
  pointer-events: auto;
  padding: var(--s2) var(--s4);
  border-radius: var(--r-full);
  font-size: var(--text-caption);
  color: #3a2c14;
  background: rgba(245, 243, 218, 0.86);
  border: 1px solid rgba(185, 151, 63, 0.5);
  backdrop-filter: blur(var(--blur));
  -webkit-backdrop-filter: blur(var(--blur));
}
.pager__btn:disabled {
  opacity: 0.35;
}
.pager__n {
  pointer-events: auto;
  font-size: var(--text-micro);
  color: #5c513a;
  background: rgba(245, 243, 218, 0.86);
  padding: 3px var(--s3);
  border-radius: var(--r-full);
}

/* 書脊 */
.spine {
  flex: 0 0 26px;
  align-self: stretch;
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  background: linear-gradient(180deg, var(--tan) 0 60%, var(--paper) 60% 67%, var(--tan) 67% 82%, transparent 82%);
}
.spine__lbl {
  writing-mode: vertical-rl;
  text-orientation: upright;
  font-family: var(--sutra-font);
  font-size: 11px;
  color: var(--ink);
  letter-spacing: 0.02em;
  padding-top: 10%;
  white-space: nowrap;
  line-height: 1;
}
.spine__num {
  position: absolute;
  bottom: 2%;
  font-size: 11px;
  color: #5c513a;
}

.middle {
  flex: 1;
  min-height: 0;
  display: flex;
  align-items: stretch;
  padding: 3% 4% 3% 8px;
}

/* 書名籤(硃砂底、描金框、書名直排) */
.cartouche {
  flex: 0 0 calc(var(--fs) * 2.2);
  align-self: center;
  height: 82%;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--cinnabar);
  border: 1.5px solid var(--gold);
  box-shadow: inset 0 0 0 1px var(--cinnabar-dk), inset 0 0 18px rgba(0, 0, 0, 0.5);
}
.cartouche__title {
  writing-mode: vertical-rl;
  text-orientation: upright;
  font-family: var(--sutra-font);
  font-weight: 700;
  font-size: calc(var(--fs) * 0.82);
  line-height: 1.2;
  letter-spacing: 0.04em;
  color: var(--gold-lt);
  white-space: nowrap;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.6));
}

/* 界欄(描金框) */
.frame {
  flex: 1;
  min-height: 0;
  margin-left: 10px;
  background: var(--paper);
  border: 1px solid var(--gold);
  padding: calc(var(--fs) * 0.5) calc(var(--fs) * 0.6);
  overflow: hidden;
}
.cols {
  height: 100%;
  display: flex;
  flex-direction: row-reverse;
  align-items: flex-start;
  justify-content: flex-start;
  gap: 0;
}
.col {
  display: flex;
  flex-direction: column;
  flex: 0 0 auto;
  width: var(--col-pitch);
}

/* 字格:漢字 + 右側注音 */
.cell {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: flex-start;
  height: var(--cell-h);
  overflow: visible;
}
.cell .base {
  font-family: var(--sutra-font);
  font-size: var(--fs);
  line-height: 1;
  color: var(--ink);
  width: 1em;
  text-align: center;
  flex: 0 0 auto;
}
/* 注音緊貼漢字:僅留極小間距,注音欄緊隨其後 */
.cell .zh {
  position: relative;
  flex: 0 0 auto;
  margin-left: calc(var(--fs) * 0.02);
  display: flex;
  align-items: flex-start;
  padding-top: calc(var(--fs) * 0.08);
  height: 100%;
  width: calc(var(--fs) * 0.32);
}
.cell .zh .syms {
  writing-mode: vertical-rl;
  text-orientation: upright;
  font-family: var(--sutra-font);
  font-size: calc(var(--fs) * 0.32);
  line-height: 1;
  letter-spacing: 0;
  color: var(--ink);
  display: block;
  width: 1em;
}
.cell .zh .tone {
  position: absolute;
  font-size: calc(var(--fs) * 0.24);
  color: var(--ink);
  left: calc(var(--fs) * 0.28);
  line-height: 1;
}
.cell .zh .tone.side {
  top: calc(var(--fs) * 0.06);
}
.cell .zh .tone.neutral {
  left: calc(var(--fs) * 0.02);
  top: calc(var(--fs) * -0.16);
}

/* 標點:破音書名號直線、刪節號三點、其餘直排標點 */
.cell .punc {
  font-family: var(--sutra-font);
  font-size: var(--fs);
  color: var(--ink);
  writing-mode: vertical-rl;
  text-orientation: upright;
  width: 1em;
  height: 1em;
  line-height: 1;
  flex: 0 0 auto;
}
.cell .vrule {
  position: relative;
  font-size: var(--fs);
  width: 1em;
  height: var(--cell-h);
  flex: 0 0 auto;
}
.cell .vrule::before {
  content: '';
  position: absolute;
  left: calc(0.5em - 0.03em);
  width: 0.06em;
  top: 0;
  bottom: 0;
  background: var(--ink);
}
.cell .vdots {
  font-size: var(--fs);
  width: 1em;
  height: var(--cell-h);
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-around;
}
.cell .vdots i {
  display: block;
  width: 0.18em;
  height: 0.18em;
  border-radius: 50%;
  background: var(--ink);
}

/* — Settings sheet ————————————————————————— */
.set-label {
  margin-top: var(--s4);
  font-size: var(--text-micro);
  letter-spacing: 0.14em;
  color: var(--text-faint);
}
.set-label:first-child {
  margin-top: 0;
}
.set-row {
  margin-top: var(--s2);
  display: flex;
  gap: var(--s2);
  flex-wrap: wrap;
}
.set-opt {
  flex: 1;
  min-width: 3rem;
  padding: var(--s3);
  border-radius: var(--r-md);
  font-size: var(--text-caption);
  color: var(--text-dim);
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid var(--hairline);
}
.set-opt--on {
  color: var(--text);
  background: rgba(167, 139, 250, 0.16);
  border-color: rgba(167, 139, 250, 0.5);
}
.set-swatch {
  flex: 1;
  min-width: 3.5rem;
  padding: var(--s3);
  border-radius: var(--r-md);
  font-size: var(--text-caption);
  font-family: 'LXGW WenKai TC', var(--font-serif);
  border: 1px solid var(--hairline-strong);
}
.set-swatch--on {
  outline: 2px solid var(--accent);
  outline-offset: 1px;
}

/* — Completion sheet ——————————————————————— */
.done {
  padding: var(--s2) 0;
  text-align: center;
}
.done__icon {
  margin: 0 auto var(--s3);
  color: var(--amber);
  filter: drop-shadow(0 0 12px rgba(251, 191, 36, 0.5));
}
.done__title {
  font-size: var(--text-title);
  font-weight: 300;
  letter-spacing: 0.16em;
}
.done__body {
  margin: var(--s2) 0 var(--s5);
  font-size: var(--text-caption);
  color: var(--text-dim);
  line-height: 1.9;
}
</style>
