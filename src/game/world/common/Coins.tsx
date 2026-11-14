import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { CylinderGeometry, Group, TorusGeometry } from 'three'
import type { CoinDef } from '../../../data/content'
import { useGame } from '../../../store/useGame'
import { playerState } from '../../systems/playerState'
import { neonMaterial } from './materials'

const coinGeo = new CylinderGeometry(0.32, 0.32, 0.07, 24)
coinGeo.rotateX(Math.PI / 2)
const rimGeo = new TorusGeometry(0.32, 0.035, 6, 24)
const faceMat = neonMaterial('#ffd23f', 1.6)
const rimMat = neonMaterial('#fff1a8', 3)

function Coin({ def }: { def: CoinDef }) {
  const ref = useRef<Group>(null)
  const collect = useGame((s) => s.collectCoin)
  const done = useRef(false)
  useFrame((s) => {
    const g = ref.current
    if (!g || done.current) return
    const t = s.clock.elapsedTime
    g.rotation.y = t * 2.4
    g.position.y = def.pos[1] + Math.sin(t * 2 + def.pos[0]) * 0.12
    const p = playerState.position
    const dx = p.x - def.pos[0]
    const dz = p.z - def.pos[2]
    const dy = p.y + 0.1 - def.pos[1]
    if (dx * dx + dz * dz < 1.3 && Math.abs(dy) < 1.4) {
      done.current = true
      collect(def.id)
    }
  })
  return (
    <group ref={ref} position={def.pos}>
      <mesh geometry={coinGeo} material={faceMat} />
      <mesh geometry={rimGeo} material={rimMat} />
    </group>
  )
}

/** Renders every not-yet-collected coin of a world. */
export function Coins({ coins }: { coins: CoinDef[] }) {
  const collected = useGame((s) => s.progress.collected)
  const secrets = useGame((s) => s.progress.secrets)
  return (
    <>
      {coins
        .filter((c) => !collected.includes(c.id) && (!c.requiresSecret || secrets.includes(c.requiresSecret)))
        .map((c) => (
          <Coin key={c.id} def={c} />
        ))}
    </>
  )
}
