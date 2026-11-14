import { useEffect, useRef } from 'react'
import { sfx } from '../../game/systems/audio'

const W = 360
const H = 480

interface Props {
  onScore: (s: number) => void
  onOver: (s: number) => void
}

interface Enemy { x: number; y: number; alive: boolean; kind: number }
interface Bullet { x: number; y: number; vy: number }

/** STAR LANCER: original fixed-shooter cabinet game. */
export function StarLancer({ onScore, onOver }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const pointerX = useRef<number | null>(null)
  const held = useRef({ left: false, right: false })

  useEffect(() => {
    const ctx = canvas.current!.getContext('2d')!
    let shipX = W / 2
    let lives = 3
    let score = 0
    let wave = 0
    let enemies: Enemy[] = []
    let shots: Bullet[] = []
    let bombs: Bullet[] = []
    let fireT = 0
    let swayT = 0
    let offsetY = 0
    let invuln = 0
    let alive = true
    let raf = 0
    let last = performance.now()
    const stars = Array.from({ length: 60 }, () => ({ x: Math.random() * W, y: Math.random() * H, s: 0.5 + Math.random() * 1.5 }))
    const keys = new Set<string>()
    const spawn = () => {
      wave++
      enemies = []
      offsetY = 0
      for (let r = 0; r < 4; r++) for (let c = 0; c < 7; c++) enemies.push({ x: 40 + c * 44, y: 50 + r * 34, alive: true, kind: r })
    }
    spawn()
    const hurt = () => {
      if (invuln > 0) return
      lives--
      invuln = 1.6
      sfx('hurt')
      if (lives <= 0) {
        alive = false
        onOver(score)
      }
    }
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      if (alive) {
        // input
        const left = keys.has('ArrowLeft') || keys.has('KeyA') || held.current.left
        const right = keys.has('ArrowRight') || keys.has('KeyD') || held.current.right
        if (pointerX.current !== null) shipX += (pointerX.current - shipX) * Math.min(1, dt * 12)
        shipX += ((right ? 1 : 0) - (left ? 1 : 0)) * 260 * dt
        shipX = Math.max(16, Math.min(W - 16, shipX))
        fireT -= dt
        if (fireT <= 0) {
          shots.push({ x: shipX, y: H - 50, vy: -420 })
          fireT = 0.28
          sfx('shoot')
        }
        invuln = Math.max(0, invuln - dt)
        // enemies
        swayT += dt * (0.8 + wave * 0.15)
        offsetY += dt * (4 + wave * 1.5)
        const sway = Math.sin(swayT) * 30
        const live = enemies.filter((e) => e.alive)
        if (live.length && Math.random() < dt * (0.8 + wave * 0.35)) {
          const e = live[Math.floor(Math.random() * live.length)]
          bombs.push({ x: e.x + sway, y: e.y + offsetY, vy: 160 + wave * 20 })
        }
        shots = shots.filter((b) => (b.y += b.vy * dt) > -10)
        bombs = bombs.filter((b) => (b.y += b.vy * dt) < H + 10)
        for (const s of shots) {
          for (const e of enemies) {
            if (!e.alive) continue
            if (Math.abs(s.x - (e.x + sway)) < 16 && Math.abs(s.y - (e.y + offsetY)) < 12) {
              e.alive = false
              s.y = -100
              score += 10
              onScore(score)
              sfx('explode')
            }
          }
        }
        for (const b of bombs) if (Math.abs(b.x - shipX) < 14 && Math.abs(b.y - (H - 36)) < 14) {
          b.y = H + 100
          hurt()
        }
        if (live.some((e) => e.y + offsetY > H - 70)) {
          hurt()
          if (alive) {
            score += 0
            spawn()
          }
        }
        if (!enemies.some((e) => e.alive)) {
          score += 50
          onScore(score)
          sfx('checkpoint')
          spawn()
        }
        // draw
        ctx.fillStyle = '#03010a'
        ctx.fillRect(0, 0, W, H)
        ctx.fillStyle = '#ffffff'
        for (const st of stars) {
          st.y = (st.y + st.s * 30 * dt) % H
          ctx.globalAlpha = st.s / 2
          ctx.fillRect(st.x, st.y, st.s, st.s)
        }
        ctx.globalAlpha = 1
        ctx.shadowBlur = 12
        const cols = ['#ff2bd6', '#9d4dff', '#00f0ff', '#3dff8b']
        for (const e of enemies) {
          if (!e.alive) continue
          const x = e.x + sway
          const y = e.y + offsetY
          ctx.fillStyle = ctx.shadowColor = cols[e.kind]
          ctx.fillRect(x - 12, y - 6, 24, 8)
          ctx.fillRect(x - 8, y - 10, 16, 4)
          const flap = Math.sin(now / 150 + e.x) > 0 ? 4 : 0
          ctx.fillRect(x - 14, y + 2, 5, 5 + flap)
          ctx.fillRect(x + 9, y + 2, 5, 5 + flap)
        }
        ctx.fillStyle = ctx.shadowColor = '#ffe14d'
        for (const s of shots) ctx.fillRect(s.x - 1.5, s.y - 8, 3, 12)
        ctx.fillStyle = ctx.shadowColor = '#ff4d4d'
        for (const b of bombs) ctx.fillRect(b.x - 2, b.y - 5, 4, 10)
        if (invuln <= 0 || Math.floor(now / 100) % 2 === 0) {
          ctx.fillStyle = ctx.shadowColor = '#00f0ff'
          ctx.beginPath()
          ctx.moveTo(shipX, H - 52)
          ctx.lineTo(shipX + 14, H - 26)
          ctx.lineTo(shipX, H - 32)
          ctx.lineTo(shipX - 14, H - 26)
          ctx.closePath()
          ctx.fill()
        }
        ctx.shadowBlur = 0
        ctx.fillStyle = '#ffffff'
        ctx.font = '14px "Share Tech Mono", monospace'
        ctx.fillText(`WAVE ${wave}`, 10, H - 8)
        ctx.fillText('♥'.repeat(Math.max(0, lives)), W - 50, H - 8)
        raf = requestAnimationFrame(loop)
      }
    }
    raf = requestAnimationFrame(loop)
    const kd = (e: KeyboardEvent) => {
      if (['ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault()
      keys.add(e.code)
    }
    const ku = (e: KeyboardEvent) => keys.delete(e.code)
    window.addEventListener('keydown', kd)
    window.addEventListener('keyup', ku)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('keydown', kd)
      window.removeEventListener('keyup', ku)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const toLocal = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    return ((e.clientX - r.left) / r.width) * W
  }
  return (
    <div className="flex flex-col items-center gap-3">
      <canvas
        ref={canvas}
        width={W}
        height={H}
        className="aspect-[3/4] w-full max-w-[340px] touch-none border border-magenta/30"
        onPointerDown={(e) => (pointerX.current = toLocal(e))}
        onPointerMove={(e) => {
          if (e.buttons || e.pointerType === 'touch') pointerX.current = toLocal(e)
        }}
        onPointerUp={() => (pointerX.current = null)}
        onPointerLeave={() => (pointerX.current = null)}
      />
      <div className="flex gap-2 sm:hidden">
        <button className="chip !px-6" aria-label="Move left" onPointerDown={() => (held.current.left = true)} onPointerUp={() => (held.current.left = false)} onPointerLeave={() => (held.current.left = false)}>◀</button>
        <button className="chip !px-6" aria-label="Move right" onPointerDown={() => (held.current.right = true)} onPointerUp={() => (held.current.right = false)} onPointerLeave={() => (held.current.right = false)}>▶</button>
      </div>
    </div>
  )
}
