<template>
  <Transition name="ceremony">
    <div v-if="gem" class="ceremony-overlay" @click="onTap">
      <!-- Phase 1: Gem reveal -->
      <template v-if="phase === 'gem'">
        <div class="particles">
          <div v-for="n in 14" :key="n" class="particle" :style="particleStyle(n)" />
        </div>

        <div class="ceremony-gem" :class="{ 'ceremony-gem--visible': gemVisible }">
          <TresCanvas :alpha="true" :antialias="true" style="width:220px;height:220px">
            <TresPerspectiveCamera :position="[0, 0, 3.5]" :fov="45" />
            <GemMesh :params="gem.params" :scale="1.3" :auto-rotate="true" />
            <TresAmbientLight :intensity="0.4" />
            <TresDirectionalLight :position="[3, 3, 3]" :intensity="1.5" />
            <TresPointLight :position="[0, 2, 2]" :intensity="3" :color="gem.params.colorHex" :distance="7" />
          </TresCanvas>
        </div>

        <div class="ceremony-info" :class="{ 'ceremony-info--visible': infoVisible }">
          <p class="ceremony-eyebrow">寶石解鎖</p>
          <h2 v-if="buddhaName" class="ceremony-name" :style="{ color: gem.params.colorHex }">
            {{ buddhaName }}
          </h2>
          <p class="ceremony-cut">{{ gem.params.geometry }} 切割</p>
          <p class="ceremony-hint tap-hint">
            {{ constellationName ? '點擊看星座' : '點擊繼續' }}
          </p>
        </div>
      </template>

      <!-- Phase 2: Constellation reveal -->
      <template v-else-if="phase === 'constellation'">
        <div class="constellation-phase" :class="{ 'constellation-phase--visible': constellationVisible }">
          <!-- Star field background -->
          <div class="star-field">
            <div v-for="i in 30" :key="i" class="bg-star" :style="bgStarStyle(i)" />
          </div>

          <!-- SVG constellation lines -->
          <svg class="constellation-svg" viewBox="0 0 280 280">
            <defs>
              <filter id="glow">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
              </filter>
            </defs>
            <g filter="url(#glow)">
              <line
                v-for="(line, i) in constellationLines"
                :key="`l${i}`"
                :x1="line.x1" :y1="line.y1" :x2="line.x2" :y2="line.y2"
                :stroke="gem.params.colorHex"
                stroke-width="1.5"
                stroke-opacity="0.8"
                :style="`stroke-dasharray:300;stroke-dashoffset:300;animation:draw-line 1s ${i*0.15}s ease-out forwards`"
              />
              <circle
                v-for="(star, i) in constellationStars"
                :key="`s${i}`"
                :cx="star.x" :cy="star.y"
                :r="star.main ? 5 : 3"
                :fill="gem.params.colorHex"
                :style="`opacity:0;animation:star-appear 0.6s ${i*0.08}s ease-out forwards`"
              />
            </g>
          </svg>

          <!-- Info -->
          <div class="constellation-info">
            <h2 class="ceremony-name ceremony-name--lg">{{ constellationName }}</h2>
            <p class="ceremony-name-en">{{ constellationNameEn }}</p>
            <p class="ceremony-link" :style="{ color: gem.params.colorHex }">
              {{ buddhaName }} · 對應星座
            </p>
            <p class="ceremony-hint">點擊繼續</p>
          </div>
        </div>
      </template>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue'
import { TresCanvas } from '@tresjs/core'
import GemMesh from './GemMesh.vue'
import type { GemRecord, BuddhaInfo, ConstellationInfo } from 'src/types/gem'
import buddhasData from 'src/data/meta/buddhas-88.json'
import constellationsData from 'src/data/meta/constellations-88.json'

const props = defineProps<{ gem: GemRecord | null }>()
const emit = defineEmits<{ dismiss: [] }>()

const phase = ref<'gem' | 'constellation'>('gem')
const gemVisible = ref(false)
const infoVisible = ref(false)
const constellationVisible = ref(false)
let t1: ReturnType<typeof setTimeout>
let t2: ReturnType<typeof setTimeout>
let t3: ReturnType<typeof setTimeout>

watch(() => props.gem, (g) => {
  if (g) {
    phase.value = 'gem'
    gemVisible.value = false
    infoVisible.value = false
    constellationVisible.value = false
    t1 = setTimeout(() => { gemVisible.value = true }, 300)
    t2 = setTimeout(() => { infoVisible.value = true }, 900)
  }
})

onUnmounted(() => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) })

function onTap() {
  if (phase.value === 'gem') {
    if (constellation.value) {
      // Transition to constellation phase
      phase.value = 'constellation'
      constellationVisible.value = false
      t3 = setTimeout(() => { constellationVisible.value = true }, 100)
    } else {
      doDissmiss()
    }
  } else {
    doDissmiss()
  }
}

function doDissmiss() {
  gemVisible.value = false
  infoVisible.value = false
  constellationVisible.value = false
  setTimeout(() => emit('dismiss'), 200)
}

const buddha = computed<BuddhaInfo | undefined>(() =>
  props.gem?.buddhaId
    ? (buddhasData as BuddhaInfo[]).find((b) => b.id === props.gem!.buddhaId)
    : undefined
)

const constellation = computed<ConstellationInfo | undefined>(() =>
  props.gem?.constellationId
    ? (constellationsData as ConstellationInfo[]).find((c) => c.id === props.gem!.constellationId)
    : undefined
)

const buddhaName = computed(() => buddha.value?.nameZh)
const constellationName = computed(() => constellation.value?.nameZh)
const constellationNameEn = computed(() => constellation.value?.nameEn)

// Generate a constellation-like star pattern (unique per constellationId)
const constellationStars = computed(() => {
  const seed = props.gem?.constellationId
    ? parseInt(props.gem.constellationId.replace('c', ''), 10)
    : 1
  return Array.from({ length: 7 }, (_, i) => ({
    x: 50 + ((seed * (i + 3)) % 180),
    y: 50 + ((seed * (i + 7) * 3) % 180),
    main: i === 0 || i === 3,
  }))
})

const constellationLines = computed(() => {
  const s = constellationStars.value
  return [
    { x1: s[0].x, y1: s[0].y, x2: s[1].x, y2: s[1].y },
    { x1: s[1].x, y1: s[1].y, x2: s[2].x, y2: s[2].y },
    { x1: s[2].x, y1: s[2].y, x2: s[3].x, y2: s[3].y },
    { x1: s[3].x, y1: s[3].y, x2: s[4].x, y2: s[4].y },
    { x1: s[0].x, y1: s[0].y, x2: s[5].x, y2: s[5].y },
    { x1: s[4].x, y1: s[4].y, x2: s[6].x, y2: s[6].y },
  ]
})

function particleStyle(n: number) {
  const angle = (n / 14) * 360
  return {
    '--angle': `${angle}deg`,
    '--distance': `${70 + (n % 4) * 22}px`,
    '--color': props.gem?.params.colorHex ?? '#9b59b6',
    animationDelay: `${(n % 5) * 0.07}s`,
  }
}

function bgStarStyle(n: number) {
  const seed = n * 137.5
  return {
    left: `${(seed % 100)}%`,
    top: `${((seed * 1.3) % 100)}%`,
    width: `${1 + (n % 2)}px`,
    height: `${1 + (n % 2)}px`,
    animationDelay: `${(n % 5) * 0.4}s`,
    animationDuration: `${2 + (n % 3)}s`,
  }
}
</script>

<style scoped>
.ceremony-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.93);
  z-index: 2000;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  cursor: pointer;
}

/* === Phase 1: Gem === */
.particles {
  position: absolute;
  inset: 0;
  pointer-events: none;
  display: flex;
  align-items: center;
  justify-content: center;
}

.particle {
  position: absolute;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--color);
  animation: burst 1.3s ease-out forwards;
}

@keyframes burst {
  0%   { transform: rotate(var(--angle)) translateX(0) scale(0); opacity: 1; }
  100% { transform: rotate(var(--angle)) translateX(var(--distance)) scale(1); opacity: 0; }
}

.ceremony-gem {
  opacity: 0;
  transform: scale(0.3);
  transition: opacity 0.6s ease, transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.ceremony-gem--visible {
  opacity: 1;
  transform: scale(1);
}

.ceremony-info {
  text-align: center;
  opacity: 0;
  transform: translateY(16px);
  transition: opacity 0.5s ease, transform 0.5s ease;
}

.ceremony-info--visible {
  opacity: 1;
  transform: translateY(0);
}

/* — Ceremony typography ——————————————————— */
.ceremony-eyebrow {
  font-size: var(--text-micro);
  font-weight: 500;
  letter-spacing: 0.32em;
  text-indent: 0.32em;
  color: var(--text-faint);
  text-transform: uppercase;
}

.ceremony-name {
  margin-top: var(--s2);
  font-size: var(--text-title);
  font-weight: 300;
  letter-spacing: 0.14em;
  line-height: 1.4;
}

.ceremony-name--lg {
  font-size: var(--text-display);
  color: var(--text);
}

.ceremony-name-en {
  margin-top: var(--s1);
  font-size: var(--text-caption);
  letter-spacing: 0.1em;
  color: var(--text-faint);
}

.ceremony-cut {
  margin-top: var(--s2);
  font-size: var(--text-micro);
  letter-spacing: 0.16em;
  color: var(--text-faint);
}

.ceremony-link {
  margin-top: var(--s3);
  font-size: var(--text-caption);
  letter-spacing: 0.08em;
}

.ceremony-hint {
  margin-top: var(--s6);
  font-size: var(--text-micro);
  letter-spacing: 0.2em;
  color: var(--text-faint);
}

.tap-hint {
  animation: blink 2s ease-in-out infinite;
}

@keyframes blink {
  0%, 100% { opacity: 0.5; }
  50%       { opacity: 1; }
}

/* === Phase 2: Constellation === */
.constellation-phase {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.5s ease;
}

.constellation-phase--visible {
  opacity: 1;
}

.star-field {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.bg-star {
  position: absolute;
  border-radius: 50%;
  background: white;
  animation: twinkle-bg 2s ease-in-out infinite;
}

@keyframes twinkle-bg {
  0%, 100% { opacity: 0.3; }
  50%       { opacity: 1; }
}

.constellation-svg {
  width: 280px;
  height: 280px;
}

.constellation-info {
  text-align: center;
  margin-top: -16px;
  padding: 0 32px;
}

@keyframes draw-line {
  to { stroke-dashoffset: 0; }
}

@keyframes star-appear {
  0%   { opacity: 0; transform: scale(0); }
  60%  { opacity: 1; transform: scale(1.8); }
  100% { opacity: 0.9; transform: scale(1); }
}

/* Transitions */
.ceremony-enter-active { transition: opacity 0.3s ease; }
.ceremony-leave-active { transition: opacity 0.3s ease; }
.ceremony-enter-from, .ceremony-leave-to { opacity: 0; }
</style>
