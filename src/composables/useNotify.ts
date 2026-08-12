import { ref } from 'vue'

/**
 * 每日功課提醒 — opt-in local reminders.
 *
 * Two honest tiers, because a PWA cannot reliably wake itself when closed
 * without a push server:
 *   · where the browser ships Notification Triggers, a real notification is
 *     scheduled for the evening and fires even when the app is shut;
 *   · everywhere else the permission is still taken, and the in-app banner
 *     carries the reminder whenever the app is next opened.
 * The new-version update prompt is separate (see PwaPrompts.vue).
 */

const PREF = 'notify-daily'
const PREF_TIME = 'notify-time'
const DEFAULT_TIME = '20:00' // an evening nudge before the day closes

const supported = typeof window !== 'undefined' && 'Notification' in window

const enabled = ref(supported && safeGet(PREF) === 'on')
const permission = ref<NotificationPermission>(supported ? Notification.permission : 'denied')
// The hour:minute the daily reminder fires — the practitioner's own choice.
const remindTime = ref(safeGet(PREF_TIME) || DEFAULT_TIME)

function parseTime(v: string): { h: number; m: number } {
  const [h, m] = v.split(':').map((n) => parseInt(n, 10))
  return { h: Number.isFinite(h) ? h : 20, m: Number.isFinite(m) ? m : 0 }
}

function safeGet(k: string): string | null {
  try {
    return localStorage.getItem(k)
  } catch {
    return null
  }
}
function safeSet(k: string, v: string): void {
  try {
    localStorage.setItem(k, v)
  } catch {
    /* storage unavailable */
  }
}

async function registration(): Promise<ServiceWorkerRegistration | null> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return null
  try {
    return await navigator.serviceWorker.ready
  } catch {
    return null
  }
}

// Whether this browser can schedule a notification for a future time itself.
function canSchedule(): boolean {
  return (
    typeof window !== 'undefined' &&
    'TimestampTrigger' in window &&
    'showTrigger' in (Notification.prototype as object)
  )
}

export function useNotify() {
  const canScheduleWhenClosed = canSchedule()

  /** (Re)schedule the evening reminder for the next REMIND_HOUR. No-op where unsupported. */
  async function scheduleDaily(): Promise<void> {
    if (!enabled.value || permission.value !== 'granted' || !canSchedule()) return
    const reg = await registration()
    if (!reg) return

    const now = new Date()
    const when = new Date(now)
    const { h, m } = parseTime(remindTime.value)
    when.setHours(h, m, 0, 0)
    if (when <= now) when.setDate(when.getDate() + 1)

    try {
      // Clear any earlier schedule before laying down the next one.
      const pending = (await reg.getNotifications?.({ tag: 'daily-task', includeTriggered: false } as never)) ?? []
      pending.forEach((n) => n.close())
      await reg.showNotification('今日功課', {
        tag: 'daily-task',
        body: '功課牌組已備,抽一張,修一分。',
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-192.png',
        // @ts-expect-error — Notification Triggers, experimental
        showTrigger: new window.TimestampTrigger(when.getTime()),
      })
    } catch {
      /* scheduling not available; the in-app banner still reminds */
    }
  }

  async function enable(): Promise<boolean> {
    if (!supported) return false
    let p = Notification.permission
    if (p === 'default') p = await Notification.requestPermission()
    permission.value = p
    if (p !== 'granted') {
      enabled.value = false
      safeSet(PREF, 'off')
      return false
    }
    enabled.value = true
    safeSet(PREF, 'on')
    await scheduleDaily()
    return true
  }

  async function disable(): Promise<void> {
    enabled.value = false
    safeSet(PREF, 'off')
    const reg = await registration()
    const pending = (await reg?.getNotifications?.({ tag: 'daily-task' })) ?? []
    pending.forEach((n) => n.close())
  }

  async function toggle(): Promise<void> {
    if (enabled.value) await disable()
    else await enable()
  }

  /** Set the daily reminder time (HH:MM) and re-lay the schedule. */
  async function setTime(v: string): Promise<void> {
    remindTime.value = v || DEFAULT_TIME
    safeSet(PREF_TIME, remindTime.value)
    await scheduleDaily()
  }

  return {
    supported,
    enabled,
    permission,
    canScheduleWhenClosed,
    remindTime,
    toggle,
    enable,
    disable,
    scheduleDaily,
    setTime,
  }
}
