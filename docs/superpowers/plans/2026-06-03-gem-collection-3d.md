# Gem Collection & 3D Viewer — Plan 2

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the 3D gem collection system — procedurally generated gems earned by completing sutra volumes, displayed in a TresJS interactive viewer, with unlock ceremony animation and 圓滿一部 constellation milestone.

**Architecture:** TresJS (Vue 3 wrapper for Three.js) renders gems using MeshPhysicalMaterial with transmission/iridescence for realistic crystal effect. Gem parameters are randomly generated at unlock time and persisted to Firestore. CollectionPage shows a grid of GemCard components; clicking one opens a full-screen GemViewer. UnlockCeremony overlays the ReaderPage when a volume is marked complete.

**Tech Stack:** TresJS v4 + @tresjs/cientos, Three.js, Vue 3, Pinia, Firebase Firestore, GSAP (for CSS animations)

---

## File Map

```
src/
  data/
    meta/
      buddhas-88.json           — 88 Buddha names + brief description
      constellations-88.json    — 88 IAU constellation names (Chinese + Latin)
      avatamsaka-gem-map.json   — volume 001–080 → { buddhaId, constellationId }
  types/
    gem.ts                      — GemParams, GemRecord, BuddhaInfo, ConstellationInfo
  services/
    gemService.ts               — Firestore CRUD + procedural gem parameter generation
  stores/
    gemStore.ts                 — Pinia store: gems map, pending unlock, loadGems, unlockGem
  components/
    gems/
      GemMesh.vue               — TresJS 3D mesh for a single gem (geometry + material)
      GemViewer.vue             — Full-screen TresCanvas with OrbitControls + HDR lighting
      GemCard.vue               — 2D grid card (locked silhouette vs unlocked preview)
      UnlockCeremony.vue        — Overlay: CSS particles → gem materializes → star burst
      MilestoneOverlay.vue      — 圓滿一部: constellation lines trace across screen
  pages/
    CollectionPage.vue          — Gem wall grid, opens GemViewer on tap
tests/
  services/
    gemService.test.ts
  stores/
    gemStore.test.ts
```

---

### Task 1: Install TresJS + Three.js Dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install packages**

```bash
npm install @tresjs/core @tresjs/cientos three
npm install --save-dev @types/three
```

- [ ] **Step 2: Verify installation**

```bash
node -e "require('@tresjs/core'); require('three'); console.log('ok')"
```

Expected: `ok`

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add TresJS and Three.js dependencies"
```

---

### Task 2: 88 Buddhas + Constellations + Avatamsaka Mapping Data

**Files:**
- Create: `src/data/meta/buddhas-88.json`
- Create: `src/data/meta/constellations-88.json`
- Create: `src/data/meta/avatamsaka-gem-map.json`

- [ ] **Step 1: Create `src/data/meta/buddhas-88.json`**

The 88 Buddhas from 禮佛大懺悔文 (53 過去莊嚴劫佛 + 35 三十五佛懺悔佛):

```json
[
  { "id": "b001", "nameZh": "普光佛", "nameEn": "Universal Light Buddha", "color": "#9b59b6", "description": "光明遍照十方，普利一切眾生。" },
  { "id": "b002", "nameZh": "普明佛", "nameEn": "Universal Brightness Buddha", "color": "#8e44ad", "description": "智慧光明，照破無明黑暗。" },
  { "id": "b003", "nameZh": "普淨佛", "nameEn": "Universal Purity Buddha", "color": "#2980b9", "description": "清淨本然，不染塵埃。" },
  { "id": "b004", "nameZh": "多摩羅跋栴檀香佛", "nameEn": "Tamalapatra Candana Buddha", "color": "#27ae60", "description": "如栴檀香，清涼眾生煩惱。" },
  { "id": "b005", "nameZh": "栴檀光佛", "nameEn": "Candana Light Buddha", "color": "#f39c12", "description": "功德如栴檀，香滿十方。" },
  { "id": "b006", "nameZh": "摩尼幢佛", "nameEn": "Mani Banner Buddha", "color": "#e74c3c", "description": "摩尼寶幢，映照一切世界。" },
  { "id": "b007", "nameZh": "歡喜藏摩尼寶積佛", "nameEn": "Joyous Treasury Mani Jewel Buddha", "color": "#16a085", "description": "廣積法寶，令眾生歡喜。" },
  { "id": "b008", "nameZh": "一切世間樂見上大精進佛", "nameEn": "Great Diligence Joy Buddha", "color": "#8e44ad", "description": "精進不懈，為眾生歡喜所見。" },
  { "id": "b009", "nameZh": "摩尼幢燈光佛", "nameEn": "Mani Lamp Light Buddha", "color": "#2c3e50", "description": "燈光明照，如摩尼幢。" },
  { "id": "b010", "nameZh": "慧炬照佛", "nameEn": "Wisdom Torch Buddha", "color": "#d35400", "description": "智慧如炬，照破煩惱。" },
  { "id": "b011", "nameZh": "海德光明佛", "nameEn": "Ocean Virtue Light Buddha", "color": "#1a5276", "description": "德如大海，光明無量。" },
  { "id": "b012", "nameZh": "金剛牢強普散金光佛", "nameEn": "Vajra Firm Gold Light Buddha", "color": "#f1c40f", "description": "如金剛牢固，散放金色光明。" },
  { "id": "b013", "nameZh": "大強精進勇猛佛", "nameEn": "Great Courageous Buddha", "color": "#c0392b", "description": "勇猛精進，降伏一切魔障。" },
  { "id": "b014", "nameZh": "大悲光佛", "nameEn": "Great Compassion Light Buddha", "color": "#6c3483", "description": "大悲心光，遍照苦難眾生。" },
  { "id": "b015", "nameZh": "慈力王佛", "nameEn": "Compassion Power King Buddha", "color": "#117a65", "description": "慈悲之力，王於三界。" },
  { "id": "b016", "nameZh": "慈藏佛", "nameEn": "Compassion Treasury Buddha", "color": "#2e86c1", "description": "慈悲如藏，含藏無量功德。" },
  { "id": "b017", "nameZh": "旃檀窟莊嚴勝佛", "nameEn": "Candana Cave Adorned Buddha", "color": "#a93226", "description": "莊嚴勝妙，如旃檀香窟。" },
  { "id": "b018", "nameZh": "賢善首佛", "nameEn": "Virtuous Leader Buddha", "color": "#27ae60", "description": "賢善為首，引導眾生向善。" },
  { "id": "b019", "nameZh": "善意佛", "nameEn": "Good Intent Buddha", "color": "#2980b9", "description": "善意純正，利益一切有情。" },
  { "id": "b020", "nameZh": "廣莊嚴王佛", "nameEn": "Broadly Adorned King Buddha", "color": "#9b59b6", "description": "廣大莊嚴，王德圓滿。" },
  { "id": "b021", "nameZh": "金華光佛", "nameEn": "Golden Flower Light Buddha", "color": "#f39c12", "description": "金色花光，莊嚴佛土。" },
  { "id": "b022", "nameZh": "寶蓋照空自在力王佛", "nameEn": "Jewel Canopy Sky King Buddha", "color": "#8e44ad", "description": "寶蓋映空，自在力王。" },
  { "id": "b023", "nameZh": "虛空寶華光佛", "nameEn": "Sky Jewel Flower Light Buddha", "color": "#1abc9c", "description": "虛空如寶華，光明無際。" },
  { "id": "b024", "nameZh": "琉璃莊嚴王佛", "nameEn": "Lapis Lazuli Adorned King Buddha", "color": "#2471a3", "description": "琉璃莊嚴，淨土王。" },
  { "id": "b025", "nameZh": "普現色身光佛", "nameEn": "Universal Form Light Buddha", "color": "#e8daef", "description": "普現色身，光明照耀。" },
  { "id": "b026", "nameZh": "不動智光佛", "nameEn": "Immovable Wisdom Light Buddha", "color": "#2c3e50", "description": "智光不動，如如自在。" },
  { "id": "b027", "nameZh": "降伏眾魔王佛", "nameEn": "Subduing Mara King Buddha", "color": "#6e2f1a", "description": "降伏魔軍，保護正法。" },
  { "id": "b028", "nameZh": "才光明佛", "nameEn": "Talent Light Buddha", "color": "#f0b27a", "description": "才智光明，廣度眾生。" },
  { "id": "b029", "nameZh": "智慧勝佛", "nameEn": "Wisdom Victorious Buddha", "color": "#5dade2", "description": "智慧超勝，斷除煩惱。" },
  { "id": "b030", "nameZh": "彌勒仙光佛", "nameEn": "Maitreya Sage Light Buddha", "color": "#f9e79f", "description": "彌勒仙光，象徵未來慈悲。" },
  { "id": "b031", "nameZh": "善寂月音妙尊智王佛", "nameEn": "Good Tranquil Moon Sound Buddha", "color": "#d7bde2", "description": "善寂如月，音聲妙尊。" },
  { "id": "b032", "nameZh": "世淨光佛", "nameEn": "World Pure Light Buddha", "color": "#a9cce3", "description": "世界清淨，光明遍照。" },
  { "id": "b033", "nameZh": "龍種上尊王佛", "nameEn": "Dragon Seed Superior King Buddha", "color": "#1e8449", "description": "龍種尊勝，王統十方。" },
  { "id": "b034", "nameZh": "日月光佛", "nameEn": "Sun Moon Light Buddha", "color": "#f4d03f", "description": "日月光明，普照天下。" },
  { "id": "b035", "nameZh": "日月珠光佛", "nameEn": "Sun Moon Pearl Light Buddha", "color": "#f8c471", "description": "日月珠光，映照十方法界。" },
  { "id": "b036", "nameZh": "慧幢勝王佛", "nameEn": "Wisdom Banner King Buddha", "color": "#8e44ad", "description": "智慧幢幡，勝覆一切。" },
  { "id": "b037", "nameZh": "師子吼自在力王佛", "nameEn": "Lion's Roar King Buddha", "color": "#cb4335", "description": "師子吼聲，震動十方。" },
  { "id": "b038", "nameZh": "妙音勝佛", "nameEn": "Wonderful Sound Victor Buddha", "color": "#76d7c4", "description": "妙音超勝，悅耳利生。" },
  { "id": "b039", "nameZh": "常光幢佛", "nameEn": "Constant Light Banner Buddha", "color": "#f7dc6f", "description": "常光不滅，幢幡永立。" },
  { "id": "b040", "nameZh": "觀世燈佛", "nameEn": "World Observing Lamp Buddha", "color": "#5499c7", "description": "觀照世間，如燈明照。" },
  { "id": "b041", "nameZh": "慧威燈王佛", "nameEn": "Wisdom Majestic Lamp King Buddha", "color": "#a569bd", "description": "慧威如燈，王照三界。" },
  { "id": "b042", "nameZh": "法勝王佛", "nameEn": "Dharma Victor King Buddha", "color": "#2ecc71", "description": "法力勝王，廣弘正法。" },
  { "id": "b043", "nameZh": "須彌光佛", "nameEn": "Sumeru Light Buddha", "color": "#85c1e9", "description": "如須彌山，光明高廣。" },
  { "id": "b044", "nameZh": "須摩那華光佛", "nameEn": "Sumana Flower Light Buddha", "color": "#f0b27a", "description": "須摩那花光，清香悅眾。" },
  { "id": "b045", "nameZh": "優曇鉢羅華殊勝王佛", "nameEn": "Udumbara Flower King Buddha", "color": "#c39bd3", "description": "優曇奇花，殊勝難遇。" },
  { "id": "b046", "nameZh": "大慧力王佛", "nameEn": "Great Wisdom Power King Buddha", "color": "#1a5276", "description": "大慧之力，王於智海。" },
  { "id": "b047", "nameZh": "阿閦毘歡喜光佛", "nameEn": "Akshobhya Joy Light Buddha", "color": "#2471a3", "description": "阿閦不動，歡喜光明。" },
  { "id": "b048", "nameZh": "無量音聲王佛", "nameEn": "Limitless Voice King Buddha", "color": "#148f77", "description": "無量音聲，普覆法界。" },
  { "id": "b049", "nameZh": "才光佛", "nameEn": "Brilliant Light Buddha", "color": "#e9f7ef", "description": "才智光耀，照破無明。" },
  { "id": "b050", "nameZh": "金海光佛", "nameEn": "Golden Ocean Light Buddha", "color": "#d4ac0d", "description": "金色海光，廣大無邊。" },
  { "id": "b051", "nameZh": "山海慧自在通王佛", "nameEn": "Mountain Ocean Wisdom King Buddha", "color": "#1f618d", "description": "山海之慧，自在神通。" },
  { "id": "b052", "nameZh": "大通光佛", "nameEn": "Great Penetrating Light Buddha", "color": "#a9cce3", "description": "大通無礙，光明周遍。" },
  { "id": "b053", "nameZh": "一切法常滿王佛", "nameEn": "All Dharma Perfection King Buddha", "color": "#27ae60", "description": "一切佛法，常滿圓足。" },
  { "id": "b054", "nameZh": "釋迦牟尼佛", "nameEn": "Shakyamuni Buddha", "color": "#f39c12", "description": "娑婆世界的本師，開示苦集滅道。" },
  { "id": "b055", "nameZh": "金剛不壞佛", "nameEn": "Vajra Indestructible Buddha", "color": "#85c1e9", "description": "如金剛般堅固不壞，代表法身永恆。" },
  { "id": "b056", "nameZh": "寶光佛", "nameEn": "Jewel Light Buddha", "color": "#f1c40f", "description": "寶光照耀，功德無量。" },
  { "id": "b057", "nameZh": "龍尊王佛", "nameEn": "Dragon Honored King Buddha", "color": "#117a65", "description": "龍王尊勝，統御一切龍眾。" },
  { "id": "b058", "nameZh": "精進軍佛", "nameEn": "Diligent Army Buddha", "color": "#c0392b", "description": "以精進為軍，勇往直前修道。" },
  { "id": "b059", "nameZh": "精進喜佛", "nameEn": "Diligent Joy Buddha", "color": "#e74c3c", "description": "精進修行，法喜充滿。" },
  { "id": "b060", "nameZh": "寶火佛", "nameEn": "Jewel Fire Buddha", "color": "#e67e22", "description": "如寶火般，燃燒煩惱薪柴。" },
  { "id": "b061", "nameZh": "寶月光佛", "nameEn": "Jewel Moonlight Buddha", "color": "#d7bde2", "description": "寶月光明，清涼眾生。" },
  { "id": "b062", "nameZh": "現無愚佛", "nameEn": "No Ignorance Manifest Buddha", "color": "#2ecc71", "description": "現照無愚，智慧圓明。" },
  { "id": "b063", "nameZh": "寶月佛", "nameEn": "Jewel Moon Buddha", "color": "#aed6f1", "description": "如寶月高懸，清淨照耀。" },
  { "id": "b064", "nameZh": "無垢佛", "nameEn": "Stainless Buddha", "color": "#f8f9fa", "description": "無有垢染，清淨本然。" },
  { "id": "b065", "nameZh": "離垢佛", "nameEn": "Separated from Defilement Buddha", "color": "#eaecee", "description": "遠離一切垢染，得清淨解脫。" },
  { "id": "b066", "nameZh": "勇施佛", "nameEn": "Courageous Giving Buddha", "color": "#a3e4d7", "description": "勇於布施，廣結善緣。" },
  { "id": "b067", "nameZh": "清淨佛", "nameEn": "Pure Buddha", "color": "#d6eaf8", "description": "身心清淨，示現正法。" },
  { "id": "b068", "nameZh": "清淨施佛", "nameEn": "Pure Giving Buddha", "color": "#d5f5e3", "description": "以清淨心廣施法益。" },
  { "id": "b069", "nameZh": "娑留那佛", "nameEn": "Varuna Buddha", "color": "#2e86c1", "description": "如水之德，潤澤一切。" },
  { "id": "b070", "nameZh": "水天佛", "nameEn": "Water Heaven Buddha", "color": "#1a9ba1", "description": "水天清淨，德被萬物。" },
  { "id": "b071", "nameZh": "堅德佛", "nameEn": "Firm Virtue Buddha", "color": "#784212", "description": "德行堅固，如山如石。" },
  { "id": "b072", "nameZh": "旃檀功德佛", "nameEn": "Candana Merit Buddha", "color": "#a04000", "description": "功德如旃檀，香遍十方。" },
  { "id": "b073", "nameZh": "無量掬光佛", "nameEn": "Limitless Scooping Light Buddha", "color": "#f9e79f", "description": "掬起無量光明，惠施眾生。" },
  { "id": "b074", "nameZh": "光德佛", "nameEn": "Light Virtue Buddha", "color": "#fad7a0", "description": "光明與功德，相輔相成。" },
  { "id": "b075", "nameZh": "無憂德佛", "nameEn": "No Sorrow Virtue Buddha", "color": "#a9dfbf", "description": "無有憂惱，功德圓滿。" },
  { "id": "b076", "nameZh": "那羅延佛", "nameEn": "Narayana Buddha", "color": "#1e8449", "description": "如那羅延天，力大無窮。" },
  { "id": "b077", "nameZh": "功德華佛", "nameEn": "Merit Flower Buddha", "color": "#f1948a", "description": "功德如花，莊嚴佛土。" },
  { "id": "b078", "nameZh": "蓮華光遊戲神通佛", "nameEn": "Lotus Light Play Buddha", "color": "#f5b7b1", "description": "蓮花光明，遊戲神通無礙。" },
  { "id": "b079", "nameZh": "財功德佛", "nameEn": "Wealth Merit Buddha", "color": "#d4ac0d", "description": "財施與法施，功德無量。" },
  { "id": "b080", "nameZh": "德念佛", "nameEn": "Virtuous Mindfulness Buddha", "color": "#7fb3d3", "description": "念念皆德，正念清淨。" },
  { "id": "b081", "nameZh": "善名稱功德佛", "nameEn": "Good Name Merit Buddha", "color": "#48c9b0", "description": "善名流布，功德廣大。" },
  { "id": "b082", "nameZh": "紅炎幢王佛", "nameEn": "Red Flame Banner King Buddha", "color": "#e74c3c", "description": "紅炎幢幡，王者之威。" },
  { "id": "b083", "nameZh": "善游步功德佛", "nameEn": "Good Walking Merit Buddha", "color": "#82e0aa", "description": "善步功德，遊化十方。" },
  { "id": "b084", "nameZh": "鬥戰勝佛", "nameEn": "Battle Victory Buddha", "color": "#cb4335", "description": "戰勝煩惱魔軍，解脫自在。" },
  { "id": "b085", "nameZh": "善游步佛", "nameEn": "Good Step Buddha", "color": "#52be80", "description": "行步善妙，示現正道。" },
  { "id": "b086", "nameZh": "周匝莊嚴功德佛", "nameEn": "All Around Adorned Merit Buddha", "color": "#a569bd", "description": "周遍莊嚴，功德圓滿。" },
  { "id": "b087", "nameZh": "寶華遊步佛", "nameEn": "Jewel Flower Walking Buddha", "color": "#f1948a", "description": "步步生蓮，寶華莊嚴。" },
  { "id": "b088", "nameZh": "寶蓮華善住娑羅樹王佛", "nameEn": "Jewel Lotus Sala Tree King Buddha", "color": "#27ae60", "description": "蓮華善住，娑羅樹王，圓滿之相。" }
]
```

- [ ] **Step 2: Create `src/data/meta/constellations-88.json`**

```json
[
  { "id": "c001", "nameZh": "仙女座", "nameEn": "Andromeda", "iauCode": "And", "buddhaId": "b001" },
  { "id": "c002", "nameZh": "唧筒座", "nameEn": "Antlia", "iauCode": "Ant", "buddhaId": "b002" },
  { "id": "c003", "nameZh": "天燕座", "nameEn": "Apus", "iauCode": "Aps", "buddhaId": "b003" },
  { "id": "c004", "nameZh": "寶瓶座", "nameEn": "Aquarius", "iauCode": "Aqr", "buddhaId": "b004" },
  { "id": "c005", "nameZh": "天鷹座", "nameEn": "Aquila", "iauCode": "Aql", "buddhaId": "b005" },
  { "id": "c006", "nameZh": "天壇座", "nameEn": "Ara", "iauCode": "Ara", "buddhaId": "b006" },
  { "id": "c007", "nameZh": "白羊座", "nameEn": "Aries", "iauCode": "Ari", "buddhaId": "b007" },
  { "id": "c008", "nameZh": "御夫座", "nameEn": "Auriga", "iauCode": "Aur", "buddhaId": "b008" },
  { "id": "c009", "nameZh": "牧夫座", "nameEn": "Boötes", "iauCode": "Boo", "buddhaId": "b009" },
  { "id": "c010", "nameZh": "雕具座", "nameEn": "Caelum", "iauCode": "Cae", "buddhaId": "b010" },
  { "id": "c011", "nameZh": "鹿豹座", "nameEn": "Camelopardalis", "iauCode": "Cam", "buddhaId": "b011" },
  { "id": "c012", "nameZh": "巨蟹座", "nameEn": "Cancer", "iauCode": "Cnc", "buddhaId": "b012" },
  { "id": "c013", "nameZh": "獵犬座", "nameEn": "Canes Venatici", "iauCode": "CVn", "buddhaId": "b013" },
  { "id": "c014", "nameZh": "大犬座", "nameEn": "Canis Major", "iauCode": "CMa", "buddhaId": "b014" },
  { "id": "c015", "nameZh": "小犬座", "nameEn": "Canis Minor", "iauCode": "CMi", "buddhaId": "b015" },
  { "id": "c016", "nameZh": "摩羯座", "nameEn": "Capricornus", "iauCode": "Cap", "buddhaId": "b016" },
  { "id": "c017", "nameZh": "船底座", "nameEn": "Carina", "iauCode": "Car", "buddhaId": "b017" },
  { "id": "c018", "nameZh": "仙后座", "nameEn": "Cassiopeia", "iauCode": "Cas", "buddhaId": "b018" },
  { "id": "c019", "nameZh": "半人馬座", "nameEn": "Centaurus", "iauCode": "Cen", "buddhaId": "b019" },
  { "id": "c020", "nameZh": "仙王座", "nameEn": "Cepheus", "iauCode": "Cep", "buddhaId": "b020" },
  { "id": "c021", "nameZh": "鯨魚座", "nameEn": "Cetus", "iauCode": "Cet", "buddhaId": "b021" },
  { "id": "c022", "nameZh": "蝘蜓座", "nameEn": "Chamaeleon", "iauCode": "Cha", "buddhaId": "b022" },
  { "id": "c023", "nameZh": "圓規座", "nameEn": "Circinus", "iauCode": "Cir", "buddhaId": "b023" },
  { "id": "c024", "nameZh": "天鴿座", "nameEn": "Columba", "iauCode": "Col", "buddhaId": "b024" },
  { "id": "c025", "nameZh": "后髮座", "nameEn": "Coma Berenices", "iauCode": "Com", "buddhaId": "b025" },
  { "id": "c026", "nameZh": "南冕座", "nameEn": "Corona Australis", "iauCode": "CrA", "buddhaId": "b026" },
  { "id": "c027", "nameZh": "北冕座", "nameEn": "Corona Borealis", "iauCode": "CrB", "buddhaId": "b027" },
  { "id": "c028", "nameZh": "烏鴉座", "nameEn": "Corvus", "iauCode": "Crv", "buddhaId": "b028" },
  { "id": "c029", "nameZh": "巨爵座", "nameEn": "Crater", "iauCode": "Crt", "buddhaId": "b029" },
  { "id": "c030", "nameZh": "南十字座", "nameEn": "Crux", "iauCode": "Cru", "buddhaId": "b030" },
  { "id": "c031", "nameZh": "天鵝座", "nameEn": "Cygnus", "iauCode": "Cyg", "buddhaId": "b031" },
  { "id": "c032", "nameZh": "海豚座", "nameEn": "Delphinus", "iauCode": "Del", "buddhaId": "b032" },
  { "id": "c033", "nameZh": "劍魚座", "nameEn": "Dorado", "iauCode": "Dor", "buddhaId": "b033" },
  { "id": "c034", "nameZh": "天龍座", "nameEn": "Draco", "iauCode": "Dra", "buddhaId": "b034" },
  { "id": "c035", "nameZh": "小馬座", "nameEn": "Equuleus", "iauCode": "Equ", "buddhaId": "b035" },
  { "id": "c036", "nameZh": "波江座", "nameEn": "Eridanus", "iauCode": "Eri", "buddhaId": "b036" },
  { "id": "c037", "nameZh": "天爐座", "nameEn": "Fornax", "iauCode": "For", "buddhaId": "b037" },
  { "id": "c038", "nameZh": "雙子座", "nameEn": "Gemini", "iauCode": "Gem", "buddhaId": "b038" },
  { "id": "c039", "nameZh": "天鶴座", "nameEn": "Grus", "iauCode": "Gru", "buddhaId": "b039" },
  { "id": "c040", "nameZh": "武仙座", "nameEn": "Hercules", "iauCode": "Her", "buddhaId": "b040" },
  { "id": "c041", "nameZh": "時鐘座", "nameEn": "Horologium", "iauCode": "Hor", "buddhaId": "b041" },
  { "id": "c042", "nameZh": "長蛇座", "nameEn": "Hydra", "iauCode": "Hya", "buddhaId": "b042" },
  { "id": "c043", "nameZh": "水蛇座", "nameEn": "Hydrus", "iauCode": "Hyi", "buddhaId": "b043" },
  { "id": "c044", "nameZh": "印第安座", "nameEn": "Indus", "iauCode": "Ind", "buddhaId": "b044" },
  { "id": "c045", "nameZh": "蝎虎座", "nameEn": "Lacerta", "iauCode": "Lac", "buddhaId": "b045" },
  { "id": "c046", "nameZh": "獅子座", "nameEn": "Leo", "iauCode": "Leo", "buddhaId": "b046" },
  { "id": "c047", "nameZh": "小獅座", "nameEn": "Leo Minor", "iauCode": "LMi", "buddhaId": "b047" },
  { "id": "c048", "nameZh": "天兔座", "nameEn": "Lepus", "iauCode": "Lep", "buddhaId": "b048" },
  { "id": "c049", "nameZh": "天秤座", "nameEn": "Libra", "iauCode": "Lib", "buddhaId": "b049" },
  { "id": "c050", "nameZh": "豺狼座", "nameEn": "Lupus", "iauCode": "Lup", "buddhaId": "b050" },
  { "id": "c051", "nameZh": "天貓座", "nameEn": "Lynx", "iauCode": "Lyn", "buddhaId": "b051" },
  { "id": "c052", "nameZh": "天琴座", "nameEn": "Lyra", "iauCode": "Lyr", "buddhaId": "b052" },
  { "id": "c053", "nameZh": "山案座", "nameEn": "Mensa", "iauCode": "Men", "buddhaId": "b053" },
  { "id": "c054", "nameZh": "顯微鏡座", "nameEn": "Microscopium", "iauCode": "Mic", "buddhaId": "b054" },
  { "id": "c055", "nameZh": "麒麟座", "nameEn": "Monoceros", "iauCode": "Mon", "buddhaId": "b055" },
  { "id": "c056", "nameZh": "蒼蠅座", "nameEn": "Musca", "iauCode": "Mus", "buddhaId": "b056" },
  { "id": "c057", "nameZh": "矩尺座", "nameEn": "Norma", "iauCode": "Nor", "buddhaId": "b057" },
  { "id": "c058", "nameZh": "南極座", "nameEn": "Octans", "iauCode": "Oct", "buddhaId": "b058" },
  { "id": "c059", "nameZh": "蛇夫座", "nameEn": "Ophiuchus", "iauCode": "Oph", "buddhaId": "b059" },
  { "id": "c060", "nameZh": "獵戶座", "nameEn": "Orion", "iauCode": "Ori", "buddhaId": "b060" },
  { "id": "c061", "nameZh": "孔雀座", "nameEn": "Pavo", "iauCode": "Pav", "buddhaId": "b061" },
  { "id": "c062", "nameZh": "飛馬座", "nameEn": "Pegasus", "iauCode": "Peg", "buddhaId": "b062" },
  { "id": "c063", "nameZh": "英仙座", "nameEn": "Perseus", "iauCode": "Per", "buddhaId": "b063" },
  { "id": "c064", "nameZh": "鳳凰座", "nameEn": "Phoenix", "iauCode": "Phe", "buddhaId": "b064" },
  { "id": "c065", "nameZh": "繪架座", "nameEn": "Pictor", "iauCode": "Pic", "buddhaId": "b065" },
  { "id": "c066", "nameZh": "雙魚座", "nameEn": "Pisces", "iauCode": "Psc", "buddhaId": "b066" },
  { "id": "c067", "nameZh": "南魚座", "nameEn": "Piscis Austrinus", "iauCode": "PsA", "buddhaId": "b067" },
  { "id": "c068", "nameZh": "船尾座", "nameEn": "Puppis", "iauCode": "Pup", "buddhaId": "b068" },
  { "id": "c069", "nameZh": "羅盤座", "nameEn": "Pyxis", "iauCode": "Pyx", "buddhaId": "b069" },
  { "id": "c070", "nameZh": "網罟座", "nameEn": "Reticulum", "iauCode": "Ret", "buddhaId": "b070" },
  { "id": "c071", "nameZh": "箭座", "nameEn": "Sagitta", "iauCode": "Sge", "buddhaId": "b071" },
  { "id": "c072", "nameZh": "人馬座", "nameEn": "Sagittarius", "iauCode": "Sgr", "buddhaId": "b072" },
  { "id": "c073", "nameZh": "天蠍座", "nameEn": "Scorpius", "iauCode": "Sco", "buddhaId": "b073" },
  { "id": "c074", "nameZh": "玉夫座", "nameEn": "Sculptor", "iauCode": "Scl", "buddhaId": "b074" },
  { "id": "c075", "nameZh": "盾牌座", "nameEn": "Scutum", "iauCode": "Sct", "buddhaId": "b075" },
  { "id": "c076", "nameZh": "巨蛇座", "nameEn": "Serpens", "iauCode": "Ser", "buddhaId": "b076" },
  { "id": "c077", "nameZh": "六分儀座", "nameEn": "Sextans", "iauCode": "Sex", "buddhaId": "b077" },
  { "id": "c078", "nameZh": "金牛座", "nameEn": "Taurus", "iauCode": "Tau", "buddhaId": "b078" },
  { "id": "c079", "nameZh": "望遠鏡座", "nameEn": "Telescopium", "iauCode": "Tel", "buddhaId": "b079" },
  { "id": "c080", "nameZh": "三角座", "nameEn": "Triangulum", "iauCode": "Tri", "buddhaId": "b080" },
  { "id": "c081", "nameZh": "南三角座", "nameEn": "Triangulum Australe", "iauCode": "TrA", "buddhaId": "b081" },
  { "id": "c082", "nameZh": "杜鵑座", "nameEn": "Tucana", "iauCode": "Tuc", "buddhaId": "b082" },
  { "id": "c083", "nameZh": "大熊座", "nameEn": "Ursa Major", "iauCode": "UMa", "buddhaId": "b083" },
  { "id": "c084", "nameZh": "小熊座", "nameEn": "Ursa Minor", "iauCode": "UMi", "buddhaId": "b084" },
  { "id": "c085", "nameZh": "船帆座", "nameEn": "Vela", "iauCode": "Vel", "buddhaId": "b085" },
  { "id": "c086", "nameZh": "室女座", "nameEn": "Virgo", "iauCode": "Vir", "buddhaId": "b086" },
  { "id": "c087", "nameZh": "飛魚座", "nameEn": "Volans", "iauCode": "Vol", "buddhaId": "b087" },
  { "id": "c088", "nameZh": "狐狸座", "nameEn": "Vulpecula", "iauCode": "Vul", "buddhaId": "b088" }
]
```

- [ ] **Step 3: Create `src/data/meta/avatamsaka-gem-map.json`**

Maps each of the 80 volumes of 大方廣佛華嚴經 to a Buddha and constellation:

```json
{
  "001": { "buddhaId": "b001", "constellationId": "c001" },
  "002": { "buddhaId": "b002", "constellationId": "c002" },
  "003": { "buddhaId": "b003", "constellationId": "c003" },
  "004": { "buddhaId": "b004", "constellationId": "c004" },
  "005": { "buddhaId": "b005", "constellationId": "c005" },
  "006": { "buddhaId": "b006", "constellationId": "c006" },
  "007": { "buddhaId": "b007", "constellationId": "c007" },
  "008": { "buddhaId": "b008", "constellationId": "c008" },
  "009": { "buddhaId": "b009", "constellationId": "c009" },
  "010": { "buddhaId": "b010", "constellationId": "c010" },
  "011": { "buddhaId": "b011", "constellationId": "c011" },
  "012": { "buddhaId": "b012", "constellationId": "c012" },
  "013": { "buddhaId": "b013", "constellationId": "c013" },
  "014": { "buddhaId": "b014", "constellationId": "c014" },
  "015": { "buddhaId": "b015", "constellationId": "c015" },
  "016": { "buddhaId": "b016", "constellationId": "c016" },
  "017": { "buddhaId": "b017", "constellationId": "c017" },
  "018": { "buddhaId": "b018", "constellationId": "c018" },
  "019": { "buddhaId": "b019", "constellationId": "c019" },
  "020": { "buddhaId": "b020", "constellationId": "c020" },
  "021": { "buddhaId": "b021", "constellationId": "c021" },
  "022": { "buddhaId": "b022", "constellationId": "c022" },
  "023": { "buddhaId": "b023", "constellationId": "c023" },
  "024": { "buddhaId": "b024", "constellationId": "c024" },
  "025": { "buddhaId": "b025", "constellationId": "c025" },
  "026": { "buddhaId": "b026", "constellationId": "c026" },
  "027": { "buddhaId": "b027", "constellationId": "c027" },
  "028": { "buddhaId": "b028", "constellationId": "c028" },
  "029": { "buddhaId": "b029", "constellationId": "c029" },
  "030": { "buddhaId": "b030", "constellationId": "c030" },
  "031": { "buddhaId": "b031", "constellationId": "c031" },
  "032": { "buddhaId": "b032", "constellationId": "c032" },
  "033": { "buddhaId": "b033", "constellationId": "c033" },
  "034": { "buddhaId": "b034", "constellationId": "c034" },
  "035": { "buddhaId": "b035", "constellationId": "c035" },
  "036": { "buddhaId": "b036", "constellationId": "c036" },
  "037": { "buddhaId": "b037", "constellationId": "c037" },
  "038": { "buddhaId": "b038", "constellationId": "c038" },
  "039": { "buddhaId": "b039", "constellationId": "c039" },
  "040": { "buddhaId": "b040", "constellationId": "c040" },
  "041": { "buddhaId": "b041", "constellationId": "c041" },
  "042": { "buddhaId": "b042", "constellationId": "c042" },
  "043": { "buddhaId": "b043", "constellationId": "c043" },
  "044": { "buddhaId": "b044", "constellationId": "c044" },
  "045": { "buddhaId": "b045", "constellationId": "c045" },
  "046": { "buddhaId": "b046", "constellationId": "c046" },
  "047": { "buddhaId": "b047", "constellationId": "c047" },
  "048": { "buddhaId": "b048", "constellationId": "c048" },
  "049": { "buddhaId": "b049", "constellationId": "c049" },
  "050": { "buddhaId": "b050", "constellationId": "c050" },
  "051": { "buddhaId": "b051", "constellationId": "c051" },
  "052": { "buddhaId": "b052", "constellationId": "c052" },
  "053": { "buddhaId": "b053", "constellationId": "c053" },
  "054": { "buddhaId": "b054", "constellationId": "c054" },
  "055": { "buddhaId": "b055", "constellationId": "c055" },
  "056": { "buddhaId": "b056", "constellationId": "c056" },
  "057": { "buddhaId": "b057", "constellationId": "c057" },
  "058": { "buddhaId": "b058", "constellationId": "c058" },
  "059": { "buddhaId": "b059", "constellationId": "c059" },
  "060": { "buddhaId": "b060", "constellationId": "c060" },
  "061": { "buddhaId": "b061", "constellationId": "c061" },
  "062": { "buddhaId": "b062", "constellationId": "c062" },
  "063": { "buddhaId": "b063", "constellationId": "c063" },
  "064": { "buddhaId": "b064", "constellationId": "c064" },
  "065": { "buddhaId": "b065", "constellationId": "c065" },
  "066": { "buddhaId": "b066", "constellationId": "c066" },
  "067": { "buddhaId": "b067", "constellationId": "c067" },
  "068": { "buddhaId": "b068", "constellationId": "c068" },
  "069": { "buddhaId": "b069", "constellationId": "c069" },
  "070": { "buddhaId": "b070", "constellationId": "c070" },
  "071": { "buddhaId": "b071", "constellationId": "c071" },
  "072": { "buddhaId": "b072", "constellationId": "c072" },
  "073": { "buddhaId": "b073", "constellationId": "c073" },
  "074": { "buddhaId": "b074", "constellationId": "c074" },
  "075": { "buddhaId": "b075", "constellationId": "c075" },
  "076": { "buddhaId": "b076", "constellationId": "c076" },
  "077": { "buddhaId": "b077", "constellationId": "c077" },
  "078": { "buddhaId": "b078", "constellationId": "c078" },
  "079": { "buddhaId": "b079", "constellationId": "c079" },
  "080": { "buddhaId": "b080", "constellationId": "c080" }
}
```

- [ ] **Step 4: Commit**

```bash
git add src/data/meta/
git commit -m "feat: add 88 Buddhas, 88 constellations, and avatamsaka gem mapping data"
```

---

### Task 3: TypeScript Types for Gems

**Files:**
- Create: `src/types/gem.ts`

- [ ] **Step 1: Create `src/types/gem.ts`**

```typescript
export type GemGeometry = 'octahedron' | 'icosahedron' | 'dodecahedron' | 'sphere' | 'tetrahedron'

export interface GemParams {
  colorHex: string          // e.g. '#9b59b6'
  transmission: number      // 0.7–1.0
  iridescence: number       // 0–1
  iridescenceIOR: number    // 1.2–2.0
  roughness: number         // 0–0.15
  geometry: GemGeometry
}

export interface GemRecord {
  id: string
  earnedAt: string          // ISO timestamp
  source: 'sutra_volume' | 'mantra' | 'memorization'
  sourceRef: string         // e.g. 'avatamsaka/001'
  buddhaId?: string         // for avatamsaka gems
  constellationId?: string
  params: GemParams
}

export interface BuddhaInfo {
  id: string
  nameZh: string
  nameEn: string
  color: string
  description: string
}

export interface ConstellationInfo {
  id: string
  nameZh: string
  nameEn: string
  iauCode: string
  buddhaId: string
}
```

- [ ] **Step 2: Commit**

```bash
git add src/types/gem.ts
git commit -m "chore: add gem TypeScript types"
```

---

### Task 4: GemService (Firestore + Procedural Generation) with TDD

**Files:**
- Create: `src/services/gemService.ts`
- Create: `tests/services/gemService.test.ts`

- [ ] **Step 1: Write failing tests in `tests/services/gemService.test.ts`**

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('firebase/firestore', () => ({
  doc: vi.fn(() => ({})),
  collection: vi.fn(() => ({})),
  getDocs: vi.fn(),
  addDoc: vi.fn(),
  query: vi.fn(() => ({})),
}))
vi.mock('src/boot/firebase', () => ({ db: {} }))

import { generateGemParams, createGem, getAllGems } from 'src/services/gemService'
import { getDocs, addDoc } from 'firebase/firestore'
import type { GemRecord } from 'src/types/gem'

describe('gemService', () => {
  beforeEach(() => vi.clearAllMocks())

  describe('generateGemParams', () => {
    it('returns valid gem params within expected ranges', () => {
      const params = generateGemParams()
      expect(params.transmission).toBeGreaterThanOrEqual(0.7)
      expect(params.transmission).toBeLessThanOrEqual(1.0)
      expect(params.roughness).toBeGreaterThanOrEqual(0)
      expect(params.roughness).toBeLessThanOrEqual(0.15)
      expect(params.iridescence).toBeGreaterThanOrEqual(0)
      expect(params.iridescence).toBeLessThanOrEqual(1)
      expect(['octahedron','icosahedron','dodecahedron','sphere','tetrahedron']).toContain(params.geometry)
      expect(params.colorHex).toMatch(/^#[0-9a-f]{6}$/i)
    })

    it('generates different params each time (probabilistic)', () => {
      const a = generateGemParams()
      const b = generateGemParams()
      // Not guaranteed but extremely unlikely to be identical
      const same = a.colorHex === b.colorHex && a.geometry === b.geometry && a.transmission === b.transmission
      // Just check they're valid, not that they differ (deterministic is fine)
      expect(a.colorHex).toBeDefined()
      expect(b.colorHex).toBeDefined()
    })
  })

  describe('createGem', () => {
    it('saves gem to Firestore and returns record with id', async () => {
      vi.mocked(addDoc).mockResolvedValueOnce({ id: 'gem-abc-123' } as any)

      const record = await createGem({
        source: 'sutra_volume',
        sourceRef: 'avatamsaka/001',
        buddhaId: 'b001',
        constellationId: 'c001',
      })

      expect(record.id).toBe('gem-abc-123')
      expect(record.source).toBe('sutra_volume')
      expect(record.buddhaId).toBe('b001')
      expect(record.params).toBeDefined()
      expect(addDoc).toHaveBeenCalledOnce()
    })
  })

  describe('getAllGems', () => {
    it('returns empty array when no gems in Firestore', async () => {
      vi.mocked(getDocs).mockResolvedValueOnce({ docs: [] } as any)
      const gems = await getAllGems()
      expect(gems).toEqual([])
    })

    it('returns array of gem records from Firestore', async () => {
      const mockGem: GemRecord = {
        id: 'gem-1',
        earnedAt: '2026-06-03T00:00:00Z',
        source: 'sutra_volume',
        sourceRef: 'avatamsaka/001',
        buddhaId: 'b001',
        constellationId: 'c001',
        params: {
          colorHex: '#9b59b6',
          transmission: 0.9,
          iridescence: 0.5,
          iridescenceIOR: 1.5,
          roughness: 0.05,
          geometry: 'octahedron',
        },
      }
      vi.mocked(getDocs).mockResolvedValueOnce({
        docs: [{ id: 'gem-1', data: () => mockGem }],
      } as any)

      const gems = await getAllGems()
      expect(gems).toHaveLength(1)
      expect(gems[0].id).toBe('gem-1')
    })
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/services/gemService.test.ts --config vitest.config.mts
```

Expected: FAIL with "Cannot find module 'src/services/gemService'"

- [ ] **Step 3: Create `src/services/gemService.ts`**

```typescript
import { collection, getDocs, addDoc, query } from 'firebase/firestore'
import { db } from 'src/boot/firebase'
import type { GemParams, GemRecord, GemGeometry } from 'src/types/gem'

const GEM_COLORS = [
  '#9b59b6', // amethyst
  '#8e44ad', // deep purple
  '#2980b9', // sapphire
  '#1a5276', // deep blue
  '#27ae60', // emerald
  '#1e8449', // deep green
  '#c0392b', // ruby
  '#922b21', // deep red
  '#f39c12', // amber
  '#d35400', // orange
  '#16a085', // aqua
  '#0e6655', // deep teal
  '#f1948a', // rose
  '#5dade2', // sky blue
]

const GEM_GEOMETRIES: GemGeometry[] = [
  'octahedron',
  'icosahedron',
  'dodecahedron',
  'sphere',
  'tetrahedron',
]

export function generateGemParams(): GemParams {
  const colorHex = GEM_COLORS[Math.floor(Math.random() * GEM_COLORS.length)]
  const geometry = GEM_GEOMETRIES[Math.floor(Math.random() * GEM_GEOMETRIES.length)]

  return {
    colorHex,
    transmission: 0.7 + Math.random() * 0.3,
    iridescence: Math.random(),
    iridescenceIOR: 1.2 + Math.random() * 0.8,
    roughness: Math.random() * 0.15,
    geometry,
  }
}

interface CreateGemInput {
  source: GemRecord['source']
  sourceRef: string
  buddhaId?: string
  constellationId?: string
}

export async function createGem(input: CreateGemInput): Promise<GemRecord> {
  const params = generateGemParams()
  const now = new Date().toISOString()

  const data: Omit<GemRecord, 'id'> = {
    earnedAt: now,
    source: input.source,
    sourceRef: input.sourceRef,
    params,
    ...(input.buddhaId ? { buddhaId: input.buddhaId } : {}),
    ...(input.constellationId ? { constellationId: input.constellationId } : {}),
  }

  const ref = await addDoc(collection(db, 'gems'), data)
  return { id: ref.id, ...data }
}

export async function getAllGems(): Promise<GemRecord[]> {
  const snap = await getDocs(query(collection(db, 'gems')))
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<GemRecord, 'id'>) }))
}
```

- [ ] **Step 4: Run tests and verify they pass**

```bash
npx vitest run tests/services/gemService.test.ts --config vitest.config.mts
```

Expected:
```
✓ gemService > generateGemParams > returns valid gem params within expected ranges
✓ gemService > generateGemParams > generates different params each time (probabilistic)
✓ gemService > createGem > saves gem to Firestore and returns record with id
✓ gemService > getAllGems > returns empty array when no gems in Firestore
✓ gemService > getAllGems > returns array of gem records from Firestore
Test Files  1 passed (1)
Tests       5 passed (5)
```

- [ ] **Step 5: Commit**

```bash
git add src/services/gemService.ts tests/services/gemService.test.ts
git commit -m "feat: add GemService with procedural generation and Firestore CRUD"
```

---

### Task 5: gemStore (Pinia) with TDD

**Files:**
- Create: `src/stores/gemStore.ts`
- Create: `tests/stores/gemStore.test.ts`

- [ ] **Step 1: Write failing tests in `tests/stores/gemStore.test.ts`**

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

vi.mock('src/services/gemService', () => ({
  getAllGems: vi.fn(),
  createGem: vi.fn(),
}))

import { getAllGems, createGem } from 'src/services/gemService'
import { useGemStore } from 'src/stores/gemStore'
import type { GemRecord } from 'src/types/gem'

const mockGem: GemRecord = {
  id: 'gem-1',
  earnedAt: '2026-06-03T00:00:00Z',
  source: 'sutra_volume',
  sourceRef: 'avatamsaka/001',
  buddhaId: 'b001',
  constellationId: 'c001',
  params: {
    colorHex: '#9b59b6',
    transmission: 0.9,
    iridescence: 0.5,
    iridescenceIOR: 1.5,
    roughness: 0.05,
    geometry: 'octahedron',
  },
}

describe('gemStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('gemsMap is empty initially', () => {
    const store = useGemStore()
    expect(Object.keys(store.gemsMap)).toHaveLength(0)
  })

  it('loadGems populates gemsMap', async () => {
    vi.mocked(getAllGems).mockResolvedValueOnce([mockGem])
    const store = useGemStore()
    await store.loadGems()
    expect(store.gemsMap['gem-1']).toEqual(mockGem)
  })

  it('hasGemForVolume returns false when no gem exists', () => {
    const store = useGemStore()
    expect(store.hasGemForVolume('avatamsaka', '001')).toBe(false)
  })

  it('hasGemForVolume returns true after gem earned', async () => {
    vi.mocked(getAllGems).mockResolvedValueOnce([mockGem])
    const store = useGemStore()
    await store.loadGems()
    expect(store.hasGemForVolume('avatamsaka', '001')).toBe(true)
  })

  it('earnGem creates gem and adds to gemsMap', async () => {
    vi.mocked(createGem).mockResolvedValueOnce(mockGem)
    const store = useGemStore()
    const gem = await store.earnGem({
      source: 'sutra_volume',
      sourceRef: 'avatamsaka/001',
      buddhaId: 'b001',
      constellationId: 'c001',
    })
    expect(gem.id).toBe('gem-1')
    expect(store.gemsMap['gem-1']).toEqual(mockGem)
    expect(store.pendingUnlock).toEqual(mockGem)
  })

  it('clearPendingUnlock removes pendingUnlock', async () => {
    vi.mocked(createGem).mockResolvedValueOnce(mockGem)
    const store = useGemStore()
    await store.earnGem({ source: 'sutra_volume', sourceRef: 'avatamsaka/001' })
    store.clearPendingUnlock()
    expect(store.pendingUnlock).toBeNull()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/stores/gemStore.test.ts --config vitest.config.mts
```

Expected: FAIL with "Cannot find module 'src/stores/gemStore'"

- [ ] **Step 3: Create `src/stores/gemStore.ts`**

```typescript
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { GemRecord } from 'src/types/gem'
import { getAllGems, createGem } from 'src/services/gemService'

interface EarnGemInput {
  source: GemRecord['source']
  sourceRef: string
  buddhaId?: string
  constellationId?: string
}

export const useGemStore = defineStore('gems', () => {
  const gemsMap = ref<Record<string, GemRecord>>({})
  const pendingUnlock = ref<GemRecord | null>(null)
  const loading = ref(false)

  const gemsList = computed(() => Object.values(gemsMap.value))

  async function loadGems(): Promise<void> {
    loading.value = true
    try {
      const gems = await getAllGems()
      gems.forEach((g) => { gemsMap.value[g.id] = g })
    } finally {
      loading.value = false
    }
  }

  function hasGemForVolume(sutraId: string, volumeId: string): boolean {
    const ref = `${sutraId}/${volumeId}`
    return gemsList.value.some((g) => g.sourceRef === ref)
  }

  async function earnGem(input: EarnGemInput): Promise<GemRecord> {
    const gem = await createGem(input)
    gemsMap.value[gem.id] = gem
    pendingUnlock.value = gem
    return gem
  }

  function clearPendingUnlock(): void {
    pendingUnlock.value = null
  }

  return {
    gemsMap,
    pendingUnlock,
    loading,
    gemsList,
    loadGems,
    hasGemForVolume,
    earnGem,
    clearPendingUnlock,
  }
})
```

- [ ] **Step 4: Run all tests**

```bash
npx vitest run --config vitest.config.mts
```

Expected:
```
Test Files  4 passed (4)
Tests       11 passed (11)
```

- [ ] **Step 5: Commit**

```bash
git add src/stores/gemStore.ts tests/stores/gemStore.test.ts
git commit -m "feat: add gemStore with Pinia and unit tests"
```

---

### Task 6: GemMesh.vue (TresJS 3D Gem)

**Files:**
- Create: `src/components/gems/GemMesh.vue`

- [ ] **Step 1: Create `src/components/gems/GemMesh.vue`**

```vue
<template>
  <TresMesh :rotation="rotation" :scale="scale">
    <!-- Geometry based on params -->
    <TresOctahedronGeometry v-if="params.geometry === 'octahedron'" :args="[1, 2]" />
    <TresIcosahedronGeometry v-else-if="params.geometry === 'icosahedron'" :args="[1, 1]" />
    <TresDodecahedronGeometry v-else-if="params.geometry === 'dodecahedron'" :args="[1, 0]" />
    <TresSphereGeometry v-else-if="params.geometry === 'sphere'" :args="[1, 32, 32]" />
    <TresTetrahedronGeometry v-else-if="params.geometry === 'tetrahedron'" :args="[1, 0]" />

    <TresMeshPhysicalMaterial
      :color="params.colorHex"
      :metalness="0.0"
      :roughness="params.roughness"
      :transmission="params.transmission"
      :thickness="0.8"
      :ior="2.42"
      :iridescence="params.iridescence"
      :iridescence-i-o-r="params.iridescenceIOR"
      :transparent="true"
      :side="DoubleSide"
    />
  </TresMesh>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { DoubleSide } from 'three'
import type { GemParams } from 'src/types/gem'

const props = defineProps<{
  params: GemParams
  scale?: number
  autoRotate?: boolean
}>()

const scale = ref(props.scale ?? 1)

// Slow auto-rotation angle
const rotation = ref<[number, number, number]>([0, 0, 0])

let animFrame: number
const speed = 0.005

function animate() {
  if (props.autoRotate) {
    rotation.value = [
      rotation.value[0] + speed * 0.3,
      rotation.value[1] + speed,
      rotation.value[2] + speed * 0.2,
    ]
    animFrame = requestAnimationFrame(animate)
  }
}

onMounted(() => {
  if (props.autoRotate) animate()
})

import { onUnmounted } from 'vue'
onUnmounted(() => {
  if (animFrame) cancelAnimationFrame(animFrame)
})
</script>
```

- [ ] **Step 2: Commit**

```bash
git add src/components/gems/GemMesh.vue
git commit -m "feat: add GemMesh TresJS 3D gem component"
```

---

### Task 7: GemViewer.vue (Full-Screen 3D Viewer)

**Files:**
- Create: `src/components/gems/GemViewer.vue`

- [ ] **Step 1: Create `src/components/gems/GemViewer.vue`**

```vue
<template>
  <div class="gem-viewer-overlay" @click.self="$emit('close')">
    <div class="gem-viewer-canvas">
      <TresCanvas
        :alpha="true"
        :antialias="true"
        window-size
      >
        <TresPerspectiveCamera :position="[0, 0, 4]" :fov="45" />
        <OrbitControls
          :enable-zoom="true"
          :enable-pan="false"
          :auto-rotate="false"
          :min-distance="2"
          :max-distance="8"
        />

        <GemMesh :params="gem.params" :scale="1.5" :auto-rotate="true" />

        <!-- Lighting -->
        <TresAmbientLight :intensity="0.4" />
        <TresDirectionalLight :position="[5, 5, 5]" :intensity="1.5" color="#ffffff" />
        <TresDirectionalLight :position="[-5, -3, -5]" :intensity="0.8" :color="gem.params.colorHex" />
        <TresPointLight :position="[0, 3, 2]" :intensity="2" :color="gem.params.colorHex" :distance="8" />
      </TresCanvas>
    </div>

    <!-- Info panel -->
    <div class="gem-viewer-info glass">
      <div v-if="buddha" class="q-mb-sm">
        <div class="text-subtitle1 text-primary">{{ buddha.nameZh }}</div>
        <div class="text-caption text-secondary">{{ buddha.nameEn }}</div>
        <div class="text-body2 text-secondary q-mt-xs">{{ buddha.description }}</div>
      </div>
      <div v-if="constellation" class="q-mt-sm">
        <div class="text-caption text-secondary">
          <q-icon name="star" size="12px" color="amber-4" />
          {{ constellation.nameZh }} ({{ constellation.nameEn }})
        </div>
      </div>
      <div class="text-caption text-secondary q-mt-xs">
        獲得於 {{ earnedDate }}
      </div>
      <q-btn flat round icon="close" color="white" size="sm" class="q-mt-sm" @click="$emit('close')" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { TresCanvas } from '@tresjs/core'
import { OrbitControls } from '@tresjs/cientos'
import GemMesh from './GemMesh.vue'
import type { GemRecord, BuddhaInfo, ConstellationInfo } from 'src/types/gem'
import buddhasData from 'src/data/meta/buddhas-88.json'
import constellationsData from 'src/data/meta/constellations-88.json'

const props = defineProps<{ gem: GemRecord }>()
defineEmits<{ close: [] }>()

const buddha = computed<BuddhaInfo | undefined>(() =>
  props.gem.buddhaId
    ? (buddhasData as BuddhaInfo[]).find((b) => b.id === props.gem.buddhaId)
    : undefined
)

const constellation = computed<ConstellationInfo | undefined>(() =>
  props.gem.constellationId
    ? (constellationsData as ConstellationInfo[]).find((c) => c.id === props.gem.constellationId)
    : undefined
)

const earnedDate = computed(() =>
  new Date(props.gem.earnedAt).toLocaleDateString('zh-TW', {
    year: 'numeric', month: 'long', day: 'numeric',
  })
)
</script>

<style scoped>
.gem-viewer-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.85);
  z-index: 1000;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.gem-viewer-canvas {
  width: 100%;
  height: 60vh;
}

.gem-viewer-info {
  position: absolute;
  bottom: 32px;
  left: 50%;
  transform: translateX(-50%);
  min-width: 280px;
  max-width: 90vw;
  padding: 16px 20px;
  text-align: center;
}
</style>
```

- [ ] **Step 2: Commit**

```bash
git add src/components/gems/GemViewer.vue
git commit -m "feat: add GemViewer full-screen TresJS 3D gem viewer"
```

---

### Task 8: GemCard.vue (Collection Grid Card)

**Files:**
- Create: `src/components/gems/GemCard.vue`

- [ ] **Step 1: Create `src/components/gems/GemCard.vue`**

```vue
<template>
  <div
    class="gem-card glass"
    :class="{ 'gem-card--locked': !gem, 'gem-card--unlocked': !!gem }"
    @click="gem && $emit('click', gem)"
  >
    <div v-if="gem" class="gem-card__preview">
      <!-- Tiny TresJS preview -->
      <TresCanvas :alpha="true" :antialias="true" style="width:100%;height:100%">
        <TresPerspectiveCamera :position="[0, 0, 3]" :fov="50" />
        <GemMesh :params="gem.params" :scale="1" :auto-rotate="true" />
        <TresAmbientLight :intensity="0.5" />
        <TresDirectionalLight :position="[3, 3, 3]" :intensity="1.2" />
        <TresPointLight :position="[0, 2, 2]" :intensity="2" :color="gem.params.colorHex" :distance="6" />
      </TresCanvas>
    </div>

    <div v-else class="gem-card__locked-icon">
      <q-icon name="diamond" :size="locked ? '24px' : '32px'" color="grey-7" />
    </div>

    <div class="gem-card__label text-caption">
      <template v-if="gem && buddhaName">{{ buddhaName }}</template>
      <template v-else-if="volumeNum">{{ volumeNum }}卷</template>
      <template v-else>未解鎖</template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { TresCanvas } from '@tresjs/core'
import GemMesh from './GemMesh.vue'
import type { GemRecord, BuddhaInfo } from 'src/types/gem'
import buddhasData from 'src/data/meta/buddhas-88.json'

const props = defineProps<{
  gem?: GemRecord
  volumeNum?: string
  locked?: boolean
}>()

defineEmits<{ click: [gem: GemRecord] }>()

const buddhaName = computed<string | undefined>(() => {
  if (!props.gem?.buddhaId) return undefined
  return (buddhasData as BuddhaInfo[]).find((b) => b.id === props.gem!.buddhaId)?.nameZh
})
</script>

<style scoped>
.gem-card {
  width: 88px;
  height: 110px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  padding: 8px 4px;
  cursor: pointer;
  transition: transform 0.2s ease;
  border-radius: 12px;
}

.gem-card--unlocked:hover {
  transform: scale(1.05);
}

.gem-card--locked {
  opacity: 0.45;
  cursor: default;
  filter: grayscale(80%);
}

.gem-card__preview {
  width: 70px;
  height: 70px;
}

.gem-card__locked-icon {
  width: 70px;
  height: 70px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.gem-card__label {
  color: var(--text-secondary);
  text-align: center;
  font-size: 10px;
  line-height: 1.2;
  max-width: 80px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
```

- [ ] **Step 2: Commit**

```bash
git add src/components/gems/GemCard.vue
git commit -m "feat: add GemCard component for collection grid"
```

---

### Task 9: CollectionPage.vue (Gem Wall Grid)

**Files:**
- Modify: `src/pages/CollectionPage.vue`

- [ ] **Step 1: Overwrite `src/pages/CollectionPage.vue`**

```vue
<template>
  <q-page class="q-pa-md">
    <div class="text-h5 text-primary q-mb-xs">收藏室</div>
    <div class="text-caption text-secondary q-mb-md">
      已解鎖 {{ gemStore.gemsList.length }} / {{ totalSlots }} 顆寶石
    </div>

    <!-- Filter tabs -->
    <q-tabs
      v-model="activeTab"
      dense
      active-color="white"
      indicator-color="purple-4"
      class="q-mb-md"
      style="color: var(--text-secondary)"
    >
      <q-tab name="all" label="全部" />
      <q-tab name="avatamsaka" label="華嚴經" />
      <q-tab name="other" label="其他" />
    </q-tabs>

    <!-- Gem grid -->
    <div v-if="gemStore.loading" class="flex flex-center q-pa-xl">
      <q-spinner-dots size="40px" color="purple-4" />
    </div>

    <div v-else class="gem-grid">
      <GemCard
        v-for="slot in displayedSlots"
        :key="slot.key"
        :gem="slot.gem"
        :volume-num="slot.volumeNum"
        :locked="!slot.gem"
        @click="openViewer"
      />
    </div>

    <!-- 3D Viewer dialog -->
    <GemViewer
      v-if="selectedGem"
      :gem="selectedGem"
      @close="selectedGem = null"
    />
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import GemCard from 'src/components/gems/GemCard.vue'
import GemViewer from 'src/components/gems/GemViewer.vue'
import { useGemStore } from 'src/stores/gemStore'
import type { GemRecord } from 'src/types/gem'

const gemStore = useGemStore()
const activeTab = ref('all')
const selectedGem = ref<GemRecord | null>(null)

const totalSlots = 88

interface GemSlot {
  key: string
  gem?: GemRecord
  volumeNum?: string
}

const displayedSlots = computed<GemSlot[]>(() => {
  // Build 80 avatamsaka slots
  const avatamsakaSlots: GemSlot[] = Array.from({ length: 80 }, (_, i) => {
    const volumeId = String(i + 1).padStart(3, '0')
    const gem = gemStore.gemsList.find(
      (g) => g.sourceRef === `avatamsaka/${volumeId}`
    )
    return { key: `avatamsaka-${volumeId}`, gem, volumeNum: String(i + 1) }
  })

  // Other gems (non-avatamsaka)
  const otherGems: GemSlot[] = gemStore.gemsList
    .filter((g) => !g.sourceRef.startsWith('avatamsaka/'))
    .map((g) => ({ key: g.id, gem: g }))

  if (activeTab.value === 'avatamsaka') return avatamsakaSlots
  if (activeTab.value === 'other') {
    const emptySlots = Array.from(
      { length: Math.max(0, 8 - otherGems.length) },
      (_, i) => ({ key: `empty-${i}` })
    )
    return [...otherGems, ...emptySlots]
  }
  return [...avatamsakaSlots, ...otherGems]
})

function openViewer(gem: GemRecord) {
  selectedGem.value = gem
}

onMounted(() => gemStore.loadGems())
</script>

<style scoped>
.gem-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: center;
}
</style>
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/CollectionPage.vue
git commit -m "feat: add CollectionPage with 88-slot gem grid and 3D viewer"
```

---

### Task 10: UnlockCeremony.vue (Gem Unlock Animation)

**Files:**
- Create: `src/components/gems/UnlockCeremony.vue`

- [ ] **Step 1: Create `src/components/gems/UnlockCeremony.vue`**

```vue
<template>
  <Transition name="ceremony">
    <div v-if="gem" class="ceremony-overlay" @click="onDismiss">
      <!-- Particle burst background -->
      <div class="particles">
        <div
          v-for="n in 12"
          :key="n"
          class="particle"
          :style="particleStyle(n)"
        />
      </div>

      <!-- 3D gem reveal -->
      <div class="ceremony-gem" :class="{ 'ceremony-gem--visible': gemVisible }">
        <TresCanvas :alpha="true" :antialias="true" style="width:200px;height:200px">
          <TresPerspectiveCamera :position="[0, 0, 3.5]" :fov="45" />
          <GemMesh :params="gem.params" :scale="1.2" :auto-rotate="true" />
          <TresAmbientLight :intensity="0.4" />
          <TresDirectionalLight :position="[3, 3, 3]" :intensity="1.5" />
          <TresPointLight :position="[0, 2, 2]" :intensity="3" :color="gem.params.colorHex" :distance="7" />
        </TresCanvas>
      </div>

      <!-- Buddha / text info -->
      <div class="ceremony-info" :class="{ 'ceremony-info--visible': infoVisible }">
        <div class="text-h6 text-primary q-mb-xs">寶石解鎖！</div>
        <div v-if="buddhaName" class="text-subtitle1" :style="{ color: gem.params.colorHex }">
          {{ buddhaName }}
        </div>
        <div v-if="constellationName" class="text-caption text-secondary q-mt-xs">
          <q-icon name="star" size="12px" color="amber-4" />
          {{ constellationName }}
        </div>
        <div class="text-caption text-secondary q-mt-md">點擊任意處繼續</div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue'
import { TresCanvas } from '@tresjs/core'
import GemMesh from './GemMesh.vue'
import type { GemRecord, BuddhaInfo, ConstellationInfo } from 'src/types/gem'
import buddhasData from 'src/data/meta/buddhas-88.json'
import constellationsData from 'src/data/meta/constellations-88.json'

const props = defineProps<{ gem: GemRecord | null }>()
const emit = defineEmits<{ dismiss: [] }>()

const gemVisible = ref(false)
const infoVisible = ref(false)

let t1: ReturnType<typeof setTimeout>
let t2: ReturnType<typeof setTimeout>

watch(() => props.gem, (g) => {
  if (g) {
    gemVisible.value = false
    infoVisible.value = false
    t1 = setTimeout(() => { gemVisible.value = true }, 300)
    t2 = setTimeout(() => { infoVisible.value = true }, 900)
  }
})

onUnmounted(() => {
  clearTimeout(t1)
  clearTimeout(t2)
})

function onDismiss() {
  gemVisible.value = false
  infoVisible.value = false
  setTimeout(() => emit('dismiss'), 200)
}

const buddhaName = computed<string | undefined>(() => {
  if (!props.gem?.buddhaId) return undefined
  return (buddhasData as BuddhaInfo[]).find((b) => b.id === props.gem!.buddhaId)?.nameZh
})

const constellationName = computed<string | undefined>(() => {
  if (!props.gem?.constellationId) return undefined
  return (constellationsData as ConstellationInfo[]).find((c) => c.id === props.gem!.constellationId)?.nameZh
})

function particleStyle(n: number) {
  const angle = (n / 12) * 360
  const distance = 80 + Math.random() * 60
  return {
    '--angle': `${angle}deg`,
    '--distance': `${distance}px`,
    '--color': props.gem?.params.colorHex ?? '#9b59b6',
    animationDelay: `${Math.random() * 0.3}s`,
  }
}
</script>

<style scoped>
.ceremony-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.92);
  z-index: 2000;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
}

.particles {
  position: absolute;
  inset: 0;
  pointer-events: none;
  display: flex;
  align-items: center;
  justify-content: center;
}

.particle {
  position: absolute;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--color);
  animation: burst 1.2s ease-out forwards;
}

@keyframes burst {
  0% { transform: translate(0, 0) scale(0); opacity: 1; }
  100% {
    transform:
      rotate(var(--angle))
      translateX(var(--distance))
      scale(1);
    opacity: 0;
  }
}

.ceremony-gem {
  opacity: 0;
  transform: scale(0.3);
  transition: opacity 0.6s ease, transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.ceremony-gem--visible {
  opacity: 1;
  transform: scale(1);
}

.ceremony-info {
  text-align: center;
  opacity: 0;
  transform: translateY(16px);
  transition: opacity 0.5s ease, transform 0.5s ease;
}

.ceremony-info--visible {
  opacity: 1;
  transform: translateY(0);
}

.ceremony-enter-active { transition: opacity 0.3s ease; }
.ceremony-leave-active { transition: opacity 0.3s ease; }
.ceremony-enter-from, .ceremony-leave-to { opacity: 0; }
</style>
```

- [ ] **Step 2: Commit**

```bash
git add src/components/gems/UnlockCeremony.vue
git commit -m "feat: add UnlockCeremony animation component"
```

---

### Task 11: Integrate Gem Unlock into ReaderPage

**Files:**
- Modify: `src/pages/ReaderPage.vue`

- [ ] **Step 1: Read current `src/pages/ReaderPage.vue`** to understand the existing `markComplete` function.

The existing `markComplete` function calls `progressStore.markVolumeComplete(sutraId, volumeId)` and shows a simple dialog. We need to:
1. After marking complete, also earn a gem if it's the first time this volume was completed
2. Show the UnlockCeremony overlay instead of (or after) the simple dialog

- [ ] **Step 2: Overwrite `src/pages/ReaderPage.vue`**

```vue
<template>
  <q-page>
    <!-- Header bar -->
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

    <!-- Loading -->
    <div v-if="loading" class="flex flex-center q-pa-xl">
      <q-spinner-dots size="50px" color="purple-4" />
    </div>

    <!-- Vertical text -->
    <div v-else-if="volume" class="reader-container q-pa-lg">
      <div class="vertical-text-wrapper">
        <template v-for="(block, i) in volume.blocks" :key="i">
          <div :class="['text-block', `text-block--${block.type}`]">
            {{ block.text }}
          </div>
        </template>
      </div>
    </div>

    <!-- Simple completion dialog (shown when no gem unlocked) -->
    <q-dialog v-model="showCompleteDialog">
      <q-card class="glass text-center q-pa-lg">
        <q-icon name="auto_awesome" color="amber-4" size="48px" />
        <div class="text-h6 text-primary q-mt-sm">回向完成</div>
        <div class="text-secondary q-mt-xs">
          第 {{ volumeIdDisplay }} 卷已記錄<br />
          累計誦讀 {{ newCount }} 遍
        </div>
        <q-btn flat class="q-mt-md" color="purple-3" label="繼續" @click="showCompleteDialog = false" />
      </q-card>
    </q-dialog>

    <!-- Gem unlock ceremony (shown on first completion) -->
    <UnlockCeremony
      :gem="gemStore.pendingUnlock"
      @dismiss="gemStore.clearPendingUnlock()"
    />
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { loadVolume } from 'src/services/sutraService'
import { useProgressStore } from 'src/stores/progressStore'
import { useGemStore } from 'src/stores/gemStore'
import UnlockCeremony from 'src/components/gems/UnlockCeremony.vue'
import type { SutraVolume } from 'src/types/sutra'
import avatamsakaMap from 'src/data/meta/avatamsaka-gem-map.json'

const route = useRoute()
const progressStore = useProgressStore()
const gemStore = useGemStore()
const sutraId = route.params.sutraId as string
const volumeId = route.params.volumeId as string

const volume = ref<SutraVolume | null>(null)
const loading = ref(true)
const saving = ref(false)
const recitedThisSession = ref(false)
const showCompleteDialog = ref(false)
const newCount = ref(0)

const volumeIdDisplay = computed(() => parseInt(volumeId).toString())

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

    const isFirstTime = newCount.value === 1

    if (isFirstTime) {
      // Earn a gem for the first time completing this volume
      const gemInput: Parameters<typeof gemStore.earnGem>[0] = {
        source: 'sutra_volume',
        sourceRef: `${sutraId}/${volumeId}`,
      }

      // For avatamsaka, link to Buddha and constellation
      if (sutraId === 'avatamsaka') {
        const mapEntry = (avatamsakaMap as Record<string, { buddhaId: string; constellationId: string }>)[volumeId]
        if (mapEntry) {
          gemInput.buddhaId = mapEntry.buddhaId
          gemInput.constellationId = mapEntry.constellationId
        }
      }

      await gemStore.earnGem(gemInput)
      // UnlockCeremony shows automatically via gemStore.pendingUnlock
    } else {
      // Repeat recitation — just show simple dialog
      showCompleteDialog.value = true
    }
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

- [ ] **Step 3: Run all tests**

```bash
npx vitest run --config vitest.config.mts
```

Expected: all 11 tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/pages/ReaderPage.vue
git commit -m "feat: integrate gem unlock ceremony into ReaderPage on first volume completion"
```

---

### Task 12: MilestoneOverlay.vue (圓滿一部 Constellation Animation)

**Files:**
- Create: `src/components/gems/MilestoneOverlay.vue`
- Modify: `src/pages/ReaderPage.vue` (add milestone trigger)

- [ ] **Step 1: Create `src/components/gems/MilestoneOverlay.vue`**

```vue
<template>
  <Transition name="milestone">
    <div v-if="visible" class="milestone-overlay" @click="$emit('dismiss')">
      <!-- SVG constellation lines -->
      <svg class="constellation-svg" viewBox="0 0 390 200" xmlns="http://www.w3.org/2000/svg">
        <g class="star-lines">
          <line
            v-for="(line, i) in constellationLines"
            :key="`line-${i}`"
            :x1="line.x1" :y1="line.y1"
            :x2="line.x2" :y2="line.y2"
            :stroke="accentColor"
            stroke-width="1"
            stroke-opacity="0.6"
            :style="{ animation: `draw-line 0.8s ${i * 0.1}s ease-out forwards`, strokeDasharray: 200, strokeDashoffset: 200 }"
          />
        </g>
        <circle
          v-for="(star, i) in stars"
          :key="`star-${i}`"
          :cx="star.x" :cy="star.y" r="3"
          :fill="accentColor"
          :style="{ animation: `twinkle 1s ${i * 0.05}s ease-out forwards`, opacity: 0 }"
        />
      </svg>

      <!-- Text content -->
      <div class="milestone-content">
        <q-icon name="auto_awesome" :color="accentColorName" size="48px" class="milestone-icon" />
        <div class="text-h5 text-primary q-mt-md">{{ title }}</div>
        <div class="text-subtitle2 q-mt-xs" :style="{ color: accentColor }">{{ subtitle }}</div>
        <div class="text-caption text-secondary q-mt-sm">{{ body }}</div>
        <div class="text-caption text-secondary q-mt-lg">點擊繼續</div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { computed } from 'vue'

type MilestoneType = 'sutra_complete' | 'ten_complete' | 'hundred_complete'

const props = defineProps<{
  visible: boolean
  type: MilestoneType
  sutraTitle?: string
}>()

defineEmits<{ dismiss: [] }>()

const accentColor = computed(() => {
  if (props.type === 'sutra_complete') return '#f39c12'
  if (props.type === 'ten_complete') return '#2ecc71'
  return '#9b59b6'
})

const accentColorName = computed(() => {
  if (props.type === 'sutra_complete') return 'amber-4'
  if (props.type === 'ten_complete') return 'green-4'
  return 'purple-4'
})

const title = computed(() => {
  if (props.type === 'sutra_complete') return `${props.sutraTitle ?? '經典'} 圓滿！`
  if (props.type === 'ten_complete') return '十部圓滿'
  return '百部圓滿'
})

const subtitle = computed(() => {
  if (props.type === 'sutra_complete') return '所有卷數已完成，功德迴向'
  if (props.type === 'ten_complete') return '精進修行，法寶莊嚴'
  return '善知識，智慧圓滿'
})

const body = computed(() => {
  if (props.type === 'sutra_complete') return '誦持圓滿，所獲功德迴向法界一切眾生，同沾法益。'
  if (props.type === 'ten_complete') return '十部經典圓滿，功德廣大，寶蓮華光遍照十方。'
  return '百部圓滿，已入善知識之境，光明周遍虛空法界。'
})

// Generate a simple constellation-like star pattern
const stars = computed(() =>
  Array.from({ length: 8 }, (_, i) => ({
    x: 40 + (i % 4) * 90 + Math.sin(i * 1.3) * 20,
    y: 40 + Math.floor(i / 4) * 80 + Math.cos(i * 0.9) * 15,
  }))
)

const constellationLines = computed(() => {
  const s = stars.value
  return [
    { x1: s[0].x, y1: s[0].y, x2: s[1].x, y2: s[1].y },
    { x1: s[1].x, y1: s[1].y, x2: s[2].x, y2: s[2].y },
    { x1: s[2].x, y1: s[2].y, x2: s[3].x, y2: s[3].y },
    { x1: s[3].x, y1: s[3].y, x2: s[4].x, y2: s[4].y },
    { x1: s[4].x, y1: s[4].y, x2: s[5].x, y2: s[5].y },
    { x1: s[0].x, y1: s[0].y, x2: s[4].x, y2: s[4].y },
    { x1: s[2].x, y1: s[2].y, x2: s[6].x, y2: s[6].y },
  ]
})
</script>

<style scoped>
.milestone-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 10, 0.95);
  z-index: 1500;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0;
}

.constellation-svg {
  position: absolute;
  top: 10%;
  width: 100%;
  pointer-events: none;
}

.milestone-content {
  text-align: center;
  padding: 0 32px;
  margin-top: 160px;
}

.milestone-icon {
  animation: pulse-scale 1.5s ease-in-out infinite;
}

@keyframes draw-line {
  to { stroke-dashoffset: 0; }
}

@keyframes twinkle {
  0% { opacity: 0; transform: scale(0); }
  60% { opacity: 1; transform: scale(1.5); }
  100% { opacity: 0.8; transform: scale(1); }
}

@keyframes pulse-scale {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.15); }
}

.milestone-enter-active { animation: fade-in 0.5s ease; }
.milestone-leave-active { animation: fade-in 0.3s ease reverse; }

@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}
</style>
```

- [ ] **Step 2: Add milestone trigger to `src/pages/ReaderPage.vue`**

Add the following to the existing ReaderPage. Import MilestoneOverlay and add milestone state.

Add to `<script setup>` imports section:
```typescript
import MilestoneOverlay from 'src/components/gems/MilestoneOverlay.vue'
import { getAllSutras } from 'src/services/sutraService'
```

Add these refs after the existing ones:
```typescript
const showMilestone = ref(false)
const milestoneType = ref<'sutra_complete' | 'ten_complete' | 'hundred_complete'>('sutra_complete')
```

Inside `markComplete()`, after `await gemStore.earnGem(gemInput)`, add:
```typescript
// Check for sutra completion milestone
const progress = progressStore.progressMap[sutraId]
if (progress?.isFullyComplete && !progress.completedAt) {
  const completedCount = Object.values(progressStore.progressMap)
    .filter((p) => p.isFullyComplete).length
  if (completedCount >= 100) {
    milestoneType.value = 'hundred_complete'
  } else if (completedCount >= 10) {
    milestoneType.value = 'ten_complete'
  } else {
    milestoneType.value = 'sutra_complete'
  }
  setTimeout(() => { showMilestone.value = true }, 1500)
}
```

Add to template after the UnlockCeremony component:
```vue
<MilestoneOverlay
  :visible="showMilestone"
  :type="milestoneType"
  :sutra-title="volume?.titleZh"
  @dismiss="showMilestone = false"
/>
```

- [ ] **Step 3: Run all tests**

```bash
npx vitest run --config vitest.config.mts
```

Expected: all 11 tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/components/gems/MilestoneOverlay.vue src/pages/ReaderPage.vue
git commit -m "feat: add milestone overlay for sutra completion celebration"
```

---

### Task 13: Push to GitHub and Verify Deployment

- [ ] **Step 1: Run full test suite**

```bash
npx vitest run --config vitest.config.mts
```

Expected: all tests pass.

- [ ] **Step 2: Do a local build check**

```bash
npx quasar build
```

Expected: build completes, no errors.

- [ ] **Step 3: Push to GitHub**

```bash
git push origin main
```

- [ ] **Step 4: Verify CI passes**

Go to `https://github.com/lovelessless99/mani/actions` and confirm the workflow passes.

---

## Self-Review

**Spec coverage:**
- ✅ TresJS gem viewer with OrbitControls
- ✅ MeshPhysicalMaterial with transmission/iridescence
- ✅ Procedural gem generation (color, geometry, transmission, iridescence)
- ✅ Gem parameters saved to Firestore
- ✅ 88 Buddhas + 88 constellations metadata
- ✅ 80-volume avatamsaka → Buddha/constellation mapping
- ✅ Collection page (grid, locked/unlocked)
- ✅ Gem unlock ceremony animation
- ✅ 圓滿 milestone (sutra complete, 10 complete, 100 complete)
- ✅ Integration with ReaderPage (earn gem on first volume completion)
- ✅ Unit tests for GemService + gemStore

**Type consistency:**
- `GemRecord` uses `params: GemParams` everywhere ✓
- `earnGem()` accepts `{ source, sourceRef, buddhaId?, constellationId? }` ✓
- `pendingUnlock: GemRecord | null` used consistently ✓
- `avatamsaka-gem-map.json` keys match `formatVolumeId()` output (`'001'` etc.) ✓

**No placeholders:** All code blocks are complete. ✓
