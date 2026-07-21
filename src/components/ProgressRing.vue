<template>
  <svg
    :width="size"
    :height="size"
    :viewBox="`0 0 ${size} ${size}`"
    class="ring"
    role="img"
    :aria-label="`進度 ${Math.round(clamped * 100)}%`"
  >
    <circle
      :cx="center"
      :cy="center"
      :r="radius"
      fill="none"
      stroke="rgba(255,255,255,0.07)"
      :stroke-width="strokeWidth"
    />
    <circle
      :cx="center"
      :cy="center"
      :r="radius"
      fill="none"
      :stroke="color"
      :stroke-width="strokeWidth"
      stroke-linecap="round"
      :stroke-dasharray="circumference"
      :stroke-dashoffset="dashOffset"
      transform="rotate(-90)"
      :transform-origin="`${center} ${center}`"
      class="ring__value"
    />
    <text
      v-if="label !== ''"
      :x="center"
      :y="center"
      text-anchor="middle"
      dominant-baseline="central"
      fill="currentColor"
      :font-size="fontSize"
      class="ring__label tnum"
    >
      {{ label }}
    </text>
  </svg>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  /** 0–1 */
  value: number
  size?: number
  strokeWidth?: number
  color?: string
  /** Pass '' to hide the centre text */
  label?: string
}>()

const size = computed(() => props.size ?? 80)
const strokeWidth = computed(() => props.strokeWidth ?? 5)
const color = computed(() => props.color ?? 'var(--accent)')
const center = computed(() => size.value / 2)
const radius = computed(() => center.value - strokeWidth.value)
const circumference = computed(() => 2 * Math.PI * radius.value)

const clamped = computed(() => Math.min(1, Math.max(0, props.value ?? 0)))
const dashOffset = computed(() => circumference.value * (1 - clamped.value))

const fontSize = computed(() => Math.round(size.value * 0.26))
const label = computed(() =>
  props.label !== undefined ? props.label : `${Math.round(clamped.value * 100)}`
)
</script>

<style scoped>
.ring {
  color: var(--text);
  overflow: visible;
}

.ring__value {
  transition: stroke-dashoffset var(--slow) var(--ease-out);
  filter: drop-shadow(0 0 5px currentColor);
}

.ring__label {
  font-weight: 300;
  letter-spacing: 0.02em;
}
</style>
