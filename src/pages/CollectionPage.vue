<template>
  <q-page class="q-pa-md">
    <div class="text-h5 text-primary q-mb-xs">收藏室</div>
    <div class="text-caption text-secondary q-mb-md">
      已解鎖 {{ gemStore.gemsList.length }} / {{ totalSlots }} 顆寶石
    </div>

    <q-tabs
      v-model="activeTab"
      dense
      active-color="white"
      indicator-color="purple-4"
      class="q-mb-md"
      style="color: var(--text-secondary)"
    >
      <q-tab name="all" label="全部" />
      <q-tab name="avatamsaka" label="華嚴經" />
      <q-tab name="other" label="其他" />
    </q-tabs>

    <div v-if="gemStore.loading" class="flex flex-center q-pa-xl">
      <q-spinner-dots size="40px" color="purple-4" />
    </div>

    <div v-else class="gem-grid">
      <GemCard
        v-for="slot in displayedSlots"
        :key="slot.key"
        :gem="slot.gem"
        :volume-num="slot.volumeNum"
        :locked="!slot.gem"
        @click="openViewer"
      />
    </div>

    <GemViewer
      v-if="selectedGem"
      :gem="selectedGem"
      @close="selectedGem = null"
    />
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import GemCard from 'src/components/gems/GemCard.vue'
import GemViewer from 'src/components/gems/GemViewer.vue'
import { useGemStore } from 'src/stores/gemStore'
import type { GemRecord } from 'src/types/gem'

const gemStore = useGemStore()
const activeTab = ref('all')
const selectedGem = ref<GemRecord | null>(null)
const totalSlots = 88

interface GemSlot {
  key: string
  gem?: GemRecord
  volumeNum?: string
}

const displayedSlots = computed<GemSlot[]>(() => {
  const avatamsakaSlots: GemSlot[] = Array.from({ length: 80 }, (_, i) => {
    const volumeId = String(i + 1).padStart(3, '0')
    const gem = gemStore.gemsList.find((g) => g.sourceRef === `avatamsaka/${volumeId}`)
    return { key: `avatamsaka-${volumeId}`, gem, volumeNum: String(i + 1) }
  })

  const otherGems: GemSlot[] = gemStore.gemsList
    .filter((g) => !g.sourceRef.startsWith('avatamsaka/'))
    .map((g) => ({ key: g.id, gem: g }))

  if (activeTab.value === 'avatamsaka') return avatamsakaSlots
  if (activeTab.value === 'other') {
    const emptySlots = Array.from(
      { length: Math.max(0, 8 - otherGems.length) },
      (_, i) => ({ key: `empty-${i}` })
    )
    return [...otherGems, ...emptySlots]
  }
  return [...avatamsakaSlots, ...otherGems]
})

function openViewer(gem: GemRecord) {
  selectedGem.value = gem
}

onMounted(() => gemStore.loadGems())
</script>

<style scoped>
.gem-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: center;
}
</style>
