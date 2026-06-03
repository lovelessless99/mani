<template>
  <div class="glass glass-card" :class="{ 'glass-hover': hoverable }">
    <slot />
  </div>
</template>

<script setup lang="ts">
defineProps<{ hoverable?: boolean }>()
</script>

<style scoped>
.glass-card {
  padding: 16px;
  color: var(--text-primary);
}
</style>
