<template>
  <q-page>
    <!-- Header bar -->
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

    <!-- Loading state -->
    <div v-if="loading" class="flex flex-center q-pa-xl">
      <q-spinner-dots size="50px" color="purple-4" />
    </div>

    <!-- Vertical text content -->
    <div v-else-if="volume" class="reader-container q-pa-lg">
      <div class="vertical-text-wrapper">
        <template v-for="(block, i) in volume.blocks" :key="i">
          <div :class="['text-block', `text-block--${block.type}`]">
            {{ block.text }}
          </div>
        </template>
      </div>
    </div>

    <!-- Completion dialog -->
    <q-dialog v-model="showCompleteDialog">
      <q-card class="glass text-center q-pa-lg">
        <q-icon name="auto_awesome" color="amber-4" size="48px" />
        <div class="text-h6 text-primary q-mt-sm">回向完成</div>
        <div class="text-secondary q-mt-xs">
          第 {{ volumeIdDisplay }} 卷已記錄<br />
          累計誦讀 {{ newCount }} 遍
        </div>
        <q-btn
          flat class="q-mt-md" color="purple-3" label="繼續"
          @click="showCompleteDialog = false"
        />
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { loadVolume } from 'src/services/sutraService'
import { useProgressStore } from 'src/stores/progressStore'
import type { SutraVolume } from 'src/types/sutra'

const route = useRoute()
const progressStore = useProgressStore()
const sutraId = route.params.sutraId as string
const volumeId = route.params.volumeId as string

const volume = ref<SutraVolume | null>(null)
const loading = ref(true)
const saving = ref(false)
const recitedThisSession = ref(false)
const showCompleteDialog = ref(false)
const newCount = ref(0)

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
    showCompleteDialog.value = true
  } finally {
    saving.value = false
  }
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
