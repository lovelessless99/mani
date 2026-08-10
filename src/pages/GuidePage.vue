<template>
  <main class="page">
    <header>
      <button class="guide__back" type="button" @click="router.back()">
        <AppIcon name="back" :size="18" /> 返回
      </button>
      <h1 class="page-title">使用指南</h1>
      <p class="page-sub">一部經、一盞燈,日日相續</p>
    </header>

    <section v-for="s in sections" :key="s.title" class="g">
      <div class="g__head">
        <span class="g__glyph">{{ s.glyph }}</span>
        <h2 class="g__title">{{ s.title }}</h2>
      </div>
      <p class="g__lead">{{ s.lead }}</p>
      <ul class="g__list">
        <li v-for="(p, i) in s.points" :key="i">{{ p }}</li>
      </ul>
    </section>

    <!-- 諸天 功德表 -->
    <section class="g">
      <div class="g__head">
        <span class="g__glyph">☁</span>
        <h2 class="g__title">諸天 · 功德登天表</h2>
      </div>
      <p class="g__lead">每誦一遍、背一段皆得一功德。累積功德到門檻,便自然上生;下表為各天所需的累積功德。</p>
      <div class="g__map">
        <div v-for="row in heavenRows" :key="row.i" class="g__row">
          <span class="g__row-idx tnum">{{ row.i }}</span>
          <span class="g__row-name">{{ row.name }}</span>
          <span class="g__row-realm">{{ row.realm }}</span>
          <span class="g__row-merit tnum">{{ row.i === 0 ? '起點' : `${row.merit} 功德` }}</span>
        </div>
      </div>
      <p class="g__note">門檻公式:第 t 天需累積 t×(t+3) 功德。前面來得快,愈高愈是願行。</p>
    </section>

    <p class="guide__foot">南無本師釋迦牟尼佛 · 願以此功德,普及於一切</p>
  </main>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import AppIcon from 'src/components/ui/AppIcon.vue'
import { HEAVENS } from 'src/stores/heavenStore'

const router = useRouter()

const sections = [
  {
    glyph: '☷',
    title: '功課 · 每日誦經',
    lead: '每天抽一次功課籤,翻開任務卡,念畢即 ＋1。逐品逐卷計數,不必整部才算一遍。',
    points: [
      '抽卡:蓋板翻開今日該念的經(十齋日自動指定《地藏經》)。',
      '加分持戒:午後不食、吃素、不食五辛…每日隨手勾選。',
      '每念一遍,累積該經的「精通程度」,也可能解鎖寶石。',
    ],
  },
  {
    glyph: '☰',
    title: '讀經 · 經文庫',
    lead: '直排逐字注音,仿印經本樣式,收錄 18 部經。點章節可直接翻到該處。',
    points: [
      '手機單頁、電腦對開;點右側下一頁、左側上一頁(電腦相反)。',
      '拖曳底部進度條可跳頁;自動記住每一部讀到哪裡。',
      '設定裡可調主題、字體、字級、注音方式。',
    ],
  },
  {
    glyph: '☴',
    title: '背經 · 填空',
    lead: '以句為單位挖空,把字塊填回原文,從記憶中誦出。',
    points: ['可選整部或單一章節;挖一半或挖大半。', '熟練度以星級標示,愈背愈熟。'],
  },
  {
    glyph: '❖',
    title: '收藏 · 寶石',
    lead: '每念一品得一寶石。《華嚴經》八十卷對應八十八佛與星宿,漸次點亮收藏。',
    points: ['寶石可在收藏頁以 3D 檢視。', '集滿一部經的寶石,其護法會來安住你的淨土。'],
  },
  {
    glyph: '☁',
    title: '諸天 · 功德升天',
    lead: '累積功德,漸次上生二十八天,從娑婆穢土直到非想非非想天。',
    points: ['升天完全自動:功德到門檻就上去,不必經營。', '點「第 N 天」可展開諸天圖,回望已歷之天。'],
  },
  {
    glyph: '🪔',
    title: '迴向 · 迴向燈',
    lead: '功德是一種貨幣:誦經得功德,點一盞迴向燈,將功德施與所願之處。',
    points: [
      '選迴向對象(法界眾生、冤親債主、父母師長、自訂…)與迴向偈。',
      '選供養份量(七/四十九/一百零八/全部),點燈即扣功德。',
      '每盞燈留在燈海;可「立願」為某人立下欲迴向的功德數。',
      '迴向不減累積功德,升天不受影響。',
    ],
  },
  {
    glyph: '⎙',
    title: '印刷排版 · 經文輸出',
    lead: '在「更多」裡,可自訂經文、書名、主題與字級,直排注音排版並輸出 PDF / 列印。',
    points: [],
  },
]

const heavenRows = HEAVENS.map((h, i) => ({
  i,
  name: h.name,
  realm: h.realm,
  merit: i * (i + 3),
}))
</script>

<style scoped>
.guide__back {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-bottom: var(--s3);
  font-size: var(--text-caption);
  color: var(--text-faint);
}
.guide__back:hover {
  color: var(--text-dim);
}

.g {
  margin-top: var(--s6);
}
.g__head {
  display: flex;
  align-items: center;
  gap: var(--s3);
}
.g__glyph {
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  border-radius: var(--r-full);
  background: rgba(251, 191, 36, 0.12);
  color: var(--amber);
  font-size: 1rem;
}
.g__title {
  font-size: var(--text-title);
  font-weight: 300;
  letter-spacing: 0.08em;
}
.g__lead {
  margin-top: var(--s3);
  font-size: var(--text-caption);
  line-height: 1.8;
  color: var(--text-dim);
}
.g__list {
  margin-top: var(--s2);
  padding-left: var(--s4);
  list-style: none;
}
.g__list li {
  position: relative;
  margin-top: var(--s2);
  font-size: var(--text-micro);
  line-height: 1.7;
  color: var(--text-faint);
}
.g__list li::before {
  content: '·';
  position: absolute;
  left: calc(-1 * var(--s3));
  color: var(--amber);
}

/* 諸天表 */
.g__map {
  margin-top: var(--s3);
  border-radius: var(--r-md);
  border: 1px solid var(--hairline);
  overflow: hidden;
}
.g__row {
  display: flex;
  align-items: center;
  gap: var(--s3);
  padding: var(--s2) var(--s3);
}
.g__row + .g__row {
  border-top: 1px solid rgba(255, 255, 255, 0.05);
}
.g__row-idx {
  flex-shrink: 0;
  width: 24px;
  text-align: center;
  font-size: var(--text-micro);
  color: var(--text-faint);
}
.g__row-name {
  flex: 1;
  min-width: 0;
  font-family: var(--font-serif);
  font-size: var(--text-caption);
  letter-spacing: 0.04em;
}
.g__row-realm {
  flex-shrink: 0;
  font-size: 10px;
  color: var(--text-faint);
}
.g__row-merit {
  flex-shrink: 0;
  width: 5rem;
  text-align: right;
  font-size: var(--text-micro);
  color: var(--amber);
}
.g__note {
  margin-top: var(--s3);
  font-size: var(--text-micro);
  line-height: 1.7;
  color: var(--text-faint);
}

.guide__foot {
  margin-top: var(--s7);
  text-align: center;
  font-family: var(--font-serif);
  font-size: var(--text-caption);
  letter-spacing: 0.1em;
  color: var(--text-faint);
}
</style>
