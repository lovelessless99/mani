import { computed } from 'vue'

/**
 * 十齋日 — the ten monthly fasting days of the lunar calendar.
 *
 * 地藏經〈如來讚歎品〉names these days: reciting the sutra on them is
 * said to bring particular merit. The lunar day comes from the browser's
 * built-in Chinese calendar (Intl), so no lunar-conversion table has to
 * ship. 三十 falls away in a short month (廿九 is the last day); that is
 * fine — the day simply is not in the set that month.
 */

const FAST_DAYS = [1, 8, 14, 15, 18, 23, 24, 28, 29, 30]

const LUNAR_DAY_NAMES: Record<number, string> = {
  1: '初一', 8: '初八', 14: '十四', 15: '十五', 18: '十八',
  23: '廿三', 24: '廿四', 28: '廿八', 29: '廿九', 30: '三十',
}

/** Lunar day-of-month (1–30) for a date, via the Chinese calendar. */
function lunarDay(date: Date): number | null {
  try {
    const parts = new Intl.DateTimeFormat('en-u-ca-chinese', {
      day: 'numeric',
    }).formatToParts(date)
    const day = parts.find((p) => p.type === 'day')?.value
    return day ? Number(day) : null
  } catch {
    return null // ancient runtime without the Chinese calendar
  }
}

export function useFastDay(date: Date = new Date()) {
  const day = computed(() => lunarDay(date))
  const isFastDay = computed(() => day.value !== null && FAST_DAYS.includes(day.value))
  const lunarLabel = computed(() =>
    day.value !== null ? (LUNAR_DAY_NAMES[day.value] ?? `${day.value}日`) : ''
  )

  return { isFastDay, lunarLabel, fastDays: FAST_DAYS, lunarDayNames: LUNAR_DAY_NAMES }
}
