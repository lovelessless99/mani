# CLAUDE.md — mani（佛教修行 PWA）

給未來的 Claude / 開發者的專案地圖。目標是讓每天誦經、持咒、背經成為戒不掉的習慣——**所有功能都用「會不會讓人明天再回來」來衡量**。

- Repo: `github.com/lovelessless99/mani`（package name: `buddhist-scripture-app`）
- 部署: 每次 push 到 `main` → GitHub Actions（`.github/workflows/deploy.yml`）跑 **vitest → build → Firebase Hosting 正式站**
- 使用者以繁體中文為主；**回覆與 UI 文字一律用繁體中文**（過去常誤飄成日文，請避免）

## 指令

```bash
npm run dev        # Vite dev server（開發時開在 :9000，截圖測試也連這個）
npm run build      # tsc/vue-tsc + vite build（部署前必過）
npx vue-tsc --noEmit -p tsconfig.json   # 只做型別檢查
npx vitest run     # 單元測試（CI 會擋，改 store 後務必跑，目前 40 passed）
```

- **提交前**：`vue-tsc` 乾淨 + `npm run build` 過 + 若動到 store/service 則 `vitest` 過。
- **視覺改動**：習慣用 Playwright 無頭截圖驗證（見下方）再給使用者看；使用者通常先 review 再說「deploy」。
- Commit 訊息結尾附 `Co-Authored-By` / `Claude-Session`（沿用既有格式）。

## 技術棧

- Vite + Vue 3 `<script setup>` + TypeScript + Pinia + Vue Router(history)
- 3D：TresJS（`@tresjs/core` / `cientos`）包 three ^0.184；bloom 用 `@tresjs/post-processing`（`EffectComposerPmndrs` + `BloomPmndrs`）
- 後端：Firebase Auth + Firestore；**訪客模式**用 localStorage
- PWA：`vite-plugin-pwa`，`registerType: 'autoUpdate'`

## 資料存取（很重要）

`src/services/dataAccess.ts` 是唯一入口，依「是否登入」自動路由：

- 登入 → Firestore `/users/{uid}/{col}/{id}`
- 訪客（無 `auth.currentUser`）→ localStorage key `flower:guest:<col>`，值是 `{ [id]: data }`
- API：`getDocData / setDocData / addDocData / listDocs`（**沒有 delete**——要刪就改寫整份 doc）
- 截圖測試 seed 資料：`localStorage.setItem('flower:guest:on','1')` + `localStorage.setItem('flower:guest:<col>', JSON.stringify({...}))`

## 路由 / 頁面（`src/pages`, 路由在 `src/router/routes.ts`）

| 路由 | 頁面 | 說明 |
|---|---|---|
| `/` | HomePage | 首頁：3D 海景(OceanScene)、菩提種子連續、今日籤語、每日提醒 |
| `/practice` | PracticePage | **功課**：今日功課籤(抽卡)、加分持戒、背經入口、**持咒念佛(展開)**、各經卷計數(可「調整遍數」修正) |
| `/dedication` | DedicationPage | **迴向**：`LanternRiver` 星空，每次迴向=一個獨立小星宿 |
| `/collection` | CollectionPage | **收藏**：每部經一套寶石；滿套後顯示「第 N 輪 → 邁向 N+1 輪」進度 |
| `/pureland` | PureLandPage | 寶石聚成的 3D 淨土巡禮 |
| `/chant` | ChantPage | 持咒念佛(薄殼，內容是 `ChantSection`；也內嵌在功課頁) |
| `/notes` | NotesPage | **聽法筆記**：YouTube 影片 + 時間點標註感想 + 今日已聞法打卡 |
| `/library` `/reader/:sutraId/:volumeId` | LibraryPage / ReaderPage | 讀經(印經坊 iframe) |
| `/dashboard` | DashboardPage | **修行軌跡**：菩提種子連續卡 + 打卡熱力圖 + 統計(含持咒遍) |
| `/achievements` `/print` `/guide` `/more` | … | 成就 / 排版輸出 / 使用指南 / 更多設定 |

## 核心系統與 Store（`src/stores`）

- **progressStore**：誦經計數。`markVolumeComplete`(+1) / `setVolumeCount`(修正) / slot key = `${chapterId}-recite` 或 `-memorize`。部數 = 各章最低計數。
- **meritStore**：功德。`earned` = 所有經卷遍數 **+ 持咒總遍數(chant.grandTotal)**；`spent` 於迴向；`balance = earned - spent`。→ 迴向頁載入時要 `chant.load()` 才算得到持咒功德。
- **streakStore**：連續天數(菩提種子)。任何修行 `touchToday()` 記今日；`days[]` 供熱力圖。
- **chantStore**：持咒念佛念珠。每項 `{count, rounds}`；`tick`(撥一顆) / `completeRound`(一鍵圓滿一輪) / `setEntry`(調整修正) / `undo`。資料在 `chants.json`（咒 + 佛菩薩名號，目標 108/21/7）。
- **gemStore** + `gemService`：寶石，earn 一次(首次誦某章)。收藏「下一輪」用 progress 的部數/本輪進度呈現，不改 gem 模型。
- **heavenStore**：三十三天，`maxTier` 由 merit.earned 推導(`meritForTier(t)=t*(t+3)`)。
- **dedicationStore**：迴向燈記錄(`light`)。
- **notesStore**：聽法筆記(影片 + `marks[{t,note}]`)。
- 其他：achievement / daily(今日功課籤) / observance(加分持戒) / reading(讀經進度) / vow(立願) / pureland / auth。

## 重點元件 / 邏輯

- **迴向星空 `src/components/LanternRiver.vue`**：海面 shader(自 OceanScene 移植) + 月亮反光 + 全天星 + 背景 88 星宿(隨機、連線 loop 動畫) + **每次迴向 = 一個獨立小星宿**（取自 `constellation-figures.json`，golden-angle 散佈，只有主星發光、色調略異）+ **偶爾流星**。第一人稱 yaw(無限)/pitch 拖曳，點星 `emit('select')`。
  - ⚠️ **TresJS 反應性雷**：`v-for` 綁的 ref 陣列**不要每幀整份重新賦值**，否則 mesh 來不及畫(流星曾因此不顯示)——要「就地 mutate 物件 + 只 splice 死掉的」。
- **背經 `src/components/practice/FillBlankDrill.vue`**：8 種玩法(填空/接龍/漸隱/默背/重組/排序/限時/配對)，共用 `GAMES` 陣列 + `build()` dispatch + `sections`(每章 paragraphs)。加新玩法：加 GAMES 項、state、build 函式、template `<template v-else-if>`、CSS。限時有 `setInterval`，切走/unmount 要 `stopTimer()`。
- **農曆七月 `useGhostMonth` + `GhostMonthTasks.vue`**：農曆七月整月於功課頁頂顯示「誦地藏經一部 + 報父母恩咒 108」。農曆用 `Intl('en-u-ca-chinese')`（`useFastDay` 十齋日同理）。
- **通知 `useNotify`**：每日提醒可設時間(更多頁)，用 Notification Triggers 排程(支援的瀏覽器)+ 首頁站內提醒。**PWA 更新**：`usePwa` 偵測新 SW 接管(controllerchange)→ `PwaPrompts` 跳「已更新·點此刷新」。
- **讀經 ReaderPage**：印經坊在 `public/yinjingfang/index.html`(iframe)，橋接 `__readerFlip/__readerGoto/__onReaderRender/__readerSingle`。翻頁用 **pointerup** 觸控(非 click，避免延遲)。PWA `navigateFallbackDenylist: [/^\/yinjingfang\//]`。

## 資料檔（`src/data/meta` 等）

- `sutras-index.json`(經目)、`sutra-chapters.json`(各經品/卷)、`reader-library.json`(印經坊對應)
- `constellation-figures.json`(88 星宿座標/連線)、`buddhas-88.json`、`sutra-guardians.json`、`heavens.json`
- `chants.json`(持咒/名號)、`observances.json`(持戒)、`blessings.json`(籤語)、`dedication-verses.json`(迴向偈)
- 背經文本：`drill-index.json`(4KB 常載) + `drill-library.json`(665KB 懶載)

## 截圖測試小抄

```js
// scripts/shot-*.mjs（用完刪掉，別留在 repo）
const b = await chromium.launch({ args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] })
const p = await b.newPage({ viewport:{width:430,height:932}, deviceScaleFactor:2 })
await p.addInitScript(()=>{ localStorage.setItem('flower:guest:on','1'); /* seed flower:guest:<col> */ })
await p.goto('http://localhost:9000/<route>',{waitUntil:'domcontentloaded'})
```
- **Playwright 刻意不放進 package.json**（避免 CI 變肥）；需要時 `npm install --no-save playwright && npx playwright install chromium`。

## 慣習 / 雷點

- 訪客資料鍵 `flower:guest:<col>`；改 store 記得同步截圖 seed 格式。
- Bloom 材質要 `toneMapped:false`；遠處亮物 `fog:false`；shader 海面 `:depth-write="true"`。
- WebGL `LineBasicMaterial` 線寬鎖 1px → 星座連線用細 `CylinderGeometry` 畫。
- 修正機制：**就地編輯**（持咒「調整」、誦經「調整遍數」、念珠「↺ 退一顆」），不另開修正面板；「看」交給修行軌跡。
- 別把系統既有事實(檔案結構、git 歷史)寫進需求；有需求就更新本檔。

## 未來想做的點子（backlog）

尚未實作、之後可能想要的方向。做完某項就更新本檔。

### 背經更多玩法（都建在 `FillBlankDrill.vue`）
- **語音默背**：念出聲，`SpeechRecognition` 比對原文（Chrome 較穩、其他瀏覽器要 fallback）。
- **難度階梯**：挖空比例／隱去層數隨答對率自動加深。
- **闖關 / 生命值**：連續答題，錯了扣命，整品／整卷當 Boss，過關給獎。
- **每日一題**：每天固定一題經文小考，連續答對累積（綁 streak）。

### 每日 loop / 留存（北極星）
- **每日功課再收緊**：首頁「今日就做這一件事」一鍵接續 + **斷簽保護 / 補簽** / 連續里程碑，讓連續天數捨不得斷。
- **多時段提醒**：早課／晚課多個時間各自排程通知（目前 `useNotify` 只單一時刻）。

### 迴向 / 情感
- **定期迴向**：為某人固定每日／每週迴向，週年、生日提醒點燈（把情感綁進每日開啟）。

### 3D / 視覺
- **地藏王菩薩 3D**：用 `github.com/img2threejs/img2threejs` 生成，放進淨土／迴向場景。**需使用者先提供參考圖**，建議另開乾淨 session 用 img2threejs skill。

### 修正 / 資料
- **集中修正面板**：若之後覺得「就地編輯」不夠，再補一個總覽頁一次調整所有計數（目前刻意用就地編輯 + 修行軌跡負責看）。

### 讀經 / 效能
- **印經坊翻頁效能**：實機若翻頁仍慢（換頁重繪 `buildSheet`），需在真機量測後深入該 iframe 內部優化（觸控延遲已用 pointerup 解掉）。

### 社群 / 分享（需先想清楚隱私）
- 分享迴向星空、成就、修行軌跡；任何對外分享前確認不外洩個資、且使用者明確同意。
