<template>
  <TresCanvas :alpha="true" :antialias="true">
    <TresPerspectiveCamera :position="[0, 0, 8]" :fov="45" :look-at="[0, 0, 0]" />
    <OrbitControls
      :enable-zoom="true"
      :enable-pan="false"
      :min-distance="4"
      :max-distance="14"
      :auto-rotate="true"
      :auto-rotate-speed="0.5"
    />

    <TresAmbientLight :intensity="0.8" color="#c8d4ff" />
    <TresPointLight :position="[0, 0, 0]" :intensity="6" color="#ffffff" :distance="12" />

    <TresGroup :rotation="[rot * 0.4, rot, 0]">
      <!-- The net itself: a geodesic wireframe, each edge a strand -->
      <TresMesh>
        <TresIcosahedronGeometry :args="[3, 1]" />
        <TresMeshBasicMaterial color="#9fb4ff" :wireframe="true" :transparent="true" :opacity="0.28" />
      </TresMesh>

      <!-- A jewel at every knot, each holding the light of all the others -->
      <TresMesh v-for="(n, i) in nodes" :key="i" :position="n.pos">
        <TresIcosahedronGeometry :args="[0.16, 0]" />
        <TresMeshStandardMaterial
          :color="n.color"
          :emissive="n.color"
          :emissive-intensity="1.5"
          :metalness="0.3"
          :roughness="0.15"
        />
      </TresMesh>
    </TresGroup>
  </TresCanvas>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { TresCanvas } from '@tresjs/core'
import { OrbitControls } from '@tresjs/cientos'

const props = defineProps<{ colors: string[] }>()

interface Node {
  pos: [number, number, number]
  color: string
}

/**
 * 因陀羅網 — Indra's net. Jewels sit at the knots of the net, and each one
 * mirrors every other. Here each gem the practitioner has earned becomes a
 * knot, spread evenly over the sphere by a Fibonacci lattice so the net is
 * whole however many jewels it holds.
 */
const nodes = computed<Node[]>(() => {
  const cols = props.colors.length ? props.colors : ['#9fb4ff']
  const count = Math.max(12, cols.length)
  const R = 3
  const golden = Math.PI * (3 - Math.sqrt(5))
  const out: Node[] = []
  for (let i = 0; i < count; i++) {
    const y = 1 - (i / (count - 1)) * 2
    const r = Math.sqrt(1 - y * y)
    const theta = golden * i
    out.push({
      pos: [Math.cos(theta) * r * R, y * R, Math.sin(theta) * r * R],
      color: cols[i % cols.length],
    })
  }
  return out
})

const rot = ref(0)
let frame = 0
function animate() {
  rot.value += 0.0016
  frame = requestAnimationFrame(animate)
}
onMounted(animate)
onUnmounted(() => cancelAnimationFrame(frame))
</script>
