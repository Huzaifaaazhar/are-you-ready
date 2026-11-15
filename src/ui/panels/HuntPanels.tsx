import { useMemo, useState, type CSSProperties } from 'react'
import { GLYPHS, JOURNAL, LOCK_KEYS, TRIALS, VEHICLES, WISP_PRICE, GP_FAST_TIME, type TrialId } from '../../data/content'
import { useGame } from '../../store/useGame'
import { useRace } from '../../store/useRace'
import { useTrialHud, TRIAL_TEXT } from '../../game/world/trials/common'
import { MONUMENT_COLORS } from '../../game/world/common/Monument'
import { sfx } from '../../game/systems/audio'
import { Panel } from '../Panel'
import { GlyphIcon } from '../GlyphIcon'

const css = (accent: string) => ({ '--accent': accent }) as CSSProperties

export function JournalPanel({ close }: { close: () => void }) {
  const p = useGame((s) => s.progress)
  const [tab, setTab] = useState<'marks' | 'clues' | 'memories' | 'trials'>('marks')
  const entries = p.journal.map((id) => JOURNAL[id]).filter(Boolean)
  const nextHint = (() => {
    const sorted = [...p.glyphs].sort((a, b) => a - b)
    const last = sorted[sorted.length - 1]
    if (!last) return 'Start where the curious go: walk around the back of the Founder’s Gate in OASIS Prime.'
    return GLYPHS.find((g) => g.index === last)?.next
  })()
  return (
    <Panel title="HUNTER’S JOURNAL" kicker={`${p.glyphs.length}/6 marks · ${entries.length} entries`} accent="#ffe14d" onClose={close} wide>
      <div data-testid="journal">
        <div className="mb-4 flex flex-wrap gap-1" role="tablist">
          {(['marks', 'clues', 'memories', 'trials'] as const).map((t) => (
            <button key={t} role="tab" aria-selected={tab === t} className="chip" aria-pressed={tab === t} style={css('#ffe14d')} onClick={() => setTab(t)}>
              {t === 'marks' ? 'Founder’s marks' : t[0].toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
        {tab === 'marks' && (
          <>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
              {GLYPHS.map((g) => {
                const has = p.glyphs.includes(g.index)
                return (
                  <div key={g.index} className={`flex flex-col items-center gap-1 border p-2 text-center ${has ? 'border-gold/50 bg-gold/10' : 'border-white/10 bg-black/30'}`}>
                    <GlyphIcon index={g.index} size={46} dim={!has} />
                    <div className="font-display text-[0.6rem] tracking-widest text-white/70">MARK {g.index}</div>
                    <div className="text-[0.65rem] text-white/60">{has ? g.name : '???'}</div>
                  </div>
                )
              })}
            </div>
            <div className="mt-4 border-l-2 border-gold/60 pl-3 text-[0.85rem] text-white/85">
              <div className="font-display text-[0.6rem] uppercase tracking-[0.25em] text-gold">Current lead</div>
              {p.glyphs.length >= 6 ? (p.vaultOpen ? 'The vault is open. Ride the light beam behind the Founder’s Gate.' : GLYPHS[5].next) : nextHint}
            </div>
            {p.glyphs.length > 0 && (
              <ul className="mt-3 space-y-1 text-[0.75rem] text-white/60">
                {GLYPHS.filter((g) => p.glyphs.includes(g.index)).map((g) => (
                  <li key={g.index}>
                    Mark {g.index} · {g.name} — found at {g.where}
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
        {tab !== 'marks' && tab !== 'trials' && (
          <div className="space-y-3">
            {entries.filter((e) => (tab === 'clues' ? e.category === 'clue' || e.category === 'trial' : e.category === 'memory')).length === 0 && <p className="text-[0.85rem] text-white/50">Nothing recorded yet.</p>}
            {entries
              .filter((e) => (tab === 'clues' ? e.category === 'clue' || e.category === 'trial' : e.category === 'memory'))
              .map((e) => (
                <div key={e.id} className="border border-white/10 bg-black/30 p-3">
                  <div className="font-display text-[0.75rem] font-bold tracking-wider text-gold">{e.title}</div>
                  <p className="mt-1 text-[0.82rem] text-white/80">{e.text}</p>
                </div>
              ))}
          </div>
        )}
        {tab === 'trials' && (
          <div className="space-y-2">
            <div className="border border-white/10 bg-black/30 p-3 text-[0.82rem]">
              <span className="font-display text-lime">The Race</span> — {p.gpFinishes > 0 ? `finished (best ${p.gpBest?.toFixed(2)}s)` : 'finish the Velocity City Grand Prix to qualify for the trials'}
            </div>
            {TRIALS.map((t, i) => (
              <div key={t.id} className="border border-white/10 bg-black/30 p-3 text-[0.82rem]">
                <span className="font-display" style={{ color: t.color }}>
                  {t.name}
                </span>{' '}
                — {p.trials.includes(t.id) ? 'complete' : p.locks >= t.lock ? 'open behind the Founder’s Gate' : `needs lock ${['I', 'II', 'III'][i]} (${LOCK_KEYS[i].replace('-', ' ')})`}
              </div>
            ))}
          </div>
        )}
      </div>
    </Panel>
  )
}

export function CipherPanel({ close }: { close: () => void }) {
  const openVault = useGame((s) => s.openVault)
  const [entered, setEntered] = useState<number[]>([])
  const [error, setError] = useState(false)
  const order = useMemo(() => [4, 1, 6, 3, 5, 2], [])
  const press = (i: number) => {
    sfx('blip')
    const next = [...entered, i]
    setError(false)
    if (next.length === 6) {
      if (next.every((v, k) => v === k + 1)) {
        openVault()
        close()
        return
      }
      sfx('error')
      setError(true)
      setEntered([])
      return
    }
    setEntered(next)
  }
  return (
    <Panel title="CIPHER LOCK" kicker="enter the six marks in order" accent="#3dff8b" onClose={close}>
      <div data-testid="cipher">
        <div className="mb-3 flex justify-center gap-2">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="flex h-12 w-12 items-center justify-center border border-lime/30 bg-black/40">
              {entered[i] ? <GlyphIcon index={entered[i]} size={34} color="#3dff8b" /> : <span className="text-white/30">{i + 1}</span>}
            </div>
          ))}
        </div>
        {error && <p className="mb-2 text-center text-[0.8rem] text-red-400">The lock rejects the sequence. The marks are numbered for a reason.</p>}
        <div className="grid grid-cols-3 gap-2">
          {order.map((i) => (
            <button key={i} className="chip flex flex-col items-center gap-1 !py-3" style={css('#3dff8b')} onClick={() => press(i)} data-testid={`cipher-${i}`}>
              <GlyphIcon index={i} size={40} color="#3dff8b" />
              <span className="text-[0.65rem]">{GLYPHS[i - 1].name}</span>
            </button>
          ))}
        </div>
        <button className="holo-btn mt-3 w-full" onClick={() => setEntered([])}>
          Clear
        </button>
      </div>
    </Panel>
  )
}

function StatBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center gap-2 text-[0.7rem]">
      <span className="w-14 text-white/50">{label}</span>
      <div className="flex gap-0.5">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className={`h-2 w-4 ${i < value ? 'bg-cyan' : 'bg-white/10'}`} />
        ))}
      </div>
    </div>
  )
}

export function GaragePanel() {
  const p = useGame((s) => s.progress)
  const select = useGame((s) => s.selectVehicle)
  const buy = useGame((s) => s.buyVehicle)
  const best = p.gpBest
  const start = () => {
    useGame.getState().closeOverlay()
    useRace.getState().start()
  }
  return (
    <Panel title="VELOCITY CITY GRAND PRIX" kicker="garage · choose your ride" accent="#3dff8b">
      <div data-testid="garage">
        <p className="mb-3 text-[0.82rem] text-white/75">
          A sprint through the city: traffic on the highway, a fork at the junction (skyway or crusher tunnel), a leap over the gap and a guarded finish. Checkpoints respawn you if you crash. {best ? `Your best: ${best.toFixed(2)}s.` : ''} Target: under {GP_FAST_TIME}s.
        </p>
        <div className="grid gap-2 sm:grid-cols-3">
          {VEHICLES.map((v) => {
            const owned = p.vehicles.includes(v.id)
            const sel = p.vehicle === v.id
            return (
              <div key={v.id} className={`flex flex-col gap-2 border p-3 ${sel ? 'border-lime bg-lime/10' : 'border-white/10 bg-black/30'}`} style={css(v.color)}>
                <div className="font-display text-sm font-bold tracking-wider" style={{ color: v.color }}>
                  {v.name}
                </div>
                <div className="text-[0.7rem] text-white/60">{v.tagline}</div>
                <StatBar label="Speed" value={v.stats.speed} />
                <StatBar label="Accel" value={v.stats.accel} />
                <StatBar label="Grip" value={v.stats.grip} />
                <StatBar label="Weight" value={v.stats.weight} />
                {owned ? (
                  <button className={`holo-btn ${sel ? 'primary' : ''}`} style={css(v.color)} onClick={() => select(v.id)} data-testid={`vehicle-${v.id}`}>
                    {sel ? 'Selected' : 'Select'}
                  </button>
                ) : v.id === 'wisp' ? (
                  <button className="holo-btn" style={css(v.color)} disabled={p.wallet < WISP_PRICE} onClick={() => buy('wisp')}>
                    Buy · ◎ {WISP_PRICE}
                  </button>
                ) : (
                  <div className="text-[0.7rem] text-white/50">🔒 {v.unlock}</div>
                )}
              </div>
            )
          })}
        </div>
        <div className="mt-3 text-[0.72rem] text-white/50">W/↑ accelerate · S/↓ brake & reverse · A/D steer · Space handbrake (drift charges boost) · Shift boost · C camera · V look back · R respawn</div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button className="holo-btn primary flex-1" style={css('#3dff8b')} onClick={start} data-testid="race-start">
            ▶ Start race
          </button>
          <button className="holo-btn" style={css('#00f0ff')} onClick={() => useGame.getState().travel('hub', 'fromRace')}>
            Return to OASIS Prime
          </button>
        </div>
      </div>
    </Panel>
  )
}

export function RaceResultPanel() {
  const time = useRace((s) => s.finishTime)
  const result = useRace((s) => s.result)
  const best = useGame((s) => s.progress.gpBest)
  return (
    <Panel title="FINISH!" kicker="velocity city grand prix" accent="#ffe14d">
      <div className="text-center" data-testid="race-result">
        <div className="neon-text font-display text-5xl font-black" style={{ '--glow': '#ffe14d' } as CSSProperties}>
          {time?.toFixed(2)}s
        </div>
        {result?.best ? <div className="mt-2 font-mono text-gold">★ New personal best</div> : <div className="mt-2 font-mono text-white/60">Best {best?.toFixed(2)}s</div>}
        {time !== null && time < GP_FAST_TIME && <div className="mt-1 font-mono text-lime">Under {GP_FAST_TIME}s — Redline!</div>}
        <div className="mt-3 text-[0.8rem] text-white/70">+10 coins · +120 XP{result?.unlocked.length ? ` · Unlocked: ${result.unlocked.join(', ')}` : ''}</div>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <button
            className="holo-btn primary"
            style={css('#3dff8b')}
            onClick={() => {
              useGame.getState().closeOverlay()
              useRace.getState().start()
            }}
            data-testid="race-retry"
          >
            Race again
          </button>
          <button
            className="holo-btn"
            onClick={() => {
              useRace.getState().reset()
              useGame.getState().openOverlay({ type: 'garage' })
            }}
          >
            Change vehicle
          </button>
          <button className="holo-btn" style={css('#00f0ff')} onClick={() => useGame.getState().travel('hub', 'fromRace')} data-testid="race-hub">
            Return to OASIS Prime
          </button>
        </div>
      </div>
    </Panel>
  )
}

export function TrialIntroPanel({ trial, close }: { trial: TrialId; close: () => void }) {
  const t = TRIAL_TEXT[trial]
  return (
    <Panel title={t.title.toUpperCase()} kicker="the founder’s trials" accent={t.color}>
      <div data-testid="trial-intro">
        <div className="space-y-2 text-[0.88rem] leading-relaxed text-white/85">
          {t.intro.map((l) => (
            <p key={l}>{l}</p>
          ))}
        </div>
        <div className="mt-4 font-display text-[0.65rem] uppercase tracking-[0.25em]" style={{ color: t.color }}>
          Objectives
        </div>
        <ul className="mt-1 list-disc space-y-1 pl-5 text-[0.8rem] text-white/75">
          {t.objectives.map((o) => (
            <li key={o}>{o}</li>
          ))}
        </ul>
        <div className="mt-5 flex flex-wrap gap-2">
          <button className="holo-btn primary flex-1" style={css(t.color)} onClick={close} data-testid="trial-begin">
            Begin
          </button>
          <button className="holo-btn" onClick={() => useGame.getState().travel('hub', 'fromTrials')}>
            Leave
          </button>
        </div>
      </div>
    </Panel>
  )
}

export function TrialResultPanel({ trial, success, title, body, close }: { trial: TrialId; success: boolean; title: string; body: string[]; close: () => void }) {
  const t = TRIAL_TEXT[trial]
  const retry = useTrialHud((s) => s.retry)
  return (
    <Panel title={title.toUpperCase()} kicker={t.title} accent={success ? '#3dff8b' : '#ff4d4d'}>
      <div data-testid="trial-result" data-success={success}>
        <div className="space-y-2 text-[0.88rem] leading-relaxed text-white/85">
          {body.map((l) => (
            <p key={l}>{l}</p>
          ))}
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          {!success && (
            <button
              className="holo-btn primary flex-1"
              style={css('#ffe14d')}
              onClick={() => {
                close()
                retry?.()
              }}
              data-testid="trial-retry"
            >
              ⟳ Retry
            </button>
          )}
          {success && (
            <button className="holo-btn" style={css('#3dff8b')} onClick={close}>
              Stay and explore
            </button>
          )}
          <button className={`holo-btn ${success ? 'primary flex-1' : ''}`} style={css('#00f0ff')} onClick={() => useGame.getState().travel('hub', 'fromTrials')} data-testid="trial-hub">
            Return to OASIS Prime
          </button>
        </div>
      </div>
    </Panel>
  )
}

export function MonumentPanel({ close }: { close: () => void }) {
  const existing = useGame((s) => s.progress.monument)
  const done = useGame((s) => s.progress.trials.includes('future'))
  const [h, setH] = useState<number[]>(existing?.h ?? Array(25).fill(0))
  const [c, setC] = useState<string[]>(existing?.c ?? Array(25).fill(MONUMENT_COLORS[0]))
  const [color, setColor] = useState(MONUMENT_COLORS[0])
  const total = h.reduce((a, b) => a + b, 0)
  const build = () => {
    const g = useGame.getState()
    g.saveMonument({ h, c })
    sfx('unlock')
    if (!done) {
      g.completeTrial('future')
      g.openOverlay({
        type: 'trial-result',
        trial: 'future',
        success: true,
        title: 'Trial III complete',
        body: ['You routed the light and built something of your own. The Blueprint keeps it — and so will OASIS Prime: your monument now stands in the plaza.', 'Rewards: Architect’s Crown, monument in OASIS Prime, +15 coins, +300 XP.', 'All three trials are done. If you have found all six of the Founder’s marks, the cipher lock behind the gate awaits.'],
      })
    } else {
      g.toast({ kind: 'info', title: 'Monument rebuilt', body: 'Your new design stands in OASIS Prime' })
      close()
    }
  }
  return (
    <Panel title="MONUMENT FORGE" kicker="design your monument · click a cell to stack, right-click to remove" accent="#ffe14d">
      <div data-testid="monument">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          {MONUMENT_COLORS.map((col) => (
            <button key={col} aria-label={`colour ${col}`} aria-pressed={color === col} className="h-8 w-8 border-2" style={{ background: col, borderColor: color === col ? '#fff' : 'transparent' }} onClick={() => setColor(col)} />
          ))}
          <span className="ml-auto font-mono text-xs text-white/60">{total} blocks (min 6)</span>
        </div>
        <div className="mx-auto grid max-w-[320px] grid-cols-5 gap-1">
          {h.map((v, i) => (
            <button
              key={i}
              data-testid={`mcell-${i}`}
              className="relative aspect-square border border-white/15 bg-black/40 text-white"
              style={{ background: v ? `color-mix(in srgb, ${c[i]} ${20 + v * 18}%, #05010f)` : undefined }}
              onClick={() => {
                const nh = [...h]
                const nc = [...c]
                nh[i] = (nh[i] + 1) % 5
                nc[i] = color
                setH(nh)
                setC(nc)
                sfx('blip')
              }}
              onContextMenu={(e) => {
                e.preventDefault()
                const nh = [...h]
                nh[i] = Math.max(0, nh[i] - 1)
                setH(nh)
              }}
            >
              {v > 0 && <span className="font-display text-sm">{v}</span>}
            </button>
          ))}
        </div>
        <button className="holo-btn primary mt-4 w-full" style={css('#ffe14d')} disabled={total < 6} onClick={build} data-testid="monument-build">
          {done ? 'Rebuild monument' : 'Build monument'}
        </button>
      </div>
    </Panel>
  )
}

export { LOCK_KEYS }
