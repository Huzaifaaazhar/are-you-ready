import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { ACHIEVEMENTS, CABINETS, FOUNDER_RIDDLE, GLYPHS, ITEMS, LEVEL_XP, itemCategory, type ItemCategory, LOCK_KEYS, PRIZES, RACE_FAST_TIME, SECRETS, TRIALS, VEHICLES, levelFor, type MapShape } from '../../data/content'
import { RELIC_SETS, useGame, type Overlay } from '../../store/useGame'
import { TOTAL_COINS, WORLD_ORDER, WORLDS } from '../../game/world/registry'
import { BACKROOM } from '../../game/world/arcade/layout'
import { playerState } from '../../game/systems/playerState'
import { useRace } from '../../store/useRace'
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
  const worldId = useGame((s) => s.worldId)
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
        {worldId !== 'hub' && (
          <button className="holo-btn sm:col-span-2" style={css('#00f0ff')} onClick={() => useGame.getState().travel('hub', worldId === 'race' ? 'fromRace' : worldId === 'arcade' ? 'default' : 'fromTrials')} data-testid="pause-hub">
            ⌂ Return to OASIS Prime
          </button>
        )}
        {worldId === 'race' && (
          <button className="holo-btn sm:col-span-2" style={css('#3dff8b')} onClick={() => { useRace.getState().reset(); open({ type: 'garage' }) }}>
            Restart race / garage
          </button>
        )}
        <button className="holo-btn" onClick={() => open({ type: 'journal' })}>✎ Journal</button>
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
        <Row label="Graphics quality" hint="High: bloom + full density. Medium: bloom, lighter cities. Low: no post-processing, fewer particles (default on phones).">
          <Opt v="high" cur={s.quality} set={(v) => update({ quality: v })} label="High" />
          <Opt v="medium" cur={s.quality} set={(v) => update({ quality: v })} label="Medium" />
          <Opt v="low" cur={s.quality} set={(v) => update({ quality: v })} label="Low" />
        </Row>
        <Row label="Automatic quality" hint="Steps quality down if the frame rate stays low.">
          <Opt v={true} cur={s.autoQuality} set={(v) => update({ autoQuality: v })} label="On" />
          <Opt v={false} cur={s.autoQuality} set={(v) => update({ autoQuality: v })} label="Off" />
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
        <Row label={`Music · ${Math.round(s.musicVolume * 100)}%`}>
          <input type="range" min={0} max={1} step={0.05} value={s.musicVolume} onChange={(e) => update({ musicVolume: Number(e.target.value) })} aria-label="Music volume" />
        </Row>
        <Row label={`Effects · ${Math.round(s.sfxVolume * 100)}%`}>
          <input type="range" min={0} max={1} step={0.05} value={s.sfxVolume} onChange={(e) => update({ sfxVolume: Number(e.target.value) })} aria-label="Effects volume" />
        </Row>
        <Row label={`Environmental audio · ${Math.round(s.ambienceVolume * 100)}%`} hint="City hum, arcade bleeps, wind, static — all synthesised live.">
          <input type="range" min={0} max={1} step={0.05} value={s.ambienceVolume} onChange={(e) => update({ ambienceVolume: Number(e.target.value) })} aria-label="Ambience volume" />
          <Opt v={true} cur={s.ambience} set={(v) => update({ ambience: v })} label="On" />
          <Opt v={false} cur={s.ambience} set={(v) => update({ ambience: v })} label="Off" />
        </Row>
        <Row label="Connection" hint="This build is single-player. Residents are NPCs simulated on this device; the presence layer is ready for a future network provider.">
          <span className="font-mono text-[0.75rem] text-white/60">Offline · NPCs only</span>
        </Row>
      </div>
    </Panel>
  )
}

const INV_TABS: { id: ItemCategory; label: string }[] = [
  { id: 'outfit', label: 'Outfits' },
  { id: 'accessory', label: 'Accessories' },
  { id: 'vehicle', label: 'Vehicles' },
  { id: 'collectible', label: 'Collectibles' },
  { id: 'reward', label: 'Rewards' },
  { id: 'special', label: 'Special' },
]

export function InventoryPanel({ close }: { close: () => void }) {
  const p = useGame((s) => s.progress)
  const avatar = useGame((s) => s.avatar)
  const equip = useGame((s) => s.equipItem)
  const selectVehicle = useGame((s) => s.selectVehicle)
  const [tab, setTab] = useState<ItemCategory>('outfit')
  const list = Object.values(ITEMS).filter((it) => itemCategory(it) === tab)
  const firstOwned = list.find((it) => p.items.includes(it.id))
  const [sel, setSel] = useState<string | null>(firstOwned?.id ?? null)
  const def = sel && ITEMS[sel] && itemCategory(ITEMS[sel]) === tab ? ITEMS[sel] : null
  const isEquipped = (id: string) => {
    const e = ITEMS[id]?.equip
    if (!e || !avatar) return false
    if (e.slot === 'paint') return p.paint === e.value
    return (avatar as unknown as Record<string, string>)[e.slot] === e.value
  }
  return (
    <Panel title="INVENTORY" kicker={`${p.items.length} items · ${p.wallet} coins`} accent="#9d4dff" onClose={close} wide>
      <div data-testid="inventory">
        <div className="mb-3 flex flex-wrap gap-1" role="tablist">
          {INV_TABS.map((t) => (
            <button key={t.id} role="tab" aria-selected={tab === t.id} aria-pressed={tab === t.id} className="chip" style={css('#9d4dff')} onClick={() => { sfx('blip'); setTab(t.id); setSel(null) }} data-testid={`inv-tab-${t.id}`}>
              {t.label}
            </button>
          ))}
        </div>
        {tab === 'vehicle' && (
          <div className="mb-3 grid grid-cols-3 gap-2">
            {VEHICLES.map((v) => {
              const own = p.vehicles.includes(v.id)
              return (
                <button key={v.id} disabled={!own} className={`chip !p-2 text-center ${p.vehicle === v.id ? '' : ''}`} aria-pressed={p.vehicle === v.id} style={css(v.color)} onClick={() => selectVehicle(v.id)}>
                  <div className="font-display text-[0.75rem]" style={{ color: own ? v.color : '#666' }}>{v.name}</div>
                  <div className="text-[0.62rem] text-white/50">{own ? (p.vehicle === v.id ? 'selected for races' : 'tap to select') : v.unlock}</div>
                </button>
              )
            })}
          </div>
        )}
        {tab === 'collectible' && (
          <div className="mb-3 grid grid-cols-3 gap-2 text-center">
            {Object.entries(RELIC_SETS).map(([k, r]) => (
              <div key={k} className="border border-white/10 bg-black/30 p-2">
                <div className="font-display text-lg text-white">{p.relics.filter((x) => x.startsWith(k + '-')).length}/{r.total}</div>
                <div className="text-[0.65rem] text-white/60">{r.name}s</div>
              </div>
            ))}
          </div>
        )}
        <div className="grid gap-4 md:grid-cols-[1fr_260px]">
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {list.length === 0 && <p className="col-span-4 text-[0.8rem] text-white/50">Nothing in this category yet.</p>}
            {list.map((it) => {
              const has = p.items.includes(it.id)
              return (
                <button key={it.id} disabled={!has} aria-pressed={sel === it.id} onClick={() => { sfx('blip'); setSel(it.id) }} className="chip relative flex aspect-square flex-col items-center justify-center gap-1 !p-2" style={css(it.color)} data-testid={`inv-${it.id}`}>
                  <span className="text-2xl" style={{ color: has ? it.color : '#444', textShadow: has ? `0 0 12px ${it.color}` : undefined }}>{has ? it.glyph : '?'}</span>
                  <span className="text-center text-[0.6rem] leading-tight">{has ? it.name : 'Undiscovered'}</span>
                  {has && isEquipped(it.id) && <span className="absolute right-1 top-1 text-[0.55rem] text-lime">ON</span>}
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
                  <button className="holo-btn primary mt-4 w-full" style={css(def.color)} onClick={() => equip(def.id)} data-testid="inv-equip">
                    {isEquipped(def.id) ? 'Unequip' : def.equip.slot === 'paint' ? 'Apply to race car' : 'Equip on avatar'}
                  </button>
                )}
                {def.id === 'copper-key' && <p className="mt-3 text-[0.72rem] text-ember">Use it at the Founder’s Gate in OASIS Prime.</p>}
              </>
            ) : (
              <p className="text-[0.8rem] text-white/50">Select an item. Earn more from quests, challenges and the OASIS Exchange.</p>
            )}
          </div>
        </div>
      </div>
    </Panel>
  )
}

export function xpPct(xp: number) {
  const l = levelFor(xp)
  const a = LEVEL_XP[l - 1] ?? 0
  const b = LEVEL_XP[l] ?? a + 1000
  return Math.min(100, ((xp - a) / (b - a)) * 100)
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
          <div className="w-40">
            <div className="flex justify-between font-mono text-[0.65rem] text-white/60">
              <span>LEVEL {levelFor(p.xp)}</span>
              <span>{p.xp} XP</span>
            </div>
            <div className="mt-1 h-1.5 bg-white/10">
              <div className="h-full bg-cyan" style={{ width: `${xpPct(p.xp)}%` }} />
            </div>
          </div>
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
          <Stat label="Founder’s Gate" value={`${p.locks}/3 locks`} accent="#ff9a4d" />
          <Stat label="Level" value={`${levelFor(p.xp)} · ${p.xp} XP`} accent="#00f0ff" />
          <Stat label="Grand Prix best" value={p.gpBest ? `${p.gpBest.toFixed(2)}s` : '—'} accent="#3dff8b" />
          <Stat label="Races finished" value={`${p.gpFinishes}`} accent="#3dff8b" />
          <Stat label="Trials" value={`${p.trials.length}/3`} accent="#ffe14d" />
          <Stat label="Founder’s marks" value={`${p.glyphs.length}/${GLYPHS.length}`} accent="#ffe14d" />
          <Stat label="Platformer best" value={`${p.highScores.glitchhop ?? 0}`} accent="#3dff8b" />
          <Stat label="Arena best" value={`${p.highScores.gladiator ?? 0} waves`} accent="#ff4d4d" />
          <Stat label="Vehicles" value={`${p.vehicles.length}/${VEHICLES.length}`} accent="#9d4dff" />
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
  const insertKey = useGame((s) => s.insertKey)
  const next = p.locks < 3 ? LOCK_KEYS[p.locks] : null
  const hasKey = next ? p.items.includes(next) : false
  const colors = ['#ff9a4d', '#4d7cff', '#e0e0ff']
  return (
    <Panel title="THE FOUNDER’S GATE" kicker="the founder’s contest" accent="#ff9a4d" onClose={close}>
      <div data-testid="gate">
        <blockquote className="border-l-2 border-ember/60 pl-4 font-mono text-[0.85rem] italic leading-relaxed text-white/85">
          {FOUNDER_RIDDLE.map((l) => (
            <div key={l}>{l}</div>
          ))}
        </blockquote>
        <div className="mt-5 grid grid-cols-3 gap-2">
          {TRIALS.map((t, i) => {
            const open = p.locks > i
            return (
              <div key={t.id} className={`border p-3 text-center ${open ? 'bg-white/5' : 'border-white/10 bg-black/30'}`} style={{ borderColor: open ? colors[i] : undefined }}>
                <div className="font-display text-xl" style={{ color: open ? colors[i] : '#665a80' }}>{['I', 'II', 'III'][i]}</div>
                <div className="text-[0.62rem] uppercase tracking-widest text-white/60">{open ? `opens ${t.name}` : `${ITEMS[LOCK_KEYS[i]].name}`}</div>
                {p.trials.includes(t.id) && <div className="mt-1 text-[0.6rem] text-lime">trial complete</div>}
              </div>
            )
          })}
        </div>
        <div className="mt-5 space-y-2 text-[0.8rem]">
          {next && hasKey && (
            <button className="holo-btn primary w-full" style={{ '--accent': colors[p.locks] } as CSSProperties} onClick={() => insertKey()} data-testid="insert-key">
              ⚿ Insert the {ITEMS[next].name}
            </button>
          )}
          {next && !hasKey && <p className="text-white/55">Lock {['I', 'II', 'III'][p.locks]} needs the {ITEMS[next].name}. {p.locks === 0 ? 'Find it in the Arcade District.' : `It is the reward of ${TRIALS[p.locks - 1].name}.`}</p>}
          {p.locks >= 1 && p.gpFinishes === 0 && <p className="text-lime">The trial portals behind the gate only open for Grand Prix finishers. Race in Velocity City (portal south of the spawn).</p>}
          {p.locks >= 1 && <p className="text-white/60">Trial portals stand behind the gate. Walk around it.</p>}
          {!next && <p className="text-lime">All three locks are open.</p>}
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
              {String(p.highScores[c.id] ?? 0).padStart(5, '0')} <span className="text-white/40">/ target {c.targetLabel ?? c.target}</span>
            </span>
          </div>
        ))}
        <div className="flex justify-between border border-white/10 bg-black/30 px-4 py-3">
          <span className="text-lime">GRAND PRIX</span>
          <span className="text-white">{p.gpBest ? `${p.gpBest.toFixed(2)}s` : '—'}</span>
        </div>
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
