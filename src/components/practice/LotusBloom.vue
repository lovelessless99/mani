<template>
  <TresCanvas :alpha="true" :antialias="true" class="bloom">
    <TresPerspectiveCamera :position="[0, 3.4, 7.2]" :fov="42" :look-at="[0, 0.4, 0]" />

    <TresAmbientLight :intensity="0.5" />
    <TresPointLight :position="[0, 3, 2]" :intensity="26" :color="color" :distance="14" />
    <TresPointLight :position="[0, 0.4, 0]" :intensity="18" color="#ffffff" :distance="7" />

    <primitive :object="lotus" />
    <primitive :object="motes" />
  </TresCanvas>
</template>

<script setup lang="ts">
import { shallowRef, onMounted, onBeforeUnmount } from 'vue'
import {
  Group,
  Mesh,
  Shape,
  ShapeGeometry,
  MeshStandardMaterial,
  Points,
  PointsMaterial,
  BufferGeometry,
  BufferAttribute,
  Color,
  CanvasTexture,
  DoubleSide,
  AdditiveBlending,
} from 'three'
import { TresCanvas } from '@tresjs/core'

/**
 * A lotus opening.
 *
 * Petals are the one part of this that geometry can honestly produce: a
 * lotus is a repeated form arranged in rings, which is exactly what
 * procedural modelling is good at. Each ring starts folded shut and
 * rotates outward on its own delay, so the flower unfolds from the
 * centre the way a real one does rather than snapping open at once.
 */

const props = withDefaults(
  defineProps<{ color?: string; petals?: number; delay?: number }>(),
  { color: '#fbbf24', petals: 9, delay: 0 }
)

/** One petal outline: wide at the base, drawn to a point. */
function petalShape(): Shape {
  const s = new Shape()
  s.moveTo(0, 0)
  s.bezierCurveTo(0.42, 0.28, 0.5, 0.95, 0, 1.75)
  s.bezierCurveTo(-0.5, 0.95, -0.42, 0.28, 0, 0)
  return s
}

interface Ring {
  group: Group
  from: number
  to: number
  delay: number
}

const rings: Ring[] = []

function buildLotus(): Group {
  const root = new Group()
  const geo = new ShapeGeometry(petalShape(), 20)
  const base = new Color(props.color)

  // Outer rings open first and lie flattest; the innermost stays nearly
  // upright, which is what gives a lotus its cupped centre.
  const layout = [
    { count: props.petals, radius: 0.5, scale: 1.25, from: 0.12, to: 1.15, delay: 0.0, shade: 0.55 },
    { count: props.petals, radius: 0.36, scale: 1.0, from: 0.1, to: 0.82, delay: 0.35, shade: 0.78 },
    { count: Math.max(5, props.petals - 3), radius: 0.22, scale: 0.78, from: 0.08, to: 0.5, delay: 0.7, shade: 1.0 },
  ]

  layout.forEach((ring, r) => {
    const g = new Group()
    const col = base.clone().multiplyScalar(ring.shade).lerp(new Color('#ffffff'), 0.25)

    const mat = new MeshStandardMaterial({
      color: col,
      emissive: base.clone().multiplyScalar(0.35),
      roughness: 0.45,
      metalness: 0,
      side: DoubleSide,
      transparent: true,
      opacity: 0.95,
    })

    for (let i = 0; i < ring.count; i++) {
      const petal = new Mesh(geo, mat)
      const a = (i / ring.count) * Math.PI * 2 + r * 0.32
      const pivot = new Group()
      pivot.rotation.y = a
      petal.position.set(0, 0, ring.radius)
      petal.scale.setScalar(ring.scale)
      petal.rotation.x = -ring.from
      pivot.add(petal)
      g.add(pivot)
    }

    rings.push({ group: g, from: ring.from, to: ring.to, delay: ring.delay })
    root.add(g)
  })

  return root
}

/** A round, soft dot. PointsMaterial draws hard squares without one. */
function moteSprite(): CanvasTexture {
  const c = document.createElement('canvas')
  c.width = c.height = 64
  const g = c.getContext('2d')!
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32)
  grad.addColorStop(0, 'rgba(255,255,255,1)')
  grad.addColorStop(0.35, 'rgba(255,255,255,0.55)')
  grad.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = grad
  g.fillRect(0, 0, 64, 64)
  return new CanvasTexture(c)
}

/** Points of light lifting off the flower as it opens. */
const sprite = moteSprite()

function buildMotes(): Points {
  const N = 120
  const pos = new Float32Array(N * 3)
  const seedY = new Float32Array(N)
  for (let i = 0; i < N; i++) {
    const a = Math.random() * Math.PI * 2
    const r = 0.2 + Math.random() * 1.5
    pos[i * 3] = Math.cos(a) * r
    pos[i * 3 + 1] = Math.random() * 0.3
    pos[i * 3 + 2] = Math.sin(a) * r
    seedY[i] = Math.random()
  }
  const geo = new BufferGeometry()
  geo.setAttribute('position', new BufferAttribute(pos, 3))
  ;(geo as unknown as { _seed: Float32Array })._seed = seedY

  return new Points(
    geo,
    new PointsMaterial({
      size: 7,
      sizeAttenuation: false,
      map: sprite,
      color: new Color(props.color),
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
      blending: AdditiveBlending,
    })
  )
}

const lotus = shallowRef(buildLotus())
const motes = shallowRef(buildMotes())

let raf = 0
let t0 = 0

function ease(x: number) {
  return 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 3)
}

function tick(now: number) {
  if (!t0) t0 = now
  const t = (now - t0) / 1000

  for (const ring of rings) {
    const k = ease((t - props.delay - ring.delay) / 2.4)
    for (const pivot of ring.group.children) {
      const petal = pivot.children[0] as Mesh
      petal.rotation.x = -(ring.from + (ring.to - ring.from) * k)
    }
  }

  lotus.value.rotation.y = t * 0.12

  // Motes drift up and recycle, so the column of light never runs dry
  const g = motes.value.geometry
  const arr = g.getAttribute('position') as BufferAttribute
  const seed = (g as unknown as { _seed: Float32Array })._seed
  for (let i = 0; i < arr.count; i++) {
    const y = ((Math.max(0, t - props.delay) * 0.5 + seed[i]) % 1) * 3.4
    arr.setY(i, y)
  }
  arr.needsUpdate = true

  raf = requestAnimationFrame(tick)
}

onMounted(() => {
  raf = requestAnimationFrame(tick)
})

onBeforeUnmount(() => {
  cancelAnimationFrame(raf)
  lotus.value.traverse((o) => {
    const m = o as Mesh
    m.geometry?.dispose?.()
    ;(m.material as MeshStandardMaterial)?.dispose?.()
  })
  sprite.dispose()
  motes.value.geometry.dispose()
  ;(motes.value.material as PointsMaterial).dispose()
})
</script>

<style scoped>
.bloom {
  position: absolute;
  inset: 0;
}
</style>
