<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    :stroke-width="strokeWidth"
    stroke="currentColor"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    class="icon"
  >
    <path v-for="(d, i) in def.paths ?? []" :key="`p${i}`" :d="d" />
    <path
      v-for="(d, i) in def.solid ?? []"
      :key="`s${i}`"
      :d="d"
      fill="currentColor"
      stroke="none"
    />
    <circle
      v-for="(c, i) in def.dots ?? []"
      :key="`c${i}`"
      :cx="c[0]"
      :cy="c[1]"
      :r="c[2]"
      fill="currentColor"
      stroke="none"
    />
    <circle
      v-for="(c, i) in def.rings ?? []"
      :key="`r${i}`"
      :cx="c[0]"
      :cy="c[1]"
      :r="c[2]"
    />
  </svg>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface IconDef {
  paths?: string[]
  solid?: string[]
  dots?: [number, number, number][]
  rings?: [number, number, number][]
}

/**
 * Hand-drawn 24×24 line icons on a 1.5 stroke.
 * Replaces the Material Icons webfont — a handful of inline paths
 * beats shipping an icon font for eight glyphs.
 */
const ICONS: Record<string, IconDef> = {
  // — Navigation ————————————————————————————
  home: {
    paths: ['M3 10.2 12 3.3l9 6.9V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z'],
  },
  book: {
    paths: [
      'M12 6.6C10.4 5.1 8.4 4.4 5 4.4v12.9c3.4 0 5.4.7 7 2.2 1.6-1.5 3.6-2.2 7-2.2V4.4c-3.4 0-5.4.7-7 2.2z',
      'M12 6.6v12.9',
    ],
  },
  // Concentric ripples — repetition, resonance, the mala count
  ripple: {
    dots: [[12, 12, 2.4]],
    rings: [
      [12, 12, 6.2],
      [12, 12, 10],
    ],
  },
  gem: {
    paths: [
      'M12 2.9 3.6 9.6 12 21.1 20.4 9.6z',
      'M3.6 9.6h16.8',
      'M12 2.9 8.4 9.6 12 21.1 15.6 9.6z',
    ],
  },
  dots: {
    dots: [
      [5.5, 12, 1.4],
      [12, 12, 1.4],
      [18.5, 12, 1.4],
    ],
  },
  // An open lotus, seen head on — three petals and the seat below
  lotus: {
    paths: [
      'M12 4.2c1.9 2 2.8 4 2.8 6.2S13.9 14.6 12 16.4c-1.9-1.8-2.8-3.8-2.8-6S10.1 6.2 12 4.2z',
      'M9.2 10.4c-2.3-1-4.3-1.1-6 -.3.4 2.6 1.9 4.5 4.4 5.6',
      'M14.8 10.4c2.3-1 4.3-1.1 6-.3-.4 2.6-1.9 4.5-4.4 5.6',
      'M4.2 17.4c2.3 1.9 4.9 2.8 7.8 2.8s5.5-.9 7.8-2.8',
    ],
  },

  // — Actions ———————————————————————————————
  back: { paths: ['M14.5 5 7.5 12l7 7'] },
  close: { paths: ['M6 6l12 12', 'M18 6 6 18'] },
  check: { paths: ['M5 12.6 9.9 17.5 19 7.2'] },
  checkCircle: {
    paths: ['M8 12.2 11 15.2 16 9.4'],
    rings: [[12, 12, 9]],
  },
  circle: { rings: [[12, 12, 9]] },
  sparkle: {
    solid: [
      'M12 2.6c.65 4.05 2.1 5.5 6.15 6.15-4.05.65-5.5 2.1-6.15 6.15-.65-4.05-2.1-5.5-6.15-6.15C9.9 8.1 11.35 6.65 12 2.6z',
      'M18.4 14.2c.33 2.06 1.07 2.8 3.13 3.13-2.06.33-2.8 1.07-3.13 3.13-.33-2.06-1.07-2.8-3.13-3.13 2.06-.33 2.8-1.07 3.13-3.13z',
    ],
  },
  chevronRight: { paths: ['M9.5 5.5 16 12l-6.5 6.5'] },
  edit: {
    paths: ['M4 20h4L18.5 9.5a2 2 0 0 0-2.83-2.83L5 17.2z', 'M14 8l2.8 2.8'],
  },
  sun: {
    rings: [[12, 12, 4.2]],
    paths: [
      'M12 2.4v2.2', 'M12 19.4v2.2',
      'M2.4 12h2.2', 'M19.4 12h2.2',
      'M5.2 5.2l1.6 1.6', 'M17.2 17.2l1.6 1.6',
      'M18.8 5.2l-1.6 1.6', 'M6.8 17.2l-1.6 1.6',
    ],
  },
  moon: {
    paths: ['M20.4 14.6A8.6 8.6 0 0 1 9.4 3.6a8.6 8.6 0 1 0 11 11z'],
  },
}

const props = defineProps<{
  name: keyof typeof ICONS | string
  size?: number | string
  strokeWidth?: number
}>()

const def = computed<IconDef>(() => ICONS[props.name] ?? {})
const size = computed(() => props.size ?? 22)
const strokeWidth = computed(() => props.strokeWidth ?? 1.5)
</script>

<style scoped>
.icon {
  display: block;
  flex-shrink: 0;
}
</style>
