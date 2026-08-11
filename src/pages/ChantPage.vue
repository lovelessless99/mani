<template>
  <main class="page">
    <header>
      <h1 class="page-title">持咒 · 念佛</h1>
      <p class="page-sub">撥一顆數一遍,滿一輪即圓滿 · 每撥必記今日功課</p>
    </header>

    <section v-for="group in GROUPS" :key="group.key" class="group">
      <p class="group__head">{{ group.title }}</p>
      <ul class="beads">
        <li v-for="c in group.items" :key="c.id">
          <div class="card" :class="{ 'card--flash': flashId === c.id }">
            <div class="card__main">
              <h2 class="card__name">{{ c.name }}</h2>
              <p class="card__meta tnum">
                目標 {{ c.target }} 遍
                <template v-if="store.get(c.id).rounds"> · 已圓滿 {{ store.get(c.id).rounds }} 輪</template>
                · 累計 {{ store.total(c.id, c.target) }} 遍
              </p>
              <button class="card__round" type="button" @click="finishRound(c)">
                ＋ 一鍵圓滿一輪
              </button>
            </div>

            <button
              v-if="store.get(c.id).count || store.get(c.id).rounds"
              class="card__undo"
              type="button"
              aria-label="退一顆"
              @click="store.undo(c.id, c.target)"
            >
              ↺
            </button>

            <button class="bead" type="button" :aria-label="`${c.name} 撥一顆`" @click="tick(c)">
              <svg class="bead__ring" viewBox="0 0 100 100">
                <circle class="bead__track" cx="50" cy="50" r="44" />
                <circle
                  class="bead__fill"
                  cx="50"
                  cy="50"
                  r="44"
                  :stroke-dasharray="C"
                  :stroke-dashoffset="C * (1 - store.get(c.id).count / c.target)"
                />
              </svg>
              <span class="bead__count tnum">{{ store.get(c.id).count }}</span>
              <span class="bead__target tnum">/ {{ c.target }}</span>
            </button>
          </div>
        </li>
      </ul>
    </section>
  </main>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useChantStore } from 'src/stores/chantStore'
import { useChime } from 'src/composables/useChime'
import { useToast } from 'src/composables/useToast'
import chantsData from 'src/data/meta/chants.json'

interface Chant {
  id: string
  name: string
  target: number
}
const data = chantsData as { mantras: Chant[]; names: Chant[] }
const GROUPS = [
  { key: 'mantras', title: '持咒', items: data.mantras },
  { key: 'names', title: '稱名念佛', items: data.names },
]

const store = useChantStore()
const chime = useChime()
const toast = useToast()

const C = 2 * Math.PI * 44 // ring circumference
const flashId = ref('')

function celebrate(c: Chant) {
  chime.strike(1)
  flashId.value = c.id
  setTimeout(() => (flashId.value = ''), 900)
  toast.info(`圓滿一輪 · ${c.name} ${c.target} 遍 🙏`)
}

async function tick(c: Chant) {
  const completed = await store.tick(c.id, c.target)
  if (completed) celebrate(c)
}

// One tap banks a whole round — no need to press the bead 108 times.
async function finishRound(c: Chant) {
  await store.completeRound(c.id)
  celebrate(c)
}

onMounted(() => {
  store.load()
})
onBeforeUnmount(() => {
  store.flush()
})
</script>

<style scoped>
.group {
  margin-top: var(--s5);
}
.group__head {
  font-size: var(--text-micro);
  letter-spacing: 0.2em;
  text-indent: 0.2em;
  color: var(--text-faint);
  margin-bottom: var(--s3);
}

.beads {
  list-style: none;
  display: grid;
  gap: var(--s3);
}

.card {
  position: relative;
  display: flex;
  align-items: center;
  gap: var(--s3);
  padding: var(--s3) var(--s4);
  border-radius: var(--r-lg);
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid var(--hairline);
  transition: border-color var(--base) var(--ease), background var(--base) var(--ease);
}
.card--flash {
  border-color: rgba(251, 191, 36, 0.6);
  background: rgba(251, 191, 36, 0.09);
}

.card__main {
  flex: 1;
  min-width: 0;
}
.card__name {
  font-family: var(--font-serif);
  font-size: 1.15rem;
  letter-spacing: 0.06em;
}
.card__meta {
  margin-top: var(--s2);
  font-size: var(--text-micro);
  color: var(--text-faint);
  line-height: 1.6;
}
.card__round {
  margin-top: var(--s2);
  padding: 4px var(--s3);
  border-radius: var(--r-full);
  font-size: var(--text-micro);
  letter-spacing: 0.06em;
  color: var(--amber);
  background: rgba(251, 191, 36, 0.1);
  border: 1px solid rgba(251, 191, 36, 0.32);
  transition: background var(--fast) var(--ease);
}
.card__round:hover {
  background: rgba(251, 191, 36, 0.2);
}
.card__round:active {
  transform: scale(0.97);
}

.card__undo {
  position: absolute;
  top: var(--s2);
  right: var(--s2);
  width: 26px;
  height: 26px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  font-size: 15px;
  color: var(--text-faint);
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--hairline);
}
.card__undo:active {
  transform: scale(0.9);
}

/* — 念珠 counter — */
.bead {
  position: relative;
  flex-shrink: 0;
  width: 76px;
  height: 76px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.035);
  border: 1px solid var(--hairline);
  transition: transform var(--fast) var(--ease);
}
.bead:active {
  transform: scale(0.93);
}
.bead__ring {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
}
.bead__track {
  fill: none;
  stroke: rgba(255, 255, 255, 0.08);
  stroke-width: 5;
}
.bead__fill {
  fill: none;
  stroke: var(--amber);
  stroke-width: 5;
  stroke-linecap: round;
  transition: stroke-dashoffset var(--base) var(--ease-out);
}
.bead__count {
  grid-area: 1 / 1;
  font-size: 1.5rem;
  font-weight: 300;
  color: var(--text);
  line-height: 1;
  transform: translateY(-4px);
}
.bead__target {
  grid-area: 1 / 1;
  font-size: var(--text-micro);
  color: var(--text-faint);
  transform: translateY(15px);
}
</style>
