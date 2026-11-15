import { useEffect, useRef } from 'react'
import { sfx } from '../../game/systems/audio'
import { TouchPad, useKeys } from './useKeys'

const W = 480
const H = 400
const FINAL_WAVE = 5

interface Props {
  onScore: (s: number) => void
  onOver: (waves: number) => void
}

type Kind = 'chaser' | 'shooter' | 'charger'
interface Foe { x: number; y: number; vx: number; vy: number; hp: number; kind: Kind; t: number; state: 'move' | 'wind' | 'dash'; cd: number; hit: number }
interface Bolt { x: number; y: number; vx: number; vy: number }

/** GRID GLADIATOR: top-down arena survival with melee, dash i-frames and three enemy behaviours. */
export function Gladiator({ onScore, onOver }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const { keys, consume } = useKeys()
  useEffect(() => {
    const ctx = canvas.current!.getContext('2d')!
    const pl = { x: W / 2, y: H / 2, hp: 100, face: 0, swing: 0, swingCd: 0, dash: 0, dashCd: 0, inv: 0, dvx: 0, dvy: 0 }
    let foes: Foe[] = []
    let bolts: Bolt[] = []
    let heals: { x: number; y: number }[] = []
    let wave = 0
    let cleared = 0
    let kills = 0
    let between = 1.5
    let alive = true
    let raf = 0
    let last = performance.now()
    const spawn = () => {
      wave++
      const n = 2 + wave
      for (let i = 0; i < n; i++) {
        const side = i % 4
        const x = side === 0 ? 20 : side === 1 ? W - 20 : Math.random() * W
        const y = side === 2 ? 20 : side === 3 ? H - 20 : Math.random() * H
        const kind: Kind = wave >= 3 && i % 3 === 2 ? 'charger' : wave >= 2 && i % 3 === 1 ? 'shooter' : 'chaser'
        foes.push({ x, y, vx: 0, vy: 0, hp: kind === 'charger' ? 3 : kind === 'shooter' ? 2 : 2, kind, t: Math.random() * 2, state: 'move', cd: 1 + Math.random() * 2, hit: 0 })
      }
    }
    const hurt = (d: number, fx: number, fy: number) => {
      if (pl.inv > 0 || pl.dash > 0) return
      pl.hp -= d
      pl.inv = 0.7
      const a = Math.atan2(pl.y - fy, pl.x - fx)
      pl.dvx = Math.cos(a) * 260
      pl.dvy = Math.sin(a) * 260
      sfx('hurt')
      if (pl.hp <= 0) {
        alive = false
        onOver(cleared)
      }
    }
    const update = (dt: number, now: number) => {
      void now
      if (alive) {
        const k = keys.current
        let mx = 0
        let my = 0
        if (k.has('KeyA') || k.has('ArrowLeft')) mx -= 1
        if (k.has('KeyD') || k.has('ArrowRight')) mx += 1
        if (k.has('KeyW') || k.has('ArrowUp')) my -= 1
        if (k.has('KeyS') || k.has('ArrowDown')) my += 1
        const len = Math.hypot(mx, my) || 1
        if (mx || my) pl.face = Math.atan2(my, mx)
        pl.swingCd -= dt
        pl.dashCd -= dt
        pl.inv = Math.max(0, pl.inv - dt)
        if ((consume('KeyJ') || consume('Space') || k.has('Attack')) && pl.swingCd <= 0) {
          k.delete('Attack')
          pl.swing = 0.2
          pl.swingCd = 0.35
          sfx('shoot')
          for (const f of foes) {
            const d = Math.hypot(f.x - pl.x, f.y - pl.y)
            let a = Math.atan2(f.y - pl.y, f.x - pl.x) - pl.face
            while (a > Math.PI) a -= Math.PI * 2
            while (a < -Math.PI) a += Math.PI * 2
            if (d < 62 && Math.abs(a) < 1.2) {
              f.hp--
              f.hit = 0.15
              f.vx = Math.cos(pl.face) * 240
              f.vy = Math.sin(pl.face) * 240
              f.state = 'move'
            }
          }
        }
        if ((consume('KeyK') || consume('ShiftLeft') || consume('ShiftRight') || k.has('Dash')) && pl.dashCd <= 0) {
          k.delete('Dash')
          pl.dash = 0.18
          pl.dashCd = 0.8
          sfx('jump')
        }
        const sp = pl.dash > 0 ? 620 : 190
        pl.dash = Math.max(0, pl.dash - dt)
        pl.swing = Math.max(0, pl.swing - dt)
        const dirx = pl.dash > 0 ? Math.cos(pl.face) : mx / len
        const diry = pl.dash > 0 ? Math.sin(pl.face) : my / len
        pl.x += (dirx * (pl.dash > 0 || mx || my ? sp : 0) + pl.dvx) * dt
        pl.y += (diry * (pl.dash > 0 || mx || my ? sp : 0) + pl.dvy) * dt
        pl.dvx *= 0.85
        pl.dvy *= 0.85
        pl.x = Math.max(16, Math.min(W - 16, pl.x))
        pl.y = Math.max(16, Math.min(H - 16, pl.y))

        for (const f of foes) {
          f.t += dt
          f.hit = Math.max(0, f.hit - dt)
          const dx = pl.x - f.x
          const dy = pl.y - f.y
          const d = Math.hypot(dx, dy) || 1
          f.vx *= 0.9
          f.vy *= 0.9
          if (f.kind === 'chaser') {
            const s = 70 + wave * 8
            f.x += ((dx / d) * s + f.vx) * dt
            f.y += ((dy / d) * s + f.vy) * dt
          } else if (f.kind === 'shooter') {
            const want = d < 150 ? -1 : d > 220 ? 1 : 0
            f.x += ((dx / d) * 60 * want + Math.cos(f.t) * 40 + f.vx) * dt
            f.y += ((dy / d) * 60 * want + Math.sin(f.t) * 40 + f.vy) * dt
            f.cd -= dt
            if (f.cd <= 0) {
              bolts.push({ x: f.x, y: f.y, vx: (dx / d) * 200, vy: (dy / d) * 200 })
              f.cd = Math.max(0.9, 2.2 - wave * 0.12)
            }
          } else {
            f.cd -= dt
            if (f.state === 'move') {
              f.x += ((dx / d) * 45 + f.vx) * dt
              f.y += ((dy / d) * 45 + f.vy) * dt
              if (f.cd <= 0 && d < 260) {
                f.state = 'wind'
                f.cd = 0.7
                f.vx = (dx / d) * 1
                f.vy = (dy / d) * 1
              }
            } else if (f.state === 'wind') {
              if (f.cd <= 0) {
                f.state = 'dash'
                f.cd = 0.45
                const a = Math.atan2(dy, dx)
                f.vx = Math.cos(a) * 520
                f.vy = Math.sin(a) * 520
              }
            } else {
              f.x += f.vx * dt
              f.y += f.vy * dt
              f.vx /= 0.9
              f.vy /= 0.9
              if (f.cd <= 0) {
                f.state = 'move'
                f.cd = 2 + Math.random()
                f.vx = f.vy = 0
              }
            }
          }
          f.x = Math.max(12, Math.min(W - 12, f.x))
          f.y = Math.max(12, Math.min(H - 12, f.y))
          if (d < 24) hurt(f.kind === 'charger' && f.state === 'dash' ? 25 : 12, f.x, f.y)
        }
        const before = foes.length
        foes = foes.filter((f) => {
          if (f.hp <= 0) {
            kills++
            sfx('explode')
            if (Math.random() < 0.15) heals.push({ x: f.x, y: f.y })
            return false
          }
          return true
        })
        void before
        bolts = bolts.filter((b) => {
          b.x += b.vx * dt
          b.y += b.vy * dt
          if (Math.hypot(b.x - pl.x, b.y - pl.y) < 12) {
            hurt(10, b.x, b.y)
            return false
          }
          return b.x > 0 && b.x < W && b.y > 0 && b.y < H
        })
        heals = heals.filter((h) => {
          if (Math.hypot(h.x - pl.x, h.y - pl.y) < 18) {
            pl.hp = Math.min(100, pl.hp + 25)
            sfx('unlock')
            return false
          }
          return true
        })
        if (foes.length === 0) {
          if (wave > cleared) {
            cleared = wave
            onScore(cleared)
            sfx('checkpoint')
            if (cleared >= FINAL_WAVE) {
              alive = false
              sfx('achievement')
              onOver(cleared)
            }
            pl.hp = Math.min(100, pl.hp + 15)
            heals.push({ x: W / 2, y: H / 2 })
          }
          between -= dt
          if (between <= 0) {
            spawn()
            between = 2
          }
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
      // draw
      ctx.fillStyle = '#05020c'
      ctx.fillRect(0, 0, W, H)
      ctx.strokeStyle = 'rgba(255,77,77,0.12)'
      for (let x = 0; x < W; x += 32) {
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, H)
        ctx.stroke()
      }
      for (let y = 0; y < H; y += 32) {
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(W, y)
        ctx.stroke()
      }
      ctx.shadowBlur = 12
      for (const h of heals) {
        ctx.fillStyle = ctx.shadowColor = '#3dff8b'
        ctx.fillRect(h.x - 3, h.y - 9, 6, 18)
        ctx.fillRect(h.x - 9, h.y - 3, 18, 6)
      }
      for (const f of foes) {
        const c = f.hit > 0 ? '#ffffff' : f.kind === 'chaser' ? '#ff2bd6' : f.kind === 'shooter' ? '#ffe14d' : f.state === 'wind' ? '#ffffff' : '#ff9a4d'
        ctx.fillStyle = ctx.shadowColor = c
        if (f.kind === 'shooter') {
          ctx.beginPath()
          ctx.arc(f.x, f.y, 11, 0, Math.PI * 2)
          ctx.fill()
        } else if (f.kind === 'charger') {
          ctx.save()
          ctx.translate(f.x, f.y)
          ctx.rotate(Math.atan2(pl.y - f.y, pl.x - f.x))
          ctx.fillRect(-14, -10, 28, 20)
          ctx.restore()
        } else ctx.fillRect(f.x - 10, f.y - 10, 20, 20)
      }
      ctx.fillStyle = ctx.shadowColor = '#ff4d4d'
      for (const b of bolts) ctx.fillRect(b.x - 3, b.y - 3, 6, 6)
      if (alive) {
        ctx.fillStyle = ctx.shadowColor = pl.inv > 0 && Math.floor(now / 70) % 2 ? '#ff4d4d' : '#00f0ff'
        ctx.beginPath()
        ctx.arc(pl.x, pl.y, 12, 0, Math.PI * 2)
        ctx.fill()
        ctx.strokeStyle = '#fff'
        ctx.lineWidth = 3
        ctx.beginPath()
        ctx.moveTo(pl.x, pl.y)
        ctx.lineTo(pl.x + Math.cos(pl.face) * 18, pl.y + Math.sin(pl.face) * 18)
        ctx.stroke()
        if (pl.swing > 0) {
          ctx.strokeStyle = '#00f0ff'
          ctx.lineWidth = 6
          ctx.beginPath()
          ctx.arc(pl.x, pl.y, 50, pl.face - 1.1, pl.face + 1.1)
          ctx.stroke()
        }
      }
      ctx.shadowBlur = 0
      ctx.fillStyle = '#300'
      ctx.fillRect(10, 10, 140, 9)
      ctx.fillStyle = pl.hp > 30 ? '#3dff8b' : '#ff4d4d'
      ctx.fillRect(10, 10, Math.max(0, pl.hp) * 1.4, 9)
      ctx.fillStyle = '#fff'
      ctx.font = '13px "Share Tech Mono", monospace'
      ctx.fillText(`WAVE ${wave}/${FINAL_WAVE}   KILLS ${kills}`, 165, 19)
      if (!alive && cleared >= FINAL_WAVE) ctx.fillText('ARENA CHAMPION!', W / 2 - 60, H / 2)
      if (foes.length === 0 && alive && wave > 0) ctx.fillText(`WAVE ${wave} CLEARED — next wave incoming`, W / 2 - 130, H / 2 - 40)
      raf = requestAnimationFrame(loop)
      if (!alive) cancelAnimationFrame(raf)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return (
    <div className="flex flex-col items-center gap-2">
      <canvas ref={canvas} width={W} height={H} className="aspect-[480/400] w-full max-w-[480px] touch-none border border-red-400/30" />
      <TouchPad
        keys={keys}
        buttons={[
          { code: 'ArrowLeft', label: '◀' },
          { code: 'ArrowUp', label: '▲' },
          { code: 'ArrowDown', label: '▼' },
          { code: 'ArrowRight', label: '▶' },
          { code: 'Attack', label: 'STRIKE' },
          { code: 'Dash', label: 'DASH' },
        ]}
      />
    </div>
  )
}
