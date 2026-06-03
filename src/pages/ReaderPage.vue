<template>
  <q-page>
    <q-bar class="glass" style="position: sticky; top: 0; z-index: 10">
      <q-btn flat round icon="arrow_back" color="white" @click="$router.back()" />
      <div class="text-subtitle1 text-primary q-ml-sm">{{ volume?.titleZh ?? '載入中...' }}</div>
      <q-space />
      <q-btn
        v-if="volume"
        flat round
        :icon="recitedThisSession ? 'check_circle' : 'check_circle_outline'"
        :color="recitedThisSession ? 'green-4' : 'white'"
        @click="markComplete"
        :loading="saving"
      />
    </q-bar>

    <div v-if="loading" class="flex flex-center q-pa-xl">
      <q-spinner-dots size="50px" color="purple-4" />
    </div>

    <div v-else-if="volume" class="reader-container q-pa-lg">
      <div class="vertical-text-wrapper">
        <template v-for="(block, i) in volume.blocks" :key="i">
          <div :class="['text-block', `text-block--${block.type}`]">{{ block.text }}</div>
        </template>
      </div>
    </div>

    <!-- Simple dialog for repeat recitations -->
    <q-dialog v-model="showCompleteDialog">
      <q-card class="glass text-center q-pa-lg">
        <q-icon name="auto_awesome" color="amber-4" size="48px" />
        <div class="text-h6 text-primary q-mt-sm">回向完成</div>
        <div class="text-secondary q-mt-xs">
          第 {{ volumeIdDisplay }} 卷已記錄<br />累計誦讀 {{ newCount }} 遍
        </div>
        <q-btn flat class="q-mt-md" color="purple-3" label="繼續" @click="showCompleteDialog = false" />
      </q-card>
    </q-dialog>

    <!-- Gem unlock ceremony (first completion) -->
    <UnlockCeremony
      :gem="gemStore.pendingUnlock"
      @dismiss="onCeremonyDismiss"
    />

    <!-- Milestone overlay (sutra complete / 10 / 100) -->
    <MilestoneOverlay
      :visible="showMilestone"
      :type="milestoneType"
      :sutra-title="volume?.titleZh"
      @dismiss="showMilestone = false"
    />
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { loadVolume } from 'src/services/sutraService'
import { useProgressStore } from 'src/stores/progressStore'
import { useGemStore } from 'src/stores/gemStore'
import UnlockCeremony from 'src/components/gems/UnlockCeremony.vue'
import MilestoneOverlay from 'src/components/gems/MilestoneOverlay.vue'
import type { SutraVolume } from 'src/types/sutra'
import avatamsakaMap from 'src/data/meta/avatamsaka-gem-map.json'

const route = useRoute()
const progressStore = useProgressStore()
const gemStore = useGemStore()

const sutraId = route.params.sutraId as string
const volumeId = route.params.volumeId as string

const volume = ref<SutraVolume | null>(null)
const loading = ref(true)
const saving = ref(false)
const recitedThisSession = ref(false)
const showCompleteDialog = ref(false)
const newCount = ref(0)
const showMilestone = ref(false)
const milestoneType = ref<'sutra_complete' | 'ten_complete' | 'hundred_complete'>('sutra_complete')

const volumeIdDisplay = computed(() => parseInt(volumeId).toString())

onMounted(async () => {
  try {
    volume.value = await loadVolume(sutraId, volumeId)
  } finally {
    loading.value = false
  }
})

async function markComplete() {
  if (saving.value) return
  saving.value = true
  try {
    const updated = await progressStore.markVolumeComplete(sutraId, volumeId)
    newCount.value = updated.volumes[volumeId]?.count ?? 1
    recitedThisSession.value = true

    if (newCount.value === 1) {
      // First time — earn a gem
      const gemInput: Parameters<typeof gemStore.earnGem>[0] = {
        source: 'sutra_volume',
        sourceRef: `${sutraId}/${volumeId}`,
      }
      if (sutraId === 'avatamsaka') {
        const mapEntry = (avatamsakaMap as Record<string, { buddhaId: string; constellationId: string }>)[volumeId]
        if (mapEntry) {
          gemInput.buddhaId = mapEntry.buddhaId
          gemInput.constellationId = mapEntry.constellationId
        }
      }
      await gemStore.earnGem(gemInput)
      // UnlockCeremony shows via gemStore.pendingUnlock reactivity

      // Check for sutra completion milestone
      if (updated.isFullyComplete) {
        const completedCount = Object.values(progressStore.progressMap)
          .filter((p) => p.isFullyComplete).length
        if (completedCount >= 100) {
          milestoneType.value = 'hundred_complete'
        } else if (completedCount >= 10) {
          milestoneType.value = 'ten_complete'
        } else {
          milestoneType.value = 'sutra_complete'
        }
        setTimeout(() => { showMilestone.value = true }, 2000)
      }
    } else {
      showCompleteDialog.value = true
    }
  } finally {
    saving.value = false
  }
}

function onCeremonyDismiss() {
  gemStore.clearPendingUnlock()
}
</script>

<style scoped>
.reader-container {
  min-height: calc(100vh - 50px);
  overflow-x: auto;
}

.vertical-text-wrapper {
  writing-mode: vertical-rl;
  text-orientation: mixed;
  height: calc(100vh - 120px);
  display: flex;
  flex-direction: row-reverse;
  gap: 1.5rem;
  font-size: 18px;
  line-height: 2;
  color: var(--text-primary);
  font-family: 'Noto Serif TC', 'Noto Serif CJK TC', serif;
}

.text-block--heading {
  font-weight: bold;
  font-size: 20px;
  color: var(--gem-amber);
}

.text-block--verse {
  color: var(--gem-amethyst);
}
</style>
