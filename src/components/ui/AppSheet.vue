<template>
  <Teleport to="body">
    <Transition name="sheet">
      <div v-if="modelValue" class="sheet-root" role="dialog" aria-modal="true">
        <!-- Tapping the dim backdrop closes the sheet. It sits above
             sheet-root, so the close handler has to live here, not on a
             .self check of the parent that the scrim never lets fire. -->
        <div class="sheet-scrim" @click="close" />
        <div class="sheet glass">
          <button class="sheet__grip" type="button" aria-label="關閉" @click="close" />
          <button class="sheet__x" type="button" aria-label="關閉" @click="close">
            <AppIcon name="close" :size="18" />
          </button>
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
import AppIcon from './AppIcon.vue'

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

/* A bigger tap target than the visible bar, so the handle is easy to
   hit to dismiss on a phone. */
.sheet__grip {
  flex-shrink: 0;
  width: 64px;
  height: 20px;
  margin: 0 auto var(--s2);
  padding: 0;
  display: block;
  position: relative;
}
.sheet__grip::before {
  content: '';
  position: absolute;
  top: 8px;
  left: 50%;
  transform: translateX(-50%);
  width: 36px;
  height: 4px;
  border-radius: var(--r-full);
  background: rgba(255, 255, 255, 0.2);
  transition: background var(--fast) var(--ease);
}
.sheet__grip:hover::before {
  background: rgba(255, 255, 255, 0.4);
}

.sheet__x {
  position: absolute;
  top: var(--s3);
  right: var(--s3);
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  border-radius: var(--r-full);
  color: var(--text-dim);
  background: rgba(255, 255, 255, 0.06);
  transition: color var(--fast) var(--ease), background var(--fast) var(--ease);
}
.sheet__x:hover {
  color: var(--text);
  background: rgba(255, 255, 255, 0.14);
}
.sheet__x:active {
  transform: scale(0.92);
}

.sheet__head {
  flex-shrink: 0;
  padding-bottom: var(--s4);
  padding-right: var(--s6);
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
