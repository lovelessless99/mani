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

      <section v-for="set in sets" :key="set.id" class="set">
        <div class="set__head">
          <h2 class="set__title">{{ set.title }}</h2>
          <span class="set__count tnum">{{ set.earned }} / {{ set.total }}</span>
        </div>

        <!-- Once the set is full its figure has awakened, and holds one
             lotus for every 部 you have recited. -->
        <div v-if="set.full && set.rounds > 0" class="keeper">
          <span class="keeper__name">{{ guardianName(set.id) }} · 護持此經</span>
          <span class="keeper__lotus">
            <span v-for="n in Math.min(set.rounds, 8)" :key="n">🪷</span>
            <span class="keeper__n tnum">念滿 {{ set.rounds }} 部</span>
          </span>
        </div>

        <AppButton
          v-if="set.full"
          variant="glass"
          icon="sparkle"
          block
          class="summon-btn"
          @click="summon(set.id)"
        >
          {{ set.rounds > 0 ? `供養 ${set.rounds} 朵蓮 · 召喚` : '以寶石召喚 · ' }}{{ guardianName(set.id) }}
        </AppButton>
        <div class="meter">
          <div class="meter__fill" :style="{ width: `${set.ratio * 100}%` }" />
        </div>

        <ul class="grid">
          <li v-for="slot in set.slots" :key="slot.key">
            <GemCard
              :gem="slot.gem"
              :constellation-id="slot.constellationId"
              :slot-label="slot.label"
              @click="selectedGem = $event"
            />
          </li>
        </ul>
      </section>
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

// 部數 (completed rounds) of a sutra = the lowest chapter tally across it —
// one lotus is offered to its Buddha for each full pass.
function roundsOf(sutraId: string, items: { id: string }[]): number {
  if (!items.length) return 0
  const vols = progressStore.progressMap[sutraId]?.volumes ?? {}
  let lowest = Infinity
  for (const c of items) {
    const recite = vols[`${c.id}-recite`]?.count ?? vols[c.id]?.count ?? 0
    const memorize = vols[`${c.id}-memorize`]?.count ?? 0
    lowest = Math.min(lowest, recite + memorize)
  }
  return lowest === Infinity ? 0 : lowest
}
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
    return {
      id: s.id,
      title: s.titleZh,
      slots,
      total: items.length,
      earned: got,
      full: items.length > 0 && got === items.length,
      ratio: items.length ? got / items.length : 0,
      rounds: roundsOf(s.id, items), // 部數 = lotuses this sutra's Buddha holds
    }
  })
)

const GUARDIANS = guardiansData as unknown as Record<string, { name: string }>

function guardianName(sutraId: string): string {
  return GUARDIANS[sutraId]?.name ?? ''
}

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

.keeper {
  margin-top: var(--s3);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--s3);
  flex-wrap: wrap;
  padding: var(--s2) var(--s3);
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
.keeper__lotus {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  font-size: 0.95rem;
}
.keeper__n {
  margin-left: var(--s2);
  font-size: var(--text-micro);
  color: var(--text-faint);
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
