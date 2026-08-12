<template>
  <main class="page">
    <header>
      <h1 class="page-title">收藏</h1>
      <p class="page-sub">
        已解鎖 <span class="count tnum">{{ earned.length }}</span>
        <span class="t-faint"> / {{ grandTotal }} 顆寶石 · 每部經各自成套</span>
      </p>
    </header>

    <div v-if="gemStore.loading" class="loading">
      <AppSpinner :size="34" />
    </div>

    <template v-else>
      <!-- Enter the 3D land the gems build -->
      <button class="enter-land" type="button" @click="router.push('/pureland')">
        <div class="enter-land__glow" />
        <div class="enter-land__main">
          <p class="enter-land__title">{{ landName || '我的淨土' }}</p>
          <p class="enter-land__sub tnum">{{ earned.length }} 顆寶石聚成 · 進入巡禮</p>
        </div>
        <AppIcon name="chevronRight" :size="18" class="enter-land__go" />
      </button>

      <!-- Search + pick a single sutra to view -->
      <div class="finder">
        <AppIcon name="book" :size="16" class="finder__icon" />
        <input v-model="search" class="finder__input" type="search" placeholder="搜尋經典…" />
      </div>
      <ul class="tabs">
        <li v-for="t in filteredSets" :key="t.id">
          <button
            class="tab"
            :class="{ 'tab--on': t.id === activeId }"
            type="button"
            @click="activeId = t.id"
          >
            {{ t.title }}
            <span class="tab__n tnum">{{ t.earned }}/{{ t.total }}</span>
          </button>
        </li>
      </ul>

      <section v-if="activeSet" class="set">
        <div class="set__head">
          <h2 class="set__title">{{ activeSet.title }}</h2>
          <span class="set__count tnum">{{ activeSet.earned }} / {{ activeSet.total }}</span>
        </div>

        <!-- Once the set is full its figure has awakened and keeps your 部 count. -->
        <div v-if="activeSet.full && activeSet.rounds > 0" class="keeper">
          <span class="keeper__name">{{ guardianName(activeSet.id) }} · 護持此經</span>
          <span class="keeper__n tnum">已圓滿 {{ activeSet.rounds }} 部</span>
        </div>

        <!-- Collected the whole set? The next 輪 gives it somewhere to go. -->
        <div v-if="activeSet.full" class="round">
          <div class="round__top">
            <span class="round__label">✦ 全套圓滿 · 第 {{ activeSet.rounds }} 輪</span>
            <span class="round__next tnum">邁向第 {{ activeSet.rounds + 1 }} 輪 · {{ activeSet.inRound }}/{{ activeSet.total }} 品</span>
          </div>
          <div class="round__bar"><div class="round__fill" :style="{ width: `${activeSet.nextRatio * 100}%` }" /></div>
          <p class="round__hint">再誦一輪,護法多持一朵蓮 · 每輪都是新的目標</p>
        </div>

        <AppButton
          v-if="activeSet.full"
          variant="glass"
          icon="sparkle"
          block
          class="summon-btn"
          @click="summon(activeSet.id)"
        >
          召喚 · {{ guardianName(activeSet.id) }}
        </AppButton>
        <div class="meter">
          <div class="meter__fill" :style="{ width: `${activeSet.ratio * 100}%` }" />
        </div>

        <ul class="grid">
          <li v-for="slot in activeSet.slots" :key="slot.key">
            <GemCard
              :gem="slot.gem"
              :constellation-id="slot.constellationId"
              :slot-label="slot.label"
              @click="selectedGem = $event"
            />
          </li>
        </ul>
      </section>
      <p v-else class="finder__empty">找不到「{{ search }}」</p>
    </template>

    <SutraCompleteCeremony
      :sutra-id="summoned?.id ?? null"
      :sutra-title="summoned?.title ?? ''"
      :round="summoned?.round ?? 1"
      :gem-colors="summoned?.colors ?? []"
      mode="summon"
      @dismiss="summoned = null"
    />

    <GemViewer v-if="selectedGem" :gem="selectedGem" @close="selectedGem = null" />
  </main>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import GemCard from 'src/components/gems/GemCard.vue'
import GemViewer from 'src/components/gems/GemViewer.vue'
import AppSpinner from 'src/components/ui/AppSpinner.vue'
import AppButton from 'src/components/ui/AppButton.vue'
import AppIcon from 'src/components/ui/AppIcon.vue'
import { usePureLandStore } from 'src/stores/purelandStore'
import SutraCompleteCeremony from 'src/components/practice/SutraCompleteCeremony.vue'
import guardiansData from 'src/data/meta/sutra-guardians.json'
import { useGemStore } from 'src/stores/gemStore'
import { useProgressStore } from 'src/stores/progressStore'
import { getAllSutras } from 'src/services/sutraService'
import chaptersData from 'src/data/meta/sutra-chapters.json'
import { useToast, describeError } from 'src/composables/useToast'
import type { GemRecord } from 'src/types/gem'

const CHAPTERS = chaptersData as unknown as Record<string, { items: { id: string; name: string }[] }>

const GEM_CAP = 88

const gemStore = useGemStore()
const progressStore = useProgressStore()
const pureland = usePureLandStore()
const router = useRouter()
const toast = useToast()

const selectedGem = ref<GemRecord | null>(null)
const landName = computed(() => pureland.name)

const earned = computed(() => gemStore.gemsList)

const grandTotal = computed(() =>
  getAllSutras().reduce((n, s) => n + (CHAPTERS[s.id]?.items.length ?? 0), 0)
)

/**
 * One set per sutra rather than a single shared wall.
 *
 * A gem belongs to the chapter that earned it, so its slot is that
 * chapter's position in its own sutra — 地藏經 品三 always sits third in
 * the 地藏 set. Constellations restart at each sutra, which means the
 * same constellation can appear in two collections; within a set they
 * are unique and in order, and each sutra ends up with its own sky.
 */
const sets = computed(() =>
  getAllSutras().map((s) => {
    const items = CHAPTERS[s.id]?.items ?? []
    const byRef = new Map(gemStore.gemsList.map((g) => [g.sourceRef, g]))

    // The 88 constellations were mapped onto 華嚴經's eighty volumes and
    // belong to it alone. Other sets show their stones' own shape.
    const hasSky = s.id === 'avatamsaka'

    const slots = items.map((c, i) => {
      const pair = String(Math.min(i + 1, GEM_CAP)).padStart(3, '0')
      const gem = byRef.get(`${s.id}/${c.id}`)
      return {
        key: `${s.id}-${c.id}`,
        gem,
        constellationId: hasSky ? (gem?.constellationId ?? `c${pair}`) : undefined,
        label: String(i + 1),
      }
    })

    const got = slots.filter((x) => x.gem).length

    // 部數/輪數 = the lowest chapter tally; 本輪進度 = chapters already recited
    // once more than that floor, i.e. how far into the next 輪 you are.
    const vols = progressStore.progressMap[s.id]?.volumes ?? {}
    const counts = items.map(
      (c) => (vols[`${c.id}-recite`]?.count ?? vols[c.id]?.count ?? 0) + (vols[`${c.id}-memorize`]?.count ?? 0)
    )
    const rounds = counts.length ? Math.min(...counts) : 0
    const inRound = counts.filter((n) => n > rounds).length

    return {
      id: s.id,
      title: s.titleZh,
      slots,
      total: items.length,
      earned: got,
      full: items.length > 0 && got === items.length,
      ratio: items.length ? got / items.length : 0,
      rounds, // 部數 = lotuses this sutra's Buddha holds
      inRound, // chapters carried into the next 輪
      nextRatio: items.length ? inRound / items.length : 0,
    }
  })
)

const GUARDIANS = guardiansData as unknown as Record<string, { name: string }>

function guardianName(sutraId: string): string {
  return GUARDIANS[sutraId]?.name ?? ''
}

// One sutra shown at a time, found by search.
const search = ref('')
const activeId = ref('')

const filteredSets = computed(() => {
  const q = search.value.trim()
  if (!q) return sets.value
  return sets.value.filter((s) => s.title.includes(q))
})

// The chosen set, falling back to the first match so the view is never empty.
const activeSet = computed(
  () =>
    filteredSets.value.find((s) => s.id === activeId.value) ?? filteredSets.value[0] ?? null
)

const summoned = ref<{ id: string; title: string; round: number; colors: string[] } | null>(null)

/**
 * Calling the figure back with the set you finished.
 *
 * The gems are not consumed. Spending a collection built out of months
 * of practice would be a loss the app has no business inflicting for a
 * few seconds of animation — they lend their light and stay put. The
 * count of completed 部 rotates which words you hear, so a second
 * summoning is not a replay.
 */
function summon(sutraId: string) {
  const set = sets.value.find((x) => x.id === sutraId)
  if (!set?.full) return
  const colors = set.slots.map((x) => x.gem?.params.colorHex).filter(Boolean) as string[]
  // The real 部數 — so the figure shows the very lotuses you have offered.
  const round = Math.max(1, set.rounds)
  summoned.value = { id: sutraId, title: set.title, round, colors }
}

onMounted(async () => {
  try {
    await Promise.all([gemStore.loadGems(), pureland.load(), progressStore.loadAllProgress()])
    activeId.value = getAllSutras()[0]?.id ?? ''
  } catch (e) {
    toast.error(describeError(e))
  }
})
</script>

<style scoped>
.count {
  color: var(--text);
  font-size: var(--text-body);
}

.meter {
  margin-top: var(--s3);
  height: 3px;
  border-radius: var(--r-full);
  background: rgba(255, 255, 255, 0.07);
  overflow: hidden;
}

.meter__fill {
  height: 100%;
  border-radius: var(--r-full);
  background: linear-gradient(90deg, var(--amethyst), var(--sapphire));
  box-shadow: 0 0 12px rgba(167, 139, 250, 0.8);
  transition: width var(--slow) var(--ease-out);
}

.loading {
  display: flex;
  justify-content: center;
  padding: var(--s7) 0;
}

/* — Enter the 淨土 ——————————————————————————— */
.enter-land {
  position: relative;
  width: 100%;
  margin-top: var(--s5);
  display: flex;
  align-items: center;
  gap: var(--s3);
  padding: var(--s4);
  border-radius: var(--r-lg);
  overflow: hidden;
  text-align: left;
  background:
    radial-gradient(circle at 88% 50%, rgba(167, 139, 250, 0.22), transparent 60%),
    linear-gradient(120deg, rgba(96, 165, 250, 0.14), rgba(167, 139, 250, 0.1));
  border: 1px solid rgba(167, 139, 250, 0.34);
  transition: transform var(--fast) var(--ease), border-color var(--base) var(--ease);
}
.enter-land:hover {
  transform: translateY(-1px);
  border-color: rgba(167, 139, 250, 0.55);
}
.enter-land:active {
  transform: scale(0.99);
}

.enter-land__glow {
  position: absolute;
  right: -20px;
  top: 50%;
  width: 90px;
  height: 90px;
  transform: translateY(-50%);
  border-radius: 50%;
  background: radial-gradient(circle, rgba(196, 181, 253, 0.55), transparent 70%);
  filter: blur(10px);
  animation: land-glow 4s ease-in-out infinite;
}

@keyframes land-glow {
  50% {
    opacity: 0.6;
    transform: translateY(-50%) scale(1.15);
  }
}

.enter-land__main {
  position: relative;
  flex: 1;
  min-width: 0;
}

.enter-land__title {
  font-family: var(--font-serif);
  font-size: 1.2rem;
  letter-spacing: 0.12em;
}

.enter-land__sub {
  margin-top: 3px;
  font-size: var(--text-micro);
  letter-spacing: 0.08em;
  color: var(--text-dim);
}

.enter-land__go {
  position: relative;
  color: var(--text-faint);
  flex-shrink: 0;
}

.set {
  margin-top: var(--s6);
}

.set__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--s3);
}

.set__title {
  font-size: var(--text-body);
  font-weight: 300;
  letter-spacing: 0.1em;
}

.set__count {
  font-size: var(--text-micro);
  color: var(--text-faint);
}

/* — Search + tabs ——————————————————————————— */
.finder {
  margin-top: var(--s5);
  display: flex;
  align-items: center;
  gap: var(--s2);
  padding: var(--s2) var(--s4);
  border-radius: var(--r-full);
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--hairline);
}
.finder__icon {
  color: var(--text-faint);
  flex-shrink: 0;
}
.finder__input {
  flex: 1;
  min-width: 0;
  background: transparent;
  border: none;
  color: var(--text);
  font-size: var(--text-caption);
  letter-spacing: 0.04em;
}
.finder__input:focus {
  outline: none;
}
.finder__empty {
  margin-top: var(--s5);
  text-align: center;
  font-size: var(--text-caption);
  color: var(--text-faint);
}

.tabs {
  list-style: none;
  margin-top: var(--s3);
  display: flex;
  gap: var(--s2);
  overflow-x: auto;
  padding-bottom: var(--s2);
  -webkit-overflow-scrolling: touch;
}
.tabs::-webkit-scrollbar {
  display: none;
}
.tab {
  flex-shrink: 0;
  white-space: nowrap;
  display: inline-flex;
  align-items: baseline;
  gap: var(--s2);
  padding: var(--s2) var(--s3);
  border-radius: var(--r-full);
  font-size: var(--text-caption);
  letter-spacing: 0.04em;
  color: var(--text-dim);
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid var(--hairline);
  transition: background var(--fast) var(--ease), border-color var(--fast) var(--ease);
}
.tab--on {
  color: var(--text);
  background: rgba(167, 139, 250, 0.16);
  border-color: rgba(167, 139, 250, 0.5);
}
.tab__n {
  font-size: var(--text-micro);
  color: var(--text-faint);
}

.keeper {
  margin-top: var(--s3);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--s3);
  flex-wrap: wrap;
  padding: var(--s2) var(--s4);
  border-radius: var(--r-md);
  background: rgba(251, 191, 36, 0.08);
  border: 1px solid rgba(251, 191, 36, 0.24);
}
.keeper__name {
  font-family: var(--font-serif);
  font-size: var(--text-caption);
  letter-spacing: 0.06em;
  color: #ffe6ad;
}
.keeper__n {
  font-size: var(--text-caption);
  color: var(--amber);
}

.round {
  margin-top: var(--s3);
  padding: var(--s3) var(--s4);
  border-radius: var(--r-md);
  background:
    radial-gradient(circle at 100% 0%, rgba(167, 139, 250, 0.16), transparent 60%),
    rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(167, 139, 250, 0.32);
}
.round__top {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--s3);
  flex-wrap: wrap;
}
.round__label {
  font-size: var(--text-caption);
  letter-spacing: 0.06em;
  color: #d6c9ff;
}
.round__next {
  font-size: var(--text-micro);
  color: var(--text-faint);
}
.round__bar {
  margin-top: var(--s3);
  height: 4px;
  border-radius: var(--r-full);
  background: rgba(255, 255, 255, 0.08);
  overflow: hidden;
}
.round__fill {
  height: 100%;
  border-radius: var(--r-full);
  background: linear-gradient(90deg, var(--amethyst), var(--sapphire));
  box-shadow: 0 0 8px rgba(167, 139, 250, 0.7);
  transition: width var(--slow) var(--ease-out);
}
.round__hint {
  margin-top: var(--s2);
  font-size: var(--text-micro);
  color: var(--text-faint);
  line-height: 1.6;
}

.summon-btn {
  margin-top: var(--s3);
}

.grid {
  list-style: none;
  margin-top: var(--s4);
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(5rem, 1fr));
  gap: var(--s3);
}
</style>
