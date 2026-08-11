<template>
  <Teleport to="body">
    <!-- New version waiting (prompt-mode registrations) -->
    <Transition name="pwa">
      <div v-if="needRefresh" class="pwa pwa--update">
        <div class="pwa__text">
          <p class="pwa__title">有新版本</p>
          <p class="pwa__sub">更新以取得最新功能</p>
        </div>
        <button class="pwa__btn" type="button" @click="applyUpdate">立即更新</button>
        <button class="pwa__x" type="button" aria-label="稍後" @click="needRefresh = false">
          <AppIcon name="close" :size="16" />
        </button>
      </div>
    </Transition>

    <!-- New version already active — offer a refresh to load it -->
    <Transition name="pwa">
      <div v-if="updated && !refreshDismissed" class="pwa pwa--update">
        <div class="pwa__text">
          <p class="pwa__title">已更新到新版本</p>
          <p class="pwa__sub">重新整理即可使用最新內容</p>
        </div>
        <button class="pwa__btn" type="button" @click="reloadForUpdate">刷新</button>
        <button class="pwa__x" type="button" aria-label="稍後" @click="refreshDismissed = true">
          <AppIcon name="close" :size="16" />
        </button>
      </div>
    </Transition>

    <!-- Installable to the home screen -->
    <Transition name="pwa">
      <div v-if="showInstall" class="pwa pwa--install">
        <div class="pwa__lotus" />
        <div class="pwa__text">
          <p class="pwa__title">加入主畫面</p>
          <p class="pwa__sub">像 App 一樣全螢幕開啟,離線也能用</p>
        </div>
        <button class="pwa__btn" type="button" @click="onInstall">安裝</button>
        <button class="pwa__x" type="button" aria-label="關閉" @click="dismissInstall">
          <AppIcon name="close" :size="16" />
        </button>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import AppIcon from './AppIcon.vue'
import { usePwa } from 'src/composables/usePwa'

const { canInstall, needRefresh, updated, install, applyUpdate, reloadForUpdate } = usePwa()

// Respect a dismissal for the session so the banner is not nagging.
const DISMISS_KEY = 'pwa-install-dismissed'
const dismissed = ref(sessionStorage.getItem(DISMISS_KEY) === '1')
const refreshDismissed = ref(false)

const showInstall = computed(() => canInstall.value && !dismissed.value && !needRefresh.value)

async function onInstall() {
  await install()
}
function dismissInstall() {
  dismissed.value = true
  try {
    sessionStorage.setItem(DISMISS_KEY, '1')
  } catch {
    // storage may be unavailable; the banner just reappears next launch
  }
}
</script>

<style scoped>
.pwa {
  position: fixed;
  left: 50%;
  transform: translateX(-50%);
  bottom: calc(var(--safe-b) + var(--tabbar-h) + var(--s3));
  z-index: 1250;
  width: min(26rem, calc(100vw - var(--s5)));
  display: flex;
  align-items: center;
  gap: var(--s3);
  padding: var(--s3) var(--s4);
  border-radius: var(--r-lg);
  background: rgba(20, 18, 30, 0.9);
  backdrop-filter: blur(var(--blur-heavy)) saturate(180%);
  -webkit-backdrop-filter: blur(var(--blur-heavy)) saturate(180%);
  border: 1px solid var(--hairline-strong);
  box-shadow: var(--shadow-3);
}

.pwa--update {
  border-color: rgba(96, 165, 250, 0.4);
}

.pwa__lotus {
  flex-shrink: 0;
  width: 26px;
  height: 26px;
  border-radius: 50% 0 50% 50%;
  transform: rotate(45deg);
  background: linear-gradient(135deg, #c4b5fd, #60a5fa);
  box-shadow: 0 0 14px -2px rgba(167, 139, 250, 0.8);
}

.pwa__text {
  flex: 1;
  min-width: 0;
}
.pwa__title {
  font-size: var(--text-caption);
  letter-spacing: 0.06em;
}
.pwa__sub {
  margin-top: 1px;
  font-size: var(--text-micro);
  color: var(--text-faint);
  line-height: 1.5;
}

.pwa__btn {
  flex-shrink: 0;
  padding: var(--s2) var(--s4);
  border-radius: var(--r-full);
  font-size: var(--text-caption);
  letter-spacing: 0.06em;
  color: #fff;
  background: linear-gradient(135deg, rgba(167, 139, 250, 0.4), rgba(96, 165, 250, 0.3));
  border: 1px solid rgba(167, 139, 250, 0.4);
  transition: transform var(--fast) var(--ease), background var(--fast) var(--ease);
}
.pwa__btn:hover {
  transform: translateY(-1px);
}
.pwa__btn:active {
  transform: scale(0.96);
}

.pwa__x {
  flex-shrink: 0;
  width: 26px;
  height: 26px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  color: var(--text-faint);
}
.pwa__x:hover {
  color: var(--text);
}

.pwa-enter-active,
.pwa-leave-active {
  transition:
    opacity var(--base) var(--ease),
    transform var(--base) var(--ease-out);
}
.pwa-enter-from,
.pwa-leave-to {
  opacity: 0;
  transform: translate(-50%, 16px);
}
</style>
