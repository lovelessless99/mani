import { openDB } from 'idb'
import type { SutraVolume } from 'src/types/sutra'

const DB_NAME = 'sutra-cache'
const STORE = 'volumes'

async function getDB() {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      db.createObjectStore(STORE)
    },
  })
}

export async function getCachedVolume(key: string): Promise<SutraVolume | undefined> {
  const db = await getDB()
  return db.get(STORE, key)
}

export async function setCachedVolume(key: string, volume: SutraVolume): Promise<void> {
  const db = await getDB()
  await db.put(STORE, volume, key)
}
