<template>
  <TresMesh :rotation="[-Math.PI / 2, 0, 0]" :position="[0, -1.55, 0]">
    <TresPlaneGeometry :args="[60, 60, 140, 140]" />
    <TresShaderMaterial
      :vertex-shader="vert"
      :fragment-shader="frag"
      :uniforms="uniforms"
      :transparent="true"
      :depthWrite="false"
    />
  </TresMesh>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount } from 'vue'
import { Color } from 'three'

/**
 * A pale sea under the gem.
 *
 * Two jobs at once: it grounds the stone so it is resting on something
 * rather than floating in a void, and — because transmission refracts
 * whatever is behind the gem — it puts moving structure back there. A
 * featureless backdrop is what made these read as solid lumps.
 */

const props = withDefaults(
  defineProps<{ tint?: string }>(),
  { tint: '#a7bed6' }
)

// The stone's colour is a *hint* in the water, not the water itself —
// at full strength it turned the whole sea into the gem.
const uniforms = {
  uTime: { value: 0 },
  uShallow: { value: new Color('#e6eef8') },
  uDeep: { value: new Color('#9fb6cd').lerp(new Color(props.tint), 0.22) },
}

const vert = /* glsl */ `
  uniform float uTime;
  varying vec3 vWorld;
  varying vec3 vNrm;

  float height(vec2 p) {
    float h = 0.0;
    h += sin(p.x * 1.1 + uTime * 0.9) * 0.055;
    h += sin(p.y * 1.5 - uTime * 0.7) * 0.04;
    h += sin((p.x + p.y) * 2.3 + uTime * 1.4) * 0.018;
    return h;
  }

  void main() {
    vec3 pos = position;
    pos.z += height(pos.xy);

    float e = 0.16;
    float dx = height(pos.xy + vec2(e, 0.0)) - height(pos.xy - vec2(e, 0.0));
    float dy = height(pos.xy + vec2(0.0, e)) - height(pos.xy - vec2(0.0, e));
    vec3 n = normalize(vec3(-dx, -dy, 2.0 * e));

    vec4 world = modelMatrix * vec4(pos, 1.0);
    vWorld = world.xyz;
    vNrm = normalize(mat3(modelMatrix) * n);
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`

const frag = /* glsl */ `
  uniform vec3 uShallow;
  uniform vec3 uDeep;
  varying vec3 vWorld;
  varying vec3 vNrm;

  void main() {
    vec3 N = normalize(vNrm);
    vec3 V = normalize(cameraPosition - vWorld);
    float fres = pow(1.0 - max(dot(N, V), 0.0), 3.0);

    vec3 col = mix(uDeep, uShallow, fres);

    // Highlights from an overhead softbox, riding the ripples
    vec3 L = normalize(vec3(0.4, 1.0, 0.6));
    vec3 H = normalize(L + V);
    col += vec3(1.0) * pow(max(dot(N, H), 0.0), 90.0) * 1.6;

    // Dissolve outward so the plane never shows an edge
    float d = length(vWorld.xz - cameraPosition.xz);
    float a = 1.0 - smoothstep(9.0, 24.0, d);

    gl_FragColor = vec4(col, a * 0.95);
  }
`

let raf = 0
let t0 = 0

function tick(now: number) {
  if (!t0) t0 = now
  uniforms.uTime.value = (now - t0) / 1000
  raf = requestAnimationFrame(tick)
}

onMounted(() => {
  raf = requestAnimationFrame(tick)
})
onBeforeUnmount(() => cancelAnimationFrame(raf))
</script>
