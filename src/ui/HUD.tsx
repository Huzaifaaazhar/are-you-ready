import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { getObjective, useGame } from '../store/useGame'
import { WORLDS, TOTAL_COINS } from '../game/world/registry'
import { RACE_CHECKPOINTS } from '../game/world/hub/layout'
import { AvatarBadge } from './AvatarBadge'
import { triggerInteract } from '../game/systems/interaction'
import { levelFor } from '../data/content'
import { xpPct } from './panels/Panels'
import { TRIAL_TEXT, useTrialHud } from '../game/world/trials/common'
import { carState, useRace } from '../store/useRace'
import { CHECKPOINTS } from '../game/world/race/layout'

function RaceTimer() {
  const race = useGame((s) => s.race)
  const ref = useRef<HTMLSpanElement>(null)
  const [count, setCount] = useState<number | null>(null)
  useEffect(() => {
    let raf = 0
    const tick = () => {
      const r = useGame.getState().race
      const now = performance.now()
      if (r.status === 'countdown') setCount(Math.max(0, Math.ceil((r.countdownEnd - now) / 1000)))
      else setCount(null)
      if (ref.current) ref.current.textContent = r.status === 'running' ? ((now - r.startedAt) / 1000).toFixed(2) : '0.00'
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])
  if (race.status === 'idle') return null
  return (
    <>
      <div className="holo pointer-events-none absolute left-1/2 top-20 -translate-x-1/2 px-5 py-2 text-center" style={{ '--accent': '#3dff8b' } as CSSProperties}>
        <div className="font-display text-[0.6rem] tracking-[0.3em] text-lime">VELOCITY CIRCUIT · RING {Math.min(race.next + 1, RACE_CHECKPOINTS.length)}/{RACE_CHECKPOINTS.length}</div>
        <div className="font-display text-2xl font-bold tabular-nums text-white">
          <span ref={ref}>0.00</span>s
        </div>
      </div>
      <AnimatePresence>
        {count !== null && count > 0 && (
          <motion.div key={count} className="neon-text pointer-events-none absolute inset-0 flex items-center justify-center font-display text-8xl font-black" style={{ '--glow': '#3dff8b' } as CSSProperties} initial={{ scale: 2, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.6, opacity: 0 }}>
            {count}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

function RaceHUD({ touch }: { touch: boolean }) {
  const status = useRace((s) => s.status)
  const cp = useRace((s) => s.cp)
  const best = useGame((s) => s.progress.gpBest)
  const overlay = useGame((s) => s.overlay)
  const speedRef = useRef<HTMLSpanElement>(null)
  const timeRef = useRef<HTMLSpanElement>(null)
  const boostRef = useRef<HTMLDivElement>(null)
  const lines = useRef<HTMLDivElement>(null)
  const [count, setCount] = useState<number | null>(null)
  useEffect(() => {
    let raf = 0
    const tick = () => {
      const r = useRace.getState()
      const now = performance.now()
      if (speedRef.current) speedRef.current.textContent = String(Math.round(Math.abs(carState.speed) * 3.6))
      if (timeRef.current) timeRef.current.textContent = r.status === 'racing' ? ((now - r.startTime) / 1000).toFixed(2) : r.finishTime ? r.finishTime.toFixed(2) : '0.00'
      if (boostRef.current) {
        boostRef.current.style.width = `${carState.boost}%`
        boostRef.current.style.background = carState.boosting ? '#4dd2ff' : carState.drifting ? '#ff2bd6' : '#3dff8b'
      }
      if (lines.current) lines.current.style.opacity = String(Math.max(0, Math.min(0.85, (Math.abs(carState.speed) - 22) / 25 + (carState.boosting ? 0.3 : 0))))
      setCount(r.status === 'countdown' ? Math.max(0, Math.ceil((r.countdownEnd - now) / 1000)) : null)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])
  return (
    <>
      {/* speed lines */}
      <div ref={lines} className="pointer-events-none absolute inset-0 opacity-0" style={{ background: 'repeating-conic-gradient(from 0deg at 50% 55%, transparent 0deg 3deg, rgba(160,240,255,0.18) 3deg 3.6deg)', maskImage: 'radial-gradient(circle at 50% 55%, transparent 35%, black 80%)' }} />
      <div className={`holo pointer-events-none absolute left-1/2 -translate-x-1/2 px-5 py-2 text-center ${touch ? 'top-[210px]' : 'bottom-10'}`} style={{ '--accent': '#3dff8b' } as CSSProperties} data-testid="race-hud">
        <div className="font-display text-[0.6rem] tracking-[0.3em] text-lime">
          GRAND PRIX · {status === 'racing' ? `CHECKPOINT ${Math.min(cp + 1, CHECKPOINTS.length)}/${CHECKPOINTS.length} · ${CHECKPOINTS[Math.min(cp, CHECKPOINTS.length - 1)].label.toUpperCase()}` : status.toUpperCase()}
        </div>
        <div className="font-display text-2xl font-bold tabular-nums text-white">
          <span ref={timeRef}>0.00</span>s
        </div>
        {best && <div className="font-mono text-[0.6rem] text-white/50">BEST {best.toFixed(2)}s</div>}
      </div>
      <div className={`holo pointer-events-none absolute ${touch ? 'bottom-52 right-4' : 'bottom-6 right-6'} px-4 py-2 text-right`} style={{ '--accent': '#00f0ff' } as CSSProperties}>
        <div className="font-display text-4xl font-black tabular-nums text-white">
          <span ref={speedRef} data-testid="speed">0</span>
          <span className="ml-1 text-xs text-cyan">KM/H</span>
        </div>
        <div className="mt-1 h-2 w-40 bg-white/10">
          <div ref={boostRef} className="h-full transition-[width] duration-100" />
        </div>
        <div className="mt-0.5 font-mono text-[0.6rem] text-white/50">BOOST · SHIFT{touch ? '' : ' · SPACE DRIFT CHARGES IT'}</div>
      </div>
      {!touch && !overlay && <div className="pointer-events-none absolute bottom-4 left-4 font-mono text-[0.62rem] text-white/45">W/S throttle · A/D steer · Space handbrake · Shift boost · C camera · V look back · R respawn</div>}
      {!overlay && (status === 'garage' || status === 'finished') && (
        <button className="holo-btn pointer-events-auto absolute bottom-16 left-1/2 -translate-x-1/2" style={{ '--accent': '#3dff8b' } as CSSProperties} onClick={() => useGame.getState().openOverlay({ type: status === 'finished' ? 'race-result' : 'garage' })}>
          Open garage <span className="kbd ml-1">G</span>
        </button>
      )}
      <AnimatePresence>
        {count !== null && count > 0 && (
          <motion.div key={count} className="neon-text pointer-events-none absolute inset-0 flex items-center justify-center font-display text-8xl font-black" style={{ '--glow': '#3dff8b' } as CSSProperties} initial={{ scale: 2, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.6, opacity: 0 }}>
            {count}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

function TrialStatus() {
  const trial = useTrialHud((s) => s.trial)
  const status = useTrialHud((s) => s.status)
  if (!trial || status.length === 0) return null
  return (
    <div className="holo pointer-events-none absolute left-3 top-[150px] px-3 py-2 sm:left-5 sm:top-[110px]" style={{ '--accent': '#ffe14d' } as CSSProperties} data-testid="trial-status">
      {status.map((l) => (
        <div key={l} className="font-mono text-[0.75rem] text-white/85">
          {l}
        </div>
      ))}
    </div>
  )
}

function Toasts() {
  const toasts = useGame((s) => s.toasts)
  const color = { coin: '#ffe14d', achievement: '#ff2bd6', item: '#9d4dff', secret: '#3dff8b', info: '#00f0ff', error: '#ff4d4d' }
  return (
    <div className="pointer-events-none absolute right-3 top-[200px] flex w-[min(320px,80vw)] sm:top-[136px] flex-col items-end gap-2 sm:right-5">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div key={t.id} layout initial={{ x: 60, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 60, opacity: 0 }} className="holo w-full px-4 py-2.5" style={{ '--accent': color[t.kind] } as CSSProperties}>
            <div className="font-display text-[0.72rem] font-bold tracking-[0.12em]" style={{ color: color[t.kind] }}>
              {t.title}
            </div>
            {t.body && <div className="text-[0.75rem] text-white/75">{t.body}</div>}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}

function LocationBanner() {
  const stamp = useGame((s) => s.locationBanner)
  const worldId = useGame((s) => s.worldId)
  const [show, setShow] = useState(false)
  useEffect(() => {
    if (!stamp) return
    setShow(true)
    const t = window.setTimeout(() => setShow(false), 3200)
    return () => window.clearTimeout(t)
  }, [stamp])
  const l = WORLDS[worldId].layout
  return (
    <AnimatePresence>
      {show && (
        <motion.div className="pointer-events-none absolute left-0 right-0 top-[22%] text-center" initial={{ opacity: 0, y: -10, letterSpacing: '0.6em' }} animate={{ opacity: 1, y: 0, letterSpacing: '0.2em' }} exit={{ opacity: 0 }} transition={{ duration: 0.8 }}>
          <div className="font-mono text-xs uppercase tracking-[0.4em] text-magenta">{l.subtitle}</div>
          <div className="neon-text font-display text-3xl font-black sm:text-5xl" style={{ '--glow': '#00f0ff' } as CSSProperties}>
            {l.name.toUpperCase()}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/** Minimal in-world HUD. */
export function HUD({ touch }: { touch: boolean }) {
  const avatar = useGame((s) => s.avatar)
  const worldId = useGame((s) => s.worldId)
  const energy = useGame((s) => s.energy)
  const prompt = useGame((s) => s.prompt)
  const progress = useGame((s) => s.progress)
  const race = useGame((s) => s.race)
  const overlay = useGame((s) => s.overlay)
  const locked = useGame((s) => s.pointerLocked)
  const mode = useGame((s) => s.settings.controlMode)
  const open = useGame((s) => s.openOverlay)
  const trialHud = useTrialHud((s) => s.trial)
  const raceStatus = useRace((s) => s.status)
  const obj =
    worldId === 'race'
      ? { title: 'Velocity City Grand Prix', detail: raceStatus === 'racing' ? 'Hit every checkpoint and cross the finish' : raceStatus === 'finished' ? 'Race again, or return to OASIS Prime' : 'Pick a vehicle in the garage and start the race' }
      : trialHud
        ? { title: TRIAL_TEXT[trialHud].title, detail: TRIAL_TEXT[trialHud].objectives[0] }
        : getObjective(progress, race)
  const level = levelFor(progress.xp)
  const driving = worldId === 'race'
  const layout = WORLDS[worldId].layout
  if (!avatar) return null
  return (
    <div className="pointer-events-none fixed inset-0 z-20 select-none" data-testid="hud">
      {/* player card */}
      <div className="holo pointer-events-auto absolute left-3 top-[60px] flex max-w-[calc(100vw-24px)] items-center gap-3 py-2 pl-2 pr-4 sm:left-5 sm:top-5" style={{ '--accent': avatar.accent } as CSSProperties}>
        <button onClick={() => open({ type: 'profile' })} aria-label="Open profile" className="cursor-pointer">
          <AvatarBadge avatar={avatar} size={44} />
        </button>
        <div className="min-w-0 sm:min-w-[110px]">
          <div className="flex items-center gap-2">
            <div className="font-display text-[0.8rem] font-bold tracking-[0.1em] text-white" data-testid="hud-name">
              {avatar.name}
            </div>
            <span className="border border-cyan/40 px-1 font-display text-[0.55rem] text-cyan" data-testid="hud-level" title={`${progress.xp} XP`}>
              LV {level}
            </span>
          </div>
          <div className="truncate font-mono text-[0.65rem] uppercase tracking-[0.15em] text-cyan/80" data-testid="hud-location">
            ◉ {layout.name} · {layout.subtitle}
          </div>
          <div className="mt-1 flex items-center gap-2" title="Energy (sprint)">
            <div className="h-1.5 w-24 bg-white/10">
              <div className="h-full transition-[width] duration-150" style={{ width: `${energy}%`, background: energy < 25 ? '#ff4d4d' : '#3dff8b', boxShadow: `0 0 8px ${energy < 25 ? '#ff4d4d' : '#3dff8b'}` }} />
            </div>
            <span className="font-mono text-[0.6rem] text-white/50">EN</span>
          </div>
          <div className="mt-1 h-0.5 w-24 bg-white/10" title="Experience">
            <div className="h-full bg-cyan/80" style={{ width: `${xpPct(progress.xp)}%` }} />
          </div>
        </div>
      </div>

      {/* objective + coins */}
      <div className="absolute right-3 top-3 flex flex-col items-end gap-2 sm:right-5 sm:top-5">
        <div className="flex gap-2">
          <div className="holo px-3 py-1.5 font-display text-sm font-bold text-gold" style={{ '--accent': '#ffe14d' } as CSSProperties} data-testid="hud-coins" title={`${progress.collected.length}/${TOTAL_COINS} coins found`}>
            ◎ {progress.wallet}
          </div>
          <button className="holo-btn pointer-events-auto !px-3 !py-1.5" onClick={() => open({ type: 'inventory' })} aria-label="Inventory">
            ▦ {!touch && <span className="kbd ml-1">I</span>}
          </button>
          <button className="holo-btn pointer-events-auto !px-3 !py-1.5" onClick={() => open({ type: 'journal' })} aria-label="Journal" data-testid="journal-btn">
            ✎ {!touch && <span className="kbd ml-1">J</span>}
          </button>
          <button className="holo-btn pointer-events-auto !px-3 !py-1.5" onClick={() => open({ type: 'map' })} aria-label="Map">
            ⌖ {!touch && <span className="kbd ml-1">M</span>}
          </button>
          <button className="holo-btn pointer-events-auto !px-3 !py-1.5" onClick={() => open({ type: 'pause' })} aria-label="Pause" data-testid="pause-btn">
            ❚❚ {!touch && <span className="kbd ml-1">Esc</span>}
          </button>
        </div>
        <div className="holo absolute right-0 top-[124px] max-w-[min(300px,60vw)] px-3 py-2 text-right sm:static" style={{ '--accent': '#ff2bd6' } as CSSProperties} data-testid="hud-objective">
          <div className="font-display text-[0.6rem] uppercase tracking-[0.25em] text-magenta">◆ {obj.title}</div>
          <div className="text-[0.78rem] text-white/85">{obj.detail}</div>
        </div>
      </div>

      <RaceTimer />
      {driving && <RaceHUD touch={touch} />}
      <TrialStatus />
      <Toasts />
      <LocationBanner />

      {/* interaction prompt */}
      <AnimatePresence>
        {prompt && !overlay && (
          <motion.div key={prompt.id} className={`absolute left-1/2 -translate-x-1/2 ${touch ? 'bottom-44' : 'bottom-16'}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }}>
            <button className="holo pointer-events-auto flex items-center gap-3 px-4 py-2.5 text-left" style={{ '--accent': '#00f0ff' } as CSSProperties} onClick={() => triggerInteract()} data-testid="prompt">
              <span className="kbd text-cyan">{touch ? 'TAP' : 'E'}</span>
              <span className="font-display text-[0.78rem] tracking-[0.08em] text-white">{prompt.label}</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* mouse-look hint */}
      {!touch && !driving && mode === 'mouse' && !locked && !overlay && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 font-mono text-[0.7rem] tracking-[0.2em] text-white/55">CLICK TO LOOK AROUND · ESC TO PAUSE</div>
      )}
      {!touch && !driving && mode === 'assist' && !overlay && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 font-mono text-[0.7rem] tracking-[0.2em] text-white/45">ASSIST MODE · DRAG OR ← → / Q R TO TURN</div>
      )}
      {!touch && !overlay && !driving && (
        <div className="absolute bottom-4 left-4 hidden font-mono text-[0.62rem] leading-5 text-white/40 lg:block">
          <span className="kbd">W</span>
          <span className="kbd">A</span>
          <span className="kbd">S</span>
          <span className="kbd">D</span> move · <span className="kbd">Space</span> jump · <span className="kbd">Shift</span> sprint · <span className="kbd">E</span> interact
        </div>
      )}
    </div>
  )
}
