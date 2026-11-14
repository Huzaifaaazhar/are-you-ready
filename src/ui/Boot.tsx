import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useGame } from '../store/useGame'
import { sfx, unlockAudio } from '../game/systems/audio'

const LINES = [
  'OASIS VR KERNEL v8.2.1 — unofficial fan build',
  'Checking visor firmware ........... OK',
  'Calibrating haptic suit ........... OK',
  'Mounting avatar registry .......... OK',
  'Linking omnidirectional treadmill . OK',
  'Resolving universe shards ......... 2 worlds online',
  'Handshake with OASIS Prime ........ ESTABLISHED',
]

/** Short, skippable boot sequence. */
export function Boot() {
  const setPhase = useGame((s) => s.setPhase)
  const [n, setN] = useState(0)
  useEffect(() => {
    if (n >= LINES.length) {
      const t = window.setTimeout(() => setPhase('title'), 650)
      return () => window.clearTimeout(t)
    }
    const t = window.setTimeout(() => setN((x) => x + 1), n === 0 ? 450 : 260 + Math.random() * 160)
    return () => window.clearTimeout(t)
  }, [n, setPhase])

  useEffect(() => {
    const skip = () => {
      unlockAudio()
      sfx('blip')
      setPhase('title')
    }
    window.addEventListener('keydown', skip)
    window.addEventListener('pointerdown', skip)
    return () => {
      window.removeEventListener('keydown', skip)
      window.removeEventListener('pointerdown', skip)
    }
  }, [setPhase])

  const pct = Math.round((n / LINES.length) * 100)
  return (
    <motion.div className="fixed inset-0 z-50 flex flex-col justify-between bg-black p-6 font-mono text-[0.8rem] text-cyan sm:p-10 sm:text-sm" exit={{ opacity: 0 }} transition={{ duration: 0.5 }}>
      <div className="space-y-1">
        {LINES.slice(0, n).map((l, i) => (
          <motion.div key={i} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} className={i === LINES.length - 1 ? 'text-lime' : ''}>
            <span className="text-magenta">&gt;</span> {l}
          </motion.div>
        ))}
        <span className="blink">█</span>
      </div>
      <div>
        <div className="mb-2 flex justify-between text-[0.7rem] tracking-widest text-cyan/70">
          <span>BOOTING</span>
          <span>{pct}%</span>
        </div>
        <div className="h-1 w-full bg-cyan/10">
          <div className="h-full bg-cyan shadow-[0_0_12px_#00f0ff] transition-all duration-200" style={{ width: `${pct}%` }} />
        </div>
        <div className="mt-4 text-center text-[0.7rem] tracking-[0.3em] text-white/40">PRESS ANY KEY TO SKIP</div>
      </div>
    </motion.div>
  )
}
