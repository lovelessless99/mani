<template>
  <q-page class="q-pa-md">
    <div class="text-h5 text-primary q-mb-lg">經文庫</div>

    <div class="q-gutter-md">
      <GlassCard
        v-for="sutra in sutras"
        :key="sutra.id"
        hoverable
        class="cursor-pointer"
        @click="openSutra(sutra.id)"
      >
        <div class="row items-center no-wrap">
          <div class="col">
            <div class="text-subtitle1 text-primary">{{ sutra.titleZh }}</div>
            <div class="text-caption text-secondary q-mt-xs">{{ sutra.description }}</div>
            <div class="text-caption text-secondary q-mt-xs">
              共 {{ sutra.totalVolumes }} 卷 ·
              已完成 {{ completedVolumes(sutra.id) }} / {{ sutra.totalVolumes }}
            </div>
          </div>
          <ProgressRing
            :value="progressStore.getSutraCompletionRatio(sutra.id)"
            :size="56"
            :stroke-width="5"
            :label="`${completedVolumes(sutra.id)}`"
            class="q-ml-md"
          />
        </div>
      </GlassCard>
    </div>

    <!-- Volume selector dialog -->
    <q-dialog v-model="showVolumeDialog">
      <q-card class="glass" style="min-width: 300px; max-width: 90vw">
        <q-card-section>
          <div class="text-h6 text-primary">選擇卷數</div>
          <div class="text-caption text-secondary">{{ selectedSutraMeta?.titleZh }}</div>
        </q-card-section>
        <q-card-section class="q-pt-none" style="max-height: 50vh; overflow-y: auto">
          <q-list>
            <q-item
              v-for="vol in volumeList"
              :key="vol.id"
              clickable
              @click="goToReader(vol.id)"
              class="rounded-borders q-mb-xs"
            >
              <q-item-section>
                <q-item-label class="text-primary">第 {{ vol.num }} 卷</q-item-label>
              </q-item-section>
              <q-item-section side>
                <q-badge
                  v-if="progressStore.getVolumeCount(selectedSutraId, vol.id) > 0"
                  :label="`×${progressStore.getVolumeCount(selectedSutraId, vol.id)}`"
                  color="purple"
                />
              </q-item-section>
            </q-item>
          </q-list>
        </q-card-section>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import GlassCard from 'src/components/GlassCard.vue'
import ProgressRing from 'src/components/ProgressRing.vue'
import { useProgressStore } from 'src/stores/progressStore'
import { getAllSutras, getSutraMeta, formatVolumeId } from 'src/services/sutraService'

const router = useRouter()
const progressStore = useProgressStore()
const sutras = getAllSutras()
const showVolumeDialog = ref(false)
const selectedSutraId = ref('')

const selectedSutraMeta = computed(() => getSutraMeta(selectedSutraId.value))

const volumeList = computed(() => {
  const meta = selectedSutraMeta.value
  if (!meta) return []
  return Array.from({ length: meta.totalVolumes }, (_, i) => ({
    num: i + 1,
    id: formatVolumeId(i + 1),
  }))
})

function completedVolumes(sutraId: string): number {
  return progressStore.progressMap[sutraId]?.totalCompleted ?? 0
}

function openSutra(sutraId: string) {
  selectedSutraId.value = sutraId
  showVolumeDialog.value = true
}

function goToReader(volumeId: string) {
  showVolumeDialog.value = false
  router.push(`/reader/${selectedSutraId.value}/${volumeId}`)
}

onMounted(() => progressStore.loadAllProgress())
</script>
