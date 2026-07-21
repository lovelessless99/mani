<template>
  <span class="spinner" :style="{ '--sz': `${size}px` }" role="status" aria-label="載入中">
    <span v-for="i in 3" :key="i" class="spinner__dot" :style="{ '--i': i - 1 }" />
  </span>
</template>

<script setup lang="ts">
withDefaults(defineProps<{ size?: number }>(), { size: 32 })
</script>

<style scoped>
/* Three breathing dots — quieter than a spinning ring, and it
   suits an app about recitation and rhythm. */
.spinner {
  display: inline-flex;
  align-items: center;
  gap: calc(var(--sz) / 5);
  height: var(--sz);
}

.spinner__dot {
  width: calc(var(--sz) / 5);
  height: calc(var(--sz) / 5);
  border-radius: 50%;
  background: currentColor;
  color: var(--accent);
  opacity: 0.25;
  animation: breathe 1.4s var(--ease) infinite;
  animation-delay: calc(var(--i) * 0.16s);
}

@keyframes breathe {
  0%,
  70%,
  100% {
    opacity: 0.25;
    transform: scale(0.8);
  }
  35% {
    opacity: 1;
    transform: scale(1);
  }
}
</style>
