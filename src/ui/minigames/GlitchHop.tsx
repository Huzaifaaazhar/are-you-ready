import { useEffect, useRef } from 'react'
import { sfx } from '../../game/systems/audio'
import { TouchPad, useKeys } from './useKeys'

const T = 24
const ROWS = 14
const COLS = 112
const VW = 480
const VH = ROWS * T

interface Props {
  onScore: (s: number) => void
  onOver: (s: number, completed: boolean) => void
}

interface Mover { x: number; y: number; w: number; ox: number; oy: number; ax: number; ay: number; period: number; dx: number; dy: number }
interface Bug { x: number; y: number; min: number; max: number; dir: number; alive: boolean }

/** Level built from small helpers so the layout stays readable and fair (gaps ≤ 4 tiles; jump ≈ 2.8 tiles high). */
function buildLevel() {
  const g: string[][] = Array.from({ length: ROWS }, () => Array(COLS).fill('.'))
  const fill = (c0: number, c1: number, r0: number, r1 = ROWS - 1) => {
    for (let c = c0; c <= c1; c++) for (let r = r0; r <= r1; r++) g[r][c] = '#'
  }
  const spikes = (c0: number, c1: number, r: number) => {
    for (let c = c0; c <= c1; c++) g[r][c] = '^'
  }
  const bits: [number, number][] = []
  const bit = (c: number, r: number) => bits.push([c, r])
  // 1. start
  fill(0, 14, 11)
  for (let c = 4; c <= 12; c += 2) bit(c, 9)
  // 2. pit with a moving platform
  // 3. ground with spikes and a bug
  fill(19, 30, 11)
  spikes(23, 24, 10)
  bit(23, 7)
  bit(24, 7)
  // 4. stairs + checkpoint
  fill(31, 31, 10)
  fill(32, 32, 9)
  fill(33, 36, 8)
  // 5. high platforms
  fill(39, 41, 8, 8)
  fill(44, 46, 7, 7)
  bit(40, 6)
  bit(45, 5)
  fill(47, 47, 12)
  // 6. ground with spikes + jump blocks
  fill(50, 61, 11)
  spikes(53, 56, 10)
  fill(54, 55, 8, 8)
  bit(54, 5)
  bit(55, 5)
  // 8. floating islands over a long pit
  fill(64, 65, 9, 9)
  fill(68, 69, 7, 7)
  fill(76, 77, 9, 9)
  bit(64, 7)
  bit(68, 5)
  bit(76, 7)
  // 9. ground with bugs and spikes
  fill(80, 95, 11)
  spikes(86, 87, 10)
  bit(86, 7)
  bit(87, 7)
  // 10. final climb
  fill(98, 99, 9, 9)
  fill(101, 111, 6)
  bit(103, 4)
  bit(105, 4)
  return {
    g,
    bits,
    movers: [
      { x: 0, y: 0, w: 3, ox: 15, oy: 11, ax: 1.5, ay: 0, period: 3, dx: 0, dy: 0 },
      { x: 0, y: 0, w: 2, ox: 48, oy: 9, ax: 0, ay: 2.5, period: 3.5, dx: 0, dy: 0 },
      { x: 0, y: 0, w: 3, ox: 71, oy: 8, ax: 2, ay: 0, period: 3.2, dx: 0, dy: 0 },
      { x: 0, y: 0, w: 2, ox: 96, oy: 8.5, ax: 0, ay: 2.5, period: 3, dx: 0, dy: 0 },
    ] as Mover[],
    bugs: [
      { x: 27, y: 10, min: 25, max: 30, dir: 1, alive: true },
      { x: 58, y: 10, min: 57, max: 61, dir: -1, alive: true },
      { x: 82, y: 10, min: 80, max: 85, dir: 1, alive: true },
      { x: 91, y: 10, min: 89, max: 95, dir: -1, alive: true },
    ] as Bug[],
    flags: [2, 33, 52, 81],
    core: 108,
  }
}

/** GLITCH HOP: side-scrolling pixel platformer. */
export function GlitchHop({ onScore, onOver }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const { keys } = useKeys()
  useEffect(() => {
    const ctx = canvas.current!.getContext('2d')!
    const L = buildLevel()
    const taken = new Set<number>()
    const pl = { x: 2, y: 9.5, vx: 0, vy: 0, w: 0.75, h: 0.95, ground: false, coyote: 0, jumpBuf: 0, onMover: -1 }
    let checkpoint = 2
    let lives = 5
    let score = 0
    let state: 'play' | 'won' | 'dead' = 'play'
    let raf = 0
    let last = performance.now()
    let time = 0
    let jumpHeld = false
    let flash = 0
    const solid = (c: number, r: number) => {
      if (c < 0 || c >= COLS) return true
      if (r < 0) return false
      if (r >= ROWS) return false
      return L.g[r][c] === '#'
    }
    const tileAt = (c: number, r: number) => (r >= 0 && r < ROWS && c >= 0 && c < COLS ? L.g[r][c] : '.')
    const die = () => {
      lives--
      sfx('hurt')
      flash = 0.4
      if (lives <= 0) {
        state = 'dead'
        onOver(score, false)
        return
      }
      pl.x = checkpoint
      pl.y = 4
      pl.vx = pl.vy = 0
    }
    const moverRects = () => L.movers.map((m) => ({ x: m.x, y: m.y, w: m.w, h: 0.5 }))
    const update = (dt: number, now: number) => {
      void now
      time += dt
      flash = Math.max(0, flash - dt)
      if (state === 'play') {
        // movers
        L.movers.forEach((m) => {
          const nx = m.ox + Math.sin((time / m.period) * Math.PI * 2) * m.ax
          const ny = m.oy + Math.sin((time / m.period) * Math.PI * 2) * m.ay
          m.dx = nx - m.x
          m.dy = ny - m.y
          m.x = nx
          m.y = ny
        })
        // carried by mover
        if (pl.onMover >= 0) {
          const m = L.movers[pl.onMover]
          pl.x += m.dx
          pl.y += m.dy
        }
        const k = keys.current
        const left = k.has('ArrowLeft') || k.has('KeyA')
        const right = k.has('ArrowRight') || k.has('KeyD')
        const jump = k.has('Space') || k.has('ArrowUp') || k.has('KeyW')
        if (jump && !jumpHeld) pl.jumpBuf = 0.12
        jumpHeld = jump
        const target = (right ? 1 : 0) - (left ? 1 : 0)
        pl.vx += (target * 7 - pl.vx) * Math.min(1, dt * (pl.ground ? 14 : 6))
        pl.vy += 40 * dt
        if (!jump && pl.vy < -4) pl.vy += 60 * dt
        pl.vy = Math.min(pl.vy, 22)
        pl.coyote = pl.ground ? 0.1 : pl.coyote - dt
        pl.jumpBuf -= dt
        if (pl.jumpBuf > 0 && pl.coyote > 0) {
          pl.vy = -15
          pl.jumpBuf = 0
          pl.coyote = 0
          sfx('jump')
        }
        // move X
        pl.x += pl.vx * dt
        for (const r of [Math.floor(pl.y), Math.floor(pl.y + pl.h - 0.01)]) {
          if (pl.vx > 0 && solid(Math.floor(pl.x + pl.w), r)) pl.x = Math.floor(pl.x + pl.w) - pl.w - 0.001
          if (pl.vx < 0 && solid(Math.floor(pl.x), r)) pl.x = Math.floor(pl.x) + 1.001
        }
        // move Y
        pl.y += pl.vy * dt
        pl.ground = false
        pl.onMover = -1
        for (const c of [Math.floor(pl.x), Math.floor(pl.x + pl.w - 0.01)]) {
          if (pl.vy > 0 && solid(c, Math.floor(pl.y + pl.h))) {
            pl.y = Math.floor(pl.y + pl.h) - pl.h
            pl.vy = 0
            pl.ground = true
          }
          if (pl.vy < 0 && solid(c, Math.floor(pl.y))) {
            pl.y = Math.floor(pl.y) + 1
            pl.vy = 0
          }
        }
        // movers as one-way platforms
        moverRects().forEach((m, i) => {
          const feet = pl.y + pl.h
          if (pl.vy >= 0 && pl.x + pl.w > m.x && pl.x < m.x + m.w && feet >= m.y && feet - pl.vy * dt - 0.05 <= m.y + 0.2) {
            pl.y = m.y - pl.h
            pl.vy = 0
            pl.ground = true
            pl.onMover = i
          }
        })
        // hazards
        for (const [c, r] of [[Math.floor(pl.x + 0.1), Math.floor(pl.y + pl.h - 0.1)], [Math.floor(pl.x + pl.w - 0.1), Math.floor(pl.y + pl.h - 0.1)]])
          if (tileAt(c, r) === '^' && pl.y + pl.h > r + 0.45) die()
        if (pl.y > ROWS + 1) die()
        // bugs
        for (const b of L.bugs) {
          if (!b.alive) continue
          b.x += b.dir * 2.2 * dt
          if (b.x < b.min || b.x > b.max) b.dir *= -1
          if (pl.x + pl.w > b.x && pl.x < b.x + 0.9 && pl.y + pl.h > b.y + 0.3 && pl.y < b.y + 0.9) {
            if (pl.vy > 2 && pl.y + pl.h < b.y + 0.6) {
              b.alive = false
              pl.vy = -10
              score += 50
              onScore(score)
              sfx('explode')
            } else die()
          }
        }
        // bits
        L.bits.forEach(([c, r], i) => {
          if (!taken.has(i) && Math.abs(pl.x + pl.w / 2 - (c + 0.5)) < 0.7 && Math.abs(pl.y + pl.h / 2 - (r + 0.5)) < 0.8) {
            taken.add(i)
            score += 25
            onScore(score)
            sfx('coin')
          }
        })
        // checkpoints
        for (const f of L.flags) if (pl.x > f && f > checkpoint) {
          checkpoint = f
          sfx('checkpoint')
        }
        // goal
        if (pl.x > L.core - 0.5 && pl.y < 6) {
          state = 'won'
          score += 500 + lives * 50
          onScore(score)
          sfx('achievement')
          onOver(score, true)
        }
      }
          }
    const loop = (now: number) => {
      const frameDt = Math.min(0.25, (now - last) / 1000)
      last = now
      const steps = Math.max(1, Math.ceil(frameDt / (1 / 60) - 0.01))
      for (let si = 0; si < steps; si++) update(frameDt / steps, now)
      const dt = frameDt
      void dt
      // ---- draw ----
      const camX = Math.max(0, Math.min(COLS * T - VW, (pl.x + 0.5) * T - VW / 2))
      ctx.fillStyle = '#05020c'
      ctx.fillRect(0, 0, VW, VH)
      // parallax
      ctx.fillStyle = '#120830'
      for (let i = 0; i < 30; i++) {
        const x = ((i * 97 - camX * 0.3) % (VW + 100) + VW + 100) % (VW + 100) - 50
        ctx.fillRect(x, 120 + ((i * 53) % 90), 40, 300)
      }
      ctx.save()
      ctx.translate(-Math.round(camX), 0)
      const c0 = Math.floor(camX / T)
      for (let c = c0; c < c0 + VW / T + 2; c++)
        for (let r = 0; r < ROWS; r++) {
          const t = tileAt(c, r)
          if (t === '#') {
            ctx.fillStyle = '#1a2a1a'
            ctx.fillRect(c * T, r * T, T, T)
            if (tileAt(c, r - 1) !== '#') {
              ctx.fillStyle = '#3dff8b'
              ctx.fillRect(c * T, r * T, T, 3)
            }
          } else if (t === '^') {
            ctx.fillStyle = '#ff4d4d'
            ctx.beginPath()
            for (let s = 0; s < 3; s++) {
              ctx.moveTo(c * T + s * 8, r * T + T)
              ctx.lineTo(c * T + s * 8 + 4, r * T + 8)
              ctx.lineTo(c * T + s * 8 + 8, r * T + T)
            }
            ctx.fill()
          }
        }
      ctx.shadowBlur = 10
      L.movers.forEach((m) => {
        ctx.fillStyle = ctx.shadowColor = '#00f0ff'
        ctx.fillRect(m.x * T, m.y * T, m.w * T, T * 0.5)
      })
      L.bits.forEach(([c, r], i) => {
        if (taken.has(i)) return
        ctx.fillStyle = ctx.shadowColor = '#ffe14d'
        const bob = Math.sin(time * 4 + i) * 2
        ctx.fillRect(c * T + 8, r * T + 8 + bob, 8, 8)
      })
      for (const b of L.bugs) {
        if (!b.alive) continue
        ctx.fillStyle = ctx.shadowColor = '#ff2bd6'
        ctx.fillRect(b.x * T, b.y * T + 6, T * 0.9, T * 0.6)
        ctx.fillStyle = '#fff'
        ctx.fillRect(b.x * T + (b.dir > 0 ? 14 : 4), b.y * T + 10, 3, 3)
      }
      for (const f of L.flags) {
        ctx.fillStyle = ctx.shadowColor = f <= checkpoint ? '#3dff8b' : '#556'
        ctx.fillRect(f * T, 6 * T, 3, T * 5)
        ctx.fillRect(f * T + 3, 6 * T, 14, 9)
      }
      // core gate with the Founder's star mark
      ctx.fillStyle = ctx.shadowColor = '#9d4dff'
      ctx.fillRect(L.core * T, 3 * T, T * 1.5, T * 3)
      ctx.strokeStyle = '#ffe14d'
      ctx.lineWidth = 2
      ctx.beginPath()
      const cx = L.core * T + 18
      const cy = 4.5 * T
      for (let i = 0; i <= 10; i++) {
        const a = -Math.PI / 2 + (i * Math.PI) / 5
        const rr = i % 2 ? 5 : 12
        ctx.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr)
      }
      ctx.stroke()
      // player
      if (state !== 'dead') {
        ctx.fillStyle = ctx.shadowColor = flash > 0 ? '#ff4d4d' : '#00f0ff'
        ctx.fillRect(pl.x * T, pl.y * T, pl.w * T, pl.h * T)
        ctx.fillStyle = '#fff'
        ctx.fillRect(pl.x * T + (pl.vx >= 0 ? 12 : 3), pl.y * T + 5, 3, 3)
      }
      ctx.shadowBlur = 0
      ctx.restore()
      ctx.fillStyle = '#fff'
      ctx.font = '13px "Share Tech Mono", monospace'
      ctx.fillText(`LIVES ${'♥'.repeat(Math.max(0, lives))}   BITS ${taken.size}/${L.bits.length}`, 8, 16)
      if (state === 'play') raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    if (typeof window !== 'undefined') (window as unknown as { __glitchhop: unknown }).__glitchhop = { pl, L, warp: (x: number) => ((pl.x = x), (pl.y = 3)) }
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return (
    <div className="flex flex-col items-center gap-2">
      <canvas ref={canvas} width={VW} height={VH} className="aspect-[480/336] w-full max-w-[480px] touch-none border border-lime/30" />
      <TouchPad keys={keys} buttons={[{ code: 'ArrowLeft', label: '◀' }, { code: 'ArrowRight', label: '▶' }, { code: 'Space', label: 'JUMP' }]} />
    </div>
  )
}
