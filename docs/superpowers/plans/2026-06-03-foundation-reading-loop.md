# Buddhist Scripture App — Plan 1: Foundation + Core Reading Loop

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Set up the Quasar + Firebase project and implement the core reading loop — browse sutras, read a volume, mark it complete, progress persists to Firestore.

**Architecture:** Quasar (Vue 3 + TypeScript) SPA with Pinia stores and Firebase Firestore for persistence. Bundled short sutras live in `src/data/sutras/`, large sutras are lazy-loaded from Firebase Storage and cached in IndexedDB. Glassmorphism design system via CSS custom properties applied to Quasar components.

**Tech Stack:** Quasar CLI v2, Vue 3, TypeScript, Pinia, Firebase v9+ (modular), idb (IndexedDB wrapper), Vitest

---

## File Map

```
src/
  boot/
    firebase.ts           — Firebase app init, export db + storage
  css/
    glass.scss            — Glassmorphism CSS variables + utility classes
  types/
    sutra.ts              — SutraIndex, SutraVolume, ProgressRecord types
  data/
    sutras/
      heart-sutra.json    — 心經 full text (bundled)
    meta/
      sutras-index.json   — list of all sutras + storage type (bundled/remote)
  services/
    sutraService.ts       — load volume: bundled JSON or Firebase Storage + IndexedDB cache
    progressService.ts    — Firestore CRUD for /progress collection
  stores/
    progressStore.ts      — Pinia store: volume counts, completion state
  layouts/
    MainLayout.vue        — bottom tab bar (今日/誦讀/練習/收藏/更多)
  pages/
    HomePage.vue          — today's dashboard, recent progress
    LibraryPage.vue       — sutra browser, select sutra + volume
    ReaderPage.vue        — vertical text reader, mark complete button
    CollectionPage.vue    — placeholder (Plan 2)
    PracticePage.vue      — placeholder (Plan 3)
    MorePage.vue          — placeholder (Plan 4)
  components/
    GlassCard.vue         — reusable glassmorphism card wrapper
    ProgressRing.vue      — circular SVG progress indicator
  router/
    index.ts              — route definitions
tests/
  services/
    progressService.test.ts
  stores/
    progressStore.test.ts
```

---

### Task 1: Scaffold Quasar Project + Install Dependencies

**Files:** project root scaffold

- [ ] **Step 1: Create Quasar project in current directory**

```bash
npm init quasar@latest .
```

When the CLI prompts, choose:
- Project type: `App with Quasar CLI`
- Vue version: `Vue 3`
- TypeScript: `Yes`
- Quasar App CLI: `Vite`
- Package name: `buddhist-scripture-app`
- Features: check `PWA`, `Pinia`, `Vue Router`
- CSS preprocessor: `SCSS`
- ESLint: `Yes`

- [ ] **Step 2: Install additional dependencies**

```bash
npm install firebase idb
npm install @vueuse/core @vueuse/motion
```

- [ ] **Step 3: Add Vitest unit testing extension**

```bash
npx quasar ext add @quasar/testing-unit-vitest
```

Accept all defaults.

- [ ] **Step 4: Verify dev server starts**

```bash
npx quasar dev
```

Expected output: `App running at: http://localhost:9000`  
Open browser — default Quasar welcome page visible, no console errors.

- [ ] **Step 5: Commit**

```bash
git add .
git commit -m "chore: scaffold Quasar project with Firebase, Pinia, PWA"
```

---

### Task 2: Firebase Configuration + Boot File

**Files:**
- Create: `.env` (gitignored)
- Create: `.env.example`
- Create: `src/boot/firebase.ts`
- Modify: `quasar.config.ts` (register boot file)

- [ ] **Step 1: Create a Firebase project**

Go to https://console.firebase.google.com → New project → name it `buddhist-app`.  
Enable **Firestore Database** (start in test mode).  
Enable **Storage** (start in test mode).  
Add a **Web app** → copy the config values.

- [ ] **Step 2: Create `.env` file with your Firebase config**

```bash
# .env  (never commit this file)
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

- [ ] **Step 3: Create `.env.example` (safe to commit)**

```bash
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

- [ ] **Step 4: Add `.env` to `.gitignore`**

```bash
echo ".env" >> .gitignore
```

- [ ] **Step 5: Write `src/boot/firebase.ts`**

```typescript
import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'
import { boot } from 'quasar/wrappers'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

const app = initializeApp(firebaseConfig)
export const db = getFirestore(app)
export const storage = getStorage(app)

export default boot(() => {
  // Firebase is initialized; db and storage are exported for use in services
})
```

- [ ] **Step 6: Register boot file in `quasar.config.ts`**

Find the `boot` array and add `'firebase'`:

```typescript
boot: ['firebase'],
```

- [ ] **Step 7: Verify app still starts**

```bash
npx quasar dev
```

Expected: no console errors, app loads normally.

- [ ] **Step 8: Commit**

```bash
git add src/boot/firebase.ts .env.example quasar.config.ts .gitignore
git commit -m "chore: add Firebase boot file and env config"
```

---

### Task 3: TypeScript Type Definitions

**Files:**
- Create: `src/types/sutra.ts`

- [ ] **Step 1: Write `src/types/sutra.ts`**

```typescript
export interface SutraIndexEntry {
  id: string              // e.g. 'avatamsaka', 'heart-sutra'
  titleZh: string         // 華嚴經
  titleEn: string         // Avatamsaka Sutra
  totalVolumes: number    // 80
  storageType: 'bundled' | 'remote'
  description: string
}

export interface ZhuyinChar {
  char: string            // 大
  yin: string             // ㄉㄚˋ
}

export interface SutraBlock {
  type: 'heading' | 'paragraph' | 'verse'
  text: string
  zhuyin?: ZhuyinChar[]
}

export interface SutraVolume {
  sutraId: string
  volumeId: string        // '001', '002', ...
  titleZh: string         // 大方廣佛華嚴經卷第一
  blocks: SutraBlock[]
}

export interface VolumeProgress {
  count: number           // times recited
  lastRead: string        // ISO timestamp
}

export interface SutraProgress {
  sutraId: string
  volumes: Record<string, VolumeProgress>  // volumeId → progress
  totalCompleted: number  // volumes with count >= 1
  isFullyComplete: boolean
  completedAt?: string
}
```

- [ ] **Step 2: Commit**

```bash
git add src/types/sutra.ts
git commit -m "chore: add TypeScript type definitions for sutras and progress"
```

---

### Task 4: Glassmorphism Design System

**Files:**
- Create: `src/css/glass.scss`
- Modify: `src/css/app.scss` (import glass.scss)
- Create: `src/components/GlassCard.vue`
- Create: `src/components/ProgressRing.vue`

- [ ] **Step 1: Write `src/css/glass.scss`**

```scss
:root {
  // Base colors
  --bg-deep: #0a0a1a;
  --bg-surface: rgba(255, 255, 255, 0.06);
  --bg-surface-hover: rgba(255, 255, 255, 0.10);

  // Glass effect
  --glass-blur: 20px;
  --glass-border: 1px solid rgba(255, 255, 255, 0.12);
  --glass-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);

  // Gem accent colors
  --gem-amethyst: #9b59b6;
  --gem-sapphire: #2980b9;
  --gem-emerald: #27ae60;
  --gem-ruby: #c0392b;
  --gem-amber: #f39c12;
  --gem-aqua: #16a085;

  // Text
  --text-primary: rgba(255, 255, 255, 0.92);
  --text-secondary: rgba(255, 255, 255, 0.55);

  // Spacing
  --radius-card: 16px;
  --radius-sm: 8px;
}

body {
  background: var(--bg-deep);
  background-image:
    radial-gradient(ellipse at 20% 20%, rgba(155, 89, 182, 0.15) 0%, transparent 50%),
    radial-gradient(ellipse at 80% 80%, rgba(41, 128, 185, 0.12) 0%, transparent 50%);
  min-height: 100vh;
  color: var(--text-primary);
}

.glass {
  background: var(--bg-surface);
  backdrop-filter: blur(var(--glass-blur));
  -webkit-backdrop-filter: blur(var(--glass-blur));
  border: var(--glass-border);
  border-radius: var(--radius-card);
  box-shadow: var(--glass-shadow);
}

.glass-hover {
  transition: background 0.2s ease;
  &:hover {
    background: var(--bg-surface-hover);
  }
}

.text-primary { color: var(--text-primary); }
.text-secondary { color: var(--text-secondary); }
```

- [ ] **Step 2: Import in `src/css/app.scss`**

Add at the top of `src/css/app.scss`:

```scss
@import './glass.scss';
```

- [ ] **Step 3: Write `src/components/GlassCard.vue`**

```vue
<template>
  <div class="glass glass-card" :class="{ 'glass-hover': hoverable }">
    <slot />
  </div>
</template>

<script setup lang="ts">
defineProps<{ hoverable?: boolean }>()
</script>

<style scoped>
.glass-card {
  padding: 16px;
  color: var(--text-primary);
}
</style>
```

- [ ] **Step 4: Write `src/components/ProgressRing.vue`**

```vue
<template>
  <svg :width="size" :height="size" :viewBox="`0 0 ${size} ${size}`">
    <circle
      :cx="center" :cy="center" :r="radius"
      fill="none"
      stroke="rgba(255,255,255,0.1)"
      :stroke-width="strokeWidth"
    />
    <circle
      :cx="center" :cy="center" :r="radius"
      fill="none"
      :stroke="color"
      :stroke-width="strokeWidth"
      stroke-linecap="round"
      :stroke-dasharray="circumference"
      :stroke-dashoffset="dashOffset"
      transform="rotate(-90)"
      :transform-origin="`${center} ${center}`"
      style="transition: stroke-dashoffset 0.5s ease"
    />
    <text
      :x="center" :y="center + 5"
      text-anchor="middle"
      fill="var(--text-primary)"
      font-size="12"
    >{{ label }}</text>
  </svg>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  value: number     // 0–1
  size?: number
  strokeWidth?: number
  color?: string
  label?: string
}>()

const size = computed(() => props.size ?? 80)
const strokeWidth = computed(() => props.strokeWidth ?? 6)
const color = computed(() => props.color ?? 'var(--gem-amethyst)')
const center = computed(() => size.value / 2)
const radius = computed(() => center.value - strokeWidth.value)
const circumference = computed(() => 2 * Math.PI * radius.value)
const dashOffset = computed(() => circumference.value * (1 - (props.value ?? 0)))
const label = computed(() => props.label ?? `${Math.round((props.value ?? 0) * 100)}%`)
</script>
```

- [ ] **Step 5: Verify styles apply — update `src/pages/IndexPage.vue` temporarily**

Replace its template with:

```vue
<template>
  <q-page class="q-pa-md">
    <GlassCard hoverable>
      <div class="text-h6">Design System Test</div>
      <div class="text-secondary">Glassmorphism card working</div>
      <ProgressRing :value="0.6" label="60%" class="q-mt-sm" />
    </GlassCard>
  </q-page>
</template>

<script setup lang="ts">
import GlassCard from 'src/components/GlassCard.vue'
import ProgressRing from 'src/components/ProgressRing.vue'
</script>
```

Run `npx quasar dev`. Expected: dark background with gradient, glass card with blur visible, purple progress ring showing 60%.

- [ ] **Step 6: Commit**

```bash
git add src/css/ src/components/GlassCard.vue src/components/ProgressRing.vue src/pages/IndexPage.vue
git commit -m "feat: add glassmorphism design system and base components"
```

---

### Task 5: Router + MainLayout (Bottom Tab Navigation)

**Files:**
- Modify: `src/router/routes.ts`
- Modify: `src/layouts/MainLayout.vue`
- Create: `src/pages/HomePage.vue` (stub)
- Create: `src/pages/LibraryPage.vue` (stub)
- Create: `src/pages/ReaderPage.vue` (stub)
- Create: `src/pages/CollectionPage.vue` (stub)
- Create: `src/pages/PracticePage.vue` (stub)
- Create: `src/pages/MorePage.vue` (stub)

- [ ] **Step 1: Write route definitions in `src/router/routes.ts`**

```typescript
import type { RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: () => import('layouts/MainLayout.vue'),
    children: [
      { path: '', component: () => import('pages/HomePage.vue') },
      { path: 'library', component: () => import('pages/LibraryPage.vue') },
      {
        path: 'reader/:sutraId/:volumeId',
        component: () => import('pages/ReaderPage.vue'),
      },
      { path: 'practice', component: () => import('pages/PracticePage.vue') },
      { path: 'collection', component: () => import('pages/CollectionPage.vue') },
      { path: 'more', component: () => import('pages/MorePage.vue') },
    ],
  },
  {
    path: '/:catchAll(.*)*',
    component: () => import('pages/ErrorNotFound.vue'),
  },
]

export default routes
```

- [ ] **Step 2: Write `src/layouts/MainLayout.vue`**

```vue
<template>
  <q-layout view="lHh lpr lFf">
    <q-page-container>
      <router-view />
    </q-page-container>

    <q-footer>
      <q-tabs
        v-model="activeTab"
        class="glass"
        dense
        active-color="white"
        indicator-color="transparent"
        style="border-top: var(--glass-border)"
      >
        <q-route-tab name="home" to="/" exact icon="home" label="今日" />
        <q-route-tab name="library" to="/library" icon="menu_book" label="誦讀" />
        <q-route-tab name="practice" to="/practice" icon="psychology" label="練習" />
        <q-route-tab name="collection" to="/collection" icon="diamond" label="收藏" />
        <q-route-tab name="more" to="/more" icon="more_horiz" label="更多" />
      </q-tabs>
    </q-footer>
  </q-layout>
</template>

<script setup lang="ts">
import { ref } from 'vue'
const activeTab = ref('home')
</script>

<style scoped>
.q-footer {
  background: transparent;
}
</style>
```

- [ ] **Step 3: Create stub pages**

`src/pages/HomePage.vue`:
```vue
<template>
  <q-page class="q-pa-md">
    <div class="text-h5 text-primary q-mb-md">今日</div>
  </q-page>
</template>
```

`src/pages/LibraryPage.vue`:
```vue
<template>
  <q-page class="q-pa-md">
    <div class="text-h5 text-primary q-mb-md">經文庫</div>
  </q-page>
</template>
```

`src/pages/ReaderPage.vue`:
```vue
<template>
  <q-page class="q-pa-md">
    <div class="text-h5 text-primary">誦讀</div>
  </q-page>
</template>
```

`src/pages/CollectionPage.vue`:
```vue
<template>
  <q-page class="q-pa-md">
    <div class="text-h5 text-primary">收藏室</div>
    <div class="text-secondary q-mt-sm">Coming in Plan 2</div>
  </q-page>
</template>
```

`src/pages/PracticePage.vue`:
```vue
<template>
  <q-page class="q-pa-md">
    <div class="text-h5 text-primary">練習</div>
    <div class="text-secondary q-mt-sm">Coming in Plan 3</div>
  </q-page>
</template>
```

`src/pages/MorePage.vue`:
```vue
<template>
  <q-page class="q-pa-md">
    <div class="text-h5 text-primary">更多</div>
    <div class="text-secondary q-mt-sm">Coming in Plan 4</div>
  </q-page>
</template>
```

- [ ] **Step 4: Run dev and verify all tabs navigate correctly**

```bash
npx quasar dev
```

Expected: bottom tab bar visible, clicking each tab shows the correct stub page, no 404s.

- [ ] **Step 5: Commit**

```bash
git add src/router/ src/layouts/ src/pages/
git commit -m "feat: add router and bottom tab navigation layout"
```

---

### Task 6: Sutra Data Files

**Files:**
- Create: `src/data/meta/sutras-index.json`
- Create: `src/data/sutras/heart-sutra.json`

- [ ] **Step 1: Write `src/data/meta/sutras-index.json`**

```json
[
  {
    "id": "heart-sutra",
    "titleZh": "般若波羅蜜多心經",
    "titleEn": "Heart Sutra",
    "totalVolumes": 1,
    "storageType": "bundled",
    "description": "最廣為流傳的般若經典，共260字。"
  },
  {
    "id": "avatamsaka",
    "titleZh": "大方廣佛華嚴經",
    "titleEn": "Avatamsaka Sutra",
    "totalVolumes": 80,
    "storageType": "remote",
    "description": "佛教重要經典，共八十卷，對應八十八佛與八十八星座。"
  },
  {
    "id": "ksitigarbha",
    "titleZh": "地藏菩薩本願經",
    "titleEn": "Ksitigarbha Sutra",
    "totalVolumes": 3,
    "storageType": "remote",
    "description": "宣說地藏菩薩本願的重要經典。"
  }
]
```

- [ ] **Step 2: Write `src/data/sutras/heart-sutra.json`**

```json
{
  "sutraId": "heart-sutra",
  "volumeId": "001",
  "titleZh": "般若波羅蜜多心經",
  "blocks": [
    {
      "type": "heading",
      "text": "般若波羅蜜多心經"
    },
    {
      "type": "paragraph",
      "text": "觀自在菩薩，行深般若波羅蜜多時，照見五蘊皆空，度一切苦厄。"
    },
    {
      "type": "paragraph",
      "text": "舍利子，色不異空，空不異色，色即是空，空即是色，受想行識，亦復如是。"
    },
    {
      "type": "paragraph",
      "text": "舍利子，是諸法空相，不生不滅，不垢不淨，不增不減。"
    },
    {
      "type": "paragraph",
      "text": "是故空中無色，無受想行識，無眼耳鼻舌身意，無色聲香味觸法，無眼界，乃至無意識界。"
    },
    {
      "type": "paragraph",
      "text": "無無明，亦無無明盡，乃至無老死，亦無老死盡。無苦集滅道，無智亦無得。"
    },
    {
      "type": "paragraph",
      "text": "以無所得故，菩提薩埵，依般若波羅蜜多故，心無罣礙，無罣礙故，無有恐怖，遠離顛倒夢想，究竟涅槃。"
    },
    {
      "type": "paragraph",
      "text": "三世諸佛，依般若波羅蜜多故，得阿耨多羅三藐三菩提。"
    },
    {
      "type": "paragraph",
      "text": "故知般若波羅蜜多，是大神咒，是大明咒，是無上咒，是無等等咒，能除一切苦，真實不虛。"
    },
    {
      "type": "verse",
      "text": "故說般若波羅蜜多咒，即說咒曰：揭諦揭諦，波羅揭諦，波羅僧揭諦，菩提薩婆訶。"
    }
  ]
}
```

- [ ] **Step 3: Commit**

```bash
git add src/data/
git commit -m "feat: add sutra index metadata and Heart Sutra bundled data"
```

---

### Task 7: SutraService (Bundled + Firebase Storage + IndexedDB Cache)

**Files:**
- Create: `src/services/cacheService.ts`
- Create: `src/services/sutraService.ts`

- [ ] **Step 1: Write `src/services/cacheService.ts`**

Uses `idb` to cache remote sutra volumes in IndexedDB after first load.

```typescript
import { openDB } from 'idb'
import type { SutraVolume } from 'src/types/sutra'

const DB_NAME = 'sutra-cache'
const STORE = 'volumes'

async function getDB() {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      db.createObjectStore(STORE)
    },
  })
}

export async function getCachedVolume(key: string): Promise<SutraVolume | undefined> {
  const db = await getDB()
  return db.get(STORE, key)
}

export async function setCachedVolume(key: string, volume: SutraVolume): Promise<void> {
  const db = await getDB()
  await db.put(STORE, volume, key)
}
```

- [ ] **Step 2: Write `src/services/sutraService.ts`**

```typescript
import { ref as storageRef, getDownloadURL } from 'firebase/storage'
import { storage } from 'src/boot/firebase'
import type { SutraIndexEntry, SutraVolume } from 'src/types/sutra'
import { getCachedVolume, setCachedVolume } from './cacheService'
import sutraIndex from 'src/data/meta/sutras-index.json'

export function getAllSutras(): SutraIndexEntry[] {
  return sutraIndex as SutraIndexEntry[]
}

export function getSutraMeta(sutraId: string): SutraIndexEntry | undefined {
  return (sutraIndex as SutraIndexEntry[]).find((s) => s.id === sutraId)
}

async function loadBundledVolume(sutraId: string, volumeId: string): Promise<SutraVolume> {
  // Dynamic import of bundled JSON files
  const module = await import(`src/data/sutras/${sutraId}.json`)
  return module.default as SutraVolume
}

async function loadRemoteVolume(sutraId: string, volumeId: string): Promise<SutraVolume> {
  const cacheKey = `${sutraId}/${volumeId}`
  const cached = await getCachedVolume(cacheKey)
  if (cached) return cached

  const fileRef = storageRef(storage, `sutras/${sutraId}/volume-${volumeId}.json`)
  const url = await getDownloadURL(fileRef)
  const response = await fetch(url)
  const volume = (await response.json()) as SutraVolume

  await setCachedVolume(cacheKey, volume)
  return volume
}

export async function loadVolume(sutraId: string, volumeId: string): Promise<SutraVolume> {
  const meta = getSutraMeta(sutraId)
  if (!meta) throw new Error(`Unknown sutra: ${sutraId}`)

  if (meta.storageType === 'bundled') {
    return loadBundledVolume(sutraId, volumeId)
  }
  return loadRemoteVolume(sutraId, volumeId)
}

export function formatVolumeId(num: number): string {
  return String(num).padStart(3, '0')
}
```

- [ ] **Step 3: Commit**

```bash
git add src/services/
git commit -m "feat: add SutraService with bundled load and Firebase Storage + IndexedDB cache"
```

---

### Task 8: ProgressService (Firestore CRUD)

**Files:**
- Create: `src/services/progressService.ts`
- Create: `tests/services/progressService.test.ts`

- [ ] **Step 1: Write `src/services/progressService.ts`**

```typescript
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
} from 'firebase/firestore'
import { db } from 'src/boot/firebase'
import type { SutraProgress, VolumeProgress } from 'src/types/sutra'

function progressRef(sutraId: string) {
  return doc(db, 'progress', sutraId)
}

export async function getProgress(sutraId: string): Promise<SutraProgress | null> {
  const snap = await getDoc(progressRef(sutraId))
  return snap.exists() ? (snap.data() as SutraProgress) : null
}

export async function recordRecitation(
  sutraId: string,
  volumeId: string,
  totalVolumes: number,
): Promise<SutraProgress> {
  const existing = await getProgress(sutraId)
  const now = new Date().toISOString()

  const prevVolume: VolumeProgress = existing?.volumes?.[volumeId] ?? { count: 0, lastRead: now }
  const updatedVolume: VolumeProgress = {
    count: prevVolume.count + 1,
    lastRead: now,
  }

  const volumes = { ...(existing?.volumes ?? {}), [volumeId]: updatedVolume }
  const totalCompleted = Object.values(volumes).filter((v) => v.count >= 1).length
  const isFullyComplete = totalCompleted >= totalVolumes

  const progress: SutraProgress = {
    sutraId,
    volumes,
    totalCompleted,
    isFullyComplete,
    ...(isFullyComplete && !existing?.isFullyComplete ? { completedAt: now } : {}),
  }

  await setDoc(progressRef(sutraId), progress)
  return progress
}
```

- [ ] **Step 2: Write `tests/services/progressService.test.ts`**

This test uses a mock for Firebase so no real DB connection is needed.

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Firebase modules before importing the service
vi.mock('firebase/firestore', () => ({
  doc: vi.fn(() => ({})),
  getDoc: vi.fn(),
  setDoc: vi.fn(),
  updateDoc: vi.fn(),
}))
vi.mock('src/boot/firebase', () => ({ db: {} }))

import { getDoc, setDoc } from 'firebase/firestore'
import { getProgress, recordRecitation } from 'src/services/progressService'
import type { SutraProgress } from 'src/types/sutra'

describe('progressService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('recordRecitation', () => {
    it('creates new progress when none exists', async () => {
      vi.mocked(getDoc).mockResolvedValueOnce({ exists: () => false } as any)
      vi.mocked(setDoc).mockResolvedValueOnce(undefined)

      const result = await recordRecitation('heart-sutra', '001', 1)

      expect(result.volumes['001'].count).toBe(1)
      expect(result.totalCompleted).toBe(1)
      expect(result.isFullyComplete).toBe(true)
      expect(setDoc).toHaveBeenCalledOnce()
    })

    it('increments count on repeat recitation', async () => {
      const existing: SutraProgress = {
        sutraId: 'heart-sutra',
        volumes: { '001': { count: 2, lastRead: '2026-01-01T00:00:00.000Z' } },
        totalCompleted: 1,
        isFullyComplete: true,
      }
      vi.mocked(getDoc).mockResolvedValueOnce({ exists: () => true, data: () => existing } as any)
      vi.mocked(setDoc).mockResolvedValueOnce(undefined)

      const result = await recordRecitation('heart-sutra', '001', 1)

      expect(result.volumes['001'].count).toBe(3)
      expect(result.isFullyComplete).toBe(true)
    })

    it('sets isFullyComplete when all volumes done', async () => {
      const existing: SutraProgress = {
        sutraId: 'avatamsaka',
        volumes: { '001': { count: 1, lastRead: '2026-01-01T00:00:00.000Z' } },
        totalCompleted: 1,
        isFullyComplete: false,
      }
      vi.mocked(getDoc).mockResolvedValueOnce({ exists: () => true, data: () => existing } as any)
      vi.mocked(setDoc).mockResolvedValueOnce(undefined)

      // Completing volume 002 of a 2-volume sutra
      const result = await recordRecitation('avatamsaka', '002', 2)

      expect(result.totalCompleted).toBe(2)
      expect(result.isFullyComplete).toBe(true)
      expect(result.completedAt).toBeDefined()
    })
  })
})
```

- [ ] **Step 3: Run tests and verify they pass**

```bash
npx vitest run tests/services/progressService.test.ts
```

Expected output:
```
✓ progressService > recordRecitation > creates new progress when none exists
✓ progressService > recordRecitation > increments count on repeat recitation
✓ progressService > recordRecitation > sets isFullyComplete when all volumes done

Test Files  1 passed (1)
Tests       3 passed (3)
```

- [ ] **Step 4: Commit**

```bash
git add src/services/progressService.ts tests/services/progressService.test.ts
git commit -m "feat: add ProgressService with Firestore CRUD and unit tests"
```

---

### Task 9: progressStore (Pinia)

**Files:**
- Create: `src/stores/progressStore.ts`
- Create: `tests/stores/progressStore.test.ts`

- [ ] **Step 1: Write `src/stores/progressStore.ts`**

```typescript
import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { SutraProgress } from 'src/types/sutra'
import { getProgress, recordRecitation } from 'src/services/progressService'
import { getAllSutras } from 'src/services/sutraService'

export const useProgressStore = defineStore('progress', () => {
  const progressMap = ref<Record<string, SutraProgress>>({})
  const loading = ref(false)

  async function loadProgress(sutraId: string): Promise<void> {
    const data = await getProgress(sutraId)
    if (data) {
      progressMap.value[sutraId] = data
    }
  }

  async function loadAllProgress(): Promise<void> {
    loading.value = true
    const sutras = getAllSutras()
    await Promise.all(sutras.map((s) => loadProgress(s.id)))
    loading.value = false
  }

  async function markVolumeComplete(sutraId: string, volumeId: string): Promise<SutraProgress> {
    const meta = getAllSutras().find((s) => s.id === sutraId)
    if (!meta) throw new Error(`Unknown sutra: ${sutraId}`)

    const updated = await recordRecitation(sutraId, volumeId, meta.totalVolumes)
    progressMap.value[sutraId] = updated
    return updated
  }

  function getVolumeCount(sutraId: string, volumeId: string): number {
    return progressMap.value[sutraId]?.volumes?.[volumeId]?.count ?? 0
  }

  function getSutraCompletionRatio(sutraId: string): number {
    const meta = getAllSutras().find((s) => s.id === sutraId)
    if (!meta || meta.totalVolumes === 0) return 0
    const completed = progressMap.value[sutraId]?.totalCompleted ?? 0
    return completed / meta.totalVolumes
  }

  return {
    progressMap,
    loading,
    loadProgress,
    loadAllProgress,
    markVolumeComplete,
    getVolumeCount,
    getSutraCompletionRatio,
  }
})
```

- [ ] **Step 2: Write `tests/stores/progressStore.test.ts`**

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

vi.mock('src/services/progressService', () => ({
  getProgress: vi.fn(),
  recordRecitation: vi.fn(),
}))

vi.mock('src/services/sutraService', () => ({
  getAllSutras: vi.fn(() => [
    { id: 'heart-sutra', titleZh: '心經', totalVolumes: 1, storageType: 'bundled', titleEn: '', description: '' },
    { id: 'avatamsaka', titleZh: '華嚴經', totalVolumes: 80, storageType: 'remote', titleEn: '', description: '' },
  ]),
}))

import { getProgress, recordRecitation } from 'src/services/progressService'
import { useProgressStore } from 'src/stores/progressStore'

describe('progressStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('getSutraCompletionRatio returns 0 when no progress loaded', () => {
    const store = useProgressStore()
    expect(store.getSutraCompletionRatio('avatamsaka')).toBe(0)
  })

  it('getVolumeCount returns 0 for unknown volume', () => {
    const store = useProgressStore()
    expect(store.getVolumeCount('avatamsaka', '001')).toBe(0)
  })

  it('markVolumeComplete updates progressMap', async () => {
    const updated = {
      sutraId: 'heart-sutra',
      volumes: { '001': { count: 1, lastRead: '2026-06-03T00:00:00.000Z' } },
      totalCompleted: 1,
      isFullyComplete: true,
    }
    vi.mocked(recordRecitation).mockResolvedValueOnce(updated)

    const store = useProgressStore()
    await store.markVolumeComplete('heart-sutra', '001')

    expect(store.getVolumeCount('heart-sutra', '001')).toBe(1)
    expect(store.getSutraCompletionRatio('heart-sutra')).toBe(1)
  })
})
```

- [ ] **Step 3: Run tests**

```bash
npx vitest run tests/stores/progressStore.test.ts
```

Expected:
```
✓ progressStore > getSutraCompletionRatio returns 0 when no progress loaded
✓ progressStore > getVolumeCount returns 0 for unknown volume
✓ progressStore > markVolumeComplete updates progressMap

Test Files  1 passed (1)
Tests       3 passed (3)
```

- [ ] **Step 4: Commit**

```bash
git add src/stores/progressStore.ts tests/stores/progressStore.test.ts
git commit -m "feat: add progressStore with Pinia and unit tests"
```

---

### Task 10: Library Page (Sutra Browser)

**Files:**
- Modify: `src/pages/LibraryPage.vue`

- [ ] **Step 1: Write `src/pages/LibraryPage.vue`**

```vue
<template>
  <q-page class="q-pa-md">
    <div class="text-h5 text-primary q-mb-lg">經文庫</div>

    <div class="q-gutter-md">
      <GlassCard
        v-for="sutra in sutras"
        :key="sutra.id"
        hoverable
        class="cursor-pointer"
        @click="openSutra(sutra.id)"
      >
        <div class="row items-center no-wrap">
          <div class="col">
            <div class="text-subtitle1 text-primary">{{ sutra.titleZh }}</div>
            <div class="text-caption text-secondary q-mt-xs">{{ sutra.description }}</div>
            <div class="text-caption text-secondary q-mt-xs">
              共 {{ sutra.totalVolumes }} 卷 ·
              已完成 {{ completedVolumes(sutra.id) }} / {{ sutra.totalVolumes }}
            </div>
          </div>
          <ProgressRing
            :value="progressStore.getSutraCompletionRatio(sutra.id)"
            :size="56"
            :stroke-width="5"
            :label="`${completedVolumes(sutra.id)}`"
            class="q-ml-md"
          />
        </div>
      </GlassCard>
    </div>

    <!-- Volume selector dialog -->
    <q-dialog v-model="showVolumeDialog">
      <q-card class="glass" style="min-width: 300px">
        <q-card-section>
          <div class="text-h6 text-primary">選擇卷數</div>
          <div class="text-caption text-secondary">{{ selectedSutraMeta?.titleZh }}</div>
        </q-card-section>
        <q-card-section class="q-pt-none" style="max-height: 50vh; overflow-y: auto">
          <q-list>
            <q-item
              v-for="vol in volumeList"
              :key="vol.id"
              clickable
              @click="goToReader(vol.id)"
              class="rounded-borders q-mb-xs"
            >
              <q-item-section>
                <q-item-label class="text-primary">第 {{ vol.num }} 卷</q-item-label>
              </q-item-section>
              <q-item-section side>
                <q-badge
                  v-if="progressStore.getVolumeCount(selectedSutraId, vol.id) > 0"
                  :label="`×${progressStore.getVolumeCount(selectedSutraId, vol.id)}`"
                  color="purple"
                />
              </q-item-section>
            </q-item>
          </q-list>
        </q-card-section>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import GlassCard from 'src/components/GlassCard.vue'
import ProgressRing from 'src/components/ProgressRing.vue'
import { useProgressStore } from 'src/stores/progressStore'
import { getAllSutras, getSutraMeta, formatVolumeId } from 'src/services/sutraService'

const router = useRouter()
const progressStore = useProgressStore()

const sutras = getAllSutras()
const showVolumeDialog = ref(false)
const selectedSutraId = ref('')

const selectedSutraMeta = computed(() => getSutraMeta(selectedSutraId.value))

const volumeList = computed(() => {
  const meta = selectedSutraMeta.value
  if (!meta) return []
  return Array.from({ length: meta.totalVolumes }, (_, i) => ({
    num: i + 1,
    id: formatVolumeId(i + 1),
  }))
})

function completedVolumes(sutraId: string): number {
  return progressStore.progressMap[sutraId]?.totalCompleted ?? 0
}

function openSutra(sutraId: string) {
  selectedSutraId.value = sutraId
  showVolumeDialog.value = true
}

function goToReader(volumeId: string) {
  showVolumeDialog.value = false
  router.push(`/reader/${selectedSutraId.value}/${volumeId}`)
}

onMounted(() => {
  progressStore.loadAllProgress()
})
</script>
```

- [ ] **Step 2: Run dev and verify**

```bash
npx quasar dev
```

Navigate to 誦讀 tab. Expected: list of sutras with progress rings, clicking a sutra opens a volume selector dialog.

- [ ] **Step 3: Commit**

```bash
git add src/pages/LibraryPage.vue
git commit -m "feat: add Library page with sutra browser and volume selector"
```

---

### Task 11: Reader Page (Vertical Text + Mark Complete)

**Files:**
- Modify: `src/pages/ReaderPage.vue`

- [ ] **Step 1: Write `src/pages/ReaderPage.vue`**

```vue
<template>
  <q-page>
    <!-- Header -->
    <q-bar class="glass" style="position: sticky; top: 0; z-index: 10">
      <q-btn flat round icon="arrow_back" color="white" @click="$router.back()" />
      <div class="text-subtitle1 text-primary q-ml-sm">{{ volume?.titleZh ?? '載入中...' }}</div>
      <q-space />
      <q-btn
        v-if="volume"
        flat round
        :icon="recitedThisSession ? 'check_circle' : 'check_circle_outline'"
        :color="recitedThisSession ? 'green-4' : 'white'"
        @click="markComplete"
        :loading="saving"
      />
    </q-bar>

    <!-- Loading state -->
    <div v-if="loading" class="flex flex-center q-pa-xl">
      <q-spinner-dots size="50px" color="purple-4" />
    </div>

    <!-- Vertical text content -->
    <div v-else-if="volume" class="reader-container q-pa-lg">
      <div class="vertical-text-wrapper">
        <template v-for="(block, i) in volume.blocks" :key="i">
          <div
            :class="[
              'text-block',
              `text-block--${block.type}`,
            ]"
          >
            {{ block.text }}
          </div>
        </template>
      </div>
    </div>

    <!-- Complete notification -->
    <q-dialog v-model="showCompleteDialog">
      <q-card class="glass text-center q-pa-lg">
        <q-icon name="auto_awesome" color="amber-4" size="48px" />
        <div class="text-h6 text-primary q-mt-sm">回向完成</div>
        <div class="text-secondary q-mt-xs">
          第 {{ route.params.volumeId }} 卷已記錄<br />
          累計誦讀 {{ newCount }} 遍
        </div>
        <q-btn
          flat class="q-mt-md" color="purple-3" label="繼續"
          @click="showCompleteDialog = false"
        />
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { loadVolume } from 'src/services/sutraService'
import { useProgressStore } from 'src/stores/progressStore'
import type { SutraVolume } from 'src/types/sutra'

const route = useRoute()
const progressStore = useProgressStore()

const sutraId = route.params.sutraId as string
const volumeId = route.params.volumeId as string

const volume = ref<SutraVolume | null>(null)
const loading = ref(true)
const saving = ref(false)
const recitedThisSession = ref(false)
const showCompleteDialog = ref(false)
const newCount = ref(0)

onMounted(async () => {
  try {
    volume.value = await loadVolume(sutraId, volumeId)
  } finally {
    loading.value = false
  }
})

async function markComplete() {
  if (saving.value) return
  saving.value = true
  try {
    const updated = await progressStore.markVolumeComplete(sutraId, volumeId)
    newCount.value = updated.volumes[volumeId]?.count ?? 1
    recitedThisSession.value = true
    showCompleteDialog.value = true
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.reader-container {
  min-height: calc(100vh - 50px);
  overflow-x: auto;
}

.vertical-text-wrapper {
  writing-mode: vertical-rl;
  text-orientation: mixed;
  height: calc(100vh - 120px);
  display: flex;
  flex-direction: row-reverse;
  gap: 1.5rem;
  font-size: 18px;
  line-height: 2;
  color: var(--text-primary);
  font-family: 'Noto Serif TC', 'Noto Serif CJK TC', serif;
}

.text-block {
  white-space: pre-wrap;
}

.text-block--heading {
  font-weight: bold;
  font-size: 20px;
  color: var(--gem-amber);
}

.text-block--verse {
  color: var(--gem-amethyst);
}
</style>
```

- [ ] **Step 2: Add Noto Serif TC font to `index.html`**

Find `index.html` in the project root and add inside `<head>`:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Noto+Serif+TC:wght@400;700&display=swap" rel="stylesheet">
```

- [ ] **Step 3: Run dev and test reading flow**

```bash
npx quasar dev
```

Navigate: 誦讀 → 般若波羅蜜多心經 → 第 1 卷.  
Expected: vertical Chinese text, scroll horizontally to read more, tap checkmark → dialog shows recitation count.  
Check Firebase Console → Firestore → `progress/heart-sutra` document created with `volumes.001.count: 1`.

- [ ] **Step 4: Commit**

```bash
git add src/pages/ReaderPage.vue public/index.html
git commit -m "feat: add Reader page with vertical text and recitation tracking"
```

---

### Task 12: Home Page (Today's Dashboard)

**Files:**
- Modify: `src/pages/HomePage.vue`

- [ ] **Step 1: Write `src/pages/HomePage.vue`**

```vue
<template>
  <q-page class="q-pa-md">
    <div class="text-h5 text-primary q-mb-xs">今日</div>
    <div class="text-caption text-secondary q-mb-lg">{{ todayLabel }}</div>

    <!-- Overall progress -->
    <GlassCard class="q-mb-md">
      <div class="text-subtitle2 text-secondary q-mb-sm">誦讀進度</div>
      <div v-if="progressStore.loading" class="text-secondary text-caption">載入中...</div>
      <div v-else class="row q-gutter-md">
        <div
          v-for="sutra in sutrasWithProgress"
          :key="sutra.id"
          class="column items-center"
        >
          <ProgressRing
            :value="progressStore.getSutraCompletionRatio(sutra.id)"
            :size="64"
            :stroke-width="5"
            color="var(--gem-amethyst)"
          />
          <div class="text-caption text-secondary q-mt-xs" style="max-width: 64px; text-align: center">
            {{ sutra.titleZh }}
          </div>
        </div>
      </div>
    </GlassCard>

    <!-- Recently read -->
    <GlassCard class="q-mb-md">
      <div class="text-subtitle2 text-secondary q-mb-sm">最近誦讀</div>
      <div v-if="recentVolumes.length === 0" class="text-secondary text-caption">
        尚未有誦讀紀錄
      </div>
      <q-list v-else dense>
        <q-item v-for="item in recentVolumes" :key="item.key" class="q-px-none">
          <q-item-section>
            <q-item-label class="text-primary text-caption">
              {{ item.sutraTitle }} · 第 {{ parseInt(item.volumeId) }} 卷
            </q-item-label>
            <q-item-label caption class="text-secondary">
              {{ item.lastRead }} · 共 {{ item.count }} 遍
            </q-item-label>
          </q-item-section>
        </q-item>
      </q-list>
    </GlassCard>

    <!-- Quick actions -->
    <div class="row q-gutter-sm">
      <q-btn
        class="col glass"
        flat
        icon="menu_book"
        label="開始誦讀"
        color="white"
        @click="$router.push('/library')"
      />
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import GlassCard from 'src/components/GlassCard.vue'
import ProgressRing from 'src/components/ProgressRing.vue'
import { useProgressStore } from 'src/stores/progressStore'
import { getAllSutras } from 'src/services/sutraService'

const progressStore = useProgressStore()
const sutras = getAllSutras()

const todayLabel = computed(() => {
  return new Date().toLocaleDateString('zh-TW', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'long',
  })
})

const sutrasWithProgress = computed(() =>
  sutras.filter((s) => progressStore.progressMap[s.id] !== undefined || true)
)

const recentVolumes = computed(() => {
  const items: {
    key: string
    sutraTitle: string
    volumeId: string
    count: number
    lastRead: string
  }[] = []

  for (const sutra of sutras) {
    const progress = progressStore.progressMap[sutra.id]
    if (!progress) continue
    for (const [volumeId, vp] of Object.entries(progress.volumes)) {
      items.push({
        key: `${sutra.id}-${volumeId}`,
        sutraTitle: sutra.titleZh,
        volumeId,
        count: vp.count,
        lastRead: new Date(vp.lastRead).toLocaleDateString('zh-TW'),
      })
    }
  }

  return items
    .sort((a, b) => b.lastRead.localeCompare(a.lastRead))
    .slice(0, 5)
})

onMounted(() => {
  progressStore.loadAllProgress()
})
</script>
```

- [ ] **Step 2: Run dev and verify home page**

```bash
npx quasar dev
```

Expected: today's date shown, sutra progress rings (0% if no data yet), recent readings list. After reading 心經 in Task 11, the home page should show it under recent readings.

- [ ] **Step 3: Run all tests to confirm nothing broken**

```bash
npx vitest run
```

Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/pages/HomePage.vue
git commit -m "feat: add Home page with progress overview and recent readings"
```

---

### Task 13: GitHub Actions CI/CD → Firebase Hosting

**Files:**
- Create: `.github/workflows/deploy.yml`
- Create: `firebase.json`
- Create: `.firebaserc`

- [ ] **Step 1: Install Firebase CLI and initialize hosting**

```bash
npm install -g firebase-tools
firebase login
firebase init hosting
```

When prompted:
- Use existing project → select your project
- Public directory: `dist/spa`
- Single-page app: `Yes`
- GitHub Actions deploy: `Yes` (follow prompts to connect GitHub repo)

- [ ] **Step 2: Write `.github/workflows/deploy.yml`**

```yaml
name: Deploy to Firebase Hosting

on:
  push:
    branches: [main]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npx vitest run

      - name: Build
        run: npx quasar build
        env:
          VITE_FIREBASE_API_KEY: ${{ secrets.VITE_FIREBASE_API_KEY }}
          VITE_FIREBASE_AUTH_DOMAIN: ${{ secrets.VITE_FIREBASE_AUTH_DOMAIN }}
          VITE_FIREBASE_PROJECT_ID: ${{ secrets.VITE_FIREBASE_PROJECT_ID }}
          VITE_FIREBASE_STORAGE_BUCKET: ${{ secrets.VITE_FIREBASE_STORAGE_BUCKET }}
          VITE_FIREBASE_MESSAGING_SENDER_ID: ${{ secrets.VITE_FIREBASE_MESSAGING_SENDER_ID }}
          VITE_FIREBASE_APP_ID: ${{ secrets.VITE_FIREBASE_APP_ID }}

      - name: Deploy to Firebase Hosting
        uses: FirebaseExtended/action-hosting-deploy@v0
        with:
          repoToken: ${{ secrets.GITHUB_TOKEN }}
          firebaseServiceAccount: ${{ secrets.FIREBASE_SERVICE_ACCOUNT }}
          channelId: live
          projectId: ${{ secrets.VITE_FIREBASE_PROJECT_ID }}
```

- [ ] **Step 3: Add all VITE_FIREBASE_* values as GitHub repository secrets**

Go to your GitHub repo → Settings → Secrets and variables → Actions.  
Add each `VITE_FIREBASE_*` value from your `.env` file as a secret.  
Also add `FIREBASE_SERVICE_ACCOUNT` — download from Firebase Console → Project Settings → Service Accounts → Generate new private key, paste the entire JSON.

- [ ] **Step 4: Push to main and verify CI passes**

```bash
git add .github/ firebase.json .firebaserc
git commit -m "chore: add GitHub Actions CI/CD to Firebase Hosting"
git push origin main
```

Expected: GitHub Actions workflow runs, tests pass, app deploys to `https://your-project.web.app`.

---

## Plan 1 Complete

After these 13 tasks you have:
- Quasar + Firebase project running and deployed
- Glassmorphism design system
- Sutra data layer (bundled + Firebase Storage + IndexedDB cache)
- Recitation tracking with Firestore persistence
- Library page + volume browser
- Vertical text reader
- Home dashboard
- CI/CD pipeline

**Next plans:**
- **Plan 2:** Gem Collection + TresJS 3D Viewer + Milestone Animations
- **Plan 3:** Practice Features (Mantra counter, Memorization quiz, Daily Tasks)
- **Plan 4:** Print Layout Editor + Dharma Lecture Notes
