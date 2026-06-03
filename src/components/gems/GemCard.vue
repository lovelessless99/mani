<template>
  <div
    class="gem-card glass"
    :class="{ 'gem-card--locked': !gem, 'gem-card--unlocked': !!gem }"
    @click="gem && $emit('click', gem)"
  >
    <div v-if="gem" class="gem-card__preview">
      <TresCanvas :alpha="true" :antialias="true" style="width:100%;height:100%">
        <TresPerspectiveCamera :position="[0, 0, 3]" :fov="50" />
        <GemMesh :params="gem.params" :scale="1" :auto-rotate="true" />
        <TresAmbientLight :intensity="0.5" />
        <TresDirectionalLight :position="[3, 3, 3]" :intensity="1.2" />
        <TresPointLight :position="[0, 2, 2]" :intensity="2" :color="gem.params.colorHex" :distance="6" />
      </TresCanvas>
    </div>

    <div v-else class="gem-card__locked-icon">
      <q-icon name="diamond" size="24px" color="grey-7" />
    </div>

    <div class="gem-card__label">
      <template v-if="gem && buddhaName">{{ buddhaName }}</template>
      <template v-else-if="volumeNum">{{ volumeNum }}卷</template>
      <template v-else>未解鎖</template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { TresCanvas } from '@tresjs/core'
import GemMesh from './GemMesh.vue'
import type { GemRecord, BuddhaInfo } from 'src/types/gem'
import buddhasData from 'src/data/meta/buddhas-88.json'

const props = defineProps<{
  gem?: GemRecord
  volumeNum?: string
  locked?: boolean
}>()

defineEmits<{ click: [gem: GemRecord] }>()

const buddhaName = computed<string | undefined>(() => {
  if (!props.gem?.buddhaId) return undefined
  return (buddhasData as BuddhaInfo[]).find((b) => b.id === props.gem!.buddhaId)?.nameZh
})
</script>

<style scoped>
.gem-card {
  width: 88px;
  height: 110px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  padding: 8px 4px;
  cursor: pointer;
  transition: transform 0.2s ease;
  border-radius: 12px;
}

.gem-card--unlocked:hover {
  transform: scale(1.05);
}

.gem-card--locked {
  opacity: 0.4;
  cursor: default;
  filter: grayscale(80%);
}

.gem-card__preview {
  width: 70px;
  height: 70px;
}

.gem-card__locked-icon {
  width: 70px;
  height: 70px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.gem-card__label {
  color: var(--text-secondary);
  text-align: center;
  font-size: 10px;
  line-height: 1.2;
  max-width: 80px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
