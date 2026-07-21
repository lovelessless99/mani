<template>
  <main class="page">
    <header>
      <h1 class="page-title">收藏室</h1>
      <p class="page-sub">
        已解鎖 <span class="count tnum">{{ gemStore.gemsList.length }}</span>
        <span class="t-faint"> / {{ totalSlots }}</span> 顆寶石
      </p>
    </header>

    <div class="bar">
      <SegTabs v-model="activeTab" :options="tabs" />
    </div>

    <div v-if="gemStore.loading" class="loading">
      <AppSpinner :size="34" />
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

    <GemViewer v-if="selectedGem" :gem="selectedGem" @close="selectedGem = null" />
  </main>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import GemCard from 'src/components/gems/GemCard.vue'
import GemViewer from 'src/components/gems/GemViewer.vue'
import SegTabs from 'src/components/ui/SegTabs.vue'
import AppSpinner from 'src/components/ui/AppSpinner.vue'
import { useGemStore } from 'src/stores/gemStore'
import type { GemRecord } from 'src/types/gem'

const gemStore = useGemStore()
const activeTab = ref('all')
const selectedGem = ref<GemRecord | null>(null)
const totalSlots = 88

const tabs = [
  { value: 'all', label: '全部' },
  { value: 'avatamsaka', label: '華嚴經' },
  { value: 'other', label: '其他' },
]

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
    const emptySlots = Array.from({ length: Math.max(0, 8 - otherGems.length) }, (_, i) => ({
      key: `empty-${i}`,
    }))
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
.count {
  color: var(--text);
  font-size: var(--text-body);
}

.bar {
  margin-top: var(--s5);
}

.loading {
  display: flex;
  justify-content: center;
  padding: var(--s7) 0;
}

.gem-grid {
  margin-top: var(--s5);
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(4.5rem, 1fr));
  gap: var(--s3);
}
</style>
