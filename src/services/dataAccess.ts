import { getDoc, setDoc, addDoc, getDocs, query } from 'firebase/firestore'
import { auth } from 'src/boot/firebase'
import { userCollection, userDoc } from './userScope'
import * as local from './localStore'

/**
 * One door to the data, two rooms behind it.
 *
 * Signed in, everything goes to Firestore under `/users/{uid}/…`. As a
 * guest — no `currentUser` — the very same calls fall to localStorage.
 * Routing keys purely off whether a Firebase user is present, so nothing
 * else in the app has to know which backend it is talking to.
 */

function online(): boolean {
  return !!auth.currentUser
}

export async function getDocData<T>(col: string, id: string): Promise<T | null> {
  if (online()) {
    const snap = await getDoc(userDoc(col, id))
    return snap.exists() ? (snap.data() as T) : null
  }
  return local.getDoc<T>(col, id)
}

export async function setDocData(col: string, id: string, data: object): Promise<void> {
  if (online()) {
    await setDoc(userDoc(col, id), data)
    return
  }
  local.setDoc(col, id, data as Record<string, unknown>)
}

export async function addDocData(col: string, data: object): Promise<string> {
  if (online()) {
    const ref = await addDoc(userCollection(col), data)
    return ref.id
  }
  return local.addDoc(col, data as Record<string, unknown>)
}

export async function listDocs<T>(col: string): Promise<(T & { id: string })[]> {
  if (online()) {
    const snap = await getDocs(query(userCollection(col)))
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as T) }))
  }
  return local.list<T>(col)
}
