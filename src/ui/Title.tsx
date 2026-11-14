import { useEffect, useState, type CSSProperties } from 'react'
import { motion } from 'framer-motion'
import { useGame } from '../store/useGame'
import { useCreator } from '../store/useCreator'
import { playMusic, sfx, unlockAudio } from '../game/systems/audio'
import { titleWarp } from '../game/scenes/TitleScene'
import { DEFAULT_AVATAR } from '../data/avatar'
import { AvatarBadge } from './AvatarBadge'

/** Title screen over the cinematic 3D backdrop. */
export function Title() {
  const avatar = useGame((s) => s.avatar)
  const reduced = useGame((s) => s.settings.reducedMotion)
  const [warping, setWarping] = useState(false)

  useEffect(() => {
    titleWarp.active = false
    playMusic('title')
  }, [])

  const go = (target: 'creator' | 'world') => {
    if (warping) return
    unlockAudio()
    playMusic('title')
    sfx('portal')
    setWarping(true)
    titleWarp.active = true
    titleWarp.startedAt = performance.now()
    window.setTimeout(
      () => {
        titleWarp.active = false
        const g = useGame.getState()
        if (target === 'creator') {
          useCreator.getState().setDraft(g.avatar ?? DEFAULT_AVATAR)
          g.openCreator('title')
        } else g.enterWorld()
      },
      reduced ? 200 : 1300,
    )
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Enter') go(avatar ? 'world' : 'creator')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  return (
    <motion.div className="pointer-events-none fixed inset-0 z-30 flex flex-col items-center justify-center px-4 text-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.6 }}>
      <motion.div initial={{ y: 20, opacity: 0, letterSpacing: '0.6em' }} animate={{ y: 0, opacity: warping ? 0 : 1, letterSpacing: '0.18em' }} transition={{ duration: 1.2, ease: 'easeOut' }} className="font-mono text-[0.7rem] uppercase text-cyan/80 sm:text-xs">
        an unofficial fan-made experience
      </motion.div>
      <motion.h1
        className="neon-text flicker mt-3 font-display text-[2.4rem] font-black leading-[0.95] tracking-[0.06em] sm:text-7xl md:text-8xl"
        style={{ '--glow': '#ff2bd6' } as CSSProperties}
        initial={{ scale: 1.15, opacity: 0, filter: 'blur(12px)' }}
        animate={{ scale: warping ? 1.6 : 1, opacity: warping ? 0 : 1, filter: warping ? 'blur(8px)' : 'blur(0px)' }}
        transition={{ duration: warping ? 0.8 : 1.4, ease: 'easeOut' }}
      >
        READY PLAYER ONE
      </motion.h1>
      <motion.div
        className="neon-text mt-4 font-display text-lg font-bold tracking-[0.5em] sm:text-2xl"
        style={{ '--glow': '#00f0ff' } as CSSProperties}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: warping ? 0 : 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.8 }}
      >
        ENTER THE OASIS
      </motion.div>

      <motion.div className="pointer-events-auto mt-10 flex flex-col items-center gap-3 sm:mt-14" initial={{ opacity: 0, y: 14 }} animate={{ opacity: warping ? 0 : 1, y: 0 }} transition={{ delay: 1.0, duration: 0.6 }}>
        {avatar ? (
          <>
            <button data-testid="continue" className="holo-btn primary flex items-center gap-3 !px-6 !py-4 !text-sm" style={{ '--accent': '#00f0ff' } as CSSProperties} onClick={() => go('world')}>
              <AvatarBadge avatar={avatar} size={34} />
              <span>Enter as {avatar.name}</span>
            </button>
            <button data-testid="new-avatar" className="holo-btn" style={{ '--accent': '#ff2bd6' } as CSSProperties} onClick={() => go('creator')}>
              Edit avatar
            </button>
          </>
        ) : (
          <button data-testid="start" className="holo-btn primary !px-10 !py-4 !text-base" style={{ '--accent': '#00f0ff' } as CSSProperties} onClick={() => go('creator')}>
            ▶ Start
          </button>
        )}
        <div className="mt-2 font-mono text-[0.7rem] tracking-[0.25em] text-white/40">
          PRESS <span className="kbd">ENTER</span>
        </div>
      </motion.div>

      <div className="absolute bottom-3 left-0 right-0 px-4 font-mono text-[0.6rem] leading-relaxed text-white/35 sm:text-[0.65rem]">
        Unofficial, non-commercial fan project inspired by the film. Not affiliated with or endorsed by the rights holders. All art, audio and code are original.
      </div>
    </motion.div>
  )
}
