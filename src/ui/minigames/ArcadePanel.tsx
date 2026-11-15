import { useEffect, useState, type CSSProperties } from 'react'
import { CABINETS, type CabinetId } from '../../data/content'
import { useGame } from '../../store/useGame'
import { sfx } from '../../game/systems/audio'
import { Panel } from '../Panel'
import { GlyphIcon } from '../GlyphIcon'
import { Serpent } from './Serpent'
import { StarLancer } from './StarLancer'
import { GlitchHop } from './GlitchHop'
import { Gladiator } from './Gladiator'

const HELP: Record<CabinetId, string> = {
  serpent: 'Arrows / WASD or swipe to steer.',
  lancer: 'WASD / arrows or drag to fly. Firing is automatic. Grab power-ups: S spread · R rapid · H shield · + repair. Boss every 5th wave.',
  glitchhop: 'A/D or arrows to run, Space/W to jump (hold for height). Stomp bugs, avoid spikes, ride the moving platforms. Flags are checkpoints.',
  gladiator: 'WASD to move, J/Space to strike, K/Shift to dash through attacks. Survive five waves.',
}
const SCORE_LABEL: Record<CabinetId, string> = { serpent: 'SCORE', lancer: 'SCORE', glitchhop: 'SCORE', gladiator: 'WAVES' }

/** Cabinet shell: attract screen → game → results (scores, unlocks and rewards are saved). */
export function ArcadePanel({ game, close }: { game: CabinetId; close: () => void }) {
  const cab = CABINETS[game]
  const best = useGame((s) => s.progress.highScores[game] ?? 0)
  const claimed = useGame((s) => s.progress.claimedCabinets.includes(game))
  const [phase, setPhase] = useState<'ready' | 'playing' | 'over'>('ready')
  const [score, setScore] = useState(0)
  const [run, setRun] = useState(0)
  const [completed, setCompleted] = useState(false)
  const [result, setResult] = useState<{ best: boolean; reward: boolean } | null>(null)

  const start = () => {
    sfx('go')
    setScore(0)
    setResult(null)
    setCompleted(false)
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
  const over = (s: number, done = false) => {
    setScore(s)
    setCompleted(done || (game === 'gladiator' && s >= cab.target))
    if (game === 'glitchhop' && done) useGame.getState().findGlyph(4)
    setResult(useGame.getState().reportScore(game, s))
    setPhase('over')
  }
  const win = completed || (result?.reward ?? false)

  return (
    <Panel title={cab.title} kicker="pixel palace cabinet" accent={cab.color} onClose={close} wide={game !== 'serpent'}>
      <div className="crt p-3" data-testid={`arcade-${game}`}>
        <div className="mb-2 flex justify-between font-mono text-xs" style={{ color: cab.color }}>
          <span>
            {SCORE_LABEL[game]} {String(score).padStart(5, '0')}
          </span>
          <span>HI {String(Math.max(best, score)).padStart(5, '0')}</span>
        </div>
        {phase === 'playing' ? (
          game === 'serpent' ? (
            <Serpent key={run} onScore={setScore} onOver={over} />
          ) : game === 'lancer' ? (
            <StarLancer key={run} onScore={setScore} onOver={over} />
          ) : game === 'glitchhop' ? (
            <GlitchHop key={run} onScore={setScore} onOver={over} />
          ) : (
            <Gladiator key={run} onScore={setScore} onOver={over} />
          )
        ) : (
          <div className="flex min-h-[300px] flex-col items-center justify-center gap-4 text-center">
            {phase === 'ready' ? (
              <>
                <div className="neon-text font-display text-2xl font-black" style={{ '--glow': cab.color } as CSSProperties}>
                  {cab.title}
                </div>
                <div className="font-mono text-sm text-white/70">{cab.tagline}</div>
                <div className="max-w-md font-mono text-xs text-white/50">{HELP[game]}</div>
                <div className="font-mono text-xs" style={{ color: cab.color }}>
                  TARGET: {cab.targetLabel ?? `${cab.target} points`} {claimed ? '· prize claimed' : '· first clear wins a prize + 5 coins'}
                </div>
              </>
            ) : (
              <>
                <div className="neon-text font-display text-2xl font-black" style={{ '--glow': win ? '#3dff8b' : '#ff4d4d' } as CSSProperties}>
                  {game === 'glitchhop' && completed ? 'CORE REACHED!' : game === 'gladiator' && completed ? 'ARENA CHAMPION!' : 'GAME OVER'}
                </div>
                <div className="font-display text-xl text-white">
                  {score} {game === 'gladiator' ? 'WAVES' : 'PTS'}
                </div>
                {result?.best && <div className="font-mono text-sm text-gold">★ NEW HIGH SCORE</div>}
                {result?.reward && <div className="font-mono text-sm text-lime">Target beaten — prize unlocked, +5 coins!</div>}
                {game === 'glitchhop' && completed && (
                  <div className="flex items-center gap-3 border border-gold/40 bg-gold/10 px-3 py-2 text-left font-mono text-xs text-gold">
                    <GlyphIcon index={4} size={34} />
                    <span>The core door bears a mark: the Star. (Founder’s mark 4 — see your journal.)</span>
                  </div>
                )}
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
