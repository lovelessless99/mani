<template>
  <main class="page">
    <header>
      <h1 class="page-title">更多</h1>
      <p class="page-sub">排版 · 筆記 · 設定</p>
    </header>

    <ul class="soon">
      <li v-for="item in planned" :key="item.title">
        <GlassCard>
          <div class="row">
            <AppIcon :name="item.icon" :size="20" class="row__icon" />
            <div class="row__main">
              <h2 class="row__title">{{ item.title }}</h2>
              <p class="row__desc">{{ item.desc }}</p>
            </div>
            <span class="row__tag">籌備中</span>
          </div>
        </GlassCard>
      </li>
    </ul>
  </main>
</template>

<script setup lang="ts">
import GlassCard from 'src/components/GlassCard.vue'
import AppIcon from 'src/components/ui/AppIcon.vue'

const planned = [
  { icon: 'book', title: '印刷排版', desc: '直排 · 注音 · 自訂背景,匯出 PDF' },
  { icon: 'sparkle', title: '聽法筆記', desc: 'YouTube 講經連結與每日打卡' },
  { icon: 'dots', title: '設定', desc: '字級 · 主題 · 資料匯出' },
]
</script>

<style scoped>
.soon {
  list-style: none;
  margin-top: var(--s5);
}

.soon > li + li {
  margin-top: var(--s3);
}

.row {
  display: flex;
  align-items: center;
  gap: var(--s3);
}

.row__icon {
  color: var(--text-faint);
}

.row__main {
  flex: 1;
  min-width: 0;
}

.row__title {
  font-size: var(--text-body);
  font-weight: 400;
  letter-spacing: 0.08em;
}

.row__desc {
  margin-top: 2px;
  font-size: var(--text-micro);
  color: var(--text-faint);
  line-height: 1.6;
}

.row__tag {
  flex-shrink: 0;
  font-size: var(--text-micro);
  letter-spacing: 0.08em;
  color: var(--text-faint);
  padding: 3px var(--s2);
  border-radius: var(--r-full);
  border: 1px solid var(--hairline);
}
</style>
