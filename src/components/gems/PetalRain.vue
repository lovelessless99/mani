<template>
  <primitive :object="mesh" />
</template>

<script setup lang="ts">
import { shallowRef, onMounted, onBeforeUnmount } from 'vue'
import {
  InstancedMesh,
  Shape,
  ShapeGeometry,
  MeshBasicMaterial,
  Object3D,
  Color,
  DoubleSide,
} from 'three'

/**
 * 天花亂墜 — flowers falling from an open sky.
 *
 * Instanced rather than a point cloud: PointsMaterial cannot rotate its
 * sprites, so every petal would hang at the same angle and the fall
 * would read as snow. Each instance here carries its own tumble, which
 * is most of what makes a falling petal look like a petal.
 */

const props = withDefaults(
  defineProps<{ count?: number; tint?: string }>(),
  { count: 90, tint: '#ffd9e6' }
)

/** A single petal: rounded at the base, drawn to a soft point. */
function petalGeometry(): ShapeGeometry {
  const s = new Shape()
  s.moveTo(0, -0.5)
  s.bezierCurveTo(0.42, -0.24, 0.36, 0.32, 0, 0.5)
  s.bezierCurveTo(-0.36, 0.32, -0.42, -0.24, 0, -0.5)
  return new ShapeGeometry(s, 12)
}

interface Petal {
  x: number
  y: number
  z: number
  /** Vertical speed */
  vy: number
  /** Sway amplitude and phase, so no two drift alike */
  sway: number
  phase: number
  spin: number
  tilt: number
  scale: number
}

const COLORS = ['#ffffff', '#ffe9f1', '#fff3d6', '#f6e7ff']

const petals: Petal[] = []
const dummy = new Object3D()

function build(): InstancedMesh {
  const geo = petalGeometry()
  const mat = new MeshBasicMaterial({
    color: new Color(props.tint),
    transparent: true,
    opacity: 0.9,
    side: DoubleSide,
    depthWrite: false,
    toneMapped: false,
  })

  const m = new InstancedMesh(geo, mat, props.count)

  for (let i = 0; i < props.count; i++) {
    petals.push({
      x: (Math.random() - 0.5) * 16,
      y: Math.random() * 16 - 2,
      z: (Math.random() - 0.5) * 12 - 2,
      vy: 0.5 + Math.random() * 0.7,
      sway: 0.3 + Math.random() * 0.9,
      phase: Math.random() * Math.PI * 2,
      spin: (Math.random() - 0.5) * 1.6,
      tilt: Math.random() * Math.PI,
      scale: 0.11 + Math.random() * 0.13,
    })

    m.setColorAt(i, new Color(COLORS[i % COLORS.length]))
  }
  if (m.instanceColor) m.instanceColor.needsUpdate = true

  return m
}

const mesh = shallowRef(build())

let raf = 0
let t0 = 0

function tick(now: number) {
  if (!t0) t0 = now
  const t = (now - t0) / 1000
  const m = mesh.value

  petals.forEach((p, i) => {
    // Fall, and recycle above once past the floor
    let y = p.y - t * p.vy
    const span = 18
    y = ((y + 4) % span + span) % span - 4

    // A petal does not drop straight; it slips sideways as it turns
    const s = Math.sin(t * p.sway + p.phase)
    dummy.position.set(p.x + s * 1.1, y, p.z + Math.cos(t * p.sway * 0.7 + p.phase) * 0.6)
    dummy.rotation.set(p.tilt + t * p.spin * 0.6, t * p.spin, s * 0.8)
    dummy.scale.setScalar(p.scale)
    dummy.updateMatrix()
    m.setMatrixAt(i, dummy.matrix)
  })

  m.instanceMatrix.needsUpdate = true
  raf = requestAnimationFrame(tick)
}

onMounted(() => {
  raf = requestAnimationFrame(tick)
})

onBeforeUnmount(() => {
  cancelAnimationFrame(raf)
  mesh.value.geometry.dispose()
  ;(mesh.value.material as MeshBasicMaterial).dispose()
  mesh.value.dispose()
})
</script>
