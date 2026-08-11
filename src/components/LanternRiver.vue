<template>
  <div
    class="sky"
    @pointerdown="onDown"
    @pointermove="onMove"
    @pointerup="onUp"
    @pointercancel="onUp"
    @pointerleave="onUp"
  >
    <TresCanvas clear-color="#05070f" :antialias="true" :alpha="false">
      <TresPerspectiveCamera ref="camRef" :position="CAM" :fov="58" :look-at="lookAt" />

      <TresAmbientLight :intensity="0.5" color="#54689e" />

      <!-- Star field, ambient 星宿, low moon -->
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

      <!-- Shader sea with a moonlit road (as the home ocean) -->
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

      <!-- Every dedication is its OWN small constellation (one of the 88 星宿),
           scattered across the sky and never joined to another. -->
      <TresGroup v-for="f in dedFigures" :key="f.id">
        <TresMesh
          v-for="(lk, i) in f.links"
          :key="`${f.id}-l${i}`"
          :position="lk.pos"
          :rotation="lk.rot"
          :scale="[1, lk.len, 1]"
        >
          <TresCylinderGeometry :args="[0.05, 0.05, 1, 6, 1, true]" />
          <TresMeshBasicMaterial
            color="#c2d4ff"
            :transparent="true"
            :opacity="0.26"
            :depth-write="false"
            :blending="AdditiveBlending"
            :tone-mapped="false"
          />
        </TresMesh>
        <TresGroup v-for="(s, i) in f.stars" :key="`${f.id}-s${i}`" :position="s.p">
          <!-- soft glow, only on the figure's few bright stars -->
          <TresMesh v-if="s.bright" :scale="glowScale(f)">
            <TresSphereGeometry :args="[0.5, 16, 14]" />
            <TresMeshBasicMaterial :color="f.glow" :transparent="true" :opacity="0.34" :depth-write="false" :tone-mapped="false" />
          </TresMesh>
          <TresMesh :scale="s.bright ? coreScale(f) : 1">
            <TresSphereGeometry :args="[s.bright ? 0.16 : 0.09, 12, 10]" />
            <TresMeshBasicMaterial
              :color="s.bright ? '#fff6de' : '#aebbd8'"
              :transparent="!s.bright"
              :opacity="s.bright ? 1 : 0.7"
              :tone-mapped="false"
            />
          </TresMesh>
        </TresGroup>
      </TresGroup>

      <!-- Occasional shooting stars streaking across the sky -->
      <TresGroup v-for="m in meteors" :key="m.id">
        <TresMesh :position="m.mid" :rotation="m.rot">
          <TresCylinderGeometry :args="[0.34, 0.02, m.trail, 5, 1, true]" />
          <TresMeshBasicMaterial :color="m.color" :transparent="true" :opacity="m.opacity" :depth-write="false" :blending="AdditiveBlending" :tone-mapped="false" />
        </TresMesh>
        <TresMesh :position="m.head">
          <TresSphereGeometry :args="[0.75, 10, 8]" />
          <TresMeshBasicMaterial :color="m.color" :transparent="true" :opacity="m.opacity" :depth-write="false" :tone-mapped="false" />
        </TresMesh>
      </TresGroup>

      <Suspense>
        <EffectComposerPmndrs>
          <BloomPmndrs :intensity="0.9" :luminance-threshold="0.58" :luminance-smoothing="0.5" :mipmap-blur="true" :radius="0.72" />
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
  Quaternion,
  Euler,
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
const YUP = new Vector3(0, 1, 0)

// — First-person look: yaw turns a full circle, sky fills ~two-thirds —
const yaw = ref(0)
const pitch = ref(0.3)
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
let moved = 0
function onDown(e: PointerEvent) {
  dragging = true
  lastX = e.clientX
  lastY = e.clientY
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
  let bestId: string | null = null
  let bestD = 80
  for (const s of tapStars.value) {
    const p = s.v.clone().project(cam)
    if (p.z > 1) continue
    const sx = (p.x * 0.5 + 0.5) * rect.width
    const sy = (-p.y * 0.5 + 0.5) * rect.height
    const d = Math.hypot(sx - px, sy - py)
    if (d < bestD) {
      bestD = d
      bestId = s.id
    }
  }
  if (bestId) emit('select', bestId)
}

// — Background star field (upper hemisphere, above the water) ——————
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

// — Ambient 星宿: elegant thin lines + soft-glowing stars, a quiet backdrop —
type Figure = { s: number[][]; l: number[][]; m: number[] }
const FIGS = figuresData as unknown as Record<string, Figure>
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
  const R = 900
  const chosen = pickFigures(6)
  chosen.forEach((key, idx) => {
    const fig = FIGS[key]
    if (!fig || !fig.s?.length) return
    const az = (idx / chosen.length) * TAU + 0.2
    const el = 0.3 + ((idx * 2) % 3) * 0.16
    const dir = new Vector3(Math.cos(el) * Math.sin(az), Math.sin(el), -Math.cos(el) * Math.cos(az)).multiplyScalar(R)
    const forward = dir.clone().negate().normalize()
    const right = new Vector3().crossVectors(YUP, forward).normalize()
    const up2 = new Vector3().crossVectors(forward, right).normalize()
    const S = 150
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
      const mat = new MeshBasicMaterial({ color: 0xb9cdff, transparent: true, opacity: 0.1, blending: AdditiveBlending, depthWrite: false, toneMapped: false })
      const m = new Mesh(new CylinderGeometry(0.9, 0.9, seg.length(), 5, 1, true), mat)
      m.position.copy(A).add(B).multiplyScalar(0.5)
      m.quaternion.setFromUnitVectors(YUP, seg.normalize())
      g.add(m)
      mats.push(mat)
    })
    const sharp: number[] = []
    const glow: number[] = []
    pts.forEach((p, i) => {
      sharp.push(...p.toArray())
      if (fig.m?.includes(i)) glow.push(...p.toArray())
    })
    const sg = new BufferGeometry()
    sg.setAttribute('position', new BufferAttribute(new Float32Array(sharp), 3))
    g.add(new Points(sg, new PointsMaterial({ color: 0xdfe8ff, size: 2.2, sizeAttenuation: false, transparent: true, opacity: 0.8, blending: AdditiveBlending, depthWrite: false, toneMapped: false })))
    if (glow.length) {
      const gg = new BufferGeometry()
      gg.setAttribute('position', new BufferAttribute(new Float32Array(glow), 3))
      g.add(new Points(gg, new PointsMaterial({ map: starGlowTex, color: 0xcfe0ff, size: 12, sizeAttenuation: false, transparent: true, opacity: 0.7, blending: AdditiveBlending, depthWrite: false, toneMapped: false })))
    }
    if (mats.length) figureAnims.push({ mats, phase: Math.random() })
  })
  return g
}
const constellations = shallowRef(buildConstellations())

// — Sea shader (home ocean): swell + moonlit specular glitter ——————
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

// — Dedications as stars, placed along a wandering path across the sky ————
const DOME = 60
function hash(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return (h >>> 0) / 4294967295
}
const FIG_S = 9
const FIG_KEYS = Object.keys(FIGS).filter((k) => FIGS[k]?.s?.length && FIGS[k]?.l?.length)
// Pale, lightly-varied glow tints — each figure lit a slightly different hue.
const STAR_TINTS = ['#dfeaff', '#fff0d6', '#e2fbff', '#f2e6ff', '#e6fff0', '#ffe9ef']
// Chronological order (oldest first), so newer dedications land in fresh sky.
const ordered = computed(() =>
  [...props.lamps].sort((a, b) => String((a as Lamp & { dedicatedAt?: string }).dedicatedAt ?? '').localeCompare(String((b as Lamp & { dedicatedAt?: string }).dedicatedAt ?? '')))
)

interface DedFigure {
  id: string
  glow: string
  phase: number
  stars: { p: [number, number, number]; bright: boolean }[]
  links: { pos: [number, number, number]; rot: [number, number, number]; len: number }[]
}
// Each dedication is drawn as one whole 星宿 figure of its own — placed by a
// golden-angle spacing so they scatter evenly and never touch one another.
const dedFigures = computed<DedFigure[]>(() =>
  ordered.value.slice(0, 60).map((lamp, i) => {
    const r1 = hash(lamp.id)
    const r2 = hash(lamp.id + '·e')
    const az = i * 2.399963 + (r1 - 0.5) * 0.25
    let el = 0.36 + ((i * 0.61803) % 1) * 0.5 + (r2 - 0.5) * 0.1
    el = Math.max(0.22, Math.min(1.02, el))
    const ce = Math.cos(el)
    const center = new Vector3(ce * Math.sin(az) * DOME, Math.sin(el) * DOME, -ce * Math.cos(az) * DOME)
    const forward = center.clone().negate().normalize()
    const right = new Vector3().crossVectors(YUP, forward).normalize()
    const up = new Vector3().crossVectors(forward, right).normalize()
    const fig = FIGS[FIG_KEYS[Math.floor(hash(lamp.id + '·f') * FIG_KEYS.length) % FIG_KEYS.length]]
    const rot = hash(lamp.id + '·r') * TAU
    const cr = Math.cos(rot)
    const sr = Math.sin(rot)
    const pts = fig.s.map(([x, y]) => {
      const lx = ((x - 50) / 100) * FIG_S
      const ly = (-(y - 50) / 100) * FIG_S
      const rx = lx * cr - ly * sr
      const ry = lx * sr + ly * cr
      return center.clone().add(right.clone().multiplyScalar(rx)).add(up.clone().multiplyScalar(ry))
    })
    const links = (fig.l ?? []).flatMap(([a, b]) => {
      const A = pts[a]
      const B = pts[b]
      if (!A || !B) return []
      const seg = B.clone().sub(A)
      const len = seg.length()
      if (len < 0.001) return []
      const mid = A.clone().add(B).multiplyScalar(0.5)
      const q = new Quaternion().setFromUnitVectors(YUP, seg.clone().normalize())
      const e = new Euler().setFromQuaternion(q)
      return [{ pos: [mid.x, mid.y, mid.z] as [number, number, number], rot: [e.x, e.y, e.z] as [number, number, number], len }]
    })
    // Only a few "bright" stars glow (real constellations aren't strung with
    // beads of light); the rest are faint points. Guarantee at least one.
    const bright = new Set<number>(fig.m && fig.m.length ? fig.m : [0])
    return {
      id: lamp.id,
      glow: STAR_TINTS[Math.floor(hash(lamp.id + '·c') * STAR_TINTS.length) % STAR_TINTS.length],
      phase: r1 * TAU,
      stars: pts.map((p, idx) => ({ p: [p.x, p.y, p.z] as [number, number, number], bright: bright.has(idx) })),
      links,
    }
  })
)

// Flat list of every star, tagged with its dedication, for tap-picking.
const tapStars = computed(() =>
  dedFigures.value.flatMap((f) => f.stars.map((s) => ({ v: new Vector3(s.p[0], s.p[1], s.p[2]), id: f.id })))
)

// A gentle twinkle in brightness/size, each figure on its own phase.
function twinkle(phase: number): number {
  return 1 + Math.sin(t.value * 2.4 + phase) * 0.12
}
function glowScale(f: DedFigure): number {
  return twinkle(f.phase) * (f.id === props.selectedId ? 1.7 : 1)
}
function coreScale(f: DedFigure): number {
  return f.id === props.selectedId ? 1.6 : 1
}

// — Occasional shooting stars ————————————————————————
interface Meteor {
  id: number
  rot: [number, number, number]
  color: string
  px: number
  py: number
  pz: number
  vx: number
  vy: number
  vz: number
  t0: number
  dur: number
  travel: number
  trail: number
  mid: [number, number, number]
  head: [number, number, number]
  opacity: number
}
const meteors = ref<Meteor[]>([])
let meteorId = 0
let nextMeteorAt = 10
function spawnMeteor(now: number) {
  // Aim into the current (narrow, portrait) view — a touch above centre so the
  // streak falls down through it — else meteors sweep unseen off to the side.
  const az = yaw.value + (Math.random() - 0.5) * 0.7
  const el = Math.max(0.18, Math.min(1.0, pitch.value + 0.22 + (Math.random() - 0.5) * 0.45))
  const R = 220
  const ce = Math.cos(el)
  const px = ce * Math.sin(az) * R
  const py = Math.sin(el) * R
  const pz = -ce * Math.cos(az) * R
  // Sweep across the sky (tangent to the dome), biased downward.
  const dir = new Vector3(px, py, pz).normalize()
  const v = new Vector3(Math.random() - 0.5, -0.6 - Math.random() * 0.5, Math.random() - 0.5)
  v.addScaledVector(dir, -v.dot(dir)).normalize()
  const e = new Euler().setFromQuaternion(new Quaternion().setFromUnitVectors(YUP, v))
  meteors.value.push({
    id: meteorId++,
    rot: [e.x, e.y, e.z],
    color: Math.random() < 0.3 ? '#dff0ff' : '#fff4e0',
    px,
    py,
    pz,
    vx: v.x,
    vy: v.y,
    vz: v.z,
    t0: now,
    dur: 0.6 + Math.random() * 0.45,
    travel: 130 + Math.random() * 90,
    trail: 16 + Math.random() * 12,
    mid: [px, py, pz],
    head: [px, py, pz],
    opacity: 0,
  })
}
function stepMeteors(elapsed: number) {
  if (elapsed > nextMeteorAt) {
    spawnMeteor(elapsed)
    nextMeteorAt = elapsed + 32 + Math.random() * 40
  }
  // Mutate each meteor in place and splice only the dead — never swap the whole
  // array, so TresJS keeps the meshes alive long enough to actually draw them.
  const arr = meteors.value
  for (let i = arr.length - 1; i >= 0; i--) {
    const m = arr[i]
    const f = (elapsed - m.t0) / m.dur
    if (f >= 1) {
      arr.splice(i, 1)
      continue
    }
    const d = f * m.travel
    const hx = m.px + m.vx * d
    const hy = m.py + m.vy * d
    const hz = m.pz + m.vz * d
    m.head = [hx, hy, hz]
    m.mid = [hx - (m.vx * m.trail) / 2, hy - (m.vy * m.trail) / 2, hz - (m.vz * m.trail) / 2]
    m.opacity = Math.sin(Math.max(0, Math.min(1, f)) * Math.PI) * 0.9
  }
}

// — Clock: drives the twinkle, the sea, and the ambient shimmer ————
const t = ref(0)
let raf = 0
let startedAt = 0
function tick(now: number) {
  if (!startedAt) startedAt = now
  const elapsed = (now - startedAt) / 1000
  t.value = elapsed
  uniforms.uTime.value = elapsed
  stepMeteors(elapsed)
  for (const fa of figureAnims) {
    const count = fa.mats.length
    const loop = 4.5
    const head = ((((elapsed / loop + fa.phase) % 1) + 1) % 1) * count
    for (let i = 0; i < count; i++) {
      let d = Math.abs(i - head)
      d = Math.min(d, count - d)
      fa.mats[i].opacity = 0.09 + Math.exp(-(d * d) / 1.6) * 0.4
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
.sky {
  position: absolute;
  inset: 0;
  touch-action: none;
  cursor: grab;
}
.sky:active {
  cursor: grabbing;
}
</style>
