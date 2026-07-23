<template>
  <TresGroup>
    <!-- 四天王天 · 四方各一守護門樓,方色各別 -->
    <template v-if="motif === 'gates'">
      <TresGroup v-for="(g, i) in guardians" :key="i" :position="g.pos">
        <TresMesh :position="[0, 1.1, 0]">
          <TresBoxGeometry :args="[0.6, 2.2, 0.6]" />
          <TresMeshStandardMaterial :color="g.color" :roughness="0.6" :metalness="0.2" />
        </TresMesh>
        <TresMesh :position="[0, 2.45, 0]">
          <TresConeGeometry :args="[0.6, 0.6, 4]" :rotation="[0, 0.78, 0]" />
          <TresMeshStandardMaterial :color="g.color" :emissive="g.color" :emissive-intensity="0.3" :roughness="0.5" />
        </TresMesh>
      </TresGroup>
    </template>

    <!-- 忉利天 · 中央善見城,周匝諸天,一側波利質多樹 -->
    <template v-else-if="motif === 'city'">
      <TresMesh :position="[0, 1.4, 0]">
        <TresBoxGeometry :args="[1.3, 2.8, 1.3]" />
        <TresMeshStandardMaterial :color="ornament" :metalness="0.4" :roughness="0.3" :emissive="ornament" :emissive-intensity="0.15" />
      </TresMesh>
      <TresMesh :position="[0, 3.1, 0]" :rotation="[0, 0.78, 0]">
        <TresConeGeometry :args="[1.1, 0.9, 4]" />
        <TresMeshStandardMaterial :color="rim" :emissive="rim" :emissive-intensity="0.4" :metalness="0.5" :roughness="0.25" />
      </TresMesh>
      <TresMesh v-for="(t, i) in ring8" :key="i" :position="t">
        <TresBoxGeometry :args="[0.4, 1.1, 0.4]" />
        <TresMeshStandardMaterial :color="ornament" :metalness="0.35" :roughness="0.4" />
      </TresMesh>
      <!-- 波利質多樹 -->
      <TresGroup :position="[3, 0, -1.4]">
        <TresMesh :position="[0, 0.7, 0]"><TresCylinderGeometry :args="[0.12, 0.16, 1.4, 6]" /><TresMeshStandardMaterial color="#6b4a2a" :roughness="0.9" /></TresMesh>
        <TresMesh :position="[0, 1.9, 0]"><TresIcosahedronGeometry :args="[1, 0]" /><TresMeshStandardMaterial color="#e79ad0" :flat-shading="true" :roughness="0.6" :emissive="'#e79ad0'" :emissive-intensity="0.2" /></TresMesh>
      </TresGroup>
    </template>

    <!-- 夜摩天 · 浮空蓮華,開合為時分 -->
    <template v-else-if="motif === 'air'">
      <TresGroup v-for="(f, i) in floaters" :key="i" :position="f.pos">
        <TresMesh v-for="p in 6" :key="p" :position="[Math.cos(p) * 0.28, 0, Math.sin(p) * 0.28]" :rotation="[0.9, -p * 1.05, 0]">
          <TresConeGeometry :args="[0.2, 0.5, 4]" />
          <TresMeshStandardMaterial :color="f.color" :emissive="f.color" :emissive-intensity="0.35" :roughness="0.5" :transparent="true" :opacity="0.9" />
        </TresMesh>
      </TresGroup>
    </template>

    <!-- 兜率天 · 內院寶殿,中有補處之座 -->
    <template v-else-if="motif === 'court'">
      <TresMesh v-for="(p, i) in corners" :key="i" :position="p">
        <TresCylinderGeometry :args="[0.14, 0.14, 2.4, 8]" />
        <TresMeshStandardMaterial :color="ornament" :metalness="0.5" :roughness="0.3" :emissive="ornament" :emissive-intensity="0.15" />
      </TresMesh>
      <TresMesh :position="[0, 2.5, 0]" :rotation="[0, 0.78, 0]">
        <TresConeGeometry :args="[2.2, 0.7, 4]" />
        <TresMeshStandardMaterial :color="rim" :emissive="rim" :emissive-intensity="0.4" :metalness="0.5" :roughness="0.25" />
      </TresMesh>
      <TresMesh :position="[0, 0.7, 0]">
        <TresIcosahedronGeometry :args="[0.55, 0]" />
        <TresMeshStandardMaterial :color="rim" :emissive="rim" :emissive-intensity="1.4" :roughness="0.2" />
      </TresMesh>
    </template>

    <!-- 化樂天 · 隨心變現,半透浮泡 -->
    <template v-else-if="motif === 'mirage'">
      <TresMesh v-for="(d, i) in domes" :key="i" :position="d.pos">
        <TresSphereGeometry :args="[d.r, 20, 12]" />
        <TresMeshPhysicalMaterial :color="rim" :transmission="0.9" :thickness="0.4" :roughness="0.1" :transparent="true" :opacity="0.5" :ior="1.3" />
      </TresMesh>
    </template>

    <!-- 他化自在天 · 魔王宮,幽麗森嚴 -->
    <template v-else-if="motif === 'darkpalace'">
      <TresMesh :position="[0, 1.1, 0]">
        <TresBoxGeometry :args="[2.4, 2.2, 1.6]" />
        <TresMeshStandardMaterial color="#2a2230" :metalness="0.6" :roughness="0.35" />
      </TresMesh>
      <TresMesh :position="[0, 2.5, 0]" :rotation="[0, 0.78, 0]">
        <TresConeGeometry :args="[2, 0.7, 4]" />
        <TresMeshStandardMaterial color="#e6c07a" :emissive="'#e6c07a'" :emissive-intensity="0.3" :metalness="0.7" :roughness="0.25" />
      </TresMesh>
      <TresMesh v-for="(p, i) in twoFlanks" :key="i" :position="p">
        <TresBoxGeometry :args="[0.6, 3, 0.6]" />
        <TresMeshStandardMaterial color="#1e1826" :metalness="0.6" :roughness="0.4" />
      </TresMesh>
    </template>

    <!-- 初禪 · 大梵天座,光明外映 -->
    <template v-else-if="motif === 'brahma'">
      <TresMesh :position="[0, 0.9, 0]">
        <TresCylinderGeometry :args="[1.4, 1.7, 0.5, 24]" />
        <TresMeshStandardMaterial :color="rim" :emissive="rim" :emissive-intensity="0.35" :roughness="0.35" />
      </TresMesh>
      <TresMesh :position="[0, 2, -0.4]">
        <TresCylinderGeometry :args="[1.1, 1.3, 2, 24, 1, false, 0, 3.14]" />
        <TresMeshStandardMaterial :color="rim" :emissive="rim" :emissive-intensity="0.6" :roughness="0.3" :side="2" />
      </TresMesh>
    </template>

    <!-- 二禪 · 光音天,環立光柱 -->
    <template v-else-if="motif === 'radiance'">
      <TresMesh v-for="(p, i) in ring6" :key="i" :position="p">
        <TresCylinderGeometry :args="[0.14, 0.14, 4.2, 10]" />
        <TresMeshStandardMaterial :color="rim" :emissive="rim" :emissive-intensity="1.5" :transparent="true" :opacity="0.85" :roughness="0.2" />
      </TresMesh>
    </template>

    <!-- 三禪 · 淨樂周遍,柔光蓮臺 -->
    <template v-else-if="motif === 'pure'">
      <TresMesh v-for="(p, i) in pads" :key="i" :position="p.pos" :rotation="[-1.57, 0, 0]">
        <TresCircleGeometry :args="[p.r, 24]" />
        <TresMeshStandardMaterial :color="rim" :emissive="rim" :emissive-intensity="0.7" :transparent="true" :opacity="0.7" :side="2" />
      </TresMesh>
    </template>

    <!-- 四禪 · 無雲,懸浮光板 -->
    <template v-else-if="motif === 'cloudless'">
      <TresMesh v-for="(p, i) in slabs" :key="i" :position="p.pos">
        <TresBoxGeometry :args="[p.w, 0.08, p.w]" />
        <TresMeshStandardMaterial :color="rim" :emissive="rim" :emissive-intensity="0.5" :metalness="0.3" :roughness="0.2" :transparent="true" :opacity="0.85" />
      </TresMesh>
    </template>

    <!-- 五淨居天 · 清淨琉璃,晶柱林立 -->
    <template v-else-if="motif === 'suddhavasa'">
      <TresMesh v-for="(p, i) in spires" :key="i" :position="p.pos" :scale="[0.5, p.h, 0.5]">
        <TresOctahedronGeometry :args="[0.6, 0]" />
        <TresMeshPhysicalMaterial :color="rim" :transmission="0.85" :thickness="0.6" :roughness="0.05" :ior="1.6" :transparent="true" :opacity="0.9" :emissive="rim" :emissive-intensity="0.2" />
      </TresMesh>
    </template>

    <!-- 無色界 · 無形,飄散光點 -->
    <template v-else-if="motif === 'formless'">
      <TresMesh v-for="(m, i) in motes" :key="i" :position="m.pos">
        <TresIcosahedronGeometry :args="[m.r, 0]" />
        <TresMeshStandardMaterial :color="rim" :emissive="rim" :emissive-intensity="1.2" :transparent="true" :opacity="0.7" />
      </TresMesh>
    </template>
  </TresGroup>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Heaven } from 'src/stores/heavenStore'

const props = defineProps<{ heaven: Heaven }>()

const motif = computed(() => props.heaven.motif)
const rim = computed(() => props.heaven.sky[0])
const ornament = computed(() =>
  props.heaven.realm === '欲界' ? '#c9a860' : props.heaven.realm === '色界' ? '#e8f2fb' : '#c8b4ee'
)

// 四方守護,方色各別（東青、南赤、西白、北玄）
const guardians = [
  { pos: [0, 0, -4] as [number, number, number], color: '#2e2a34' },
  { pos: [4, 0, 0] as [number, number, number], color: '#d8d8d8' },
  { pos: [0, 0, 4] as [number, number, number], color: '#c24a4a' },
  { pos: [-4, 0, 0] as [number, number, number], color: '#3a7ab0' },
]

function ring(n: number, r: number, y = 0): [number, number, number][] {
  return Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2
    return [Math.cos(a) * r, y, Math.sin(a) * r] as [number, number, number]
  })
}

const ring8 = ring(8, 3.6, 0.55)
const ring6 = ring(6, 3.2, 2.1)
const corners: [number, number, number][] = [
  [1.4, 1.2, 1.4], [1.4, 1.2, -1.4], [-1.4, 1.2, 1.4], [-1.4, 1.2, -1.4],
]
const twoFlanks: [number, number, number][] = [[-2.2, 1.5, 0], [2.2, 1.5, 0]]

const floaters = [
  { pos: [0, 1.6, 0] as [number, number, number], color: '#f0b0a0' },
  { pos: [2.4, 2.4, 1] as [number, number, number], color: '#f4c8b0' },
  { pos: [-2.2, 1.9, -1.2] as [number, number, number], color: '#eeb8a8' },
  { pos: [1.2, 3.1, -2] as [number, number, number], color: '#f8d0c0' },
  { pos: [-1.6, 2.8, 2] as [number, number, number], color: '#f0bcac' },
]
const domes = [
  { pos: [0, 0.6, 0] as [number, number, number], r: 1.3 },
  { pos: [2.3, 0.4, 1] as [number, number, number], r: 0.8 },
  { pos: [-2, 0.5, -1.4] as [number, number, number], r: 0.9 },
]
const pads = [
  { pos: [0, 0.6, 0] as [number, number, number], r: 1.2 },
  { pos: [2.6, 1.1, 0.6] as [number, number, number], r: 0.7 },
  { pos: [-2.2, 0.9, -1] as [number, number, number], r: 0.8 },
  { pos: [0.8, 1.5, -2.4] as [number, number, number], r: 0.6 },
]
const slabs = [
  { pos: [0, 1.4, 0] as [number, number, number], w: 2 },
  { pos: [2.4, 2.2, 0.8] as [number, number, number], w: 1.2 },
  { pos: [-2.2, 1.9, -1] as [number, number, number], w: 1.4 },
  { pos: [0.6, 3, -2] as [number, number, number], w: 1 },
]
const spires = [
  { pos: [0, 1.6, 0] as [number, number, number], h: 3 },
  { pos: [1.8, 1.2, 1] as [number, number, number], h: 2.2 },
  { pos: [-1.6, 1.4, -0.8] as [number, number, number], h: 2.6 },
  { pos: [1, 1, -2] as [number, number, number], h: 1.8 },
  { pos: [-2, 1, 1.6] as [number, number, number], h: 2 },
]
const motes = Array.from({ length: 22 }, (_, i) => {
  const a = i * 2.399
  const r = 1 + (i % 5) * 0.7
  return {
    pos: [Math.cos(a) * r, (i % 7) * 0.5 - 1, Math.sin(a) * r] as [number, number, number],
    r: 0.1 + (i % 3) * 0.04,
  }
})
</script>
