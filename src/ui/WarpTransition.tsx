import { AnimatePresence, motion } from 'framer-motion'
import type { CSSProperties } from 'react'
import { useGame } from '../store/useGame'

/** Full-screen warp effect shown while travelling between worlds. */
export function WarpTransition() {
  const t = useGame((s) => s.transition)
  return (
    <AnimatePresence>
      {t.active && (
        <motion.div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center overflow-hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.45 }} data-testid="warp">
          <div className="absolute inset-0" style={{ background: 'radial-gradient(circle at center, #ffffff 0%, #00f0ff 12%, #7a2bff 35%, #05010f 75%)' }} />
          <div className="absolute inset-0 opacity-70" style={{ background: 'repeating-conic-gradient(from 0deg, rgba(255,255,255,0.0) 0deg 4deg, rgba(255,255,255,0.35) 4deg 5deg)', maskImage: 'radial-gradient(circle, transparent 10%, black 60%)' }} />
          <motion.div className="relative text-center" initial={{ scale: 0.8 }} animate={{ scale: 1 }}>
            <div className="font-mono text-xs uppercase tracking-[0.5em] text-white/80">warping to</div>
            <div className="neon-text font-display text-3xl font-black tracking-[0.15em] sm:text-5xl" style={{ '--glow': '#ff2bd6' } as CSSProperties}>
              {t.label.toUpperCase()}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
