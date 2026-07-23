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
            v-for="g in GAMES"
            :key="g.id"
            class="seg__btn"
            :class="{ 'seg__btn--on': game === g.id }"
            type="button"
            @click="setGame(g.id)"
          >
            {{ g.label }}
          </button>
        </div>
        <div v-if="game === 'blank'" class="seg">
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

      <div v-if="!hasContent" class="drill__empty empty">此經尚無可用於練習的段落</div>

      <!-- ══ 填空 ══════════════════════════════════ -->
      <template v-else-if="game === 'blank' && question">
        <div class="chapter-tag">
          <p class="chapter-tag__name">出自〈{{ activeChapter?.name }}〉</p>
          <p v-if="activeChapter?.gist" class="chapter-tag__gist">{{ activeChapter.gist }}</p>
        </div>

        <div class="progress">
          <div class="progress__bar">
            <div class="progress__fill" :style="{ width: `${blankPct}%` }" />
          </div>
          <span class="progress__num tnum">{{ solvedCount }} / {{ totalBlanks }}</span>
        </div>

        <div class="passage t-serif">
          <template v-for="(part, i) in question.parts" :key="i">
            <br v-if="part.kind === 'break'" />
            <span v-else-if="part.kind === 'text'" class="passage__text">{{ part.text }}</span>
            <button
              v-else
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
                <span class="slot__hint">{{ hintChar(part.slot) }}</span>{{ boxes(part.slot).slice(1) }}
              </template>
              <template v-else>{{ boxes(part.slot) }}</template>
            </button>
          </template>
        </div>

        <div class="tray">
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

        <div class="drill__actions">
          <template v-if="!checked">
            <div class="act-row">
              <button class="hint-btn" type="button" :disabled="hintsLeft <= 0" @click="useHint">
                💡 提示 {{ hintsLeft }}
              </button>
              <AppButton variant="accent" class="act-check" :disabled="!allFilled" @click="check">
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
      </template>

      <!-- ══ 接龍 ══════════════════════════════════ -->
      <template v-else-if="game === 'chain' && chain">
        <div class="chapter-tag">
          <p class="chapter-tag__name">出自〈{{ activeChapter?.name }}〉</p>
          <p v-if="activeChapter?.gist" class="chapter-tag__gist">{{ activeChapter.gist }}</p>
        </div>

        <div class="progress">
          <div class="progress__bar">
            <div class="progress__fill" :style="{ width: `${chainPct}%` }" />
          </div>
          <span class="progress__num tnum">{{ chainStep }} / {{ chain.lines.length - 1 }}</span>
        </div>

        <div ref="chainEl" class="chain t-serif">
          <p class="chain__hint">依經文順序,一句一句往下接</p>
          <template v-for="(ln, i) in chain.lines.slice(0, chainStep + 1)" :key="i">
            <div v-if="i > 0" class="chain__arrow">↓</div>
            <p
              class="chain__line"
              :class="{ 'chain__line--seed': i === 0, 'chain__line--last': i === chainStep }"
            >
              {{ ln }}
            </p>
          </template>
          <div v-if="!chainDone" class="chain__arrow chain__arrow--pending">↓</div>
          <p v-if="chainDone" class="chain__done">✦ 一氣呵成 ✦</p>
        </div>

        <div v-if="!chainDone" class="chain-opts">
          <button
            v-for="(opt, i) in chainOptions"
            :key="i"
            class="opt t-serif"
            :class="{
              'opt--right': chainPicked === opt && opt === chainAnswer,
              'opt--wrong': chainPicked === opt && opt !== chainAnswer,
            }"
            type="button"
            :disabled="chainLocked"
            @click="pickChain(opt)"
          >
            {{ opt }}
          </button>
        </div>

        <div v-else class="drill__actions">
          <p class="verdict verdict--right">{{ verdictWin }}</p>
          <AppButton variant="glass" block @click="next">下一題 →</AppButton>
        </div>
      </template>

      <p v-if="source && hasContent" class="drill__source">{{ source }}</p>

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
import { ref, computed, nextTick, onBeforeUnmount } from 'vue'
import AppButton from 'src/components/ui/AppButton.vue'

/**
 * Two recall games over a sutra's own text.
 *
 * 填空 — phrases are removed and dragged back. Blanks are whole phrases
 * split at every punctuation mark (Chinese has no word boundaries), so a
 * gap is always a meaningful unit and never swallows the 「」around it.
 *
 * 接龍 — the classic chain: given a line, choose the one that follows.
 * It tests the *order* of the scripture, which fill-in never quite does.
 */

interface Section {
  id: string
  name: string
  gist?: string
  paragraphs: string[]
}

const props = defineProps<{
  title: string
  /** One or more chapters/品, each carrying its own paragraphs */
  sections: Section[]
  /** Attribution line for the text (CBETA edition, translator) */
  source?: string
}>()

// solved reports which chapter the answered question came from, so
// mastery can be credited to the right 品 even in the 全部 range.
const emit = defineEmits<{ close: []; solved: [chapterId: string] }>()

// Which chapter the current question was drawn from, shown so the reader
// always knows where in the sutra they are.
const activeChapter = ref<Section | null>(null)

type Game = 'blank' | 'chain'
const GAMES: { id: Game; label: string }[] = [
  { id: 'blank', label: '填空' },
  { id: 'chain', label: '接龍' },
]
const LEVELS = [
  { ratio: 0.5, label: '挖一半' },
  { ratio: 0.75, label: '挖大半' },
]
const WINS = ['善哉 ✨', '一字不差 🌟', '功不唐捐 🌸', '了了分明 💎']

const TARGET_PHRASES = 12
const CHAIN_LEN = 5
const MAX_HINTS = 3

// Every mark is a separator, quotation marks and brackets included.
const SPLIT = /[，、；：。！？「」『』（）〔〕《》〈〉—―…・﹁﹂·]/
const CAP = new RegExp('(' + SPLIT.source + ')')

const game = ref<Game>('blank')
const ratio = ref(0.5)
const round = ref(1)
const correctCount = ref(0)
const verdictWin = ref(WINS[0])

const hasContent = computed(() => allPhrases.value.length >= 4)

// Distractors are drawn from the whole selected range, so a wrong tile is
// always another line of the same scripture.
const allPhrases = computed(() =>
  props.sections
    .flatMap((sec) => sec.paragraphs)
    .flatMap((p) => p.split(SPLIT))
    .map((s) => s.trim())
    .filter((s) => s.length >= 2)
)

/** Sections long enough to draw a passage from. */
const usableSections = computed(() =>
  props.sections.filter(
    (sec) => sec.paragraphs.some((p) => p.split(SPLIT).filter((s) => s.trim().length >= 2).length >= 1)
  )
)

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// ── 填空 state ──────────────────────────────────
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
interface Piece {
  s: string
  br?: boolean
}

const question = ref<Question | null>(null)
const tiles = ref<Tile[]>([])
const filled = ref<(string | null)[]>([])
const tileOfSlot = ref<(number | null)[]>([])
const checked = ref(false)
const picked = ref<number | null>(null)
const hotSlot = ref<number | null>(null)
const hinted = ref<Record<number, boolean>>({})
const hintsLeft = ref(MAX_HINTS)

const usedTiles = computed(() => new Set(tileOfSlot.value.filter((v): v is number => v !== null)))
const allFilled = computed(() => filled.value.every((v) => v !== null))
const blanksLeft = computed(() => filled.value.filter((v) => v === null).length)
const solvedCount = computed(() => filled.value.filter((v) => v !== null).length)
const totalBlanks = computed(() => question.value?.answers.length ?? 0)
const blankPct = computed(() => (totalBlanks.value ? (solvedCount.value / totalBlanks.value) * 100 : 0))
const allRight = computed(
  () => question.value?.answers.every((a, i) => filled.value[i] === a) ?? false
)

function isRight(slot: number): boolean {
  return filled.value[slot] === question.value?.answers[slot]
}
function boxes(slot: number): string {
  return '　'.repeat(question.value?.answers[slot].length ?? 2)
}
function hintChar(slot: number): string {
  return hinted.value[slot] ? (question.value?.answers[slot]?.[0] ?? '') : ''
}

/** Pick a passage from one chapter, recording which chapter it was. */
function pickPassage(): Piece[] | null {
  if (!usableSections.value.length) return null
  const section =
    usableSections.value[Math.floor(Math.random() * usableSections.value.length)]
  activeChapter.value = section

  const paras = section.paragraphs
  const eligible = paras
    .map((p, i) => ({ i, count: p.split(SPLIT).filter((s) => s.trim().length >= 2).length }))
    .filter((x) => x.count >= 1)
  if (!eligible.length) return null

  const start = eligible[Math.floor(Math.random() * eligible.length)].i
  const pieces: Piece[] = []
  let phrases = 0
  for (let i = start; i < paras.length && phrases < TARGET_PHRASES; i++) {
    const raw = paras[i].split(CAP).filter(Boolean)
    raw.forEach((s, j) => {
      pieces.push({ s, br: i > start && j === 0 })
      if (!SPLIT.test(s) && s.trim().length >= 2) phrases++
    })
  }
  return phrases >= 2 ? pieces : null
}

function buildBlank() {
  checked.value = false
  picked.value = null
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

  const distractors = Math.min(5, Math.ceil(n / 2) + 2)
  const others = shuffle(allPhrases.value.filter((p) => !answers.includes(p))).slice(0, distractors)

  question.value = { parts, answers }
  tiles.value = shuffle([...answers, ...others]).map((text, id) => ({ id, text }))
  filled.value = answers.map(() => null)
  tileOfSlot.value = answers.map(() => null)
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
  if (justDragged) {
    justDragged = false
    return
  }
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

function useHint() {
  if (checked.value || hintsLeft.value <= 0) return
  const slot = filled.value.findIndex((v) => v === null)
  if (slot < 0 || hinted.value[slot]) return
  hinted.value = { ...hinted.value, [slot]: true }
  hintsLeft.value -= 1
}

function check() {
  checked.value = true
  if (allRight.value) {
    correctCount.value += 1
    verdictWin.value = WINS[Math.floor(Math.random() * WINS.length)]
    emit('solved', activeChapter.value?.id ?? '')
  }
}

// ── drag ────────────────────────────────────────
const ghost = ref<{ x: number; y: number; text: string } | null>(null)
let dragTile: Tile | null = null
let moved = 0
let lastX = 0
let lastY = 0
let justDragged = false

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
  lastX = e.clientX
  lastY = e.clientY
  ghost.value = { x: e.clientX, y: e.clientY, text: t.text }
  window.addEventListener('pointermove', onDragMove)
  window.addEventListener('pointerup', onDragUp)
}
function onDragMove(e: PointerEvent) {
  if (!dragTile || !ghost.value) return
  // movementX/Y is unreliable on touch; track deltas by hand
  moved += Math.abs(e.clientX - lastX) + Math.abs(e.clientY - lastY)
  lastX = e.clientX
  lastY = e.clientY
  ghost.value = { x: e.clientX, y: e.clientY, text: dragTile.text }
  hotSlot.value = slotUnder(e.clientX, e.clientY)
}
function onDragUp(e: PointerEvent) {
  const slot = slotUnder(e.clientX, e.clientY)
  const wasDrag = !!dragTile && moved > 8
  if (wasDrag && slot !== null) place(slot, dragTile!)
  justDragged = wasDrag
  dragTile = null
  ghost.value = null
  hotSlot.value = null
  window.removeEventListener('pointermove', onDragMove)
  window.removeEventListener('pointerup', onDragUp)
}

// ── 接龍 state ──────────────────────────────────
interface Chain {
  lines: string[]
}
const chain = ref<Chain | null>(null)
const chainStep = ref(0)
const chainPicked = ref<string | null>(null)
const chainLocked = ref(false)

const chainDone = computed(() => !!chain.value && chainStep.value >= chain.value.lines.length - 1)
const chainAnswer = computed(() => chain.value?.lines[chainStep.value + 1] ?? '')
const chainPct = computed(() =>
  chain.value && chain.value.lines.length > 1
    ? (chainStep.value / (chain.value.lines.length - 1)) * 100
    : 0
)
const chainOptions = ref<string[]>([])
const chainEl = ref<HTMLElement | null>(null)

function scrollChain() {
  nextTick(() => {
    const el = chainEl.value
    if (el) el.scrollTop = el.scrollHeight
  })
}

function buildChain() {
  chainStep.value = 0
  chainPicked.value = null
  chainLocked.value = false

  // Chain within a single chapter so the sequence never jumps 品
  const long = usableSections.value.filter(
    (sec) =>
      sec.paragraphs.flatMap((p) => p.split(SPLIT)).filter((s) => s.trim().length >= 2).length >=
      CHAIN_LEN + 1
  )
  const pool = long.length ? long : usableSections.value
  if (!pool.length) {
    chain.value = null
    return
  }
  const section = pool[Math.floor(Math.random() * pool.length)]
  activeChapter.value = section

  const phrases = section.paragraphs.flatMap((p) =>
    p.split(SPLIT).map((s) => s.trim()).filter((s) => s.length >= 2)
  )
  if (phrases.length < CHAIN_LEN + 1) {
    chain.value = null
    return
  }
  const start = Math.floor(Math.random() * (phrases.length - CHAIN_LEN))
  chain.value = { lines: phrases.slice(start, start + CHAIN_LEN) }
  makeOptions()
}

function makeOptions() {
  const answer = chainAnswer.value
  if (!answer) return
  const pool = allPhrases.value.filter((p) => p !== answer && !chain.value!.lines.includes(p))
  chainOptions.value = shuffle([answer, ...shuffle(pool).slice(0, 3)])
}

function pickChain(opt: string) {
  if (chainLocked.value) return
  chainPicked.value = opt
  if (opt === chainAnswer.value) {
    chainLocked.value = true
    setTimeout(() => {
      chainStep.value += 1
      chainPicked.value = null
      chainLocked.value = false
      scrollChain()
      if (chainDone.value) {
        correctCount.value += 1
        verdictWin.value = WINS[Math.floor(Math.random() * WINS.length)]
        emit('solved', activeChapter.value?.id ?? '')
      } else {
        makeOptions()
      }
    }, 450)
  } else {
    // Wrong: flash red, then clear so they can try again
    chainLocked.value = true
    setTimeout(() => {
      chainPicked.value = null
      chainLocked.value = false
    }, 700)
  }
}

// ── flow ────────────────────────────────────────
function build() {
  if (game.value === 'blank') buildBlank()
  else buildChain()
}
function next() {
  round.value += 1
  hintsLeft.value = MAX_HINTS
  build()
}
function setGame(g: Game) {
  if (game.value === g) return
  game.value = g
  build()
}
function setLevel(r: number) {
  if (ratio.value === r) return
  ratio.value = r
  build()
}

build()
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
  padding: 5px var(--s4);
  border-radius: var(--r-full);
  font-size: var(--text-micro);
  letter-spacing: 0.08em;
  color: var(--text-faint);
  transition: color var(--fast) var(--ease), background var(--fast) var(--ease);
}
.seg__btn--on {
  color: #fff;
  background: linear-gradient(135deg, rgba(167, 139, 250, 0.4), rgba(96, 165, 250, 0.3));
}

.drill__empty {
  margin: auto;
}

/* — Chapter tag ——————————————————————————————— */
.chapter-tag {
  flex-shrink: 0;
  padding: 0 var(--s5) var(--s2);
}
.chapter-tag__name {
  font-size: var(--text-caption);
  letter-spacing: 0.08em;
  color: var(--sapphire);
}
.chapter-tag__gist {
  margin-top: 2px;
  font-size: var(--text-micro);
  line-height: 1.6;
  color: var(--text-faint);
  letter-spacing: 0.03em;
}

.drill__source {
  flex-shrink: 0;
  padding: var(--s2) var(--s5) calc(var(--safe-b) + var(--s2));
  font-size: 10px;
  line-height: 1.5;
  color: var(--text-faint);
  opacity: 0.6;
  text-align: center;
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

/* — 填空 passage ———————————————————————————— */
.passage {
  flex: 1;
  overflow-y: auto;
  padding: var(--s4) var(--s5) var(--s5);
  font-size: 1.15rem;
  line-height: 2.6;
  letter-spacing: 0.06em;
  color: var(--text);
}
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
  transition: background var(--fast) var(--ease), border-color var(--fast) var(--ease), transform var(--fast) var(--ease);
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
  transition: transform var(--fast) var(--ease), background var(--fast) var(--ease), opacity var(--fast) var(--ease);
}
.tile:hover:not(:disabled) {
  background: var(--glass-2);
  border-color: var(--amethyst);
  transform: translateY(-2px);
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

/* — 接龍 —————————————————————————————————————— */
.chain {
  flex: 1;
  overflow-y: auto;
  padding: var(--s5);
  font-size: 1.2rem;
  line-height: 2.2;
  letter-spacing: 0.06em;
}
.chain__hint {
  font-family: var(--font-sans);
  font-size: var(--text-caption);
  color: var(--text-faint);
  letter-spacing: 0.1em;
  margin-bottom: var(--s3);
}
.chain__arrow {
  text-align: center;
  font-family: var(--font-sans);
  color: var(--text-faint);
  line-height: 1.2;
  margin: 2px 0;
}
.chain__arrow--pending {
  color: var(--amethyst);
  animation: bob 1.4s ease-in-out infinite;
}
@keyframes bob {
  0%, 100% { transform: translateY(0); opacity: 0.5; }
  50% { transform: translateY(3px); opacity: 1; }
}
.chain__line {
  margin-top: var(--s3);
  padding: var(--s2) var(--s4);
  border-radius: var(--r-md);
  background: rgba(255, 255, 255, 0.04);
  color: var(--text-dim);
}
.chain__line--seed {
  border-left: 2px solid var(--sapphire);
}
.chain__line--last {
  color: #fff;
  background: rgba(167, 139, 250, 0.16);
  border-left: 2px solid var(--amethyst);
  animation: land 0.4s var(--ease-out);
}
@keyframes land {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
}
.chain__done {
  margin-top: var(--s5);
  text-align: center;
  color: var(--emerald);
  letter-spacing: 0.2em;
}

.chain-opts {
  flex-shrink: 0;
  display: grid;
  gap: var(--s2);
  padding: var(--s3) var(--s4) calc(var(--safe-b) + var(--s5));
  border-top: 1px solid var(--hairline);
}
.opt {
  padding: var(--s3) var(--s4);
  border-radius: var(--r-md);
  border: 1px solid var(--hairline-strong);
  background: rgba(255, 255, 255, 0.05);
  color: var(--text);
  font-size: var(--text-body);
  letter-spacing: 0.05em;
  text-align: center;
  transition: background var(--fast) var(--ease), border-color var(--fast) var(--ease), transform var(--fast) var(--ease);
}
.opt:hover:not(:disabled) {
  background: var(--glass-2);
  border-color: rgba(167, 139, 250, 0.5);
  transform: translateY(-2px);
}
.opt:active:not(:disabled) {
  transform: scale(0.98);
}
.opt--right {
  border-color: rgba(52, 211, 153, 0.8);
  background: rgba(52, 211, 153, 0.2);
}
.opt--wrong {
  border-color: rgba(251, 113, 133, 0.8);
  background: rgba(251, 113, 133, 0.2);
  animation: shake 0.4s;
}
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-6px); }
  75% { transform: translateX(6px); }
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
  transition: background var(--fast) var(--ease), opacity var(--fast) var(--ease);
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
  .chain__line--last,
  .opt--wrong {
    animation: none;
  }
}
</style>
