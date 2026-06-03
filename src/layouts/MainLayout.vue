<template>
  <q-layout view="lHh lpr lFf">
    <q-page-container>
      <router-view />
    </q-page-container>

    <q-footer>
      <q-tabs
        v-model="activeTab"
        class="glass"
        dense
        active-color="white"
        indicator-color="transparent"
        style="border-top: var(--glass-border)"
      >
        <q-route-tab name="home" to="/" exact icon="home" label="今日" />
        <q-route-tab name="library" to="/library" icon="menu_book" label="誦讀" />
        <q-route-tab name="practice" to="/practice" icon="psychology" label="練習" />
        <q-route-tab name="collection" to="/collection" icon="diamond" label="收藏" />
        <q-route-tab name="more" to="/more" icon="more_horiz" label="更多" />
      </q-tabs>
    </q-footer>
  </q-layout>
</template>

<script setup lang="ts">
import { ref } from 'vue'
const activeTab = ref('home')
</script>

<style scoped>
.q-footer {
  background: transparent;
  backdrop-filter: blur(24px) saturate(180%);
  -webkit-backdrop-filter: blur(24px) saturate(180%);
  border-top: 1px solid rgba(255, 255, 255, 0.12);
}
</style>
