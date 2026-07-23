<template>
  <TresMesh :rotation="rotation" :scale="[scale, scale, scale]">
    <TresOctahedronGeometry v-if="params.geometry === 'octahedron'" :args="[1, 1]" />
    <TresIcosahedronGeometry v-else-if="params.geometry === 'icosahedron'" :args="[1, 0]" />
    <TresDodecahedronGeometry v-else-if="params.geometry === 'dodecahedron'" :args="[1, 0]" />
    <TresSphereGeometry v-else-if="params.geometry === 'sphere'" :args="[1, 24, 16]" />
    <TresLatheGeometry v-else-if="lathe" :args="[lathe, 10]" />
    <TresTetrahedronGeometry v-else :args="[1, 1]" />

    <!-- Lite: a cheap faceted crystal for scenes with many stones at once
         (the 淨土 mandala). No transmission, so dozens render without the
         per-gem refraction pass that would stall a phone. -->
    <TresMeshStandardMaterial
      v-if="lite"
      :color="params.colorHex"
      :metalness="0.1"
      :roughness="0.15"
      :emissive="params.colorHex"
      :emissiveIntensity="0.35"
      :envMapIntensity="1.6"
      :flatShading="faceted"
      :transparent="true"
      :opacity="0.9"
    />

    <TresMeshPhysicalMaterial
      v-else
      :color="'#ffffff'"
      :metalness="0"
      :roughness="roughness"
      :transmission="1"
      :thickness="thickness"
      :ior="2.42"
      :dispersion="0.42"
      :attenuationColor="params.colorHex"
      :attenuationDistance="attenuationDistance"
      :iridescence="iridescence"
      :iridescenceIOR="params.iridescenceIOR"
      :clearcoat="1"
      :clearcoatRoughness="0.02"
      :envMapIntensity="3"
      :specularIntensity="1"
      :flatShading="faceted"
      :side="FrontSide"
    />
  </TresMesh>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { FrontSide, Vector2 } from 'three'
import type { GemParams } from 'src/types/gem'

/**
 * A single gem.
 *
 * Colour comes from `attenuationColor` — the tint light picks up passing
 * through the stone — rather than from `color`. On a fully transmissive
 * material `color` acts as a filter over the surface and drags the whole
 * gem toward black, which is what the earlier version was doing.
 *
 * Requires a `scene.environment` to refract; see GemEnvironment.vue.
 */

const props = defineProps<{
  params: GemParams
  scale?: number
  autoRotate?: boolean
  /** Use the cheap crystal material — for scenes drawing many gems at once. */
  lite?: boolean
}>()

const scale = props.scale ?? 1

// Flat shading gives polyhedra crisp, individually lit facets. A sphere
// keeps its smooth normals — that one reads as a polished cabochon.
const faceted = computed(() => props.params.geometry !== 'sphere')

/*
 * Shapes belonging to a particular sutra, revolved from a profile.
 *
 * Ten radial segments rather than a smooth sweep: a lathe at high
 * resolution gives a pottery vase, while a coarse one leaves vertical
 * facets down the sides, which is what keeps these reading as cut
 * stones instead of ornaments.
 */
const PROFILES: Record<string, [number, number][]> = {
  // 寶瓶 — foot, swelling belly, drawn-in neck, flared lip
  vase: [
    [0, -1.05], [0.34, -1.05], [0.3, -0.92], [0.46, -0.78],
    [0.66, -0.44], [0.7, -0.05], [0.58, 0.34], [0.36, 0.55],
    [0.3, 0.7], [0.42, 0.82], [0.34, 0.9], [0, 0.92],
  ],
  // 蓮華 — a bud. The belly sits low and the taper runs long, so the
  // tip draws out to a point instead of rounding off like an egg.
  lotus: [
    [0, -0.95], [0.32, -0.93], [0.6, -0.76], [0.76, -0.46],
    [0.78, -0.12], [0.68, 0.22], [0.5, 0.56], [0.32, 0.9],
    [0.17, 1.18], [0.07, 1.42], [0.02, 1.56], [0, 1.64],
  ],
  // 寶塔 — five tiers to a spire. Each storey ends in a small outward
  // flare before the next steps in: those overhanging eaves are what
  // separate a pagoda from a plain cone.
  stupa: [
    [0, -1.05], [0.82, -1.05], [0.88, -0.95], [0.6, -0.88],
    [0.58, -0.64], [0.72, -0.56], [0.48, -0.5],
    [0.46, -0.28], [0.6, -0.2], [0.38, -0.14],
    [0.36, 0.06], [0.48, 0.14], [0.28, 0.2],
    [0.26, 0.4], [0.36, 0.47], [0.18, 0.53],
    [0.13, 0.72], [0.19, 0.79], [0.08, 0.85],
    [0.06, 1.1], [0.03, 1.24], [0, 1.36],
  ],
  // 佛頂 — a dome closed by the ushnisha
  dome: [
    [0, -0.8], [0.72, -0.8], [0.78, -0.62], [0.74, -0.28],
    [0.6, 0.08], [0.38, 0.38], [0.18, 0.54], [0.16, 0.66],
    [0.1, 0.76], [0, 0.8],
  ],
}

const lathe = computed(() => {
  const pts = PROFILES[props.params.geometry]
  return pts ? pts.map(([x, y]) => new Vector2(x, y)) : null
})

// The stored `transmission` no longer switches transmission on and off
// (every gem is fully transmissive) — it drives how much stone the light
// has to cross, so saved gems still vary in depth of colour.
const thickness = computed(() => 0.7 + props.params.transmission * 0.9)

// Absorption is what separates a gem from a coloured marble. Short
// distances soak up the light and the stone goes muddy; keeping it long
// lets most of the light through and leaves only a tint behind.
const attenuationDistance = computed(() => 2.4 + props.params.transmission * 2.2)

// Stored roughness ranges to 0.15, which frosts the surface. A cut stone
// is polished — capping it low keeps the facets mirror-sharp.
const roughness = computed(() => Math.min(props.params.roughness, 0.04))

// Full-strength iridescence reads as an oil slick. Held back, it becomes
// the faint colour shift you get across a real polished facet.
const iridescence = computed(() => props.params.iridescence * 0.35)

const rotation = ref<[number, number, number]>([0, 0, 0])
let animFrame = 0

function animate() {
  if (!props.autoRotate) return
  rotation.value = [
    rotation.value[0] + 0.0015,
    rotation.value[1] + 0.005,
    rotation.value[2] + 0.001,
  ]
  animFrame = requestAnimationFrame(animate)
}

onMounted(() => {
  if (props.autoRotate) animate()
})

onUnmounted(() => {
  if (animFrame) cancelAnimationFrame(animFrame)
})
</script>
