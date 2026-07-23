<template>
  <div
    class="ocean"
    @pointerdown="onDown"
    @pointermove="onMove"
    @pointerup="onUp"
    @pointercancel="onUp"
    @pointerleave="onUp"
  >
    <TresCanvas :alpha="true" :antialias="true">
      <TresPerspectiveCamera :position="CAM" :fov="52" :look-at="lookAt" />

      <!-- Daytime needs a painted sky. At night the canvas is left clear
           so the app's own starfield shows through behind these stars. -->
      <TresMesh v-if="isDay">
        <TresSphereGeometry :args="[1600, 32, 16]" />
        <TresShaderMaterial
          :vertex-shader="skyVert"
          :fragment-shader="skyFrag"
          :uniforms="skyUniforms"
          :side="BackSide"
          :depthWrite="false"
        />
      </TresMesh>

      <primitive v-if="!isDay" :object="starField" />

      <!-- Sun or moon -->
      <TresMesh :position="LIGHT">
        <TresCircleGeometry :args="[isDay ? 15 : 13, 64]" />
        <TresMeshBasicMaterial :color="discColor" :toneMapped="false" />
      </TresMesh>

      <TresMesh :position="[LIGHT[0], LIGHT[1], LIGHT[2] - 4]">
        <TresCircleGeometry :args="[190, 64]" />
        <TresMeshBasicMaterial
          :map="glowTexture"
          :color="glowTint"
          :transparent="true"
          :depthWrite="false"
          :blending="AdditiveBlending"
          :toneMapped="false"
        />
      </TresMesh>

      <!-- Sea -->
      <TresMesh :rotation="[-Math.PI / 2, 0, 0]" :position="[0, 0, 0]">
        <TresPlaneGeometry :args="[460, 460, 360, 360]" />
        <TresShaderMaterial
          :vertex-shader="vertexShader"
          :fragment-shader="fragmentShader"
          :uniforms="uniforms"
          :transparent="true"
          :depthWrite="false"
        />
      </TresMesh>
    </TresCanvas>
  </div>
</template>

<script setup lang="ts">
import { ref, shallowRef, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import {
  Points,
  PointsMaterial,
  BufferGeometry,
  BufferAttribute,
  Vector3,
  Color,
  CanvasTexture,
  AdditiveBlending,
  BackSide,
  SRGBColorSpace,
} from 'three'
// TresCanvas is a real component, not one of the custom elements the Tres
// compiler options whitelist — it has to be imported.
import { TresCanvas } from '@tresjs/core'

/**
 * An open sea under sun or stars.
 *
 * The light path — the streak running from the sun or moon toward the
 * viewer — is not painted in. It falls out of the specular term: wave
 * facets whose normals align with the half vector toward the light catch
 * it, and because the swell runs across the view those facets stack into
 * a column. Flat water would give a mirror; this gives a shimmering road.
 */

const props = withDefaults(
  defineProps<{
    mode?: 'night' | 'day'
    /** Hold the sea at one moment instead of animating it */
    still?: boolean
  }>(),
  { mode: 'night', still: false }
)

const isDay = computed(() => props.mode === 'day')

// Kept low in both modes: a light near the horizon is what stretches the
// reflection into a long road rather than a puddle under the disc.
//
// It also has to sit *beyond* the sea, not in front of it. At close range
// the disc reads as a lamp floating on the water; out here it reads as
// something in the sky, and its rays arrive nearly parallel the way real
// sunlight does.
const LIGHT: [number, number, number] = [0, 36, -600]
const TARGET: [number, number, number] = [0, 2, -6]
const ORBIT_R = 15
const CAM_Y = 0.92

const PALETTE = {
  night: {
    disc: '#f6f3e6',
    glow: '#dfe6f5',
    light: '#e8ecf5',
    deep: '#04060f',
    horizon: '#0b1020',
    sky: '#12203c',
  },
  day: {
    disc: '#fffdf2',
    glow: '#ffe6b8',
    light: '#fff4dc',
    deep: '#0d3350',
    horizon: '#a8c8dd',
    sky: '#7fb0d8',
  },
} as const

const palette = computed(() => PALETTE[props.mode])
const discColor = computed(() => palette.value.disc)
const glowTint = computed(() => palette.value.glow)

// — Stars ——————————————————————————————————
function buildStars(): Points {
  const COUNT = 1600
  const pos = new Float32Array(COUNT * 3)
  const col = new Float32Array(COUNT * 3)

  const tints = [
    [1.0, 1.0, 1.0],
    [1.0, 1.0, 1.0],
    [0.78, 0.82, 1.0],
    [0.75, 0.86, 1.0],
    [1.0, 0.9, 0.7],
    [0.91, 0.83, 1.0],
  ]

  for (let i = 0; i < COUNT; i++) {
    // Upper hemisphere only — nothing below the waterline is ever seen,
    // and a third of the points would otherwise sit under it.
    const theta = Math.random() * Math.PI * 2
    // Biased toward the horizon, where the sky reads as deepest
    const phi = Math.acos(Math.pow(Math.random(), 1.7))
    const r = 1200

    pos[i * 3] = r * Math.sin(phi) * Math.cos(theta)
    pos[i * 3 + 1] = r * Math.cos(phi)
    pos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta)

    const t = tints[Math.floor(Math.random() * tints.length)]
    const b = 0.35 + Math.random() * 0.65
    col[i * 3] = t[0] * b
    col[i * 3 + 1] = t[1] * b
    col[i * 3 + 2] = t[2] * b
  }

  const geo = new BufferGeometry()
  geo.setAttribute('position', new BufferAttribute(pos, 3))
  geo.setAttribute('color', new BufferAttribute(col, 3))

  return new Points(
    geo,
    new PointsMaterial({
      size: 1.7,
      sizeAttenuation: false,
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      toneMapped: false,
    })
  )
}

/** Soft radial falloff for the halo around the disc. */
function makeGlow(): CanvasTexture {
  const c = document.createElement('canvas')
  c.width = c.height = 256
  const g = c.getContext('2d')!
  const grad = g.createRadialGradient(128, 128, 0, 128, 128, 128)
  grad.addColorStop(0.0, 'rgba(255,255,255,0.45)')
  grad.addColorStop(0.14, 'rgba(255,255,255,0.2)')
  grad.addColorStop(0.4, 'rgba(255,255,255,0.07)')
  grad.addColorStop(1.0, 'rgba(255,255,255,0)')
  g.fillStyle = grad
  g.fillRect(0, 0, 256, 256)
  const tex = new CanvasTexture(c)
  tex.colorSpace = SRGBColorSpace
  return tex
}

const starField = shallowRef(buildStars())
const glowTexture = shallowRef(makeGlow())

// — Look around ————————————————————————————
/**
 * First person rather than an orbit.
 *
 * Orbiting a centre point implies something at that centre worth
 * circling. With the figure gone there is only open water, so the camera
 * stays put and turns in place: you are standing on the sea looking
 * around it, and the horizon stays level the whole way round.
 */
const CAM: [number, number, number] = [0, 1.1, 6]

const yaw = ref(0) // unbounded — a full turn brings you back around
const pitch = ref(0.05)

// Down far enough to fill the frame with water, up to well past the
// zenith, but never so far that the horizon rolls out of the world.
const PITCH_MIN = -0.32
const PITCH_MAX = 0.92

let velYaw = 0
let velPitch = 0
let dragging = false
let lastX = 0
let lastY = 0

const lookAt = computed<[number, number, number]>(() => {
  const cp = Math.cos(pitch.value)
  return [
    CAM[0] + cp * Math.sin(yaw.value) * 10,
    CAM[1] + Math.sin(pitch.value) * 10,
    CAM[2] - cp * Math.cos(yaw.value) * 10,
  ]
})

function clampPitch(v: number): number {
  return Math.min(PITCH_MAX, Math.max(PITCH_MIN, v))
}

function onDown(e: PointerEvent) {
  dragging = true
  lastX = e.clientX
  lastY = e.clientY
  velYaw = 0
  velPitch = 0
  ;(e.currentTarget as Element).setPointerCapture?.(e.pointerId)
}

function onMove(e: PointerEvent) {
  if (!dragging) return
  const dx = e.clientX - lastX
  const dy = e.clientY - lastY
  lastX = e.clientX
  lastY = e.clientY

  velYaw = -dx * 0.0032
  velPitch = dy * 0.0026

  yaw.value += velYaw
  pitch.value = clampPitch(pitch.value + velPitch)
}

function onUp(e: PointerEvent) {
  dragging = false
  ;(e.currentTarget as Element).releasePointerCapture?.(e.pointerId)
}

// — Sky dome ———————————————————————————————
const skyUniforms = {
  uTop: { value: new Color(PALETTE.day.sky) },
  uBottom: { value: new Color(PALETTE.day.horizon) },
}

const skyVert = /* glsl */ `
  varying vec3 vPos;
  void main() {
    vPos = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const skyFrag = /* glsl */ `
  uniform vec3 uTop;
  uniform vec3 uBottom;
  varying vec3 vPos;
  void main() {
    // Must equal uBottom exactly at y = 0. Any offset here leaves the
    // sky a different colour from the sea haze and draws a seam along
    // the horizon.
    float h = clamp(vPos.y / 1600.0, 0.0, 1.0);
    gl_FragColor = vec4(mix(uBottom, uTop, pow(h, 0.55)), 1.0);
  }
`

// — Sea ————————————————————————————————————
const uniforms = {
  uTime: { value: 0 },
  uLight: { value: new Vector3(...LIGHT) },
  uLightColor: { value: new Color(PALETTE.night.light) },
  uDeep: { value: new Color(PALETTE.night.deep) },
  uHorizon: { value: new Color(PALETTE.night.horizon) },
  uSky: { value: new Color(PALETTE.night.sky) },
}

watch(
  palette,
  (p) => {
    uniforms.uLightColor.value.set(p.light)
    uniforms.uDeep.value.set(p.deep)
    uniforms.uHorizon.value.set(p.horizon)
    uniforms.uSky.value.set(p.sky)
  },
  { immediate: true }
)

const vertexShader = /* glsl */ `
  uniform float uTime;
  varying vec3 vWorld;
  varying vec3 vNrm;

  // Layered swell. The periods are deliberately non-harmonic so the
  // surface never visibly loops.
  float height(vec2 p) {
    float h = 0.0;
    h += sin(p.x * 0.22 + uTime * 0.55) * 0.26;
    h += sin(p.y * 0.31 - uTime * 0.41) * 0.19;
    h += sin((p.x + p.y) * 0.47 + uTime * 0.83) * 0.075;
    h += sin((p.x - p.y) * 0.79 - uTime * 1.27) * 0.038;
    h += sin(p.y * 1.9 + uTime * 2.1) * 0.02;
    return h;
  }

  void main() {
    vec3 pos = position;
    pos.z += height(pos.xy);

    // Normals from finite differences of the same field, so the shading
    // always agrees with the displacement.
    float e = 0.6;
    float dx = height(pos.xy + vec2(e, 0.0)) - height(pos.xy - vec2(e, 0.0));
    float dy = height(pos.xy + vec2(0.0, e)) - height(pos.xy - vec2(0.0, e));
    vec3 n = normalize(vec3(-dx, -dy, 2.0 * e));

    vec4 world = modelMatrix * vec4(pos, 1.0);
    vWorld = world.xyz;
    vNrm = normalize(mat3(modelMatrix) * n);

    gl_Position = projectionMatrix * viewMatrix * world;
  }
`

const fragmentShader = /* glsl */ `
  uniform vec3 uLight;
  uniform vec3 uLightColor;
  uniform vec3 uDeep;
  uniform vec3 uHorizon;
  uniform vec3 uSky;
  varying vec3 vWorld;
  varying vec3 vNrm;

  void main() {
    vec3 N = normalize(vNrm);
    vec3 V = normalize(cameraPosition - vWorld);
    vec3 L = normalize(uLight - vWorld);
    vec3 H = normalize(L + V);
    float ndh = max(dot(N, H), 0.0);

    // Tight highlight for the glitter, broad one for the sheen it sits in
    float glitter = pow(ndh, 300.0) * 3.8;
    float sheen   = pow(ndh, 14.0) * 0.5;

    // Water is dark looking straight down and mirrors the sky at
    // grazing angles — that fresnel term is most of its colour
    float fres = pow(1.0 - max(dot(N, V), 0.0), 4.0);

    vec3 col = mix(uDeep, uSky, fres * 0.55);
    col += uLightColor * (glitter + sheen);

    float d = length(vWorld.xz - cameraPosition.xz);

    // Haze first takes the colour all the way to the sky's horizon tone,
    // then alpha takes the surface out entirely. A plane that simply
    // stops leaves a hard rim; this dissolves before it ever gets there.
    col = mix(col, uHorizon, smoothstep(30.0, 130.0, d));
    float a = 1.0 - smoothstep(140.0, 205.0, d);

    gl_FragColor = vec4(col, a);
  }
`

/**
 * Plain rAF rather than Tres's `useLoop`.
 *
 * `useLoop` resolves the Tres context, which only exists *inside* a
 * TresCanvas — calling it here, in the component that renders the canvas,
 * throws during setup and takes the whole scene down silently. The
 * uniforms object is passed by reference to the shader material, so
 * mutating it from anywhere reaches the GPU on the next frame.
 */
let raf = 0
let startedAt = 0

function tick(now: number) {
  if (!startedAt) startedAt = now
  const elapsed = (now - startedAt) / 1000

  // Held at a fixed moment when motion is reduced: the sea is still
  // there, still lit, just not moving.
  uniforms.uTime.value = props.still ? 8 : elapsed

  // Let a flick coast to a stop instead of halting on release
  if (!dragging && (Math.abs(velYaw) > 0.00002 || Math.abs(velPitch) > 0.00002)) {
    yaw.value += velYaw
    pitch.value = clampPitch(pitch.value + velPitch)
    velYaw *= 0.945
    velPitch *= 0.945
  }

  raf = requestAnimationFrame(tick)
}

onMounted(() => {
  raf = requestAnimationFrame(tick)
})

onBeforeUnmount(() => {
  cancelAnimationFrame(raf)
  glowTexture.value?.dispose()
  starField.value.geometry.dispose()
  ;(starField.value.material as PointsMaterial).dispose()
})
</script>

<style scoped>
.ocean {
  position: absolute;
  inset: 0;
  /* Every direction turns the view, so the browser must not claim any
     of them for scrolling. The hero is sized to fit without the page
     needing to scroll here. */
  touch-action: none;
  cursor: grab;
}

.ocean:active {
  cursor: grabbing;
}
</style>
