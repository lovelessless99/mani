<template>
  <Teleport to="body">
    <Transition name="medal">
      <div v-if="shown" class="medal-scrim" @click="dismiss">
        <div class="medal" :class="`medal--${shown.tier}`" @click.stop>
          <div class="medal__halo" />
          <div class="medal__disc">
            <span class="medal__glyph">{{ shown.glyph }}</span>
          </div>
          <p class="medal__eyebrow">獲得獎牌</p>
          <h2 class="medal__name">{{ shown.name }}</h2>
          <p class="medal__desc">{{ shown.desc }}</p>
          <button class="medal__btn" type="button" @click="dismiss">收下</button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import type { Achievement } from 'src/stores/achievementStore'

const props = defineProps<{ medal: Achievement | null }>()
const emit = defineEmits<{ dismiss: [] }>()

// Latch the medal so its details survive the leave transition after the
// source ref is cleared.
const shown = ref<Achievement | null>(null)
watch(
  () => props.medal,
  (m) => {
    if (m) shown.value = m
  },
  { immediate: true }
)

function dismiss() {
  emit('dismiss')
  // Let the transition play before dropping the content.
  setTimeout(() => {
    shown.value = null
  }, 300)
}
</script>

<style scoped>
.medal-scrim {
  position: fixed;
  inset: 0;
  z-index: 1300;
  display: grid;
  place-items: center;
  padding: var(--s5);
  background: rgba(6, 8, 16, 0.9);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
}

.medal {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: var(--s6) var(--s5) var(--s5);
}

.medal__halo {
  position: absolute;
  top: -12%;
  width: 220px;
  height: 220px;
  border-radius: 50%;
  filter: blur(28px);
  opacity: 0.55;
  animation: halo 4s ease-in-out infinite;
}

.medal--bronze .medal__halo {
  background: radial-gradient(circle, #d9a066, transparent 70%);
}
.medal--silver .medal__halo {
  background: radial-gradient(circle, #cfd8e6, transparent 70%);
}
.medal--gold .medal__halo {
  background: radial-gradient(circle, #f4cf6b, transparent 70%);
}

@keyframes halo {
  50% {
    transform: scale(1.12);
    opacity: 0.75;
  }
}

.medal__disc {
  position: relative;
  width: 128px;
  height: 128px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  animation: disc-in 0.6s var(--ease-out) both;
  box-shadow:
    inset 0 2px 8px rgba(255, 255, 255, 0.5),
    inset 0 -4px 12px rgba(0, 0, 0, 0.35),
    0 8px 30px rgba(0, 0, 0, 0.5);
}

.medal--bronze .medal__disc {
  background: conic-gradient(from 210deg, #8a5a34, #d9a066, #f0c79a, #b9784a, #8a5a34);
}
.medal--silver .medal__disc {
  background: conic-gradient(from 210deg, #8a94a6, #cfd8e6, #ffffff, #a6b0c2, #8a94a6);
}
.medal--gold .medal__disc {
  background: conic-gradient(from 210deg, #b8860b, #f4cf6b, #fff2c4, #d9a520, #b8860b);
}

@keyframes disc-in {
  from {
    transform: scale(0.4) rotate(-30deg);
    opacity: 0;
  }
}

.medal__glyph {
  font-size: 3.2rem;
  line-height: 1;
  color: rgba(30, 22, 10, 0.72);
  text-shadow: 0 1px 1px rgba(255, 255, 255, 0.4);
}

.medal__eyebrow {
  margin-top: var(--s4);
  font-size: var(--text-micro);
  letter-spacing: 0.3em;
  text-indent: 0.3em;
  color: var(--text-faint);
}

.medal__name {
  margin-top: var(--s2);
  font-family: var(--font-serif);
  font-size: 1.7rem;
  font-weight: 400;
  letter-spacing: 0.16em;
  text-indent: 0.16em;
}

.medal__desc {
  margin-top: var(--s2);
  font-size: var(--text-caption);
  letter-spacing: 0.04em;
  color: var(--text-dim);
}

.medal__btn {
  margin-top: var(--s5);
  padding: var(--s2) var(--s6);
  border-radius: var(--r-full);
  font-size: var(--text-caption);
  letter-spacing: 0.16em;
  text-indent: 0.16em;
  color: #fff;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid var(--hairline-strong);
  transition: background var(--fast) var(--ease);
}
.medal__btn:hover {
  background: rgba(255, 255, 255, 0.18);
}
.medal__btn:active {
  transform: scale(0.96);
}

.medal-enter-active,
.medal-leave-active {
  transition: opacity var(--base) var(--ease);
}
.medal-enter-from,
.medal-leave-to {
  opacity: 0;
}
</style>
