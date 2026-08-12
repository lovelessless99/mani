<template>
  <main class="page">
    <header>
      <h1 class="page-title">成就</h1>
      <p class="page-sub">
        已獲 <span class="count tnum">{{ store.unlockedCount }}</span>
        <span class="t-faint"> / {{ store.list.length }} 面獎牌</span>
      </p>
    </header>

    <ul class="grid">
      <li v-for="a in store.list" :key="a.id">
        <div class="badge" :class="[`badge--${a.tier}`, { 'badge--locked': !a.unlocked }]">
          <div class="badge__disc">
            <span class="badge__glyph">{{ a.unlocked ? a.glyph : '·' }}</span>
          </div>
          <p class="badge__name">{{ a.name }}</p>
          <p class="badge__desc">{{ a.desc }}</p>
          <div v-if="!a.unlocked" class="badge__meter">
            <div class="badge__fill" :style="{ width: `${a.ratio * 100}%` }" />
          </div>
          <p v-if="!a.unlocked" class="badge__progress tnum">{{ a.value }} / {{ a.goal }}</p>
          <p v-else class="badge__got">已達成</p>
        </div>
      </li>
    </ul>
  </main>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useAchievementStore } from 'src/stores/achievementStore'
import { useProgressStore } from 'src/stores/progressStore'
import { useGemStore } from 'src/stores/gemStore'
import { useStreakStore } from 'src/stores/streakStore'
import { useDedicationStore } from 'src/stores/dedicationStore'
import { useChantStore } from 'src/stores/chantStore'
import { useNotesStore } from 'src/stores/notesStore'
import { useToast, describeError } from 'src/composables/useToast'

const store = useAchievementStore()
const toast = useToast()

// The page reads every metric off the other stores, so make sure they are
// all populated before the grid computes.
onMounted(async () => {
  try {
    await Promise.all([
      useProgressStore().loadAllProgress(),
      useGemStore().loadGems(),
      useStreakStore().load(),
      useDedicationStore().loadDedications(),
      useChantStore().load(),
      useNotesStore().load(),
      store.load(),
    ])
  } catch (e) {
    toast.error(describeError(e))
  }
})
</script>

<style scoped>
.count {
  color: var(--text);
  font-size: var(--text-body);
}

.grid {
  list-style: none;
  margin-top: var(--s5);
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--s3);
}

.badge {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: var(--s4) var(--s3);
  border-radius: var(--r-lg);
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid var(--hairline);
}

.badge--locked {
  opacity: 0.72;
}

.badge__disc {
  width: 62px;
  height: 62px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  box-shadow:
    inset 0 1px 4px rgba(255, 255, 255, 0.4),
    inset 0 -3px 8px rgba(0, 0, 0, 0.3);
}

.badge--bronze .badge__disc {
  background: conic-gradient(from 210deg, #8a5a34, #d9a066, #f0c79a, #b9784a, #8a5a34);
}
.badge--silver .badge__disc {
  background: conic-gradient(from 210deg, #8a94a6, #cfd8e6, #ffffff, #a6b0c2, #8a94a6);
}
.badge--gold .badge__disc {
  background: conic-gradient(from 210deg, #b8860b, #f4cf6b, #fff2c4, #d9a520, #b8860b);
}

.badge--locked .badge__disc {
  background: rgba(255, 255, 255, 0.06);
  box-shadow: inset 0 0 0 1px var(--hairline);
}

.badge__glyph {
  font-size: 1.7rem;
  line-height: 1;
  color: rgba(28, 20, 8, 0.72);
}

.badge--locked .badge__glyph {
  color: var(--text-faint);
}

.badge__name {
  margin-top: var(--s3);
  font-size: var(--text-body);
  letter-spacing: 0.1em;
}

.badge__desc {
  margin-top: 3px;
  font-size: var(--text-micro);
  line-height: 1.6;
  color: var(--text-faint);
}

.badge__meter {
  margin-top: var(--s3);
  width: 80%;
  height: 3px;
  border-radius: var(--r-full);
  background: rgba(255, 255, 255, 0.08);
  overflow: hidden;
}

.badge__fill {
  height: 100%;
  border-radius: var(--r-full);
  background: linear-gradient(90deg, var(--amethyst), var(--sapphire));
  transition: width var(--slow) var(--ease-out);
}

.badge__progress {
  margin-top: var(--s2);
  font-size: var(--text-micro);
  color: var(--text-faint);
}

.badge__got {
  margin-top: var(--s3);
  font-size: var(--text-micro);
  letter-spacing: 0.14em;
  color: var(--amber);
}
</style>
