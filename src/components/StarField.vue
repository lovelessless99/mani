<template>
  <div class="sky" aria-hidden="true">
    <div class="sky__nebula" />
    <canvas ref="canvasEl" class="sky__canvas" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'

/**
 * Ambient starfield.
 *
 * Hand-rolled on a canvas rather than pulling in particles.js — that
 * library has been unmaintained since 2016, and the app already ships
 * Three.js, so a second particle dependency buys nothing. ~120 lines
 * gets real drift, depth parallax and shooting stars.
 *
 * Lives in App.vue so the sky is continuous across route changes.
 */

const canvasEl = ref<HTMLCanvasElement | null>(null)

const STAR_COUNT = 150

const TINTS = [
  [255, 255, 255],
  [255, 255, 255],
  [199, 210, 254], // pale indigo
  [191, 219, 254], // pale blue
  [253, 230, 138], // pale amber
  [233, 213, 255], // pale violet
]

interface Star {
  x: number
  y: number
  r: number
  tint: number[]
  /** Depth 0–1: far stars are dimmer, smaller and drift slower */
  depth: number
  phase: number
  speed: number
}

interface Shooter {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  len: number
}

let ctx: CanvasRenderingContext2D | null = null
let stars: Star[] = []
let shooters: Shooter[] = []
let raf = 0
let w = 0
let h = 0
let dpr = 1
let nextShooter = 0
let running = true

function seed() {
  stars = Array.from({ length: STAR_COUNT }, () => {
    const depth = Math.random()
    return {
      x: Math.random() * w,
      y: Math.random() * h,
      r: (0.5 + Math.random() * 1.1) * (0.5 + depth),
      tint: TINTS[Math.floor(Math.random() * TINTS.length)],
      depth,
      phase: Math.random() * Math.PI * 2,
      // Slow, uneven periods — stars blinking in lockstep look mechanical
      speed: 0.25 + Math.random() * 0.7,
    }
  })
}

function resize() {
  const canvas = canvasEl.value
  if (!canvas) return
  dpr = Math.min(window.devicePixelRatio || 1, 2)
  w = window.innerWidth
  h = window.innerHeight
  canvas.width = w * dpr
  canvas.height = h * dpr
  canvas.style.width = `${w}px`
  canvas.style.height = `${h}px`
  ctx = canvas.getContext('2d')
  ctx?.setTransform(dpr, 0, 0, dpr, 0, 0)
  seed()
}

function spawnShooter(t: number) {
  const fromLeft = Math.random() > 0.5
  const speed = 380 + Math.random() * 260
  const angle = 0.28 + Math.random() * 0.22
  shooters.push({
    x: fromLeft ? -60 : w + 60,
    y: Math.random() * h * 0.55,
    vx: (fromLeft ? 1 : -1) * speed * Math.cos(angle),
    vy: speed * Math.sin(angle),
    life: 1,
    len: 90 + Math.random() * 70,
  })
  nextShooter = t + 6000 + Math.random() * 12000
}

let last = 0

function frame(t: number) {
  if (!ctx) return
  const dt = last ? Math.min((t - last) / 1000, 0.05) : 0
  last = t

  ctx.clearRect(0, 0, w, h)

  // — Stars ————————————————————————————
  for (const s of stars) {
    s.phase += dt * s.speed

    // Continuous rightward drift, parallaxed by depth
    s.x += dt * (2 + s.depth * 7)
    if (s.x - s.r > w) s.x = -s.r

    // sin² gives a soft peak and a long dim tail — closer to a real
    // twinkle than a linear fade in and out
    const tw = Math.sin(s.phase)
    const alpha = (0.12 + 0.88 * tw * tw) * (0.35 + s.depth * 0.65)
    const [r, g, b] = s.tint

    ctx.beginPath()
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2)
    ctx.fillStyle = `rgba(${r},${g},${b},${alpha.toFixed(3)})`
    ctx.fill()

    // Bloom on the brightest few only — glowing every star washes out
    if (alpha > 0.75 && s.r > 1) {
      ctx.beginPath()
      ctx.arc(s.x, s.y, s.r * 3.5, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(${r},${g},${b},${((alpha - 0.75) * 0.28).toFixed(3)})`
      ctx.fill()
    }
  }

  // — Shooting stars ————————————————————
  if (t > nextShooter) spawnShooter(t)

  shooters = shooters.filter((sh) => {
    sh.x += sh.vx * dt
    sh.y += sh.vy * dt
    sh.life -= dt * 0.75
    if (sh.life <= 0) return false

    const nx = sh.vx / Math.hypot(sh.vx, sh.vy)
    const ny = sh.vy / Math.hypot(sh.vx, sh.vy)
    const grad = ctx!.createLinearGradient(
      sh.x,
      sh.y,
      sh.x - nx * sh.len,
      sh.y - ny * sh.len
    )
    grad.addColorStop(0, `rgba(255,255,255,${(sh.life * 0.9).toFixed(3)})`)
    grad.addColorStop(1, 'rgba(255,255,255,0)')

    ctx!.beginPath()
    ctx!.moveTo(sh.x, sh.y)
    ctx!.lineTo(sh.x - nx * sh.len, sh.y - ny * sh.len)
    ctx!.strokeStyle = grad
    ctx!.lineWidth = 1.6
    ctx!.lineCap = 'round'
    ctx!.stroke()

    return sh.x > -200 && sh.x < w + 200 && sh.y < h + 200
  })

  raf = requestAnimationFrame(frame)
}

// Stop animating when the tab is hidden — no reason to burn battery
// redrawing a sky nobody is looking at.
function onVisibility() {
  if (document.hidden) {
    cancelAnimationFrame(raf)
    running = false
  } else if (!running) {
    running = true
    last = 0
    raf = requestAnimationFrame(frame)
  }
}

onMounted(() => {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  resize()
  window.addEventListener('resize', resize)

  if (reduced) {
    // Draw one static frame so the sky is still there, just still
    if (ctx) frame(0)
    cancelAnimationFrame(raf)
    return
  }

  document.addEventListener('visibilitychange', onVisibility)
  raf = requestAnimationFrame(frame)
})

onBeforeUnmount(() => {
  cancelAnimationFrame(raf)
  window.removeEventListener('resize', resize)
  document.removeEventListener('visibilitychange', onVisibility)
})
</script>

<style scoped>
.sky {
  position: fixed;
  inset: 0;
  z-index: -1;
  pointer-events: none;
  overflow: hidden;
}

.sky__canvas {
  position: absolute;
  inset: 0;
}

/* Nebula stays in CSS — a few gradients are cheaper and smoother here
   than repainting large radial fills on the canvas every frame. */
.sky__nebula {
  position: absolute;
  inset: -25%;
  background:
    radial-gradient(
      ellipse 42% 34% at 16% 10%,
      rgba(139, 92, 246, 0.26) 0%,
      transparent 66%
    ),
    radial-gradient(
      ellipse 38% 30% at 86% 70%,
      rgba(56, 130, 246, 0.22) 0%,
      transparent 66%
    ),
    radial-gradient(
      ellipse 34% 26% at 62% 22%,
      rgba(236, 148, 74, 0.1) 0%,
      transparent 62%
    ),
    radial-gradient(
      ellipse 40% 30% at 44% 98%,
      rgba(45, 212, 191, 0.12) 0%,
      transparent 62%
    );
  animation: drift 44s ease-in-out infinite alternate;
}

@keyframes drift {
  0% {
    transform: translate3d(0, 0, 0) scale(1);
  }
  100% {
    transform: translate3d(-2.5%, 1.8%, 0) scale(1.08);
  }
}

@media (prefers-reduced-motion: reduce) {
  .sky__nebula {
    animation: none;
  }
}
</style>
