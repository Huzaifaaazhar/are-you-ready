import { useEffect, useRef } from 'react'
import { sfx } from '../../game/systems/audio'

const N = 20
const SIZE = 400

interface Props {
  onScore: (s: number) => void
  onOver: (s: number) => void
}

type Dir = { x: number; y: number }

/** NEON SERPENT: original snake-style cabinet game. */
export function Serpent({ onScore, onOver }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const dirQueue = useRef<Dir[]>([])
  const touchStart = useRef<{ x: number; y: number } | null>(null)

  const push = (d: Dir) => {
    const q = dirQueue.current
    if (q.length < 3) q.push(d)
  }

  useEffect(() => {
    const ctx = canvas.current!.getContext('2d')!
    let snake = [{ x: 8, y: 10 }, { x: 7, y: 10 }, { x: 6, y: 10 }]
    let dir: Dir = { x: 1, y: 0 }
    let food = { x: 14, y: 10 }
    let score = 0
    let alive = true
    let acc = 0
    let last = performance.now()
    let raf = 0
    const cell = SIZE / N
    const placeFood = () => {
      do {
        food = { x: Math.floor(Math.random() * N), y: Math.floor(Math.random() * N) }
      } while (snake.some((s) => s.x === food.x && s.y === food.y))
    }
    const step = () => {
      const nd = dirQueue.current.shift()
      if (nd && !(nd.x === -dir.x && nd.y === -dir.y)) dir = nd
      const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y }
      if (head.x < 0 || head.y < 0 || head.x >= N || head.y >= N || snake.some((s) => s.x === head.x && s.y === head.y)) {
        alive = false
        sfx('hurt')
        onOver(score)
        return
      }
      snake = [head, ...snake]
      if (head.x === food.x && head.y === food.y) {
        score += 10
        onScore(score)
        sfx('eat')
        placeFood()
      } else snake.pop()
    }
    const draw = (t: number) => {
      ctx.fillStyle = '#03010a'
      ctx.fillRect(0, 0, SIZE, SIZE)
      ctx.strokeStyle = 'rgba(61,255,139,0.07)'
      for (let i = 0; i <= N; i++) {
        ctx.beginPath()
        ctx.moveTo(i * cell, 0)
        ctx.lineTo(i * cell, SIZE)
        ctx.moveTo(0, i * cell)
        ctx.lineTo(SIZE, i * cell)
        ctx.stroke()
      }
      ctx.shadowBlur = 14
      ctx.shadowColor = '#ff2bd6'
      ctx.fillStyle = '#ff2bd6'
      const pulse = 2 + Math.sin(t / 120) * 1.5
      ctx.fillRect(food.x * cell + pulse, food.y * cell + pulse, cell - pulse * 2, cell - pulse * 2)
      ctx.shadowColor = '#3dff8b'
      snake.forEach((s, i) => {
        ctx.fillStyle = i === 0 ? '#c8ffd9' : `hsl(${140 + i * 2}, 100%, ${60 - Math.min(i, 20)}%)`
        ctx.fillRect(s.x * cell + 1.5, s.y * cell + 1.5, cell - 3, cell - 3)
      })
      ctx.shadowBlur = 0
    }
    const loop = (now: number) => {
      const dt = now - last
      last = now
      if (alive) {
        acc += dt
        const interval = Math.max(65, 130 - score * 0.4)
        while (acc > interval && alive) {
          acc -= interval
          step()
        }
      }
      draw(now)
      if (alive) raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    const key = (e: KeyboardEvent) => {
      const m: Record<string, Dir> = { ArrowUp: { x: 0, y: -1 }, KeyW: { x: 0, y: -1 }, ArrowDown: { x: 0, y: 1 }, KeyS: { x: 0, y: 1 }, ArrowLeft: { x: -1, y: 0 }, KeyA: { x: -1, y: 0 }, ArrowRight: { x: 1, y: 0 }, KeyD: { x: 1, y: 0 } }
      if (m[e.code]) {
        e.preventDefault()
        push(m[e.code])
      }
    }
    window.addEventListener('keydown', key)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('keydown', key)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="flex flex-col items-center gap-3">
      <canvas
        ref={canvas}
        width={SIZE}
        height={SIZE}
        className="aspect-square w-full max-w-[400px] touch-none border border-lime/30"
        onPointerDown={(e) => (touchStart.current = { x: e.clientX, y: e.clientY })}
        onPointerUp={(e) => {
          const s = touchStart.current
          if (!s) return
          const dx = e.clientX - s.x
          const dy = e.clientY - s.y
          if (Math.max(Math.abs(dx), Math.abs(dy)) < 18) return
          push(Math.abs(dx) > Math.abs(dy) ? { x: Math.sign(dx), y: 0 } : { x: 0, y: Math.sign(dy) })
        }}
      />
      <div className="grid grid-cols-3 gap-1 sm:hidden">
        <span />
        <button className="chip" aria-label="Up" onPointerDown={() => push({ x: 0, y: -1 })}>▲</button>
        <span />
        <button className="chip" aria-label="Left" onPointerDown={() => push({ x: -1, y: 0 })}>◀</button>
        <button className="chip" aria-label="Down" onPointerDown={() => push({ x: 0, y: 1 })}>▼</button>
        <button className="chip" aria-label="Right" onPointerDown={() => push({ x: 1, y: 0 })}>▶</button>
      </div>
    </div>
  )
}
