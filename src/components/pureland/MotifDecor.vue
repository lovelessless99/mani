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

    <!-- 初禪 · 梵天座,光明外映 -->
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

    <!-- 大梵天 · 一界之主,座上懸明 -->
    <template v-else-if="motif === 'brahmaking'">
      <TresMesh :position="[0, 1, 0]">
        <TresCylinderGeometry :args="[1.5, 2, 0.6, 32]" />
        <TresMeshStandardMaterial :color="rim" :emissive="rim" :emissive-intensity="0.4" :roughness="0.3" />
      </TresMesh>
      <TresMesh :position="[0, 2.4, -0.5]">
        <TresCylinderGeometry :args="[1.3, 1.5, 2.6, 32, 1, false, 0, 3.14]" />
        <TresMeshStandardMaterial :color="rim" :emissive="rim" :emissive-intensity="0.7" :roughness="0.25" :side="2" />
      </TresMesh>
      <TresMesh :position="[0, 2.6, 0.2]">
        <TresIcosahedronGeometry :args="[0.6, 1]" />
        <TresMeshStandardMaterial color="#ffffff" :emissive="rim" :emissive-intensity="1.8" :roughness="0.15" />
      </TresMesh>
    </template>

    <!-- 少光天 · 身放少光,微芒數點 -->
    <template v-else-if="motif === 'spark'">
      <TresMesh v-for="(m, i) in sparks" :key="i" :position="m.pos">
        <TresIcosahedronGeometry :args="[m.r, 0]" />
        <TresMeshStandardMaterial :color="rim" :emissive="rim" :emissive-intensity="1.6" />
      </TresMesh>
    </template>

    <!-- 無量光天 · 光明無量,四射光芒 -->
    <template v-else-if="motif === 'beam'">
      <TresMesh v-for="(p, i) in ring8b" :key="i" :position="p.pos" :rotation="p.rot">
        <TresConeGeometry :args="[0.16, 3.4, 4]" />
        <TresMeshStandardMaterial :color="rim" :emissive="rim" :emissive-intensity="1.4" :transparent="true" :opacity="0.7" />
      </TresMesh>
      <TresMesh :position="[0, 1.6, 0]">
        <TresIcosahedronGeometry :args="[0.7, 1]" />
        <TresMeshStandardMaterial color="#ffffff" :emissive="rim" :emissive-intensity="2" :roughness="0.1" />
      </TresMesh>
    </template>

    <!-- 二禪 · 光音天,環立光柱 -->
    <template v-else-if="motif === 'radiance'">
      <TresMesh v-for="(p, i) in ring6" :key="i" :position="p">
        <TresCylinderGeometry :args="[0.14, 0.14, 4.2, 10]" />
        <TresMeshStandardMaterial :color="rim" :emissive="rim" :emissive-intensity="1.5" :transparent="true" :opacity="0.85" :roughness="0.2" />
      </TresMesh>
    </template>

    <!-- 少淨天 · 淨樂微少,浮花數瓣 -->
    <template v-else-if="motif === 'petal'">
      <TresMesh v-for="(p, i) in petals" :key="i" :position="p.pos" :rotation="p.rot" :scale="[1, 1, 0.4]">
        <TresSphereGeometry :args="[0.5, 12, 8, 0, 3.14]" />
        <TresMeshStandardMaterial :color="rim" :emissive="rim" :emissive-intensity="0.5" :roughness="0.4" :side="2" :transparent="true" :opacity="0.85" />
      </TresMesh>
    </template>

    <!-- 三禪 · 淨樂周遍,柔光蓮臺 -->
    <template v-else-if="motif === 'pure'">
      <TresMesh v-for="(p, i) in pads" :key="i" :position="p.pos" :rotation="[-1.57, 0, 0]">
        <TresCircleGeometry :args="[p.r, 24]" />
        <TresMeshStandardMaterial :color="rim" :emissive="rim" :emissive-intensity="0.7" :transparent="true" :opacity="0.7" :side="2" />
      </TresMesh>
    </template>

    <!-- 遍淨天 · 淨樂周遍,一泓止水 -->
    <template v-else-if="motif === 'lake'">
      <TresMesh :position="[0, 0.05, 0]" :rotation="[-1.57, 0, 0]">
        <TresCircleGeometry :args="[3.6, 48]" />
        <TresMeshPhysicalMaterial :color="rim" :metalness="0.9" :roughness="0.06" :transparent="true" :opacity="0.8" :emissive="rim" :emissive-intensity="0.12" />
      </TresMesh>
      <TresMesh v-for="r in 3" :key="r" :position="[0, 0.07, 0]" :rotation="[-1.57, 0, 0]">
        <TresRingGeometry :args="[r * 0.9, r * 0.9 + 0.04, 48]" />
        <TresMeshBasicMaterial :color="rim" :transparent="true" :opacity="0.3" :side="2" />
      </TresMesh>
    </template>

    <!-- 四禪 · 無雲,懸浮光板 -->
    <template v-else-if="motif === 'cloudless'">
      <TresMesh v-for="(p, i) in slabs" :key="i" :position="p.pos">
        <TresBoxGeometry :args="[p.w, 0.08, p.w]" />
        <TresMeshStandardMaterial :color="rim" :emissive="rim" :emissive-intensity="0.5" :metalness="0.3" :roughness="0.2" :transparent="true" :opacity="0.85" />
      </TresMesh>
    </template>

    <!-- 廣果天 · 果報廣大,層層寶臺 -->
    <template v-else-if="motif === 'terrace'">
      <TresMesh v-for="t in 4" :key="t" :position="[0, (t - 1) * 0.5, 0]">
        <TresCylinderGeometry :args="[4 - (t - 1) * 0.8, 4 - (t - 1) * 0.8, 0.3, 6]" />
        <TresMeshStandardMaterial :color="rim" :emissive="rim" :emissive-intensity="0.3" :metalness="0.3" :roughness="0.3" :transparent="true" :opacity="0.9" />
      </TresMesh>
    </template>

    <!-- 無想天 · 心想不行,冰寒晶稜 -->
    <template v-else-if="motif === 'frost'">
      <TresMesh v-for="(p, i) in shards" :key="i" :position="p.pos" :rotation="p.rot" :scale="[0.4, p.h, 0.4]">
        <TresOctahedronGeometry :args="[0.7, 0]" />
        <TresMeshPhysicalMaterial color="#eaf6ff" :transmission="0.9" :thickness="0.5" :roughness="0.02" :ior="1.4" :transparent="true" :opacity="0.85" />
      </TresMesh>
    </template>

    <!-- 五淨居天 · 清淨琉璃,晶柱林立 -->
    <template v-else-if="motif === 'suddhavasa'">
      <TresMesh v-for="(p, i) in spires" :key="i" :position="p.pos" :scale="[0.5, p.h, 0.5]">
        <TresOctahedronGeometry :args="[0.6, 0]" />
        <TresMeshPhysicalMaterial :color="rim" :transmission="0.85" :thickness="0.6" :roughness="0.05" :ior="1.6" :transparent="true" :opacity="0.9" :emissive="rim" :emissive-intensity="0.2" />
      </TresMesh>
    </template>

    <!-- 善見/善現天 · 見極清徹,通透水晶 -->
    <template v-else-if="motif === 'crystal'">
      <TresMesh v-for="(p, i) in prisms" :key="i" :position="p.pos" :scale="[0.4, p.h, 0.4]">
        <TresCylinderGeometry :args="[0.5, 0.5, 1.4, 6]" />
        <TresMeshPhysicalMaterial color="#f4fbff" :transmission="0.95" :thickness="0.8" :roughness="0.01" :ior="1.5" :transparent="true" :opacity="0.9" />
      </TresMesh>
    </template>

    <!-- 色究竟天 · 有形之極,一柱擎天 -->
    <template v-else-if="motif === 'summit'">
      <TresMesh :position="[0, 2.4, 0]">
        <TresConeGeometry :args="[1, 5, 4]" />
        <TresMeshPhysicalMaterial color="#ffffff" :transmission="0.7" :thickness="1.5" :roughness="0.02" :ior="1.6" :transparent="true" :opacity="0.95" :emissive="rim" :emissive-intensity="0.5" />
      </TresMesh>
      <TresMesh :position="[0, 5.2, 0]">
        <TresIcosahedronGeometry :args="[0.5, 1]" />
        <TresMeshStandardMaterial color="#ffffff" :emissive="'#ffffff'" :emissive-intensity="2" :roughness="0.1" />
      </TresMesh>
    </template>

    <!-- 無色界 · 無形,漸次趣寂 -->
    <template v-else-if="motif === 'voidspace'">
      <!-- 空無邊處:一望無際的稀疏光點,示虛空無邊 -->
      <TresMesh v-for="(m, i) in wideMotes" :key="i" :position="m.pos">
        <TresIcosahedronGeometry :args="[m.r, 0]" />
        <TresMeshStandardMaterial :color="rim" :emissive="rim" :emissive-intensity="1" :transparent="true" :opacity="0.6" />
      </TresMesh>
    </template>
    <template v-else-if="motif === 'voidmind'">
      <!-- 識無邊處:光點相連如識流 -->
      <TresMesh v-for="(m, i) in mindMotes" :key="i" :position="m.pos">
        <TresIcosahedronGeometry :args="[0.12, 0]" />
        <TresMeshStandardMaterial :color="rim" :emissive="rim" :emissive-intensity="1.4" :transparent="true" :opacity="0.75" />
      </TresMesh>
    </template>
    <template v-else-if="motif === 'voidnil'">
      <!-- 無所有處:近乎無有,唯餘二三微光 -->
      <TresMesh v-for="(m, i) in fewMotes" :key="i" :position="m.pos">
        <TresIcosahedronGeometry :args="[0.14, 0]" />
        <TresMeshStandardMaterial :color="rim" :emissive="rim" :emissive-intensity="0.9" :transparent="true" :opacity="0.5" />
      </TresMesh>
    </template>
    <template v-else-if="motif === 'voidapex'">
      <!-- 非想非非想:唯一點幽微,若存若亡 -->
      <TresMesh :position="[0, 0.6, 0]">
        <TresIcosahedronGeometry :args="[0.2, 1]" />
        <TresMeshStandardMaterial :color="rim" :emissive="rim" :emissive-intensity="0.8" :transparent="true" :opacity="0.45" />
      </TresMesh>
    </template>

    <!-- 極樂世界 · 七寶池,八功德水,蓮花化生,寶樓閣 -->
    <template v-else-if="motif === 'sukhavati'">
      <TresMesh :position="[0, 0.05, 0]" :rotation="[-1.57, 0, 0]">
        <TresCircleGeometry :args="[3.4, 48]" />
        <TresMeshStandardMaterial color="#8fd0ff" :metalness="0.6" :roughness="0.08" :transparent="true" :opacity="0.8" :emissive="'#4a86c0'" :emissive-intensity="0.2" />
      </TresMesh>
      <TresMesh v-for="(p, i) in pads" :key="i" :position="[p.pos[0], 0.12, p.pos[2]]" :rotation="[-1.57, 0, 0]">
        <TresCircleGeometry :args="[p.r * 0.7, 8]" />
        <TresMeshStandardMaterial color="#ffb0d8" :emissive="'#ff7ab0'" :emissive-intensity="0.5" :side="2" />
      </TresMesh>
      <TresGroup v-for="(c, i) in corners" :key="'p' + i" :position="[c[0] * 1.6, 0, c[2] * 1.6]">
        <TresMesh :position="[0, 1, 0]"><TresBoxGeometry :args="[0.9, 2, 0.9]" /><TresMeshStandardMaterial color="#e6c04a" :metalness="0.6" :roughness="0.3" :emissive="'#6a4a10'" :emissive-intensity="0.2" /></TresMesh>
        <TresMesh :position="[0, 2.2, 0]" :rotation="[0, 0.78, 0]"><TresConeGeometry :args="[0.8, 0.6, 4]" /><TresMeshStandardMaterial color="#ffe08a" :emissive="'#ffcf5a'" :emissive-intensity="0.4" :metalness="0.5" :roughness="0.25" /></TresMesh>
      </TresGroup>
    </template>

    <!-- 淨琉璃世界 · 琉璃寶臺,日光月光二菩薩侍立 -->
    <template v-else-if="motif === 'vaidurya'">
      <TresMesh :position="[0, 1, 0]">
        <TresCylinderGeometry :args="[1.2, 1.5, 2, 8]" />
        <TresMeshPhysicalMaterial color="#4fd0c4" :transmission="0.7" :thickness="1" :roughness="0.05" :ior="1.5" :transparent="true" :opacity="0.9" :emissive="'#2fa89c'" :emissive-intensity="0.3" />
      </TresMesh>
      <TresMesh v-for="(p, i) in twoFlanks" :key="i" :position="[p[0], 1.4, p[2]]">
        <TresCylinderGeometry :args="[0.3, 0.3, 2.8, 12]" />
        <TresMeshStandardMaterial :color="i === 0 ? '#fff2c0' : '#cfe4ff'" :emissive="i === 0 ? '#ffd873' : '#9fc4ff'" :emissive-intensity="1.4" />
      </TresMesh>
    </template>

    <!-- 眾香國 · 香雲繚繞,以香為佛事 -->
    <template v-else-if="motif === 'fragrance'">
      <TresMesh v-for="(f, i) in floaters" :key="i" :position="f.pos" :scale="[1, 1.6, 1]">
        <TresSphereGeometry :args="[0.5 + (i % 3) * 0.12, 16, 12]" />
        <TresMeshStandardMaterial color="#e0b8f4" :emissive="'#c890e8'" :emissive-intensity="0.5" :transparent="true" :opacity="0.4" />
      </TresMesh>
    </template>

    <!-- 華藏世界 · 大蓮華托無量世界,重重無盡 -->
    <template v-else-if="motif === 'lotusstore'">
      <TresMesh v-for="p in 8" :key="p" :position="[Math.cos(p) * 1.4, 0.9 + Math.sin(p * 2) * 0.2, Math.sin(p) * 1.4]" :rotation="[1.1, -p, 0.4]">
        <TresConeGeometry :args="[0.6, 1.4, 4]" />
        <TresMeshStandardMaterial color="#ffcf8a" :emissive="'#ffb45a'" :emissive-intensity="0.4" :roughness="0.4" :side="2" />
      </TresMesh>
      <TresMesh :position="[0, 2.6, 0]">
        <TresSphereGeometry :args="[0.9, 24, 16]" />
        <TresMeshPhysicalMaterial color="#fff0c0" :transmission="0.6" :thickness="1" :roughness="0.06" :ior="1.5" :transparent="true" :opacity="0.9" :emissive="'#ffd873'" :emissive-intensity="0.4" />
      </TresMesh>
      <TresMesh v-for="w in worlds" :key="'w' + w.i" :position="w.pos">
        <TresIcosahedronGeometry :args="[0.14, 0]" />
        <TresMeshStandardMaterial color="#a0d8ff" :emissive="'#7ab8ff'" :emissive-intensity="1.2" />
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
// 少光天 — a few modest sparks
const sparks = Array.from({ length: 7 }, (_, i) => {
  const a = i * 1.9
  const r = 1 + (i % 3) * 0.6
  return {
    pos: [Math.cos(a) * r, 1 + (i % 3) * 0.5, Math.sin(a) * r] as [number, number, number],
    r: 0.1 + (i % 2) * 0.05,
  }
})

// 無量光天 — rays fanning out from the centre
const ring8b = Array.from({ length: 8 }, (_, i) => {
  const a = (i / 8) * Math.PI * 2
  return {
    pos: [Math.cos(a) * 2.4, 1.6, Math.sin(a) * 2.4] as [number, number, number],
    rot: [Math.PI / 2.4, -a, 0] as [number, number, number],
  }
})

// 少淨天 — floating petals
const petals = Array.from({ length: 5 }, (_, i) => {
  const a = i * 1.7
  const r = 1.4 + (i % 2) * 0.8
  return {
    pos: [Math.cos(a) * r, 1 + (i % 3) * 0.6, Math.sin(a) * r] as [number, number, number],
    rot: [1.2, a, 0.3] as [number, number, number],
  }
})

// 無想天 — cold angular shards
const shards = [
  { pos: [0, 1.4, 0] as [number, number, number], rot: [0.1, 0.4, 0.1] as [number, number, number], h: 2.6 },
  { pos: [1.7, 1, 0.8] as [number, number, number], rot: [0.2, 1, -0.15] as [number, number, number], h: 1.8 },
  { pos: [-1.5, 1.2, -0.6] as [number, number, number], rot: [-0.15, 0.6, 0.2] as [number, number, number], h: 2.1 },
  { pos: [0.9, 0.9, -2] as [number, number, number], rot: [0.1, 2, 0.1] as [number, number, number], h: 1.5 },
  { pos: [-1.9, 0.9, 1.4] as [number, number, number], rot: [0.2, 1.4, -0.1] as [number, number, number], h: 1.7 },
]

// 善見/善現天 — clear prisms
const prisms = [
  { pos: [0, 1.4, 0] as [number, number, number], h: 2.4 },
  { pos: [1.6, 1.1, 1] as [number, number, number], h: 1.9 },
  { pos: [-1.5, 1.3, -0.7] as [number, number, number], h: 2.1 },
  { pos: [0.8, 1, -1.9] as [number, number, number], h: 1.6 },
]

// 無色界 mote fields, thinning as the realm approaches quiescence
const wideMotes = Array.from({ length: 16 }, (_, i) => {
  const a = i * 2.399
  const r = 1.5 + (i % 6) * 0.9
  return {
    pos: [Math.cos(a) * r, (i % 8) * 0.6 - 2, Math.sin(a) * r] as [number, number, number],
    r: 0.08 + (i % 3) * 0.03,
  }
})
const mindMotes = Array.from({ length: 20 }, (_, i) => {
  const t = i / 20
  const a = t * Math.PI * 6
  const r = 0.5 + t * 2.4
  return { pos: [Math.cos(a) * r, t * 3 - 1.5, Math.sin(a) * r] as [number, number, number] }
})
const fewMotes = [
  { pos: [0.6, 1, 0.3] as [number, number, number] },
  { pos: [-0.8, 0.4, -0.5] as [number, number, number] },
  { pos: [0.2, -0.3, 0.9] as [number, number, number] },
]

// 華藏世界 — small worlds orbiting the great lotus's jewel
const worlds = Array.from({ length: 10 }, (_, i) => {
  const a = i * 2.399
  const r = 1.5 + (i % 3) * 0.5
  return {
    i,
    pos: [Math.cos(a) * r, 3 + Math.sin(a * 1.5) * 0.6, Math.sin(a) * r] as [number, number, number],
  }
})
</script>
