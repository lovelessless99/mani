<template>
  <component
    :is="gem ? 'button' : 'div'"
    class="cell"
    :class="{ 'cell--lit': !!gem }"
    :type="gem ? 'button' : undefined"
    :style="gem ? { '--c': gem.params.colorHex } : undefined"
    :aria-label="gem ? `${buddhaName ?? '寶石'} ${constellationName ?? ''}` : '未解鎖'"
    @click="gem && $emit('click', gem)"
  >
    <!-- The constellation waiting in this slot, drawn faintly behind the
         stone. Locked cells show it too — you can see what is coming. -->
    <svg v-if="figure" class="cell__sky" viewBox="-8 -8 116 116" aria-hidden="true">
      <line
        v-for="(l, i) in lines"
        :key="`l${i}`"
        :x1="l.x1"
        :y1="l.y1"
        :x2="l.x2"
        :y2="l.y2"
        class="cell__line"
      />
      <circle
        v-for="(p, i) in points"
        :key="`s${i}`"
        :cx="p.x"
        :cy="p.y"
        :r="p.bright ? 2.2 : 1.3"
        class="cell__star"
      />
    </svg>

    <div v-if="gem" class="orb-wrap">
      <span class="orb" />
      <span class="orb__spark" />
    </div>
    <div v-else class="cell__num tnum">{{ slotLabel }}</div>

    <div class="cell__label">
      <template v-if="gem">{{ buddhaName ?? constellationName ?? shapeName ?? '寶石' }}</template>
      <template v-else>{{ constellationName ?? slotLabel ?? '未解鎖' }}</template>
    </div>
  </component>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { GemRecord, BuddhaInfo, ConstellationInfo } from 'src/types/gem'
import buddhasData from 'src/data/meta/buddhas-88.json'
import constellationsData from 'src/data/meta/constellations-88.json'
import figuresData from 'src/data/meta/constellation-figures.json'

interface Figure {
  s: [number, number][]
  l: [number, number][]
  m?: number[]
}

const props = defineProps<{
  gem?: GemRecord
  /** Which constellation belongs in this slot, earned or not */
  constellationId?: string
  /** Shown on empty slots — the slot's position in the 88-gem set */
  slotLabel?: string
}>()

defineEmits<{ click: [gem: GemRecord] }>()

const conId = computed(() => props.gem?.constellationId ?? props.constellationId)

const buddhaName = computed(() =>
  props.gem?.buddhaId
    ? (buddhasData as BuddhaInfo[]).find((b) => b.id === props.gem!.buddhaId)?.nameZh
    : undefined
)

const constellationName = computed(() =>
  conId.value
    ? (constellationsData as ConstellationInfo[]).find((c) => c.id === conId.value)?.nameZh
    : undefined
)

const SHAPE_NAMES: Record<string, string> = {
  lotus: '蓮華',
  vase: '寶瓶',
  stupa: '寶塔',
  dome: '佛頂',
}

const shapeName = computed(() =>
  props.gem ? SHAPE_NAMES[props.gem.params.geometry] : undefined
)

const figure = computed<Figure | null>(() => {
  if (!conId.value) return null
  return (figuresData as unknown as Record<string, Figure>)[conId.value] ?? null
})

const points = computed(() => {
  const f = figure.value
  if (!f) return []
  const bright = new Set(f.m ?? [])
  return f.s.map(([x, y], i) => ({ x, y, bright: bright.has(i) }))
})

const lines = computed(() => {
  const f = figure.value
  if (!f) return []
  return f.l.map(([a, b]) => ({
    x1: f.s[a][0],
    y1: f.s[a][1],
    x2: f.s[b][0],
    y2: f.s[b][1],
  }))
})
</script>

<style scoped>
.cell {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--s2);
  width: 100%;
  aspect-ratio: 4 / 5;
  padding: var(--s2) 4px;
  border-radius: var(--r-md);
  overflow: hidden;
  text-align: center;

  /* A display case: dark well, lit rim, faint bevel at the top edge */
  background:
    radial-gradient(120% 90% at 50% 0%, rgba(255, 255, 255, 0.07), transparent 62%),
    rgba(255, 255, 255, 0.022);
  border: 1px solid rgba(255, 255, 255, 0.07);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.06),
    inset 0 -20px 30px -22px rgba(0, 0, 0, 0.9);
  transition:
    transform var(--fast) var(--ease),
    border-color var(--base) var(--ease),
    box-shadow var(--base) var(--ease);
}

.cell--lit {
  cursor: pointer;
  border-color: color-mix(in srgb, var(--c) 34%, transparent);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.09),
    inset 0 0 26px -12px var(--c),
    0 0 20px -12px var(--c);
}

.cell--lit:hover {
  transform: translateY(-3px);
  border-color: color-mix(in srgb, var(--c) 62%, transparent);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.12),
    inset 0 0 30px -10px var(--c),
    0 8px 26px -10px var(--c);
}

.cell--lit:active {
  transform: scale(0.97);
}

.cell:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

/* — Constellation backdrop ————————————————— */
.cell__sky {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.cell__line {
  stroke: rgba(255, 255, 255, 0.1);
  stroke-width: 0.5;
  stroke-linecap: round;
}

.cell__star {
  fill: rgba(255, 255, 255, 0.16);
}

.cell--lit .cell__line {
  stroke: color-mix(in srgb, var(--c) 45%, transparent);
  stroke-width: 0.6;
}

.cell--lit .cell__star {
  fill: color-mix(in srgb, var(--c) 70%, white 30%);
}

/* — The stone ————————————————————————————— */
.orb-wrap {
  position: relative;
  width: 46px;
  height: 46px;
  display: grid;
  place-items: center;
  animation: float 4.2s ease-in-out infinite;
}

.orb {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background:
    radial-gradient(circle at 34% 26%, rgba(255, 255, 255, 0.92) 0%, transparent 34%),
    radial-gradient(circle at 68% 74%, rgba(255, 255, 255, 0.28) 0%, transparent 30%),
    radial-gradient(
      circle at 50% 55%,
      color-mix(in srgb, var(--c) 88%, white 12%) 0%,
      color-mix(in srgb, var(--c) 55%, black 45%) 100%
    );
  box-shadow:
    0 0 16px -2px var(--c),
    0 0 34px -8px var(--c),
    inset 0 0 12px rgba(255, 255, 255, 0.22);
}

/* A single travelling glint reads as a polished facet catching light */
.orb__spark {
  position: absolute;
  top: 6px;
  right: 7px;
  width: 7px;
  height: 7px;
  background: #fff;
  clip-path: polygon(
    50% 0%, 60% 40%, 100% 50%, 60% 60%,
    50% 100%, 40% 60%, 0% 50%, 40% 40%
  );
  animation: glint 4.6s ease-in-out infinite;
}

@keyframes float {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-3px);
  }
}

@keyframes glint {
  0%,
  100% {
    opacity: 0.25;
    transform: scale(0.55) rotate(0deg);
  }
  50% {
    opacity: 1;
    transform: scale(1) rotate(120deg);
  }
}

/* — Empty slot ————————————————————————————— */
.cell__num {
  position: relative;
  width: 46px;
  height: 46px;
  display: grid;
  place-items: center;
  font-size: 1rem;
  font-weight: 200;
  color: rgba(255, 255, 255, 0.2);
}

/* — Label —————————————————————————————————— */
.cell__label {
  position: relative;
  max-width: 100%;
  padding: 0 3px;
  font-size: 10px;
  letter-spacing: 0.04em;
  line-height: 1.2;
  color: var(--text-faint);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cell--lit .cell__label {
  color: var(--text-dim);
}

.cell--lit:hover .cell__label {
  color: var(--text);
}

@media (prefers-reduced-motion: reduce) {
  .orb-wrap,
  .orb__spark {
    animation: none;
  }
}
</style>
