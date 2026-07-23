<template>
  <!-- Renders nothing; it configures the scene it is mounted into. -->
</template>

<script setup lang="ts">
import { onBeforeUnmount } from 'vue'
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
 * Gives the scene something to refract.
 *
 * MeshPhysicalMaterial's `transmission` samples the environment, not the
 * direct lights — with no `scene.environment` a transmissive gem renders
 * black with a few specular dots, however many lamps are aimed at it.
 *
 * The environment is painted here rather than loaded: a bright studio
 * gradient plus a handful of soft highlights, converted to an equirect
 * map. No HDR download, so it still works offline in the PWA, and the
 * brightness is ours to tune.
 */

const props = withDefaults(
  defineProps<{
    /** Colour the lower half of the studio picks up */
    tint?: string
    /** Overall brightness multiplier for the gradient */
    intensity?: number
    /**
     * Show the studio as the scene backdrop.
     *
     * Transmission refracts whatever is *behind* the gem, so with an
     * empty scene the stone refracts nothing and goes black. Painting the
     * environment behind it gives the refraction something to carry.
     * Only enable this where the canvas fills its container, otherwise
     * the backdrop reads as a visible rectangle.
     */
    background?: boolean
    backgroundIntensity?: number
  }>(),
  {
    tint: '#8b7fd8',
    intensity: 1,
    background: false,
    backgroundIntensity: 0.4,
  }
)

const { scene, renderer } = useTresContext()

let pmrem: PMREMGenerator | null = null
let target: WebGLRenderTarget | null = null
let source: CanvasTexture | null = null

function paintEnvironment(): CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = 1024
  canvas.height = 512
  const g = canvas.getContext('2d')!

  // Bright top, tinted floor — a softbox above and a coloured bounce
  // card below, the way a stone is actually photographed.
  const grad = g.createLinearGradient(0, 0, 0, canvas.height)
  grad.addColorStop(0, '#f2f5ff')
  grad.addColorStop(0.38, '#cfd8f0')
  grad.addColorStop(0.66, props.tint)
  grad.addColorStop(1, '#0b0a18')
  g.fillStyle = grad
  g.fillRect(0, 0, canvas.width, canvas.height)

  /*
   * Everything below exists so the stone can *distort* something.
   *
   * Transmission refracts whatever is behind the gem. Against a smooth
   * gradient the refracted image is another smooth gradient, so the gem
   * reads as a solid lump no matter how physically correct the material
   * is. Structure — hard-edged panels, scattered points — is what makes
   * the bending visible, and therefore what makes glass look like glass.
   */

  // Studio panels: strong rectangles of light with definite edges
  const panels: [number, number, number, number, number][] = [
    [0.04, 0.06, 0.2, 0.26, 1.0],
    [0.34, 0.02, 0.14, 0.18, 0.85],
    [0.62, 0.08, 0.22, 0.2, 0.95],
    [0.88, 0.3, 0.12, 0.16, 0.7],
    [0.2, 0.44, 0.16, 0.12, 0.55],
  ]
  for (const [x, y, w, h, a] of panels) {
    g.fillStyle = `rgba(255,255,255,${a})`
    g.fillRect(x * canvas.width, y * canvas.height, w * canvas.width, h * canvas.height)
  }

  // Dark bars between them: contrast is what the facets slice up
  g.fillStyle = 'rgba(6,6,16,0.72)'
  for (let i = 0; i < 7; i++) {
    g.fillRect((i / 7 + 0.055) * canvas.width, 0, canvas.width * 0.018, canvas.height * 0.62)
  }

  // Scattered points of light — these become the travelling sparkles
  for (let i = 0; i < 90; i++) {
    const cx = ((i * 137.5) % 100) / 100 * canvas.width
    const cy = ((i * 61.8) % 100) / 100 * canvas.height * 0.9
    const r = 3 + ((i * 17) % 11)
    const blob = g.createRadialGradient(cx, cy, 0, cx, cy, r)
    blob.addColorStop(0, 'rgba(255,255,255,0.95)')
    blob.addColorStop(1, 'rgba(255,255,255,0)')
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

  // Filmic tone mapping stops the specular hits on the facets from
  // clipping to flat white.
  r.toneMapping = ACESFilmicToneMapping
  r.toneMappingExposure = 1.25 * props.intensity

  pmrem = new PMREMGenerator(r)
  pmrem.compileEquirectangularShader()

  source = paintEnvironment()
  target = pmrem.fromEquirectangular(source)
  s.environment = target.texture

  if (props.background) {
    s.background = target.texture
    // Heavily blurred and dimmed: enough colour for the refraction to
    // pick up, not so much that it competes with the gem.
    s.backgroundBlurriness = 0.12
    s.backgroundIntensity = props.backgroundIntensity
  }
}

function release() {
  target?.dispose()
  pmrem?.dispose()
  source?.dispose()
  target = null
  pmrem = null
  source = null
}

// `renderer` is a manager, not a ref — the WebGLRenderer lives on
// `.instance` and is only safe to touch once `onReady` has fired.
if (renderer.isInitialized.value && renderer.instance) {
  build(renderer.instance as unknown as WebGLRenderer)
} else {
  renderer.onReady((r) => build(r as unknown as WebGLRenderer))
}

onBeforeUnmount(() => {
  if (scene.value) {
    scene.value.environment = null
    scene.value.background = null
  }
  release()
})
</script>
