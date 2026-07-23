/** Counts of practice being dedicated, by mode. */
export interface MeritTotals {
  recite: number
  memorize: number
}

export interface DedicationRecord {
  id: string
  /** ISO timestamp */
  dedicatedAt: string
  verseId: string
  /** Preset target id, or 'custom' */
  targetId: string
  /** Free text when targetId is 'custom' */
  targetName: string
  /**
   * Cumulative practice totals at the moment of dedication. Merit still
   * awaiting dedication is the difference between the current totals and
   * those of the most recent record — practice history has no per-event
   * log to count from, only running totals.
   */
  snapshot: MeritTotals
  /** How much was dedicated by this act (current totals minus previous snapshot) */
  merit: MeritTotals
  note?: string
}

export type NewDedication = Omit<DedicationRecord, 'id'>
