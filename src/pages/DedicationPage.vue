<template>
  <main class="ded">
    <!-- A living river of every lamp lit — drag to look across it -->
    <div class="ded__river"><LanternRiver :lamps="store.history" :newest-id="store.latest?.id" /></div>

    <!-- Overlay HUD (does not block dragging the river) -->
    <div class="ded__hud">
      <div class="ded__top">
        <h1 class="ded__title">迴向</h1>
        <p class="ded__balance"><b class="tnum">{{ merit.balance }}</b> 功德可迴向</p>
        <p v-if="store.history.length" class="ded__tally tnum">
          燈海 · {{ store.history.length }} 盞 · 共 {{ store.totalGiven }} 功德
        </p>
        <p class="ded__hint">拖曳畫面環視河燈</p>
      </div>
      <button class="ded__light" type="button" @click="sheetOpen = true">🪔 點一盞迴向燈</button>
    </div>

    <!-- Controls sheet -->
    <AppSheet v-model="sheetOpen" title="點迴向燈" :subtitle="`功德 ${merit.balance} 可迴向`">
      <!-- 立願 -->
      <div v-if="vow.active" class="vow vow--sheet">
        <div class="vow__head">
          <div>
            <p class="section-label">立願迴向</p>
            <p class="vow__target">為 {{ vow.vow?.targetName }}</p>
          </div>
          <button class="vow__clear" type="button" @click="onClearVow">捨願</button>
        </div>
        <div class="vow__meter"><div class="vow__fill" :style="{ width: `${vow.ratio * 100}%` }" /></div>
        <p class="vow__nums tnum">
          {{ vow.vow?.progress }} / {{ vow.vow?.goal }}
          <span class="t-faint">· 尚缺 {{ vow.remaining }}</span>
        </p>
      </div>

      <p class="section-label">迴向對象</p>
      <ul class="targets">
        <li v-for="t in targets" :key="t.id">
          <button class="pick" :class="{ 'pick--on': targetId === t.id }" type="button" @click="targetId = t.id">
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

      <p class="section-label mt6">迴向偈</p>
      <ul class="verses">
        <li v-for="v in verses" :key="v.id">
          <button class="pick" :class="{ 'pick--on': verseId === v.id }" type="button" @click="verseId = v.id">
            <span class="pick__row">
              <span class="pick__name">{{ v.name }}</span>
              <span class="pick__src">{{ v.source }}</span>
            </span>
            <span class="pick__verse t-serif">{{ v.lines.join('，') }}。</span>
          </button>
        </li>
      </ul>

      <p class="section-label mt6">此燈供養</p>
      <div class="amounts">
        <button
          v-for="a in amounts"
          :key="a.key"
          class="amount"
          :class="{ 'amount--on': amountKey === a.key, 'amount--off': offerOf(a) > merit.balance }"
          type="button"
          @click="amountKey = a.key"
        >
          <span class="amount__n tnum">{{ offerOf(a) }}</span>
          <span class="amount__l">{{ a.label }}</span>
        </button>
      </div>

      <AppButton variant="accent" block class="cta" :disabled="!canDedicate" :loading="saving" @click="begin">
        {{ merit.balance > 0 ? `🪔 點燈迴向 · ${offer} 功德` : '尚無可迴向的功德' }}
      </AppButton>
    </AppSheet>

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
import AppButton from 'src/components/ui/AppButton.vue'
import AppSheet from 'src/components/ui/AppSheet.vue'
import DedicationCeremony from 'src/components/DedicationCeremony.vue'
import LanternRiver from 'src/components/LanternRiver.vue'
import { useProgressStore } from 'src/stores/progressStore'
import { useMeritStore } from 'src/stores/meritStore'
import { useDedicationStore } from 'src/stores/dedicationStore'
import { useVowStore } from 'src/stores/vowStore'
import { useToast, describeError } from 'src/composables/useToast'
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
const merit = useMeritStore()
const store = useDedicationStore()
const vow = useVowStore()
const toast = useToast()

// How much 功德 this lamp carries. 全部 offers the whole balance.
const amounts = [
  { key: 's', label: '七遍', n: 7 },
  { key: 'm', label: '四十九', n: 49 },
  { key: 'l', label: '一百零八', n: 108 },
  { key: 'all', label: '全部', n: 0 },
] as const
type Amount = (typeof amounts)[number]
const amountKey = ref<string>('s')
const offerOf = (a: Amount) => (a.key === 'all' ? merit.balance : Math.min(a.n, merit.balance))
const offer = computed(() => {
  const a = amounts.find((x) => x.key === amountKey.value) ?? amounts[0]
  return offerOf(a)
})

const vowTarget = ref('')
const vowGoal = ref<number | null>(null)
const canMakeVow = computed(() => vowTarget.value.trim().length > 0 && !!vowGoal.value && vowGoal.value > 0)

async function onMakeVow() {
  if (!canMakeVow.value) return
  try {
    await vow.setVow(vowTarget.value.trim(), Number(vowGoal.value), verseId.value)
    vowTarget.value = ''
    vowGoal.value = null
  } catch (e) {
    toast.error(describeError(e))
  }
}
async function onClearVow() {
  try {
    await vow.clear()
  } catch (e) {
    toast.error(describeError(e))
  }
}

const sheetOpen = ref(false)
const verseId = ref(verses[0].id)
const targetId = ref(targets[0].id)
const customTarget = ref('')
const saving = ref(false)
const ceremonyOpen = ref(false)
const dedicatedMerit = ref(0)

const activeVerse = computed(() => verses.find((v) => v.id === verseId.value))
const targetName = computed(() => {
  if (targetId.value === 'custom') return customTarget.value.trim() || '心中所念'
  return targets.find((t) => t.id === targetId.value)?.name ?? ''
})

const canDedicate = computed(() => offer.value > 0 && offer.value <= merit.balance && !saving.value)

async function begin() {
  if (!canDedicate.value) return
  saving.value = true
  const amount = offer.value
  try {
    const ok = await merit.spend(amount)
    if (!ok) {
      toast.error('功德不足')
      return
    }
    dedicatedMerit.value = amount
    await store.light({
      verseId: verseId.value,
      targetId: targetId.value,
      targetName: targetName.value,
      merit: amount,
    })
    const fulfilled = await vow.addProgress(amount)
    if (fulfilled) {
      toast.info(`圓滿:為 ${vow.vow?.targetName} 的迴向已達願數`)
      vow.ackFulfilled()
    }
    sheetOpen.value = false
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
    await Promise.all([progressStore.loadAllProgress(), merit.load(), store.loadDedications(), vow.load()])
  } catch (e) {
    toast.error(describeError(e))
  }
})
</script>

<style scoped>
.block {
  margin-top: var(--s6);
}

/* — 功德 balance ——————————————————————————————— */
.merit {
  margin-top: var(--s5);
}
.merit__main {
  margin-top: var(--s2);
  display: flex;
  align-items: baseline;
  gap: var(--s3);
}
.merit__n {
  font-size: 2.6rem;
  font-weight: 200;
  line-height: 1;
  color: var(--amber);
  text-shadow: 0 0 22px rgba(251, 191, 36, 0.35);
}
.merit__u {
  font-size: var(--text-caption);
  letter-spacing: 0.12em;
  color: var(--text-faint);
}
.merit__sub {
  margin-top: var(--s3);
  display: flex;
  gap: var(--s2);
  font-size: var(--text-micro);
  color: var(--text-dim);
}

/* — 立願 ————————————————————————————————————— */
.vow {
  margin-top: var(--s3);
}
.vow__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--s3);
}
.vow__target {
  margin-top: var(--s2);
  font-family: var(--font-serif);
  font-size: var(--text-body);
  letter-spacing: 0.06em;
  color: var(--amber);
}
.vow__clear {
  flex-shrink: 0;
  font-size: var(--text-micro);
  letter-spacing: 0.08em;
  color: var(--text-faint);
  padding: 3px var(--s2);
  border-radius: var(--r-full);
  border: 1px solid var(--hairline);
}
.vow__meter {
  margin-top: var(--s3);
  height: 6px;
  border-radius: var(--r-full);
  background: rgba(255, 255, 255, 0.07);
  overflow: hidden;
}
.vow__fill {
  height: 100%;
  border-radius: var(--r-full);
  background: linear-gradient(90deg, var(--amber), #fcd34d);
  box-shadow: 0 0 12px rgba(251, 191, 36, 0.7);
  transition: width var(--slow) var(--ease-out);
}
.vow__nums {
  margin-top: var(--s2);
  font-size: var(--text-caption);
  color: var(--text-dim);
}
.vow__hint {
  margin-top: var(--s2);
  font-size: var(--text-micro);
  line-height: 1.7;
  color: var(--text-faint);
}
.vow__form {
  margin-top: var(--s3);
  display: flex;
  flex-direction: column;
  gap: var(--s3);
}
.vow__goalrow {
  display: flex;
  align-items: center;
  gap: var(--s3);
}
.field--num {
  width: 6rem;
  text-align: center;
}
.vow__unit {
  font-size: var(--text-caption);
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

/* — 供養份量 ————————————————————————————————— */
.amounts {
  margin-top: var(--s3);
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--s2);
}
.amount {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: var(--s3) var(--s2);
  border-radius: var(--r-md);
  border: 1px solid var(--hairline);
  background: rgba(255, 255, 255, 0.028);
  transition:
    background var(--fast) var(--ease),
    border-color var(--fast) var(--ease);
}
.amount--on {
  border-color: rgba(251, 191, 36, 0.5);
  background: rgba(251, 191, 36, 0.1);
}
.amount--off {
  opacity: 0.4;
}
.amount__n {
  font-size: var(--text-body);
  color: var(--amber);
}
.amount__l {
  font-size: var(--text-micro);
  color: var(--text-faint);
}

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

/* — Immersive river scene ——————————————————————————— */
.ded {
  position: fixed;
  inset: 0;
  overflow: hidden;
  background: #070a16;
}
/* Draggable — the river takes pointer events so you can orbit the view */
.ded__river {
  position: absolute;
  inset: 0;
  z-index: 0;
}
/* Overlay chrome floats above but lets drags fall through to the river */
.ded__hud {
  position: absolute;
  inset: 0;
  z-index: 1;
  pointer-events: none;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}
.ded__top {
  padding: calc(var(--safe-t) + var(--s5)) var(--s5) 0;
  text-align: center;
  background: linear-gradient(to bottom, rgba(7, 10, 22, 0.75), transparent);
}
.ded__title {
  font-size: var(--text-display);
  font-weight: 300;
  letter-spacing: 0.14em;
}
.ded__balance {
  margin-top: var(--s2);
  font-size: var(--text-caption);
  color: var(--text-dim);
}
.ded__balance b {
  font-size: var(--text-title);
  font-weight: 300;
  color: var(--amber);
  text-shadow: 0 0 18px rgba(251, 191, 36, 0.5);
}
.ded__tally {
  margin-top: var(--s1);
  font-size: var(--text-micro);
  letter-spacing: 0.06em;
  color: var(--text-faint);
}
.ded__hint {
  margin-top: var(--s3);
  font-size: var(--text-micro);
  letter-spacing: 0.1em;
  color: var(--text-faint);
  opacity: 0.7;
}
.ded__light {
  pointer-events: auto;
  align-self: center;
  margin-bottom: calc(var(--safe-b) + var(--tabbar-h) + var(--s4));
  padding: var(--s3) var(--s6);
  border-radius: var(--r-full);
  font-size: var(--text-body);
  letter-spacing: 0.08em;
  color: #14101f;
  background: linear-gradient(135deg, #ffe0a0, #e8b44e);
  border: 1px solid rgba(255, 220, 150, 0.6);
  box-shadow: 0 10px 30px -8px rgba(232, 180, 78, 0.7);
  transition: transform var(--fast) var(--ease);
}
.ded__light:active {
  transform: scale(0.97);
}

.vow--sheet {
  margin-bottom: var(--s4);
}
.mt6 {
  margin-top: var(--s6);
}
</style>
