<template>
  <Transition name="ceremony">
    <div v-if="gem" class="ceremony-overlay" @click="onDismiss">
      <div class="particles">
        <div
          v-for="n in 12"
          :key="n"
          class="particle"
          :style="particleStyle(n)"
        />
      </div>

      <div class="ceremony-gem" :class="{ 'ceremony-gem--visible': gemVisible }">
        <TresCanvas :alpha="true" :antialias="true" style="width:200px;height:200px">
          <TresPerspectiveCamera :position="[0, 0, 3.5]" :fov="45" />
          <GemMesh :params="gem.params" :scale="1.2" :auto-rotate="true" />
          <TresAmbientLight :intensity="0.4" />
          <TresDirectionalLight :position="[3, 3, 3]" :intensity="1.5" />
          <TresPointLight :position="[0, 2, 2]" :intensity="3" :color="gem.params.colorHex" :distance="7" />
        </TresCanvas>
      </div>

      <div class="ceremony-info" :class="{ 'ceremony-info--visible': infoVisible }">
        <div class="text-h6 text-primary q-mb-xs">寶石解鎖！</div>
        <div v-if="buddhaName" class="text-subtitle1" :style="{ color: gem.params.colorHex }">
          {{ buddhaName }}
        </div>
        <div v-if="constellationName" class="text-caption text-secondary q-mt-xs">
          ✦ {{ constellationName }}
        </div>
        <div class="text-caption text-secondary q-mt-md">點擊任意處繼續</div>
      </div>
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

const gemVisible = ref(false)
const infoVisible = ref(false)
let t1: ReturnType<typeof setTimeout>
let t2: ReturnType<typeof setTimeout>

watch(() => props.gem, (g) => {
  if (g) {
    gemVisible.value = false
    infoVisible.value = false
    t1 = setTimeout(() => { gemVisible.value = true }, 300)
    t2 = setTimeout(() => { infoVisible.value = true }, 900)
  }
})

onUnmounted(() => { clearTimeout(t1); clearTimeout(t2) })

function onDismiss() {
  gemVisible.value = false
  infoVisible.value = false
  setTimeout(() => emit('dismiss'), 200)
}

const buddhaName = computed<string | undefined>(() =>
  props.gem?.buddhaId
    ? (buddhasData as BuddhaInfo[]).find((b) => b.id === props.gem!.buddhaId)?.nameZh
    : undefined
)

const constellationName = computed<string | undefined>(() =>
  props.gem?.constellationId
    ? (constellationsData as ConstellationInfo[]).find((c) => c.id === props.gem!.constellationId)?.nameZh
    : undefined
)

function particleStyle(n: number) {
  const angle = (n / 12) * 360
  return {
    '--angle': `${angle}deg`,
    '--distance': `${80 + (n % 3) * 25}px`,
    '--color': props.gem?.params.colorHex ?? '#9b59b6',
    animationDelay: `${(n % 4) * 0.08}s`,
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
}

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
  animation: burst 1.2s ease-out forwards;
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

.ceremony-enter-active { transition: opacity 0.3s ease; }
.ceremony-leave-active { transition: opacity 0.3s ease; }
.ceremony-enter-from, .ceremony-leave-to { opacity: 0; }
</style>
