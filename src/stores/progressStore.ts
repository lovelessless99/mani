import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { SutraProgress } from 'src/types/sutra'
import { getProgress, recordRecitation } from 'src/services/progressService'
import { getAllSutras } from 'src/services/sutraService'

export const useProgressStore = defineStore('progress', () => {
  const progressMap = ref<Record<string, SutraProgress>>({})
  const loading = ref(false)

  async function loadProgress(sutraId: string): Promise<void> {
    const data = await getProgress(sutraId)
    if (data) progressMap.value[sutraId] = data
  }

  async function loadAllProgress(): Promise<void> {
    loading.value = true
    try {
      await Promise.all(getAllSutras().map((s) => loadProgress(s.id)))
    } finally {
      loading.value = false
    }
  }

  async function markVolumeComplete(sutraId: string, volumeId: string): Promise<SutraProgress> {
    const meta = getAllSutras().find((s) => s.id === sutraId)
    if (!meta) throw new Error(`Unknown sutra: ${sutraId}`)

    const updated = await recordRecitation(sutraId, volumeId, meta.totalVolumes)
    progressMap.value[sutraId] = updated
    return updated
  }

  function getVolumeCount(sutraId: string, volumeId: string): number {
    return progressMap.value[sutraId]?.volumes?.[volumeId]?.count ?? 0
  }

  function getSutraCompletionRatio(sutraId: string): number {
    const meta = getAllSutras().find((s) => s.id === sutraId)
    if (!meta || meta.totalVolumes === 0) return 0
    return (progressMap.value[sutraId]?.totalCompleted ?? 0) / meta.totalVolumes
  }

  return { progressMap, loading, loadProgress, loadAllProgress, markVolumeComplete, getVolumeCount, getSutraCompletionRatio }
})
