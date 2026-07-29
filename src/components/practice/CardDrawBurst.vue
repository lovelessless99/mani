<template>
  <div class="burst" aria-hidden="true">
    <div class="burst__flash" />
    <div class="burst__rays" />
    <div class="burst__ring" />
    <div class="burst__seal">卍</div>
    <span
      v-for="s in sparks"
      :key="s.i"
      class="burst__spark"
      :style="{ '--tx': `${s.x}px`, '--ty': `${s.y}px`, '--dur': `${s.dur}ms`, '--delay': `${s.delay}ms`, background: s.c }"
    />
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'

const emit = defineEmits<{ done: [] }>()

// A ring of sparks flung outward at slightly random angles/distances.
const sparks = Array.from({ length: 18 }, (_, i) => {
  const a = (Math.PI * 2 * i) / 18 + (Math.random() - 0.5) * 0.35
  const r = 130 + Math.random() * 150
  return {
    i,
    x: Math.cos(a) * r,
    y: Math.sin(a) * r,
    dur: 620 + Math.random() * 420,
    delay: Math.random() * 120,
    c: i % 3 === 0 ? '#fff3cf' : '#f4cf75',
  }
})

onMounted(() => {
  const t = setTimeout(() => emit('done'), 1250)
  return () => clearTimeout(t)
})
</script>

<style scoped>
.burst {
  position: fixed;
  inset: 0;
  z-index: 300;
  display: grid;
  place-items: center;
  pointer-events: none;
  overflow: hidden;
}

/* Central golden flash */
.burst__flash {
  position: absolute;
  width: 46vmax;
  height: 46vmax;
  border-radius: 50%;
  background: radial-gradient(
    circle,
    rgba(255, 244, 214, 0.95) 0%,
    rgba(245, 205, 110, 0.55) 26%,
    rgba(245, 205, 110, 0) 62%
  );
  animation: flash 0.9s cubic-bezier(0.2, 0.7, 0.2, 1) both;
}
@keyframes flash {
  0% {
    transform: scale(0.1);
    opacity: 0;
  }
  22% {
    opacity: 1;
  }
  100% {
    transform: scale(1);
    opacity: 0;
  }
}

/* Rotating light rays */
.burst__rays {
  position: absolute;
  width: 150vmax;
  height: 150vmax;
  background: repeating-conic-gradient(
    rgba(255, 236, 180, 0.28) 0deg 5deg,
    transparent 5deg 15deg
  );
  animation: rays 1.15s ease-out both;
}
@keyframes rays {
  0% {
    transform: scale(0.2) rotate(0deg);
    opacity: 0;
  }
  30% {
    opacity: 0.9;
  }
  100% {
    transform: scale(1) rotate(38deg);
    opacity: 0;
  }
}

/* Expanding shockwave ring */
.burst__ring {
  position: absolute;
  width: 12vmax;
  height: 12vmax;
  border-radius: 50%;
  border: 2px solid rgba(255, 238, 190, 0.9);
  animation: ring 1s ease-out both;
}
@keyframes ring {
  0% {
    transform: scale(0.2);
    opacity: 0;
  }
  20% {
    opacity: 1;
  }
  100% {
    transform: scale(4.4);
    opacity: 0;
  }
}

/* 卍 seal punches up and fades */
.burst__seal {
  position: absolute;
  font-size: 5.4rem;
  color: #f6dd97;
  text-shadow: 0 0 22px rgba(246, 208, 117, 0.85);
  animation: seal 1.05s cubic-bezier(0.18, 0.8, 0.2, 1) both;
}
@keyframes seal {
  0% {
    transform: scale(0.3) rotate(-24deg);
    opacity: 0;
  }
  35% {
    transform: scale(1.12) rotate(0deg);
    opacity: 1;
  }
  70% {
    transform: scale(1) rotate(0deg);
    opacity: 1;
  }
  100% {
    transform: scale(1.3) rotate(0deg);
    opacity: 0;
  }
}

.burst__spark {
  position: absolute;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  box-shadow: 0 0 8px currentColor;
  animation: spark var(--dur) ease-out var(--delay) both;
}
@keyframes spark {
  0% {
    transform: translate(0, 0) scale(1);
    opacity: 0;
  }
  15% {
    opacity: 1;
  }
  100% {
    transform: translate(var(--tx), var(--ty)) scale(0.2);
    opacity: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .burst__flash,
  .burst__rays,
  .burst__ring,
  .burst__seal,
  .burst__spark {
    animation-duration: 0.4s;
  }
}
</style>
