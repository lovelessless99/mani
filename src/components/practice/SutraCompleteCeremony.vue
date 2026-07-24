<template>
  <Teleport to="body">
    <Transition name="rite">
      <div v-if="guardian" class="rite" :style="{ '--c': guardian.color }" @click="$emit('dismiss')">
        <div class="rite__glow" />

        <div class="rite__stage">
          <!-- The sutra's own stones stream in and gather before the
               flower opens: the summoning is done by what you collected,
               not by an effect that happens to you. -->
          <div class="summon">
            <span
              v-for="(g, i) in orbs"
              :key="i"
              class="orb"
              :style="{
                '--c': g,
                '--a': `${(i / orbs.length) * 360}deg`,
                '--d': `${0.9 + (i % 5) * 0.06}`,
                animationDelay: `${(i % 7) * 0.075}s`,
              }"
            />
            <span class="flash" />
          </div>

          <LotusBloom :color="guardian.color" :delay="1.5" />
        </div>

        <div class="rite__card glass">
          <p class="rite__round">{{ heading }}</p>

          <!-- In Buddhist iconography a figure is known by what they
               hold. The emblem is the depiction, not a stand-in for one. -->
          <svg class="emblem" viewBox="0 0 100 100" aria-hidden="true">
            <g filter="url(#rite-glow)">
              <circle
                v-for="(r, i) in guardian.rings ?? []"
                :key="`r${i}`"
                :cx="r[0]"
                :cy="r[1]"
                :r="r[2]"
                class="emblem__ring"
              />
              <path
                v-for="(d, i) in guardian.paths"
                :key="`p${i}`"
                :d="d"
                class="emblem__path"
                :style="{ animationDelay: `${0.5 + i * 0.13}s` }"
              />
            </g>
            <defs>
              <filter id="rite-glow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="1.6" result="b" />
                <feMerge>
                  <feMergeNode in="b" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
          </svg>

          <p class="rite__emblem-name">{{ guardian.emblem }}</p>
          <h2 class="rite__name">{{ guardian.name }}</h2>
          <p class="rite__epithet">{{ guardian.epithet }}</p>

          <!-- The figure itself tells you how many 部 are complete -->
          <p v-if="round > 0" class="rite__kept">
            「汝已圓滿 <span class="rite__kept-n tnum">{{ round }}</span> 部,我為汝記之。」
          </p>

          <!-- 勉勵的話 — the figure speaks, line by line -->
          <p v-for="(line, i) in speeches" :key="i" class="rite__vow" :style="{ animationDelay: `${2.3 + i * 0.5}s` }">
            {{ line }}
          </p>
          <p class="rite__sutra">{{ sutraTitle }}</p>
        </div>

        <p class="rite__hint">點擊繼續</p>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import LotusBloom from './LotusBloom.vue'
import guardiansData from 'src/data/meta/sutra-guardians.json'

export interface Guardian {
  praise?: string[]
  name: string
  epithet: string
  color: string
  emblem: string
  vow: string
  paths: string[]
  rings?: [number, number, number][]
}

const props = defineProps<{
  /** Null closes the ceremony */
  sutraId: string | null
  sutraTitle: string
  round: number
  /** Colours of the gems earned from this sutra */
  gemColors?: string[]
  /**
   * 'complete' is the moment a 部 is finished; 'summon' is calling the
   * figure back afterwards from the collection. Same presence, different
   * thing to say — one marks an arrival, the other a return.
   */
  mode?: 'complete' | 'summon'
}>()

defineEmits<{ dismiss: [] }>()

const heading = computed(() =>
  props.mode === 'summon' ? '寶石召喚' : `圓滿 第 ${props.round} 部`
)

/**
 * The figure speaks — many words of encouragement, not one line. The vow
 * opens, then every line of praise follows, so a summoning feels like being
 * addressed rather than shown a caption.
 */
const speeches = computed<string[]>(() => {
  const g = guardian.value
  if (!g) return []
  const lines = [g.vow, ...(g.praise ?? [])].filter(Boolean) as string[]
  return lines
})


// The gems settle into a ring. Padded to a full circle by cycling the
// colours (so a one-gem 心經 still encircles the lotus) and capped so a
// completed 華嚴經 does not fling eighty at once.
const orbs = computed(() => {
  const cols = props.gemColors ?? []
  if (!cols.length) return []
  const count = Math.min(Math.max(cols.length, 18), 32)
  return Array.from({ length: count }, (_, i) => cols[i % cols.length])
})

const guardian = computed<Guardian | null>(() =>
  props.sutraId
    ? ((guardiansData as unknown as Record<string, Guardian>)[props.sutraId] ?? null)
    : null
)
</script>

<style scoped>
.rite {
  position: fixed;
  inset: 0;
  z-index: 1500;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  padding: var(--s5) var(--s5) calc(var(--tabbar-h) + var(--safe-b) + var(--s4));
  background: rgba(4, 4, 9, 0.95);
  cursor: pointer;
  overflow: hidden;
}

.rite__glow {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: radial-gradient(
    ellipse 68% 42% at 50% 34%,
    color-mix(in srgb, var(--c) 26%, transparent) 0%,
    transparent 68%
  );
  animation: swell 5s ease-in-out infinite;
}

@keyframes swell {
  0%,
  100% {
    opacity: 0.7;
    transform: scale(1);
  }
  50% {
    opacity: 1;
    transform: scale(1.06);
  }
}

/* — Summoning ——————————————————————————————
   Every gem flies in from outside and settles into an evenly-spaced ring,
   then the whole ring turns slowly while the lotus opens at its centre —
   the stones encircle and offer, rather than collapse and vanish. */
.summon {
  position: absolute;
  inset: 0;
  /* Above the lotus canvas so the ring of stones is never hidden behind it. */
  z-index: 2;
  pointer-events: none;
  animation: ring-spin 9s linear infinite;
}

@keyframes ring-spin {
  to {
    transform: rotate(360deg);
  }
}

.orb {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 15px;
  height: 15px;
  margin: -7.5px 0 0 -7.5px;
  border-radius: 50%;
  background: radial-gradient(circle at 36% 32%, #fff 0%, var(--c) 60%, transparent 100%);
  box-shadow: 0 0 16px 3px var(--c);
  opacity: 0;
  /* Each orb holds its --a angle; only the reach changes, so they land on
     an even circle. */
  animation: draw-ring 1.6s cubic-bezier(0.4, 0, 0.15, 1) forwards;
}

@keyframes draw-ring {
  0% {
    opacity: 0;
    transform: rotate(var(--a)) translateX(70vmin) scale(0.5);
  }
  25% {
    opacity: 1;
  }
  100% {
    opacity: 1;
    transform: rotate(var(--a)) translateX(24vmin) scale(1);
  }
}

.flash {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 12px;
  height: 12px;
  margin: -6px 0 0 -6px;
  border-radius: 50%;
  background: #fff;
  opacity: 0;
  animation: burst 1.1s ease-out 1.5s forwards;
}

@keyframes burst {
  0% {
    opacity: 0.9;
    transform: scale(1);
    box-shadow: 0 0 40px 12px var(--c);
  }
  100% {
    opacity: 0;
    transform: scale(14);
    box-shadow: 0 0 0 0 transparent;
  }
}

/* The lotus + ring occupy the upper half at z1; the card sits above it. */
.rite__stage {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 52%;
  z-index: 1;
}

.rite__card {
  position: relative;
  z-index: 2;
  width: min(23rem, 100%);
  padding: var(--s5);
  text-align: center;
  background: rgba(18, 16, 26, 0.78);
  border-color: color-mix(in srgb, var(--c) 32%, transparent);
  box-shadow:
    var(--shadow-3),
    inset 0 1px 0 rgba(255, 255, 255, 0.08),
    0 0 44px -18px var(--c);
  animation: rise 0.7s var(--ease-out) 1.9s both;
}

@keyframes rise {
  from {
    opacity: 0;
    transform: translateY(24px);
  }
}

.rite__round {
  font-size: var(--text-micro);
  font-weight: 500;
  letter-spacing: 0.3em;
  text-indent: 0.3em;
  color: var(--c);
}

/* — Emblem —————————————————————————————————— */
.emblem {
  width: 92px;
  height: 92px;
  margin: var(--s4) auto var(--s3);
  overflow: visible;
}

.emblem__path,
.emblem__ring {
  fill: none;
  stroke: var(--c);
  stroke-width: 2.2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.emblem__ring {
  stroke-width: 1.6;
  opacity: 0;
  animation: fade-in 1s ease 0.9s forwards;
}

/* Strokes draw themselves in, the way a brush lays down a line */
.emblem__path {
  stroke-dasharray: 220;
  stroke-dashoffset: 220;
  animation: draw 1.1s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

@keyframes draw {
  to {
    stroke-dashoffset: 0;
  }
}

@keyframes fade-in {
  to {
    opacity: 0.55;
  }
}

.rite__emblem-name {
  font-size: var(--text-micro);
  letter-spacing: 0.28em;
  text-indent: 0.28em;
  color: var(--text-faint);
}

.rite__name {
  margin-top: var(--s2);
  font-family: var(--font-serif);
  font-size: var(--text-title);
  font-weight: 400;
  letter-spacing: 0.14em;
}

.rite__epithet {
  margin-top: var(--s1);
  font-size: var(--text-micro);
  letter-spacing: 0.26em;
  text-indent: 0.26em;
  color: var(--c);
}

.rite__kept {
  margin-top: var(--s4);
  font-family: var(--font-serif);
  font-size: var(--text-caption);
  letter-spacing: 0.05em;
  color: var(--c);
  opacity: 0;
  animation: speak-in 0.6s var(--ease-out) 2.1s both;
}
.rite__kept-n {
  font-size: var(--text-body);
  font-weight: 600;
}

.rite__vow {
  margin-top: var(--s3);
  font-family: var(--font-serif);
  font-size: var(--text-caption);
  line-height: 2.05;
  letter-spacing: 0.05em;
  color: var(--text-dim);
  opacity: 0;
  animation: speak-in 0.6s var(--ease-out) both;
}
@keyframes speak-in {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

.rite__sutra {
  margin-top: var(--s4);
  padding-top: var(--s3);
  border-top: 1px solid var(--hairline);
  font-size: var(--text-micro);
  letter-spacing: 0.12em;
  color: var(--text-faint);
}

.rite__hint {
  position: relative;
  margin-top: var(--s5);
  font-size: var(--text-micro);
  letter-spacing: 0.24em;
  color: var(--text-faint);
  animation: blink 2.4s ease-in-out infinite;
}

@keyframes blink {
  0%,
  100% {
    opacity: 0.45;
  }
  50% {
    opacity: 1;
  }
}

.rite-enter-active,
.rite-leave-active {
  transition: opacity var(--slow) var(--ease);
}
.rite-enter-from,
.rite-leave-to {
  opacity: 0;
}
</style>
