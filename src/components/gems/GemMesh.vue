<template>
  <TresMesh :rotation="rotation" :scale="[scale, scale, scale]">
    <TresOctahedronGeometry v-if="params.geometry === 'octahedron'" :args="[1, 2]" />
    <TresIcosahedronGeometry v-else-if="params.geometry === 'icosahedron'" :args="[1, 1]" />
    <TresDodecahedronGeometry v-else-if="params.geometry === 'dodecahedron'" :args="[1, 0]" />
    <TresSphereGeometry v-else-if="params.geometry === 'sphere'" :args="[1, 32, 32]" />
    <TresTetrahedronGeometry v-else :args="[1, 0]" />

    <TresMeshPhysicalMaterial
      :color="params.colorHex"
      :metalness="0.0"
      :roughness="params.roughness"
      :transmission="params.transmission"
      :thickness="0.8"
      :ior="2.42"
      :iridescence="params.iridescence"
      :iridescence-i-o-r="params.iridescenceIOR"
      :transparent="true"
      :side="DoubleSide"
    />
  </TresMesh>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { DoubleSide } from 'three'
import type { GemParams } from 'src/types/gem'

const props = defineProps<{
  params: GemParams
  scale?: number
  autoRotate?: boolean
}>()

const scale = props.scale ?? 1
const rotation = ref<[number, number, number]>([0, 0, 0])
let animFrame: number

function animate() {
  if (props.autoRotate) {
    rotation.value = [
      rotation.value[0] + 0.0015,
      rotation.value[1] + 0.005,
      rotation.value[2] + 0.001,
    ]
    animFrame = requestAnimationFrame(animate)
  }
}

onMounted(() => {
  if (props.autoRotate) animate()
})

onUnmounted(() => {
  if (animFrame) cancelAnimationFrame(animFrame)
})
</script>
