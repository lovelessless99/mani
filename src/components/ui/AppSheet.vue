<template>
  <Teleport to="body">
    <Transition name="sheet">
      <div
        v-if="modelValue"
        class="sheet-root"
        role="dialog"
        aria-modal="true"
        @click.self="close"
      >
        <div class="sheet-scrim" />
        <div class="sheet glass">
          <div class="sheet__grip" />
          <header v-if="title" class="sheet__head">
            <h2 class="sheet__title">{{ title }}</h2>
            <p v-if="subtitle" class="sheet__sub">{{ subtitle }}</p>
          </header>
          <div class="sheet__body">
            <slot />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { watch, onBeforeUnmount } from 'vue'

const props = defineProps<{
  modelValue: boolean
  title?: string
  subtitle?: string
}>()

const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()

function close() {
  emit('update:modelValue', false)
}

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') close()
}

// Lock the page behind the sheet, and listen for Escape only while open.
watch(
  () => props.modelValue,
  (open) => {
    document.body.style.overflow = open ? 'hidden' : ''
    if (open) window.addEventListener('keydown', onKey)
    else window.removeEventListener('keydown', onKey)
  }
)

onBeforeUnmount(() => {
  document.body.style.overflow = ''
  window.removeEventListener('keydown', onKey)
})
</script>

<style scoped>
.sheet-root {
  position: fixed;
  inset: 0;
  z-index: 900;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.sheet-scrim {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(2px);
  -webkit-backdrop-filter: blur(2px);
}

.sheet {
  position: relative;
  width: 100%;
  max-width: var(--content-max);
  max-height: 82vh;
  display: flex;
  flex-direction: column;
  padding: var(--s2) var(--s4) calc(var(--safe-b) + var(--s5));
  border-radius: var(--r-lg) var(--r-lg) 0 0;
  border-bottom: none;
  background: rgba(18, 18, 26, 0.72);
  backdrop-filter: blur(var(--blur-heavy)) saturate(180%);
  -webkit-backdrop-filter: blur(var(--blur-heavy)) saturate(180%);
  box-shadow: var(--shadow-3);
}

/* Desktop: float it centred instead of docking to the bottom edge */
@media (min-width: 640px) {
  .sheet-root {
    align-items: center;
  }
  .sheet {
    border-radius: var(--r-lg);
    border-bottom: 1px solid var(--hairline);
    max-height: 76vh;
    padding-bottom: var(--s5);
  }
}

.sheet__grip {
  width: 34px;
  height: 4px;
  margin: var(--s2) auto var(--s3);
  border-radius: var(--r-full);
  background: rgba(255, 255, 255, 0.18);
  flex-shrink: 0;
}

.sheet__head {
  flex-shrink: 0;
  padding-bottom: var(--s4);
}

.sheet__title {
  font-size: var(--text-title);
  font-weight: 300;
  letter-spacing: 0.08em;
}

.sheet__sub {
  margin-top: 2px;
  font-size: var(--text-caption);
  color: var(--text-dim);
  letter-spacing: 0.04em;
}

.sheet__body {
  overflow-y: auto;
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;
}

/* — Transition ——————————————————————————— */
.sheet-enter-active,
.sheet-leave-active {
  transition: opacity var(--base) var(--ease);
}
.sheet-enter-active .sheet,
.sheet-leave-active .sheet {
  transition: transform var(--base) var(--ease-out);
}
.sheet-enter-from,
.sheet-leave-to {
  opacity: 0;
}
.sheet-enter-from .sheet,
.sheet-leave-to .sheet {
  transform: translateY(100%);
}

@media (min-width: 640px) {
  .sheet-enter-from .sheet,
  .sheet-leave-to .sheet {
    transform: translateY(16px) scale(0.98);
  }
}
</style>
