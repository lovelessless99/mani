import { computed } from 'vue'

/**
 * 農曆七月 — 孝親報恩月(俗稱鬼月).
 *
 * The whole lunar 7th month is, in the 地藏 tradition, a time to recite the
 * 地藏經 and 報父母恩咒 for one's ancestors. The lunar month comes from the
 * browser's Chinese calendar, so no conversion table ships. A leap 七月 still
 * reads as month 7, which is exactly what we want.
 */
function lunarMonth(date: Date): number | null {
  try {
    const parts = new Intl.DateTimeFormat('en-u-ca-chinese', { month: 'numeric' }).formatToParts(date)
    const m = parts.find((p) => p.type === 'month')?.value
    return m ? Number(m) : null
  } catch {
    return null // ancient runtime without the Chinese calendar
  }
}

export function useGhostMonth(date: Date = new Date()) {
  const month = computed(() => lunarMonth(date))
  const active = computed(() => month.value === 7)
  return { active, month }
}
