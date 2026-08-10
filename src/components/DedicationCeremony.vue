<template>
  <Teleport to="body">
    <Transition name="ded">
      <div v-if="open" class="ded" @click="onTap">
        <div class="ded__light" />

        <div class="ded__inner">
          <p class="ded__target">迴向 · {{ targetName }}</p>

          <div class="ded__verse">
            <p
              v-for="(line, i) in lines"
              :key="i"
              class="ded__line"
              :class="{ 'ded__line--in': i < revealed }"
            >
              {{ line }}
            </p>
          </div>

          <Transition name="fade">
            <div v-if="revealed >= lines.length" class="ded__foot">
              <p class="ded__merit tnum">迴向功德 {{ merit }} · 燈明不盡</p>
              <p class="ded__hint">點擊完成</p>
            </div>
          </Transition>
        </div>

        <!-- Motes of light rising as the verse is spoken -->
        <span v-for="n in 18" :key="`m${n}`" class="mote" :style="moteStyle(n)" />
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch, onBeforeUnmount } from 'vue'

const props = defineProps<{
  open: boolean
  lines: string[]
  targetName: string
  merit: number
}>()

const emit = defineEmits<{ done: [] }>()

const revealed = ref(0)
let timer: ReturnType<typeof setInterval> | null = null

function stop() {
  if (timer) clearInterval(timer)
  timer = null
}

// One line at a time, at about the pace the verse is actually recited.
watch(
  () => props.open,
  (isOpen) => {
    stop()
    revealed.value = 0
    if (!isOpen) return
    timer = setInterval(() => {
      if (revealed.value >= props.lines.length) return stop()
      revealed.value += 1
    }, 900)
  },
  { immediate: true }
)

function onTap() {
  // Tapping early reveals the rest rather than skipping the dedication
  if (revealed.value < props.lines.length) {
    stop()
    revealed.value = props.lines.length
    return
  }
  emit('done')
}

function moteStyle(n: number) {
  return {
    left: `${(n * 37) % 100}%`,
    animationDelay: `${(n % 9) * 0.7}s`,
    animationDuration: `${7 + (n % 5) * 1.4}s`,
  }
}

onBeforeUnmount(stop)
</script>

<style scoped>
.ded {
  position: fixed;
  inset: 0;
  z-index: 1450;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--s5);
  background: rgba(5, 5, 10, 0.94);
  overflow: hidden;
  cursor: pointer;
}

/* Light gathering from below, the direction merit is offered upward */
.ded__light {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: radial-gradient(
    ellipse 70% 46% at 50% 104%,
    rgba(251, 191, 36, 0.22) 0%,
    rgba(167, 139, 250, 0.12) 40%,
    transparent 72%
  );
  animation: swell 6s ease-in-out infinite;
}

@keyframes swell {
  0%,
  100% {
    opacity: 0.7;
    transform: scale(1);
  }
  50% {
    opacity: 1;
    transform: scale(1.07);
  }
}

.ded__inner {
  position: relative;
  text-align: center;
}

.ded__target {
  font-size: var(--text-micro);
  letter-spacing: 0.3em;
  text-indent: 0.3em;
  color: var(--text-faint);
}

.ded__verse {
  margin-top: var(--s6);
}

.ded__line {
  font-family: var(--font-serif);
  font-size: 1.25rem;
  font-weight: 400;
  letter-spacing: 0.26em;
  text-indent: 0.26em;
  line-height: 2.5;
  color: #fff;
  opacity: 0;
  transform: translateY(10px);
  transition:
    opacity 1s var(--ease),
    transform 1s var(--ease-out);
}

.ded__line--in {
  opacity: 1;
  transform: translateY(0);
  text-shadow: 0 0 22px rgba(251, 191, 36, 0.4);
}

.ded__foot {
  margin-top: var(--s6);
}

.ded__merit {
  font-size: var(--text-caption);
  letter-spacing: 0.1em;
  color: var(--amber);
}

.ded__hint {
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

/* — Rising motes ——————————————————————————— */
.mote {
  position: absolute;
  bottom: -12px;
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: rgba(255, 226, 160, 0.9);
  box-shadow: 0 0 8px rgba(251, 191, 36, 0.8);
  pointer-events: none;
  animation-name: rise;
  animation-timing-function: linear;
  animation-iteration-count: infinite;
}

@keyframes rise {
  0% {
    opacity: 0;
    transform: translateY(0) scale(0.6);
  }
  12% {
    opacity: 1;
  }
  80% {
    opacity: 0.8;
  }
  100% {
    opacity: 0;
    transform: translateY(-105vh) scale(1.1);
  }
}

/* — Transitions ————————————————————————————— */
.ded-enter-active,
.ded-leave-active {
  transition: opacity var(--slow) var(--ease);
}
.ded-enter-from,
.ded-leave-to {
  opacity: 0;
}

.fade-enter-active {
  transition: opacity var(--slow) var(--ease);
}
.fade-enter-from {
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .ded__light,
  .mote,
  .ded__hint {
    animation: none;
  }
  .mote {
    display: none;
  }
}
</style>
