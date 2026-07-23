# Buddhist Scripture App — Design Spec
**Date:** 2026-06-03
**Status:** Approved for implementation planning

---

## 1. Overview

A personal webapp for Buddhist scripture study and practice. The app combines recitation tracking, memorization drills, mantra counting, a 3D gem collection system, and print-ready sutra layout tools — all wrapped in a Glassmorphism aesthetic to make Buddhist practice engaging and beautiful.

**Primary user:** Personal use (single user, no auth required for v1)
**Platform:** Webapp (PWA) — installable on iPhone home screen
**Future path:** Quasar + Capacitor → native iOS app

---

## 2. Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | Quasar (Vue 3 + TypeScript) |
| 3D rendering | TresJS (Three.js wrapper for Vue) |
| Backend | Firebase Firestore (data) + Firebase Storage (large sutras) |
| Hosting | Firebase Hosting via GitHub Actions CI/CD |
| Local cache | IndexedDB (read sutra volumes cached after first load) |
| PDF export | jsPDF or Quasar print utilities |
| Animations | @vueuse/motion + TresJS |
| Icons | Phosphor Icons |
| Style | Glassmorphism (backdrop-filter blur, semi-transparent cards, gem-toned accents) |

---

## 3. Architecture — Data Storage Strategy (Hybrid)

**Bundled in app** (`/src/data/`):
- Short sutras: 心經, 大悲咒, 往生咒, and other short texts
- Metadata: 88 Buddha names + descriptions, 88 constellation data, 三千佛 name list, mantra targets

**Firebase Storage** (lazy-loaded, cached in IndexedDB after first read):
- Large sutras: 華嚴經 (80 volumes), 楞嚴經, 地藏經, 法華經, etc.
- Each volume is a separate JSON file: `/sutras/avatamsaka/volume-001.json`

**Firebase Firestore** (user progress and collections):
- All recitation records, gem collections, mantra counts, memorization sessions, print layouts, dharma lecture notes

---

## 4. Features

### 4.1 Sutra Library & Recitation Tracking

**Sutras included:**
- 華嚴經 (80 volumes) — primary sutra
- 楞嚴經, 地藏經, 法華經, and others

**Tracking per volume:**
- Cumulative recitation count
- Last read timestamp

**Daily Task System:**
- Each day, randomly draw tasks from: sutra volumes, mantras, Buddha name chanting, memorization challenges
- User can complete tasks or re-draw
- Tasks shown as flippable cards on the home screen

**圓滿 (Completion) Milestones:**
- All volumes of a sutra recited at least once → 圓滿一部
- 10 sutras completed → 圓滿十部
- 100 sutras completed → 圓滿百部

### 4.2 Gem Collection System

**Earning gems:**
- Reciting sutra volumes (華嚴經 each volume, other sutras each volume)
- Completing mantra/Buddha name tasks
- Completing memorization challenges

**Gem mapping:**
- 華嚴經 80 volumes → 80 gems, each linked to one of the 88 Buddhas and one of the 88 constellations
- 8 special gems → unlocked via mantra/Buddha name tasks (completing any 8)
- Other sutras → each volume earns a gem linked to one of the 三千佛
- 背經 completions → gems (no specific Buddha/constellation link)

**Gem visual design (procedurally generated):**
Each gem is unique, generated at unlock time using Three.js `MeshPhysicalMaterial`:
- `color`: random hue from gem palette (blue, purple, green, red, gold)
- `transmission`: 0.7–1.0 (semi-transparent to fully transparent)
- `iridescence`: random value (rainbow shimmer)
- `roughness`: 0–0.15
- `geometry`: random cut shape (octahedron, diamond, heart, emerald cut, etc.)
- Parameters saved to Firestore — gem is always the same when revisited

**3D Gem Viewer:**
- Click any unlocked gem → full-screen TresJS scene
- OrbitControls: drag to rotate 360°, pinch to zoom
- HDR environment lighting for realistic light refraction
- Side panel: linked Buddha name, introduction, corresponding constellation

**Locked gems:** Displayed as grey translucent silhouettes

### 4.3 Milestone Animations (Three.js)

| Milestone | Animation |
|-----------|-----------|
| 圓滿一部 | 88 gems ascend and form the corresponding constellation pattern; gold particle burst; sutra scroll card unlocked |
| 圓滿十部 | 10 sutra gems converge into a 3D lotus flower (petals = gems), rotatable |
| 圓滿百部 | All gems form a full mandala; full-screen rainbow light (虹光) burst from center; 善知識 title unlocked |

### 4.4 Mantra & Buddha Name Chanting

**Mantras:**
- 楞嚴咒, 大悲咒 — target: 7 recitations
- 往生咒, 滅定業真言, 地藏菩薩心咒, 藥師灌頂真言, 準提神咒, 文殊菩薩心咒 — target: 108

**Buddha names:**
- 觀世音菩薩, 地藏王菩薩, 毘廬遮那如來, 文殊師利菩薩, 本師釋迦牟尼佛, 阿彌陀佛, 藥師佛, 大勢至菩薩, 普賢菩薩, etc. — target: 108

**UI:** Large circle tap counter. Progress ring around the circle. Completion triggers gem unlock ceremony.

**Special unlock:** Complete any 8 mantra/Buddha name tasks → unlock 8 special gems (completing the 88-gem set alongside 華嚴經's 80).

### 4.5 Memorization Practice (背經)

- Select sutra + volume + difficulty level
- Random sentence blanking: higher difficulty = more blanked words
- Two question modes: fill-in-the-blank, multiple choice
- Completion → gem earned + score recorded

### 4.6 Print Layout Editor

- Select sutra and volume range
- Style options: vertical text (直排), Zhuyin annotation font, font size, background (custom color or image), columns
- Live preview
- Export to PDF (jsPDF)

### 4.7 Dharma Lecture Notes (v1 Simple)

- Paste YouTube URL + title
- Check in "listened today" (records date)
- Free-text notes per lecture
- Tag system for topics

*Timestamp-linked notes deferred to v2.*

---

## 5. Firestore Data Model

```
/progress/{sutraId}
  volumes: { "001": { count: number, lastRead: timestamp } }
  totalCompleted: number
  isFullyComplete: boolean
  completedAt?: timestamp

/gems/{gemId}
  earnedAt: timestamp
  source: 'sutra_volume' | 'mantra' | 'memorization'
  sourceRef: string
  buddhaId?: string
  constellationId?: string
  threeParams: {
    color: string        // hex
    transmission: number
    iridescence: number
    iridescenceIOR: number
    roughness: number
    geometry: string     // 'octahedron' | 'diamond' | 'heart' | ...
  }

/mantras/{mantraId}
  count: number
  target: number         // 7 or 108
  completed: boolean
  sessions: [{ date: timestamp, count: number }]

/dailyTasks/{date}       // date as YYYY-MM-DD string
  tasks: [{
    type: 'sutra' | 'mantra' | 'buddha_name' | 'memorization'
    targetId: string
    target: number
    completed: boolean
  }]
  generatedAt: timestamp

/memorization/{sessionId}
  sutraId: string
  volumeId: string
  difficulty: number     // 1–5
  score: number
  completedAt: timestamp
  gemEarned: boolean

/printLayouts/{layoutId}
  sutraId: string
  volumeRange: { start: string, end: string }
  settings: {
    fontSize: number
    background: string
    zhuyin: boolean
    columns: number
    vertical: boolean
  }
  createdAt: timestamp

/dharmaLectures/{lectureId}
  youtubeUrl: string
  title: string
  notes: string
  tags: string[]
  checkins: [{ date: timestamp }]
  createdAt: timestamp
```

---

## 6. Navigation Structure

**Bottom Tab Bar (5 tabs):**

```
今日  |  誦讀  |  練習  |  收藏  |  更多
```

**Page routes:**
```
/                    今日任務 — daily tasks + streak + progress rings
/library             經文庫 — browse sutras
/reader/:id/:vol     誦讀頁 — vertical text reader + completion
/practice            練習 — 背經 / 持咒 / 念佛號
/collection          收藏室 — gem wall + 3D viewer
/collection/:gemId   單顆寶石 3D 檢視
/print               印刷排版
/dharma              聽法筆記
/settings            設定
```

---

## 7. UI/UX Design Principles

- **Base:** Deep space black / dark navy background
- **Cards:** Glassmorphism — `backdrop-filter: blur(20px)`, 10–20% white opacity, subtle 1px light border
- **Accent colors:** Gem tones — amethyst purple, sapphire blue, emerald green, ruby red, amber gold
- **Typography:** Clean sans-serif for UI; serif with Zhuyin support for sutra text
- **Motion:** Subtle entry animations via @vueuse/motion; Three.js scenes for gem and milestone moments
- **Gem unlock ceremony:** Black screen → light particles converge → gem materializes and rotates → constellation lines trace across screen → Buddha name fades in

---

## 8. Out of Scope (v1)

- Multi-user / accounts
- YouTube timestamp-linked notes
- Native iOS app packaging (Capacitor)
- Social sharing
- Audio playback of sutras
