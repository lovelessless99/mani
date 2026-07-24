<template>
  <main class="reader">
    <!-- Floating chrome — stays out of the text's way -------- -->
    <header class="bar">
      <AppButton
        icon="back"
        icon-only
        variant="ghost"
        aria-label="返回"
        @click="router.back()"
      />

      <h1 class="bar__title">{{ volume?.titleZh ?? '載入中' }}</h1>

      <AppButton
        v-if="volume"
        :icon="recitedThisSession ? 'checkCircle' : 'circle'"
        icon-only
        :variant="recitedThisSession ? 'accent' : 'ghost'"
        :loading="saving"
        aria-label="標記完成"
        :class="{ 'bar__done': recitedThisSession }"
        @click="markComplete"
      />
      <span v-else class="bar__spacer" />
    </header>

    <!-- Sutra text ------------------------------------------- -->
    <div v-if="loading" class="reader__loading">
      <AppSpinner :size="34" />
    </div>

    <div v-else-if="volume" ref="scrollEl" class="scroll" @scroll="onScroll">
      <article class="vtext">
        <p
          v-for="(block, i) in volume.blocks"
          :key="i"
          :class="['vtext__block', `vtext__block--${block.type}`]"
        >
          {{ block.text }}
        </p>
      </article>
    </div>

    <div v-else class="reader__loading">
      <p class="empty">無法載入此卷</p>
    </div>

    <!-- Repeat-recitation confirmation ------------------------ -->
    <AppSheet v-model="showCompleteDialog">
      <div class="done">
        <AppIcon name="sparkle" :size="40" class="done__icon" />
        <h2 class="done__title">回向完成</h2>
        <p class="done__body">
          第 {{ volumeIdDisplay }} 卷已記錄<br />
          累計誦讀 <span class="tnum">{{ newCount }}</span> 遍
        </p>
        <AppButton variant="glass" block @click="showCompleteDialog = false">
          繼續
        </AppButton>
      </div>
    </AppSheet>

    <!-- Gem unlock ceremony (first completion) ---------------- -->
    <UnlockCeremony :gem="gemStore.pendingUnlock" @dismiss="onCeremonyDismiss" />

    <!-- Milestone (圓滿一部 / 十部 / 百部) -------------------- -->
    <MilestoneOverlay
      :visible="showMilestone"
      :type="milestoneType"
      :sutra-title="volume?.titleZh"
      @dismiss="showMilestone = false"
    />
  </main>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppButton from 'src/components/ui/AppButton.vue'
import AppIcon from 'src/components/ui/AppIcon.vue'
import AppSpinner from 'src/components/ui/AppSpinner.vue'
import AppSheet from 'src/components/ui/AppSheet.vue'
import UnlockCeremony from 'src/components/gems/UnlockCeremony.vue'
import MilestoneOverlay from 'src/components/gems/MilestoneOverlay.vue'
import { loadVolume } from 'src/services/sutraService'
import { useProgressStore } from 'src/stores/progressStore'
import { useGemStore } from 'src/stores/gemStore'
import { useReadingStore } from 'src/stores/readingStore'
import type { SutraVolume } from 'src/types/sutra'
import avatamsakaMap from 'src/data/meta/avatamsaka-gem-map.json'

const route = useRoute()
const router = useRouter()
const progressStore = useProgressStore()
const gemStore = useGemStore()
const reading = useReadingStore()

const sutraId = route.params.sutraId as string
const volumeId = route.params.volumeId as string

const volume = ref<SutraVolume | null>(null)
const loading = ref(true)
const scrollEl = ref<HTMLElement | null>(null)
const saving = ref(false)
const recitedThisSession = ref(false)
const showCompleteDialog = ref(false)
const newCount = ref(0)
const showMilestone = ref(false)
const milestoneType = ref<'sutra_complete' | 'ten_complete' | 'hundred_complete'>(
  'sutra_complete'
)

const volumeIdDisplay = computed(() => parseInt(volumeId, 10).toString())

// Reading position, kept as a 0–1 ratio down the vertical-rl columns —
// close enough to "which line". scrollLeft runs negative as the text flows
// leftward, so its magnitude over the scrollable width is the progress.
function currentProgress(): number {
  const el = scrollEl.value
  if (!el) return 0
  const max = el.scrollWidth - el.clientWidth
  return max > 0 ? Math.min(1, Math.abs(el.scrollLeft) / max) : 0
}

let saveTimer: ReturnType<typeof setTimeout> | null = null
function onScroll() {
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(saveMark, 500)
}

function markInput(progress: number) {
  return {
    sutraId,
    sutraTitle: volume.value?.titleZh ?? '',
    volumeId,
    volumeLabel: `第 ${parseInt(volumeId, 10) || volumeId} 卷`,
    progress,
  }
}
async function saveMark() {
  if (!volume.value) return
  await reading.mark(markInput(currentProgress()))
}

onMounted(async () => {
  try {
    await reading.load()
    volume.value = await loadVolume(sutraId, volumeId)
    await nextTick()
    // Resume where this same volume was left, if we have a mark for it.
    const m = reading.last
    if (m && m.sutraId === sutraId && m.volumeId === volumeId && scrollEl.value) {
      const el = scrollEl.value
      const max = el.scrollWidth - el.clientWidth
      el.scrollLeft = -(m.progress * max) // negative: leftward in vertical-rl
    }
    await saveMark()
  } finally {
    loading.value = false
  }
})

onBeforeUnmount(() => {
  if (saveTimer) clearTimeout(saveTimer)
  void saveMark()
})

async function markComplete() {
  if (saving.value) return
  saving.value = true
  try {
    // Same slot 功課 records under, so a reading counts as a recitation there
    // too and nothing is double-counted.
    const slot = `${volumeId}-recite`
    const updated = await progressStore.markVolumeComplete(sutraId, slot)
    newCount.value = updated.volumes[slot]?.count ?? 1
    recitedThisSession.value = true
    // Bookmark this as the place merit was dedicated.
    await reading.markDedicated(markInput(currentProgress()))

    if (newCount.value === 1) {
      // First time — earn a gem
      const gemInput: Parameters<typeof gemStore.earnGem>[0] = {
        source: 'sutra_volume',
        sourceRef: `${sutraId}/${volumeId}`,
      }
      if (sutraId === 'avatamsaka') {
        const mapEntry = (
          avatamsakaMap as Record<string, { buddhaId: string; constellationId: string }>
        )[volumeId]
        if (mapEntry) {
          gemInput.buddhaId = mapEntry.buddhaId
          gemInput.constellationId = mapEntry.constellationId
        }
      }
      await gemStore.earnGem(gemInput)
      // UnlockCeremony shows via gemStore.pendingUnlock reactivity

      if (updated.isFullyComplete) {
        const completedCount = Object.values(progressStore.progressMap).filter(
          (p) => p.isFullyComplete
        ).length
        if (completedCount >= 100) {
          milestoneType.value = 'hundred_complete'
        } else if (completedCount >= 10) {
          milestoneType.value = 'ten_complete'
        } else {
          milestoneType.value = 'sutra_complete'
        }
        setTimeout(() => {
          showMilestone.value = true
        }, 2000)
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
/* Printed-sutra look, after the 印經坊 reference: cream paper, dark ink,
   楷書 (LXGW WenKai) set vertically right-to-left. */
.reader {
  --paper: #f5f3da;
  --ink: #14110c;
  --cinnabar: #7a2a1e;
  height: 100vh;
  height: 100dvh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--paper);
}

/* — Top bar ———————————————————————————————— */
.bar {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: var(--s2);
  padding: calc(var(--safe-t) + var(--s2)) var(--s3) var(--s2);
  color: var(--ink);
  background: rgba(245, 243, 218, 0.9);
  backdrop-filter: blur(var(--blur)) saturate(160%);
  -webkit-backdrop-filter: blur(var(--blur)) saturate(160%);
  border-bottom: 1px solid rgba(20, 17, 12, 0.12);
}

.bar__title {
  flex: 1;
  min-width: 0;
  font-family: 'LXGW WenKai TC', var(--font-serif);
  font-size: var(--text-body);
  font-weight: 400;
  letter-spacing: 0.12em;
  text-align: center;
  color: var(--ink);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.bar__spacer {
  width: 40px;
}

.bar__done {
  color: var(--emerald);
}

/* — Text ——————————————————————————————————— */
.reader__loading {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.scroll {
  flex: 1;
  overflow-x: auto;
  overflow-y: hidden;
  overscroll-behavior-x: contain;
  -webkit-overflow-scrolling: touch;
}

/* Vertical right-to-left, the traditional setting for sutra text.
   The wrapper scrolls horizontally; columns flow leftward as you read.
   line-height sets the column pitch; letter-spacing the space between
   characters down a column. */
.vtext {
  writing-mode: vertical-rl;
  text-orientation: upright;
  height: 100%;
  display: flex;
  flex-direction: row-reverse;
  gap: var(--s5);
  padding: var(--s6) var(--s6);
  font-family: 'LXGW WenKai TC', var(--font-serif);
  font-size: 1.4rem;
  font-weight: 400;
  line-height: 1.9;
  letter-spacing: 0.12em;
  color: var(--ink);
}

.vtext__block {
  max-height: 100%;
}

.vtext__block--heading {
  font-size: 1.55rem;
  font-weight: 700;
  letter-spacing: 0.22em;
  color: var(--cinnabar);
}

.vtext__block--verse {
  color: #3a2f1e;
}

/* — Completion sheet ——————————————————————— */
.done {
  padding: var(--s2) 0 var(--s2);
  text-align: center;
}

.done__icon {
  margin: 0 auto var(--s3);
  color: var(--amber);
  filter: drop-shadow(0 0 12px rgba(251, 191, 36, 0.5));
}

.done__title {
  font-size: var(--text-title);
  font-weight: 300;
  letter-spacing: 0.16em;
}

.done__body {
  margin: var(--s2) 0 var(--s5);
  font-size: var(--text-caption);
  color: var(--text-dim);
  line-height: 1.9;
}
</style>
