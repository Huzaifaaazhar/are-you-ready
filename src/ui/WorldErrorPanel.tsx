import type { CSSProperties } from 'react'
import { useGame } from '../store/useGame'

/** Shown when a world fails to load or the WebGL context is lost. */
export function WorldErrorPanel() {
  const err = useGame((s) => s.worldError)
  if (!err) return null
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-4" data-testid="world-error">
      <div className="holo max-w-md p-5" style={{ '--accent': '#ff4d4d' } as CSSProperties}>
        <div className="font-display text-lg text-white">Something broke in the OASIS</div>
        <p className="mt-2 text-[0.8rem] text-white/70">{err}</p>
        <p className="mt-1 text-[0.72rem] text-white/45">Your progress is saved. Try again, head home, or reload the page.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            className="holo-btn primary"
            onClick={() => {
              useGame.setState((s) => ({ worldError: null, worldEpoch: s.worldEpoch + 1 }))
            }}
          >
            Retry
          </button>
          <button
            className="holo-btn"
            onClick={() => {
              useGame.setState({ worldError: null })
              useGame.getState().travel('hub')
            }}
          >
            Return to OASIS Prime
          </button>
          <button className="holo-btn" onClick={() => window.location.reload()}>
            Reload
          </button>
        </div>
      </div>
    </div>
  )
}
