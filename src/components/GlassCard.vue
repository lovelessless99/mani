<template>
  <component
    :is="clickable ? 'button' : 'div'"
    class="card glass"
    :class="{ 'card--clickable': clickable, 'card--flush': flush }"
    :type="clickable ? 'button' : undefined"
  >
    <slot />
  </component>
</template>

<script setup lang="ts">
defineProps<{
  /** Renders as a <button> and adds press / hover affordances */
  clickable?: boolean
  /** Removes padding — for cards that manage their own insets */
  flush?: boolean
}>()
</script>

<style scoped>
.card {
  display: block;
  width: 100%;
  padding: var(--s4);
  color: var(--text);
  text-align: left;
}

.card--flush {
  padding: 0;
}

.card--clickable {
  cursor: pointer;
  transition:
    background var(--fast) var(--ease),
    border-color var(--fast) var(--ease),
    transform var(--fast) var(--ease);
}

.card--clickable:hover {
  background: var(--glass-2);
  border-color: var(--hairline-strong);
  transform: translateY(-2px);
}

.card--clickable:active {
  transform: scale(0.985);
  background: var(--glass-3);
}

.card--clickable:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}
</style>
