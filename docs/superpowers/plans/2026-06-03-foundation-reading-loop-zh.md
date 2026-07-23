# 佛教經文 App — Plan 1：基礎架構 + 核心誦讀流程

> **給自動執行的工作者：** 必須使用 superpowers:subagent-driven-development（推薦）或 superpowers:executing-plans 逐任務執行此計畫。步驟使用核取方塊（`- [ ]`）語法追蹤進度。

**目標：** 建立 Quasar + Firebase 專案，實作核心誦讀循環 — 瀏覽經文、閱讀某卷、標記完成、進度持久化到 Firestore。

**架構：** Quasar（Vue 3 + TypeScript）SPA，Pinia 狀態管理，Firebase Firestore 持久化。短經打包在 `src/data/` 中，長經從 Firebase Storage 延遲載入並快取於 IndexedDB。毛玻璃設計系統透過 CSS 自訂屬性套用在 Quasar 元件上。

**技術棧：** Quasar CLI v2、Vue 3、TypeScript、Pinia、Firebase v9+（模組化）、idb（IndexedDB 封裝）、Vitest

---

## 檔案結構

```
src/
  boot/
    firebase.ts           — Firebase 初始化，匯出 db + storage
  css/
    glass.scss            — 毛玻璃 CSS 變數與工具類別
  types/
    sutra.ts              — SutraIndex、SutraVolume、ProgressRecord 型別
  data/
    sutras/
      heart-sutra.json    — 心經全文（打包）
    meta/
      sutras-index.json   — 所有經文清單 + 儲存類型（打包/遠端）
  services/
    sutraService.ts       — 載入卷數：打包 JSON 或 Firebase Storage + IndexedDB 快取
    progressService.ts    — Firestore CRUD（/progress 集合）
  stores/
    progressStore.ts      — Pinia store：卷數計數、完成狀態
  layouts/
    MainLayout.vue        — 底部 Tab Bar（今日/誦讀/練習/收藏/更多）
  pages/
    HomePage.vue          — 今日儀表板，近期進度
    LibraryPage.vue       — 經文庫，選擇經典與卷數
    ReaderPage.vue        — 直排文字閱讀器，標記完成按鈕
    CollectionPage.vue    — 佔位（Plan 2）
    PracticePage.vue      — 佔位（Plan 3）
    MorePage.vue          — 佔位（Plan 4）
  components/
    GlassCard.vue         — 可重複使用的毛玻璃卡片
    ProgressRing.vue      — SVG 圓形進度指示器
  router/
    index.ts              — 路由定義
tests/
  services/
    progressService.test.ts
  stores/
    progressStore.test.ts
```

---

### 任務 1：建立 Quasar 專案 + 安裝依賴

**涉及檔案：** 專案根目錄（所有 Quasar 腳手架檔案）

- [ ] **步驟 1：建立 Quasar 專案**

```bash
npm init quasar@latest .
```

CLI 提示時選擇：
- 專案類型：`App with Quasar CLI`
- Vue 版本：`Vue 3`
- TypeScript：`Yes`
- Quasar App CLI：`Vite`
- 套件名稱：`buddhist-scripture-app`
- 功能：勾選 `PWA`、`Pinia`、`Vue Router`
- CSS 預處理器：`SCSS`
- ESLint：`Yes`

- [ ] **步驟 2：安裝額外依賴**

```bash
npm install firebase idb
npm install @vueuse/core @vueuse/motion
```

- [ ] **步驟 3：加入 Vitest 單元測試擴充**

```bash
npx quasar ext add @quasar/testing-unit-vitest
```

接受所有預設值。

- [ ] **步驟 4：驗證開發伺服器啟動**

```bash
npx quasar dev
```

預期輸出：`App running at: http://localhost:9000`
打開瀏覽器，看到預設 Quasar 歡迎頁，無 console 錯誤。

- [ ] **步驟 5：提交**

```bash
git init
git add .
git commit -m "chore: scaffold Quasar project with Firebase, Pinia, PWA"
```

---

### 任務 2：Firebase 設定 + Boot 檔案

**涉及檔案：**
- 建立：`.env`（加入 .gitignore）
- 建立：`.env.example`
- 建立：`src/boot/firebase.ts`
- 修改：`quasar.config.ts`（註冊 boot 檔案）

- [ ] **步驟 1：建立 Firebase 專案**

前往 https://console.firebase.google.com → 新專案 → 命名為 `buddhist-app`。
啟用 **Firestore Database**（測試模式）。
啟用 **Storage**（測試模式）。
新增 **Web 應用程式** → 複製設定值。

- [ ] **步驟 2：建立 `.env` 檔案**

```bash
# .env（絕對不要提交這個檔案）
VITE_FIREBASE_API_KEY=你的_api_key
VITE_FIREBASE_AUTH_DOMAIN=你的_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=你的_project_id
VITE_FIREBASE_STORAGE_BUCKET=你的_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=你的_sender_id
VITE_FIREBASE_APP_ID=你的_app_id
```

- [ ] **步驟 3：建立 `.env.example`（可安全提交）**

```bash
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

- [ ] **步驟 4：將 `.env` 加入 `.gitignore`**

```bash
echo ".env" >> .gitignore
```

- [ ] **步驟 5：撰寫 `src/boot/firebase.ts`**

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
  // Firebase 初始化完成，db 和 storage 匯出供 services 使用
})
```

- [ ] **步驟 6：在 `quasar.config.ts` 的 boot 陣列加入 `'firebase'`**

```typescript
boot: ['firebase'],
```

- [ ] **步驟 7：驗證 app 仍可啟動**

```bash
npx quasar dev
```

預期：無 console 錯誤，app 正常載入。

- [ ] **步驟 8：提交**

```bash
git add src/boot/firebase.ts .env.example quasar.config.ts .gitignore
git commit -m "chore: add Firebase boot file and env config"
```

---

### 任務 3：TypeScript 型別定義

**涉及檔案：**
- 建立：`src/types/sutra.ts`

- [ ] **步驟 1：撰寫 `src/types/sutra.ts`**

```typescript
export interface SutraIndexEntry {
  id: string              // 例如 'avatamsaka'、'heart-sutra'
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
  count: number           // 誦讀次數
  lastRead: string        // ISO 時間戳
}

export interface SutraProgress {
  sutraId: string
  volumes: Record<string, VolumeProgress>  // volumeId → 進度
  totalCompleted: number  // count >= 1 的卷數
  isFullyComplete: boolean
  completedAt?: string
}
```

- [ ] **步驟 2：提交**

```bash
git add src/types/sutra.ts
git commit -m "chore: add TypeScript type definitions for sutras and progress"
```

---

### 任務 4：毛玻璃設計系統

**涉及檔案：**
- 建立：`src/css/glass.scss`
- 修改：`src/css/app.scss`（匯入 glass.scss）
- 建立：`src/components/GlassCard.vue`
- 建立：`src/components/ProgressRing.vue`

- [ ] **步驟 1：撰寫 `src/css/glass.scss`**

```scss
:root {
  // 基礎色彩
  --bg-deep: #0a0a1a;
  --bg-surface: rgba(255, 255, 255, 0.06);
  --bg-surface-hover: rgba(255, 255, 255, 0.10);

  // 毛玻璃效果
  --glass-blur: 20px;
  --glass-border: 1px solid rgba(255, 255, 255, 0.12);
  --glass-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);

  // 寶石色調
  --gem-amethyst: #9b59b6;
  --gem-sapphire: #2980b9;
  --gem-emerald: #27ae60;
  --gem-ruby: #c0392b;
  --gem-amber: #f39c12;
  --gem-aqua: #16a085;

  // 文字
  --text-primary: rgba(255, 255, 255, 0.92);
  --text-secondary: rgba(255, 255, 255, 0.55);

  // 間距
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

- [ ] **步驟 2：在 `src/css/app.scss` 頂部加入匯入**

```scss
@import './glass.scss';
```

- [ ] **步驟 3：撰寫 `src/components/GlassCard.vue`**

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

- [ ] **步驟 4：撰寫 `src/components/ProgressRing.vue`**

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

- [ ] **步驟 5：暫時修改 `src/pages/IndexPage.vue` 驗證樣式**

```vue
<template>
  <q-page class="q-pa-md">
    <GlassCard hoverable>
      <div class="text-h6">設計系統測試</div>
      <div class="text-secondary">毛玻璃卡片正常運作</div>
      <ProgressRing :value="0.6" label="60%" class="q-mt-sm" />
    </GlassCard>
  </q-page>
</template>

<script setup lang="ts">
import GlassCard from 'src/components/GlassCard.vue'
import ProgressRing from 'src/components/ProgressRing.vue'
</script>
```

執行 `npx quasar dev`。預期：深色背景帶漸層、毛玻璃卡片可見模糊效果、紫色進度環顯示 60%。

- [ ] **步驟 6：提交**

```bash
git add src/css/ src/components/GlassCard.vue src/components/ProgressRing.vue src/pages/IndexPage.vue
git commit -m "feat: add glassmorphism design system and base components"
```

---

### 任務 5：路由 + 主版面（底部 Tab 導覽）

**涉及檔案：**
- 修改：`src/router/routes.ts`
- 修改：`src/layouts/MainLayout.vue`
- 建立：各頁面 stub（HomePage、LibraryPage、ReaderPage、CollectionPage、PracticePage、MorePage）

- [ ] **步驟 1：撰寫 `src/router/routes.ts`**

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

- [ ] **步驟 2：撰寫 `src/layouts/MainLayout.vue`**

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

- [ ] **步驟 3：建立各頁面 stub**

`src/pages/HomePage.vue`：
```vue
<template>
  <q-page class="q-pa-md">
    <div class="text-h5 text-primary q-mb-md">今日</div>
  </q-page>
</template>
```

`src/pages/LibraryPage.vue`：
```vue
<template>
  <q-page class="q-pa-md">
    <div class="text-h5 text-primary q-mb-md">經文庫</div>
  </q-page>
</template>
```

`src/pages/ReaderPage.vue`：
```vue
<template>
  <q-page class="q-pa-md">
    <div class="text-h5 text-primary">誦讀</div>
  </q-page>
</template>
```

`src/pages/CollectionPage.vue`：
```vue
<template>
  <q-page class="q-pa-md">
    <div class="text-h5 text-primary">收藏室</div>
    <div class="text-secondary q-mt-sm">Plan 2 實作</div>
  </q-page>
</template>
```

`src/pages/PracticePage.vue`：
```vue
<template>
  <q-page class="q-pa-md">
    <div class="text-h5 text-primary">練習</div>
    <div class="text-secondary q-mt-sm">Plan 3 實作</div>
  </q-page>
</template>
```

`src/pages/MorePage.vue`：
```vue
<template>
  <q-page class="q-pa-md">
    <div class="text-h5 text-primary">更多</div>
    <div class="text-secondary q-mt-sm">Plan 4 實作</div>
  </q-page>
</template>
```

- [ ] **步驟 4：執行開發伺服器，驗證所有 Tab 正常導覽**

```bash
npx quasar dev
```

預期：底部 Tab Bar 可見，點擊每個 Tab 顯示對應的 stub 頁面，無 404 錯誤。

- [ ] **步驟 5：提交**

```bash
git add src/router/ src/layouts/ src/pages/
git commit -m "feat: add router and bottom tab navigation layout"
```

---

### 任務 6：經文資料檔案

**涉及檔案：**
- 建立：`src/data/meta/sutras-index.json`
- 建立：`src/data/sutras/heart-sutra.json`

- [ ] **步驟 1：撰寫 `src/data/meta/sutras-index.json`**

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

- [ ] **步驟 2：撰寫 `src/data/sutras/heart-sutra.json`**

```json
{
  "sutraId": "heart-sutra",
  "volumeId": "001",
  "titleZh": "般若波羅蜜多心經",
  "blocks": [
    { "type": "heading", "text": "般若波羅蜜多心經" },
    { "type": "paragraph", "text": "觀自在菩薩，行深般若波羅蜜多時，照見五蘊皆空，度一切苦厄。" },
    { "type": "paragraph", "text": "舍利子，色不異空，空不異色，色即是空，空即是色，受想行識，亦復如是。" },
    { "type": "paragraph", "text": "舍利子，是諸法空相，不生不滅，不垢不淨，不增不減。" },
    { "type": "paragraph", "text": "是故空中無色，無受想行識，無眼耳鼻舌身意，無色聲香味觸法，無眼界，乃至無意識界。" },
    { "type": "paragraph", "text": "無無明，亦無無明盡，乃至無老死，亦無老死盡。無苦集滅道，無智亦無得。" },
    { "type": "paragraph", "text": "以無所得故，菩提薩埵，依般若波羅蜜多故，心無罣礙，無罣礙故，無有恐怖，遠離顛倒夢想，究竟涅槃。" },
    { "type": "paragraph", "text": "三世諸佛，依般若波羅蜜多故，得阿耨多羅三藐三菩提。" },
    { "type": "paragraph", "text": "故知般若波羅蜜多，是大神咒，是大明咒，是無上咒，是無等等咒，能除一切苦，真實不虛。" },
    { "type": "verse", "text": "故說般若波羅蜜多咒，即說咒曰：揭諦揭諦，波羅揭諦，波羅僧揭諦，菩提薩婆訶。" }
  ]
}
```

- [ ] **步驟 3：提交**

```bash
git add src/data/
git commit -m "feat: add sutra index metadata and Heart Sutra bundled data"
```

---

### 任務 7：SutraService（打包 + Firebase Storage + IndexedDB 快取）

**涉及檔案：**
- 建立：`src/services/cacheService.ts`
- 建立：`src/services/sutraService.ts`

- [ ] **步驟 1：撰寫 `src/services/cacheService.ts`**

使用 `idb` 將遠端卷數快取在 IndexedDB，第一次載入後可離線使用。

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

- [ ] **步驟 2：撰寫 `src/services/sutraService.ts`**

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

async function loadBundledVolume(sutraId: string): Promise<SutraVolume> {
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
  if (!meta) throw new Error(`未知經典：${sutraId}`)

  if (meta.storageType === 'bundled') {
    return loadBundledVolume(sutraId)
  }
  return loadRemoteVolume(sutraId, volumeId)
}

export function formatVolumeId(num: number): string {
  return String(num).padStart(3, '0')
}
```

- [ ] **步驟 3：提交**

```bash
git add src/services/
git commit -m "feat: add SutraService with bundled load and Firebase Storage + IndexedDB cache"
```

---

### 任務 8：ProgressService（Firestore CRUD）

**涉及檔案：**
- 建立：`src/services/progressService.ts`
- 建立：`tests/services/progressService.test.ts`

- [ ] **步驟 1：撰寫 `src/services/progressService.ts`**

```typescript
import { doc, getDoc, setDoc } from 'firebase/firestore'
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

- [ ] **步驟 2：撰寫 `tests/services/progressService.test.ts`**

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('firebase/firestore', () => ({
  doc: vi.fn(() => ({})),
  getDoc: vi.fn(),
  setDoc: vi.fn(),
  updateDoc: vi.fn(),
}))
vi.mock('src/boot/firebase', () => ({ db: {} }))

import { getDoc, setDoc } from 'firebase/firestore'
import { recordRecitation } from 'src/services/progressService'
import type { SutraProgress } from 'src/types/sutra'

describe('progressService', () => {
  beforeEach(() => vi.clearAllMocks())

  it('沒有既有進度時建立新紀錄', async () => {
    vi.mocked(getDoc).mockResolvedValueOnce({ exists: () => false } as any)
    vi.mocked(setDoc).mockResolvedValueOnce(undefined)

    const result = await recordRecitation('heart-sutra', '001', 1)

    expect(result.volumes['001'].count).toBe(1)
    expect(result.totalCompleted).toBe(1)
    expect(result.isFullyComplete).toBe(true)
    expect(setDoc).toHaveBeenCalledOnce()
  })

  it('重複誦讀時累加次數', async () => {
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
  })

  it('所有卷完成時設定 isFullyComplete', async () => {
    const existing: SutraProgress = {
      sutraId: 'avatamsaka',
      volumes: { '001': { count: 1, lastRead: '2026-01-01T00:00:00.000Z' } },
      totalCompleted: 1,
      isFullyComplete: false,
    }
    vi.mocked(getDoc).mockResolvedValueOnce({ exists: () => true, data: () => existing } as any)
    vi.mocked(setDoc).mockResolvedValueOnce(undefined)

    const result = await recordRecitation('avatamsaka', '002', 2)

    expect(result.totalCompleted).toBe(2)
    expect(result.isFullyComplete).toBe(true)
    expect(result.completedAt).toBeDefined()
  })
})
```

- [ ] **步驟 3：執行測試確認通過**

```bash
npx vitest run tests/services/progressService.test.ts
```

預期輸出：
```
✓ progressService > 沒有既有進度時建立新紀錄
✓ progressService > 重複誦讀時累加次數
✓ progressService > 所有卷完成時設定 isFullyComplete

Test Files  1 passed (1)
Tests       3 passed (3)
```

- [ ] **步驟 4：提交**

```bash
git add src/services/progressService.ts tests/services/progressService.test.ts
git commit -m "feat: add ProgressService with Firestore CRUD and unit tests"
```

---

### 任務 9：progressStore（Pinia）

**涉及檔案：**
- 建立：`src/stores/progressStore.ts`
- 建立：`tests/stores/progressStore.test.ts`

- [ ] **步驟 1：撰寫 `src/stores/progressStore.ts`**

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
    if (data) progressMap.value[sutraId] = data
  }

  async function loadAllProgress(): Promise<void> {
    loading.value = true
    await Promise.all(getAllSutras().map((s) => loadProgress(s.id)))
    loading.value = false
  }

  async function markVolumeComplete(sutraId: string, volumeId: string): Promise<SutraProgress> {
    const meta = getAllSutras().find((s) => s.id === sutraId)
    if (!meta) throw new Error(`未知經典：${sutraId}`)

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
    return (progressMap.value[sutraId]?.totalCompleted ?? 0) / meta.totalVolumes
  }

  return { progressMap, loading, loadProgress, loadAllProgress, markVolumeComplete, getVolumeCount, getSutraCompletionRatio }
})
```

- [ ] **步驟 2：撰寫 `tests/stores/progressStore.test.ts`**

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

import { recordRecitation } from 'src/services/progressService'
import { useProgressStore } from 'src/stores/progressStore'

describe('progressStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('無進度時 getSutraCompletionRatio 回傳 0', () => {
    const store = useProgressStore()
    expect(store.getSutraCompletionRatio('avatamsaka')).toBe(0)
  })

  it('未知卷數時 getVolumeCount 回傳 0', () => {
    const store = useProgressStore()
    expect(store.getVolumeCount('avatamsaka', '001')).toBe(0)
  })

  it('markVolumeComplete 更新 progressMap', async () => {
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

- [ ] **步驟 3：執行測試**

```bash
npx vitest run tests/stores/progressStore.test.ts
```

預期：3 個測試全部通過。

- [ ] **步驟 4：提交**

```bash
git add src/stores/progressStore.ts tests/stores/progressStore.test.ts
git commit -m "feat: add progressStore with Pinia and unit tests"
```

---

### 任務 10：經文庫頁面

**涉及檔案：**
- 修改：`src/pages/LibraryPage.vue`

- [ ] **步驟 1：撰寫 `src/pages/LibraryPage.vue`**

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

    <!-- 卷數選擇對話框 -->
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

onMounted(() => progressStore.loadAllProgress())
</script>
```

- [ ] **步驟 2：驗證**

```bash
npx quasar dev
```

進入「誦讀」Tab。預期：顯示經典列表與進度環，點擊任一經典開啟卷數選擇對話框。

- [ ] **步驟 3：提交**

```bash
git add src/pages/LibraryPage.vue
git commit -m "feat: add Library page with sutra browser and volume selector"
```

---

### 任務 11：誦讀頁面（直排文字 + 標記完成）

**涉及檔案：**
- 修改：`src/pages/ReaderPage.vue`
- 修改：`index.html`（加入字體）

- [ ] **步驟 1：撰寫 `src/pages/ReaderPage.vue`**

```vue
<template>
  <q-page>
    <!-- 頂部導覽列 -->
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

    <!-- 載入中 -->
    <div v-if="loading" class="flex flex-center q-pa-xl">
      <q-spinner-dots size="50px" color="purple-4" />
    </div>

    <!-- 直排經文 -->
    <div v-else-if="volume" class="reader-container q-pa-lg">
      <div class="vertical-text-wrapper">
        <template v-for="(block, i) in volume.blocks" :key="i">
          <div :class="['text-block', `text-block--${block.type}`]">
            {{ block.text }}
          </div>
        </template>
      </div>
    </div>

    <!-- 完成回向對話框 -->
    <q-dialog v-model="showCompleteDialog">
      <q-card class="glass text-center q-pa-lg">
        <q-icon name="auto_awesome" color="amber-4" size="48px" />
        <div class="text-h6 text-primary q-mt-sm">回向完成</div>
        <div class="text-secondary q-mt-xs">
          第 {{ route.params.volumeId }} 卷已記錄<br />
          累計誦讀 {{ newCount }} 遍
        </div>
        <q-btn flat class="q-mt-md" color="purple-3" label="繼續" @click="showCompleteDialog = false" />
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

- [ ] **步驟 2：在 `index.html` 的 `<head>` 加入思源宋體字型**

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Noto+Serif+TC:wght@400;700&display=swap" rel="stylesheet">
```

- [ ] **步驟 3：測試完整誦讀流程**

```bash
npx quasar dev
```

流程：誦讀 → 般若波羅蜜多心經 → 第 1 卷 → 確認直排文字正常顯示 → 點擊右上角打勾按鈕 → 出現回向對話框 → 至 Firebase Console 確認 Firestore `progress/heart-sutra` 文件已建立，`volumes.001.count: 1`。

- [ ] **步驟 4：提交**

```bash
git add src/pages/ReaderPage.vue public/index.html
git commit -m "feat: add Reader page with vertical text and recitation tracking"
```

---

### 任務 12：首頁（今日儀表板）

**涉及檔案：**
- 修改：`src/pages/HomePage.vue`

- [ ] **步驟 1：撰寫 `src/pages/HomePage.vue`**

```vue
<template>
  <q-page class="q-pa-md">
    <div class="text-h5 text-primary q-mb-xs">今日</div>
    <div class="text-caption text-secondary q-mb-lg">{{ todayLabel }}</div>

    <!-- 整體進度 -->
    <GlassCard class="q-mb-md">
      <div class="text-subtitle2 text-secondary q-mb-sm">誦讀進度</div>
      <div v-if="progressStore.loading" class="text-secondary text-caption">載入中...</div>
      <div v-else class="row q-gutter-md">
        <div v-for="sutra in sutras" :key="sutra.id" class="column items-center">
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

    <!-- 最近誦讀 -->
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

    <!-- 快速動作 -->
    <q-btn
      class="full-width glass"
      flat
      icon="menu_book"
      label="開始誦讀"
      color="white"
      @click="$router.push('/library')"
    />
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

const todayLabel = computed(() =>
  new Date().toLocaleDateString('zh-TW', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'long',
  })
)

const recentVolumes = computed(() => {
  const items: { key: string; sutraTitle: string; volumeId: string; count: number; lastRead: string }[] = []
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
  return items.sort((a, b) => b.lastRead.localeCompare(a.lastRead)).slice(0, 5)
})

onMounted(() => progressStore.loadAllProgress())
</script>
```

- [ ] **步驟 2：執行所有測試確認無破壞**

```bash
npx vitest run
```

預期：所有測試通過。

- [ ] **步驟 3：提交**

```bash
git add src/pages/HomePage.vue
git commit -m "feat: add Home page with progress overview and recent readings"
```

---

### 任務 13：GitHub Actions CI/CD → Firebase Hosting

**涉及檔案：**
- 建立：`.github/workflows/deploy.yml`
- 建立：`firebase.json`
- 建立：`.firebaserc`

- [ ] **步驟 1：安裝 Firebase CLI 並初始化 Hosting**

```bash
npm install -g firebase-tools
firebase login
firebase init hosting
```

提示時選擇：
- 使用現有專案
- 公開目錄：`dist/spa`
- 單頁應用程式：`Yes`
- GitHub Actions 部署：`Yes`

- [ ] **步驟 2：撰寫 `.github/workflows/deploy.yml`**

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

      - name: 安裝依賴
        run: npm ci

      - name: 執行測試
        run: npx vitest run

      - name: 建置
        run: npx quasar build
        env:
          VITE_FIREBASE_API_KEY: ${{ secrets.VITE_FIREBASE_API_KEY }}
          VITE_FIREBASE_AUTH_DOMAIN: ${{ secrets.VITE_FIREBASE_AUTH_DOMAIN }}
          VITE_FIREBASE_PROJECT_ID: ${{ secrets.VITE_FIREBASE_PROJECT_ID }}
          VITE_FIREBASE_STORAGE_BUCKET: ${{ secrets.VITE_FIREBASE_STORAGE_BUCKET }}
          VITE_FIREBASE_MESSAGING_SENDER_ID: ${{ secrets.VITE_FIREBASE_MESSAGING_SENDER_ID }}
          VITE_FIREBASE_APP_ID: ${{ secrets.VITE_FIREBASE_APP_ID }}

      - name: 部署至 Firebase Hosting
        uses: FirebaseExtended/action-hosting-deploy@v0
        with:
          repoToken: ${{ secrets.GITHUB_TOKEN }}
          firebaseServiceAccount: ${{ secrets.FIREBASE_SERVICE_ACCOUNT }}
          channelId: live
          projectId: ${{ secrets.VITE_FIREBASE_PROJECT_ID }}
```

- [ ] **步驟 3：在 GitHub 儲存庫加入 Secrets**

至 GitHub 儲存庫 → Settings → Secrets and variables → Actions。
加入所有 `VITE_FIREBASE_*` 值（來自 `.env`）。
加入 `FIREBASE_SERVICE_ACCOUNT`（至 Firebase Console → 專案設定 → 服務帳戶 → 產生新的私密金鑰，貼上整個 JSON）。

- [ ] **步驟 4：推送至 main 並確認 CI 通過**

```bash
git add .github/ firebase.json .firebaserc
git commit -m "chore: add GitHub Actions CI/CD to Firebase Hosting"
git push origin main
```

預期：GitHub Actions workflow 執行，測試通過，app 部署至 `https://your-project.web.app`。

---

## Plan 1 完成

完成 13 個任務後，你擁有：
- Quasar + Firebase 專案已部署上線
- 毛玻璃設計系統
- 經文資料層（打包 + Firebase Storage + IndexedDB 快取）
- 誦讀紀錄持久化到 Firestore
- 經文庫頁面 + 卷數瀏覽器
- 直排文字閱讀器
- 今日首頁儀表板
- CI/CD 流程

**後續計畫：**
- **Plan 2：** 寶石收藏 + TresJS 3D 檢視器 + 里程碑動畫
- **Plan 3：** 練習功能（持咒計數、背經測驗、每日任務抽籤）
- **Plan 4：** 印刷排版編輯器 + 聽法筆記
