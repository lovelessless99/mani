import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { getDocData, setDocData } from 'src/services/dataAccess'

/**
 * 迴向目標 · 立願
 *
 * A vow names someone or something and a number of 遍 to dedicate toward
 * them — 為母親念滿一千遍藥師咒. Every act of dedication pours its merit into
 * the active vow until the goal is met, turning a scattered practice into
 * one sustained offering with a visible finish line. One vow is active at a
 * time; fulfilling it clears the way to make the next.
 */

const COL = 'stats'
const ID = 'vow'

export interface Vow {
  targetName: string
  verseId: string
  goal: number
  progress: number
  createdAt: string
  fulfilledAt?: string
}

export const useVowStore = defineStore('vow', () => {
  const vow = ref<Vow | null>(null)
  const loaded = ref(false)
  const justFulfilled = ref(false)

  const active = computed(() => !!vow.value && !vow.value.fulfilledAt)
  const ratio = computed(() =>
    vow.value ? Math.min(1, vow.value.progress / vow.value.goal) : 0
  )
  const remaining = computed(() =>
    vow.value ? Math.max(0, vow.value.goal - vow.value.progress) : 0
  )

  async function load(): Promise<void> {
    vow.value = await getDocData<Vow>(COL, ID)
    loaded.value = true
  }

  async function persist(): Promise<void> {
    if (vow.value) await setDocData(COL, ID, vow.value)
  }

  async function setVow(targetName: string, goal: number, verseId: string): Promise<void> {
    vow.value = {
      targetName,
      goal,
      verseId,
      progress: 0,
      createdAt: new Date().toISOString(),
    }
    await persist()
  }

  /**
   * Add dedicated merit to the active vow. Returns true the moment it tips
   * the vow into fulfilment, so the page can mark the occasion once.
   */
  async function addProgress(merit: number): Promise<boolean> {
    if (!vow.value || vow.value.fulfilledAt || merit <= 0) return false
    vow.value.progress += merit
    let fulfilled = false
    if (vow.value.progress >= vow.value.goal) {
      vow.value.fulfilledAt = new Date().toISOString()
      justFulfilled.value = true
      fulfilled = true
    }
    await persist()
    return fulfilled
  }

  async function clear(): Promise<void> {
    vow.value = null
    justFulfilled.value = false
    await setDocData(COL, ID, {})
  }

  function ackFulfilled(): void {
    justFulfilled.value = false
  }

  return {
    vow,
    loaded,
    justFulfilled,
    active,
    ratio,
    remaining,
    load,
    setVow,
    addProgress,
    clear,
    ackFulfilled,
  }
})
