import { ref, readonly } from 'vue'

export interface Toast {
  id: number
  message: string
  tone: 'error' | 'info'
}

const items = ref<Toast[]>([])
let nextId = 0

function push(message: string, tone: Toast['tone'], ms: number) {
  const id = nextId++
  items.value.push({ id, message, tone })
  setTimeout(() => dismiss(id), ms)
}

function dismiss(id: number) {
  items.value = items.value.filter((t) => t.id !== id)
}

/**
 * Minimal global toast queue.
 *
 * Exists so that a failed Firestore write is visible. Before this, the
 * counter buttons swallowed rejections and simply appeared to do
 * nothing, which is indistinguishable from a broken button.
 */
export function useToast() {
  return {
    toasts: readonly(items),
    error: (message: string) => push(message, 'error', 6000),
    info: (message: string) => push(message, 'info', 3000),
    dismiss,
  }
}

/** Turns a thrown value into something worth showing a person. */
export function describeError(e: unknown): string {
  const code = (e as { code?: string })?.code ?? ''

  if (code === 'permission-denied') {
    return '無法儲存：Firestore 拒絕存取,請部署安全性規則'
  }
  if (code === 'unavailable' || code === 'failed-precondition') {
    return '無法儲存：連不上資料庫,請檢查網路'
  }
  return `無法儲存：${(e as Error)?.message ?? '未知錯誤'}`
}
