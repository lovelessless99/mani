<template>
  <main class="page">
    <header>
      <h1 class="page-title">練習</h1>
      <p class="page-sub">持咒 · 念佛號 · 背經</p>
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
  { icon: 'ripple', title: '持咒', desc: '楞嚴咒 · 大悲咒 · 往生咒 — 圓圈計數與進度環' },
  { icon: 'sparkle', title: '念佛號', desc: '觀世音菩薩 · 地藏王菩薩 — 每尊 108 遍' },
  { icon: 'book', title: '背經', desc: '隨機填空與選擇題,依難度遮蔽經文' },
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
