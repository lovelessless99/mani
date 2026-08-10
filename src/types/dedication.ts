/**
 * 迴向燈 — one lamp lit, dedicating merit to a target.
 *
 * Each lamp carries a fixed amount of 功德 spent at the 迴向燈, a 迴向偈, and
 * who it is dedicated to. Lamps accumulate into the 燈海.
 */
export interface DedicationRecord {
  id: string
  /** ISO timestamp */
  dedicatedAt: string
  /** 迴向偈 id */
  verseId: string
  /** Preset target id, or 'custom' */
  targetId: string
  /** Free text when targetId is 'custom' */
  targetName: string
  /** 功德 given at this lamp */
  merit: number
  note?: string
}

export type NewDedication = Omit<DedicationRecord, 'id'>
