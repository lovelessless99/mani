<template>
  <!-- Renders nothing; sets scene.fog imperatively so the horizon haze can
       change colour between heavens without the declarative <TresFog>
       reconciliation that crashes on prop change. -->
</template>

<script setup lang="ts">
import { watchEffect, onBeforeUnmount } from 'vue'
import { Fog } from 'three'
import { useTresContext } from '@tresjs/core'

const props = defineProps<{ color: string; near?: number; far?: number }>()

const { scene } = useTresContext()

watchEffect(() => {
  const s = scene.value
  if (!s) return
  const near = props.near ?? 14
  const far = props.far ?? 52
  if (s.fog instanceof Fog) {
    s.fog.color.set(props.color)
    s.fog.near = near
    s.fog.far = far
  } else {
    s.fog = new Fog(props.color, near, far)
  }
})

onBeforeUnmount(() => {
  if (scene.value) scene.value.fog = null
})
</script>
