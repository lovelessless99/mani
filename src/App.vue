<template>
  <!-- Nothing behind the gate renders until Firebase has resolved the
       stored session, so no page ever mounts without a uid to scope its
       data to. -->
  <template v-if="!auth.ready">
    <StarField />
    <div class="boot">
      <AppSpinner :size="36" />
    </div>
  </template>

  <template v-else-if="!auth.isActive">
    <StarField />
    <LoginPage />
  </template>

  <template v-else>
    <StarField v-if="!isHome" />
    <RouterView />
  </template>

  <AppToast />
  <PwaPrompts />
  <MedalOverlay :medal="achievements.pendingMedal" @dismiss="achievements.clearPendingMedal()" />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import StarField from 'src/components/StarField.vue'
import AppToast from 'src/components/ui/AppToast.vue'
import PwaPrompts from 'src/components/ui/PwaPrompts.vue'
import MedalOverlay from 'src/components/achievements/MedalOverlay.vue'
import AppSpinner from 'src/components/ui/AppSpinner.vue'
import LoginPage from 'src/pages/LoginPage.vue'
import { useAuthStore } from 'src/stores/authStore'
import { useAchievementStore } from 'src/stores/achievementStore'

const route = useRoute()
const auth = useAuthStore()
const achievements = useAchievementStore()
const isHome = computed(() => route.path === '/')
</script>

<style scoped>
.boot {
  position: relative;
  z-index: 1;
  min-height: 100vh;
  min-height: 100dvh;
  display: grid;
  place-items: center;
}
</style>
