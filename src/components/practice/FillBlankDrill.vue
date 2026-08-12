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

      <!-- ══ 漸隱 ══════════════════════════════════ -->
      <template v-else-if="game === 'fade'">
        <div v-if="!fadeLines.length" class="drill__empty empty">此段落太短,換一種練習</div>
        <template v-else>
          <div class="chapter-tag">
            <p class="chapter-tag__name">出自〈{{ activeChapter?.name }}〉</p>
            <p v-if="activeChapter?.gist" class="chapter-tag__gist">{{ activeChapter.gist }}</p>
          </div>

          <div class="progress">
            <div class="progress__bar">
              <div class="progress__fill" :style="{ width: `${(fadeStep / (FADE_STEPS.length - 1)) * 100}%` }" />
            </div>
            <span class="progress__num tnum">隱 {{ fadeHiddenCount }} / {{ fadeLines.length }}</span>
          </div>

          <div class="fade t-serif">
            <p class="fade__hint">憑記憶把淡去的句子誦出來 · 點一句可偷看</p>
            <p
              v-for="(ln, i) in fadeLines"
              :key="i"
              class="fade__line"
              :class="{ 'fade__line--gone': isFaded(i), 'fade__line--peek': peeked.has(i) }"
              @click="peek(i)"
            >
              <template v-if="isFaded(i)">{{ '　'.repeat(ln.length) }}</template>
              <template v-else>{{ ln }}</template>
            </p>
          </div>

          <div class="drill__actions">
            <AppButton v-if="!fadeDone" variant="accent" block @click="fadeDeeper">淡出一層 · 再隱去一些</AppButton>
            <template v-else>
              <p class="verdict verdict--right">全篇隱去 ✦ 憑記憶誦一遍</p>
              <AppButton variant="glass" block @click="fadeFinish">背完了 ＋1 · 下一段 →</AppButton>
            </template>
          </div>
        </template>
      </template>

      <!-- ══ 默背 ══════════════════════════════════ -->
      <template v-else-if="game === 'recall'">
        <div v-if="!recallLines.length" class="drill__empty empty">此段落太短,換一種練習</div>
        <template v-else>
          <div class="chapter-tag">
            <p class="chapter-tag__name">出自〈{{ activeChapter?.name }}〉</p>
            <p v-if="activeChapter?.gist" class="chapter-tag__gist">{{ activeChapter.gist }}</p>
          </div>

          <div class="recall t-serif">
            <p class="recall__tip">只看首字,默背整段 · 點一句對照;卡住可「全部對照」</p>
            <p
              v-for="(ln, i) in recallLines"
              :key="i"
              class="recall__line"
              :class="{ 'recall__line--shown': recallAll || recallRevealed.has(i) }"
              @click="toggleRecall(i)"
            >
              <template v-if="recallAll || recallRevealed.has(i)">{{ ln }}</template>
              <template v-else>
                <b class="recall__first">{{ ln[0] }}</b><span class="recall__rest">{{ '　'.repeat(Math.max(0, ln.length - 1)) }}</span>
              </template>
            </p>
          </div>

          <div class="drill__actions">
            <div class="act-row">
              <button class="hint-btn" type="button" @click="recallAll = !recallAll">
                {{ recallAll ? '收起對照' : '全部對照' }}
              </button>
              <AppButton variant="accent" class="act-check" @click="recallFinish">背完了 ＋1 →</AppButton>
            </div>
          </div>
        </template>
      </template>

      <!-- ══ 逐字重組 ══════════════════════════════ -->
      <template v-else-if="game === 'scramble'">
        <div v-if="!scTarget" class="drill__empty empty">此段落太短,換一種練習</div>
        <template v-else>
          <div class="chapter-tag">
            <p class="chapter-tag__name">出自〈{{ activeChapter?.name }}〉</p>
          </div>
          <div class="sc">
            <p class="sc__tip">把打散的字,依序點回原句</p>
            <div class="sc__built" :class="{ 'sc__built--right': scChecked && scRight, 'sc__built--wrong': scChecked && !scRight }">
              <button v-for="c in scBuilt" :key="c.id" class="sc__cell t-serif" @click="scUnpick(c)">{{ c.ch }}</button>
              <span v-if="!scBuilt.length" class="sc__ph">點下方的字…</span>
            </div>
            <div class="sc__tray">
              <button v-for="c in scTray" :key="c.id" class="sc__tile t-serif" @click="scPick(c)">{{ c.ch }}</button>
            </div>
          </div>
          <div class="drill__actions">
            <template v-if="!scChecked">
              <AppButton variant="accent" block :disabled="scTray.length > 0" @click="scCheck">
                {{ scTray.length ? `還差 ${scTray.length} 字` : '對答案' }}
              </AppButton>
            </template>
            <template v-else>
              <p class="verdict" :class="scRight ? 'verdict--right' : 'verdict--wrong'">
                {{ scRight ? verdictWin : `原句:${scTarget}` }}
              </p>
              <AppButton variant="glass" block @click="next">下一題 →</AppButton>
            </template>
          </div>
        </template>
      </template>

      <!-- ══ 句序重排 ══════════════════════════════ -->
      <template v-else-if="game === 'order'">
        <div v-if="!roLines.length" class="drill__empty empty">此段落太短,換一種練習</div>
        <template v-else>
          <div class="chapter-tag">
            <p class="chapter-tag__name">出自〈{{ activeChapter?.name }}〉</p>
          </div>
          <div class="ro">
            <p class="ro__tip">依經文順序,點出正確排列</p>
            <ol class="ro__built">
              <li v-for="(x, i) in roBuilt" :key="x.id">
                <button
                  class="ro__line t-serif"
                  :class="{ 'ro__line--right': roChecked && roLines[i] === x.s, 'ro__line--wrong': roChecked && roLines[i] !== x.s }"
                  @click="roUnpick(x)"
                >
                  <b class="ro__num tnum">{{ i + 1 }}</b>{{ x.s }}
                </button>
              </li>
            </ol>
            <div v-if="roPool.length" class="ro__pool">
              <button v-for="x in roPool" :key="x.id" class="ro__opt t-serif" @click="roPick(x)">{{ x.s }}</button>
            </div>
          </div>
          <div class="drill__actions">
            <template v-if="!roChecked">
              <AppButton variant="accent" block :disabled="roPool.length > 0" @click="roCheck">
                {{ roPool.length ? `還有 ${roPool.length} 句` : '對答案' }}
              </AppButton>
            </template>
            <template v-else>
              <p class="verdict" :class="roRight ? 'verdict--right' : 'verdict--wrong'">
                {{ roRight ? verdictWin : '再看一次順序 🙏' }}
              </p>
              <AppButton variant="glass" block @click="next">下一題 →</AppButton>
            </template>
          </div>
        </template>
      </template>

      <!-- ══ 限時挑戰 ══════════════════════════════ -->
      <template v-else-if="game === 'timed'">
        <div class="tc-bar">
          <span class="tc-score tnum">得分 {{ tcScore }}</span>
          <div class="tc-time" :class="{ 'tc-time--low': tcTime <= 10 }">
            <div class="tc-time__fill" :style="{ width: `${(tcTime / 60) * 100}%` }" />
          </div>
          <span class="tc-secs tnum">{{ tcTime }}s</span>
        </div>

        <template v-if="tcRunning">
          <div class="tc-seed t-serif">{{ tcSeed }}</div>
          <div class="tc-arrow">↓ 接下一句</div>
          <div class="tc-opts">
            <button
              v-for="(opt, i) in tcOptions"
              :key="i"
              class="opt t-serif"
              :class="{ 'opt--wrong': tcWrong === opt }"
              type="button"
              @click="tcPick(opt)"
            >
              {{ opt }}
            </button>
          </div>
        </template>
        <div v-else class="tc-end">
          <p class="tc-end__score tnum">{{ tcScore }}</p>
          <p class="tc-end__label">句 · 時間到</p>
          <AppButton variant="accent" block class="tc-end__again" @click="buildTimed">再挑戰 ↻</AppButton>
        </div>
      </template>

      <!-- ══ 配對連連看 ════════════════════════════ -->
      <template v-else-if="game === 'match'">
        <div v-if="!mpLeft.length" class="drill__empty empty">此段落太短,換一種練習</div>
        <template v-else>
          <div class="chapter-tag">
            <p class="chapter-tag__name">出自〈{{ activeChapter?.name }}〉</p>
          </div>
          <p class="mp-tip">左右各點一個,連成完整的句子</p>
          <div class="mp">
            <div class="mp-col">
              <button
                v-for="h in mpLeft"
                :key="h.pid"
                class="mp-tile t-serif"
                :class="{ 'mp-tile--sel': mpSelLeft === h.pid, 'mp-tile--done': mpMatched.has(h.pid), 'mp-tile--wrong': mpWrong.has(h.pid) }"
                type="button"
                :disabled="mpMatched.has(h.pid)"
                @click="mpTapLeft(h.pid)"
              >
                {{ h.text }}
              </button>
            </div>
            <div class="mp-col">
              <button
                v-for="h in mpRight"
                :key="h.pid"
                class="mp-tile t-serif"
                :class="{ 'mp-tile--sel': mpSelRight === h.pid, 'mp-tile--done': mpMatched.has(h.pid), 'mp-tile--wrong': mpWrong.has(h.pid) }"
                type="button"
                :disabled="mpMatched.has(h.pid)"
                @click="mpTapRight(h.pid)"
              >
                {{ h.text }}
              </button>
            </div>
          </div>
          <div v-if="mpDone" class="drill__actions">
            <p class="verdict verdict--right">{{ verdictWin }}</p>
            <AppButton variant="glass" block @click="next">下一題 →</AppButton>
          </div>
        </template>
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

type Game = 'blank' | 'chain' | 'fade' | 'recall' | 'scramble' | 'order' | 'timed' | 'match'
const GAMES: { id: Game; label: string }[] = [
  { id: 'blank', label: '填空' },
  { id: 'chain', label: '接龍' },
  { id: 'fade', label: '漸隱' },
  { id: 'recall', label: '默背' },
  { id: 'scramble', label: '重組' },
  { id: 'order', label: '排序' },
  { id: 'timed', label: '限時' },
  { id: 'match', label: '配對' },
]
const LEVELS = [
  { ratio: 0.5, label: '挖一半' },
  { ratio: 0.75, label: '挖大半' },
]
const WINS = ['善哉 ✨', '一字不差 🌟', '功不唐捐 🌸', '了了分明 💎']

const TARGET_PHRASES = 12
const CHAIN_LEN = 5
const MAX_HINTS = 3
const FADE_LEN = 8
const FADE_STEPS = [0, 0.34, 0.67, 1]
const RECALL_LEN = 10

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

// ── 漸隱 state ──────────────────────────────────
// A passage fades away layer by layer; recite it from memory, tapping a line
// to peek if stuck. When all is gone, one clean recitation solves it.
const fadeLines = ref<string[]>([])
const fadeOrder = ref<number[]>([])
const fadeStep = ref(0)
const peeked = ref<Set<number>>(new Set())
const fadeHiddenCount = computed(() => Math.round(FADE_STEPS[fadeStep.value] * fadeLines.value.length))
const fadeDone = computed(() => fadeStep.value >= FADE_STEPS.length - 1)

function isFaded(i: number): boolean {
  const rank = fadeOrder.value.indexOf(i)
  return rank > -1 && rank < fadeHiddenCount.value && !peeked.value.has(i)
}
function buildFade() {
  fadeStep.value = 0
  peeked.value = new Set()
  const long = usableSections.value.filter(
    (sec) =>
      sec.paragraphs.flatMap((p) => p.split(SPLIT)).filter((s) => s.trim().length >= 2).length >= 4
  )
  const pool = long.length ? long : usableSections.value
  if (!pool.length) {
    fadeLines.value = []
    return
  }
  const section = pool[Math.floor(Math.random() * pool.length)]
  activeChapter.value = section
  const phrases = section.paragraphs.flatMap((p) =>
    p.split(SPLIT).map((s) => s.trim()).filter((s) => s.length >= 2)
  )
  if (phrases.length < 4) {
    fadeLines.value = []
    return
  }
  const start = Math.floor(Math.random() * Math.max(1, phrases.length - FADE_LEN))
  fadeLines.value = phrases.slice(start, start + FADE_LEN)
  fadeOrder.value = shuffle(fadeLines.value.map((_, i) => i))
}
function peek(i: number) {
  const s = new Set(peeked.value)
  if (s.has(i)) s.delete(i)
  else s.add(i)
  peeked.value = s
}
function fadeDeeper() {
  if (fadeDone.value) return
  fadeStep.value += 1
  peeked.value = new Set()
}
function fadeFinish() {
  correctCount.value += 1
  verdictWin.value = WINS[Math.floor(Math.random() * WINS.length)]
  emit('solved', activeChapter.value?.id ?? '')
  next()
}

// ── 默背 state ──────────────────────────────────
// Only the first character of each line shows; recite the rest from memory,
// tap a line to check it, and reveal all when stuck. Built for long passages
// (華嚴 and the like), where reciting a whole run is the real practice.
const recallLines = ref<string[]>([])
const recallRevealed = ref<Set<number>>(new Set())
const recallAll = ref(false)
function buildRecall() {
  recallRevealed.value = new Set()
  recallAll.value = false
  const long = usableSections.value.filter(
    (sec) =>
      sec.paragraphs.flatMap((p) => p.split(SPLIT)).filter((s) => s.trim().length >= 2).length >= 4
  )
  const pool = long.length ? long : usableSections.value
  if (!pool.length) {
    recallLines.value = []
    return
  }
  const section = pool[Math.floor(Math.random() * pool.length)]
  activeChapter.value = section
  const phrases = section.paragraphs.flatMap((p) =>
    p.split(SPLIT).map((s) => s.trim()).filter((s) => s.length >= 2)
  )
  if (phrases.length < 4) {
    recallLines.value = []
    return
  }
  const start = Math.floor(Math.random() * Math.max(1, phrases.length - RECALL_LEN))
  recallLines.value = phrases.slice(start, start + RECALL_LEN)
}
function toggleRecall(i: number) {
  const s = new Set(recallRevealed.value)
  if (s.has(i)) s.delete(i)
  else s.add(i)
  recallRevealed.value = s
}
function recallFinish() {
  correctCount.value += 1
  verdictWin.value = WINS[Math.floor(Math.random() * WINS.length)]
  emit('solved', activeChapter.value?.id ?? '')
  next()
}

// ── 逐字重組 state ──────────────────────────────
// A line's characters are shuffled into tiles; tap them back into order.
interface SChar {
  id: number
  ch: string
}
const scTarget = ref('')
const scTray = ref<SChar[]>([])
const scBuilt = ref<SChar[]>([])
const scChecked = ref(false)
const scRight = computed(() => scBuilt.value.map((c) => c.ch).join('') === scTarget.value)
function buildScramble() {
  scChecked.value = false
  scBuilt.value = []
  const secs = usableSections.value
  if (!secs.length) {
    scTarget.value = ''
    scTray.value = []
    return
  }
  const section = secs[Math.floor(Math.random() * secs.length)]
  activeChapter.value = section
  const phrases = section.paragraphs
    .flatMap((p) => p.split(SPLIT).map((s) => s.trim()))
    .filter((s) => s.length >= 3 && s.length <= 12)
  if (!phrases.length) {
    scTarget.value = ''
    scTray.value = []
    return
  }
  const target = phrases[Math.floor(Math.random() * phrases.length)]
  scTarget.value = target
  scTray.value = shuffle([...target].map((ch, i) => ({ id: i, ch })))
}
function scPick(t: SChar) {
  if (scChecked.value) return
  scTray.value = scTray.value.filter((x) => x.id !== t.id)
  scBuilt.value = [...scBuilt.value, t]
}
function scUnpick(t: SChar) {
  if (scChecked.value) return
  scBuilt.value = scBuilt.value.filter((x) => x.id !== t.id)
  scTray.value = [...scTray.value, t]
}
function scCheck() {
  scChecked.value = true
  if (scRight.value) {
    correctCount.value += 1
    verdictWin.value = WINS[Math.floor(Math.random() * WINS.length)]
    emit('solved', activeChapter.value?.id ?? '')
  }
}

// ── 句序重排 state ──────────────────────────────
// Several lines shown shuffled; tap them into the sutra's own order.
interface OLine {
  id: number
  s: string
}
const roLines = ref<string[]>([])
const roPool = ref<OLine[]>([])
const roBuilt = ref<OLine[]>([])
const roChecked = ref(false)
const roRight = computed(() => roBuilt.value.map((x) => x.s).join('|') === roLines.value.join('|'))
function buildOrder() {
  roChecked.value = false
  roBuilt.value = []
  const long = usableSections.value.filter(
    (sec) =>
      sec.paragraphs.flatMap((p) => p.split(SPLIT)).filter((s) => s.trim().length >= 2).length >= 4
  )
  const pool = long.length ? long : usableSections.value
  if (!pool.length) {
    roLines.value = []
    roPool.value = []
    return
  }
  const section = pool[Math.floor(Math.random() * pool.length)]
  activeChapter.value = section
  const phrases = section.paragraphs.flatMap((p) =>
    p.split(SPLIT).map((s) => s.trim()).filter((s) => s.length >= 2)
  )
  if (phrases.length < 4) {
    roLines.value = []
    roPool.value = []
    return
  }
  const n = Math.min(5, phrases.length)
  const start = Math.floor(Math.random() * (phrases.length - n + 1))
  const window = phrases.slice(start, start + n)
  roLines.value = window
  roPool.value = shuffle(window.map((s, i) => ({ id: i, s })))
}
function roPick(t: OLine) {
  if (roChecked.value) return
  roPool.value = roPool.value.filter((x) => x.id !== t.id)
  roBuilt.value = [...roBuilt.value, t]
}
function roUnpick(t: OLine) {
  if (roChecked.value) return
  roBuilt.value = roBuilt.value.filter((x) => x.id !== t.id)
  roPool.value = [...roPool.value, t]
}
function roCheck() {
  roChecked.value = true
  if (roRight.value) {
    correctCount.value += 1
    verdictWin.value = WINS[Math.floor(Math.random() * WINS.length)]
    emit('solved', activeChapter.value?.id ?? '')
  }
}

// ── 限時挑戰 state ──────────────────────────────
// A countdown over rapid 接龍 questions — pick the next line, build a combo,
// race the clock. A wrong pick costs a few seconds.
const TIMED_SECS = 60
const tcTime = ref(TIMED_SECS)
const tcScore = ref(0)
const tcSeed = ref('')
const tcOptions = ref<string[]>([])
const tcAnswer = ref('')
const tcWrong = ref('')
const tcRunning = ref(false)
let tcTimer: ReturnType<typeof setInterval> | undefined

function stopTimer() {
  clearInterval(tcTimer)
  tcTimer = undefined
}
function tcNextQuestion() {
  const long = usableSections.value.filter(
    (sec) =>
      sec.paragraphs.flatMap((p) => p.split(SPLIT)).filter((s) => s.trim().length >= 2).length >= 2
  )
  const pool = long.length ? long : usableSections.value
  if (!pool.length) return
  const section = pool[Math.floor(Math.random() * pool.length)]
  const phrases = section.paragraphs.flatMap((p) =>
    p.split(SPLIT).map((s) => s.trim()).filter((s) => s.length >= 2)
  )
  if (phrases.length < 2) return
  const i = Math.floor(Math.random() * (phrases.length - 1))
  tcSeed.value = phrases[i]
  tcAnswer.value = phrases[i + 1]
  activeChapter.value = section
  const others = shuffle(allPhrases.value.filter((p) => p !== tcAnswer.value && p !== tcSeed.value)).slice(0, 3)
  tcOptions.value = shuffle([tcAnswer.value, ...others])
  tcWrong.value = ''
}
function buildTimed() {
  stopTimer()
  tcScore.value = 0
  tcTime.value = TIMED_SECS
  tcRunning.value = true
  tcNextQuestion()
  tcTimer = setInterval(() => {
    tcTime.value -= 1
    if (tcTime.value <= 0) {
      tcTime.value = 0
      stopTimer()
      tcRunning.value = false
      if (tcScore.value >= 1) {
        correctCount.value += tcScore.value
        emit('solved', activeChapter.value?.id ?? '')
      }
    }
  }, 1000)
}
function tcPick(opt: string) {
  if (!tcRunning.value) return
  if (opt === tcAnswer.value) {
    tcScore.value += 1
    tcNextQuestion()
  } else {
    tcWrong.value = opt
    tcTime.value = Math.max(0, tcTime.value - 3)
    setTimeout(() => (tcWrong.value = ''), 500)
  }
}

// ── 配對連連看 state ────────────────────────────
// Left column: first halves; right: second halves. Pair them up.
interface Half {
  pid: number
  text: string
}
const mpLeft = ref<Half[]>([])
const mpRight = ref<Half[]>([])
const mpMatched = ref<Set<number>>(new Set())
const mpSelLeft = ref<number | null>(null)
const mpSelRight = ref<number | null>(null)
const mpWrong = ref<Set<number>>(new Set())
const mpDone = computed(() => mpLeft.value.length > 0 && mpMatched.value.size === mpLeft.value.length)
function buildMatch() {
  mpMatched.value = new Set()
  mpSelLeft.value = null
  mpSelRight.value = null
  mpWrong.value = new Set()
  const secs = usableSections.value
  if (!secs.length) {
    mpLeft.value = []
    mpRight.value = []
    return
  }
  const section = secs[Math.floor(Math.random() * secs.length)]
  activeChapter.value = section
  const phrases = section.paragraphs
    .flatMap((p) => p.split(SPLIT).map((s) => s.trim()))
    .filter((s) => s.length >= 4)
  if (phrases.length < 3) {
    mpLeft.value = []
    mpRight.value = []
    return
  }
  const chosen = shuffle(phrases).slice(0, Math.min(4, phrases.length))
  const pairs = chosen.map((ph, i) => {
    const mid = Math.ceil([...ph].length / 2)
    return { pid: i, a: [...ph].slice(0, mid).join(''), b: [...ph].slice(mid).join('') }
  })
  mpLeft.value = shuffle(pairs.map((p) => ({ pid: p.pid, text: p.a })))
  mpRight.value = shuffle(pairs.map((p) => ({ pid: p.pid, text: p.b })))
}
function mpTapLeft(pid: number) {
  if (mpMatched.value.has(pid)) return
  mpSelLeft.value = mpSelLeft.value === pid ? null : pid
  mpResolve()
}
function mpTapRight(pid: number) {
  if (mpMatched.value.has(pid)) return
  mpSelRight.value = mpSelRight.value === pid ? null : pid
  mpResolve()
}
function mpResolve() {
  const l = mpSelLeft.value
  const r = mpSelRight.value
  if (l == null || r == null) return
  if (l === r) {
    mpMatched.value = new Set([...mpMatched.value, l])
    mpSelLeft.value = null
    mpSelRight.value = null
    if (mpDone.value) {
      correctCount.value += 1
      verdictWin.value = WINS[Math.floor(Math.random() * WINS.length)]
      emit('solved', activeChapter.value?.id ?? '')
    }
  } else {
    mpWrong.value = new Set([l, r])
    setTimeout(() => {
      mpWrong.value = new Set()
      mpSelLeft.value = null
      mpSelRight.value = null
    }, 550)
  }
}

// ── flow ────────────────────────────────────────
function build() {
  if (game.value === 'blank') buildBlank()
  else if (game.value === 'chain') buildChain()
  else if (game.value === 'fade') buildFade()
  else if (game.value === 'recall') buildRecall()
  else if (game.value === 'scramble') buildScramble()
  else if (game.value === 'order') buildOrder()
  else if (game.value === 'timed') buildTimed()
  else buildMatch()
}
function next() {
  round.value += 1
  hintsLeft.value = MAX_HINTS
  build()
}
function setGame(g: Game) {
  if (game.value === g) return
  stopTimer() // leaving 限時 — never let its clock keep ticking
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
  stopTimer()
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
  overflow-x: auto;
  scrollbar-width: none;
}
.drill__controls::-webkit-scrollbar {
  display: none;
}
.seg {
  flex-shrink: 0;
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

/* — 漸隱 —————————————————————————————————————— */
.fade {
  flex: 1;
  overflow-y: auto;
  padding: var(--s5);
  font-size: 1.2rem;
  line-height: 2.5;
  letter-spacing: 0.06em;
}
.fade__hint {
  font-family: var(--font-sans);
  font-size: var(--text-caption);
  color: var(--text-faint);
  letter-spacing: 0.1em;
  margin-bottom: var(--s3);
}
.fade__line {
  padding: 1px var(--s2);
  border-radius: var(--r-sm);
  color: var(--text-dim);
  cursor: pointer;
  transition: color var(--base) var(--ease), background var(--fast) var(--ease);
}
.fade__line--gone {
  color: transparent;
  border-bottom: 1px dashed rgba(167, 139, 250, 0.4);
}
.fade__line--peek {
  color: var(--amber);
  background: rgba(251, 191, 36, 0.08);
}

/* — 默背 —————————————————————————————————————— */
.recall {
  flex: 1;
  overflow-y: auto;
  padding: var(--s5);
  font-size: 1.2rem;
  line-height: 2.6;
  letter-spacing: 0.06em;
}
.recall__tip {
  font-family: var(--font-sans);
  font-size: var(--text-caption);
  color: var(--text-faint);
  letter-spacing: 0.1em;
  margin-bottom: var(--s3);
}
.recall__line {
  padding: 1px var(--s2);
  border-radius: var(--r-sm);
  color: var(--text-dim);
  cursor: pointer;
  transition: color var(--base) var(--ease), background var(--fast) var(--ease);
}
.recall__line--shown {
  color: var(--amber);
  background: rgba(251, 191, 36, 0.07);
}
.recall__first {
  color: var(--sapphire);
  font-weight: 400;
}
.recall__rest {
  color: transparent;
  border-bottom: 1px dashed rgba(96, 165, 250, 0.35);
}

/* — 逐字重組 —————————————————————————————————— */
.sc {
  flex: 1;
  overflow-y: auto;
  padding: var(--s5);
}
.sc__tip {
  font-family: var(--font-sans);
  font-size: var(--text-caption);
  color: var(--text-faint);
  letter-spacing: 0.1em;
  margin-bottom: var(--s4);
}
.sc__built {
  min-height: 3.4rem;
  display: flex;
  flex-wrap: wrap;
  gap: var(--s2);
  padding: var(--s3);
  border-radius: var(--r-md);
  border: 1px dashed rgba(167, 139, 250, 0.4);
  background: rgba(167, 139, 250, 0.05);
}
.sc__built--right {
  border-color: rgba(52, 211, 153, 0.7);
  border-style: solid;
  background: rgba(52, 211, 153, 0.12);
}
.sc__built--wrong {
  border-color: rgba(251, 113, 133, 0.7);
  border-style: solid;
  background: rgba(251, 113, 133, 0.1);
}
.sc__ph {
  align-self: center;
  font-family: var(--font-sans);
  font-size: var(--text-caption);
  color: var(--text-faint);
}
.sc__cell {
  min-width: 2.2rem;
  padding: var(--s2);
  border-radius: var(--r-sm);
  font-size: 1.4rem;
  color: var(--text);
  background: rgba(167, 139, 250, 0.18);
  border: 1px solid rgba(167, 139, 250, 0.4);
}
.sc__tray {
  margin-top: var(--s4);
  display: flex;
  flex-wrap: wrap;
  gap: var(--s2);
  justify-content: center;
}
.sc__tile {
  min-width: 2.4rem;
  padding: var(--s2) var(--s3);
  border-radius: var(--r-md);
  font-size: 1.4rem;
  color: var(--text);
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid var(--hairline-strong);
  transition: transform var(--fast) var(--ease), background var(--fast) var(--ease);
}
.sc__tile:hover {
  background: var(--glass-2);
  border-color: var(--amethyst);
  transform: translateY(-2px);
}
.sc__tile:active {
  transform: scale(0.94);
}

/* — 句序重排 —————————————————————————————————— */
.ro {
  flex: 1;
  overflow-y: auto;
  padding: var(--s5);
}
.ro__tip {
  font-family: var(--font-sans);
  font-size: var(--text-caption);
  color: var(--text-faint);
  letter-spacing: 0.1em;
  margin-bottom: var(--s4);
}
.ro__built {
  list-style: none;
  display: grid;
  gap: var(--s2);
  min-height: 2rem;
}
.ro__line {
  width: 100%;
  display: flex;
  align-items: center;
  gap: var(--s3);
  padding: var(--s3);
  border-radius: var(--r-md);
  text-align: left;
  font-size: 1.05rem;
  letter-spacing: 0.04em;
  color: var(--text);
  background: rgba(167, 139, 250, 0.14);
  border: 1px solid rgba(167, 139, 250, 0.35);
}
.ro__line--right {
  background: rgba(52, 211, 153, 0.16);
  border-color: rgba(52, 211, 153, 0.6);
}
.ro__line--wrong {
  background: rgba(251, 113, 133, 0.14);
  border-color: rgba(251, 113, 133, 0.6);
}
.ro__num {
  flex-shrink: 0;
  width: 1.6em;
  height: 1.6em;
  display: grid;
  place-items: center;
  border-radius: 50%;
  font-size: var(--text-micro);
  color: var(--amethyst);
  background: rgba(255, 255, 255, 0.08);
}
.ro__pool {
  margin-top: var(--s4);
  padding-top: var(--s4);
  border-top: 1px solid var(--hairline);
  display: grid;
  gap: var(--s2);
}
.ro__opt {
  width: 100%;
  padding: var(--s3);
  border-radius: var(--r-md);
  text-align: left;
  font-size: 1.05rem;
  letter-spacing: 0.04em;
  color: var(--text);
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--hairline-strong);
  transition: transform var(--fast) var(--ease), background var(--fast) var(--ease);
}
.ro__opt:hover {
  background: var(--glass-2);
  border-color: var(--amethyst);
}
.ro__opt:active {
  transform: scale(0.99);
}

/* — 限時挑戰 —————————————————————————————————— */
.tc-bar {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: var(--s3);
  padding: 0 var(--s5) var(--s3);
}
.tc-score {
  flex-shrink: 0;
  font-size: var(--text-caption);
  color: var(--amber);
}
.tc-secs {
  flex-shrink: 0;
  font-size: var(--text-caption);
  color: var(--text-dim);
}
.tc-time {
  flex: 1;
  height: 6px;
  border-radius: var(--r-full);
  background: rgba(255, 255, 255, 0.08);
  overflow: hidden;
}
.tc-time__fill {
  height: 100%;
  border-radius: var(--r-full);
  background: linear-gradient(90deg, var(--emerald), var(--sapphire));
  transition: width 1s linear;
}
.tc-time--low .tc-time__fill {
  background: linear-gradient(90deg, #fb7185, #f43f5e);
}
.tc-seed {
  flex-shrink: 0;
  margin: var(--s3) var(--s5) 0;
  padding: var(--s4);
  border-radius: var(--r-md);
  text-align: center;
  font-size: 1.25rem;
  letter-spacing: 0.06em;
  color: #fff;
  background: rgba(96, 165, 250, 0.14);
  border-left: 2px solid var(--sapphire);
}
.tc-arrow {
  flex-shrink: 0;
  text-align: center;
  font-family: var(--font-sans);
  font-size: var(--text-micro);
  color: var(--text-faint);
  padding: var(--s2) 0;
}
.tc-opts {
  flex: 1;
  overflow-y: auto;
  display: grid;
  gap: var(--s2);
  align-content: start;
  padding: 0 var(--s4) var(--s4);
}
.tc-opts .opt {
  padding: var(--s3) var(--s4);
}
.tc-end {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--s2);
  padding: var(--s5);
}
.tc-end__score {
  font-size: 4rem;
  font-weight: 200;
  line-height: 1;
  color: var(--amber);
}
.tc-end__label {
  font-size: var(--text-caption);
  letter-spacing: 0.14em;
  color: var(--text-faint);
}
.tc-end__again {
  margin-top: var(--s4);
  width: min(20rem, 80%);
}

/* — 配對連連看 —————————————————————————————————— */
.mp-tip {
  flex-shrink: 0;
  padding: 0 var(--s5) var(--s3);
  font-family: var(--font-sans);
  font-size: var(--text-caption);
  color: var(--text-faint);
  letter-spacing: 0.1em;
}
.mp {
  flex: 1;
  overflow-y: auto;
  display: flex;
  gap: var(--s3);
  padding: 0 var(--s4) var(--s4);
}
.mp-col {
  flex: 1;
  min-width: 0;
  display: grid;
  gap: var(--s2);
  align-content: start;
}
.mp-tile {
  padding: var(--s3);
  border-radius: var(--r-md);
  font-size: 1.1rem;
  letter-spacing: 0.04em;
  color: var(--text);
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--hairline-strong);
  transition: background var(--fast) var(--ease), border-color var(--fast) var(--ease), transform var(--fast) var(--ease);
}
.mp-tile--sel {
  background: rgba(167, 139, 250, 0.24);
  border-color: var(--amethyst);
}
.mp-tile--done {
  background: rgba(52, 211, 153, 0.16);
  border-color: rgba(52, 211, 153, 0.5);
  opacity: 0.7;
}
.mp-tile--wrong {
  background: rgba(251, 113, 133, 0.2);
  border-color: rgba(251, 113, 133, 0.7);
  animation: shake 0.4s;
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
