import { ref, readonly, onMounted, onBeforeUnmount } from 'vue'
import { useRegisterSW } from 'virtual:pwa-register/vue'

/**
 * PWA install + update state.
 *
 * Two separate concerns, handled together because they both belong to
 * "the app as an installed thing":
 *   · install — the browser fires `beforeinstallprompt` when the app can
 *     be added to the home screen; we hold that event so a button can
 *     trigger the native prompt on demand.
 *   · update — vite-plugin-pwa registers the service worker; `needRefresh`
 *     flips when a new version is waiting, and updateServiceWorker(true)
 *     activates it and reloads.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> }

const deferredPrompt = ref<InstallEvent | null>(null)
const installed = ref(false)

function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // iOS Safari
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  )
}

export function usePwa() {
  const { needRefresh, updateServiceWorker } = useRegisterSW({
    immediate: true,
  })

  const canInstall = ref(!!deferredPrompt.value)

  function onBeforePrompt(e: Event) {
    e.preventDefault()
    deferredPrompt.value = e as InstallEvent
    canInstall.value = true
  }
  function onInstalled() {
    installed.value = true
    canInstall.value = false
    deferredPrompt.value = null
  }

  onMounted(() => {
    installed.value = isStandalone()
    window.addEventListener('beforeinstallprompt', onBeforePrompt)
    window.addEventListener('appinstalled', onInstalled)
  })
  onBeforeUnmount(() => {
    window.removeEventListener('beforeinstallprompt', onBeforePrompt)
    window.removeEventListener('appinstalled', onInstalled)
  })

  async function install(): Promise<void> {
    const e = deferredPrompt.value
    if (!e) return
    await e.prompt()
    await e.userChoice
    deferredPrompt.value = null
    canInstall.value = false
  }

  function applyUpdate(): void {
    void updateServiceWorker(true)
  }

  return {
    canInstall: readonly(canInstall),
    installed: readonly(installed),
    needRefresh,
    install,
    applyUpdate,
    isStandalone,
  }
}
