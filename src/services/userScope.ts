import { collection, doc, type CollectionReference, type DocumentReference } from 'firebase/firestore'
import { db, auth } from 'src/boot/firebase'

/**
 * Everything a user records now lives under their own account at
 * `/users/{uid}/…`, so two Google accounts never see each other's
 * practice. These helpers refuse to build a path when nobody is signed
 * in — a write without a uid would land in the wrong place, or in the
 * old shared space the security rules no longer allow.
 */

function requireUid(): string {
  const uid = auth.currentUser?.uid
  if (!uid) throw new Error('尚未登入')
  return uid
}

export function userCollection(name: string): CollectionReference {
  return collection(db, 'users', requireUid(), name)
}

export function userDoc(name: string, id: string): DocumentReference {
  return doc(db, 'users', requireUid(), name, id)
}
