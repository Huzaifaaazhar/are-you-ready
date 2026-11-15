import { useEffect, useState, type CSSProperties } from 'react'
import { CABINETS, GLYPHS, JOURNAL, TRIALS } from '../../data/content'
import { ENDING_CHOICES, composeEnding } from '../../data/endings'
import { getAbilities, useGame, type EndingId, type FinalOutcome } from '../../store/useGame'
import { beginStage, retryStage, useShowdown, type Gift } from '../../game/world/showdown/state'
import { playMusic, sfx } from '../../game/systems/audio'
import { Panel } from '../Panel'
import { GlyphIcon } from '../GlyphIcon'

const css = (accent: string) => ({ '--accent': accent }) as CSSProperties

const GIFTS: { id: Gift; name: string; desc: string; color: string }[] = [
  { id: 'aegis', name: 'Aegis', desc: '+2 integrity for every stage.', color: '#3dff8b' },
  { id: 'chronos', name: 'Chronos', desc: 'Lasers, firewalls and the Titan move 25% slower.', color: '#9fe8ff' },
  { id: 'beacon', name: 'Beacon', desc: 'An extra checkpoint, and the last door shows which locks are right as you set them.', color: '#ffe14d' },
]

export function PrepPanel({ close }: { close: () => void }) {
  const p = useGame((s) => s.progress)
  const [gift, setGift] = useState<Gift | null>(useShowdown.getState().gift)
  const ab = getAbilities(p)
  const memories = ['mem-ticket', 'mem-map', 'mem-cart', 'mem-letter'].filter((m) => p.journal.includes(m))
  const begin = () => {
    useShowdown.setState({ gift })
    sfx('go')
    close()
    beginStage('infil')
  }
  return (
    <Panel title="THE NULL CITADEL" kicker="stage 1 · preparation" accent="#ff2040" wide>
      <div data-testid="prep">
        <p className="mb-4 text-[0.88rem] text-white/80">
          The Null Protocol is erasing the OASIS from the inside. Beyond this hall: a firewall, the Founder’s last door, and the Null Titan guarding the Core. Everything you learned is about to matter.
        </p>
        <div className="grid gap-3 md:grid-cols-3">
          <div className="border border-white/10 bg-black/30 p-3">
            <div className="mb-2 font-display text-[0.65rem] uppercase tracking-[0.25em] text-gold">Clues you carry</div>
            <div className="flex flex-wrap gap-1">
              {GLYPHS.map((g) => (
                <div key={g.index} className="flex flex-col items-center text-[0.55rem] text-white/60">
                  <GlyphIcon index={g.index} size={26} dim={!p.glyphs.includes(g.index)} />
                  {g.index}
                </div>
              ))}
            </div>
            <p className="mt-2 text-[0.72rem] text-white/70">{p.journal.includes('lights') ? 'The lights remember: SUN → SKY → BLOOM.' : 'You never read the poster in the Arcade District…'}</p>
            <p className="mt-1 text-[0.72rem] text-white/70">{memories.length ? `Memories: ${memories.map((m) => JOURNAL[m].title.replace('Memory: ', '')).join(' · ')}` : 'No memories recovered.'}</p>
          </div>
          <div className="border border-white/10 bg-black/30 p-3">
            <div className="mb-2 font-display text-[0.65rem] uppercase tracking-[0.25em] text-cyan">Abilities</div>
            {[
              ['Double jump', ab.doubleJump, 'Glitch Hop champion · press jump again in the air'],
              ['Phase dash (F)', ab.phaseDash, 'Grid Gladiator champion · dash through lasers'],
              ['Overdrive', ab.overdrive, 'Grand Prix finisher · faster, longer sprint'],
            ].map(([n, on, how]) => (
              <div key={n as string} className="mb-1 text-[0.75rem]">
                <span className={on ? 'text-lime' : 'text-white/35'}>{on ? '✔' : '✕'} {n as string}</span>
                <div className="text-[0.62rem] text-white/45">{how as string}</div>
              </div>
            ))}
          </div>
          <div className="border border-white/10 bg-black/30 p-3">
            <div className="mb-2 font-display text-[0.65rem] uppercase tracking-[0.25em] text-magenta">Your record</div>
            <ul className="space-y-0.5 text-[0.72rem] text-white/75">
              <li>Grand Prix: {p.gpBest ? `${p.gpBest.toFixed(1)}s` : '—'}</li>
              <li>Arcade prizes: {p.claimedCabinets.length}/{Object.keys(CABINETS).length}</li>
              {TRIALS.map((t) => (
                <li key={t.id}>
                  {t.name}: {p.trials.includes(t.id) ? 'complete' : '—'}
                </li>
              ))}
              <li>Marks: {p.glyphs.length}/6</li>
            </ul>
          </div>
        </div>
        <div className="mt-4 font-display text-[0.65rem] uppercase tracking-[0.25em] text-white/70">Choose one of the Founder’s gifts</div>
        <div className="mt-2 grid gap-2 sm:grid-cols-3">
          {GIFTS.map((g) => (
            <button key={g.id} className="chip !p-3 text-left" aria-pressed={gift === g.id} style={css(g.color)} onClick={() => setGift(g.id)} data-testid={`gift-${g.id}`}>
              <div className="font-display text-sm" style={{ color: g.color }}>{g.name}</div>
              <div className="text-[0.7rem] text-white/60">{g.desc}</div>
            </button>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button className="holo-btn primary flex-1" style={css('#ff2040')} disabled={!gift} onClick={begin} data-testid="prep-begin">
            Begin infiltration
          </button>
          {p.flags.includes('sd-boss') && (
            <button
              className="holo-btn"
              style={css('#ffe14d')}
              onClick={() => {
                useShowdown.setState({ gift, doorOpen: true, titanHp: 0 })
                close()
                beginStage('choice')
              }}
              data-testid="prep-skip"
            >
              Return to the Core (replay the choice)
            </button>
          )}
          <button className="holo-btn" onClick={() => useGame.getState().travel('hub', 'fromShowdown')}>
            Not yet
          </button>
        </div>
      </div>
    </Panel>
  )
}

export function SdFailPanel({ title, body, close }: { title: string; body: string[]; close: () => void }) {
  return (
    <Panel title={title.toUpperCase()} kicker="the null citadel" accent="#ff4d4d">
      <div data-testid="sd-fail">
        {body.map((b) => (
          <p key={b} className="mb-2 text-[0.88rem] text-white/85">{b}</p>
        ))}
        <div className="mt-4 flex gap-2">
          <button className="holo-btn primary flex-1" style={css('#ffe14d')} onClick={() => { close(); retryStage() }} data-testid="sd-retry">
            ⟳ Retry stage
          </button>
          <button className="holo-btn" onClick={() => useGame.getState().travel('hub', 'fromShowdown')}>Leave</button>
        </div>
      </div>
    </Panel>
  )
}

export function EndingPanel({ choice, close }: { choice: EndingId; close: () => void }) {
  const def = ENDING_CHOICES.find((c) => c.id === choice)!
  const [outcome, setOutcome] = useState<FinalOutcome | null>(null)
  const name = useGame((s) => s.avatar?.name ?? 'Player')
  const p = useGame((s) => s.progress)
  useEffect(() => {
    if (outcome) playMusic('finale')
  }, [outcome])
  if (!outcome) {
    return (
      <Panel title={def.title.toUpperCase()} kicker={`stage 5 · the final choice · ${def.value}`} accent={def.color} onClose={close}>
        <div data-testid="ending-confirm">
          <p className="text-[0.95rem] text-white/90">{def.pitch}</p>
          <p className="mt-2 text-[0.85rem] text-white/60">The cost: {def.cost}</p>
          <p className="mt-3 text-[0.75rem] text-white/45">There is no wrong answer here — only what you value most about the OASIS.</p>
          <div className="mt-4 flex gap-2">
            <button
              className="holo-btn primary flex-1"
              style={css(def.color)}
              onClick={() => {
                sfx('achievement')
                setOutcome(useGame.getState().recordEnding(choice, useShowdown.getState().gift ?? 'none'))
              }}
              data-testid="ending-choose"
            >
              Choose {def.value}
            </button>
            <button className="holo-btn" onClick={close}>Think again</button>
          </div>
        </div>
      </Panel>
    )
  }
  const e = composeEnding(outcome, p, name)
  return (
    <Panel title={e.title.toUpperCase()} kicker={`ending · ${e.value} · ${e.rank} · ${e.completion}% complete`} accent={e.color} wide>
      <div data-testid="ending" data-ending={choice}>
        {e.paras.map((t) => (
          <p key={t} className="mb-3 text-[0.92rem] leading-relaxed text-white/90">{t}</p>
        ))}
        <div className="mt-4 font-display text-[0.65rem] uppercase tracking-[0.25em] text-gold">Epilogue</div>
        <ul className="mt-1 space-y-1 text-[0.82rem] text-white/75">
          {e.epilogue.map((l) => (
            <li key={l}>· {l}</li>
          ))}
        </ul>
        <p className="mt-4 text-[0.72rem] text-white/45">
          Endings seen: {p.endings.length}/3. You can return to the Core from the Null Citadel to choose differently.
        </p>
        <p className="mt-3 font-mono text-[0.62rem] text-white/35">
          ENTER THE OASIS · an unofficial fan-made game · all art, music and code original · thank you for playing.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button className="holo-btn primary" style={css('#00f0ff')} onClick={() => useGame.getState().travel('hub', 'fromShowdown')} data-testid="ending-hub">
            Return to OASIS Prime
          </button>
          <button className="holo-btn" style={css(e.color)} onClick={() => useGame.getState().openProfile()} data-testid="ending-profile">
            View your profile
          </button>
        </div>
      </div>
    </Panel>
  )
}
