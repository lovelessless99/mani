import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { GemRecord } from 'src/types/gem'
import { getAllGems, createGem } from 'src/services/gemService'

interface EarnGemInput {
  source: GemRecord['source']
  sourceRef: string
  buddhaId?: string
  constellationId?: string
}

export const useGemStore = defineStore('gems', () => {
  const gemsMap = ref<Record<string, GemRecord>>({})
  const pendingUnlock = ref<GemRecord | null>(null)
  const loading = ref(false)

  const gemsList = computed(() => Object.values(gemsMap.value))

  async function loadGems(): Promise<void> {
    loading.value = true
    try {
      const gems = await getAllGems()
      gems.forEach((g) => { gemsMap.value[g.id] = g })
    } finally {
      loading.value = false
    }
  }

  function hasGemForVolume(sutraId: string, volumeId: string): boolean {
    const ref = `${sutraId}/${volumeId}`
    return gemsList.value.some((g) => g.sourceRef === ref)
  }

  async function earnGem(input: EarnGemInput): Promise<GemRecord> {
    const gem = await createGem(input)
    gemsMap.value[gem.id] = gem
    pendingUnlock.value = gem
    return gem
  }

  function clearPendingUnlock(): void {
    pendingUnlock.value = null
  }

  return { gemsMap, pendingUnlock, loading, gemsList, loadGems, hasGemForVolume, earnGem, clearPendingUnlock }
})
