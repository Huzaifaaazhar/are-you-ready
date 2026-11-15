import { Suspense, useEffect } from 'react'
import { WorldLoading } from './WorldLoading'
import { Physics } from '@react-three/rapier'
import { useGame } from '../../store/useGame'
import { Player } from '../player/Player'
import { WORLDS } from './registry'
import { playMusic } from '../systems/audio'

/**
 * Loads exactly one world at a time (code-split via React.lazy) inside its own physics world,
 * and spawns the player at the requested spawn point.
 */
export function WorldRoot() {
  const worldId = useGame((s) => s.worldId)
  const spawnId = useGame((s) => s.spawnId)
  const epoch = useGame((s) => s.worldEpoch)
  const paused = useGame((s) => s.overlay !== null)
  const def = WORLDS[worldId]
  const spawn = def.layout.spawns[spawnId] ?? def.layout.spawns.default
  const World = def.Component
  const v = def.visuals

  useEffect(() => {
    playMusic(v.music)
  }, [v.music])

  return (
    <>
      <color attach="background" args={[v.background]} />
      <fog attach="fog" args={[v.fog, v.fogNear, v.fogFar]} />
      <ambientLight color={v.ambient} intensity={v.ambientIntensity} />
      <hemisphereLight args={['#8a7dff', '#1a0630', 0.6]} />
      <directionalLight position={[20, 40, 15]} intensity={1.1} color="#d8d0ff" />
      <Suspense fallback={<WorldLoading />}>
        <Physics key={`${worldId}-${epoch}`} gravity={[0, v.gravity ?? -22, 0]} paused={paused} timeStep={1 / 60}>
          <World />
          {def.onFoot && <Player spawn={spawn} />}
        </Physics>
      </Suspense>
    </>
  )
}
