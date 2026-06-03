<template>
  <div class="gem-viewer-overlay" @click.self="$emit('close')">
    <div class="gem-viewer-canvas">
      <TresCanvas :alpha="true" :antialias="true">
        <TresPerspectiveCamera :position="[0, 0, 4]" :fov="45" />
        <OrbitControls
          :enable-zoom="true"
          :enable-pan="false"
          :min-distance="2"
          :max-distance="8"
        />
        <GemMesh :params="gem.params" :scale="1.5" :auto-rotate="true" />
        <TresAmbientLight :intensity="0.4" />
        <TresDirectionalLight :position="[5, 5, 5]" :intensity="1.5" color="#ffffff" />
        <TresDirectionalLight :position="[-5, -3, -5]" :intensity="0.8" :color="gem.params.colorHex" />
        <TresPointLight :position="[0, 3, 2]" :intensity="2" :color="gem.params.colorHex" :distance="8" />
      </TresCanvas>
    </div>

    <div class="gem-viewer-info glass">
      <div v-if="buddha" class="q-mb-sm">
        <div class="text-subtitle1 text-primary">{{ buddha.nameZh }}</div>
        <div class="text-caption text-secondary">{{ buddha.nameEn }}</div>
        <div class="text-body2 text-secondary q-mt-xs">{{ buddha.description }}</div>
      </div>
      <div v-if="constellation" class="q-mt-sm">
        <div class="text-caption text-secondary">
          ✦ {{ constellation.nameZh }} · {{ constellation.nameEn }}
        </div>
      </div>
      <div class="text-caption text-secondary q-mt-xs">獲得於 {{ earnedDate }}</div>
      <q-btn flat round icon="close" color="white" size="sm" class="q-mt-sm" @click="$emit('close')" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { TresCanvas } from '@tresjs/core'
import { OrbitControls } from '@tresjs/cientos'
import GemMesh from './GemMesh.vue'
import type { GemRecord, BuddhaInfo, ConstellationInfo } from 'src/types/gem'
import buddhasData from 'src/data/meta/buddhas-88.json'
import constellationsData from 'src/data/meta/constellations-88.json'

const props = defineProps<{ gem: GemRecord }>()
defineEmits<{ close: [] }>()

const buddha = computed<BuddhaInfo | undefined>(() =>
  props.gem.buddhaId
    ? (buddhasData as BuddhaInfo[]).find((b) => b.id === props.gem.buddhaId)
    : undefined
)

const constellation = computed<ConstellationInfo | undefined>(() =>
  props.gem.constellationId
    ? (constellationsData as ConstellationInfo[]).find((c) => c.id === props.gem.constellationId)
    : undefined
)

const earnedDate = computed(() =>
  new Date(props.gem.earnedAt).toLocaleDateString('zh-TW', {
    year: 'numeric', month: 'long', day: 'numeric',
  })
)
</script>

<style scoped>
.gem-viewer-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.88);
  z-index: 1000;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.gem-viewer-canvas {
  width: 100%;
  height: 60vh;
}

.gem-viewer-info {
  position: absolute;
  bottom: 32px;
  left: 50%;
  transform: translateX(-50%);
  min-width: 280px;
  max-width: 90vw;
  padding: 16px 20px;
  text-align: center;
}
</style>
