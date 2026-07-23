<template>
  <TresMesh>
    <TresSphereGeometry :args="[80, 24, 16]" />
    <TresShaderMaterial
      :vertex-shader="vert"
      :fragment-shader="frag"
      :uniforms="uniforms"
      :side="BackSide"
      :depthWrite="false"
    />
  </TresMesh>
</template>

<script setup lang="ts">
import { BackSide, Color } from 'three'

/**
 * An empty sky.
 *
 * Deliberately featureless — no panels, no bokeh, nothing to look at.
 * It exists only because transmission refracts whatever is behind the
 * gem: with a fully transparent backdrop the upper half of the stone
 * has nothing to carry and goes dark. The water below supplies all the
 * moving structure the refraction needs; up here, plain light is the
 * point.
 */

withDefaults(defineProps<{ top?: string; horizon?: string }>(), {
  top: '#f4f7fc',
  horizon: '#dfe8f3',
})

const uniforms = {
  uTop: { value: new Color('#f4f7fc') },
  uHorizon: { value: new Color('#dfe8f3') },
}

const vert = /* glsl */ `
  varying float vH;
  void main() {
    vH = position.y / 80.0;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const frag = /* glsl */ `
  uniform vec3 uTop;
  uniform vec3 uHorizon;
  varying float vH;
  void main() {
    float h = clamp(vH * 0.5 + 0.5, 0.0, 1.0);
    gl_FragColor = vec4(mix(uHorizon, uTop, pow(h, 0.8)), 1.0);
  }
`
</script>
