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
          <p class="rite__vow">{{ words }}</p>
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

const words = computed(() => {
  const g = guardian.value
  if (!g) return ''
  if (props.mode !== 'summon' || !g.praise?.length) return g.vow
  // Rotate on the round so a repeat summoning is not the same words
  return g.praise[(props.round - 1) % g.praise.length]
})

// Capped so a completed 華嚴經 does not fling eighty orbs at once
const orbs = computed(() => (props.gemColors ?? []).slice(0, 24))

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
   Each orb starts out at its own angle and spirals in to the centre,
   so they converge as a gathering rather than a straight collapse. */
.summon {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.orb {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 12px;
  height: 12px;
  margin: -6px 0 0 -6px;
  border-radius: 50%;
  background: radial-gradient(circle at 36% 32%, #fff 0%, var(--c) 62%, transparent 100%);
  box-shadow: 0 0 14px 2px var(--c);
  opacity: 0;
  animation: draw-in 1.5s cubic-bezier(0.5, 0, 0.2, 1) forwards;
}

@keyframes draw-in {
  0% {
    opacity: 0;
    transform: rotate(var(--a)) translateX(calc(var(--d) * 62vmin)) rotate(calc(var(--a) * -1)) scale(0.6);
  }
  18% {
    opacity: 1;
  }
  88% {
    opacity: 1;
    transform: rotate(calc(var(--a) + 150deg)) translateX(2vmin) rotate(calc((var(--a) + 150deg) * -1)) scale(1);
  }
  100% {
    opacity: 0;
    transform: rotate(calc(var(--a) + 170deg)) translateX(0) scale(0.3);
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
  animation: burst 0.9s ease-out 1.35s forwards;
}

@keyframes burst {
  0% {
    opacity: 0.95;
    transform: scale(1);
    box-shadow: 0 0 40px 12px var(--c);
  }
  100% {
    opacity: 0;
    transform: scale(26);
    box-shadow: 0 0 0 0 transparent;
  }
}

/* The lotus occupies the upper half; the card sits below it */
.rite__stage {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 52%;
}

.rite__card {
  position: relative;
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

.rite__vow {
  margin-top: var(--s4);
  font-family: var(--font-serif);
  font-size: var(--text-caption);
  line-height: 2.1;
  letter-spacing: 0.05em;
  color: var(--text-dim);
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
