import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { getObjective, useGame } from '../store/useGame'
import { WORLDS, TOTAL_COINS } from '../game/world/registry'
import { RACE_CHECKPOINTS } from '../game/world/hub/layout'
import { AvatarBadge } from './AvatarBadge'
import { triggerInteract } from '../game/systems/interaction'

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
  const obj = getObjective(progress, race)
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
          <div className="font-display text-[0.8rem] font-bold tracking-[0.1em] text-white" data-testid="hud-name">
            {avatar.name}
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
      {!touch && mode === 'mouse' && !locked && !overlay && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 font-mono text-[0.7rem] tracking-[0.2em] text-white/55">CLICK TO LOOK AROUND · ESC TO PAUSE</div>
      )}
      {!touch && mode === 'assist' && !overlay && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 font-mono text-[0.7rem] tracking-[0.2em] text-white/45">ASSIST MODE · DRAG OR ← → / Q R TO TURN</div>
      )}
      {!touch && !overlay && (
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
