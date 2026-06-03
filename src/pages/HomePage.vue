<template>
  <q-page class="q-pa-md">
    <div class="text-h5 text-primary q-mb-xs">今日</div>
    <div class="text-caption text-secondary q-mb-lg">{{ todayLabel }}</div>

    <!-- Overall progress -->
    <GlassCard class="q-mb-md">
      <div class="text-subtitle2 text-secondary q-mb-sm">誦讀進度</div>
      <div v-if="progressStore.loading" class="text-secondary text-caption">載入中...</div>
      <div v-else class="row q-gutter-md">
        <div v-for="sutra in sutras" :key="sutra.id" class="column items-center">
          <ProgressRing
            :value="progressStore.getSutraCompletionRatio(sutra.id)"
            :size="64"
            :stroke-width="5"
            color="var(--gem-amethyst)"
          />
          <div
            class="text-caption text-secondary q-mt-xs"
            style="max-width: 64px; text-align: center; word-break: keep-all"
          >
            {{ sutra.titleZh }}
          </div>
        </div>
      </div>
    </GlassCard>

    <!-- Recent readings -->
    <GlassCard class="q-mb-md">
      <div class="text-subtitle2 text-secondary q-mb-sm">最近誦讀</div>
      <div v-if="recentVolumes.length === 0" class="text-secondary text-caption">
        尚未有誦讀紀錄
      </div>
      <q-list v-else dense>
        <q-item v-for="item in recentVolumes" :key="item.key" class="q-px-none">
          <q-item-section>
            <q-item-label class="text-primary text-caption">
              {{ item.sutraTitle }} · 第 {{ parseInt(item.volumeId) }} 卷
            </q-item-label>
            <q-item-label caption class="text-secondary">
              {{ item.lastRead }} · 共 {{ item.count }} 遍
            </q-item-label>
          </q-item-section>
        </q-item>
      </q-list>
    </GlassCard>

    <!-- Quick action -->
    <q-btn
      class="full-width glass"
      flat
      icon="menu_book"
      label="開始誦讀"
      color="white"
      @click="$router.push('/library')"
    />
  </q-page>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import GlassCard from 'src/components/GlassCard.vue'
import ProgressRing from 'src/components/ProgressRing.vue'
import { useProgressStore } from 'src/stores/progressStore'
import { getAllSutras } from 'src/services/sutraService'

const progressStore = useProgressStore()
const sutras = getAllSutras()

const todayLabel = computed(() =>
  new Date().toLocaleDateString('zh-TW', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'long',
  })
)

const recentVolumes = computed(() => {
  const items: {
    key: string
    sutraTitle: string
    volumeId: string
    count: number
    lastRead: string
  }[] = []

  for (const sutra of sutras) {
    const progress = progressStore.progressMap[sutra.id]
    if (!progress) continue
    for (const [volumeId, vp] of Object.entries(progress.volumes)) {
      items.push({
        key: `${sutra.id}-${volumeId}`,
        sutraTitle: sutra.titleZh,
        volumeId,
        count: vp.count,
        lastRead: vp.lastRead,
      })
    }
  }

  return items
    .sort((a, b) => b.lastRead.localeCompare(a.lastRead))
    .slice(0, 5)
    .map((item) => ({
      ...item,
      lastRead: new Date(item.lastRead).toLocaleDateString('zh-TW'),
    }))
})

onMounted(() => progressStore.loadAllProgress())
</script>
