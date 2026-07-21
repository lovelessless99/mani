<template>
  <button
    :class="['btn', `btn--${variant}`, { 'btn--block': block, 'btn--icon': iconOnly }]"
    :disabled="disabled || loading"
    :aria-label="ariaLabel"
    type="button"
  >
    <AppSpinner v-if="loading" :size="16" />
    <AppIcon v-else-if="icon" :name="icon" :size="iconOnly ? 20 : 18" />
    <span v-if="!iconOnly" class="btn__label"><slot /></span>
  </button>
</template>

<script setup lang="ts">
import AppIcon from './AppIcon.vue'
import AppSpinner from './AppSpinner.vue'

withDefaults(
  defineProps<{
    variant?: 'ghost' | 'glass' | 'accent'
    icon?: string
    iconOnly?: boolean
    block?: boolean
    loading?: boolean
    disabled?: boolean
    ariaLabel?: string
  }>(),
  { variant: 'ghost' }
)
</script>

<style scoped>
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--s2);
  padding: var(--s3) var(--s5);
  border-radius: var(--r-full);
  font-size: var(--text-body);
  font-weight: 400;
  letter-spacing: 0.06em;
  color: var(--text);
  border: 1px solid transparent;
  transition:
    background var(--fast) var(--ease),
    border-color var(--fast) var(--ease),
    transform var(--fast) var(--ease),
    opacity var(--fast) var(--ease);
}

.btn:active:not(:disabled) {
  transform: scale(0.97);
}

.btn:disabled {
  opacity: 0.4;
  cursor: default;
}

.btn:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

/* — Variants —————————————————————————————— */
.btn--ghost {
  color: var(--text-dim);
}
.btn--ghost:hover:not(:disabled) {
  color: var(--text);
  background: var(--glass-1);
}

.btn--glass {
  background: var(--glass-1);
  border-color: var(--hairline);
  backdrop-filter: blur(var(--blur)) saturate(160%);
  -webkit-backdrop-filter: blur(var(--blur)) saturate(160%);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06);
}
.btn--glass:hover:not(:disabled) {
  background: var(--glass-2);
  border-color: var(--hairline-strong);
}

.btn--accent {
  background: linear-gradient(
    135deg,
    rgba(167, 139, 250, 0.22),
    rgba(96, 165, 250, 0.16)
  );
  border-color: rgba(167, 139, 250, 0.35);
  color: #fff;
}
.btn--accent:hover:not(:disabled) {
  background: linear-gradient(
    135deg,
    rgba(167, 139, 250, 0.32),
    rgba(96, 165, 250, 0.24)
  );
}

/* — Shapes ———————————————————————————————— */
.btn--block {
  display: flex;
  width: 100%;
}

.btn--icon {
  padding: 0;
  width: 40px;
  height: 40px;
  border-radius: var(--r-full);
}

.btn__label {
  line-height: 1;
}
</style>
