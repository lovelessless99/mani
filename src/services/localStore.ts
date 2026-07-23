/**
 * Guest storage.
 *
 * Before signing in, everything is kept here in localStorage under one
 * namespace, one map per collection ({ id: data }). It mirrors the shape
 * of the Firestore collections exactly, so the same services read from
 * either place and the sign-in migration is a straight copy.
 */

const NS = 'flower:guest:'
export const GUEST_FLAG = 'flower:guest:on'
const COLLECTIONS = ['progress', 'gems', 'dedications'] as const

type Row = Record<string, unknown>

function read(col: string): Record<string, Row> {
  try {
    return JSON.parse(localStorage.getItem(NS + col) || '{}')
  } catch {
    return {}
  }
}

function write(col: string, map: Record<string, Row>): void {
  try {
    localStorage.setItem(NS + col, JSON.stringify(map))
  } catch {
    // Storage full or unavailable; nothing more we can do for a guest
  }
}

export function getDoc<T>(col: string, id: string): T | null {
  return (read(col)[id] as T) ?? null
}

export function setDoc(col: string, id: string, data: Row): void {
  const map = read(col)
  map[id] = data
  write(col, map)
}

export function addDoc(col: string, data: Row): string {
  const id = 'g' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
  setDoc(col, id, data)
  return id
}

export function list<T>(col: string): (T & { id: string })[] {
  return Object.entries(read(col)).map(([id, data]) => ({ id, ...(data as T) }))
}

/** Everything recorded as a guest, for the sign-in migration. */
export function snapshot(): Record<string, Record<string, Row>> {
  const out: Record<string, Record<string, Row>> = {}
  for (const c of COLLECTIONS) out[c] = read(c)
  return out
}

export function hasAny(): boolean {
  return COLLECTIONS.some((c) => Object.keys(read(c)).length > 0)
}

export function clearAll(): void {
  for (const c of COLLECTIONS) localStorage.removeItem(NS + c)
}
