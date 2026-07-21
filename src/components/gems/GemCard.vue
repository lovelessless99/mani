<template>
  <div
    class="gem-card glass"
    :class="{ 'gem-card--locked': !gem, 'gem-card--unlocked': !!gem }"
    @click="gem && $emit('click', gem)"
  >
    <!-- CSS gem preview — no WebGL needed in the grid -->
    <div v-if="gem" class="gem-card__preview">
      <div
        class="gem-orb"
        :style="{
          '--c': gem.params.colorHex,
          '--g': gem.params.colorHex + '99',
        }"
      />
      <div class="gem-sparkle" />
    </div>

    <div v-else class="gem-card__locked-icon">
      <AppIcon name="gem" :size="24" />
    </div>

    <div class="gem-card__label">
      <template v-if="gem && buddhaName">{{ buddhaName }}</template>
      <template v-else-if="volumeNum">{{ volumeNum }}卷</template>
      <template v-else>未解鎖</template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import AppIcon from 'src/components/ui/AppIcon.vue'
import type { GemRecord, BuddhaInfo } from 'src/types/gem'
import buddhasData from 'src/data/meta/buddhas-88.json'

const props = defineProps<{
  gem?: GemRecord
  volumeNum?: string
  locked?: boolean
}>()

defineEmits<{ click: [gem: GemRecord] }>()

const buddhaName = computed<string | undefined>(() => {
  if (!props.gem?.buddhaId) return undefined
  return (buddhasData as BuddhaInfo[]).find((b) => b.id === props.gem!.buddhaId)?.nameZh
})
</script>

<style scoped>
.gem-card {
  width: 100%;
  aspect-ratio: 4 / 5;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--s2);
  padding: var(--s2) 4px;
  cursor: pointer;
  border-radius: var(--r-sm);
  transition:
    transform var(--fast) var(--ease),
    background var(--fast) var(--ease);
}

.gem-card--unlocked:hover {
  transform: translateY(-2px) scale(1.04);
  background: var(--glass-2);
}

.gem-card--unlocked:active {
  transform: scale(0.97);
}

.gem-card--locked {
  opacity: 0.32;
  cursor: default;
  box-shadow: none;
  color: var(--text-faint);
}

.gem-card__preview {
  width: 56px;
  height: 56px;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.gem-orb {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background:
    radial-gradient(circle at 35% 28%, rgba(255,255,255,0.7) 0%, transparent 42%),
    radial-gradient(circle at 68% 72%, rgba(255,255,255,0.18) 0%, transparent 38%),
    radial-gradient(circle, var(--c) 0%, color-mix(in srgb, var(--c) 40%, #000) 100%);
  box-shadow:
    0 0 18px var(--g),
    0 0 6px var(--g),
    inset 0 0 10px rgba(255,255,255,0.22);
  animation: gem-float 3.2s ease-in-out infinite, gem-glow 2.4s ease-in-out infinite;
}

.gem-sparkle {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 8px;
  height: 8px;
  background: white;
  clip-path: polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%);
  animation: sparkle-spin 4s linear infinite;
  opacity: 0.85;
}

@keyframes gem-float {
  0%, 100% { transform: translateY(0) rotate(0deg); }
  50%       { transform: translateY(-3px) rotate(8deg); }
}

@keyframes gem-glow {
  0%, 100% { filter: brightness(1); }
  50%       { filter: brightness(1.35) saturate(1.2); }
}

@keyframes sparkle-spin {
  from { transform: rotate(0deg) scale(1); opacity: 0.85; }
  50%  { transform: rotate(180deg) scale(0.5); opacity: 0.4; }
  to   { transform: rotate(360deg) scale(1); opacity: 0.85; }
}

.gem-card__locked-icon {
  width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.gem-card__label {
  color: var(--text-dim);
  text-align: center;
  font-size: 10px;
  letter-spacing: 0.04em;
  line-height: 1.2;
  max-width: 100%;
  padding: 0 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
