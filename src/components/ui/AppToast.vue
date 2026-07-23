<template>
  <Teleport to="body">
    <div class="toasts" role="status" aria-live="polite">
      <TransitionGroup name="toast">
        <div
          v-for="t in toasts"
          :key="t.id"
          class="toast glass"
          :class="`toast--${t.tone}`"
          @click="dismiss(t.id)"
        >
          {{ t.message }}
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { useToast } from 'src/composables/useToast'

const { toasts, dismiss } = useToast()
</script>

<style scoped>
.toasts {
  position: fixed;
  left: 50%;
  transform: translateX(-50%);
  /* Above the floating dock so a message is never hidden behind it */
  bottom: calc(var(--safe-b) + var(--tabbar-h) + var(--s3));
  z-index: 1200;
  display: flex;
  flex-direction: column;
  gap: var(--s2);
  width: min(26rem, calc(100vw - var(--s5)));
  pointer-events: none;
}

.toast {
  pointer-events: auto;
  cursor: pointer;
  padding: var(--s3) var(--s4);
  font-size: var(--text-caption);
  line-height: 1.6;
  letter-spacing: 0.03em;
  background: rgba(24, 18, 24, 0.86);
  backdrop-filter: blur(var(--blur-heavy)) saturate(180%);
  -webkit-backdrop-filter: blur(var(--blur-heavy)) saturate(180%);
}

.toast--error {
  border-color: rgba(251, 113, 133, 0.4);
  box-shadow:
    var(--shadow-2),
    inset 0 1px 0 rgba(255, 255, 255, 0.06),
    0 0 20px -8px rgba(251, 113, 133, 0.6);
}

.toast-enter-active,
.toast-leave-active {
  transition:
    opacity var(--base) var(--ease),
    transform var(--base) var(--ease-out);
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(12px) scale(0.97);
}
</style>
