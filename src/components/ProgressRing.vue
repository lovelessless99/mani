<template>
  <svg :width="size" :height="size" :viewBox="`0 0 ${size} ${size}`">
    <circle
      :cx="center" :cy="center" :r="radius"
      fill="none"
      stroke="rgba(255,255,255,0.1)"
      :stroke-width="strokeWidth"
    />
    <circle
      :cx="center" :cy="center" :r="radius"
      fill="none"
      :stroke="color"
      :stroke-width="strokeWidth"
      stroke-linecap="round"
      :stroke-dasharray="circumference"
      :stroke-dashoffset="dashOffset"
      transform="rotate(-90)"
      :transform-origin="`${center} ${center}`"
      style="transition: stroke-dashoffset 0.5s ease"
    />
    <text
      :x="center" :y="center + 5"
      text-anchor="middle"
      fill="var(--text-primary)"
      font-size="12"
    >{{ label }}</text>
  </svg>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  value: number     // 0–1
  size?: number
  strokeWidth?: number
  color?: string
  label?: string
}>()

const size = computed(() => props.size ?? 80)
const strokeWidth = computed(() => props.strokeWidth ?? 6)
const color = computed(() => props.color ?? 'var(--gem-amethyst)')
const center = computed(() => size.value / 2)
const radius = computed(() => center.value - strokeWidth.value)
const circumference = computed(() => 2 * Math.PI * radius.value)
const dashOffset = computed(() => circumference.value * (1 - (props.value ?? 0)))
const label = computed(() => props.label ?? `${Math.round((props.value ?? 0) * 100)}%`)
</script>
