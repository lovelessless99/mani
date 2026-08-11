<template>
  <div
    class="river"
    @pointerdown="onDown"
    @pointermove="onMove"
    @pointerup="onUp"
    @pointercancel="onUp"
    @pointerleave="onUp"
  >
    <TresCanvas clear-color="#05070f" :antialias="true" :alpha="false">
      <TresPerspectiveCamera ref="camRef" :position="CAM" :fov="56" :look-at="lookAt" />

      <TresAmbientLight :intensity="0.45" color="#54689e" />
      <TresDirectionalLight :position="[2, 6, 3]" :intensity="0.3" color="#9fb6ff" />

      <!-- Stars, constellations, moon -->
      <primitive :object="starField" />
      <primitive :object="constellations" />
      <TresMesh :position="LIGHT">
        <TresCircleGeometry :args="[13, 64]" />
        <TresMeshBasicMaterial color="#f6f3e6" :tone-mapped="false" :fog="false" />
      </TresMesh>
      <TresMesh :position="[LIGHT[0], LIGHT[1], LIGHT[2] - 4]">
        <TresCircleGeometry :args="[58, 64]" />
        <TresMeshBasicMaterial
          :map="glowTexture"
          color="#dfe6f5"
          :transparent="true"
          :depth-write="false"
          :blending="AdditiveBlending"
          :tone-mapped="false"
          :fog="false"
        />
      </TresMesh>

      <!-- Shader sea -->
      <TresMesh :rotation="[-Math.PI / 2, 0, 0]" :position="[0, 0, 0]">
        <TresPlaneGeometry :args="[460, 460, 300, 300]" />
        <TresShaderMaterial
          :vertex-shader="vertexShader"
          :fragment-shader="fragmentShader"
          :uniforms="uniforms"
          :transparent="true"
          :depth-write="true"
        />
      </TresMesh>

      <!-- Floating light orbs (one per lamp) -->
      <TresGroup v-for="l in lanterns" :key="l.id" :position="place(l)">
        <TresMesh :position="[0, 0.01, 0]" :rotation="[-Math.PI / 2, 0, 0]" :scale="[ripple(l), ripple(l), 1]">
          <TresRingGeometry :args="[0.4, 0.48, 24]" />
          <TresMeshBasicMaterial :color="l.glow" :transparent="true" :opacity="rippleFade(l)" :depth-write="false" />
        </TresMesh>
        <!-- glowing orb — beats like a heartbeat -->
        <TresMesh :position="[0, 0.22, 0]" :scale="beat(l) * (l.id === selectedId ? 1.3 : 1)">
          <TresSphereGeometry :args="[0.24, 20, 18]" />
          <TresMeshBasicMaterial :color="l.glow" :transparent="true" :opacity="0.85" :tone-mapped="false" />
        </TresMesh>
        <TresMesh :position="[0, 0.22, 0]" :scale="beat(l) * (l.id === selectedId ? 1.3 : 1)">
          <TresSphereGeometry :args="[0.12, 12, 12]" />
          <TresMeshBasicMaterial color="#fff6de" :tone-mapped="false" />
        </TresMesh>
        <!-- reflection -->
        <TresMesh :position="[0, -0.55, 0.02]">
          <TresPlaneGeometry :args="[0.34, 1.4]" />
          <TresMeshBasicMaterial :color="l.glow" :transparent="true" :opacity="0.32" :depth-write="false" />
        </TresMesh>
      </TresGroup>

      <Suspense>
        <EffectComposerPmndrs>
          <BloomPmndrs :intensity="0.85" :luminance-threshold="0.6" :luminance-smoothing="0.5" :mipmap-blur="true" :radius="0.72" />
        </EffectComposerPmndrs>
      </Suspense>
    </TresCanvas>
  </div>
</template>

<script setup lang="ts">
import { ref, shallowRef, computed, onMounted, onBeforeUnmount } from 'vue'
import { TresCanvas } from '@tresjs/core'
import { EffectComposerPmndrs, BloomPmndrs } from '@tresjs/post-processing'
import {
  Points,
  PointsMaterial,
  BufferGeometry,
  BufferAttribute,
  Vector3,
  Color,
  CanvasTexture,
  AdditiveBlending,
  SRGBColorSpace,
  Group,
  Mesh,
  CylinderGeometry,
  MeshBasicMaterial,
  type PerspectiveCamera,
} from 'three'
import figuresData from 'src/data/meta/constellation-figures.json'

interface Lamp {
  id: string
  targetName: string
  merit: number
}
const props = defineProps<{ lamps: Lamp[]; selectedId?: string }>()
const emit = defineEmits<{ select: [id: string] }>()

const LIGHT: [number, number, number] = [0, 34, -520]
const CAM: [number, number, number] = [0, 1.2, 3.5]
const camRef = shallowRef<{ instance?: PerspectiveCamera } | PerspectiveCamera | null>(null)
const TAU = Math.PI * 2

// — First-person look, exactly as the home sea: yaw turns a full circle —
const yaw = ref(0)
const pitch = ref(0.3) // look up a touch so the sky fills ~two-thirds
const PITCH_MIN = -0.15
const PITCH_MAX = 0.85
const lookAt = computed<[number, number, number]>(() => {
  const cp = Math.cos(pitch.value)
  return [CAM[0] + cp * Math.sin(yaw.value) * 10, CAM[1] + Math.sin(pitch.value) * 10, CAM[2] - cp * Math.cos(yaw.value) * 10]
})
let velYaw = 0
let velPitch = 0
let dragging = false
let lastX = 0
let lastY = 0
let downX = 0
let downY = 0
let moved = 0
function onDown(e: PointerEvent) {
  dragging = true
  lastX = downX = e.clientX
  lastY = downY = e.clientY
  moved = 0
  velYaw = velPitch = 0
  ;(e.currentTarget as Element).setPointerCapture?.(e.pointerId)
}
function onMove(e: PointerEvent) {
  if (!dragging) return
  const dx = e.clientX - lastX
  const dy = e.clientY - lastY
  lastX = e.clientX
  lastY = e.clientY
  moved += Math.abs(dx) + Math.abs(dy)
  velYaw = -dx * 0.0034
  velPitch = dy * 0.0026
  yaw.value += velYaw
  pitch.value = Math.min(PITCH_MAX, Math.max(PITCH_MIN, pitch.value + velPitch))
}
function onUp(e: PointerEvent) {
  dragging = false
  ;(e.currentTarget as Element).releasePointerCapture?.(e.pointerId)
  if (moved < 8) tapSelect(e)
}

function getCamera(): PerspectiveCamera | null {
  const r = camRef.value as { instance?: PerspectiveCamera } | PerspectiveCamera | null
  if (!r) return null
  return (r as { instance?: PerspectiveCamera }).instance ?? (r as PerspectiveCamera)
}
function tapSelect(e: PointerEvent) {
  const cam = getCamera()
  const host = e.currentTarget as HTMLElement
  if (!cam || !host) return
  const rect = host.getBoundingClientRect()
  const px = e.clientX - rect.left
  const py = e.clientY - rect.top
  let best: Lantern | null = null
  let bestD = 70
  for (const l of lanterns.value) {
    const p = new Vector3(...place(l)).project(cam)
    if (p.z > 1) continue
    const sx = (p.x * 0.5 + 0.5) * rect.width
    const sy = (-p.y * 0.5 + 0.5) * rect.height
    const d = Math.hypot(sx - px, sy - py)
    if (d < bestD) {
      bestD = d
      best = l
    }
  }
  if (best) emit('select', best.id)
}

// — Stars & moon glow (home sea) —————————————————————
function buildStars(): Points {
  const COUNT = 1400
  const pos = new Float32Array(COUNT * 3)
  const col = new Float32Array(COUNT * 3)
  const tints = [
    [1, 1, 1],
    [1, 1, 1],
    [0.78, 0.82, 1],
    [0.75, 0.86, 1],
    [1, 0.9, 0.7],
    [0.91, 0.83, 1],
  ]
  for (let i = 0; i < COUNT; i++) {
    const theta = Math.random() * TAU
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
    new PointsMaterial({ size: 1.7, sizeAttenuation: false, vertexColors: true, transparent: true, depthWrite: false, blending: AdditiveBlending, toneMapped: false }),
  )
}
function makeGlow(): CanvasTexture {
  const c = document.createElement('canvas')
  c.width = c.height = 256
  const g = c.getContext('2d')!
  const grad = g.createRadialGradient(128, 128, 0, 128, 128, 128)
  grad.addColorStop(0, 'rgba(255,255,255,0.5)')
  grad.addColorStop(0.1, 'rgba(255,255,255,0.22)')
  grad.addColorStop(0.32, 'rgba(255,255,255,0.05)')
  grad.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = grad
  g.fillRect(0, 0, 256, 256)
  const tex = new CanvasTexture(c)
  tex.colorSpace = SRGBColorSpace
  return tex
}
const starField = shallowRef(buildStars())
const glowTexture = shallowRef(makeGlow())

// — Constellations: elegant thin lines + soft-glowing stars ——————
type Figure = { s: number[][]; l: number[][]; m: number[] }
const FIGS = figuresData as unknown as Record<string, Figure>
const YUP = new Vector3(0, 1, 0)
// Each constellation animates its own lines, so every line owns its material.
interface FigureAnim {
  mats: MeshBasicMaterial[]
  phase: number
}
const figureAnims: FigureAnim[] = []
function makeStarGlow(): CanvasTexture {
  const c = document.createElement('canvas')
  c.width = c.height = 64
  const g = c.getContext('2d')!
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32)
  grad.addColorStop(0, 'rgba(255,255,255,1)')
  grad.addColorStop(0.25, 'rgba(210,224,255,0.5)')
  grad.addColorStop(1, 'rgba(210,224,255,0)')
  g.fillStyle = grad
  g.fillRect(0, 0, 64, 64)
  const tex = new CanvasTexture(c)
  tex.colorSpace = SRGBColorSpace
  return tex
}
const starGlowTex = makeStarGlow()
// Pick a fresh handful of the 88 星宿 each time the scene loads.
function pickFigures(count: number): string[] {
  const keys = Object.keys(FIGS).filter((k) => FIGS[k]?.s?.length && FIGS[k]?.l?.length)
  for (let i = keys.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[keys[i], keys[j]] = [keys[j], keys[i]]
  }
  return keys.slice(0, count)
}
function buildConstellations(): Group {
  const g = new Group()
  figureAnims.length = 0
  const R = 820
  const chosen = pickFigures(8)
  chosen.forEach((key, idx) => {
    const fig = FIGS[key]
    if (!fig || !fig.s?.length) return
    const az = (idx / chosen.length) * TAU + 0.2
    const el = 0.28 + ((idx * 2) % 3) * 0.14
    const dir = new Vector3(Math.cos(el) * Math.sin(az), Math.sin(el), -Math.cos(el) * Math.cos(az)).multiplyScalar(R)
    const forward = dir.clone().negate().normalize()
    const right = new Vector3().crossVectors(YUP, forward).normalize()
    const up2 = new Vector3().crossVectors(forward, right).normalize()
    const S = 140
    const pts = fig.s.map(([x, y]) =>
      dir
        .clone()
        .add(right.clone().multiplyScalar(((x - 50) / 100) * S))
        .add(up2.clone().multiplyScalar((-(y - 50) / 100) * S)),
    )
    const mats: MeshBasicMaterial[] = []
    ;(fig.l ?? []).forEach(([a, b]) => {
      const A = pts[a]
      const B = pts[b]
      if (!A || !B) return
      const seg = B.clone().sub(A)
      const mat = new MeshBasicMaterial({ color: 0xcadcff, transparent: true, opacity: 0.14, blending: AdditiveBlending, depthWrite: false, toneMapped: false })
      const m = new Mesh(new CylinderGeometry(0.9, 0.9, seg.length(), 5, 1, true), mat)
      m.position.copy(A).add(B).multiplyScalar(0.5)
      m.quaternion.setFromUnitVectors(YUP, seg.normalize())
      g.add(m)
      mats.push(mat)
    })
    if (mats.length) figureAnims.push({ mats, phase: Math.random() })
    // soft-glowing stars — brighter for the marked ones
    const sharp: number[] = []
    const glow: number[] = []
    pts.forEach((p, i) => {
      sharp.push(...p.toArray())
      if (fig.m?.includes(i)) glow.push(...p.toArray())
    })
    const sg = new BufferGeometry()
    sg.setAttribute('position', new BufferAttribute(new Float32Array(sharp), 3))
    g.add(new Points(sg, new PointsMaterial({ color: 0xf2f6ff, size: 2.4, sizeAttenuation: false, transparent: true, opacity: 0.95, blending: AdditiveBlending, depthWrite: false, toneMapped: false })))
    if (glow.length) {
      const gg = new BufferGeometry()
      gg.setAttribute('position', new BufferAttribute(new Float32Array(glow), 3))
      g.add(new Points(gg, new PointsMaterial({ map: starGlowTex, color: 0xdfe9ff, size: 14, sizeAttenuation: false, transparent: true, opacity: 0.85, blending: AdditiveBlending, depthWrite: false, toneMapped: false })))
    }
  })
  return g
}
const constellations = shallowRef(buildConstellations())

// — Sea shader (home sea) ————————————————————————
const uniforms = {
  uTime: { value: 0 },
  uLight: { value: new Vector3(...LIGHT) },
  uLightColor: { value: new Color('#e8ecf5') },
  uDeep: { value: new Color('#04060f') },
  uHorizon: { value: new Color('#0b1020') },
  uSky: { value: new Color('#12203c') },
}
const vertexShader = /* glsl */ `
  uniform float uTime;
  varying vec3 vWorld;
  varying vec3 vNrm;
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
    float glitter = pow(ndh, 320.0) * 1.05;
    float sheen   = pow(ndh, 14.0) * 0.26;
    float fres = pow(1.0 - max(dot(N, V), 0.0), 4.0);
    vec3 col = mix(uDeep, uSky, fres * 0.55);
    col += uLightColor * (glitter + sheen);
    float d = length(vWorld.xz - cameraPosition.xz);
    col = mix(col, uHorizon, smoothstep(30.0, 130.0, d));
    float a = 1.0 - smoothstep(140.0, 205.0, d);
    gl_FragColor = vec4(col, a);
  }
`

// — Orbs scattered all around, so a full turn always meets more lanterns —
const MAX = 30
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
  x: number
  z: number
  bob: number
  phase: number
  glow: string
}
const lanterns = computed<Lantern[]>(() => {
  const list = props.lamps.slice(0, MAX)
  const n = Math.max(1, list.length)
  return list.map((lamp, i) => {
    const r1 = hash(lamp.id)
    const r2 = hash(lamp.id + '·z')
    const ang = ((i + r1) / n) * TAU
    const rad = 3.2 + r2 * 5.5
    const pal = PALETTES[Math.floor(hash(lamp.id + '·c') * PALETTES.length) % PALETTES.length]
    return {
      id: lamp.id,
      x: Math.cos(ang) * rad,
      z: Math.sin(ang) * rad,
      bob: 0.5 + r1 * 0.7,
      phase: r2 * TAU,
      glow: pal,
    }
  })
})
const PALETTES = ['#ff9ec0', '#ffd27a', '#9fd0ff', '#c6a3ff', '#87e6c0', '#ff9a86', '#f2f2ff']

const t = ref(0)
function place(l: Lantern): [number, number, number] {
  const x = l.x + Math.sin(t.value * 0.3 + l.phase) * 0.1
  const y = 0.02 + Math.sin(t.value * l.bob + l.phase) * 0.03
  const z = l.z + Math.cos(t.value * 0.28 + l.phase) * 0.09
  return [x, y, z]
}
// Heartbeat: two quick swells (lub-dub) then rest, each orb offset by its phase.
function beat(l: Lantern): number {
  const period = 1.5
  const x = (((t.value / period + l.phase) % 1) + 1) % 1
  const lub = Math.exp(-Math.pow(x / 0.07, 2))
  const dub = 0.6 * Math.exp(-Math.pow((x - 0.2) / 0.07, 2))
  return 1 + (lub + dub) * 0.2
}
function ripple(l: Lantern): number {
  const p = ((t.value * 0.4 + l.phase) % TAU) / TAU
  return 0.5 + p * 2.2
}
function rippleFade(l: Lantern): number {
  const p = ((t.value * 0.4 + l.phase) % TAU) / TAU
  return 0.18 * (1 - p)
}

let raf = 0
let startedAt = 0
function tick(now: number) {
  if (!startedAt) startedAt = now
  const elapsed = (now - startedAt) / 1000
  t.value = elapsed
  uniforms.uTime.value = elapsed
  // A bright pulse travels the length of each constellation and loops.
  for (const fa of figureAnims) {
    const count = fa.mats.length
    const loop = 4.5
    const head = ((((elapsed / loop + fa.phase) % 1) + 1) % 1) * count
    for (let i = 0; i < count; i++) {
      let d = Math.abs(i - head)
      d = Math.min(d, count - d)
      fa.mats[i].opacity = 0.13 + Math.exp(-(d * d) / 1.6) * 0.55
    }
  }
  if (!dragging && (Math.abs(velYaw) > 2e-5 || Math.abs(velPitch) > 2e-5)) {
    yaw.value += velYaw
    pitch.value = Math.min(PITCH_MAX, Math.max(PITCH_MIN, pitch.value + velPitch))
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
  starGlowTex.dispose()
  starField.value.geometry.dispose()
  ;(starField.value.material as PointsMaterial).dispose()
  constellations.value.traverse((o) => {
    const any = o as unknown as { geometry?: { dispose(): void }; material?: { dispose(): void } }
    any.geometry?.dispose?.()
    any.material?.dispose?.()
  })
})
</script>

<style scoped>
.river {
  position: absolute;
  inset: 0;
  touch-action: none;
  cursor: grab;
}
.river:active {
  cursor: grabbing;
}
</style>
