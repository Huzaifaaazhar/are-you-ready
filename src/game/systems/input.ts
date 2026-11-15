/**
 * Global input state shared by the player controller, touch controls and mini-games.
 * Mutable (not React state) so it can be read every frame without re-renders.
 */

export const input = {
  keys: new Set<string>(),
  /** Virtual joystick, -1..1. y is forward. */
  joy: { x: 0, y: 0 },
  touchSprint: false,
  touchHandbrake: false,
  jumpQueuedAt: 0,
  dashQueuedAt: 0,
  look: { dx: 0, dy: 0 },
}

export function isTypingTarget(t: EventTarget | null) {
  const el = t as HTMLElement | null
  if (!el) return false
  const tag = el.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable
}

export function queueJump() {
  input.jumpQueuedAt = performance.now()
}

export function addLook(dx: number, dy: number) {
  input.look.dx += dx
  input.look.dy += dy
}

export function consumeLook() {
  const l = { dx: input.look.dx, dy: input.look.dy }
  input.look.dx = 0
  input.look.dy = 0
  return l
}

export function clearInput() {
  input.keys.clear()
  input.joy.x = 0
  input.joy.y = 0
  input.touchSprint = false
  input.touchHandbrake = false
  input.look.dx = 0
  input.look.dy = 0
}

export function initInput() {
  const down = (e: KeyboardEvent) => {
    if (isTypingTarget(e.target)) return
    input.keys.add(e.code)
    if (e.code === 'Space' && !e.repeat) queueJump()
    if (e.code === 'KeyF' && !e.repeat) input.dashQueuedAt = performance.now()
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault()
  }
  const up = (e: KeyboardEvent) => input.keys.delete(e.code)
  const blur = () => clearInput()
  window.addEventListener('keydown', down)
  window.addEventListener('keyup', up)
  window.addEventListener('blur', blur)
  return () => {
    window.removeEventListener('keydown', down)
    window.removeEventListener('keyup', up)
    window.removeEventListener('blur', blur)
  }
}

export const isKey = (...codes: string[]) => codes.some((c) => input.keys.has(c))
