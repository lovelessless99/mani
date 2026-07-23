<template>
  <Teleport to="body">
    <div class="drill">
      <header class="drill__bar">
        <AppButton icon="back" icon-only variant="ghost" aria-label="離開" @click="$emit('close')" />
        <div class="drill__title">
          <p class="drill__name">{{ title }}</p>
          <p class="drill__sub tnum">第 {{ round }} 題 · 答對 {{ correctCount }}</p>
        </div>
        <span class="drill__spacer" />
      </header>

      <div class="drill__controls">
        <div class="seg">
          <button
            v-for="m in MODES"
            :key="m.id"
            class="seg__btn"
            :class="{ 'seg__btn--on': mode === m.id }"
            type="button"
            @click="setMode(m.id)"
          >
            {{ m.label }}
          </button>
        </div>
        <div class="seg">
          <button
            v-for="l in LEVELS"
            :key="l.ratio"
            class="seg__btn"
            :class="{ 'seg__btn--on': ratio === l.ratio }"
            type="button"
            @click="setLevel(l.ratio)"
          >
            {{ l.label }}
          </button>
        </div>
      </div>

      <!-- Progress toward filling this passage -->
      <div v-if="question" class="progress">
        <div class="progress__bar">
          <div
            class="progress__fill"
            :style="{ width: `${totalBlanks ? (solvedCount / totalBlanks) * 100 : 0}%` }"
          />
        </div>
        <span class="progress__num tnum">{{ solvedCount }} / {{ totalBlanks }}</span>
      </div>

      <div v-if="!question" class="drill__empty empty">此經尚無可用於練習的段落</div>

      <!-- Passage -->
      <div v-else class="passage t-serif" :class="{ 'passage--type': mode === 'type' }">
        <template v-for="(part, i) in question.parts" :key="i">
          <br v-if="part.kind === 'break'" />
          <span v-else-if="part.kind === 'text'" class="passage__text">{{ part.text }}</span>

          <!-- Drag mode: a droppable slot -->
          <button
            v-else-if="mode === 'drag'"
            class="slot"
            :class="{
              'slot--filled': filled[part.slot] !== null,
              'slot--hint': hinted[part.slot] && filled[part.slot] === null,
              'slot--hot': hotSlot === part.slot,
              'slot--right': checked && isRight(part.slot),
              'slot--wrong': checked && !isRight(part.slot),
            }"
            type="button"
            :data-slot="part.slot"
            @click="onSlotTap(part.slot)"
          >
            <template v-if="filled[part.slot] !== null">{{ filled[part.slot] }}</template>
            <template v-else-if="hintChar(part.slot)">
              <span class="slot__hint">{{ hintChar(part.slot) }}</span>{{ blankBoxes(part.slot).slice(1) }}
            </template>
            <template v-else>{{ blankBoxes(part.slot) }}</template>
          </button>

          <!-- Type mode: boxes that fill as you type -->
          <span
            v-else
            class="tspan"
            :class="{
              'tspan--active': activeSlot === part.slot,
              'tspan--done': typedDone[part.slot],
              'tspan--right': checked && isRight(part.slot),
              'tspan--wrong': checked && !isRight(part.slot),
            }"
            @click="focusSlot(part.slot)"
          >
            <span
              v-for="(ch, ci) in boxesFor(part.slot)"
              :key="ci"
              class="box"
              :class="{ 'box--lit': ch !== '', 'box--hint': ch === '' && ci === 0 && hinted[part.slot] }"
            >{{ ch || (ci === 0 && hinted[part.slot] ? hintChar(part.slot) : '') }}</span>
          </span>
        </template>
      </div>

      <!-- Drag tray -->
      <div v-if="question && mode === 'drag'" class="tray">
        <button
          v-for="t in tiles"
          :key="t.id"
          class="tile t-serif"
          :class="{ 'tile--used': usedTiles.has(t.id), 'tile--picked': picked === t.id }"
          type="button"
          :disabled="usedTiles.has(t.id)"
          @pointerdown="onTileDown($event, t)"
          @click="onTileTap(t)"
        >
          {{ t.text }}
        </button>
      </div>

      <!-- Type keypad zone: pulsing gradient + hidden input -->
      <div v-if="question && mode === 'type'" class="keyzone">
        <div class="pulse" :style="{ '--k': pulseLevel }" />
        <div ref="spewEl" class="spew" />
        <input
          ref="inputEl"
          class="keyinput t-serif"
          :value="typing"
          inputmode="text"
          autocomplete="off"
          autocorrect="off"
          spellcheck="false"
          :placeholder="checked ? '' : '在此輸入缺字'"
          @beforeinput="onBeforeInput"
          @input="onType"
          @blur="refocusSoon"
        />
      </div>

      <!-- Actions -->
      <div v-if="question" class="drill__actions">
        <template v-if="!checked">
          <div class="act-row">
            <button
              class="hint-btn"
              type="button"
              :disabled="hintsLeft <= 0"
              @click="useHint"
            >
              💡 提示 {{ hintsLeft }}
            </button>
            <AppButton
              variant="accent"
              class="act-check"
              :disabled="!allFilled"
              @click="check"
            >
              {{ allFilled ? '對答案' : `還差 ${blanksLeft} 處` }}
            </AppButton>
          </div>
        </template>

        <template v-else>
          <p class="verdict" :class="allRight ? 'verdict--right' : 'verdict--wrong'">
            {{ allRight ? verdictWin : '再看一次原文 🙏' }}
          </p>
          <AppButton variant="glass" block @click="next">下一題 →</AppButton>
        </template>
      </div>

      <!-- Drag ghost -->
      <div
        v-if="ghost"
        class="ghost t-serif"
        :style="{ left: `${ghost.x}px`, top: `${ghost.y}px` }"
      >
        {{ ghost.text }}
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onMounted, onBeforeUnmount } from 'vue'
import AppButton from 'src/components/ui/AppButton.vue'

/**
 * Recall drill — drag or type the missing phrases back into the text.
 *
 * Blanks are whole phrases split at punctuation: Chinese has no word
 * boundaries, so that is the only meaningful cut, and it happens to test
 * the right thing — remembering that 色不異空 precedes 空不異色, which a
 * character gap never would. Difficulty is the *share* of phrases hidden,
 * so a hard round blanks most of the passage rather than two lines of it.
 */

const props = defineProps<{
  title: string
  /** Paragraphs of the text, already stripped of headings */
  paragraphs: string[]
}>()

const emit = defineEmits<{ close: []; solved: [] }>()

type Mode = 'drag' | 'type'
const MODES: { id: Mode; label: string }[] = [
  { id: 'drag', label: '拖字' },
  { id: 'type', label: '打字' },
]
const LEVELS = [
  { ratio: 0.5, label: '挖一半' },
  { ratio: 0.75, label: '挖大半' },
]

const WINS = ['全對，善哉 ✨', '一字不差 🌟', '功不唐捐 🌸', '了了分明 💎']

const mode = ref<Mode>('drag')
const ratio = ref(0.5)

// Every mark is a separator, quotation marks and brackets included, so a
// blank is a phrase of characters and never swallows the 「」 or 。around
// it. SPLIT tests a piece; CAP keeps the marks as their own pieces when
// splitting, so they still render as fixed text between the blanks.
const SPLIT = /[，、；：。！？「」『』（）〔〕《》〈〉—―…・﹁﹂·「」]/
const CAP = new RegExp('(' + SPLIT.source + ')')

interface Tile {
  id: number
  text: string
}
type Part =
  | { kind: 'text'; text: string }
  | { kind: 'blank'; slot: number }
  | { kind: 'break' }
interface Question {
  parts: Part[]
  answers: string[]
}

// A passage aims for this many phrases, drawn from consecutive
// paragraphs, so each question is a real stretch of the sutra rather
// than a single line.
const TARGET_PHRASES = 12
const MAX_HINTS = 3

const question = ref<Question | null>(null)
const tiles = ref<Tile[]>([])
const filled = ref<(string | null)[]>([])
const tileOfSlot = ref<(number | null)[]>([])
const checked = ref(false)
const picked = ref<number | null>(null)
const hotSlot = ref<number | null>(null)
const round = ref(1)
const correctCount = ref(0)
const verdictWin = ref(WINS[0])
const hinted = ref<Record<number, boolean>>({})
const hintsLeft = ref(MAX_HINTS)

// type mode
const inputEl = ref<HTMLInputElement | null>(null)
const spewEl = ref<HTMLDivElement | null>(null)
const activeSlot = ref(0)
const typing = ref('')
const typedDone = ref<boolean[]>([])
const pulseLevel = ref(0)

const usedTiles = computed(() => new Set(tileOfSlot.value.filter((v): v is number => v !== null)))
const allFilled = computed(() =>
  mode.value === 'drag'
    ? filled.value.every((v) => v !== null)
    : typedDone.value.every(Boolean)
)
const blanksLeft = computed(() =>
  mode.value === 'drag'
    ? filled.value.filter((v) => v === null).length
    : typedDone.value.filter((v) => !v).length
)
const allRight = computed(
  () => question.value?.answers.every((a, i) => filled.value[i] === a) ?? false
)

function isRight(slot: number): boolean {
  return filled.value[slot] === question.value?.answers[slot]
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

const allPhrases = computed(() =>
  props.paragraphs
    .flatMap((p) => p.split(SPLIT))
    .map((s) => s.trim())
    .filter((s) => s.length >= 2)
)

interface Piece {
  s: string
  /** True at a paragraph boundary that precedes this piece */
  br?: boolean
}

/** A run of consecutive paragraphs long enough to be worth memorising. */
function pickPassage(): Piece[] | null {
  const eligible = props.paragraphs
    .map((p, i) => ({ p, i, count: p.split(SPLIT).filter((s) => s.trim().length >= 2).length }))
    .filter((x) => x.count >= 1)
  if (!eligible.length) return null

  const start = eligible[Math.floor(Math.random() * eligible.length)].i
  const pieces: Piece[] = []
  let phrases = 0
  for (let i = start; i < props.paragraphs.length && phrases < TARGET_PHRASES; i++) {
    const raw = props.paragraphs[i].split(CAP).filter(Boolean)
    raw.forEach((s, j) => {
      pieces.push({ s, br: i > start && j === 0 })
      if (!SPLIT.test(s) && s.trim().length >= 2) phrases++
    })
  }
  return phrases >= 2 ? pieces : null
}

function build() {
  checked.value = false
  picked.value = null
  typing.value = ''
  hinted.value = {}

  const pieces = pickPassage()
  if (!pieces) {
    question.value = null
    return
  }

  const phraseIdx = pieces
    .map((piece, i) => ({ piece, i }))
    .filter(({ piece }) => !SPLIT.test(piece.s) && piece.s.trim().length >= 2)
    .map(({ i }) => i)

  const n = Math.max(2, Math.round(phraseIdx.length * ratio.value))
  const chosen = shuffle(phraseIdx).slice(0, n).sort((a, b) => a - b)
  const answers = chosen.map((i) => pieces[i].s)

  const parts: Part[] = []
  let buf = ''
  const flush = () => {
    if (buf) parts.push({ kind: 'text', text: buf })
    buf = ''
  }
  pieces.forEach((piece, i) => {
    if (piece.br) {
      flush()
      parts.push({ kind: 'break' })
    }
    const slot = chosen.indexOf(i)
    if (slot === -1) {
      buf += piece.s
      return
    }
    flush()
    parts.push({ kind: 'blank', slot })
  })
  flush()

  const distractors = mode.value === 'drag' ? Math.min(5, Math.ceil(n / 2) + 2) : 0
  const others = shuffle(allPhrases.value.filter((p) => !answers.includes(p))).slice(0, distractors)

  question.value = { parts, answers }
  tiles.value = shuffle([...answers, ...others]).map((text, id) => ({ id, text }))
  filled.value = answers.map(() => null)
  tileOfSlot.value = answers.map(() => null)
  typedDone.value = answers.map(() => false)
  activeSlot.value = 0

  if (mode.value === 'type') focusSlot(0)
}

// — Drag mode ———————————————————————————————
function blankBoxes(slot: number): string {
  return '　'.repeat(question.value?.answers[slot].length ?? 2)
}

function place(slot: number, tile: Tile) {
  if (checked.value) return
  const prev = tileOfSlot.value.indexOf(tile.id)
  if (prev !== -1) {
    filled.value[prev] = null
    tileOfSlot.value[prev] = null
  }
  filled.value[slot] = tile.text
  tileOfSlot.value[slot] = tile.id
  picked.value = null
}

function clearSlot(slot: number) {
  filled.value[slot] = null
  tileOfSlot.value[slot] = null
}

function onTileTap(t: Tile) {
  if (checked.value || usedTiles.value.has(t.id)) return
  picked.value = picked.value === t.id ? null : t.id
}

function onSlotTap(slot: number) {
  if (checked.value) return
  if (picked.value !== null) {
    const t = tiles.value.find((x) => x.id === picked.value)
    if (t) place(slot, t)
    return
  }
  clearSlot(slot)
}

const ghost = ref<{ x: number; y: number; text: string } | null>(null)
let dragTile: Tile | null = null
let moved = 0

function slotUnder(x: number, y: number): number | null {
  const el = document.elementFromPoint(x, y)
  const s = (el as HTMLElement | null)?.closest?.('[data-slot]')
  const v = s?.getAttribute('data-slot')
  return v === null || v === undefined ? null : Number(v)
}

function onTileDown(e: PointerEvent, t: Tile) {
  if (checked.value || usedTiles.value.has(t.id)) return
  dragTile = t
  moved = 0
  ghost.value = { x: e.clientX, y: e.clientY, text: t.text }
  window.addEventListener('pointermove', onDragMove)
  window.addEventListener('pointerup', onDragUp)
}

function onDragMove(e: PointerEvent) {
  if (!dragTile || !ghost.value) return
  moved += Math.abs(e.movementX) + Math.abs(e.movementY)
  ghost.value = { x: e.clientX, y: e.clientY, text: dragTile.text }
  hotSlot.value = slotUnder(e.clientX, e.clientY)
}

function onDragUp(e: PointerEvent) {
  const slot = slotUnder(e.clientX, e.clientY)
  if (dragTile && moved > 6 && slot !== null) place(slot, dragTile)
  dragTile = null
  ghost.value = null
  hotSlot.value = null
  window.removeEventListener('pointermove', onDragMove)
  window.removeEventListener('pointerup', onDragUp)
}

// — Type mode ———————————————————————————————
/** Boxes for a blank: filled chars for done/active slots, blanks else. */
function boxesFor(slot: number): string[] {
  const answer = question.value?.answers[slot] ?? ''
  const len = answer.length
  if (typedDone.value[slot]) {
    return (filled.value[slot] ?? '').padEnd(len, '　').slice(0, len).split('')
  }
  if (slot === activeSlot.value) {
    return Array.from({ length: len }, (_, i) => typing.value[i] ?? '')
  }
  return Array.from({ length: len }, () => '')
}

function focusSlot(slot: number) {
  if (checked.value || typedDone.value[slot]) return
  activeSlot.value = slot
  typing.value = filled.value[slot] ?? ''
  nextTick(() => inputEl.value?.focus())
}

function onBeforeInput(e: InputEvent) {
  // Fire particles on the character actually being inserted
  if (e.inputType === 'insertText' && e.data) spew(e.data)
  pulseLevel.value = 1
  window.setTimeout(() => (pulseLevel.value = 0), 160)
}

function onType(e: Event) {
  const answer = question.value?.answers[activeSlot.value] ?? ''
  let val = (e.target as HTMLInputElement).value
  if (val.length > answer.length) val = val.slice(0, answer.length)
  typing.value = val
  filled.value[activeSlot.value] = val

  // A blank fills up, locks, and hands off to the next
  if (val.length >= answer.length) {
    typedDone.value[activeSlot.value] = true
    const nextIdx = typedDone.value.findIndex((d, i) => !d && i > activeSlot.value)
    const wrap = nextIdx === -1 ? typedDone.value.findIndex((d) => !d) : nextIdx
    if (wrap !== -1) {
      activeSlot.value = wrap
      typing.value = ''
    } else {
      typing.value = ''
    }
  }
}

function refocusSoon() {
  if (mode.value === 'type' && !checked.value) {
    window.setTimeout(() => inputEl.value?.focus(), 40)
  }
}

/** Characters bursting from the input on each keystroke. */
function spew(ch: string) {
  const host = spewEl.value
  if (!host) return
  const pool = allPhrases.value.join('') || ch
  const n = 8 + Math.floor(Math.random() * 6)
  for (let i = 0; i < n; i++) {
    const s = document.createElement('span')
    s.className = 'mote'
    s.textContent = Math.random() < 0.4 ? ch : pool[Math.floor(Math.random() * pool.length)]
    const ang = Math.random() * Math.PI - Math.PI // upper half
    const dist = 40 + Math.random() * 90
    s.style.setProperty('--dx', `${Math.cos(ang) * dist}px`)
    s.style.setProperty('--dy', `${Math.sin(ang) * dist - 20}px`)
    s.style.setProperty('--r', `${(Math.random() - 0.5) * 90}deg`)
    s.style.left = `${45 + Math.random() * 10}%`
    s.style.fontSize = `${12 + Math.random() * 14}px`
    host.appendChild(s)
    window.setTimeout(() => s.remove(), 900)
  }
}

// — Hints ———————————————————————————————————
/** The first character of a blank, shown faint once revealed. */
function hintChar(slot: number): string {
  return hinted.value[slot] ? (question.value?.answers[slot]?.[0] ?? '') : ''
}

/**
 * Reveal the opening character of the blank the reader is stuck on.
 *
 * Type mode nudges the active box; drag mode nudges the first empty
 * slot. A first character is usually enough to unlock the memory of the
 * whole phrase without simply handing it over — and it is capped, so it
 * stays a nudge rather than a walkthrough.
 */
function useHint() {
  if (checked.value || hintsLeft.value <= 0) return
  let slot: number
  if (mode.value === 'type') {
    slot = typedDone.value.findIndex((d) => !d)
    if (slot === -1) slot = activeSlot.value
  } else {
    slot = filled.value.findIndex((v) => v === null)
  }
  if (slot < 0 || hinted.value[slot]) return
  hinted.value = { ...hinted.value, [slot]: true }
  hintsLeft.value -= 1
  if (mode.value === 'type') focusSlot(slot)
}

const solvedCount = computed(() =>
  mode.value === 'drag'
    ? filled.value.filter((v) => v !== null).length
    : typedDone.value.filter(Boolean).length
)
const totalBlanks = computed(() => question.value?.answers.length ?? 0)

// — Flow ————————————————————————————————————
function check() {
  checked.value = true
  if (mode.value === 'type') inputEl.value?.blur()
  if (allRight.value) {
    correctCount.value += 1
    verdictWin.value = WINS[Math.floor(Math.random() * WINS.length)]
    emit('solved')
  }
}

function next() {
  round.value += 1
  hintsLeft.value = MAX_HINTS
  build()
}

function setMode(m: Mode) {
  if (mode.value === m) return
  mode.value = m
  build()
}

function setLevel(r: number) {
  if (ratio.value === r) return
  ratio.value = r
  build()
}

onMounted(build)
onBeforeUnmount(() => {
  window.removeEventListener('pointermove', onDragMove)
  window.removeEventListener('pointerup', onDragUp)
})
</script>

<style scoped>
.drill {
  position: fixed;
  inset: 0;
  z-index: 1300;
  display: flex;
  flex-direction: column;
  background: rgba(10, 9, 16, 0.98);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
}

.drill__bar {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: var(--s2);
  padding: calc(var(--safe-t) + var(--s2)) var(--s3) var(--s2);
}

.drill__title {
  flex: 1;
  text-align: center;
  min-width: 0;
}
.drill__name {
  font-size: var(--text-caption);
  letter-spacing: 0.1em;
}
.drill__sub {
  margin-top: 2px;
  font-size: var(--text-micro);
  color: var(--text-faint);
}
.drill__spacer {
  width: 40px;
}

.drill__controls {
  flex-shrink: 0;
  display: flex;
  gap: var(--s2);
  padding: 0 var(--s4) var(--s3);
}

.seg {
  display: flex;
  gap: 3px;
  padding: 3px;
  border-radius: var(--r-full);
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid var(--hairline);
}

.seg__btn {
  padding: 5px var(--s3);
  border-radius: var(--r-full);
  font-size: var(--text-micro);
  letter-spacing: 0.06em;
  color: var(--text-faint);
  transition:
    color var(--fast) var(--ease),
    background var(--fast) var(--ease);
}

.seg__btn--on {
  color: #fff;
  background: linear-gradient(135deg, rgba(167, 139, 250, 0.4), rgba(96, 165, 250, 0.3));
}

.drill__empty {
  margin: auto;
}

/* — Progress ————————————————————————————————— */
.progress {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: var(--s3);
  padding: 0 var(--s5) var(--s2);
}
.progress__bar {
  flex: 1;
  height: 4px;
  border-radius: var(--r-full);
  background: rgba(255, 255, 255, 0.08);
  overflow: hidden;
}
.progress__fill {
  height: 100%;
  border-radius: var(--r-full);
  background: linear-gradient(90deg, var(--amethyst), var(--sapphire));
  box-shadow: 0 0 8px rgba(167, 139, 250, 0.7);
  transition: width var(--base) var(--ease-out);
}
.progress__num {
  font-size: var(--text-micro);
  color: var(--text-faint);
  letter-spacing: 0.06em;
}

/* — Passage ————————————————————————————————— */
.passage {
  flex: 1;
  overflow-y: auto;
  padding: var(--s4) var(--s5) var(--s5);
  font-size: 1.15rem;
  line-height: 2.6;
  letter-spacing: 0.06em;
  color: var(--text);
}
/* Paragraph breaks get real air, so a long passage still reads as
   separate lines of scripture rather than one run-on block. */
.passage br {
  content: '';
  display: block;
  margin-top: var(--s3);
}
.passage__text {
  white-space: pre-wrap;
}

.slot {
  display: inline-block;
  min-width: 3.4em;
  margin: 0 2px;
  padding: 0 var(--s2);
  border-radius: var(--r-sm);
  border: 1.5px dashed rgba(167, 139, 250, 0.55);
  background: rgba(167, 139, 250, 0.08);
  color: var(--text);
  font: inherit;
  line-height: 1.9;
  transition:
    background var(--fast) var(--ease),
    border-color var(--fast) var(--ease),
    transform var(--fast) var(--ease);
}
.slot--filled {
  border-style: solid;
  background: rgba(167, 139, 250, 0.18);
}
.slot--hint {
  border-color: rgba(251, 191, 36, 0.5);
}
.slot__hint {
  color: var(--amber);
  opacity: 0.85;
}
.slot--hot {
  border-color: var(--amethyst);
  background: rgba(167, 139, 250, 0.34);
  transform: scale(1.06);
}
.slot--right {
  border-color: rgba(52, 211, 153, 0.8);
  background: rgba(52, 211, 153, 0.18);
}
.slot--wrong {
  border-color: rgba(251, 113, 133, 0.8);
  background: rgba(251, 113, 133, 0.18);
  text-decoration: line-through;
}

/* — Type spans ——————————————————————————————— */
.tspan {
  display: inline-flex;
  gap: 2px;
  margin: 0 3px;
  vertical-align: baseline;
  cursor: text;
}
.box {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.5em;
  height: 1.7em;
  border-radius: 6px;
  border: 1.5px solid rgba(255, 255, 255, 0.14);
  background: rgba(255, 255, 255, 0.03);
  font-size: 0.9em;
  transition:
    border-color var(--fast) var(--ease),
    background var(--fast) var(--ease),
    transform var(--fast) var(--ease);
}
.box--lit {
  border-color: rgba(167, 139, 250, 0.6);
  background: rgba(167, 139, 250, 0.16);
  animation: pop 0.22s var(--ease-out);
}
.box--hint {
  color: var(--amber);
  border-color: rgba(251, 191, 36, 0.5);
  opacity: 0.8;
}
@keyframes pop {
  0% {
    transform: scale(0.6);
  }
  60% {
    transform: scale(1.18);
  }
  100% {
    transform: scale(1);
  }
}
.tspan--active .box {
  border-color: rgba(167, 139, 250, 0.5);
}
.tspan--active .box:first-child {
  box-shadow: 0 0 0 2px rgba(167, 139, 250, 0.4);
}
.tspan--done .box {
  border-color: rgba(167, 139, 250, 0.4);
}
.tspan--right .box {
  border-color: rgba(52, 211, 153, 0.8);
  background: rgba(52, 211, 153, 0.16);
}
.tspan--wrong .box {
  border-color: rgba(251, 113, 133, 0.8);
  background: rgba(251, 113, 133, 0.16);
}

/* — Drag tray ———————————————————————————————— */
.tray {
  flex-shrink: 0;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: var(--s2);
  padding: var(--s4) var(--s4) var(--s2);
  border-top: 1px solid var(--hairline);
}
.tile {
  padding: var(--s2) var(--s4);
  border-radius: var(--r-md);
  border: 1px solid var(--hairline-strong);
  background: rgba(255, 255, 255, 0.06);
  color: var(--text);
  font-size: var(--text-body);
  letter-spacing: 0.06em;
  touch-action: none;
  transition:
    transform var(--fast) var(--ease),
    background var(--fast) var(--ease),
    opacity var(--fast) var(--ease);
}
.tile:active {
  transform: scale(0.94);
}
.tile--picked {
  border-color: var(--amethyst);
  background: rgba(167, 139, 250, 0.26);
  transform: translateY(-2px);
}
.tile--used {
  opacity: 0.22;
  cursor: default;
}
.ghost {
  position: fixed;
  z-index: 1400;
  transform: translate(-50%, -140%);
  padding: var(--s2) var(--s4);
  border-radius: var(--r-md);
  border: 1px solid var(--amethyst);
  background: rgba(40, 30, 70, 0.95);
  font-size: var(--text-body);
  pointer-events: none;
  box-shadow: 0 10px 24px -8px rgba(0, 0, 0, 0.8);
}

/* — Type keypad zone ————————————————————————— */
.keyzone {
  position: relative;
  flex-shrink: 0;
  padding: var(--s5) var(--s4) var(--s3);
  border-top: 1px solid var(--hairline);
  overflow: visible;
}

/* The pulsing gradient block that reacts to each keystroke */
.pulse {
  position: absolute;
  left: 10%;
  right: 10%;
  bottom: 100%;
  height: 6px;
  border-radius: var(--r-full);
  background: linear-gradient(90deg, #a78bfa, #60a5fa, #34d399, #fbbf24, #fb7185, #a78bfa);
  background-size: 300% 100%;
  filter: blur(1px);
  opacity: 0.5;
  transform: scaleY(calc(1 + var(--k) * 3));
  transform-origin: bottom;
  animation: slide 6s linear infinite;
  transition: transform 0.16s var(--ease-out), opacity 0.16s var(--ease);
}
.pulse[style*='--k: 1'] {
  opacity: 1;
}
@keyframes slide {
  to {
    background-position: 300% 0;
  }
}

.spew {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 60%;
  height: 0;
  pointer-events: none;
}
.spew :deep(.mote) {
  position: absolute;
  bottom: 0;
  color: #dcd2ff;
  font-family: var(--font-serif);
  text-shadow: 0 0 8px rgba(167, 139, 250, 0.9);
  pointer-events: none;
  animation: mote 0.9s ease-out forwards;
}
@keyframes mote {
  0% {
    opacity: 0;
    transform: translate(0, 0) scale(0.4) rotate(0);
  }
  20% {
    opacity: 1;
  }
  100% {
    opacity: 0;
    transform: translate(var(--dx), var(--dy)) scale(1.1) rotate(var(--r));
  }
}

.keyinput {
  width: 100%;
  padding: var(--s3) var(--s4);
  border-radius: var(--r-md);
  border: 1.5px solid rgba(167, 139, 250, 0.4);
  background: rgba(167, 139, 250, 0.08);
  color: #fff;
  font-size: 1.2rem;
  letter-spacing: 0.2em;
  text-align: center;
}
.keyinput::placeholder {
  color: var(--text-faint);
  letter-spacing: 0.08em;
  font-size: var(--text-body);
}
.keyinput:focus {
  outline: none;
  border-color: var(--amethyst);
  box-shadow: 0 0 24px -6px rgba(167, 139, 250, 0.7);
}

/* — Actions —————————————————————————————————— */
.drill__actions {
  flex-shrink: 0;
  padding: var(--s3) var(--s4) calc(var(--safe-b) + var(--s5));
}
.act-row {
  display: flex;
  gap: var(--s2);
}
.act-check {
  flex: 1;
}
.hint-btn {
  flex-shrink: 0;
  padding: 0 var(--s4);
  border-radius: var(--r-full);
  border: 1px solid rgba(251, 191, 36, 0.4);
  background: rgba(251, 191, 36, 0.1);
  color: var(--amber);
  font-size: var(--text-caption);
  letter-spacing: 0.06em;
  transition:
    background var(--fast) var(--ease),
    opacity var(--fast) var(--ease);
}
.hint-btn:hover:not(:disabled) {
  background: rgba(251, 191, 36, 0.2);
}
.hint-btn:disabled {
  opacity: 0.35;
  cursor: default;
}
.verdict {
  margin-bottom: var(--s3);
  text-align: center;
  font-size: var(--text-body);
  letter-spacing: 0.1em;
}
.verdict--right {
  color: var(--emerald);
}
.verdict--wrong {
  color: var(--ruby);
}

@media (prefers-reduced-motion: reduce) {
  .pulse,
  .box--lit,
  .spew :deep(.mote) {
    animation: none;
  }
}
</style>
