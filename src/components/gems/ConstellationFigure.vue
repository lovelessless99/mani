<template>
  <svg
    v-if="figure"
    class="figure"
    viewBox="-6 -6 112 112"
    :style="{ '--c': color }"
    role="img"
    :aria-label="`${label} 星座圖`"
  >
    <defs>
      <filter :id="glowId" x="-60%" y="-60%" width="220%" height="220%">
        <feGaussianBlur stdDeviation="1.8" result="b" />
        <feMerge>
          <feMergeNode in="b" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>

    <g :filter="`url(#${glowId})`">
      <line
        v-for="(ln, i) in segments"
        :key="`l${i}`"
        :x1="ln.x1"
        :y1="ln.y1"
        :x2="ln.x2"
        :y2="ln.y2"
        class="figure__line"
        :style="lineStyle(ln.length, i)"
      />

      <circle
        v-for="(st, i) in points"
        :key="`s${i}`"
        :cx="st.x"
        :cy="st.y"
        :r="st.bright ? 2.6 : 1.5"
        class="figure__star"
        :class="{ 'figure__star--bright': st.bright }"
        :style="{ animationDelay: `${delayIn + i * 0.07}s` }"
      />
    </g>
  </svg>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import figures from 'src/data/meta/constellation-figures.json'

/**
 * Draws a constellation's traditional stick figure.
 *
 * Stars appear first, then the lines trace between them, which is the
 * order you actually pick a constellation out of the sky.
 */

const props = withDefaults(
  defineProps<{
    constellationId?: string
    color?: string
    label?: string
    /** Seconds to wait before the stars start appearing */
    delayIn?: number
  }>(),
  { color: '#ffffff', label: '', delayIn: 0 }
)

interface Figure {
  s: [number, number][]
  l: [number, number][]
  m?: number[]
}

const glowId = `cf-glow-${Math.random().toString(36).slice(2, 9)}`

const figure = computed<Figure | null>(() => {
  if (!props.constellationId) return null
  const all = figures as unknown as Record<string, Figure>
  return all[props.constellationId] ?? null
})

const points = computed(() => {
  const f = figure.value
  if (!f) return []
  const bright = new Set(f.m ?? [])
  return f.s.map(([x, y], i) => ({ x, y, bright: bright.has(i) }))
})

const segments = computed(() => {
  const f = figure.value
  if (!f) return []
  return f.l.map(([a, b]) => {
    const [x1, y1] = f.s[a]
    const [x2, y2] = f.s[b]
    return { x1, y1, x2, y2, length: Math.hypot(x2 - x1, y2 - y1) }
  })
})

// Each line's dash offset is its own length, so every segment draws at
// roughly the same speed instead of long ones lagging behind short ones.
function lineStyle(length: number, i: number) {
  const start = props.delayIn + 0.45 + i * 0.11
  return {
    strokeDasharray: length,
    strokeDashoffset: length,
    animationDelay: `${start}s`,
    animationDuration: `${0.28 + length * 0.012}s`,
  }
}
</script>

<style scoped>
.figure {
  width: 100%;
  height: 100%;
  overflow: visible;
}

.figure__line {
  stroke: var(--c);
  stroke-width: 0.7;
  stroke-opacity: 0.75;
  stroke-linecap: round;
  animation-name: draw;
  animation-timing-function: cubic-bezier(0.16, 1, 0.3, 1);
  animation-fill-mode: forwards;
}

@keyframes draw {
  to {
    stroke-dashoffset: 0;
  }
}

.figure__star {
  fill: var(--c);
  opacity: 0;
  transform-box: fill-box;
  transform-origin: center;
  animation: pop 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

.figure__star--bright {
  fill: #fff;
}

@keyframes pop {
  0% {
    opacity: 0;
    transform: scale(0);
  }
  55% {
    opacity: 1;
    transform: scale(1.7);
  }
  100% {
    opacity: 0.95;
    transform: scale(1);
  }
}

@media (prefers-reduced-motion: reduce) {
  .figure__line,
  .figure__star {
    animation: none;
    stroke-dashoffset: 0;
    opacity: 0.9;
  }
}
</style>
