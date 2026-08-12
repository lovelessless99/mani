<template>
  <main class="page">
    <header>
      <h1 class="page-title">聽法筆記</h1>
      <p class="page-sub">貼上講經影片,標下時間點與感想 · 隨時跳回那一刻</p>
    </header>

    <!-- 今日已聞法 check-in -->
    <button class="checkin" :class="{ 'checkin--on': heardToday }" type="button" @click="checkIn">
      <span class="checkin__icon">🎧</span>
      <span class="checkin__text">{{ heardToday ? '今日已聞法 ✓ · 功課 +1' : '今日已聞法 · 打卡' }}</span>
    </button>

    <!-- Add a talk -->
    <GlassCard class="add">
      <input v-model="url" class="add__input" type="url" placeholder="貼上 YouTube 連結" inputmode="url" />
      <input v-model="title" class="add__input" type="text" placeholder="標題(可留空)" />
      <AppButton variant="accent" block :disabled="!canAdd" @click="onAdd">加入法談</AppButton>
    </GlassCard>

    <p v-if="!store.list.length" class="empty">還沒有法談 · 貼一個講經連結開始</p>

    <!-- Talks -->
    <ul class="talks">
      <li v-for="n in store.list" :key="n.id" class="talk">
        <div class="talk__head" @click="toggle(n.id)">
          <img class="talk__thumb" :src="thumb(n.videoId)" :alt="n.title" referrerpolicy="no-referrer" />
          <div class="talk__meta">
            <p class="talk__title">{{ n.title }}</p>
            <p class="talk__sub tnum">{{ n.marks.length }} 個標記 · {{ fmtDate(n.createdAt) }}</p>
          </div>
          <span class="talk__chev" :class="{ 'talk__chev--open': open[n.id] }">›</span>
        </div>

        <div v-if="open[n.id]" class="talk__body">
          <div class="talk__player">
            <iframe
              :key="`${n.id}-${startOf(n.id)}`"
              :src="playerSrc(n.videoId, startOf(n.id))"
              title="法談"
              allow="autoplay; encrypted-media; picture-in-picture"
              allowfullscreen
              loading="lazy"
            />
          </div>

          <!-- Marks -->
          <ul v-if="n.marks.length" class="marks">
            <li v-for="(m, i) in n.marks" :key="i" class="mark">
              <button class="mark__t tnum" type="button" @click="seek(n.id, m.t)">{{ fmtT(m.t) }}</button>
              <span class="mark__note">{{ m.note }}</span>
              <button class="mark__x" type="button" aria-label="刪除標記" @click="store.removeMark(n.id, i)">✕</button>
            </li>
          </ul>

          <!-- Add a mark -->
          <div class="markadd">
            <input v-model="markTime[n.id]" class="markadd__t tnum" type="text" placeholder="12:30" inputmode="numeric" />
            <input v-model="markNote[n.id]" class="markadd__note" type="text" placeholder="這一刻的感想…" />
            <button class="markadd__go" type="button" :disabled="!canMark(n.id)" @click="onMark(n.id)">標記</button>
          </div>
        </div>
      </li>
    </ul>
  </main>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import GlassCard from 'src/components/GlassCard.vue'
import AppButton from 'src/components/ui/AppButton.vue'
import { useNotesStore } from 'src/stores/notesStore'
import { useStreakStore } from 'src/stores/streakStore'
import { useChime } from 'src/composables/useChime'
import { useToast, describeError } from 'src/composables/useToast'
import { onMounted } from 'vue'

const store = useNotesStore()
const streak = useStreakStore()
const chime = useChime()
const toast = useToast()

const url = ref('')
const title = ref('')
const open = reactive<Record<string, boolean>>({})
const starts = reactive<Record<string, number>>({})
const markTime = reactive<Record<string, string>>({})
const markNote = reactive<Record<string, string>>({})

function extractId(u: string): string | null {
  const s = u.trim()
  const pats = [/[?&]v=([\w-]{11})/, /youtu\.be\/([\w-]{11})/, /embed\/([\w-]{11})/, /shorts\/([\w-]{11})/]
  for (const p of pats) {
    const m = s.match(p)
    if (m) return m[1]
  }
  return /^[\w-]{11}$/.test(s) ? s : null
}
const canAdd = computed(() => !!extractId(url.value))

async function onAdd() {
  const id = extractId(url.value)
  if (!id) return
  try {
    await store.add(url.value, id, title.value)
    url.value = ''
    title.value = ''
  } catch (e) {
    toast.error(describeError(e))
  }
}

function thumb(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`
}
function playerSrc(videoId: string, start: number): string {
  const s = start > 0 ? `&start=${start}&autoplay=1` : ''
  return `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1${s}`
}
function startOf(id: string): number {
  return starts[id] ?? 0
}
function toggle(id: string) {
  open[id] = !open[id]
}
function seek(id: string, t: number) {
  open[id] = true
  starts[id] = t
}

function parseT(s: string): number | null {
  const str = s.trim()
  if (!str) return null
  const parts = str.split(':').map((n) => parseInt(n, 10))
  if (parts.some((n) => Number.isNaN(n) || n < 0)) return null
  return parts.reduce((acc, v) => acc * 60 + v, 0)
}
function fmtT(sec: number): string {
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = sec % 60
  return (h ? `${h}:${String(m).padStart(2, '0')}` : `${m}`) + `:${String(s).padStart(2, '0')}`
}
function canMark(id: string): boolean {
  return parseT(markTime[id] ?? '') !== null && !!(markNote[id] ?? '').trim()
}
async function onMark(id: string) {
  const t = parseT(markTime[id] ?? '')
  if (t === null || !(markNote[id] ?? '').trim()) return
  try {
    await store.addMark(id, t, markNote[id])
    markTime[id] = ''
    markNote[id] = ''
  } catch (e) {
    toast.error(describeError(e))
  }
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('zh-TW', { month: 'long', day: 'numeric' })
}

// 今日已聞法 — a one-a-day check-in that marks the streak like any practice.
function dayKey(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const heardToday = ref((() => {
  try {
    return localStorage.getItem('notes:heard') === dayKey()
  } catch {
    return false
  }
})())
async function checkIn() {
  if (heardToday.value) return
  try {
    localStorage.setItem('notes:heard', dayKey())
  } catch {
    /* storage unavailable */
  }
  heardToday.value = true
  chime.strike(0.6)
  await streak.touchToday()
  toast.info('今日聞法功德 · 已記今日功課 🙏')
}

onMounted(() => {
  store.load()
})
</script>

<style scoped>
.checkin {
  margin-top: var(--s5);
  width: 100%;
  display: flex;
  align-items: center;
  gap: var(--s3);
  padding: var(--s3) var(--s4);
  border-radius: var(--r-lg);
  background: rgba(96, 165, 250, 0.1);
  border: 1px solid rgba(96, 165, 250, 0.3);
  transition: background var(--fast) var(--ease);
}
.checkin--on {
  background: rgba(134, 239, 172, 0.1);
  border-color: rgba(134, 239, 172, 0.4);
}
.checkin__icon {
  font-size: 1.3rem;
}
.checkin__text {
  font-size: var(--text-caption);
  letter-spacing: 0.06em;
  color: var(--text);
}
.checkin--on .checkin__text {
  color: #86efac;
}

.add {
  margin-top: var(--s3);
  display: grid;
  gap: var(--s2);
}
.add__input {
  width: 100%;
  padding: var(--s3);
  border-radius: var(--r-md);
  font-size: var(--text-caption);
  color: var(--text);
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--hairline);
}
.add__input::placeholder {
  color: var(--text-faint);
}

.empty {
  margin-top: var(--s5);
  text-align: center;
  font-size: var(--text-caption);
  color: var(--text-faint);
}

.talks {
  list-style: none;
  margin-top: var(--s4);
  display: grid;
  gap: var(--s3);
}
.talk {
  border-radius: var(--r-lg);
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid var(--hairline);
  overflow: hidden;
}
.talk__head {
  display: flex;
  align-items: center;
  gap: var(--s3);
  padding: var(--s3);
  cursor: pointer;
}
.talk__thumb {
  flex-shrink: 0;
  width: 84px;
  height: 47px;
  object-fit: cover;
  border-radius: var(--r-sm);
  background: rgba(255, 255, 255, 0.06);
}
.talk__meta {
  flex: 1;
  min-width: 0;
}
.talk__title {
  font-size: var(--text-caption);
  letter-spacing: 0.04em;
  line-height: 1.5;
}
.talk__sub {
  margin-top: 3px;
  font-size: var(--text-micro);
  color: var(--text-faint);
}
.talk__chev {
  flex-shrink: 0;
  color: var(--text-faint);
  font-size: 1.2rem;
  transition: transform var(--base) var(--ease);
}
.talk__chev--open {
  transform: rotate(90deg);
}

.talk__body {
  padding: 0 var(--s3) var(--s3);
}
.talk__player {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 9;
  border-radius: var(--r-md);
  overflow: hidden;
  background: #000;
}
.talk__player iframe {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  border: 0;
}

.marks {
  list-style: none;
  margin-top: var(--s3);
  display: grid;
  gap: var(--s2);
}
.mark {
  display: flex;
  align-items: center;
  gap: var(--s2);
}
.mark__t {
  flex-shrink: 0;
  padding: 3px var(--s2);
  border-radius: var(--r-sm);
  font-size: var(--text-micro);
  color: var(--sapphire);
  background: rgba(96, 165, 250, 0.14);
  border: 1px solid rgba(96, 165, 250, 0.3);
}
.mark__note {
  flex: 1;
  min-width: 0;
  font-size: var(--text-caption);
  line-height: 1.5;
  color: var(--text-dim);
}
.mark__x {
  flex-shrink: 0;
  color: var(--text-faint);
  font-size: var(--text-micro);
  padding: 4px;
}

.markadd {
  margin-top: var(--s3);
  display: flex;
  gap: var(--s2);
}
.markadd__t {
  width: 4.5em;
  flex-shrink: 0;
  padding: var(--s2);
  border-radius: var(--r-sm);
  font-size: var(--text-caption);
  text-align: center;
  color: var(--text);
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--hairline);
}
.markadd__note {
  flex: 1;
  min-width: 0;
  padding: var(--s2);
  border-radius: var(--r-sm);
  font-size: var(--text-caption);
  color: var(--text);
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--hairline);
}
.markadd__note::placeholder,
.markadd__t::placeholder {
  color: var(--text-faint);
}
.markadd__go {
  flex-shrink: 0;
  padding: 0 var(--s4);
  border-radius: var(--r-sm);
  font-size: var(--text-caption);
  color: var(--amber);
  background: rgba(251, 191, 36, 0.12);
  border: 1px solid rgba(251, 191, 36, 0.4);
}
.markadd__go:disabled {
  opacity: 0.4;
}
</style>
