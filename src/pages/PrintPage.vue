<template>
  <main class="print">
    <button class="print__back" type="button" aria-label="返回" @click="router.back()">
      <AppIcon name="back" :size="20" />
    </button>

    <div v-if="!ready" class="print__loading">
      <div class="print__loadcard">
        <AppSpinner :size="30" />
        <p class="print__loadtitle">載入印經坊…</p>
        <div class="print__loadbar"><i :style="{ width: `${loadPct}%` }" /></div>
      </div>
    </div>

    <!-- 印經坊 本尊 · 完整排版與輸出工具 -->
    <iframe
      ref="frame"
      class="print__frame"
      :class="{ 'print__frame--ready': ready }"
      src="/yinjingfang/index.html"
      title="印經坊 · 印刷排版"
      @load="onLoad"
    />
  </main>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import AppIcon from 'src/components/ui/AppIcon.vue'
import AppSpinner from 'src/components/ui/AppSpinner.vue'

const router = useRouter()
const frame = ref<HTMLIFrameElement | null>(null)
const ready = ref(false)

const loadPct = ref(0)
let loadTimer: ReturnType<typeof setInterval> | undefined
function startLoad() {
  loadPct.value = 6
  clearInterval(loadTimer)
  loadTimer = setInterval(() => {
    loadPct.value = Math.min(90, loadPct.value + Math.max(0.4, (90 - loadPct.value) * 0.05))
  }, 110)
}
onMounted(startLoad)
onBeforeUnmount(() => clearInterval(loadTimer))

// Ready once the bundled sutra library has decompressed (the text box fills).
function check(attempt = 0) {
  const doc = frame.value?.contentDocument ?? null
  const body = doc?.getElementById('in-body') as HTMLTextAreaElement | null
  if (body && body.value.trim().length > 20) {
    clearInterval(loadTimer)
    loadPct.value = 100
    ready.value = true
    return
  }
  if (attempt < 80) setTimeout(() => check(attempt + 1), 150)
  else {
    clearInterval(loadTimer)
    ready.value = true // show it anyway rather than hang
  }
}
function onLoad() {
  ready.value = false
  startLoad()
  check()
}
</script>

<style scoped>
.print {
  position: relative;
  height: 100vh;
  height: 100dvh;
  background: #0f1115;
  overflow: hidden;
}
.print__frame {
  width: 100%;
  height: 100%;
  border: 0;
  opacity: 0;
  transition: opacity var(--base) var(--ease);
}
.print__frame--ready {
  opacity: 1;
}

.print__back {
  position: absolute;
  z-index: 5;
  top: calc(var(--safe-t) + var(--s3));
  left: var(--s3);
  width: 40px;
  height: 40px;
  display: grid;
  place-items: center;
  border-radius: var(--r-full);
  color: #e6e8ec;
  background: rgba(20, 24, 32, 0.72);
  backdrop-filter: blur(var(--blur));
  -webkit-backdrop-filter: blur(var(--blur));
  border: 1px solid rgba(255, 255, 255, 0.12);
}

.print__loading {
  position: absolute;
  inset: 0;
  z-index: 8;
  display: grid;
  place-items: center;
  background: #0f1115;
}
.print__loadcard {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--s3);
  width: min(78vw, 18rem);
}
.print__loadtitle {
  font-size: var(--text-caption);
  letter-spacing: 0.14em;
  color: var(--text-dim);
}
.print__loadbar {
  width: 100%;
  height: 4px;
  border-radius: var(--r-full);
  background: rgba(255, 255, 255, 0.12);
  overflow: hidden;
}
.print__loadbar i {
  display: block;
  height: 100%;
  border-radius: var(--r-full);
  background: linear-gradient(90deg, #c9a24e, #e8ce8e);
  transition: width 0.2s var(--ease-out);
}
</style>
