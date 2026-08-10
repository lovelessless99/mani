<template>
  <main class="page">
    <header>
      <h1 class="page-title">更多</h1>
      <p class="page-sub">排版 · 筆記 · 設定</p>
    </header>

    <!-- Guest: prompt to sign in and keep the data -->
    <GlassCard v-if="!auth.isSignedIn" class="account">
      <div class="account__row">
        <div class="account__avatar account__avatar--blank">訪</div>
        <div class="account__main">
          <p class="account__name">訪客模式</p>
          <p class="account__email">紀錄暫存於本機</p>
        </div>
      </div>
      <AppButton
        variant="accent"
        block
        class="account__out"
        :loading="auth.signingIn"
        @click="signIn"
      >
        登入 Google 並同步
      </AppButton>
      <p v-if="error" class="account__err">{{ error }}</p>
    </GlassCard>

    <!-- Account -->
    <GlassCard v-else class="account">
      <div class="account__row">
        <img v-if="auth.photoURL" :src="auth.photoURL" alt="" class="account__avatar" referrerpolicy="no-referrer" />
        <div v-else class="account__avatar account__avatar--blank">
          {{ (auth.displayName || auth.email || '？').slice(0, 1) }}
        </div>
        <div class="account__main">
          <p class="account__name">{{ auth.displayName || '修行者' }}</p>
          <p class="account__email">{{ auth.email }}</p>
        </div>
      </div>
      <AppButton variant="glass" block class="account__out" @click="signOut">登出</AppButton>
    </GlassCard>

    <!-- 使用指南 -->
    <GlassCard class="setting" clickable @click="router.push('/guide')">
      <div class="row">
        <AppIcon name="book" :size="20" class="row__icon" />
        <div class="row__main">
          <h2 class="row__title">使用指南</h2>
          <p class="row__desc">各功能說明 · 諸天功德登天表</p>
        </div>
        <AppIcon name="chevronRight" :size="18" class="row__icon" />
      </div>
    </GlassCard>

    <!-- Dashboard -->
    <GlassCard class="setting setting--tight" clickable @click="router.push('/dashboard')">
      <div class="row">
        <AppIcon name="ripple" :size="20" class="row__icon" />
        <div class="row__main">
          <h2 class="row__title">修行軌跡</h2>
          <p class="row__desc">打卡熱力圖 · 誦讀足跡與統計</p>
        </div>
        <AppIcon name="chevronRight" :size="18" class="row__icon" />
      </div>
    </GlassCard>

    <!-- 讀經 -->
    <GlassCard class="setting setting--tight" clickable @click="router.push('/library')">
      <div class="row">
        <AppIcon name="book" :size="20" class="row__icon" />
        <div class="row__main">
          <h2 class="row__title">讀經 · 經文庫</h2>
          <p class="row__desc">
            {{ reading.last ? `上次:${reading.last.sutraTitle} · ${reading.last.volumeLabel}` : '直排誦讀,記住讀到哪裡' }}
          </p>
        </div>
        <AppIcon name="chevronRight" :size="18" class="row__icon" />
      </div>
    </GlassCard>

    <!-- 印刷排版經文輸出 -->
    <GlassCard class="setting setting--tight" clickable @click="router.push('/print')">
      <div class="row">
        <AppIcon name="book" :size="20" class="row__icon" />
        <div class="row__main">
          <h2 class="row__title">印刷排版 · 經文輸出</h2>
          <p class="row__desc">直排 · 逐字注音 · 自訂主題背景,匯出 PDF / 列印</p>
        </div>
        <AppIcon name="chevronRight" :size="18" class="row__icon" />
      </div>
    </GlassCard>

    <!-- Achievements -->
    <GlassCard class="setting setting--tight" clickable @click="router.push('/achievements')">
      <div class="row">
        <AppIcon name="sparkle" :size="20" class="row__icon" />
        <div class="row__main">
          <h2 class="row__title">成就</h2>
          <p class="row__desc">
            已獲 {{ achievements.unlockedCount }} / {{ achievements.list.length }} 面獎牌
          </p>
        </div>
        <AppIcon name="chevronRight" :size="18" class="row__icon" />
      </div>
    </GlassCard>

    <!-- Working settings -->
    <GlassCard class="setting setting--tight" clickable @click="onToggleChime">
      <div class="row">
        <AppIcon name="sparkle" :size="20" class="row__icon" />
        <div class="row__main">
          <h2 class="row__title">頌缽音</h2>
          <p class="row__desc">記錄與圓滿時輕鳴一缽</p>
        </div>
        <span class="switch" :class="{ 'switch--on': chime.enabled.value }">
          <span class="switch__dot" />
        </span>
      </div>
    </GlassCard>

    <GlassCard v-if="notify.supported" class="setting setting--tight" clickable @click="onToggleNotify">
      <div class="row">
        <AppIcon name="sparkle" :size="20" class="row__icon" />
        <div class="row__main">
          <h2 class="row__title">每日功課提醒</h2>
          <p class="row__desc">
            {{ notify.canScheduleWhenClosed ? '每晚提醒未圓滿的功課' : '開啟後,下次進來時提醒(此瀏覽器不支援排程通知)' }}
          </p>
        </div>
        <span class="switch" :class="{ 'switch--on': notify.enabled.value }">
          <span class="switch__dot" />
        </span>
      </div>
    </GlassCard>

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
import AppButton from 'src/components/ui/AppButton.vue'
import { useAuthStore } from 'src/stores/authStore'
import { useToast, describeError } from 'src/composables/useToast'
import { useChime } from 'src/composables/useChime'
import { useNotify } from 'src/composables/useNotify'
import { useReadingStore } from 'src/stores/readingStore'
import { useAchievementStore } from 'src/stores/achievementStore'
import { useProgressStore } from 'src/stores/progressStore'
import { useGemStore } from 'src/stores/gemStore'
import { useStreakStore } from 'src/stores/streakStore'
import { useDedicationStore } from 'src/stores/dedicationStore'
import { useRouter } from 'vue-router'

import { onMounted, ref } from 'vue'

const auth = useAuthStore()
const toast = useToast()
const chime = useChime()
const notify = useNotify()
const reading = useReadingStore()
const achievements = useAchievementStore()
const router = useRouter()
const error = ref('')

async function onToggleNotify() {
  await notify.toggle()
  if (notify.enabled.value && notify.permission.value !== 'granted') {
    toast.info('瀏覽器未允許通知,請於網站設定開啟')
  }
}

// The medal count on the card needs every metric loaded.
onMounted(() => {
  Promise.all([
    useProgressStore().loadAllProgress(),
    useGemStore().loadGems(),
    useStreakStore().load(),
    useDedicationStore().loadDedications(),
    achievements.load(),
    reading.load(),
  ]).catch(() => {})
})

// Toggling on rings a small confirmation so the choice is audible.
function onToggleChime() {
  chime.toggle()
}

async function signIn() {
  error.value = ''
  try {
    await auth.signInWithGoogle()
  } catch (e) {
    const code = (e as { code?: string })?.code ?? ''
    if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') return
    if (code === 'auth/operation-not-allowed') error.value = '尚未在 Firebase 啟用 Google 登入'
    else error.value = describeError(e)
  }
}

async function signOut() {
  try {
    await auth.signOutUser()
  } catch (e) {
    toast.error(describeError(e))
  }
}

const planned = [
  { icon: 'sparkle', title: '聽法筆記', desc: 'YouTube 講經連結與每日打卡' },
  { icon: 'dots', title: '設定', desc: '字級 · 主題 · 資料匯出' },
]
</script>

<style scoped>
.account {
  margin-top: var(--s5);
}

.account__row {
  display: flex;
  align-items: center;
  gap: var(--s3);
}

.account__avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  flex-shrink: 0;
  object-fit: cover;
  border: 1px solid var(--hairline-strong);
}

.account__avatar--blank {
  display: grid;
  place-items: center;
  background: linear-gradient(135deg, rgba(167, 139, 250, 0.4), rgba(96, 165, 250, 0.3));
  font-size: var(--text-title);
  font-weight: 300;
  color: #fff;
}

.account__main {
  flex: 1;
  min-width: 0;
}

.account__name {
  font-size: var(--text-body);
  letter-spacing: 0.06em;
}

.account__email {
  margin-top: 2px;
  font-size: var(--text-micro);
  color: var(--text-faint);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.account__out {
  margin-top: var(--s4);
}

.account__err {
  margin-top: var(--s2);
  font-size: var(--text-micro);
  line-height: 1.6;
  color: var(--ruby);
}

.setting {
  margin-top: var(--s5);
}

.setting--tight {
  margin-top: var(--s3);
}

.switch {
  flex-shrink: 0;
  width: 42px;
  height: 24px;
  border-radius: var(--r-full);
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid var(--hairline);
  padding: 2px;
  transition: background var(--base) var(--ease), border-color var(--base) var(--ease);
}

.switch--on {
  background: rgba(134, 239, 172, 0.28);
  border-color: rgba(134, 239, 172, 0.5);
}

.switch__dot {
  display: block;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #fff;
  transform: translateX(0);
  transition: transform var(--base) var(--ease-out);
}

.switch--on .switch__dot {
  transform: translateX(18px);
}

.soon {
  list-style: none;
  margin-top: var(--s3);
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
