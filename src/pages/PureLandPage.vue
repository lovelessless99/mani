<template>
  <main class="pl" :style="skyStyle">
    <div v-if="loading" class="pl__loading">
      <AppSpinner :size="34" />
    </div>

    <template v-else>
      <!-- The world / heaven, or Indra's net when reached and chosen -->
      <div class="pl__scene">
        <IndraNet v-if="netView" :colors="gemColors" />
        <HeavenScene v-else :heaven="store.heaven" :build="store.build" :lamp-level="store.litLamps" />
      </div>

      <!-- Heading over the sky -->
      <div class="pl__head">
        <button class="pl__world" type="button" @click="openRename">
          {{ land.name || '我的淨土' }}<AppIcon name="edit" :size="12" class="pl__world-edit" />
        </button>
        <template v-if="!netView">
          <h1 class="pl__heaven">{{ store.heaven.name }}</h1>
          <button class="pl__realm pl__realm--btn tnum" type="button" @click="heavenListOpen = true">
            {{ store.heaven.realm }} · 第 {{ store.tier }} / {{ topIndex }} 天
            <AppIcon name="chevronRight" :size="12" class="pl__realm-ico" />
          </button>
          <p class="pl__blurb">{{ store.heaven.blurb }}</p>
        </template>
        <template v-else>
          <h1 class="pl__heaven">因陀羅網</h1>
          <p class="pl__realm">{{ gemColors.length }} 顆寶珠 · 珠珠相映,重重無盡</p>
        </template>
      </div>

      <!-- Tier navigation arrows -->
      <div v-if="!netView" class="pl__nav">
        <button class="pl__arrow" type="button" :disabled="store.tier <= 0" @click="go(store.tier - 1)">
          ‹
        </button>
        <button class="pl__arrow" type="button" :disabled="store.tier >= store.maxTier" @click="go(store.tier + 1)">
          ›
        </button>
      </div>

      <!-- Bottom console: power, build, ascend -->
      <div class="pl__console">
        <template v-if="!netView">
          <div class="pl__power">
            <span class="pl__power-label">功德之力</span>
            <div class="pl__power-bar">
              <div class="pl__power-fill" :style="{ width: `${powerRatio * 100}%` }" />
            </div>
            <span class="pl__power-num tnum">{{ store.freePower }} / {{ store.totalPower }}</span>
          </div>

          <div class="pl__builds">
            <div v-for="s in structureList" :key="s.type" class="pl__build">
              <button
                class="pl__build-btn"
                type="button"
                :disabled="!store.affordable(s.type)"
                @click="place(s.type)"
              >
                <span class="pl__build-glyph">{{ s.glyph }}</span>
                <span class="pl__build-name">{{ s.name }}</span>
                <span class="pl__build-cost tnum">{{ s.cost }} 力</span>
              </button>
              <div class="pl__build-count">
                <button
                  class="pl__minus"
                  type="button"
                  :disabled="store.build[s.type] <= 0"
                  @click="store.remove(s.type)"
                >
                  －
                </button>
                <span class="tnum">{{ store.build[s.type] }}</span>
              </div>
            </div>
          </div>

          <AppButton
            v-if="store.canAscend"
            variant="accent"
            icon="sparkle"
            block
            class="pl__ascend"
            @click="ascend"
          >
            昇天 · 上生{{ nextHeavenName }}
          </AppButton>
          <div v-else class="pl__ascend-hint">
            <p class="tnum">
              誦滿 {{ store.nextNeed }} 卷華嚴,可上生{{ nextHeavenName }}
              <span class="t-faint">· 已誦 {{ store.huayanVols }} 卷</span>
            </p>
            <div class="pl__ascend-bar">
              <div class="pl__ascend-fill" :style="{ width: `${store.ascendRatio * 100}%` }" />
            </div>
          </div>

          <div class="pl__extra">
            <button class="pl__lamp-btn" type="button" @click="lampOpen = true">
              🪔 無盡燈 · 寶庫
            </button>
            <button v-if="store.atTop" class="pl__net-enter" type="button" @click="netView = true">
              ✦ 入因陀羅網 ✦
            </button>
          </div>
        </template>

        <button v-else class="pl__net-back" type="button" @click="netView = false">
          ‹ 返回諸天
        </button>
      </div>

      <p v-if="!store.totalPower && !netView" class="pl__nopower">
        寶石即功德之力 · 每念一品得一寶石,方能莊嚴此土
      </p>
    </template>

    <!-- 諸天: jump to any heaven already reached -->
    <AppSheet v-model="heavenListOpen" title="諸天" subtitle="回望已歷之天,重遊莊嚴">
      <ul class="hlist">
        <li v-for="(h, i) in reachedHeavens" :key="h.id">
          <button
            class="hrow"
            :class="{ 'hrow--on': i === store.tier }"
            type="button"
            @click="jumpTo(i)"
          >
            <span class="hrow__idx tnum">{{ i }}</span>
            <span class="hrow__main">
              <span class="hrow__name">{{ h.name }}</span>
              <span class="hrow__realm">{{ h.realm }}</span>
            </span>
            <span v-if="i === store.tier" class="hrow__here">目前</span>
          </button>
        </li>
      </ul>
      <p v-if="store.maxTier < topIndex" class="hlist__hint">
        誦華嚴、昇諸天,未至之天將次第顯現。
      </p>
    </AppSheet>

    <!-- 無盡燈 · 寶庫: the teaching, the gems (with the day each was lit),
         and the recycle controls for the current heaven. -->
    <AppSheet v-model="lampOpen" title="無盡燈 · 寶庫" subtitle="一燈燃百千燈,冥者皆明,明終不盡">
      <p class="lamp__sutra">
        「譬如一燈,燃百千燈,冥者皆明,明終不盡。」——《維摩詰經·菩薩品》
      </p>

      <div class="lamp__stats">
        <div class="lamp__stat">
          <span class="lamp__stat-n tnum">{{ store.litLamps }}</span>
          <span class="lamp__stat-l">已點之燈</span>
        </div>
        <div class="lamp__stat">
          <span class="lamp__stat-n tnum">{{ store.totalPower }}</span>
          <span class="lamp__stat-l">寶石功德力</span>
        </div>
        <div class="lamp__stat">
          <span class="lamp__stat-n tnum">{{ store.spent }}</span>
          <span class="lamp__stat-l">供入諸天</span>
        </div>
      </div>

      <!-- 點燈: one lamp at a time, without end -->
      <button class="lamp__light" type="button" @click="lightOne">
        <span class="lamp__light-flame">🪔</span>
        <span class="lamp__light-main">
          <span class="lamp__light-t">點一盞燈</span>
          <span class="lamp__light-s">一燈引燃無盡燈,冥者皆明</span>
        </span>
        <span class="lamp__light-plus">＋1</span>
      </button>

      <!-- Reclaim what is built on this heaven (undo a mis-tap) -->
      <div v-if="store.tierValue > 0" class="lamp__reclaim">
        <div>
          <p class="lamp__reclaim-t">{{ store.heaven.name }} · 已建 {{ store.tierValue }} 之力</p>
          <p class="lamp__reclaim-s">誤按了?可回收此天所有建造,力歸於燈</p>
        </div>
        <AppButton variant="glass" @click="reclaimTier">回收此天</AppButton>
      </div>

      <p class="section-label lamp__label">寶石 · 登記時日</p>
      <p v-if="!gemDays.length" class="lamp__empty">尚無寶石。每念一品得一寶,燈自明。</p>
      <ul v-else class="lamp__days">
        <li v-for="d in gemDays" :key="d.date" class="lamp__day">
          <div class="lamp__day-head">
            <span class="lamp__day-date">{{ d.date }}</span>
            <span class="lamp__day-count tnum">{{ d.gems.length }} 顆</span>
          </div>
          <div class="lamp__swatches">
            <span
              v-for="(g, i) in d.gems"
              :key="i"
              class="lamp__swatch"
              :style="{ background: g }"
            />
          </div>
        </li>
      </ul>
    </AppSheet>

    <!-- Rename the world -->
    <AppSheet v-model="renameOpen" title="為淨土命名" subtitle="願此功德莊嚴的國土,名為">
      <input
        ref="nameInput"
        v-model="draftName"
        class="pl__field"
        type="text"
        maxlength="20"
        placeholder="如:琉璃淨土 · 蓮華藏"
        @keyup.enter="saveName"
      />
      <AppButton variant="accent" block class="pl__save" :disabled="!draftName.trim()" @click="saveName">
        命名
      </AppButton>
      <ul class="pl__suggest">
        <li v-for="s in SUGGESTIONS" :key="s">
          <button type="button" class="pl__chip" @click="draftName = s">{{ s }}</button>
        </li>
      </ul>
    </AppSheet>
  </main>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onMounted, defineAsyncComponent } from 'vue'
import AppSpinner from 'src/components/ui/AppSpinner.vue'
import AppButton from 'src/components/ui/AppButton.vue'
import AppIcon from 'src/components/ui/AppIcon.vue'
import AppSheet from 'src/components/ui/AppSheet.vue'
import { useGemStore } from 'src/stores/gemStore'
import { usePureLandStore } from 'src/stores/purelandStore'
import { useProgressStore } from 'src/stores/progressStore'
import {
  useHeavenStore,
  STRUCTURES,
  HEAVENS,
  type StructureType,
} from 'src/stores/heavenStore'
import { useChime } from 'src/composables/useChime'
import { useToast, describeError } from 'src/composables/useToast'

const HeavenScene = defineAsyncComponent(() => import('src/components/pureland/HeavenScene.vue'))
const IndraNet = defineAsyncComponent(() => import('src/components/pureland/IndraNet.vue'))

const SUGGESTIONS = ['琉璃淨土', '蓮華藏世界', '極樂淨土', '常寂光土', '眾寶莊嚴']

const gemStore = useGemStore()
const land = usePureLandStore()
const store = useHeavenStore()
const progressStore = useProgressStore()
const chime = useChime()
const toast = useToast()

const loading = ref(true)
const netView = ref(false)
const lampOpen = ref(false)
const heavenListOpen = ref(false)

// Every heaven reached so far, for the jump menu.
const reachedHeavens = computed(() => HEAVENS.slice(0, store.maxTier + 1))

function jumpTo(i: number) {
  store.goTo(i)
  heavenListOpen.value = false
}

async function lightOne() {
  await store.lightLamp()
  chime.strike(0.35)
}

// Gems grouped by the day each was earned — the 寶庫 ledger, so the timestamp
// every gem carries is actually shown, newest day first. Keyed by ISO date so
// the ordering is correct regardless of how the label is formatted.
const gemDays = computed(() => {
  const byDay = new Map<string, { label: string; gems: string[] }>()
  for (const g of gemStore.gemsList) {
    const d = new Date(g.earnedAt)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    const label = d.toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric' })
    if (!byDay.has(key)) byDay.set(key, { label, gems: [] })
    byDay.get(key)!.gems.push(g.params.colorHex)
  }
  return Array.from(byDay.entries())
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([, v]) => ({ date: v.label, gems: v.gems }))
})

async function reclaimTier() {
  await store.clearTier()
  chime.strike(0.4)
}

const topIndex = HEAVENS.length - 1
const structureList = (Object.keys(STRUCTURES) as StructureType[]).map((type) => ({
  type,
  ...STRUCTURES[type],
}))

const gemColors = computed(() => gemStore.gemsList.map((g) => g.params.colorHex))
const powerRatio = computed(() =>
  store.totalPower ? store.freePower / store.totalPower : 0
)
const nextHeavenName = computed(() => HEAVENS[Math.min(store.tier + 1, topIndex)]?.name ?? '')

// A gradient from the current heaven's sky, painted behind the alpha canvas.
const skyStyle = computed(() => {
  const sky = netView.value ? ['#20183a', '#07060f'] : store.heaven.sky
  const stops = sky.length >= 3 ? sky : [sky[0], sky[0], sky[1]]
  return { background: `linear-gradient(to bottom, ${stops.join(', ')})` }
})

async function place(type: StructureType) {
  if (await store.place(type)) chime.strike(0.4)
}

async function ascend() {
  if (await store.ascend()) chime.strike(1)
}

function go(t: number) {
  store.goTo(t)
}

// — Rename ————————————————————————————————————
const renameOpen = ref(false)
const draftName = ref('')
const nameInput = ref<HTMLInputElement | null>(null)

function openRename() {
  draftName.value = land.name
  renameOpen.value = true
  nextTick(() => nameInput.value?.focus())
}
async function saveName() {
  const next = draftName.value.trim()
  if (!next) return
  try {
    await land.rename(next)
    renameOpen.value = false
  } catch (e) {
    toast.error(describeError(e))
  }
}

onMounted(async () => {
  try {
    await Promise.all([gemStore.loadGems(), land.load(), store.load(), progressStore.loadAllProgress()])
  } catch (e) {
    toast.error(describeError(e))
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.pl {
  position: relative;
  min-height: 100vh;
  min-height: 100dvh;
  overflow: hidden;
  transition: background var(--slow) var(--ease);
}

.pl__loading {
  display: grid;
  place-items: center;
  min-height: 100vh;
  min-height: 100dvh;
}

.pl__scene {
  position: absolute;
  inset: 0;
}

/* — Heading ————————————————————————————————— */
.pl__head {
  position: absolute;
  z-index: 2;
  top: calc(var(--safe-t) + var(--s4));
  left: 0;
  right: 0;
  text-align: center;
  pointer-events: none;
  padding: 0 var(--s5);
}

.pl__world {
  pointer-events: auto;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: var(--text-micro);
  letter-spacing: 0.2em;
  text-indent: 0.2em;
  color: var(--text-dim);
  text-shadow: 0 1px 10px rgba(0, 0, 0, 0.8);
}
.pl__world-edit {
  color: var(--text-faint);
}

.pl__heaven {
  margin-top: var(--s2);
  font-family: var(--font-serif);
  font-size: 1.9rem;
  font-weight: 400;
  letter-spacing: 0.18em;
  text-indent: 0.18em;
  text-shadow: 0 2px 24px rgba(0, 0, 0, 0.9);
}

.pl__realm {
  margin-top: var(--s2);
  font-size: var(--text-micro);
  letter-spacing: 0.14em;
  color: var(--text-dim);
  text-shadow: 0 1px 12px rgba(0, 0, 0, 0.9);
}
.pl__realm--btn {
  pointer-events: auto;
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 3px var(--s3);
  border-radius: var(--r-full);
  background: rgba(0, 0, 0, 0.25);
  border: 1px solid var(--hairline);
}
.pl__realm-ico {
  color: var(--text-faint);
}

.pl__blurb {
  margin-top: var(--s2);
  font-size: var(--text-caption);
  line-height: 1.7;
  color: var(--text-dim);
  text-shadow: 0 1px 12px rgba(0, 0, 0, 0.9);
}

/* — Tier arrows ————————————————————————————— */
.pl__nav {
  position: absolute;
  z-index: 2;
  top: 42%;
  left: 0;
  right: 0;
  display: flex;
  justify-content: space-between;
  padding: 0 var(--s3);
  pointer-events: none;
}

.pl__arrow {
  pointer-events: auto;
  width: 42px;
  height: 42px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-size: 1.6rem;
  color: var(--text);
  background: rgba(0, 0, 0, 0.28);
  backdrop-filter: blur(var(--blur));
  -webkit-backdrop-filter: blur(var(--blur));
  border: 1px solid var(--hairline);
  transition: background var(--fast) var(--ease), opacity var(--fast) var(--ease);
}
.pl__arrow:disabled {
  opacity: 0;
  pointer-events: none;
}
.pl__arrow:hover {
  background: rgba(0, 0, 0, 0.44);
}

/* — Console ————————————————————————————————— */
.pl__console {
  position: absolute;
  z-index: 2;
  left: 0;
  right: 0;
  bottom: calc(var(--tabbar-h) + var(--safe-b) + var(--s3));
  padding: 0 var(--s4);
  max-width: var(--content-max);
  margin: 0 auto;
}

.pl__power {
  display: flex;
  align-items: center;
  gap: var(--s3);
}
.pl__power-label {
  flex-shrink: 0;
  font-size: var(--text-micro);
  letter-spacing: 0.1em;
  color: var(--text-dim);
  text-shadow: 0 1px 8px rgba(0, 0, 0, 0.9);
}
.pl__power-bar {
  flex: 1;
  height: 6px;
  border-radius: var(--r-full);
  background: rgba(0, 0, 0, 0.35);
  overflow: hidden;
}
.pl__power-fill {
  height: 100%;
  border-radius: var(--r-full);
  background: linear-gradient(90deg, #fbbf24, #fcd34d);
  box-shadow: 0 0 10px rgba(251, 191, 36, 0.8);
  transition: width var(--base) var(--ease-out);
}
.pl__power-num {
  flex-shrink: 0;
  font-size: var(--text-micro);
  color: var(--text-dim);
  text-shadow: 0 1px 8px rgba(0, 0, 0, 0.9);
}

.pl__builds {
  margin-top: var(--s3);
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--s2);
}

.pl__build {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.pl__build-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: var(--s2) 2px;
  border-radius: var(--r-md);
  background: rgba(0, 0, 0, 0.32);
  backdrop-filter: blur(var(--blur));
  -webkit-backdrop-filter: blur(var(--blur));
  border: 1px solid var(--hairline);
  transition: background var(--fast) var(--ease), opacity var(--fast) var(--ease);
}
.pl__build-btn:hover:not(:disabled) {
  background: rgba(0, 0, 0, 0.5);
}
.pl__build-btn:disabled {
  opacity: 0.4;
}
.pl__build-glyph {
  font-size: 1.2rem;
  line-height: 1;
}
.pl__build-name {
  font-size: var(--text-micro);
  letter-spacing: 0.04em;
}
.pl__build-cost {
  font-size: 10px;
  color: var(--amber);
}

.pl__build-count {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--s2);
  font-size: var(--text-micro);
  color: var(--text-dim);
}
.pl__minus {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  color: var(--text-dim);
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid var(--hairline);
}
.pl__minus:disabled {
  opacity: 0.3;
}

.pl__ascend {
  margin-top: var(--s3);
}

.pl__ascend-hint {
  margin-top: var(--s3);
  text-align: center;
}
.pl__ascend-hint p {
  font-size: var(--text-micro);
  color: var(--text-dim);
  text-shadow: 0 1px 8px rgba(0, 0, 0, 0.9);
}
.pl__ascend-bar {
  margin-top: var(--s2);
  height: 3px;
  border-radius: var(--r-full);
  background: rgba(0, 0, 0, 0.35);
  overflow: hidden;
}
.pl__ascend-fill {
  height: 100%;
  border-radius: var(--r-full);
  background: linear-gradient(90deg, var(--amethyst), var(--sapphire));
  transition: width var(--base) var(--ease-out);
}

.pl__extra {
  margin-top: var(--s3);
  display: flex;
  gap: var(--s2);
}
.pl__lamp-btn {
  flex: 1;
  padding: var(--s2) var(--s4);
  border-radius: var(--r-full);
  font-size: var(--text-caption);
  letter-spacing: 0.1em;
  color: #ffe0a0;
  background: rgba(120, 90, 30, 0.4);
  border: 1px solid rgba(251, 191, 36, 0.4);
  backdrop-filter: blur(var(--blur));
  -webkit-backdrop-filter: blur(var(--blur));
}

.pl__net-enter,
.pl__net-back {
  margin-top: var(--s3);
  width: 100%;
  padding: var(--s2) var(--s4);
  border-radius: var(--r-full);
  font-size: var(--text-caption);
  letter-spacing: 0.14em;
  color: #e9d8ff;
  background: rgba(90, 60, 140, 0.4);
  border: 1px solid rgba(167, 139, 250, 0.5);
  backdrop-filter: blur(var(--blur));
  -webkit-backdrop-filter: blur(var(--blur));
}
.pl__net-back {
  margin: 0;
  text-align: left;
}
/* Inside the flex extra-row the enter-net button sits beside the lamp button */
.pl__extra .pl__net-enter {
  flex: 1;
  margin-top: 0;
  width: auto;
}

/* — 諸天 jump list ————————————————————————————— */
.hlist {
  list-style: none;
  display: grid;
  gap: var(--s2);
}
.hrow {
  width: 100%;
  display: flex;
  align-items: center;
  gap: var(--s3);
  padding: var(--s2) var(--s3);
  border-radius: var(--r-md);
  text-align: left;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid var(--hairline);
  transition: background var(--fast) var(--ease);
}
.hrow:hover {
  background: rgba(255, 255, 255, 0.08);
}
.hrow--on {
  border-color: rgba(251, 191, 36, 0.5);
  background: rgba(251, 191, 36, 0.08);
}
.hrow__idx {
  flex-shrink: 0;
  width: 26px;
  text-align: center;
  font-size: var(--text-caption);
  color: var(--text-faint);
}
.hrow__main {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: baseline;
  gap: var(--s3);
}
.hrow__name {
  font-family: var(--font-serif);
  font-size: var(--text-body);
  letter-spacing: 0.06em;
}
.hrow__realm {
  font-size: var(--text-micro);
  color: var(--text-faint);
}
.hrow__here {
  flex-shrink: 0;
  font-size: var(--text-micro);
  letter-spacing: 0.08em;
  color: var(--amber);
}
.hlist__hint {
  margin-top: var(--s4);
  font-size: var(--text-micro);
  line-height: 1.7;
  color: var(--text-faint);
  text-align: center;
}

/* — 無盡燈 · 寶庫 sheet ————————————————————————— */
.lamp__light {
  margin-top: var(--s3);
  width: 100%;
  display: flex;
  align-items: center;
  gap: var(--s3);
  padding: var(--s3) var(--s4);
  border-radius: var(--r-md);
  text-align: left;
  color: #ffe6b0;
  background: linear-gradient(120deg, rgba(251, 191, 36, 0.18), rgba(251, 146, 60, 0.12));
  border: 1px solid rgba(251, 191, 36, 0.4);
  transition: transform var(--fast) var(--ease), background var(--fast) var(--ease);
}
.lamp__light:hover {
  background: linear-gradient(120deg, rgba(251, 191, 36, 0.26), rgba(251, 146, 60, 0.18));
}
.lamp__light:active {
  transform: scale(0.99);
}
.lamp__light-flame {
  font-size: 1.5rem;
}
.lamp__light-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}
.lamp__light-t {
  font-size: var(--text-body);
  letter-spacing: 0.06em;
}
.lamp__light-s {
  margin-top: 1px;
  font-size: var(--text-micro);
  color: var(--text-faint);
}
.lamp__light-plus {
  flex-shrink: 0;
  font-size: var(--text-body);
  color: var(--amber);
}

.lamp__sutra {
  font-family: var(--font-serif);
  font-size: var(--text-caption);
  line-height: 1.9;
  color: var(--text-dim);
  text-align: center;
}

.lamp__stats {
  margin-top: var(--s4);
  display: flex;
  justify-content: space-around;
  padding: var(--s3) 0;
  border-radius: var(--r-md);
  background: rgba(251, 191, 36, 0.06);
  border: 1px solid rgba(251, 191, 36, 0.2);
}
.lamp__stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}
.lamp__stat-n {
  font-size: 1.4rem;
  font-weight: 300;
  color: var(--amber);
}
.lamp__stat-l {
  font-size: var(--text-micro);
  letter-spacing: 0.08em;
  color: var(--text-faint);
}

.lamp__reclaim {
  margin-top: var(--s3);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--s3);
  padding: var(--s3);
  border-radius: var(--r-md);
  border: 1px solid var(--hairline);
}
.lamp__reclaim-t {
  font-size: var(--text-caption);
  letter-spacing: 0.04em;
}
.lamp__reclaim-s {
  margin-top: 2px;
  font-size: var(--text-micro);
  color: var(--text-faint);
}

.lamp__label {
  margin-top: var(--s5);
}
.lamp__empty {
  margin-top: var(--s3);
  font-size: var(--text-caption);
  color: var(--text-faint);
}

.lamp__days {
  list-style: none;
  margin-top: var(--s3);
  display: grid;
  gap: var(--s3);
}
.lamp__day-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
}
.lamp__day-date {
  font-size: var(--text-caption);
  letter-spacing: 0.04em;
  color: var(--text-dim);
}
.lamp__day-count {
  font-size: var(--text-micro);
  color: var(--text-faint);
}
.lamp__swatches {
  margin-top: var(--s2);
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}
.lamp__swatch {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  box-shadow: 0 0 6px -1px currentColor;
}

.pl__nopower {
  position: absolute;
  z-index: 2;
  left: 0;
  right: 0;
  bottom: calc(var(--tabbar-h) + var(--safe-b) + var(--s3));
  text-align: center;
  font-size: var(--text-micro);
  letter-spacing: 0.06em;
  color: var(--text-faint);
}

/* — Rename sheet ———————————————————————————— */
.pl__field {
  width: 100%;
  padding: var(--s3) var(--s4);
  border-radius: var(--r-md);
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid var(--hairline-strong);
  color: var(--text);
  font-size: var(--text-body);
  letter-spacing: 0.1em;
  text-align: center;
}
.pl__field:focus {
  outline: none;
  border-color: var(--accent);
}
.pl__save {
  margin-top: var(--s4);
}
.pl__suggest {
  list-style: none;
  margin-top: var(--s4);
  display: flex;
  flex-wrap: wrap;
  gap: var(--s2);
  justify-content: center;
}
.pl__chip {
  padding: var(--s2) var(--s3);
  border-radius: var(--r-full);
  font-size: var(--text-caption);
  letter-spacing: 0.06em;
  color: var(--text-dim);
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--hairline);
}
.pl__chip:hover {
  background: rgba(255, 255, 255, 0.12);
  color: var(--text);
}
</style>
