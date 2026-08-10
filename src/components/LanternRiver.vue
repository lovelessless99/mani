<template>
  <TresCanvas clear-color="#070a16" :antialias="true" :alpha="false">
    <TresPerspectiveCamera :position="[0, 2.2, 6.4]" :fov="52" :look-at="[0, 0.2, -3]" />
    <OrbitControls
      :enable-zoom="true"
      :min-distance="3"
      :max-distance="13"
      :zoom-speed="0.8"
      :enable-pan="false"
      :enable-damping="true"
      :damping-factor="0.06"
      :rotate-speed="0.45"
      :min-polar-angle="0.9"
      :max-polar-angle="1.48"
      :min-azimuth-angle="-0.7"
      :max-azimuth-angle="0.7"
      :target="[0, 0.2, -3]"
    />

    <TresAmbientLight :intensity="0.4" color="#4a5b96" />
    <TresDirectionalLight :position="[2, 6, 3]" :intensity="0.35" color="#9fb6ff" />
    <TresFog :color="'#070a16'" :near="6" :far="20" />

    <!-- Night water -->
    <TresMesh :position="[0, 0, 0]" :rotation="[-Math.PI / 2, 0, 0]">
      <TresPlaneGeometry :args="[60, 46]" />
      <TresMeshStandardMaterial color="#0c1430" :metalness="0.9" :roughness="0.18" />
    </TresMesh>
    <!-- faint stars far above -->
    <TresPoints>
      <TresBufferGeometry :position="[starPositions, 3]" />
      <TresPointsMaterial :size="0.06" color="#aab6e0" :transparent="true" :opacity="0.8" :size-attenuation="true" />
    </TresPoints>

    <!-- Moon -->
    <TresMesh :position="[MOON_X, MOON_Y, MOON_Z]">
      <TresCircleGeometry :args="[1.05, 48]" />
      <TresMeshBasicMaterial color="#f4f6ff" :fog="false" />
    </TresMesh>
    <TresMesh :position="[MOON_X, MOON_Y, MOON_Z - 0.1]">
      <TresCircleGeometry :args="[2.2, 48]" />
      <TresMeshBasicMaterial color="#aebfff" :transparent="true" :opacity="0.16" :blending="2" :fog="false" :depth-write="false" />
    </TresMesh>
    <!-- its light road — broken glitter shimmering toward the viewer -->
    <TresMesh
      v-for="(g, gi) in moonRoad"
      :key="`g${gi}`"
      :position="[g.x + Math.sin(t * 1.3 + gi) * 0.05, 0.015, g.z]"
      :rotation="[-Math.PI / 2, 0, 0]"
      :scale="[g.rx, g.rz, 1]"
    >
      <TresCircleGeometry :args="[1, 20]" />
      <TresMeshBasicMaterial
        color="#e6ecff"
        :transparent="true"
        :opacity="g.op * (0.7 + 0.3 * Math.sin(t * 2 + gi * 1.7))"
        :blending="2"
        :fog="false"
        :depth-write="false"
      />
    </TresMesh>

    <!-- Each lit lamp — a lotus water-lantern afloat -->
    <TresGroup v-for="l in lanterns" :key="l.id" :position="place(l)" :rotation="[0, l.spin, rock(l)]">
      <!-- expanding ripple on the water -->
      <TresMesh :position="[0, 0.005, 0]" :rotation="[-Math.PI / 2, 0, 0]" :scale="[ripple(l), ripple(l), 1]">
        <TresRingGeometry :args="[0.34, 0.4, 24]" />
        <TresMeshBasicMaterial :color="l.glow" :transparent="true" :opacity="rippleFade(l)" :depth-write="false" />
      </TresMesh>

      <!-- lotus petals — rounded, layered rings, coloured per lantern -->
      <TresMesh
        v-for="(pt, pi) in PETALS"
        :key="pi"
        :position="[Math.cos(pt.a) * pt.r, 0.06 + pt.lift, Math.sin(pt.a) * pt.r]"
        :rotation="[pt.tilt, -pt.a + Math.PI / 2, 0]"
        :scale="[0.09, 0.03, 0.2]"
      >
        <TresSphereGeometry :args="[1, 10, 8]" />
        <TresMeshStandardMaterial
          :color="pt.inner ? l.edge : l.petal"
          :emissive="l.petal"
          :emissive-intensity="0.28"
          :roughness="0.5"
          :metalness="0.05"
        />
      </TresMesh>

      <!-- candle -->
      <TresMesh :position="[0, 0.1, 0]">
        <TresCylinderGeometry :args="[0.035, 0.045, 0.12, 8]" />
        <TresMeshStandardMaterial color="#fff4dc" :emissive="'#ffcf87'" :emissive-intensity="0.6" />
      </TresMesh>
      <!-- flame — soft teardrop, the bloom source -->
      <TresMesh :position="[0, 0.24, 0]" :scale="[l.flame, l.flame * 1.7, l.flame]">
        <TresSphereGeometry :args="[0.05, 10, 10]" />
        <TresMeshBasicMaterial :color="'#ffdf92'" />
      </TresMesh>
      <TresMesh :position="[0, 0.22, 0]" :scale="[l.flame, l.flame * 1.4, l.flame]">
        <TresSphereGeometry :args="[0.032, 8, 8]" />
        <TresMeshBasicMaterial :color="'#fff8e6'" />
      </TresMesh>
      <!-- soft halo, tinted to the lotus -->
      <TresMesh :position="[0, 0.2, 0]">
        <TresSphereGeometry :args="[0.42, 12, 12]" />
        <TresMeshBasicMaterial :color="l.glow" :transparent="true" :opacity="0.17" :depth-write="false" />
      </TresMesh>
      <!-- reflection glow streaking down the water -->
      <TresMesh :position="[0, -0.5, 0.03]">
        <TresPlaneGeometry :args="[0.22, 1.3]" />
        <TresMeshBasicMaterial :color="l.glow" :transparent="true" :opacity="0.32" :depth-write="false" />
      </TresMesh>
    </TresGroup>

    <Suspense>
      <EffectComposerPmndrs>
        <BloomPmndrs :intensity="1.15" :luminance-threshold="0.2" :luminance-smoothing="0.5" :mipmap-blur="true" :radius="0.7" />
      </EffectComposerPmndrs>
    </Suspense>
  </TresCanvas>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { TresCanvas } from '@tresjs/core'
import { OrbitControls } from '@tresjs/cientos'
import { EffectComposerPmndrs, BloomPmndrs } from '@tresjs/post-processing'

interface Lamp {
  id: string
  targetName: string
  merit: number
}
const props = defineProps<{ lamps: Lamp[]; newestId?: string }>()

const WIDTH = 14
const MAX = 28

// A lotus of rounded petals in three layered rings, laid out once.
const TAU = Math.PI * 2
function ring(n: number, r: number, tilt: number, lift: number, off: number, inner: boolean) {
  return Array.from({ length: n }, (_, i) => ({ a: (i / n) * TAU + off, r, tilt, lift, inner }))
}
const PETALS = [
  ...ring(9, 0.15, 1.15, 0, 0, false), // outer, laid open on the water
  ...ring(7, 0.1, 0.82, 0.03, 0.4, false), // middle
  ...ring(5, 0.05, 0.45, 0.06, 0.2, true), // inner, upright, lighter tips
]

// Each lantern takes one lotus colour, so the river is a mix of hues.
const PALETTES = [
  { petal: '#f4a0bd', edge: '#ffe3ee', glow: '#ff8bb0' }, // pink
  { petal: '#f2f2ff', edge: '#ffffff', glow: '#dcd6ff' }, // white
  { petal: '#a6c0ff', edge: '#e2ecff', glow: '#7fa4ff' }, // blue lotus
  { petal: '#caa3f2', edge: '#efe0ff', glow: '#b483f0' }, // purple
  { petal: '#ffd39a', edge: '#fff0d2', glow: '#ffb64a' }, // gold
  { petal: '#93e6c8', edge: '#dafff2', glow: '#5fe0b0' }, // jade
  { petal: '#ff9e8a', edge: '#ffe0d6', glow: '#ff7e63' }, // coral
]

// Moon and the broken glitter of its reflection running toward the viewer.
const MOON_X = 0.9
const MOON_Y = 2.7
const MOON_Z = -13
const moonRoad = Array.from({ length: 40 }, (_, i) => {
  const f = i / 39 // 0 = far (near the moon), 1 = near the camera
  const jitter = Math.sin(i * 12.9898) // deterministic pseudo-random
  return {
    // narrow near the moon, fanning wider toward the viewer
    x: MOON_X + jitter * (0.12 + f * 1.3),
    z: MOON_Z + 0.8 + f * (MOON_Z * -1 + 1.5),
    rx: 0.05 + Math.abs(Math.sin(i * 7.31)) * 0.14,
    rz: 0.035 + Math.abs(Math.sin(i * 3.13)) * 0.08,
    op: 0.35 + Math.abs(Math.sin(i * 5.7)) * 0.35,
  }
})

// A scatter of faint stars.
const starPositions = new Float32Array(
  Array.from({ length: 120 }, () => [
    (Math.random() - 0.5) * 44,
    4 + Math.random() * 10,
    -6 - Math.random() * 14,
  ]).flat(),
)

function hash(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return (h >>> 0) / 4294967295
}

interface Lantern {
  id: string
  x0: number
  z: number
  speed: number
  bob: number
  phase: number
  spin: number
  flame: number
  ripPhase: number
  petal: string
  edge: string
  glow: string
}

const lanterns = computed<Lantern[]>(() =>
  props.lamps.slice(0, MAX).map((lamp) => {
    const r1 = hash(lamp.id)
    const r2 = hash(lamp.id + '·z')
    const r3 = hash(lamp.id + '·s')
    const pal = PALETTES[Math.floor(hash(lamp.id + '·c') * PALETTES.length) % PALETTES.length]
    return {
      id: lamp.id,
      x0: r1 * WIDTH,
      z: -8 + r2 * 9,
      speed: 0.12 + r3 * 0.11,
      bob: 0.5 + r1 * 0.7,
      phase: r2 * Math.PI * 2,
      spin: r3 * Math.PI * 2,
      flame: 0.85 + Math.min(1, lamp.merit / 108) * 0.6,
      ripPhase: r1 * Math.PI * 2,
      petal: pal.petal,
      edge: pal.edge,
      glow: pal.glow,
    }
  }),
)

// New-lamp float-out: the newest lantern eases in from near the viewer.
const t = ref(0)
let spawnAt = -10
watch(
  () => props.newestId,
  () => {
    spawnAt = t.value
  },
)

function baseX(l: Lantern): number {
  return ((l.x0 + t.value * l.speed) % WIDTH) - WIDTH / 2
}
function place(l: Lantern): [number, number, number] {
  const bx = baseX(l)
  const y = 0.02 + Math.sin(t.value * l.bob + l.phase) * 0.03
  if (l.id === props.newestId) {
    const k = Math.min(1, (t.value - spawnAt) / 2.4)
    if (k < 1) {
      const ease = 1 - Math.pow(1 - k, 3)
      // drift out from just in front of the camera to its place on the river
      return [bx * ease, y + (1 - ease) * 0.15, 3.2 + (l.z - 3.2) * ease]
    }
  }
  return [bx, y, l.z]
}
function rock(l: Lantern): number {
  return Math.sin(t.value * l.bob * 0.8 + l.phase) * 0.05
}
function ripple(l: Lantern): number {
  const p = ((t.value * 0.4 + l.ripPhase) % (Math.PI * 2)) / (Math.PI * 2)
  return 0.5 + p * 2.2
}
function rippleFade(l: Lantern): number {
  const p = ((t.value * 0.4 + l.ripPhase) % (Math.PI * 2)) / (Math.PI * 2)
  return 0.18 * (1 - p)
}

let frame = 0
let last = 0
function animate(now: number) {
  if (last) t.value += (now - last) / 1000
  last = now
  frame = requestAnimationFrame(animate)
}
onMounted(() => {
  frame = requestAnimationFrame(animate)
})
onUnmounted(() => cancelAnimationFrame(frame))
</script>
