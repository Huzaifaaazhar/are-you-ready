import { useEffect, useState, type CSSProperties } from 'react'
import { CABINETS } from '../../data/content'
import { useGame } from '../../store/useGame'
import { sfx } from '../../game/systems/audio'
import { Panel } from '../Panel'
import { Serpent } from './Serpent'
import { StarLancer } from './StarLancer'

/** Cabinet shell: attract screen → game → results (scores and rewards saved to progress). */
export function ArcadePanel({ game, close }: { game: 'serpent' | 'lancer'; close: () => void }) {
  const cab = CABINETS[game]
  const best = useGame((s) => s.progress.highScores[game] ?? 0)
  const claimed = useGame((s) => s.progress.claimedCabinets.includes(game))
  const [phase, setPhase] = useState<'ready' | 'playing' | 'over'>('ready')
  const [score, setScore] = useState(0)
  const [run, setRun] = useState(0)
  const [result, setResult] = useState<{ best: boolean; reward: boolean } | null>(null)

  const start = () => {
    sfx('go')
    setScore(0)
    setResult(null)
    setRun((r) => r + 1)
    setPhase('playing')
  }
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (phase !== 'playing' && (e.code === 'Space' || e.code === 'Enter')) {
        e.preventDefault()
        start()
      }
    }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  })
  const over = (s: number) => {
    setResult(useGame.getState().reportScore(game, s))
    setPhase('over')
  }

  return (
    <Panel title={cab.title} kicker="pixel palace cabinet" accent={cab.color} onClose={close}>
      <div className="crt p-3" data-testid={`arcade-${game}`}>
        <div className="mb-2 flex justify-between font-mono text-xs" style={{ color: cab.color }}>
          <span>SCORE {String(score).padStart(5, '0')}</span>
          <span>HI {String(Math.max(best, score)).padStart(5, '0')}</span>
        </div>
        {phase === 'playing' ? (
          game === 'serpent' ? <Serpent key={run} onScore={setScore} onOver={over} /> : <StarLancer key={run} onScore={setScore} onOver={over} />
        ) : (
          <div className="flex aspect-[4/3] flex-col items-center justify-center gap-4 text-center">
            {phase === 'ready' ? (
              <>
                <div className="neon-text font-display text-2xl font-black" style={{ '--glow': cab.color } as CSSProperties}>{cab.title}</div>
                <div className="font-mono text-sm text-white/70">{cab.tagline}</div>
                <div className="font-mono text-xs text-white/50">
                  {game === 'serpent' ? 'Arrows / WASD or swipe to steer.' : 'Arrows / A D or drag to move. Firing is automatic.'}
                </div>
                <div className="font-mono text-xs" style={{ color: cab.color }}>
                  TARGET {cab.target} {claimed ? '· ticket claimed' : '· beat it for a Champion Ticket + 3 coins'}
                </div>
              </>
            ) : (
              <>
                <div className="neon-text font-display text-2xl font-black" style={{ '--glow': '#ff4d4d' } as CSSProperties}>GAME OVER</div>
                <div className="font-display text-xl text-white">{score} PTS</div>
                {result?.best && <div className="font-mono text-sm text-gold">★ NEW HIGH SCORE</div>}
                {result?.reward && <div className="font-mono text-sm text-lime">Target beaten — Champion Ticket printed, +3 coins!</div>}
              </>
            )}
            <button className="holo-btn primary" style={{ '--accent': cab.color } as CSSProperties} onClick={start} data-testid="arcade-start">
              {phase === 'ready' ? 'Insert coin · Start' : 'Play again'}
            </button>
            <div className="font-mono text-[0.65rem] text-white/40">SPACE to start · ESC to leave</div>
          </div>
        )}
      </div>
    </Panel>
  )
}
