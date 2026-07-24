<template>
  <TresCanvas :alpha="true" :antialias="true">
    <!-- Low and far back so the land runs out to a horizon rather than
         sitting in a bowl right in front of the viewer. -->
    <TresPerspectiveCamera :position="[0, 3, 14]" :fov="50" :look-at="[0, 0.6, 0]" />
    <OrbitControls
      :enable-zoom="true"
      :enable-pan="false"
      :min-distance="6"
      :max-distance="34"
      :min-polar-angle="0.2"
      :max-polar-angle="1.52"
      :target="[0, 0.6, 0]"
      :auto-rotate="true"
      :auto-rotate-speed="0.25"
    />

    <!-- Distance fades into the sky, so the ground reads as endless. -->
    <SceneFog :color="fogColor" />

    <TresAmbientLight :intensity="formless ? 0.9 : 0.55" :color="ambientColor" />
    <TresDirectionalLight :position="[5, 9, 4]" :intensity="1.7" :color="keyColor" />
    <TresDirectionalLight :position="[-6, 3, -5]" :intensity="0.7" color="#ffffff" />

    <TresGroup :rotation="[0, spin, 0]">
      <!-- Each heaven's distinctive landmark, drawn from scripture -->
      <MotifDecor :heaven="heaven" />

      <!-- 無盡燈 · one lamp kindling countless lamps, its light never spent.
           The flame grows and satellite lamps multiply with the gems lit. -->
      <TresGroup :position="[0, 0, 3.4]">
        <TresMesh :position="[0, 0.28, 0]">
          <TresCylinderGeometry :args="[0.16, 0.22, 0.5, 8]" />
          <TresMeshStandardMaterial color="#caa24a" :metalness="0.6" :roughness="0.3" :emissive="'#4a3410'" :emissive-intensity="0.3" />
        </TresMesh>
        <TresMesh :position="[0, 0.62 + flameScale * 0.3, 0]" :scale="[flameScale, flameScale * 1.5, flameScale]">
          <TresConeGeometry :args="[0.2, 0.5, 8]" />
          <TresMeshStandardMaterial color="#ffd873" :emissive="'#ffb43a'" :emissive-intensity="2.2" :transparent="true" :opacity="0.95" />
        </TresMesh>
        <TresPointLight :position="[0, 0.9, 0]" :intensity="2 + flameScale * 4" color="#ffcf70" :distance="7" />
        <!-- kindled lamps radiating outward -->
        <TresMesh v-for="(s, i) in satellites" :key="i" :position="s">
          <TresIcosahedronGeometry :args="[0.07, 0]" />
          <TresMeshStandardMaterial color="#ffdc84" :emissive="'#ffc24a'" :emissive-intensity="1.8" />
        </TresMesh>
      </TresGroup>

      <!-- Ground. A vast plain running out to the fogged horizon, paved with
           gold in 欲界 and with luminous 琉璃 in 色界; the formless realms
           have no ground at all. A ring of light marks the built centre. -->
      <template v-if="!formless">
        <!-- 黃金為地 -->
        <TresMesh v-if="realm === '欲界'" :position="[0, -0.15, 0]" :rotation="[-Math.PI / 2, 0, 0]">
          <TresCircleGeometry :args="[60, 72]" />
          <TresMeshStandardMaterial color="#caa24a" :metalness="0.88" :roughness="0.36" :emissive="'#4a3410'" :emissive-intensity="0.1" />
        </TresMesh>
        <!-- 佛土 · 七寶莊嚴,radiant -->
        <TresMesh v-else-if="realm === '佛土'" :position="[0, -0.15, 0]" :rotation="[-Math.PI / 2, 0, 0]">
          <TresCircleGeometry :args="[60, 72]" />
          <TresMeshStandardMaterial :color="groundColor" :metalness="0.75" :roughness="0.16" :emissive="groundColor" :emissive-intensity="0.35" />
        </TresMesh>
        <!-- 琉璃為地 -->
        <TresMesh v-else :position="[0, -0.15, 0]" :rotation="[-Math.PI / 2, 0, 0]">
          <TresCircleGeometry :args="[60, 72]" />
          <TresMeshStandardMaterial
            :color="groundColor"
            :metalness="0.5"
            :roughness="0.14"
            :emissive="groundColor"
            :emissive-intensity="0.22"
          />
        </TresMesh>
        <!-- The sanctified centre, ringed in light -->
        <TresMesh :position="[0, -0.02, 0]" :rotation="[-Math.PI / 2, 0, 0]">
          <TresRingGeometry :args="[5, 5.35, 64]" />
          <TresMeshBasicMaterial :color="rimColor" :transparent="true" :opacity="0.7" :side="2" />
        </TresMesh>
      </template>
      <template v-else>
        <TresMesh :position="[0, 0, 0]" :rotation="[-Math.PI / 2, 0, 0]">
          <TresRingGeometry :args="[4.4, 5, 48]" />
          <TresMeshBasicMaterial :color="rimColor" :transparent="true" :opacity="0.45" />
        </TresMesh>
      </template>

      <!-- Structures placed on the land -->
      <TresGroup v-for="(s, i) in placements" :key="i" :position="[s.x, 0, s.z]" :rotation="[0, s.rot, 0]">
        <!-- 明燈 · a floating glow -->
        <TresMesh v-if="s.type === 'light'" :position="[0, 1 + s.bob, 0]">
          <TresIcosahedronGeometry :args="[0.16, 0]" />
          <TresMeshStandardMaterial :color="lightColor" :emissive="lightColor" :emissive-intensity="1.6" />
        </TresMesh>

        <!-- 菩提樹 -->
        <template v-else-if="s.type === 'tree'">
          <TresMesh :position="[0, 0.35, 0]">
            <TresCylinderGeometry :args="[0.08, 0.12, 0.7, 6]" />
            <TresMeshStandardMaterial color="#6b4a2a" :roughness="0.9" />
          </TresMesh>
          <TresMesh :position="[0, 0.95, 0]">
            <TresIcosahedronGeometry :args="[0.5, 0]" />
            <TresMeshStandardMaterial :color="foliageColor" :roughness="0.6" :flat-shading="true" />
          </TresMesh>
        </template>

        <!-- 寶塔 · stacked tiers to a spire -->
        <template v-else-if="s.type === 'pagoda'">
          <TresMesh v-for="t in 3" :key="t" :position="[0, 0.25 + (t - 1) * 0.42, 0]">
            <TresBoxGeometry :args="[0.7 - (t - 1) * 0.16, 0.34, 0.7 - (t - 1) * 0.16]" />
            <TresMeshStandardMaterial :color="buildColor" :metalness="0.3" :roughness="0.4" :emissive="buildColor" :emissive-intensity="0.15" />
          </TresMesh>
          <TresMesh :position="[0, 1.55, 0]">
            <TresConeGeometry :args="[0.14, 0.4, 6]" />
            <TresMeshStandardMaterial :color="rimColor" :emissive="rimColor" :emissive-intensity="0.5" :metalness="0.4" :roughness="0.3" />
          </TresMesh>
        </template>

        <!-- 宮殿 · a broad hall under a flared roof -->
        <template v-else>
          <TresMesh :position="[0, 0.4, 0]">
            <TresBoxGeometry :args="[1.5, 0.8, 1.1]" />
            <TresMeshStandardMaterial :color="buildColor" :metalness="0.25" :roughness="0.45" :emissive="buildColor" :emissive-intensity="0.12" />
          </TresMesh>
          <TresMesh :position="[0, 1.05, 0]" :rotation="[0, Math.PI / 4, 0]">
            <TresConeGeometry :args="[1.25, 0.6, 4]" />
            <TresMeshStandardMaterial :color="rimColor" :emissive="rimColor" :emissive-intensity="0.4" :metalness="0.4" :roughness="0.3" />
          </TresMesh>
        </template>
      </TresGroup>

      <!-- Bare land reads as ruined until something is built -->
      <TresMesh v-if="!placements.length && !formless" :position="[0, 0.3, 0]">
        <TresTorusGeometry :args="[0.5, 0.02, 8, 32]" />
        <TresMeshStandardMaterial :color="rimColor" :emissive="rimColor" :emissive-intensity="0.3" :transparent="true" :opacity="0.4" />
      </TresMesh>
    </TresGroup>
  </TresCanvas>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { TresCanvas } from '@tresjs/core'
import { OrbitControls } from '@tresjs/cientos'
import MotifDecor from './MotifDecor.vue'
import SceneFog from './SceneFog.vue'
import type { Build, Heaven, StructureType } from 'src/stores/heavenStore'

const props = defineProps<{ heaven: Heaven; build: Build; lampLevel?: number }>()

// The 無盡燈's flame swells with the number of gems lit, and satellite lamps
// spread around it — one lamp lighting the next, without end.
const lamp = computed(() => props.lampLevel ?? 0)
const flameScale = computed(() => 0.7 + Math.min(lamp.value, 88) / 88 * 0.9)
const satellites = computed<[number, number, number][]>(() => {
  const count = Math.min(20, Math.floor(lamp.value / 3))
  return Array.from({ length: count }, (_, i) => {
    const a = (i / Math.max(1, count)) * Math.PI * 2
    const r = 0.6 + (i % 3) * 0.18
    return [Math.cos(a) * r, 0.6 + (i % 4) * 0.12, Math.sin(a) * r] as [number, number, number]
  })
})

const realm = computed(() => props.heaven.realm)
const formless = computed(() => props.heaven.realm === '無色界')
const groundColor = computed(() => props.heaven.ground)
// The horizon haze — the brighter sky colour, so the plain melts into the
// same atmosphere painted behind the canvas.
const fogColor = computed(() => props.heaven.sky[0])
const rimColor = computed(() => props.heaven.sky[0])
const ambientColor = computed(() => props.heaven.sky[0])
const keyColor = computed(() => (formless.value ? '#d8c8ff' : '#fff4e0'))
const foliageColor = computed(() => (props.heaven.realm === '色界' ? '#8fe0c8' : '#5fa860'))
const buildColor = computed(() => (formless.value ? '#b9a6e6' : props.heaven.realm === '色界' ? '#e8f0fa' : '#d8b784'))
const lightColor = computed(() => props.heaven.sky[0])

interface Placement {
  type: StructureType
  x: number
  z: number
  rot: number
  bob: number
}

/**
 * Fan the built structures out across the land: palaces and pagodas take the
 * inner rings, trees the middle, lamps the outer edge, so a fuller heaven
 * reads as a settlement radiating from its halls rather than a heap.
 */
const placements = computed<Placement[]>(() => {
  const b = props.build
  const order: StructureType[] = [
    ...Array(b.palace).fill('palace'),
    ...Array(b.pagoda).fill('pagoda'),
    ...Array(b.tree).fill('tree'),
    ...Array(b.light).fill('light'),
  ]
  const out: Placement[] = []
  let idx = 0
  let ring = 0
  while (idx < order.length) {
    const radius = ring === 0 ? 0 : 1.1 + ring * 1.15
    const count = ring === 0 ? 1 : Math.max(1, ring * 6)
    for (let k = 0; k < count && idx < order.length; k++) {
      const a = (k / count) * Math.PI * 2 + ring * 0.5
      out.push({
        type: order[idx],
        x: Math.cos(a) * radius,
        z: Math.sin(a) * radius,
        rot: -a + Math.PI / 2,
        bob: (idx % 5) * 0.06,
      })
      idx++
    }
    ring++
  }
  return out
})

const spin = ref(0)
let frame = 0
function animate() {
  spin.value += 0.0008
  frame = requestAnimationFrame(animate)
}
onMounted(animate)
onUnmounted(() => cancelAnimationFrame(frame))
</script>
