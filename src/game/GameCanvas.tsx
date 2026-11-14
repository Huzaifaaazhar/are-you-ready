import { lazy, Suspense, useEffect } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { Bloom, EffectComposer, Vignette, ChromaticAberration } from '@react-three/postprocessing'
import { Vector2, type PerspectiveCamera } from 'three'
import { useGame } from '../store/useGame'
import { useCreator } from '../store/useCreator'
import { TitleScene } from './scenes/TitleScene'
import { CreatorScene } from './scenes/CreatorScene'
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

export function GameCanvas() {
  const phase = useGame((s) => s.phase)
  const quality = useGame((s) => s.settings.quality)
  const high = quality === 'high'
  return (
    <Canvas
      id="game-canvas"
      className="!fixed inset-0"
      dpr={high ? [1, 1.75] : [0.6, 1]}
      gl={{ antialias: !high, powerPreference: 'high-performance', stencil: false }}
      camera={{ fov: 60, near: 0.1, far: 1400, position: [0, 5, 30] }}
      flat={false}
    >
      <Suspense fallback={<WorldLoading />}>
        {phase === 'world' ? (
          <>
            <ResetCamera />
            <WorldRoot />
          </>
        ) : phase === 'creator' ? (
          <CreatorContent />
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
    </Canvas>
  )
}
