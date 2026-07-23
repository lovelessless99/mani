import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth'
import { auth, googleProvider } from 'src/boot/firebase'
import * as local from 'src/services/localStore'
import { migrateGuestData } from 'src/services/migration'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  /** False until Firebase has reported the initial auth state */
  const ready = ref(false)
  const signingIn = ref(false)

  // A guest chose to start without an account; their data lives in
  // localStorage until they sign in.
  const guest = ref(localStorage.getItem(local.GUEST_FLAG) === '1')

  const uid = computed(() => user.value?.uid ?? null)
  const displayName = computed(() => user.value?.displayName ?? '')
  const email = computed(() => user.value?.email ?? '')
  const photoURL = computed(() => user.value?.photoURL ?? '')
  const isSignedIn = computed(() => !!user.value)
  /** Whether to let the app through the gate at all */
  const isActive = computed(() => !!user.value || guest.value)

  onAuthStateChanged(auth, (u) => {
    user.value = u
    if (u) guest.value = false
    ready.value = true
  })

  function continueAsGuest(): void {
    guest.value = true
    localStorage.setItem(local.GUEST_FLAG, '1')
  }

  async function signInWithGoogle(): Promise<void> {
    signingIn.value = true
    const hadGuestData = guest.value && local.hasAny()
    try {
      await signInWithPopup(auth, googleProvider)
      if (hadGuestData) {
        // The popup has set currentUser, so the migration writes land in
        // the new account. Reload afterwards so every store re-reads from
        // Firestore instead of the stale guest data it holds in memory.
        await migrateGuestData()
        localStorage.removeItem(local.GUEST_FLAG)
        window.location.reload()
        return
      }
      localStorage.removeItem(local.GUEST_FLAG)
      guest.value = false
    } finally {
      signingIn.value = false
    }
  }

  async function signOutUser(): Promise<void> {
    await signOut(auth)
    guest.value = false
    localStorage.removeItem(local.GUEST_FLAG)
  }

  return {
    user,
    ready,
    signingIn,
    guest,
    uid,
    displayName,
    email,
    photoURL,
    isSignedIn,
    isActive,
    continueAsGuest,
    signInWithGoogle,
    signOutUser,
  }
})
