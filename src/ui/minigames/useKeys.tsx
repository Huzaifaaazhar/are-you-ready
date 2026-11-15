import { useEffect, useRef } from 'react'

/** Keyboard state for canvas mini-games (arrow/space keys don't scroll the page). */
export function useKeys() {
  const keys = useRef(new Set<string>())
  const pressed = useRef(new Set<string>())
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault()
      if (!keys.current.has(e.code)) pressed.current.add(e.code)
      keys.current.add(e.code)
    }
    const up = (e: KeyboardEvent) => keys.current.delete(e.code)
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [])
  return {
    keys,
    /** True once per physical key press. */
    consume: (code: string) => {
      if (pressed.current.has(code)) {
        pressed.current.delete(code)
        return true
      }
      return false
    },
    any: (...codes: string[]) => codes.some((c) => keys.current.has(c)),
  }
}

/** Touch buttons that write into the same key set. */
export function TouchPad({ keys, buttons }: { keys: React.MutableRefObject<Set<string>>; buttons: { code: string; label: string }[] }) {
  return (
    <div className="flex flex-wrap justify-center gap-2 sm:hidden">
      {buttons.map((b) => (
        <button
          key={b.code + b.label}
          className="chip !px-5 !py-3 touch-none select-none"
          onPointerDown={(e) => {
            e.preventDefault()
            keys.current.add(b.code)
          }}
          onPointerUp={() => keys.current.delete(b.code)}
          onPointerLeave={() => keys.current.delete(b.code)}
          onPointerCancel={() => keys.current.delete(b.code)}
        >
          {b.label}
        </button>
      ))}
    </div>
  )
}
