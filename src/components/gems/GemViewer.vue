<template>
  <div class="viewer" @click.self="$emit('close')">
    <AppButton
      icon="close"
      icon-only
      variant="ghost"
      class="viewer__close"
      aria-label="關閉"
      @click="$emit('close')"
    />

    <div class="viewer__canvas">
      <TresCanvas :alpha="true" :antialias="true">
        <!-- fov is the *vertical* angle. On a portrait phone the horizontal
             field is less than half of it, so a distance that frames the gem
             on a desktop lets it burst out of both sides on a handset. Hence
             the camera sits well back. -->
        <TresPerspectiveCamera :position="[0, 1.3, 11]" :fov="38" :look-at="[0, 0.35, 0]" />
        <OrbitControls
          :enable-zoom="true"
          :enable-pan="false"
          :min-distance="4"
          :max-distance="18"
          :target="[0, 0.35, 0]"
        />
        <!-- The studio lights the stone but is never shown: it stays as
             `scene.environment` only, so the sky behind stays bare. -->
        <GemEnvironment tint="#e8eef8" :intensity="1.35" />
        <GemSky />
        <GemWater :tint="waterTint" />
        <PetalRain />
        <TresGroup :position="[0, 0.35, 0]">
          <GemMesh :params="gem.params" :scale="1.05" :auto-rotate="true" />
        </TresGroup>

        <!-- Key / rim / fill: the environment does the refraction, these
             just carve out the edges and put sparkle on the facets. -->
        <TresDirectionalLight :position="[4, 6, 5]" :intensity="2.2" color="#ffffff" />
        <TresDirectionalLight
          :position="[-6, -2, -4]"
          :intensity="1.4"
          color="#dfe8f6"
        />
        <TresPointLight
          :position="[0, 2.5, 3]"
          :intensity="14"
          color="#ffffff"
          :distance="10"
        />
        <TresPointLight
          :position="[-2.5, -2, 2]"
          :intensity="9"
          :color="gem.params.colorHex"
          :distance="9"
        />
      </TresCanvas>
    </div>

    <aside class="panel glass">
      <template v-if="buddha">
        <h2 class="panel__name">{{ buddha.nameZh }}</h2>
        <p class="panel__name-en">{{ buddha.nameEn }}</p>
        <p class="panel__desc">{{ buddha.description }}</p>
      </template>

      <!-- Only 華嚴經 gems carry a Buddha. The rest are named by the
           chapter that earned them and the form they took. -->
      <template v-else-if="origin">
        <h2 class="panel__name">{{ origin.chapter }}</h2>
        <p class="panel__name-en">{{ origin.sutra }}</p>
        <p v-if="shapeName" class="panel__desc">{{ shapeName }}</p>
      </template>

      <div v-if="constellation" class="panel__constellation">
        <div class="panel__figure">
          <ConstellationFigure
            :constellation-id="gem.constellationId"
            :color="gem.params.colorHex"
            :label="constellation.nameZh"
          />
        </div>
        <div class="panel__conmain">
          <p class="panel__star">
            {{ constellation.nameZh }}
            <span class="t-faint">· {{ constellation.nameEn }}</span>
          </p>
          <p v-if="lore" class="panel__origin">{{ lore.origin }}</p>
        </div>
      </div>

      <template v-if="lore">
        <p class="panel__story">{{ lore.story }}</p>
        <p v-if="lore.note" class="panel__note">✦ {{ lore.note }}</p>
      </template>

      <p class="panel__date">獲得於 {{ earnedDate }}</p>
    </aside>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { TresCanvas } from '@tresjs/core'
import { OrbitControls } from '@tresjs/cientos'
import GemMesh from './GemMesh.vue'
import GemEnvironment from './GemEnvironment.vue'
import GemWater from './GemWater.vue'
import GemSky from './GemSky.vue'
import PetalRain from './PetalRain.vue'
import ConstellationFigure from './ConstellationFigure.vue'
import AppButton from 'src/components/ui/AppButton.vue'
import type { GemRecord, BuddhaInfo, ConstellationInfo } from 'src/types/gem'
import buddhasData from 'src/data/meta/buddhas-88.json'
import constellationsData from 'src/data/meta/constellations-88.json'
import loreData from 'src/data/meta/constellation-lore.json'
import chaptersData from 'src/data/meta/sutra-chapters.json'
import { getAllSutras } from 'src/services/sutraService'

const props = defineProps<{ gem: GemRecord }>()
defineEmits<{ close: [] }>()

const buddha = computed<BuddhaInfo | undefined>(() =>
  props.gem.buddhaId
    ? (buddhasData as BuddhaInfo[]).find((b) => b.id === props.gem.buddhaId)
    : undefined
)

const constellation = computed<ConstellationInfo | undefined>(() =>
  props.gem.constellationId
    ? (constellationsData as ConstellationInfo[]).find(
        (c) => c.id === props.gem.constellationId
      )
    : undefined
)

interface Lore {
  origin: string
  story: string
  note?: string
}

const lore = computed<Lore | undefined>(() =>
  props.gem.constellationId
    ? (loreData as unknown as Record<string, Lore>)[props.gem.constellationId]
    : undefined
)

const SHAPE_NAMES: Record<string, string> = {
  lotus: '蓮華形',
  vase: '寶瓶形',
  stupa: '寶塔形',
  dome: '佛頂形',
}

const shapeName = computed(() => SHAPE_NAMES[props.gem.params.geometry])

/** Which chapter of which sutra this stone came from. */
const origin = computed(() => {
  const [sutraId, chapterId] = props.gem.sourceRef.split('/')
  const sutra = getAllSutras().find((s) => s.id === sutraId)
  const chapter = (chaptersData as unknown as Record<string, { items: { id: string; name: string }[] }>)[
    sutraId
  ]?.items.find((c) => c.id === chapterId)
  if (!sutra) return null
  return { sutra: sutra.titleZh, chapter: chapter?.name ?? '' }
})

// The water picks up a hint of the stone above it
const waterTint = computed(() => props.gem.params.colorHex)

const earnedDate = computed(() =>
  new Date(props.gem.earnedAt).toLocaleDateString('zh-TW', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
)
</script>

<style scoped>
.viewer {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(228, 236, 246, 0.96);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  animation: viewer-in var(--base) var(--ease);
}

@keyframes viewer-in {
  from {
    opacity: 0;
  }
}

.viewer__close {
  position: absolute;
  top: calc(var(--safe-t) + var(--s3));
  right: var(--s3);
  z-index: 2;
}

/* Full-bleed: the studio backdrop has to cover the whole overlay, or it
   reads as a lit rectangle floating in the dark. */
.viewer__canvas {
  position: absolute;
  inset: 0;
}

/* — Info panel ————————————————————————————— */
.panel {
  position: absolute;
  left: 50%;
  bottom: calc(var(--safe-b) + var(--s5));
  transform: translateX(-50%);
  width: min(22rem, 90vw);
  max-height: 62vh;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: var(--s4) var(--s5);
  text-align: center;
  background: rgba(16, 20, 30, 0.82);
  backdrop-filter: blur(var(--blur-heavy)) saturate(180%);
  -webkit-backdrop-filter: blur(var(--blur-heavy)) saturate(180%);
}

.panel__name {
  font-size: var(--text-title);
  font-weight: 300;
  letter-spacing: 0.12em;
}

.panel__name-en {
  margin-top: 2px;
  font-size: var(--text-micro);
  letter-spacing: 0.08em;
  color: var(--text-faint);
}

.panel__desc {
  margin-top: var(--s3);
  font-size: var(--text-caption);
  line-height: 1.8;
  color: var(--text-dim);
}

.panel__constellation {
  margin-top: var(--s3);
  padding-top: var(--s3);
  border-top: 1px solid var(--hairline);
  display: flex;
  align-items: center;
  gap: var(--s3);
  text-align: left;
}

.panel__figure {
  width: 58px;
  height: 58px;
  flex-shrink: 0;
}

.panel__conmain {
  min-width: 0;
}

.panel__star {
  font-size: var(--text-caption);
  letter-spacing: 0.06em;
  color: var(--amber);
  line-height: 1.5;
}

.panel__origin {
  margin-top: 2px;
  font-size: var(--text-micro);
  letter-spacing: 0.1em;
  color: var(--text-faint);
}

.panel__story {
  margin-top: var(--s3);
  font-size: var(--text-caption);
  line-height: 1.95;
  color: var(--text-dim);
  text-align: left;
  /* Sutra-adjacent content reads better with a serif face */
  font-family: var(--font-serif);
}

.panel__note {
  margin-top: var(--s2);
  font-size: var(--text-micro);
  line-height: 1.7;
  letter-spacing: 0.04em;
  color: var(--amber);
  opacity: 0.75;
  text-align: left;
}

.panel__date {
  margin-top: var(--s2);
  font-size: var(--text-micro);
  letter-spacing: 0.08em;
  color: var(--text-faint);
}
</style>
