import { useEffect, useRef } from 'react'
import { sfx } from '../../game/systems/audio'
import { TouchPad, useKeys } from './useKeys'

const W = 400
const H = 520

interface Props {
  onScore: (s: number) => void
  onOver: (s: number) => void
}

type EnemyKind = 'grunt' | 'diver' | 'turret' | 'boss'
interface Enemy { x: number; y: number; vx: number; vy: number; hp: number; kind: EnemyKind; t: number; fire: number; r: number }
interface Shot { x: number; y: number; vx: number; vy: number; enemy: boolean }
type PowerKind = 'spread' | 'rapid' | 'shield' | 'repair'
interface Power { x: number; y: number; kind: PowerKind }

const POWER_COLOR: Record<PowerKind, string> = { spread: '#ffe14d', rapid: '#00f0ff', shield: '#9d4dff', repair: '#3dff8b' }

/** STAR LANCER: top-down space battle with waves, power-ups, health and a boss every fifth wave. */
export function StarLancer({ onScore, onOver }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const { keys } = useKeys()
  const pointer = useRef<{ x: number; y: number } | null>(null)

  useEffect(() => {
    const ctx = canvas.current!.getContext('2d')!
    const ship = { x: W / 2, y: H - 70, hp: 100, shield: 0, spreadUntil: 0, rapidUntil: 0, inv: 0 }
    let enemies: Enemy[] = []
    let shots: Shot[] = []
    let powers: Power[] = []
    let parts: { x: number; y: number; vx: number; vy: number; life: number; c: string }[] = []
    let score = 0
    let wave = 0
    let fireT = 0
    let waveDelay = 1.2
    let alive = true
    let raf = 0
    let last = performance.now()
    let time = 0
    const stars = Array.from({ length: 90 }, () => ({ x: Math.random() * W, y: Math.random() * H, s: 0.3 + Math.random() * 1.6 }))

    const boom = (x: number, y: number, c: string, n = 14) => {
      for (let i = 0; i < n; i++) parts.push({ x, y, vx: (Math.random() - 0.5) * 220, vy: (Math.random() - 0.5) * 220, life: 0.5 + Math.random() * 0.4, c })
    }
    const spawnWave = () => {
      wave++
      const d = 1 + wave * 0.15
      if (wave % 5 === 0) {
        enemies.push({ x: W / 2, y: -60, vx: 60 * d, vy: 40, hp: 40 + wave * 8, kind: 'boss', t: 0, fire: 1, r: 34 })
        return
      }
      const grunts = 4 + wave
      for (let i = 0; i < grunts; i++) enemies.push({ x: 40 + ((i * 70) % (W - 80)), y: -30 - Math.floor(i / 5) * 50, vx: 0, vy: 40 * d, hp: 1, kind: 'grunt', t: i, fire: 2 + Math.random() * 3, r: 13 })
      for (let i = 0; i < Math.floor(wave / 2) + 1; i++) enemies.push({ x: Math.random() * (W - 60) + 30, y: -80 - i * 60, vx: 0, vy: 60 * d, hp: 2, kind: 'diver', t: 0, fire: 99, r: 12 })
      if (wave >= 2) for (let i = 0; i < Math.min(3, wave - 1); i++) enemies.push({ x: 80 + i * 120, y: -40, vx: 0, vy: 30, hp: 4, kind: 'turret', t: 0, fire: 1.5, r: 16 })
    }
    const hurt = (dmg: number) => {
      if (ship.inv > 0) return
      if (ship.shield > 0) {
        ship.shield--
        ship.inv = 0.5
        sfx('blip')
        return
      }
      ship.hp -= dmg
      ship.inv = 0.8
      sfx('hurt')
      if (ship.hp <= 0) {
        alive = false
        boom(ship.x, ship.y, '#00f0ff', 40)
        onOver(score)
      }
    }
    const addScore = (n: number) => {
      score += n
      onScore(score)
    }

    const update = (dt: number, now: number) => {
      void now
      time += dt
      if (alive) {
        // movement
        const k = keys.current
        let mx = 0
        let my = 0
        if (k.has('ArrowLeft') || k.has('KeyA')) mx -= 1
        if (k.has('ArrowRight') || k.has('KeyD')) mx += 1
        if (k.has('ArrowUp') || k.has('KeyW')) my -= 1
        if (k.has('ArrowDown') || k.has('KeyS')) my += 1
        ship.x += mx * 240 * dt
        ship.y += my * 240 * dt
        if (pointer.current) {
          ship.x += (pointer.current.x - ship.x) * Math.min(1, dt * 10)
          ship.y += (pointer.current.y - 40 - ship.y) * Math.min(1, dt * 10)
        }
        ship.x = Math.max(16, Math.min(W - 16, ship.x))
        ship.y = Math.max(H * 0.35, Math.min(H - 24, ship.y))
        ship.inv = Math.max(0, ship.inv - dt)
        // firing (automatic)
        fireT -= dt
        if (fireT <= 0) {
          const rapid = time < ship.rapidUntil
          fireT = rapid ? 0.1 : 0.22
          shots.push({ x: ship.x, y: ship.y - 18, vx: 0, vy: -520, enemy: false })
          if (time < ship.spreadUntil) {
            shots.push({ x: ship.x, y: ship.y - 14, vx: -150, vy: -480, enemy: false })
            shots.push({ x: ship.x, y: ship.y - 14, vx: 150, vy: -480, enemy: false })
          }
          sfx('shoot')
        }
        // waves
        if (enemies.length === 0) {
          waveDelay -= dt
          if (waveDelay <= 0) {
            if (wave > 0) addScore(100 * wave)
            spawnWave()
            waveDelay = 1.5
          }
        }
        // enemies
        for (const e of enemies) {
          e.t += dt
          if (e.kind === 'grunt') {
            e.y += e.vy * dt
            e.x += Math.sin(e.t * 2) * 60 * dt
            if (e.y > H + 30) e.y = -30
          } else if (e.kind === 'diver') {
            e.y += e.vy * dt
            if (e.y > 60) e.x += Math.sign(ship.x - e.x) * 130 * dt
            e.vy = Math.min(320, e.vy + 120 * dt)
            if (e.y > H + 30) {
              e.y = -40
              e.vy = 60
            }
          } else if (e.kind === 'turret') {
            if (e.y < 70) e.y += e.vy * dt
            e.x += Math.sin(e.t) * 40 * dt
          } else {
            if (e.y < 90) e.y += e.vy * dt
            e.x += e.vx * dt
            if (e.x < 60 || e.x > W - 60) e.vx *= -1
          }
          e.fire -= dt
          if (e.fire <= 0 && e.kind !== 'diver') {
            const ang = Math.atan2(ship.y - e.y, ship.x - e.x)
            const sp = 170 + wave * 10
            if (e.kind === 'boss') {
              for (let a = -2; a <= 2; a++) shots.push({ x: e.x, y: e.y + 20, vx: Math.cos(ang + a * 0.25) * sp, vy: Math.sin(ang + a * 0.25) * sp, enemy: true })
              e.fire = Math.max(0.6, 1.4 - wave * 0.05)
            } else if (e.kind === 'turret') {
              shots.push({ x: e.x, y: e.y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, enemy: true })
              e.fire = Math.max(0.8, 2 - wave * 0.08)
            } else {
              shots.push({ x: e.x, y: e.y, vx: 0, vy: sp, enemy: true })
              e.fire = 2.5 + Math.random() * 3 - Math.min(1.5, wave * 0.1)
            }
          }
          if (Math.hypot(e.x - ship.x, e.y - ship.y) < e.r + 12) {
            hurt(30)
            if (e.kind !== 'boss') e.hp = 0
          }
        }
        // shots
        for (const s of shots) {
          s.x += s.vx * dt
          s.y += s.vy * dt
          if (s.enemy) {
            if (Math.hypot(s.x - ship.x, s.y - ship.y) < 12) {
              s.y = 9999
              hurt(15)
            }
          } else {
            for (const e of enemies) {
              if (e.hp > 0 && Math.hypot(s.x - e.x, s.y - e.y) < e.r) {
                e.hp--
                s.y = -9999
                if (e.hp <= 0) {
                  const pts = { grunt: 50, diver: 80, turret: 120, boss: 1000 }[e.kind]
                  addScore(pts)
                  boom(e.x, e.y, e.kind === 'boss' ? '#ffe14d' : '#ff2bd6', e.kind === 'boss' ? 60 : 14)
                  sfx('explode')
                  if (Math.random() < (e.kind === 'grunt' ? 0.08 : 0.3) || e.kind === 'boss') {
                    const kinds: PowerKind[] = ['spread', 'rapid', 'shield', 'repair']
                    powers.push({ x: e.x, y: e.y, kind: kinds[Math.floor(Math.random() * 4)] })
                  }
                }
              }
            }
          }
        }
        enemies = enemies.filter((e) => e.hp > 0)
        shots = shots.filter((s) => s.y > -20 && s.y < H + 20 && s.x > -20 && s.x < W + 20)
        for (const p of powers) {
          p.y += 90 * dt
          if (Math.hypot(p.x - ship.x, p.y - ship.y) < 20) {
            p.y = 9999
            sfx('unlock')
            if (p.kind === 'spread') ship.spreadUntil = time + 10
            if (p.kind === 'rapid') ship.rapidUntil = time + 10
            if (p.kind === 'shield') ship.shield = 3
            if (p.kind === 'repair') ship.hp = Math.min(100, ship.hp + 35)
          }
        }
        powers = powers.filter((p) => p.y < H + 20)
      }
      for (const p of parts) {
        p.x += p.vx * dt
        p.y += p.vy * dt
        p.life -= dt
      }
      parts = parts.filter((p) => p.life > 0)

          }
    const loop = (now: number) => {
      const frameDt = Math.min(0.25, (now - last) / 1000)
      last = now
      const steps = Math.max(1, Math.ceil(frameDt / (1 / 60) - 0.01))
      for (let si = 0; si < steps; si++) update(frameDt / steps, now)
      const dt = frameDt
      void dt
      // ---- draw ----
      ctx.fillStyle = '#03010a'
      ctx.fillRect(0, 0, W, H)
      for (const st of stars) {
        st.y = (st.y + st.s * 40 * dt) % H
        ctx.globalAlpha = st.s / 2
        ctx.fillStyle = '#fff'
        ctx.fillRect(st.x, st.y, st.s, st.s)
      }
      ctx.globalAlpha = 1
      ctx.shadowBlur = 12
      for (const e of enemies) {
        const c = { grunt: '#ff2bd6', diver: '#ff9a4d', turret: '#9d4dff', boss: '#ffe14d' }[e.kind]
        ctx.fillStyle = ctx.shadowColor = c
        if (e.kind === 'boss') {
          ctx.fillRect(e.x - 34, e.y - 14, 68, 28)
          ctx.fillRect(e.x - 16, e.y + 14, 32, 10)
          ctx.fillStyle = '#300'
          ctx.fillRect(e.x - 30, e.y - 26, 60, 5)
          ctx.fillStyle = '#ff4d4d'
          ctx.fillRect(e.x - 30, e.y - 26, (60 * e.hp) / (40 + wave * 8), 5)
        } else if (e.kind === 'turret') {
          ctx.beginPath()
          ctx.arc(e.x, e.y, 14, 0, Math.PI * 2)
          ctx.fill()
        } else if (e.kind === 'diver') {
          ctx.beginPath()
          ctx.moveTo(e.x, e.y + 14)
          ctx.lineTo(e.x + 11, e.y - 10)
          ctx.lineTo(e.x - 11, e.y - 10)
          ctx.fill()
        } else {
          ctx.fillRect(e.x - 12, e.y - 6, 24, 9)
          const flap = Math.sin(e.t * 10) > 0 ? 4 : 0
          ctx.fillRect(e.x - 14, e.y + 3, 5, 5 + flap)
          ctx.fillRect(e.x + 9, e.y + 3, 5, 5 + flap)
        }
      }
      for (const s of shots) {
        ctx.fillStyle = ctx.shadowColor = s.enemy ? '#ff4d4d' : '#ffe14d'
        ctx.fillRect(s.x - 2, s.y - 6, 4, 12)
      }
      for (const p of powers) {
        ctx.fillStyle = ctx.shadowColor = POWER_COLOR[p.kind]
        ctx.beginPath()
        ctx.arc(p.x, p.y, 9, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = '#000'
        ctx.font = 'bold 11px monospace'
        ctx.fillText(p.kind[0].toUpperCase(), p.x - 4, p.y + 4)
      }
      for (const p of parts) {
        ctx.globalAlpha = Math.max(0, p.life)
        ctx.fillStyle = ctx.shadowColor = p.c
        ctx.fillRect(p.x, p.y, 3, 3)
      }
      ctx.globalAlpha = 1
      if (alive && (ship.inv <= 0 || Math.floor(now / 80) % 2 === 0)) {
        ctx.fillStyle = ctx.shadowColor = '#00f0ff'
        ctx.beginPath()
        ctx.moveTo(ship.x, ship.y - 18)
        ctx.lineTo(ship.x + 14, ship.y + 12)
        ctx.lineTo(ship.x, ship.y + 5)
        ctx.lineTo(ship.x - 14, ship.y + 12)
        ctx.closePath()
        ctx.fill()
        if (ship.shield > 0) {
          ctx.strokeStyle = '#9d4dff'
          ctx.lineWidth = 2
          ctx.beginPath()
          ctx.arc(ship.x, ship.y, 22, 0, Math.PI * 2)
          ctx.stroke()
        }
      }
      ctx.shadowBlur = 0
      // HUD
      ctx.fillStyle = '#300'
      ctx.fillRect(10, H - 16, 120, 8)
      ctx.fillStyle = ship.hp > 30 ? '#3dff8b' : '#ff4d4d'
      ctx.fillRect(10, H - 16, Math.max(0, ship.hp) * 1.2, 8)
      ctx.fillStyle = '#fff'
      ctx.font = '13px "Share Tech Mono", monospace'
      ctx.fillText(`WAVE ${wave}`, W - 70, H - 8)
      const tags = [time < ship.spreadUntil && 'SPREAD', time < ship.rapidUntil && 'RAPID', ship.shield > 0 && `SHIELD×${ship.shield}`].filter(Boolean).join(' ')
      ctx.fillText(tags, 140, H - 8)
      if (alive || parts.length) raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const toLocal = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    return { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H }
  }
  return (
    <div className="flex flex-col items-center gap-2">
      <canvas
        ref={canvas}
        width={W}
        height={H}
        className="aspect-[400/520] w-full max-w-[360px] touch-none border border-magenta/30"
        onPointerDown={(e) => (pointer.current = toLocal(e))}
        onPointerMove={(e) => {
          if (e.buttons || e.pointerType === 'touch') pointer.current = toLocal(e)
        }}
        onPointerUp={() => (pointer.current = null)}
        onPointerLeave={() => (pointer.current = null)}
      />
      <TouchPad keys={keys} buttons={[{ code: 'ArrowLeft', label: '◀' }, { code: 'ArrowUp', label: '▲' }, { code: 'ArrowDown', label: '▼' }, { code: 'ArrowRight', label: '▶' }]} />
    </div>
  )
}
