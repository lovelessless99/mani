<template>
  <main class="home">
    <!-- The sea is the page's background, not a banner across the top.
         Painted stand-in first, so the route has something to show
         before the WebGL bundle arrives. -->
    <div class="poster" :class="{ 'poster--out': sceneReady }" />

    <OceanScene
      v-if="showScene"
      class="scene"
      :mode="mode"
      :still="reduceMotion"
      @vue:mounted="sceneReady = true"
    />

    <div class="veil" :class="{ 'veil--day': mode === 'day' }" />

    <button
      class="toggle"
      type="button"
      :aria-label="mode === 'day' ? '切換為夜晚' : '切換為白天'"
      @click="toggleMode"
    >
      <AppIcon :name="mode === 'day' ? 'sun' : 'moon'" :size="17" />
    </button>

    <!-- Content floats over the water. Pointer events are off except on
         the controls, so the sea can be dragged from almost anywhere. -->
    <div class="content">
      <div class="today">
        <p class="today__date">{{ todayLabel }}</p>
        <p v-if="fast.isFastDay.value" class="today__fast">
          ✦ 今日為十齋日 · {{ fast.lunarLabel.value }} ✦
        </p>
        <h1 class="today__name">{{ todayFigure.name }}</h1>
        <p class="today__epithet">{{ todayFigure.epithet }}</p>
        <p class="today__line">{{ todayLine }}</p>
      </div>

      <button
        class="seed"
        type="button"
        :class="{ 'seed--lit': streak.shownCount > 0 }"
        @click="router.push('/dashboard')"
      >
        <span class="seed__glyph">{{ streak.stage.glyph }}</span>
        <span class="seed__text">
          <span class="seed__count tnum">{{ streak.shownCount }}</span>
          <span class="seed__unit">天 · {{ streak.stage.name }}</span>
        </span>
        <span v-if="streak.nextStage" class="seed__next">
          再 {{ streak.nextStage.at - streak.shownCount }} 天 {{ streak.nextStage.name }}
        </span>
      </button>

      <button v-if="taskPending" class="remind" type="button" @click="router.push('/practice')">
        <span class="remind__dot" />
        <span class="remind__text">今日功課尚未圓滿 · 抽一張功課卡</span>
        <span class="remind__go">›</span>
      </button>

      <section class="ledger">
        <dl class="stats">
          <div class="stat">
            <dt>念經</dt>
            <dd class="tnum" style="color: var(--sapphire)">{{ totals.recite }}</dd>
          </div>
          <div class="stat">
            <dt>背誦</dt>
            <dd class="tnum" style="color: var(--amethyst)">{{ totals.memorize }}</dd>
          </div>
          <div class="stat">
            <dt>寶石</dt>
            <dd class="tnum" style="color: var(--amber)">{{ gemStore.gemsList.length }}</dd>
          </div>
        </dl>

        <AppButton variant="glass" block class="cta" @click="router.push('/practice')">
          開始功課
        </AppButton>
      </section>
    </div>
  </main>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, defineAsyncComponent } from 'vue'
import { useRouter } from 'vue-router'
import AppButton from 'src/components/ui/AppButton.vue'
import AppIcon from 'src/components/ui/AppIcon.vue'
import { useProgressStore } from 'src/stores/progressStore'
import { useGemStore } from 'src/stores/gemStore'
import { useStreakStore } from 'src/stores/streakStore'
import { useDailyStore } from 'src/stores/dailyStore'
import { getAllSutras } from 'src/services/sutraService'
import { useToast, describeError } from 'src/composables/useToast'
import { useDailyTask } from 'src/composables/useDailyTask'
import { useNotify } from 'src/composables/useNotify'
import blessingsData from 'src/data/meta/blessings.json'
import { useFastDay } from 'src/composables/useFastDay'

// Three.js is ~1MB. Keeping the scene behind an async boundary means the
// home route paints immediately and the sea arrives a beat later, rather
// than the whole app waiting on a WebGL bundle before it shows anything.
const OceanScene = defineAsyncComponent(
  () => import('src/components/home/OceanScene.vue')
)

interface Figure {
  name: string
  epithet: string
  color: string
  lines: string[]
}

const router = useRouter()
const progressStore = useProgressStore()
const gemStore = useGemStore()
const streak = useStreakStore()
const dailyStore = useDailyStore()
const daily = useDailyTask()
const notify = useNotify()
const toast = useToast()

// Nudge only once there is a real, unfinished course for today.
const taskPending = computed(
  () =>
    daily.items.value.length > 0 &&
    !daily.items.value.every((it) => dailyStore.isDone(it.slot))
)

const showScene = ref(false)
const sceneReady = ref(false)
const reduceMotion = ref(false)

const MODE_KEY = 'sky-mode'
const mode = ref<'night' | 'day'>('night')

function toggleMode() {
  mode.value = mode.value === 'night' ? 'day' : 'night'
  try {
    localStorage.setItem(MODE_KEY, mode.value)
  } catch {
    // Private browsing can refuse storage; the choice just won't persist
  }
}

/**
 * One figure keeps watch per day, chosen from the day number so it holds
 * all day and turns over at midnight — a presence you come back to, not
 * a reroll on every visit.
 */
const dayIndex = Math.floor(Date.now() / 86_400_000)
const figures = blessingsData.figures as Figure[]
const todayFigure = figures[dayIndex % figures.length]
const todayLine = todayFigure.lines[dayIndex % todayFigure.lines.length]

const fast = useFastDay()

const todayLabel = computed(() =>
  new Date().toLocaleDateString('zh-TW', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  })
)

const totals = computed(() => {
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

onMounted(async () => {
  // Reduced motion stills the sea; it does not remove it. Dropping the
  // scene entirely would leave these users staring at a flat gradient
  // where the whole picture is supposed to be.
  reduceMotion.value = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  try {
    const saved = localStorage.getItem(MODE_KEY)
    if (saved === 'day' || saved === 'night') mode.value = saved
  } catch {
    // Ignore storage being unavailable
  }

  const start = () => {
    showScene.value = true
  }
  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(start, { timeout: 1500 })
  } else {
    setTimeout(start, 400)
  }

  try {
    await Promise.all([
      progressStore.loadAllProgress(),
      gemStore.loadGems(),
      streak.load(),
      dailyStore.load(),
    ])
    // Refresh the evening reminder each visit (where the browser can schedule).
    void notify.scheduleDaily()
  } catch (e) {
    toast.error(describeError(e))
  }
})
</script>

<style scoped>
.home {
  position: relative;
  min-height: 100vh;
  min-height: 100dvh;
  overflow: hidden;
}

.scene,
.poster,
.veil {
  position: absolute;
  inset: 0;
}

.poster {
  background:
    radial-gradient(circle at 50% 26%, rgba(244, 241, 228, 0.45) 0%, transparent 6%),
    radial-gradient(circle at 50% 26%, rgba(200, 214, 238, 0.12) 0%, transparent 24%),
    linear-gradient(to bottom, transparent 0%, transparent 40%, #060911 42%, #04060f 100%);
  transition: opacity var(--slow) var(--ease);
}

.poster--out {
  opacity: 0;
}

/* Darkens only the lower half, where the text sits. The sky is left
   alone — a film over it would dull the stars. */
.veil {
  pointer-events: none;
  transition: background var(--slow) var(--ease);
  background: linear-gradient(
    to bottom,
    transparent 0%,
    transparent 42%,
    rgba(6, 8, 16, 0.45) 62%,
    rgba(5, 6, 12, 0.82) 84%,
    rgba(4, 5, 10, 0.92) 100%
  );
}

.veil--day {
  background: linear-gradient(
    to bottom,
    transparent 0%,
    transparent 38%,
    rgba(6, 12, 22, 0.42) 58%,
    rgba(5, 8, 16, 0.8) 82%,
    rgba(4, 6, 12, 0.92) 100%
  );
}

.toggle {
  position: absolute;
  z-index: 2;
  top: calc(var(--safe-t) + var(--s4));
  right: var(--s4);
  width: 38px;
  height: 38px;
  display: grid;
  place-items: center;
  border-radius: var(--r-full);
  color: var(--text-dim);
  background: rgba(255, 255, 255, 0.07);
  backdrop-filter: blur(var(--blur));
  -webkit-backdrop-filter: blur(var(--blur));
  border: 1px solid var(--hairline);
  transition:
    color var(--fast) var(--ease),
    background var(--fast) var(--ease);
}

.toggle:hover {
  color: var(--text);
  background: rgba(255, 255, 255, 0.14);
}

.toggle:active {
  transform: scale(0.93);
}

.toggle:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

/* — Content over the water ————————————————— */
.content {
  position: relative;
  z-index: 1;
  min-height: 100vh;
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  gap: var(--s6);
  max-width: var(--content-max);
  margin: 0 auto;
  padding: 0 var(--s4) calc(var(--tabbar-h) + var(--safe-b) + var(--s5));
  /* Transparent to the pointer so the sea can be turned from anywhere;
     the controls below switch it back on for themselves. */
  pointer-events: none;
}

.today {
  text-align: center;
}

.today__date {
  font-size: var(--text-micro);
  letter-spacing: 0.24em;
  text-indent: 0.24em;
  color: var(--text-faint);
}

.today__name {
  margin-top: var(--s3);
  font-family: var(--font-serif);
  font-size: 1.6rem;
  font-weight: 400;
  letter-spacing: 0.2em;
  text-indent: 0.2em;
  text-shadow: 0 2px 24px rgba(0, 0, 0, 0.85);
}

.today__fast {
  margin-top: var(--s2);
  display: inline-block;
  padding: 3px var(--s3);
  border-radius: var(--r-full);
  font-size: var(--text-micro);
  letter-spacing: 0.14em;
  color: var(--amber);
  background: rgba(251, 191, 36, 0.12);
  border: 1px solid rgba(251, 191, 36, 0.35);
  text-shadow: 0 1px 10px rgba(0, 0, 0, 0.7);
}

.today__epithet {
  margin-top: var(--s2);
  font-size: var(--text-micro);
  letter-spacing: 0.3em;
  text-indent: 0.3em;
  color: var(--text-faint);
}

.today__line {
  margin: var(--s4) auto 0;
  max-width: 21rem;
  font-family: var(--font-serif);
  font-size: var(--text-caption);
  line-height: 2.1;
  letter-spacing: 0.06em;
  color: var(--text-dim);
  text-shadow: 0 1px 14px rgba(0, 0, 0, 0.7);
}

/* — Daily reminder nudge ———————————————————————— */
.remind {
  align-self: center;
  pointer-events: auto;
  display: inline-flex;
  align-items: center;
  gap: var(--s2);
  padding: var(--s2) var(--s4);
  border-radius: var(--r-full);
  background: rgba(251, 191, 36, 0.12);
  border: 1px solid rgba(251, 191, 36, 0.32);
  backdrop-filter: blur(var(--blur));
  -webkit-backdrop-filter: blur(var(--blur));
  transition: background var(--fast) var(--ease);
}
.remind:hover {
  background: rgba(251, 191, 36, 0.2);
}
.remind:active {
  transform: scale(0.98);
}
.remind__dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--amber);
  box-shadow: 0 0 8px var(--amber);
  animation: remind-pulse 2s ease-in-out infinite;
}
@keyframes remind-pulse {
  50% {
    opacity: 0.4;
  }
}
.remind__text {
  font-size: var(--text-caption);
  letter-spacing: 0.04em;
  color: #ffe0a0;
}
.remind__go {
  color: var(--amber);
}

/* — 菩提種子 streak ————————————————————————— */
.seed {
  align-self: center;
  pointer-events: auto;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: var(--s3);
  padding: var(--s2) var(--s4);
  border-radius: var(--r-full);
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--hairline);
  backdrop-filter: blur(var(--blur));
  -webkit-backdrop-filter: blur(var(--blur));
  transition: border-color var(--base) var(--ease), background var(--base) var(--ease);
}

.seed--lit {
  background: rgba(134, 239, 172, 0.08);
  border-color: rgba(134, 239, 172, 0.32);
}

.seed__glyph {
  font-size: 1.15rem;
  line-height: 1;
  filter: drop-shadow(0 1px 8px rgba(0, 0, 0, 0.6));
}

.seed__text {
  display: inline-flex;
  align-items: baseline;
  gap: 4px;
}

.seed__count {
  font-size: 1.05rem;
  font-weight: 300;
  color: var(--text);
}

.seed--lit .seed__count {
  color: #86efac;
}

.seed__unit {
  font-size: var(--text-micro);
  letter-spacing: 0.1em;
  color: var(--text-faint);
}

.seed__next {
  padding-left: var(--s3);
  border-left: 1px solid var(--hairline);
  font-size: var(--text-micro);
  letter-spacing: 0.06em;
  color: var(--text-faint);
}

.stats {
  display: flex;
  justify-content: center;
  gap: var(--s7);
}

.stat {
  text-align: center;
}

.stat dt {
  font-size: var(--text-micro);
  letter-spacing: 0.18em;
  text-indent: 0.18em;
  color: var(--text-faint);
}

.stat dd {
  margin-top: var(--s2);
  font-size: 1.75rem;
  font-weight: 200;
  line-height: 1;
}

.cta {
  margin-top: var(--s5);
  pointer-events: auto;
}
</style>
