<template>
  <!-- Renders nothing; it paints the scene.environment the mirror jewels
       sample, so each reflects a field of all the others' colours. -->
</template>

<script setup lang="ts">
import { onBeforeUnmount, watch } from 'vue'
import {
  PMREMGenerator,
  CanvasTexture,
  EquirectangularReflectionMapping,
  SRGBColorSpace,
  ACESFilmicToneMapping,
  type WebGLRenderer,
  type WebGLRenderTarget,
} from 'three'
import { useTresContext } from '@tresjs/core'

/**
 * 因陀羅網 · the environment the mirror-jewels reflect.
 *
 * Real inter-reflection would need a cube camera per knot — far too costly.
 * Instead the whole net's palette is painted into one equirectangular map:
 * a dark ground strewn with soft blobs of every gem's colour. A mirror node
 * sampling that map shows a sky full of the other jewels, which reads as the
 * net reflecting itself — 珠珠相映,重重無盡.
 */

const props = defineProps<{ colors: string[] }>()

const { scene, renderer } = useTresContext()

let pmrem: PMREMGenerator | null = null
let target: WebGLRenderTarget | null = null
let source: CanvasTexture | null = null

function paint(): CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = 1024
  canvas.height = 512
  const g = canvas.getContext('2d')!

  // Deep ground so the coloured jewels read as points of light in a night.
  const grad = g.createLinearGradient(0, 0, 0, canvas.height)
  grad.addColorStop(0, '#141024')
  grad.addColorStop(0.6, '#0b0916')
  grad.addColorStop(1, '#05040c')
  g.fillStyle = grad
  g.fillRect(0, 0, canvas.width, canvas.height)

  const cols = props.colors.length ? props.colors : ['#9fb4ff']
  // Many soft blobs, cycling the palette, spread by a golden-angle walk so
  // the field looks evenly scattered however many colours there are.
  const count = Math.max(60, cols.length * 3)
  for (let i = 0; i < count; i++) {
    const cx = (((i * 137.5) % 360) / 360) * canvas.width
    const cy = ((Math.sin(i * 1.7) * 0.5 + 0.5) * 0.82 + 0.02) * canvas.height
    const r = 10 + ((i * 13) % 26)
    const blob = g.createRadialGradient(cx, cy, 0, cx, cy, r)
    blob.addColorStop(0, cols[i % cols.length])
    blob.addColorStop(0.5, cols[i % cols.length] + 'aa')
    blob.addColorStop(1, 'rgba(0,0,0,0)')
    g.fillStyle = blob
    g.fillRect(cx - r, cy - r, r * 2, r * 2)
  }

  const tex = new CanvasTexture(canvas)
  tex.mapping = EquirectangularReflectionMapping
  tex.colorSpace = SRGBColorSpace
  return tex
}

function build(r: WebGLRenderer) {
  const s = scene.value
  if (!s) return
  release()
  r.toneMapping = ACESFilmicToneMapping
  r.toneMappingExposure = 1.15
  pmrem = new PMREMGenerator(r)
  pmrem.compileEquirectangularShader()
  source = paint()
  target = pmrem.fromEquirectangular(source)
  s.environment = target.texture
}

function release() {
  target?.dispose()
  pmrem?.dispose()
  source?.dispose()
  target = null
  pmrem = null
  source = null
}

if (renderer.isInitialized.value && renderer.instance) {
  build(renderer.instance as unknown as WebGLRenderer)
} else {
  renderer.onReady((r) => build(r as unknown as WebGLRenderer))
}

// Repaint when the gem palette changes.
watch(
  () => props.colors.length,
  () => {
    if (renderer.instance) build(renderer.instance as unknown as WebGLRenderer)
  }
)

onBeforeUnmount(() => {
  if (scene.value) scene.value.environment = null
  release()
})
</script>
