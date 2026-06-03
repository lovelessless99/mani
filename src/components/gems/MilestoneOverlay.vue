<template>
  <Transition name="milestone">
    <div v-if="visible" class="milestone-overlay" @click="$emit('dismiss')">
      <svg class="constellation-svg" viewBox="0 0 390 200" xmlns="http://www.w3.org/2000/svg">
        <line
          v-for="(line, i) in constellationLines"
          :key="`l${i}`"
          :x1="line.x1" :y1="line.y1" :x2="line.x2" :y2="line.y2"
          :stroke="accentColor" stroke-width="1.5" stroke-opacity="0.7"
          :style="`stroke-dasharray:300;stroke-dashoffset:300;animation:draw-line 0.8s ${i*0.1}s ease-out forwards`"
        />
        <circle
          v-for="(star, i) in stars"
          :key="`s${i}`"
          :cx="star.x" :cy="star.y" r="3.5"
          :fill="accentColor"
          :style="`opacity:0;animation:twinkle 0.8s ${i*0.06}s ease-out forwards`"
        />
      </svg>

      <div class="milestone-content">
        <q-icon name="auto_awesome" :color="accentColorName" size="52px" class="milestone-icon" />
        <div class="text-h5 text-primary q-mt-md">{{ title }}</div>
        <div class="text-subtitle2 q-mt-xs" :style="{ color: accentColor }">{{ subtitle }}</div>
        <div class="text-caption text-secondary q-mt-sm" style="max-width:280px;margin:0 auto">{{ body }}</div>
        <div class="text-caption text-secondary q-mt-xl">點擊繼續</div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { computed } from 'vue'

type MilestoneType = 'sutra_complete' | 'ten_complete' | 'hundred_complete'

const props = defineProps<{
  visible: boolean
  type: MilestoneType
  sutraTitle?: string
}>()

defineEmits<{ dismiss: [] }>()

const accentColor = computed(() => {
  if (props.type === 'ten_complete') return '#2ecc71'
  if (props.type === 'hundred_complete') return '#9b59b6'
  return '#f39c12'
})

const accentColorName = computed(() => {
  if (props.type === 'ten_complete') return 'green-4'
  if (props.type === 'hundred_complete') return 'purple-4'
  return 'amber-4'
})

const title = computed(() => {
  if (props.type === 'ten_complete') return '十部圓滿'
  if (props.type === 'hundred_complete') return '百部圓滿'
  return `${props.sutraTitle ?? '經典'} 圓滿！`
})

const subtitle = computed(() => {
  if (props.type === 'ten_complete') return '精進修行，法寶莊嚴'
  if (props.type === 'hundred_complete') return '善知識，智慧圓滿'
  return '所有卷數已完成，功德迴向'
})

const body = computed(() => {
  if (props.type === 'ten_complete') return '十部經典圓滿，功德廣大，寶蓮華光遍照十方。'
  if (props.type === 'hundred_complete') return '百部圓滿，已入善知識之境，光明周遍虛空法界。'
  return '誦持圓滿，所獲功德迴向法界一切眾生，同沾法益。'
})

const stars = computed(() =>
  Array.from({ length: 8 }, (_, i) => ({
    x: 40 + (i % 4) * 90 + Math.sin(i * 1.3) * 18,
    y: 35 + Math.floor(i / 4) * 90 + Math.cos(i * 0.9) * 14,
  }))
)

const constellationLines = computed(() => {
  const s = stars.value
  return [
    { x1: s[0].x, y1: s[0].y, x2: s[1].x, y2: s[1].y },
    { x1: s[1].x, y1: s[1].y, x2: s[2].x, y2: s[2].y },
    { x1: s[2].x, y1: s[2].y, x2: s[3].x, y2: s[3].y },
    { x1: s[4].x, y1: s[4].y, x2: s[5].x, y2: s[5].y },
    { x1: s[5].x, y1: s[5].y, x2: s[6].x, y2: s[6].y },
    { x1: s[0].x, y1: s[0].y, x2: s[4].x, y2: s[4].y },
    { x1: s[3].x, y1: s[3].y, x2: s[7].x, y2: s[7].y },
  ]
})
</script>

<style scoped>
.milestone-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 10, 0.96);
  z-index: 1500;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.constellation-svg {
  position: absolute;
  top: 8%;
  width: 100%;
  pointer-events: none;
}

.milestone-content {
  text-align: center;
  padding: 0 32px;
  margin-top: 180px;
}

.milestone-icon {
  animation: pulse-scale 1.8s ease-in-out infinite;
}

@keyframes draw-line {
  to { stroke-dashoffset: 0; }
}

@keyframes twinkle {
  0%   { opacity: 0; transform: scale(0); }
  60%  { opacity: 1; transform: scale(1.6); }
  100% { opacity: 0.85; transform: scale(1); }
}

@keyframes pulse-scale {
  0%, 100% { transform: scale(1); }
  50%       { transform: scale(1.18); }
}

.milestone-enter-active { animation: fade-in 0.5s ease; }
.milestone-leave-active { animation: fade-in 0.3s ease reverse; }

@keyframes fade-in {
  from { opacity: 0; }
  to   { opacity: 1; }
}
</style>
