<template>
  <div class="seg" role="tablist">
    <button
      v-for="opt in options"
      :key="opt.value"
      class="seg__btn"
      :class="{ 'seg__btn--on': opt.value === modelValue }"
      role="tab"
      :aria-selected="opt.value === modelValue"
      type="button"
      @click="emit('update:modelValue', opt.value)"
    >
      {{ opt.label }}
    </button>
    <span class="seg__thumb" :style="thumbStyle" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface SegOption {
  value: string
  label: string
}

const props = defineProps<{
  modelValue: string
  options: SegOption[]
}>()

const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const activeIndex = computed(() =>
  Math.max(
    0,
    props.options.findIndex((o) => o.value === props.modelValue)
  )
)

const thumbStyle = computed(() => ({
  width: `calc(${100 / props.options.length}% - 4px)`,
  transform: `translateX(calc(${activeIndex.value * 100}% + ${activeIndex.value * 4}px))`,
}))
</script>

<style scoped>
.seg {
  position: relative;
  display: flex;
  gap: 4px;
  padding: 3px;
  border-radius: var(--r-full);
  background: rgba(255, 255, 255, 0.035);
  border: 1px solid var(--hairline);
}

.seg__btn {
  position: relative;
  z-index: 1;
  flex: 1;
  padding: var(--s2) var(--s3);
  border-radius: var(--r-full);
  font-size: var(--text-caption);
  letter-spacing: 0.08em;
  color: var(--text-faint);
  transition: color var(--base) var(--ease);
  white-space: nowrap;
}

.seg__btn--on {
  color: var(--text);
}

/* The pill slides between options rather than each one fading —
   the movement tells you where you came from. */
.seg__thumb {
  position: absolute;
  top: 3px;
  left: 3px;
  bottom: 3px;
  border-radius: var(--r-full);
  background: var(--glass-2);
  border: 1px solid var(--hairline-strong);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08);
  transition: transform var(--base) var(--ease);
  pointer-events: none;
}
</style>
