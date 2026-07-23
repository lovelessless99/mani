<template>
  <main class="login">
    <div class="login__mark">
      <div class="login__lotus" />
    </div>

    <h1 class="login__title">華嚴</h1>
    <p class="login__sub">誦經 · 背經 · 迴向 · 寶石收藏</p>

    <button
      class="gbtn"
      type="button"
      :disabled="auth.signingIn"
      @click="onSignIn"
    >
      <svg class="gbtn__g" viewBox="0 0 48 48" aria-hidden="true">
        <path fill="#4285F4" d="M45.1 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h11.8c-.5 2.7-2 5-4.4 6.6v5.5h7.1c4.2-3.8 6.6-9.5 6.6-16.1z" />
        <path fill="#34A853" d="M24 46c6 0 11-2 14.6-5.4l-7.1-5.5c-2 1.3-4.5 2.1-7.5 2.1-5.8 0-10.6-3.9-12.4-9.1H4.3v5.7C7.9 41.1 15.4 46 24 46z" />
        <path fill="#FBBC05" d="M11.6 28.1c-.5-1.3-.7-2.7-.7-4.1s.3-2.8.7-4.1v-5.7H4.3C2.8 17.1 2 20.4 2 24s.8 6.9 2.3 9.8l7.3-5.7z" />
        <path fill="#EA4335" d="M24 10.8c3.3 0 6.2 1.1 8.5 3.3l6.3-6.3C35 4.1 30 2 24 2 15.4 2 7.9 6.9 4.3 14.2l7.3 5.7c1.8-5.2 6.6-9.1 12.4-9.1z" />
      </svg>
      {{ auth.signingIn ? '登入中…' : '使用 Google 帳號登入' }}
    </button>

    <p v-if="error" class="login__error">{{ error }}</p>

    <button class="guest" type="button" @click="auth.continueAsGuest()">
      先以訪客身分開始
    </button>

    <p class="login__note">
      訪客紀錄先存於本機;日後登入 Google 時,會自動搬到你的帳號,換裝置也能同步。
    </p>
  </main>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useAuthStore } from 'src/stores/authStore'

const auth = useAuthStore()
const error = ref('')

async function onSignIn() {
  error.value = ''
  try {
    await auth.signInWithGoogle()
  } catch (e) {
    const code = (e as { code?: string })?.code ?? ''
    if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
      return // the user backed out; not an error worth showing
    }
    if (code === 'auth/operation-not-allowed') {
      error.value = '尚未在 Firebase 啟用 Google 登入,請先於主控台開啟。'
    } else if (code === 'auth/unauthorized-domain') {
      error.value = '此網域未授權登入,請在 Firebase 主控台加入。'
    } else {
      error.value = `登入失敗：${(e as Error)?.message ?? code}`
    }
  }
}
</script>

<style scoped>
.login {
  position: relative;
  z-index: 1;
  min-height: 100vh;
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--s3);
  padding: var(--s6) var(--s5) calc(var(--safe-b) + var(--s6));
  text-align: center;
}

/* — Mark ————————————————————————————————————— */
.login__mark {
  width: 96px;
  height: 96px;
  margin-bottom: var(--s3);
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: radial-gradient(
    circle,
    rgba(167, 139, 250, 0.28) 0%,
    transparent 68%
  );
  animation: halo 4.5s ease-in-out infinite;
}

.login__lotus {
  width: 34px;
  height: 34px;
  border-radius: 50% 0 50% 50%;
  transform: rotate(45deg);
  background: linear-gradient(135deg, #c4b5fd, #60a5fa);
  box-shadow: 0 0 22px -2px rgba(167, 139, 250, 0.9);
}

@keyframes halo {
  0%,
  100% {
    opacity: 0.7;
    transform: scale(1);
  }
  50% {
    opacity: 1;
    transform: scale(1.08);
  }
}

.login__title {
  font-family: var(--font-serif);
  font-size: 2.4rem;
  font-weight: 400;
  letter-spacing: 0.3em;
  text-indent: 0.3em;
}

.login__sub {
  font-size: var(--text-caption);
  letter-spacing: 0.14em;
  color: var(--text-dim);
}

/* — Google button ———————————————————————————— */
.gbtn {
  margin-top: var(--s6);
  display: inline-flex;
  align-items: center;
  gap: var(--s3);
  padding: var(--s3) var(--s5);
  border-radius: var(--r-full);
  background: #fff;
  color: #1f1f1f;
  font-size: var(--text-body);
  font-weight: 500;
  letter-spacing: 0.04em;
  box-shadow: 0 8px 28px -10px rgba(0, 0, 0, 0.7);
  transition:
    transform var(--fast) var(--ease),
    box-shadow var(--fast) var(--ease),
    opacity var(--fast) var(--ease);
}

.gbtn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 12px 32px -10px rgba(0, 0, 0, 0.8);
}

.gbtn:active:not(:disabled) {
  transform: scale(0.97);
}

.gbtn:disabled {
  opacity: 0.6;
}

.gbtn__g {
  width: 20px;
  height: 20px;
}

.login__error {
  margin-top: var(--s3);
  max-width: 22rem;
  font-size: var(--text-caption);
  line-height: 1.7;
  color: var(--ruby);
}

.guest {
  margin-top: var(--s4);
  padding: var(--s2) var(--s4);
  font-size: var(--text-caption);
  letter-spacing: 0.08em;
  color: var(--text-dim);
  border-radius: var(--r-full);
  transition: color var(--fast) var(--ease);
}

.guest:hover {
  color: var(--text);
}

.login__note {
  margin-top: var(--s6);
  max-width: 20rem;
  font-size: var(--text-micro);
  line-height: 1.8;
  letter-spacing: 0.04em;
  color: var(--text-faint);
}
</style>
