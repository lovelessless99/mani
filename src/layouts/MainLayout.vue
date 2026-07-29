<template>
  <div class="shell">
    <RouterView v-slot="{ Component }">
      <Transition name="fade" mode="out-in">
        <component :is="Component" />
      </Transition>
    </RouterView>

    <nav v-if="!immersive" class="dock-wrap">
      <div class="dock">
        <RouterLink
          v-for="tab in tabs"
          :key="tab.to"
          :to="tab.to"
          class="dock__item"
          :class="{ 'dock__item--on': isActive(tab.to) }"
        >
          <AppIcon :name="tab.icon" :size="20" class="dock__icon" />
          <span class="dock__label">{{ tab.label }}</span>
        </RouterLink>
      </div>
    </nav>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import AppIcon from 'src/components/ui/AppIcon.vue'

const route = useRoute()

// The reader and the print tool are fully immersive — their own controls sit
// at the edges, so the floating dock would only get in the way.
const immersive = computed(
  () => route.path.startsWith('/reader') || route.path.startsWith('/print'),
)

const tabs = [
  { to: '/', icon: 'home', label: '今日' },
  { to: '/practice', icon: 'ripple', label: '功課' },
  { to: '/dedication', icon: 'lotus', label: '迴向' },
  { to: '/collection', icon: 'gem', label: '收藏' },
  { to: '/more', icon: 'dots', label: '更多' },
]

function isActive(to: string): boolean {
  return to === '/' ? route.path === '/' : route.path.startsWith(to)
}
</script>

<style scoped>
.shell {
  min-height: 100vh;
  min-height: 100dvh;
}

/* — Floating dock —————————————————————————
   Detached from the screen edge so the sky shows underneath and around
   it; the bar reads as an object resting above the page, not as chrome
   welded to the bottom. */
.dock-wrap {
  position: fixed;
  left: 0;
  right: 0;
  bottom: calc(var(--safe-b) + var(--s4));
  z-index: 100;
  display: flex;
  justify-content: center;
  padding: 0 var(--s4);
  pointer-events: none;
}

.dock {
  display: flex;
  align-items: center;
  gap: var(--s1);
  padding: 5px;
  border-radius: var(--r-full);
  pointer-events: auto;

  background: rgba(16, 16, 26, 0.55);
  backdrop-filter: blur(var(--blur-heavy)) saturate(180%);
  -webkit-backdrop-filter: blur(var(--blur-heavy)) saturate(180%);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow:
    0 16px 40px -12px rgba(0, 0, 0, 0.8),
    0 0 0 1px rgba(0, 0, 0, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.09);
}

/* Inactive items are icon-only; the active one expands to reveal its
   label. Only one label on screen keeps the dock compact and makes the
   selection unmistakable. */
.dock__item {
  display: flex;
  align-items: center;
  gap: 0;
  height: 42px;
  padding: 0 12px;
  border-radius: var(--r-full);
  color: var(--text-faint);
  white-space: nowrap;
  transition:
    color var(--base) var(--ease),
    background var(--base) var(--ease),
    padding var(--base) var(--ease),
    gap var(--base) var(--ease);
}

.dock__item:hover {
  color: var(--text-dim);
}

.dock__item--on {
  gap: 7px;
  padding: 0 16px 0 13px;
  color: #fff;
  background: linear-gradient(
    135deg,
    rgba(167, 139, 250, 0.3),
    rgba(96, 165, 250, 0.2)
  );
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.14),
    0 0 18px -4px rgba(167, 139, 250, 0.6);
}

.dock__icon {
  transition: transform var(--base) var(--ease-out);
}

.dock__item--on .dock__icon {
  transform: scale(1.06);
  filter: drop-shadow(0 0 6px rgba(199, 180, 255, 0.8));
}

.dock__label {
  max-width: 0;
  overflow: hidden;
  opacity: 0;
  font-size: var(--text-caption);
  letter-spacing: 0.1em;
  transition:
    max-width var(--base) var(--ease),
    opacity var(--fast) var(--ease);
}

.dock__item--on .dock__label {
  max-width: 5rem;
  opacity: 1;
  transition:
    max-width var(--base) var(--ease),
    opacity var(--base) var(--ease) 80ms;
}

.dock__item:active {
  transform: scale(0.94);
}

.dock__item:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

/* Narrow phones: drop the label so four items always fit */
@media (max-width: 22rem) {
  .dock__item--on .dock__label {
    max-width: 0;
    opacity: 0;
  }
  .dock__item--on {
    padding: 0 12px;
    gap: 0;
  }
}
</style>
