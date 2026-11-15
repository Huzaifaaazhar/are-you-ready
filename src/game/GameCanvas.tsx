import { lazy, Suspense, useEffect } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { Bloom, EffectComposer, Vignette, ChromaticAberration } from '@react-three/postprocessing'
import { Vector2, type PerspectiveCamera } from 'three'
import { useGame } from '../store/useGame'
import { useCreator } from '../store/useCreator'
import { TitleScene } from './scenes/TitleScene'
import { CreatorScene } from './scenes/CreatorScene'
import { ProfileScene } from './scenes/ProfileScene'
import { PerformanceMonitor } from '@react-three/drei'
import { WorldLoading } from './world/WorldLoading'

/** World runtime (physics + worlds) is code-split; preloaded while the title screen plays. */
export const loadWorldRuntime = () => import('./world/WorldRoot')
const WorldRoot = lazy(() => loadWorldRuntime().then((m) => ({ default: m.WorldRoot })))

function ResetCamera() {
  const camera = useThree((s) => s.camera) as PerspectiveCamera
  useEffect(() => {
    camera.fov = 60
    camera.updateProjectionMatrix()
  }, [camera])
  return null
}

function CreatorContent() {
  const draft = useCreator((s) => s.draft)
  return <CreatorScene draft={draft} />
}

const caOffset = new Vector2(0.0006, 0.0006)

let lastStep = 0
/** Automatic quality: drop one level when the frame rate keeps declining. */
function stepDown() {
  const g = useGame.getState()
  if (!g.settings.autoQuality || g.phase !== 'world' || performance.now() - lastStep < 15000) return
  const next = g.settings.quality === 'high' ? 'medium' : g.settings.quality === 'medium' ? 'low' : null
  if (!next) return
  lastStep = performance.now()
  g.updateSettings({ quality: next })
  g.toast({ kind: 'info', title: `Graphics quality → ${next}`, body: 'Lowered automatically to keep the frame rate up (Settings to change)' })
}

export function GameCanvas() {
  const phase = useGame((s) => s.phase)
  const quality = useGame((s) => s.settings.quality)
  const high = quality === 'high'
  const medium = quality === 'medium'
  return (
    <Canvas
      id="game-canvas"
      className="!fixed inset-0"
      dpr={high ? [1, 1.75] : medium ? [0.8, 1.25] : [0.6, 1]}
      gl={{ antialias: !high, powerPreference: 'high-performance', stencil: false }}
      camera={{ fov: 60, near: 0.1, far: 1400, position: [0, 5, 30] }}
      flat={false}
      onCreated={({ gl }) => {
        gl.domElement.addEventListener('webglcontextlost', (e) => {
          e.preventDefault()
          useGame.setState({ worldError: 'The graphics context was lost (the GPU reset or ran out of memory).' })
        })
      }}
    >
      <PerformanceMonitor flipflops={2} onDecline={stepDown} />
      <Suspense fallback={<WorldLoading />}>
        {phase === 'world' ? (
          <>
            <ResetCamera />
            <WorldRoot />
          </>
        ) : phase === 'creator' ? (
          <CreatorContent />
        ) : phase === 'profile' ? (
          <ProfileScene />
        ) : (
          <TitleScene />
        )}
      </Suspense>
      {high && (
        <EffectComposer multisampling={4}>
          <Bloom intensity={1.05} luminanceThreshold={0.85} luminanceSmoothing={0.2} mipmapBlur radius={0.7} />
          <ChromaticAberration offset={caOffset} radialModulation={false} modulationOffset={0} />
          <Vignette eskil={false} offset={0.25} darkness={0.75} />
        </EffectComposer>
      )}
      {medium && (
        <EffectComposer multisampling={0}>
          <Bloom intensity={0.9} luminanceThreshold={0.85} luminanceSmoothing={0.2} mipmapBlur radius={0.6} />
        </EffectComposer>
      )}
    </Canvas>
  )
}
