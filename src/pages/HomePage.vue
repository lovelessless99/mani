<template>
  <main class="page">
    <header>
      <h1 class="page-title">今日</h1>
      <p class="page-sub">{{ todayLabel }}</p>
    </header>

    <!-- Overall progress ------------------------------------- -->
    <section class="block">
      <p class="section-label">誦讀進度</p>

      <GlassCard class="mt">
        <div v-if="progressStore.loading" class="empty">載入中</div>

        <div v-else class="rings">
          <div v-for="sutra in sutras" :key="sutra.id" class="ring-item">
            <ProgressRing
              :value="progressStore.getSutraCompletionRatio(sutra.id)"
              :size="72"
              :stroke-width="4"
              :color="ringColor(sutra.id)"
              :label="`${completedVolumes(sutra.id)}`"
            />
            <p class="ring-item__name">{{ sutra.titleZh }}</p>
            <p class="ring-item__total tnum">／{{ sutra.totalVolumes }}</p>
          </div>
        </div>
      </GlassCard>
    </section>

    <!-- Recent readings -------------------------------------- -->
    <section class="block">
      <p class="section-label">最近誦讀</p>

      <GlassCard class="mt" flush>
        <div v-if="recentVolumes.length === 0" class="empty">尚未有誦讀紀錄</div>

        <ul v-else class="recent">
          <li v-for="item in recentVolumes" :key="item.key" class="recent__row">
            <div class="recent__main">
              <p class="recent__title">
                {{ item.sutraTitle }}
                <span class="t-faint">·</span>
                第 {{ item.volumeNum }} 卷
              </p>
              <p class="recent__meta tnum">{{ item.lastRead }}</p>
            </div>
            <span class="recent__count tnum">{{ item.count }} 遍</span>
          </li>
        </ul>
      </GlassCard>
    </section>

    <AppButton variant="accent" icon="book" block class="cta" @click="router.push('/library')">
      開始誦讀
    </AppButton>
  </main>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import GlassCard from 'src/components/GlassCard.vue'
import ProgressRing from 'src/components/ProgressRing.vue'
import AppButton from 'src/components/ui/AppButton.vue'
import { useProgressStore } from 'src/stores/progressStore'
import { getAllSutras } from 'src/services/sutraService'

const router = useRouter()
const progressStore = useProgressStore()
const sutras = getAllSutras()

const RING_COLORS = [
  'var(--amethyst)',
  'var(--sapphire)',
  'var(--emerald)',
  'var(--amber)',
  'var(--aqua)',
]

function ringColor(sutraId: string): string {
  const i = sutras.findIndex((s) => s.id === sutraId)
  return RING_COLORS[i % RING_COLORS.length]
}

const todayLabel = computed(() =>
  new Date().toLocaleDateString('zh-TW', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  })
)

function completedVolumes(sutraId: string): number {
  return progressStore.progressMap[sutraId]?.totalCompleted ?? 0
}

const recentVolumes = computed(() => {
  const items: {
    key: string
    sutraTitle: string
    volumeNum: number
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
        volumeNum: parseInt(volumeId, 10),
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

<style scoped>
.block {
  margin-top: var(--s6);
}

.mt {
  margin-top: var(--s3);
}

/* — Progress rings ————————————————————————— */
.rings {
  display: flex;
  flex-wrap: wrap;
  gap: var(--s5) var(--s4);
  justify-content: flex-start;
}

.ring-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--s2);
  min-width: 72px;
}

.ring-item__name {
  font-size: var(--text-caption);
  letter-spacing: 0.04em;
  text-align: center;
  max-width: 5rem;
}

.ring-item__total {
  margin-top: -6px;
  font-size: var(--text-micro);
  color: var(--text-faint);
}

/* — Recent list ———————————————————————————— */
.recent {
  list-style: none;
}

.recent__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--s3);
  padding: var(--s3) var(--s4);
}

.recent__row + .recent__row {
  border-top: 1px solid rgba(255, 255, 255, 0.05);
}

.recent__title {
  font-size: var(--text-caption);
  letter-spacing: 0.03em;
}

.recent__meta {
  margin-top: 2px;
  font-size: var(--text-micro);
  color: var(--text-faint);
}

.recent__count {
  flex-shrink: 0;
  font-size: var(--text-micro);
  color: var(--text-dim);
  padding: 3px var(--s2);
  border-radius: var(--r-full);
  background: rgba(255, 255, 255, 0.05);
}

.cta {
  margin-top: var(--s6);
}
</style>
