import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { DedicationRecord } from 'src/types/dedication'
import { getAllDedications, createDedication } from 'src/services/dedicationService'

interface LightInput {
  verseId: string
  targetId: string
  targetName: string
  /** 功德 spent lighting this lamp */
  merit: number
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
  const totalGiven = computed(() => records.value.reduce((n, r) => n + (r.merit || 0), 0))

  async function loadDedications(): Promise<void> {
    loading.value = true
    try {
      records.value = await getAllDedications()
    } finally {
      loading.value = false
    }
  }

  /** Light one 迴向燈, dedicating `merit` to the target. */
  async function light(input: LightInput): Promise<DedicationRecord> {
    const record = await createDedication({
      dedicatedAt: new Date().toISOString(),
      verseId: input.verseId,
      targetId: input.targetId,
      targetName: input.targetName,
      merit: input.merit,
      ...(input.note ? { note: input.note } : {}),
    })
    records.value.push(record)
    return record
  }

  return { records, loading, history, latest, totalGiven, loadDedications, light }
})
