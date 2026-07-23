import { addDocData, listDocs } from './dataAccess'
import type { DedicationRecord, NewDedication } from 'src/types/dedication'

const COLLECTION = 'dedications'

export async function createDedication(
  input: NewDedication
): Promise<DedicationRecord> {
  const id = await addDocData(COLLECTION, input)
  return { id, ...input }
}

export async function getAllDedications(): Promise<DedicationRecord[]> {
  return listDocs<Omit<DedicationRecord, 'id'>>(COLLECTION)
}
