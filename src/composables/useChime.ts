import { ref } from 'vue'

/**
 * 頌缽 · a singing-bowl / bell voice, synthesised rather than sampled.
 *
 * A struck bowl is not one pitch but a few inharmonic partials over a long
 * exponential decay — that ratio spread is what makes metal sound like metal
 * and not like a sine beep. Building it from oscillators keeps the app free
 * of audio files and lets the same voice ring softer or fuller by context.
 *
 * The context is created lazily on the first real gesture, because browsers
 * suspend audio until a user has interacted, and resumed each play in case
 * the tab put it to sleep.
 */

const PREF_KEY = 'chime-on'

// Inharmonic partials of a struck bowl: frequency ratio and relative gain.
// The slightly detuned near-unison at the top gives the shimmering beat a
// real bowl has as its walls ring against each other.
const PARTIALS: Array<[ratio: number, gain: number]> = [
  [1.0, 1.0],
  [2.7, 0.45],
  [5.4, 0.2],
  [1.003, 0.6], // beating partial against the fundamental
]

const enabled = ref(readPref())

function readPref(): boolean {
  try {
    return localStorage.getItem(PREF_KEY) !== 'off'
  } catch {
    return true
  }
}

let ctx: AudioContext | null = null

function context(): AudioContext | null {
  if (typeof window === 'undefined') return null
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!AC) return null
  if (!ctx) ctx = new AC()
  return ctx
}

export function useChime() {
  function setEnabled(on: boolean) {
    enabled.value = on
    try {
      localStorage.setItem(PREF_KEY, on ? 'on' : 'off')
    } catch {
      // preference just won't persist
    }
  }
  function toggle() {
    setEnabled(!enabled.value)
    if (enabled.value) strike(0.5) // a small confirmation ring
  }

  /**
   * Ring the bowl. `intensity` (0–1) scales both loudness and how long it
   * rings, so a gem earns a gentle tap and a finished 部 a fuller bell.
   */
  function strike(intensity = 1): void {
    if (!enabled.value) return
    const ac = context()
    if (!ac) return
    if (ac.state === 'suspended') void ac.resume()

    const now = ac.currentTime
    const base = 396 + Math.random() * 12 // a warm, slightly varied strike pitch
    const dur = 2.6 + intensity * 2.2
    const peak = 0.16 * intensity

    const master = ac.createGain()
    master.gain.setValueAtTime(0.0001, now)
    master.gain.exponentialRampToValueAtTime(peak, now + 0.012)
    master.gain.exponentialRampToValueAtTime(0.0001, now + dur)
    master.connect(ac.destination)

    for (const [ratio, g] of PARTIALS) {
      const osc = ac.createOscillator()
      osc.type = 'sine'
      osc.frequency.value = base * ratio
      const vg = ac.createGain()
      vg.gain.value = g
      osc.connect(vg).connect(master)
      osc.start(now)
      osc.stop(now + dur + 0.1)
    }
  }

  return { enabled, setEnabled, toggle, strike }
}
