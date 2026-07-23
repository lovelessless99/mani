<template>
  <main class="page">
    <header>
      <h1 class="page-title">迴向</h1>
      <p class="page-sub">將所修功德,施與所願之處</p>
    </header>

    <!-- Merit awaiting dedication ---------------------------- -->
    <GlassCard class="merit">
      <p class="section-label">尚未迴向的功課</p>
      <div class="merit__nums">
        <div class="merit__item">
          <span class="merit__n tnum" style="color: var(--sapphire)">{{ pending.recite }}</span>
          <span class="merit__u">遍 念經</span>
        </div>
        <div class="merit__item">
          <span class="merit__n tnum" style="color: var(--amethyst)">{{ pending.memorize }}</span>
          <span class="merit__u">遍 背誦</span>
        </div>
      </div>
      <p v-if="lastLabel" class="merit__last">上次迴向 · {{ lastLabel }}</p>
    </GlassCard>

    <!-- Target ------------------------------------------------ -->
    <section class="block">
      <p class="section-label">迴向對象</p>
      <ul class="targets">
        <li v-for="t in targets" :key="t.id">
          <button
            class="pick"
            :class="{ 'pick--on': targetId === t.id }"
            type="button"
            @click="targetId = t.id"
          >
            <span class="pick__name">{{ t.name }}</span>
            <span class="pick__hint">{{ t.hint }}</span>
          </button>
        </li>
      </ul>

      <input
        v-if="targetId === 'custom'"
        v-model="customTarget"
        class="field"
        type="text"
        maxlength="40"
        placeholder="寫下心中所繫念的人或事"
      />
    </section>

    <!-- Verse ------------------------------------------------- -->
    <section class="block">
      <p class="section-label">迴向偈</p>
      <ul class="verses">
        <li v-for="v in verses" :key="v.id">
          <button
            class="pick"
            :class="{ 'pick--on': verseId === v.id }"
            type="button"
            @click="verseId = v.id"
          >
            <span class="pick__row">
              <span class="pick__name">{{ v.name }}</span>
              <span class="pick__src">{{ v.source }}</span>
            </span>
            <span class="pick__verse t-serif">{{ v.lines.join('，') }}。</span>
            <span class="pick__hint">{{ v.gloss }}</span>
          </button>
        </li>
      </ul>
    </section>

    <AppButton
      variant="accent"
      block
      class="cta"
      :disabled="!canDedicate"
      :loading="saving"
      @click="begin"
    >
      {{ hasMerit ? '至誠迴向' : '尚無可迴向的功課' }}
    </AppButton>

    <!-- History ----------------------------------------------- -->
    <section v-if="store.history.length" class="block">
      <p class="section-label">迴向紀錄</p>
      <GlassCard class="mt" flush>
        <ul class="log">
          <li v-for="r in store.history.slice(0, 8)" :key="r.id" class="log__row">
            <div class="log__main">
              <p class="log__target">{{ r.targetName }}</p>
              <p class="log__meta tnum">
                {{ verseName(r.verseId) }} ·
                {{ new Date(r.dedicatedAt).toLocaleDateString('zh-TW') }}
              </p>
            </div>
            <span class="log__merit tnum">
              {{ r.merit.recite + r.merit.memorize }} 遍
            </span>
          </li>
        </ul>
      </GlassCard>
    </section>

    <DedicationCeremony
      :open="ceremonyOpen"
      :lines="activeVerse?.lines ?? []"
      :target-name="targetName"
      :merit="dedicatedMerit"
      @done="finish"
    />
  </main>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import GlassCard from 'src/components/GlassCard.vue'
import AppButton from 'src/components/ui/AppButton.vue'
import DedicationCeremony from 'src/components/DedicationCeremony.vue'
import { useProgressStore } from 'src/stores/progressStore'
import { useDedicationStore } from 'src/stores/dedicationStore'
import { getAllSutras } from 'src/services/sutraService'
import { useToast, describeError } from 'src/composables/useToast'
import type { MeritTotals } from 'src/types/dedication'
import versesData from 'src/data/meta/dedication-verses.json'

interface Verse {
  id: string
  name: string
  source: string
  lines: string[]
  gloss: string
}
interface Target {
  id: string
  name: string
  hint: string
}

const verses = versesData.verses as Verse[]
const targets = versesData.targets as Target[]

const progressStore = useProgressStore()
const store = useDedicationStore()
const toast = useToast()

const verseId = ref(verses[0].id)
const targetId = ref(targets[0].id)
const customTarget = ref('')
const saving = ref(false)
const ceremonyOpen = ref(false)
const dedicatedMerit = ref<MeritTotals>({ recite: 0, memorize: 0 })

const activeVerse = computed(() => verses.find((v) => v.id === verseId.value))

const targetName = computed(() => {
  if (targetId.value === 'custom') {
    return customTarget.value.trim() || '心中所念'
  }
  return targets.find((t) => t.id === targetId.value)?.name ?? ''
})

function verseName(id: string): string {
  return verses.find((v) => v.id === id)?.name ?? ''
}

/** Practice totals across every sutra, matching PracticePage's slot keys. */
const totals = computed<MeritTotals>(() => {
  let recite = 0
  let memorize = 0
  for (const s of getAllSutras()) {
    const volumes = progressStore.progressMap[s.id]?.volumes ?? {}
    for (const [key, vp] of Object.entries(volumes)) {
      if (key.endsWith('-memorize') || key === 'memorize') memorize += vp.count
      else recite += vp.count
    }
  }
  return { recite, memorize }
})

const pending = computed(() => store.pendingMerit(totals.value))
const hasMerit = computed(() => pending.value.recite + pending.value.memorize > 0)
const canDedicate = computed(() => hasMerit.value && !saving.value)

const lastLabel = computed(() => {
  const l = store.latest
  if (!l) return ''
  return `${new Date(l.dedicatedAt).toLocaleDateString('zh-TW')} · ${l.targetName}`
})

async function begin() {
  if (!canDedicate.value) return
  saving.value = true

  // Capture what is being offered before the record resets the baseline
  dedicatedMerit.value = { ...pending.value }

  try {
    await store.dedicate({
      verseId: verseId.value,
      targetId: targetId.value,
      targetName: targetName.value,
      totals: totals.value,
    })
    ceremonyOpen.value = true
  } catch (e) {
    toast.error(describeError(e))
  } finally {
    saving.value = false
  }
}

function finish() {
  ceremonyOpen.value = false
}

onMounted(async () => {
  try {
    await Promise.all([progressStore.loadAllProgress(), store.loadDedications()])
  } catch (e) {
    toast.error(describeError(e))
  }
})
</script>

<style scoped>
.block {
  margin-top: var(--s6);
}

.mt {
  margin-top: var(--s3);
}

/* — Pending merit ——————————————————————————— */
.merit {
  margin-top: var(--s5);
}

.merit__nums {
  display: flex;
  gap: var(--s6);
  margin-top: var(--s3);
}

.merit__item {
  display: flex;
  align-items: baseline;
  gap: var(--s2);
}

.merit__n {
  font-size: 2rem;
  font-weight: 200;
  line-height: 1;
}

.merit__u {
  font-size: var(--text-micro);
  letter-spacing: 0.1em;
  color: var(--text-faint);
}

.merit__last {
  margin-top: var(--s4);
  padding-top: var(--s3);
  border-top: 1px solid var(--hairline);
  font-size: var(--text-micro);
  letter-spacing: 0.06em;
  color: var(--text-faint);
}

/* — Pickers ————————————————————————————————— */
.targets,
.verses {
  list-style: none;
  margin-top: var(--s3);
  display: grid;
  gap: var(--s2);
}

.targets {
  grid-template-columns: repeat(auto-fit, minmax(9.5rem, 1fr));
}

.pick {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: var(--s3) var(--s4);
  border-radius: var(--r-md);
  border: 1px solid var(--hairline);
  background: rgba(255, 255, 255, 0.028);
  text-align: left;
  transition:
    background var(--fast) var(--ease),
    border-color var(--fast) var(--ease);
}

.pick:hover {
  background: var(--glass-2);
}

.pick--on {
  border-color: rgba(251, 191, 36, 0.45);
  background: rgba(251, 191, 36, 0.08);
  box-shadow: inset 0 0 20px -12px var(--amber);
}

.pick:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.pick__row {
  display: flex;
  align-items: baseline;
  gap: var(--s2);
  flex-wrap: wrap;
}

.pick__name {
  font-size: var(--text-caption);
  letter-spacing: 0.08em;
  color: var(--text);
}

.pick__src {
  font-size: var(--text-micro);
  color: var(--text-faint);
}

.pick__verse {
  font-size: var(--text-caption);
  line-height: 1.9;
  letter-spacing: 0.06em;
  color: var(--text-dim);
}

.pick__hint {
  font-size: var(--text-micro);
  line-height: 1.6;
  color: var(--text-faint);
}

/* — Custom field ———————————————————————————— */
.field {
  width: 100%;
  margin-top: var(--s2);
  padding: var(--s3) var(--s4);
  border-radius: var(--r-md);
  border: 1px solid var(--hairline);
  background: rgba(255, 255, 255, 0.04);
  color: var(--text);
  font: inherit;
  font-size: var(--text-caption);
  letter-spacing: 0.05em;
}

.field::placeholder {
  color: var(--text-faint);
}

.field:focus {
  outline: none;
  border-color: rgba(251, 191, 36, 0.5);
}

.cta {
  margin-top: var(--s6);
}

/* — History ————————————————————————————————— */
.log {
  list-style: none;
}

.log__row {
  display: flex;
  align-items: center;
  gap: var(--s3);
  padding: var(--s3) var(--s4);
}

.log__row + .log__row {
  border-top: 1px solid rgba(255, 255, 255, 0.05);
}

.log__main {
  flex: 1;
  min-width: 0;
}

.log__target {
  font-size: var(--text-caption);
  letter-spacing: 0.04em;
}

.log__meta {
  margin-top: 2px;
  font-size: var(--text-micro);
  color: var(--text-faint);
}

.log__merit {
  flex-shrink: 0;
  font-size: var(--text-micro);
  color: var(--amber);
  padding: 3px var(--s2);
  border-radius: var(--r-full);
  background: rgba(251, 191, 36, 0.1);
}
</style>
