import { motion } from 'framer-motion'
import type { CSSProperties, ReactNode } from 'react'

interface Props {
  title: string
  kicker?: string
  accent?: string
  onClose?: () => void
  children: ReactNode
  wide?: boolean
  footer?: ReactNode
}

/** Holographic modal used by every overlay. */
export function Panel({ title, kicker, accent = '#00f0ff', onClose, children, wide, footer }: Props) {
  return (
    <motion.div
      className="fixed inset-0 z-40 flex items-center justify-center p-3 sm:p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      style={{ background: 'radial-gradient(ellipse at center, rgba(10,4,32,0.55), rgba(2,0,8,0.82))' }}
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onClose?.()
      }}
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`holo flex max-h-[92dvh] w-full flex-col ${wide ? 'max-w-4xl' : 'max-w-xl'}`}
        style={{ '--accent': accent } as CSSProperties}
        initial={{ y: 24, scale: 0.97, opacity: 0 }}
        animate={{ y: 0, scale: 1, opacity: 1 }}
        exit={{ y: 12, scale: 0.98, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 380, damping: 32 }}
      >
        <div className="flex items-start justify-between gap-4 border-b px-5 pb-3 pt-4" style={{ borderColor: `${accent}33` }}>
          <div>
            {kicker && <div className="font-mono text-[0.7rem] uppercase tracking-[0.3em]" style={{ color: accent }}>{kicker}</div>}
            <h2 className="neon-text font-display text-lg font-bold tracking-[0.12em] sm:text-xl" style={{ '--glow': accent } as CSSProperties}>
              {title}
            </h2>
          </div>
          {onClose && (
            <button className="holo-btn !px-3 !py-2" style={{ '--accent': accent } as CSSProperties} onClick={onClose} aria-label="Close">
              ✕ <span className="hidden sm:inline">Esc</span>
            </button>
          )}
        </div>
        <div className="scroll-thin min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="border-t px-5 py-3" style={{ borderColor: `${accent}33` }}>{footer}</div>}
      </motion.div>
    </motion.div>
  )
}
