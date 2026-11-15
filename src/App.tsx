import { useEffect, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { useGame } from './store/useGame'
import { GameCanvas, loadWorldRuntime } from './game/GameCanvas'
import { addLook, clearInput, initInput, isTypingTarget } from './game/systems/input'
import { triggerInteract } from './game/systems/interaction'
import { setAudioSettings, unlockAudio } from './game/systems/audio'
import { Boot } from './ui/Boot'
import { Title } from './ui/Title'
import { Creator } from './ui/Creator'
import { Profile } from './ui/Profile'
import { WorldErrorPanel } from './ui/WorldErrorPanel'
import { HUD } from './ui/HUD'
import { Overlays } from './ui/Overlays'
import { TouchControls } from './ui/TouchControls'
import { WarpTransition } from './ui/WarpTransition'
import { LoadingVeil } from './ui/LoadingVeil'
import { WORLDS } from './game/world/registry'
import { useTrialHud } from './game/world/trials/common'
import { retryStage } from './game/world/showdown/state'
import { useRace } from './store/useRace'

function useIsTouch() {
  const [coarse, setCoarse] = useState(() => typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches)
  useEffect(() => {
    const mq = matchMedia('(pointer: coarse)')
    const fn = () => setCoarse(mq.matches)
    mq.addEventListener('change', fn)
    return () => mq.removeEventListener('change', fn)
  }, [])
  return coarse
}

const canvasEl = () => document.querySelector('#game-canvas canvas') as HTMLCanvasElement | null

/** Global keyboard shortcuts, pointer lock and mouse/drag look. */
function useControls(touch: boolean) {
  useEffect(() => initInput(), [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target) || e.repeat) return
      const g = useGame.getState()
      if (g.phase !== 'world') return
      if (e.code === 'Escape') {
        const o = g.overlay
        if (o) {
          if (o.type === 'settings') g.openOverlay({ type: 'pause' })
          else if (o.type === 'garage' || o.type === 'race-result') g.openOverlay({ type: 'pause' })
          else if (o.type === 'sd-fail') {
            g.closeOverlay()
            retryStage()
          } else if (o.type === 'prep') g.openOverlay({ type: 'pause' })
          else if (o.type === 'trial-result' && !o.success) {
            g.closeOverlay()
            useTrialHud.getState().retry?.()
          } else g.closeOverlay()
        } else g.openOverlay({ type: 'pause' })
        return
      }
      if (g.overlay || g.transition.active) {
        if ((e.code === 'KeyL' && g.overlay?.type === 'quests') || (e.code === 'KeyI' && g.overlay?.type === 'inventory') || (e.code === 'KeyM' && g.overlay?.type === 'map') || (e.code === 'KeyJ' && g.overlay?.type === 'journal') || (e.code === 'KeyP' && g.overlay?.type === 'pause')) g.closeOverlay()
        return
      }
      if ((e.code === 'KeyE' || e.code === 'Enter') && g.worldId !== 'race') triggerInteract()
      else if (e.code === 'KeyI' || e.code === 'Tab') {
        e.preventDefault()
        g.openOverlay({ type: 'inventory' })
      } else if (e.code === 'KeyM') g.openOverlay({ type: 'map' })
      else if (e.code === 'KeyJ') g.openOverlay({ type: 'journal' })
      else if (e.code === 'KeyL') g.openOverlay({ type: 'quests' })
      else if (e.code === 'KeyG' && g.worldId === 'race') {
        const st = useRace.getState().status
        if (st === 'garage') g.openOverlay({ type: 'garage' })
        if (st === 'finished') g.openOverlay({ type: 'race-result' })
      }
      else if (e.code === 'KeyP') g.openOverlay({ type: 'pause' })
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    // Pointer lock (mouse-look mode) and drag-look (assist mode).
    let dragging = false
    let lastX = 0
    let lastY = 0
    const onLockChange = () => {
      const locked = document.pointerLockElement === canvasEl()
      const g = useGame.getState()
      g.setPointerLocked(locked)
      if (!locked && g.phase === 'world' && !g.overlay && g.settings.controlMode === 'mouse' && !g.transition.active) g.openOverlay({ type: 'pause' })
    }
    const onMove = (e: MouseEvent) => {
      if (document.pointerLockElement) addLook(e.movementX, e.movementY)
      else if (dragging) {
        addLook((e.clientX - lastX) * 1.4, (e.clientY - lastY) * 1.4)
        lastX = e.clientX
        lastY = e.clientY
      }
    }
    const onDown = (e: PointerEvent) => {
      const g = useGame.getState()
      if (g.phase !== 'world' || g.overlay || e.pointerType === 'touch') return
      if (e.target !== canvasEl()) return
      unlockAudio()
      if (g.settings.controlMode === 'mouse') {
        const c = canvasEl()
        try {
          const r = c?.requestPointerLock() as unknown as Promise<void> | undefined
          r?.catch?.(() => {})
        } catch {
          /* pointer lock unavailable: fall back to drag */
        }
      }
      dragging = true
      lastX = e.clientX
      lastY = e.clientY
    }
    const onUp = () => (dragging = false)
    document.addEventListener('pointerlockchange', onLockChange)
    window.addEventListener('mousemove', onMove)
    window.addEventListener('pointerdown', onDown)
    window.addEventListener('pointerup', onUp)
    return () => {
      document.removeEventListener('pointerlockchange', onLockChange)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointerup', onUp)
    }
  }, [touch])

  // Leaving the world (or opening a menu) releases input.
  const phase = useGame((s) => s.phase)
  const overlay = useGame((s) => s.overlay)
  useEffect(() => {
    clearInput()
    if (phase !== 'world' && document.pointerLockElement) document.exitPointerLock()
  }, [phase, overlay])
}

export default function App() {
  const phase = useGame((s) => s.phase)
  const touchSetting = useGame((s) => s.settings.touch)
  const muted = useGame((s) => s.settings.muted)
  const volume = useGame((s) => s.settings.volume)
  const worldId = useGame((s) => s.worldId)
  const coarse = useIsTouch()
  const touch = touchSetting === 'on' || (touchSetting === 'auto' && coarse)
  useControls(touch)

  const mix = useGame((s) => s.settings)
  useEffect(() => setAudioSettings(muted, volume, { music: mix.musicVolume, sfx: mix.sfxVolume, ambience: mix.ambienceVolume, ambienceOn: mix.ambience }), [muted, volume, mix.musicVolume, mix.sfxVolume, mix.ambienceVolume, mix.ambience])
  // Warm the code-split chunk for the saved world while the intro plays.
  useEffect(() => {
    if (phase === 'boot') return
    void loadWorldRuntime()
    void WORLDS[worldId].preload()
  }, [worldId, phase])

  return (
    <>
      {phase !== 'boot' && <GameCanvas />}
      <AnimatePresence>
        {phase === 'boot' && <Boot key="boot" />}
        {phase === 'title' && <Title key="title" />}
        {phase === 'creator' && <Creator key="creator" />}
        {phase === 'profile' && <Profile key="profile" />}
      </AnimatePresence>
      {phase === 'world' && (
        <>
          {touch && <TouchControls />}
          <HUD touch={touch} />
          <Overlays />
        </>
      )}
      <LoadingVeil />
      <WorldErrorPanel />
      <WarpTransition />
      <div className="scanlines opacity-40" />
    </>
  )
}
