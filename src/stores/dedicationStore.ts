import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { DedicationRecord, MeritTotals } from 'src/types/dedication'
import { getAllDedications, createDedication } from 'src/services/dedicationService'

const ZERO: MeritTotals = { recite: 0, memorize: 0 }

interface DedicateInput {
  verseId: string
  targetId: string
  targetName: string
  /** Current cumulative practice totals across every sutra */
  totals: MeritTotals
  note?: string
}

export const useDedicationStore = defineStore('dedications', () => {
  const records = ref<DedicationRecord[]>([])
  const loading = ref(false)

  /** Newest first. */
  const history = computed(() =>
    [...records.value].sort((a, b) => b.dedicatedAt.localeCompare(a.dedicatedAt))
  )

  const latest = computed<DedicationRecord | null>(() => history.value[0] ?? null)

  async function loadDedications(): Promise<void> {
    loading.value = true
    try {
      records.value = await getAllDedications()
    } finally {
      loading.value = false
    }
  }

  /**
   * Merit recorded since the last dedication.
   *
   * Practice is stored as running totals with no per-event log, so what
   * is still undedicated has to be derived: current totals minus the
   * snapshot taken when merit was last dedicated. Clamped at zero so a
   * stale snapshot can never show a negative amount.
   */
  function pendingMerit(totals: MeritTotals): MeritTotals {
    const base = latest.value?.snapshot ?? ZERO
    return {
      recite: Math.max(0, totals.recite - base.recite),
      memorize: Math.max(0, totals.memorize - base.memorize),
    }
  }

  async function dedicate(input: DedicateInput): Promise<DedicationRecord> {
    const merit = pendingMerit(input.totals)

    const record = await createDedication({
      dedicatedAt: new Date().toISOString(),
      verseId: input.verseId,
      targetId: input.targetId,
      targetName: input.targetName,
      snapshot: { ...input.totals },
      merit,
      ...(input.note ? { note: input.note } : {}),
    })

    records.value.push(record)
    return record
  }

  return {
    records,
    loading,
    history,
    latest,
    loadDedications,
    pendingMerit,
    dedicate,
  }
})
