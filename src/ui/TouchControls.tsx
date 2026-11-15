import { useRef, useState, type CSSProperties } from 'react'
import { useGame } from '../store/useGame'
import { addLook, input, queueJump } from '../game/systems/input'
import { triggerInteract } from '../game/systems/interaction'

/**
 * On-screen controls for touch devices: left virtual stick, right-side drag to look,
 * and buttons for jump, sprint and interact.
 */
export function TouchControls() {
  const prompt = useGame((s) => s.prompt)
  const overlay = useGame((s) => s.overlay)
  const driving = useGame((s) => s.worldId === 'race')
  const stick = useRef<{ id: number; x: number; y: number } | null>(null)
  const look = useRef<{ id: number; x: number; y: number } | null>(null)
  const [knob, setKnob] = useState<{ bx: number; by: number; dx: number; dy: number } | null>(null)
  const [sprint, setSprint] = useState(false)
  if (overlay) return null
  const R = 56
  return (
    <div className="fixed inset-0 z-10 touch-none select-none" data-testid="touch-controls">
      <div
        className="absolute inset-0"
        onPointerDown={(e) => {
          ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
          if (e.clientX < window.innerWidth * 0.45 && !stick.current) {
            stick.current = { id: e.pointerId, x: e.clientX, y: e.clientY }
            setKnob({ bx: e.clientX, by: e.clientY, dx: 0, dy: 0 })
          } else if (!look.current) {
            look.current = { id: e.pointerId, x: e.clientX, y: e.clientY }
          }
        }}
        onPointerMove={(e) => {
          if (stick.current?.id === e.pointerId) {
            let dx = e.clientX - stick.current.x
            let dy = e.clientY - stick.current.y
            const len = Math.hypot(dx, dy)
            if (len > R) {
              dx = (dx / len) * R
              dy = (dy / len) * R
            }
            input.joy.x = dx / R
            input.joy.y = -dy / R
            setKnob((k) => (k ? { ...k, dx, dy } : k))
          } else if (look.current?.id === e.pointerId) {
            addLook((e.clientX - look.current.x) * 1.6, (e.clientY - look.current.y) * 1.6)
            look.current.x = e.clientX
            look.current.y = e.clientY
          }
        }}
        onPointerUp={(e) => {
          if (stick.current?.id === e.pointerId) {
            stick.current = null
            input.joy.x = 0
            input.joy.y = 0
            setKnob(null)
          }
          if (look.current?.id === e.pointerId) look.current = null
        }}
        onPointerCancel={() => {
          stick.current = null
          look.current = null
          input.joy.x = 0
          input.joy.y = 0
          setKnob(null)
        }}
      />
      {knob ? (
        <div className="pointer-events-none absolute" style={{ left: knob.bx - R, top: knob.by - R, width: R * 2, height: R * 2 }}>
          <div className="absolute inset-0 rounded-full border-2 border-cyan/40 bg-cyan/5" />
          <div className="absolute h-14 w-14 rounded-full border-2 border-cyan bg-cyan/30 shadow-[0_0_18px_#00f0ff]" style={{ left: R - 28 + knob.dx, top: R - 28 + knob.dy }} />
        </div>
      ) : (
        <div className="pointer-events-none absolute bottom-10 left-8 h-28 w-28 rounded-full border-2 border-dashed border-cyan/25">
          <div className="absolute inset-0 flex items-center justify-center font-mono text-[0.6rem] tracking-widest text-cyan/50">MOVE</div>
        </div>
      )}
      <div className="absolute bottom-8 right-5 flex flex-col items-end gap-3">
        <button
          aria-label="Interact"
          disabled={!prompt}
          className={`holo-btn !h-16 !w-16 !p-0 !text-lg ${prompt ? 'primary' : ''}`}
          style={{ '--accent': '#00f0ff' } as CSSProperties}
          onPointerDown={(e) => {
            e.stopPropagation()
            triggerInteract()
          }}
        >
          E
        </button>
        <div className="flex gap-3">
          <button
            aria-label="Sprint"
            aria-pressed={sprint}
            className={`holo-btn !h-16 !w-16 !p-0 ${sprint ? 'primary' : ''}`}
            style={{ '--accent': '#3dff8b' } as CSSProperties}
            onPointerDown={(e) => {
              e.stopPropagation()
              input.touchSprint = !input.touchSprint
              setSprint(input.touchSprint)
            }}
          >
            {driving ? 'BOOST' : '»'}
          </button>
          <button
            aria-label="Jump"
            className="holo-btn !h-20 !w-20 !p-0 !text-sm"
            style={{ '--accent': '#ff2bd6' } as CSSProperties}
            onPointerDown={(e) => {
              e.stopPropagation()
              queueJump()
              input.touchHandbrake = true
            }}
            onPointerUp={() => (input.touchHandbrake = false)}
            onPointerLeave={() => (input.touchHandbrake = false)}
          >
            {driving ? 'DRIFT' : 'JUMP'}
          </button>
        </div>
      </div>
    </div>
  )
}
