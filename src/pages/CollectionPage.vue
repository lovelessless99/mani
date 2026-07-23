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
      <section v-for="set in sets" :key="set.id" class="set">
        <div class="set__head">
          <h2 class="set__title">{{ set.title }}</h2>
          <span class="set__count tnum">{{ set.earned }} / {{ set.total }}</span>
        </div>

        <!-- A completed set can call its figure back. The stones lend
             their light for it; nothing is spent. -->
        <AppButton
          v-if="set.full"
          variant="glass"
          icon="sparkle"
          block
          class="summon-btn"
          @click="summon(set.id)"
        >
          以寶石召喚 · {{ guardianName(set.id) }}
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
import GemCard from 'src/components/gems/GemCard.vue'
import GemViewer from 'src/components/gems/GemViewer.vue'
import AppSpinner from 'src/components/ui/AppSpinner.vue'
import AppButton from 'src/components/ui/AppButton.vue'
import SutraCompleteCeremony from 'src/components/practice/SutraCompleteCeremony.vue'
import guardiansData from 'src/data/meta/sutra-guardians.json'
import { useGemStore } from 'src/stores/gemStore'
import { getAllSutras } from 'src/services/sutraService'
import chaptersData from 'src/data/meta/sutra-chapters.json'
import { useToast, describeError } from 'src/composables/useToast'
import type { GemRecord } from 'src/types/gem'

const CHAPTERS = chaptersData as unknown as Record<string, { items: { id: string; name: string }[] }>

const GEM_CAP = 88

const gemStore = useGemStore()
const toast = useToast()
const selectedGem = ref<GemRecord | null>(null)

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
  const round = Math.max(1, Math.floor(Math.random() * 3) + 1)
  summoned.value = { id: sutraId, title: set.title, round, colors }
}

onMounted(async () => {
  try {
    await gemStore.loadGems()
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
