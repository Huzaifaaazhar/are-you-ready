import { AnimatePresence, motion } from 'framer-motion'
import { useGame } from '../store/useGame'

export function LoadingVeil() {
  const loading = useGame((s) => s.worldLoading && s.phase === 'world')
  return (
    <AnimatePresence>
      {loading && (
        <motion.div className="fixed inset-0 z-[45] flex flex-col items-center justify-center bg-void" initial={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }} data-testid="loading">
          <div className="h-16 w-16 animate-spin rounded-full border-2 border-cyan/20 border-t-cyan shadow-[0_0_20px_#00f0ff55]" />
          <div className="mt-5 font-display text-xs tracking-[0.4em] text-cyan">RENDERING WORLD</div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
