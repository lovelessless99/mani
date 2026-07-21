<template>
  <div class="viewer" @click.self="$emit('close')">
    <AppButton
      icon="close"
      icon-only
      variant="ghost"
      class="viewer__close"
      aria-label="關閉"
      @click="$emit('close')"
    />

    <div class="viewer__canvas">
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
        <TresDirectionalLight
          :position="[-5, -3, -5]"
          :intensity="0.8"
          :color="gem.params.colorHex"
        />
        <TresPointLight
          :position="[0, 3, 2]"
          :intensity="2"
          :color="gem.params.colorHex"
          :distance="8"
        />
      </TresCanvas>
    </div>

    <aside class="panel glass">
      <template v-if="buddha">
        <h2 class="panel__name">{{ buddha.nameZh }}</h2>
        <p class="panel__name-en">{{ buddha.nameEn }}</p>
        <p class="panel__desc">{{ buddha.description }}</p>
      </template>

      <p v-if="constellation" class="panel__star">
        ✦ {{ constellation.nameZh }}
        <span class="t-faint">· {{ constellation.nameEn }}</span>
      </p>

      <p class="panel__date">獲得於 {{ earnedDate }}</p>
    </aside>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { TresCanvas } from '@tresjs/core'
import { OrbitControls } from '@tresjs/cientos'
import GemMesh from './GemMesh.vue'
import AppButton from 'src/components/ui/AppButton.vue'
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
    ? (constellationsData as ConstellationInfo[]).find(
        (c) => c.id === props.gem.constellationId
      )
    : undefined
)

const earnedDate = computed(() =>
  new Date(props.gem.earnedAt).toLocaleDateString('zh-TW', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
)
</script>

<style scoped>
.viewer {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(4, 4, 8, 0.9);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  animation: viewer-in var(--base) var(--ease);
}

@keyframes viewer-in {
  from {
    opacity: 0;
  }
}

.viewer__close {
  position: absolute;
  top: calc(var(--safe-t) + var(--s3));
  right: var(--s3);
  z-index: 2;
}

.viewer__canvas {
  width: 100%;
  height: 58vh;
}

/* — Info panel ————————————————————————————— */
.panel {
  position: absolute;
  left: 50%;
  bottom: calc(var(--safe-b) + var(--s5));
  transform: translateX(-50%);
  width: min(22rem, 90vw);
  padding: var(--s4) var(--s5);
  text-align: center;
  background: rgba(18, 18, 26, 0.7);
  backdrop-filter: blur(var(--blur-heavy)) saturate(180%);
  -webkit-backdrop-filter: blur(var(--blur-heavy)) saturate(180%);
}

.panel__name {
  font-size: var(--text-title);
  font-weight: 300;
  letter-spacing: 0.12em;
}

.panel__name-en {
  margin-top: 2px;
  font-size: var(--text-micro);
  letter-spacing: 0.08em;
  color: var(--text-faint);
}

.panel__desc {
  margin-top: var(--s3);
  font-size: var(--text-caption);
  line-height: 1.8;
  color: var(--text-dim);
}

.panel__star {
  margin-top: var(--s3);
  padding-top: var(--s3);
  border-top: 1px solid var(--hairline);
  font-size: var(--text-caption);
  letter-spacing: 0.06em;
  color: var(--amber);
}

.panel__date {
  margin-top: var(--s2);
  font-size: var(--text-micro);
  letter-spacing: 0.08em;
  color: var(--text-faint);
}
</style>
