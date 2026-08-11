<template>
  <section v-if="ghost.active.value" class="ghost">
    <div class="ghost__head">
      <span class="ghost__ribbon">農曆七月 · 孝親報恩月</span>
      <span v-if="allDone" class="ghost__done">✦ 今日圓滿 ✦</span>
    </div>
    <p class="ghost__note">
      鬼月孝親月:每日誦《地藏經》一部、持〈報父母恩咒〉108 遍,超薦累劫父母師長、冤親債主。
    </p>
    <ul class="ghost__tasks">
      <li class="gtask" :class="{ 'gtask--done': dizangDone }">
        <div class="gtask__main">
          <p class="gtask__name">誦《地藏菩薩本願經》一部</p>
          <p class="gtask__sub">超薦歷代父母師長</p>
        </div>
        <button v-if="!dizangDone" class="gtask__go" type="button" @click="readDizang">開始誦讀</button>
        <button
          class="gtask__do"
          :class="{ 'gtask__do--on': dizangDone }"
          type="button"
          @click="toggleDizang"
        >
          {{ dizangDone ? '✓ 已誦' : '念畢' }}
        </button>
      </li>
      <li class="gtask" :class="{ 'gtask--done': baofumuDone }">
        <div class="gtask__main">
          <p class="gtask__name">〈報父母恩咒〉108 遍</p>
          <p class="gtask__sub">報父母深恩 · 一鍵圓滿或到念珠慢持</p>
        </div>
        <button v-if="!baofumuDone" class="gtask__do" type="button" @click="doBaofumu">圓滿 108</button>
        <span v-else class="gtask__do gtask__do--on">✓ 圓滿</span>
      </li>
    </ul>
  </section>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useGhostMonth } from 'src/composables/useGhostMonth'
import { useChantStore } from 'src/stores/chantStore'
import { useStreakStore } from 'src/stores/streakStore'
import { useChime } from 'src/composables/useChime'
import { useToast } from 'src/composables/useToast'

const ghost = useGhostMonth()
const router = useRouter()
const chant = useChantStore()
const streak = useStreakStore()
const chime = useChime()
const toast = useToast()

function dayKey(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function get(k: string): boolean {
  try {
    return localStorage.getItem(k) === dayKey()
  } catch {
    return false
  }
}
function set(k: string, on: boolean): void {
  try {
    if (on) localStorage.setItem(k, dayKey())
    else localStorage.removeItem(k)
  } catch {
    /* storage unavailable */
  }
}

const dizangDone = ref(get('ghost:dizang'))
const baofumuDone = ref(get('ghost:baofumu'))
const allDone = ref(dizangDone.value && baofumuDone.value)
function refresh() {
  allDone.value = dizangDone.value && baofumuDone.value
}

function readDizang() {
  router.push('/reader/ksitigarbha/1')
}

async function toggleDizang() {
  dizangDone.value = !dizangDone.value
  set('ghost:dizang', dizangDone.value)
  refresh()
  if (dizangDone.value) {
    chime.strike(0.6)
    await streak.touchToday()
    toast.info('地藏經一部圓滿 · 功德迴向父母師長 🙏')
  }
}

async function doBaofumu() {
  await chant.load()
  await chant.completeRound('baofumu') // banks 108 遍 + marks today active
  baofumuDone.value = true
  set('ghost:baofumu', true)
  refresh()
  chime.strike(1)
  toast.info('報父母恩咒 108 遍圓滿 🙏')
}
</script>

<style scoped>
.ghost {
  margin-top: var(--s5);
  padding: var(--s3) var(--s4) var(--s4);
  border-radius: var(--r-lg);
  background:
    radial-gradient(circle at 90% 0%, rgba(244, 114, 94, 0.16), transparent 55%),
    rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(244, 114, 94, 0.3);
}
.ghost__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--s3);
}
.ghost__ribbon {
  padding: 4px var(--s3);
  border-radius: var(--r-full);
  font-size: var(--text-micro);
  letter-spacing: 0.12em;
  color: #ffb4a2;
  background: rgba(244, 114, 94, 0.14);
  border: 1px solid rgba(244, 114, 94, 0.35);
}
.ghost__done {
  font-size: var(--text-micro);
  letter-spacing: 0.12em;
  color: #86efac;
}
.ghost__note {
  margin-top: var(--s3);
  font-size: var(--text-micro);
  line-height: 1.7;
  color: var(--text-dim);
  letter-spacing: 0.03em;
}
.ghost__tasks {
  list-style: none;
  margin-top: var(--s3);
  display: grid;
  gap: var(--s2);
}
.gtask {
  display: flex;
  align-items: center;
  gap: var(--s3);
  padding: var(--s3);
  border-radius: var(--r-md);
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid var(--hairline);
}
.gtask--done {
  background: rgba(134, 239, 172, 0.06);
  border-color: rgba(134, 239, 172, 0.3);
}
.gtask__main {
  flex: 1;
  min-width: 0;
}
.gtask__name {
  font-size: var(--text-caption);
  letter-spacing: 0.04em;
}
.gtask__sub {
  margin-top: 2px;
  font-size: 10px;
  color: var(--text-faint);
  line-height: 1.5;
}
.gtask__go {
  flex-shrink: 0;
  padding: var(--s2) var(--s3);
  border-radius: var(--r-full);
  font-size: var(--text-micro);
  color: var(--text-dim);
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--hairline);
}
.gtask__do {
  flex-shrink: 0;
  padding: var(--s2) var(--s4);
  border-radius: var(--r-full);
  font-size: var(--text-caption);
  letter-spacing: 0.04em;
  color: #ffb4a2;
  background: rgba(244, 114, 94, 0.14);
  border: 1px solid rgba(244, 114, 94, 0.4);
  transition: background var(--fast) var(--ease);
}
.gtask__do:active {
  transform: scale(0.96);
}
.gtask__do--on {
  color: #86efac;
  background: rgba(134, 239, 172, 0.12);
  border-color: rgba(134, 239, 172, 0.4);
}
</style>
