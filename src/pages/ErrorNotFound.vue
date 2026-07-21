<template>
  <main class="nf">
    <p class="nf__code tnum">404</p>
    <h1 class="nf__title">找不到頁面</h1>
    <AppButton variant="glass" @click="router.push('/')">回首頁</AppButton>
  </main>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import AppButton from 'src/components/ui/AppButton.vue'

const router = useRouter()
</script>

<style scoped>
.nf {
  min-height: 100vh;
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--s4);
  padding: var(--s4);
}

.nf__code {
  font-size: 4rem;
  font-weight: 200;
  letter-spacing: 0.1em;
  color: var(--text-faint);
  line-height: 1;
}

.nf__title {
  font-size: var(--text-title);
  font-weight: 300;
  letter-spacing: 0.14em;
}
</style>
