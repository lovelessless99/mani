<template>
  <div class="shell">
    <RouterView v-slot="{ Component }">
      <Transition name="fade" mode="out-in">
        <component :is="Component" />
      </Transition>
    </RouterView>

    <nav class="tabbar" :class="{ 'tabbar--hidden': hideTabBar }">
      <RouterLink
        v-for="tab in tabs"
        :key="tab.to"
        :to="tab.to"
        class="tab"
        :class="{ 'tab--on': isActive(tab.to) }"
      >
        <AppIcon :name="tab.icon" :size="21" />
        <span class="tab__label">{{ tab.label }}</span>
      </RouterLink>
    </nav>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import AppIcon from 'src/components/ui/AppIcon.vue'

const route = useRoute()

const tabs = [
  { to: '/', icon: 'home', label: '今日' },
  { to: '/library', icon: 'book', label: '誦讀' },
  { to: '/practice', icon: 'ripple', label: '練習' },
  { to: '/collection', icon: 'gem', label: '收藏' },
  { to: '/more', icon: 'dots', label: '更多' },
]

// The reader is a full-screen immersive view — the tab bar would
// compete with vertical sutra text, so it slides away.
const hideTabBar = computed(() => route.path.startsWith('/reader/'))

function isActive(to: string): boolean {
  return to === '/' ? route.path === '/' : route.path.startsWith(to)
}
</script>

<style scoped>
.shell {
  min-height: 100vh;
  min-height: 100dvh;
}

.tabbar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 100;
  display: flex;
  justify-content: center;
  gap: var(--s1);
  height: calc(var(--tabbar-h) + var(--safe-b));
  padding-bottom: var(--safe-b);
  background: rgba(10, 10, 15, 0.55);
  backdrop-filter: blur(var(--blur-heavy)) saturate(180%);
  -webkit-backdrop-filter: blur(var(--blur-heavy)) saturate(180%);
  border-top: 1px solid var(--hairline);
  transition: transform var(--base) var(--ease);
}

.tabbar--hidden {
  transform: translateY(110%);
}

.tab {
  flex: 1;
  max-width: 5.5rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  color: var(--text-faint);
  transition: color var(--base) var(--ease);
}

.tab__label {
  font-size: var(--text-micro);
  letter-spacing: 0.1em;
  line-height: 1;
}

.tab--on {
  color: var(--text);
}

/* A soft bloom behind the active icon rather than an indicator bar —
   it echoes the gem glow used everywhere else. */
.tab--on::before {
  content: '';
  position: absolute;
  width: 40px;
  height: 40px;
  margin-top: -10px;
  border-radius: 50%;
  background: radial-gradient(
    circle,
    rgba(167, 139, 250, 0.22) 0%,
    transparent 70%
  );
  pointer-events: none;
}

.tab:active {
  opacity: 0.6;
}
</style>
