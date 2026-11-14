import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { ACHIEVEMENTS, CABINETS, FOUNDER_RIDDLE, ITEMS, PRIZES, RACE_FAST_TIME, SECRETS, type MapShape } from '../../data/content'
import { useGame, type Overlay } from '../../store/useGame'
import { TOTAL_COINS, WORLD_ORDER, WORLDS } from '../../game/world/registry'
import { BACKROOM } from '../../game/world/arcade/layout'
import { playerState } from '../../game/systems/playerState'
import { sfx } from '../../game/systems/audio'
import { AvatarBadge } from '../AvatarBadge'
import { Panel } from '../Panel'

const css = (accent: string) => ({ '--accent': accent }) as CSSProperties

function Stat({ label, value, accent = '#00f0ff' }: { label: string; value: string; accent?: string }) {
  return (
    <div className="border border-white/10 bg-black/30 px-3 py-2">
      <div className="font-mono text-[0.62rem] uppercase tracking-[0.2em] text-white/50">{label}</div>
      <div className="font-display text-lg font-bold" style={{ color: accent }}>
        {value}
      </div>
    </div>
  )
}

export function PausePanel({ close }: { close: () => void }) {
  const open = useGame((s) => s.openOverlay)
  const race = useGame((s) => s.race.status)
  const [confirmReset, setConfirmReset] = useState(false)
  const resume = () => {
    close()
    const g = useGame.getState()
    if (g.settings.controlMode === 'mouse' && !matchMedia('(pointer: coarse)').matches) {
      const c = document.querySelector('#game-canvas canvas') as HTMLCanvasElement | null
      c?.requestPointerLock?.()?.catch?.(() => {})
    }
  }
  return (
    <Panel title="PAUSED" kicker="OASIS session" onClose={close}>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2" data-testid="pause-menu">
        <button className="holo-btn primary sm:col-span-2" onClick={resume} data-testid="resume">
          ▶ Resume
        </button>
        <button className="holo-btn" onClick={() => open({ type: 'map' })}>⌖ World atlas</button>
        <button className="holo-btn" onClick={() => open({ type: 'inventory' })}>▦ Inventory</button>
        <button className="holo-btn" onClick={() => open({ type: 'profile' })}>☺ Profile</button>
        <button className="holo-btn" onClick={() => open({ type: 'achievements' })}>★ Achievements</button>
        <button className="holo-btn" onClick={() => open({ type: 'settings' })} data-testid="open-settings">⚙ Settings</button>
        <button className="holo-btn" onClick={() => useGame.getState().openCreator('world')}>✎ Edit avatar</button>
        {race !== 'idle' && (
          <button className="holo-btn sm:col-span-2" style={css('#ffe14d')} onClick={() => { useGame.getState().cancelRace(); close() }}>
            Abandon race
          </button>
        )}
        <button className="holo-btn" style={css('#ff2bd6')} onClick={() => useGame.setState({ phase: 'title', overlay: null })}>
          ⏏ Exit to title
        </button>
        {confirmReset ? (
          <button className="holo-btn" style={css('#ff4d4d')} onClick={() => useGame.getState().resetProgress()}>
            Confirm: erase save
          </button>
        ) : (
          <button className="holo-btn" style={css('#ff4d4d')} onClick={() => setConfirmReset(true)}>
            Reset progress…
          </button>
        )}
      </div>
    </Panel>
  )
}

function Row({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <div className="flex flex-col gap-1 border-b border-white/5 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div className="font-display text-[0.75rem] tracking-[0.1em] text-white">{label}</div>
        {hint && <div className="text-[0.7rem] text-white/45">{hint}</div>}
      </div>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  )
}

function Opt<T>({ v, cur, set, label }: { v: NoInfer<T>; cur: T; set: (v: T) => void; label: string }) {
  return (
    <button className="chip" aria-pressed={v === cur} onClick={() => { sfx('blip'); set(v) }}>
      {label}
    </button>
  )
}

export function SettingsPanel() {
  const s = useGame((st) => st.settings)
  const update = useGame((st) => st.updateSettings)
  return (
    <Panel title="SETTINGS" kicker="controls · display · audio" onClose={() => useGame.getState().openOverlay({ type: 'pause' })}>
      <div data-testid="settings">
        <Row label="Camera control" hint="Assist mode never captures the mouse: drag, or use ← → / Q R to turn; the camera follows your movement.">
          <Opt v="mouse" cur={s.controlMode} set={(v) => update({ controlMode: v })} label="Mouse look" />
          <Opt v="assist" cur={s.controlMode} set={(v) => update({ controlMode: v })} label="Assist (no mouse-look)" />
        </Row>
        <Row label={`Look sensitivity · ${s.sensitivity.toFixed(1)}`}>
          <input type="range" min={0.3} max={2.5} step={0.1} value={s.sensitivity} onChange={(e) => update({ sensitivity: Number(e.target.value) })} aria-label="Look sensitivity" />
        </Row>
        <Row label="Invert vertical look">
          <Opt v={false} cur={s.invertY} set={(v) => update({ invertY: v })} label="Off" />
          <Opt v={true} cur={s.invertY} set={(v) => update({ invertY: v })} label="On" />
        </Row>
        <Row label="Touch controls" hint="Auto shows them on touch screens.">
          <Opt v="auto" cur={s.touch} set={(v) => update({ touch: v })} label="Auto" />
          <Opt v="on" cur={s.touch} set={(v) => update({ touch: v })} label="On" />
          <Opt v="off" cur={s.touch} set={(v) => update({ touch: v })} label="Off" />
        </Row>
        <Row label="Graphics quality" hint="Low disables bloom, rain and reduces city density.">
          <Opt v="high" cur={s.quality} set={(v) => update({ quality: v })} label="High" />
          <Opt v="low" cur={s.quality} set={(v) => update({ quality: v })} label="Low" />
        </Row>
        <Row label="Reduced motion" hint="Shortens cinematic transitions.">
          <Opt v={false} cur={s.reducedMotion} set={(v) => update({ reducedMotion: v })} label="Off" />
          <Opt v={true} cur={s.reducedMotion} set={(v) => update({ reducedMotion: v })} label="On" />
        </Row>
        <Row label={`Volume · ${Math.round(s.volume * 100)}%`}>
          <input type="range" min={0} max={1} step={0.05} value={s.volume} onChange={(e) => update({ volume: Number(e.target.value) })} aria-label="Volume" />
          <Opt v={false} cur={s.muted} set={(v) => update({ muted: v })} label="Sound on" />
          <Opt v={true} cur={s.muted} set={(v) => update({ muted: v })} label="Muted" />
        </Row>
      </div>
    </Panel>
  )
}

export function InventoryPanel({ close }: { close: () => void }) {
  const items = useGame((s) => s.progress.items)
  const avatar = useGame((s) => s.avatar)
  const equip = useGame((s) => s.equipItem)
  const wallet = useGame((s) => s.progress.wallet)
  const [sel, setSel] = useState<string | null>(items[0] ?? null)
  const def = sel ? ITEMS[sel] : null
  const equipped = def?.equip && avatar ? avatar[def.equip.slot] === def.equip.value : false
  return (
    <Panel title="INVENTORY" kicker={`${items.length} items · ${wallet} coins`} accent="#9d4dff" onClose={close} wide>
      <div className="grid gap-4 md:grid-cols-[1fr_260px]" data-testid="inventory">
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {Object.values(ITEMS).map((it) => {
            const has = items.includes(it.id)
            return (
              <button
                key={it.id}
                disabled={!has}
                aria-pressed={sel === it.id}
                onClick={() => { sfx('blip'); setSel(it.id) }}
                className="chip flex aspect-square flex-col items-center justify-center gap-1 !p-2"
                style={css(it.color)}
              >
                <span className="text-2xl" style={{ color: has ? it.color : '#444', textShadow: has ? `0 0 12px ${it.color}` : undefined }}>
                  {has ? it.glyph : '?'}
                </span>
                <span className="text-center text-[0.6rem] leading-tight">{has ? it.name : 'Undiscovered'}</span>
              </button>
            )
          })}
        </div>
        <div className="border border-white/10 bg-black/30 p-4">
          {def ? (
            <>
              <div className="text-4xl" style={{ color: def.color, textShadow: `0 0 16px ${def.color}` }}>{def.glyph}</div>
              <div className="mt-2 font-display text-sm font-bold tracking-wider text-white">{def.name}</div>
              <p className="mt-2 text-[0.8rem] text-white/70">{def.desc}</p>
              {def.equip && (
                <button className="holo-btn primary mt-4 w-full" style={css(def.color)} onClick={() => equip(def.id)}>
                  {equipped ? 'Unequip' : 'Equip on avatar'}
                </button>
              )}
              {def.id === 'copper-key' && <p className="mt-3 text-[0.72rem] text-ember">Use it at the Founder’s Gate in OASIS Prime.</p>}
            </>
          ) : (
            <p className="text-[0.8rem] text-white/50">Your locker is empty. Explore the worlds to find items.</p>
          )}
        </div>
      </div>
    </Panel>
  )
}

export function ProfilePanel({ close }: { close: () => void }) {
  const avatar = useGame((s) => s.avatar)
  const p = useGame((s) => s.progress)
  if (!avatar) return null
  return (
    <Panel title={avatar.name.toUpperCase()} kicker="player profile" accent={avatar.accent} onClose={close} wide>
      <div className="flex flex-col gap-5 sm:flex-row" data-testid="profile">
        <div className="flex flex-col items-center gap-3">
          <AvatarBadge avatar={avatar} size={140} />
          <button className="holo-btn" style={css(avatar.accent)} onClick={() => useGame.getState().openCreator('world')}>
            ✎ Edit avatar
          </button>
        </div>
        <div className="grid flex-1 grid-cols-2 gap-2 sm:grid-cols-3">
          <Stat label="Coins found" value={`${p.collected.length}/${TOTAL_COINS}`} accent="#ffe14d" />
          <Stat label="Wallet" value={`${p.wallet}`} accent="#ffe14d" />
          <Stat label="Secrets" value={`${p.secrets.length}/${SECRETS.length}`} accent="#3dff8b" />
          <Stat label="Achievements" value={`${p.achievements.length}/${ACHIEVEMENTS.length}`} accent="#ff2bd6" />
          <Stat label="Worlds" value={`${p.visited.length}/${WORLD_ORDER.length}`} accent="#00f0ff" />
          <Stat label="Items" value={`${p.items.length}`} accent="#9d4dff" />
          <Stat label="Best circuit" value={p.bestRace ? `${p.bestRace.toFixed(2)}s` : '—'} accent="#3dff8b" />
          <Stat label="Serpent best" value={`${p.highScores.serpent ?? 0}`} accent="#3dff8b" />
          <Stat label="Lancer best" value={`${p.highScores.lancer ?? 0}`} accent="#ff2bd6" />
          <Stat label="Founder’s Gate" value={p.gateOpened ? '1/3 locks' : 'sealed'} accent="#ff9a4d" />
        </div>
      </div>
    </Panel>
  )
}

export function AchievementsPanel({ close }: { close: () => void }) {
  const got = useGame((s) => s.progress.achievements)
  return (
    <Panel title="HALL OF RECORDS" kicker={`${got.length} / ${ACHIEVEMENTS.length} achievements`} accent="#ffe14d" onClose={close} wide>
      <div className="grid gap-2 sm:grid-cols-2" data-testid="achievements">
        {ACHIEVEMENTS.map((a) => {
          const on = got.includes(a.id)
          return (
            <div key={a.id} className={`flex items-center gap-3 border p-3 ${on ? 'border-gold/50 bg-gold/10' : 'border-white/10 bg-black/30 opacity-60'}`}>
              <div className="flex h-10 w-10 items-center justify-center text-xl" style={{ color: on ? '#ffe14d' : '#555', textShadow: on ? '0 0 12px #ffe14d' : undefined }}>
                {on ? a.glyph : '🔒'}
              </div>
              <div>
                <div className="font-display text-[0.78rem] font-bold tracking-wider text-white">{a.title}</div>
                <div className="text-[0.72rem] text-white/60">{a.desc}</div>
              </div>
            </div>
          )
        })}
      </div>
    </Panel>
  )
}

function shapeEl(s: MapShape, i: number) {
  if (s.type === 'circle') return <circle key={i} cx={s.x} cy={s.z} r={s.r} fill={s.fill ? 'rgba(0,240,255,0.15)' : 'none'} stroke="rgba(0,240,255,0.5)" strokeWidth={0.6} />
  return <rect key={i} x={s.x} y={s.z} width={s.w} height={s.h} fill={s.fill ? 'rgba(0,240,255,0.15)' : 'rgba(0,240,255,0.05)'} stroke="rgba(0,240,255,0.5)" strokeWidth={0.6} />
}

export function MapPanel({ close }: { close: () => void }) {
  const worldId = useGame((s) => s.worldId)
  const visited = useGame((s) => s.progress.visited)
  const secrets = useGame((s) => s.progress.secrets)
  const collected = useGame((s) => s.progress.collected)
  const travel = useGame((s) => s.travel)
  const layout = WORLDS[worldId].layout
  const dot = useRef<SVGGElement>(null)
  useEffect(() => {
    let raf = 0
    const tick = () => {
      const p = playerState.position
      dot.current?.setAttribute('transform', `translate(${p.x} ${p.z}) rotate(${(-playerState.heading * 180) / Math.PI + 180})`)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])
  const [x0, z0, x1, z1] = layout.bounds
  const kindColor = { portal: '#ff2bd6', challenge: '#ffe14d', service: '#00f0ff', secret: '#3dff8b', game: '#9d4dff' }
  const shapes = [...layout.mapShapes]
  if (worldId === 'arcade' && secrets.includes('hidden-cabinet')) shapes.push({ type: 'rect', x: BACKROOM.minX, z: BACKROOM.minZ, w: BACKROOM.maxX - BACKROOM.minX, h: BACKROOM.maxZ - BACKROOM.minZ, fill: true })
  return (
    <Panel title="WORLD ATLAS" kicker={`${layout.name} · ${layout.subtitle}`} accent="#4d7cff" onClose={close} wide>
      <div className="grid gap-4 md:grid-cols-[1fr_260px]" data-testid="map">
        <div className="crt relative aspect-square w-full overflow-hidden border border-cyan/20">
          <svg viewBox={`${x0} ${z0} ${x1 - x0} ${z1 - z0}`} className="h-full w-full">
            {shapes.map(shapeEl)}
            {layout.pois
              .filter((p) => p.kind !== 'secret' || secrets.some((s) => SECRETS.find((d) => d.id === s)?.world === worldId))
              .map((p) => (
                <g key={p.id} transform={`translate(${p.x} ${p.z})`}>
                  <circle r={1.4} fill={kindColor[p.kind]} />
                  <text y={-2.4} textAnchor="middle" fontSize={2.6} fill="#fff" style={{ fontFamily: 'Share Tech Mono' }}>
                    {p.label}
                  </text>
                </g>
              ))}
            {layout.coins
              .filter((c) => !collected.includes(c.id) && (!c.requiresSecret || secrets.includes(c.requiresSecret)))
              .map((c) => (
                <circle key={c.id} cx={c.pos[0]} cy={c.pos[2]} r={0.7} fill="#ffe14d" opacity={0.7} />
              ))}
            <g ref={dot}>
              <path d="M0 -3 L2.2 2.4 L0 1.2 L-2.2 2.4 Z" fill="#3dff8b" stroke="#fff" strokeWidth={0.4} />
            </g>
          </svg>
          <div className="absolute bottom-2 left-2 font-mono text-[0.6rem] text-white/50">▲ you · ● coins · N is up</div>
        </div>
        <div className="flex flex-col gap-2">
          <div className="font-display text-[0.65rem] uppercase tracking-[0.25em] text-cyan/70">Fast travel</div>
          {WORLD_ORDER.map((id) => {
            const w = WORLDS[id].layout
            const here = id === worldId
            const known = visited.includes(id)
            return (
              <button
                key={id}
                className="holo-btn text-left"
                disabled={here || !known}
                onClick={() => {
                  close()
                  travel(id)
                }}
              >
                {w.name}
                <span className="block font-mono text-[0.6rem] normal-case tracking-normal text-white/50">{here ? 'you are here' : known ? `${w.subtitle} · travel` : 'find its portal first'}</span>
              </button>
            )
          })}
          <div className="mt-3 border border-dashed border-white/15 p-3 font-mono text-[0.7rem] text-white/45">
            Uncharted signals detected beyond the known worlds. The Atlas will update as new worlds come online.
          </div>
        </div>
      </div>
    </Panel>
  )
}

export function ShopPanel({ close }: { close: () => void }) {
  const p = useGame((s) => s.progress)
  const redeem = useGame((s) => s.redeemPrize)
  return (
    <Panel title="PRIZE ZONE" kicker={`you have ${p.wallet} coins`} accent="#ffe14d" onClose={close}>
      <div className="flex flex-col gap-3" data-testid="shop">
        {PRIZES.map((pr) => {
          const it = ITEMS[pr.item]
          const owned = p.items.includes(pr.item)
          const afford = p.wallet >= pr.price
          return (
            <div key={pr.item} className="flex items-center gap-3 border border-white/10 bg-black/30 p-3">
              <div className="text-3xl" style={{ color: it.color, textShadow: `0 0 12px ${it.color}` }}>{it.glyph}</div>
              <div className="flex-1">
                <div className="font-display text-sm font-bold tracking-wider text-white">{it.name}</div>
                <div className="text-[0.72rem] text-white/60">{it.desc}</div>
              </div>
              <button className="holo-btn primary" style={css('#ffe14d')} disabled={owned || !afford} onClick={() => redeem(pr.item)}>
                {owned ? 'Owned' : `◎ ${pr.price}`}
              </button>
            </div>
          )
        })}
        <p className="text-[0.72rem] text-white/45">Collect coins in every world. Redeemed gear can be equipped from your inventory or in the Avatar Forge.</p>
      </div>
    </Panel>
  )
}

export function GatePanel({ close }: { close: () => void }) {
  const p = useGame((s) => s.progress)
  const openGate = useGame((s) => s.openGate)
  const hasKey = p.items.includes('copper-key')
  return (
    <Panel title="THE FOUNDER’S GATE" kicker="the founder’s contest" accent="#ff9a4d" onClose={close}>
      <div data-testid="gate">
        <blockquote className="border-l-2 border-ember/60 pl-4 font-mono text-[0.85rem] italic leading-relaxed text-white/85">
          {FOUNDER_RIDDLE.map((l) => (
            <div key={l}>{l}</div>
          ))}
        </blockquote>
        <div className="mt-5 grid grid-cols-3 gap-2">
          {['Copper', 'Second', 'Third'].map((n, i) => {
            const open = i === 0 && p.gateOpened
            return (
              <div key={n} className={`border p-3 text-center ${open ? 'border-ember bg-ember/15' : 'border-white/10 bg-black/30'}`}>
                <div className="font-display text-xl" style={{ color: open ? '#ff9a4d' : '#665a80' }}>{['I', 'II', 'III'][i]}</div>
                <div className="text-[0.65rem] uppercase tracking-widest text-white/60">{open ? 'Released' : i === 0 ? 'Copper lock' : 'Sealed'}</div>
              </div>
            )
          })}
        </div>
        <div className="mt-5">
          {p.gateOpened ? (
            <p className="text-[0.8rem] text-lime">The first lock is released. The remaining locks await signals that have not yet been broadcast.</p>
          ) : hasKey ? (
            <button className="holo-btn primary w-full" style={css('#ff9a4d')} onClick={openGate} data-testid="insert-key">
              ⚿ Insert the Copper Key
            </button>
          ) : (
            <p className="text-[0.8rem] text-white/55">The first lock is copper. You do not have a key that fits — yet.</p>
          )}
        </div>
      </div>
    </Panel>
  )
}

export function ScoresPanel({ close }: { close: () => void }) {
  const p = useGame((s) => s.progress)
  return (
    <Panel title="HIGH SCORES" kicker="pixel palace" accent="#ffe14d" onClose={close}>
      <div className="flex flex-col gap-2 font-mono" data-testid="scores">
        {Object.values(CABINETS).map((c) => (
          <div key={c.id} className="flex justify-between border border-white/10 bg-black/30 px-4 py-3">
            <span style={{ color: c.color }}>{c.title}</span>
            <span className="text-white">
              {String(p.highScores[c.id] ?? 0).padStart(5, '0')} <span className="text-white/40">/ target {c.target}</span>
            </span>
          </div>
        ))}
        <div className="flex justify-between border border-white/10 bg-black/30 px-4 py-3">
          <span className="text-lime">VELOCITY CIRCUIT</span>
          <span className="text-white">
            {p.bestRace ? `${p.bestRace.toFixed(2)}s` : '—'} <span className="text-white/40">/ target &lt;{RACE_FAST_TIME}s</span>
          </span>
        </div>
      </div>
    </Panel>
  )
}

export function InfoPanel({ overlay, close }: { overlay: Extract<Overlay, { type: 'info' }>; close: () => void }) {
  return (
    <Panel title={overlay.title} accent={overlay.accent ?? '#00f0ff'} onClose={close}>
      <div className="space-y-3 text-[0.9rem] leading-relaxed text-white/85" data-testid="info">
        {overlay.body.map((b, i) => (
          <p key={i}>{b}</p>
        ))}
      </div>
    </Panel>
  )
}
