<template>
  <main class="page">
    <header>
      <h1 class="page-title">經文庫</h1>
      <p class="page-sub">直排誦讀 · 自動記住讀到哪裡</p>
    </header>

    <!-- Resume where the book was last left -->
    <button v-if="reading.last" class="resume" type="button" @click="resume">
      <div class="resume__main">
        <p class="resume__eyebrow">繼續上次</p>
        <p class="resume__title">{{ reading.last.sutraTitle }} · {{ reading.last.volumeLabel }}</p>
        <div class="resume__bar"><div class="resume__fill" :style="{ width: `${reading.last.progress * 100}%` }" /></div>
      </div>
      <AppIcon name="chevronRight" :size="18" class="resume__go" />
    </button>

    <ul class="sutra-list">
      <li v-for="(sutra, i) in sutras" :key="sutra.id">
        <GlassCard clickable @click="openSutra(sutra.id)">
          <div class="sutra">
            <div class="sutra__main">
              <h2 class="sutra__title">{{ sutra.titleZh }}</h2>
              <p class="sutra__desc">{{ sutra.description }}</p>
              <p class="sutra__meta tnum">
                {{ completedVolumes(sutra.id) }} / {{ sutra.totalVolumes }} 卷
              </p>
            </div>

            <ProgressRing
              :value="progressStore.getSutraCompletionRatio(sutra.id)"
              :size="54"
              :stroke-width="4"
              :color="ringColor(i)"
              :label="''"
            />
          </div>
        </GlassCard>
      </li>
    </ul>

    <!-- Volume picker ---------------------------------------- -->
    <AppSheet
      v-model="showVolumeSheet"
      :title="selectedSutraMeta?.titleZh"
      :subtitle="`共 ${selectedSutraMeta?.totalVolumes ?? 0} 卷 · 點選開始誦讀`"
    >
      <div class="vol-grid">
        <button
          v-for="vol in volumeList"
          :key="vol.id"
          class="vol tnum"
          :class="{ 'vol--read': vol.count > 0 }"
          type="button"
          @click="goToReader(vol.id)"
        >
          {{ vol.num }}
          <span v-if="vol.count > 1" class="vol__badge tnum">{{ vol.count }}</span>
        </button>
      </div>
    </AppSheet>
  </main>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import GlassCard from 'src/components/GlassCard.vue'
import ProgressRing from 'src/components/ProgressRing.vue'
import AppSheet from 'src/components/ui/AppSheet.vue'
import AppIcon from 'src/components/ui/AppIcon.vue'
import { useProgressStore } from 'src/stores/progressStore'
import { useReadingStore } from 'src/stores/readingStore'
import { getAllSutras, getSutraMeta, formatVolumeId } from 'src/services/sutraService'

const router = useRouter()
const progressStore = useProgressStore()
const reading = useReadingStore()
const sutras = getAllSutras()

function resume() {
  const m = reading.last
  if (m) router.push(`/reader/${m.sutraId}/${m.volumeId}`)
}

const showVolumeSheet = ref(false)
const selectedSutraId = ref('')

const RING_COLORS = [
  'var(--amethyst)',
  'var(--sapphire)',
  'var(--emerald)',
  'var(--amber)',
  'var(--aqua)',
]
const ringColor = (i: number) => RING_COLORS[i % RING_COLORS.length]

const selectedSutraMeta = computed(() => getSutraMeta(selectedSutraId.value))

const volumeList = computed(() => {
  const meta = selectedSutraMeta.value
  if (!meta) return []
  return Array.from({ length: meta.totalVolumes }, (_, i) => {
    const id = formatVolumeId(i + 1)
    return {
      num: i + 1,
      id,
      count: progressStore.getVolumeCount(selectedSutraId.value, id),
    }
  })
})

function completedVolumes(sutraId: string): number {
  return progressStore.progressMap[sutraId]?.totalCompleted ?? 0
}

function openSutra(sutraId: string) {
  selectedSutraId.value = sutraId
  showVolumeSheet.value = true
}

function goToReader(volumeId: string) {
  showVolumeSheet.value = false
  router.push(`/reader/${selectedSutraId.value}/${volumeId}`)
}

onMounted(() => {
  progressStore.loadAllProgress()
  reading.load()
})
</script>

<style scoped>
.resume {
  width: 100%;
  margin-top: var(--s5);
  display: flex;
  align-items: center;
  gap: var(--s3);
  padding: var(--s4);
  border-radius: var(--r-lg);
  text-align: left;
  background:
    radial-gradient(circle at 90% 0%, rgba(96, 165, 250, 0.16), transparent 55%),
    rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(96, 165, 250, 0.3);
  transition: transform var(--fast) var(--ease);
}
.resume:active {
  transform: scale(0.99);
}
.resume__main {
  flex: 1;
  min-width: 0;
}
.resume__eyebrow {
  font-size: var(--text-micro);
  letter-spacing: 0.2em;
  text-indent: 0.2em;
  color: var(--sapphire);
}
.resume__title {
  margin-top: 3px;
  font-family: var(--font-serif);
  font-size: var(--text-body);
  letter-spacing: 0.06em;
}
.resume__bar {
  margin-top: var(--s3);
  height: 3px;
  border-radius: var(--r-full);
  background: rgba(255, 255, 255, 0.08);
  overflow: hidden;
}
.resume__fill {
  height: 100%;
  border-radius: var(--r-full);
  background: var(--sapphire);
}
.resume__go {
  flex-shrink: 0;
  color: var(--text-faint);
}

.sutra-list {
  list-style: none;
  margin-top: var(--s5);
}

.sutra-list > li + li {
  margin-top: var(--s3);
}

.sutra {
  display: flex;
  align-items: center;
  gap: var(--s4);
}

.sutra__main {
  flex: 1;
  min-width: 0;
}

.sutra__title {
  font-size: var(--text-title);
  font-weight: 300;
  letter-spacing: 0.08em;
}

.sutra__desc {
  margin-top: var(--s1);
  font-size: var(--text-caption);
  color: var(--text-dim);
  line-height: 1.5;
}

.sutra__meta {
  margin-top: var(--s2);
  font-size: var(--text-micro);
  color: var(--text-faint);
  letter-spacing: 0.08em;
}

/* — Volume grid ————————————————————————————
   A grid of numbers scans far faster than a scrolling list when a
   sutra runs to 80 volumes, and read volumes stay visible at a glance. */
.vol-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(3rem, 1fr));
  gap: var(--s2);
  padding-bottom: var(--s2);
}

.vol {
  position: relative;
  aspect-ratio: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--r-sm);
  border: 1px solid var(--hairline);
  background: rgba(255, 255, 255, 0.03);
  color: var(--text-dim);
  font-size: var(--text-caption);
  transition:
    background var(--fast) var(--ease),
    color var(--fast) var(--ease),
    transform var(--fast) var(--ease);
}

.vol:hover {
  background: var(--glass-2);
  color: var(--text);
}

.vol:active {
  transform: scale(0.93);
}

.vol:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

/* Read volumes carry the accent glow — the wall of numbers slowly
   lights up as the sutra is completed. */
.vol--read {
  color: var(--text);
  background: rgba(167, 139, 250, 0.14);
  border-color: rgba(167, 139, 250, 0.4);
  box-shadow: inset 0 0 12px rgba(167, 139, 250, 0.15);
}

.vol__badge {
  position: absolute;
  top: -4px;
  right: -4px;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--r-full);
  background: var(--amethyst);
  color: #14101f;
  font-size: 10px;
  font-weight: 500;
}
</style>
