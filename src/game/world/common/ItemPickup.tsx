import { useRef, type ReactNode } from 'react'
import { useFrame } from '@react-three/fiber'
import { Group } from 'three'
import type { Vec3 } from '../../../data/content'
import { useGame } from '../../../store/useGame'
import { playerState } from '../../systems/playerState'
import { neonMaterial } from './materials'

interface Props {
  item: string
  position: Vec3
  secret?: string
  color?: string
  children: ReactNode
}

/** A floating unique item. Touch it to add it to the inventory (and optionally reveal a secret). */
export function ItemPickup({ item, position, secret, color = '#ffe14d', children }: Props) {
  const owned = useGame((s) => s.progress.items.includes(item))
  const ref = useRef<Group>(null)
  const taken = useRef(false)
  useFrame((s) => {
    const g = ref.current
    if (!g || owned || taken.current) return
    const t = s.clock.elapsedTime
    g.rotation.y = t * 1.5
    g.position.y = position[1] + 1.1 + Math.sin(t * 2) * 0.15
    const p = playerState.position
    const dx = p.x - position[0]
    const dz = p.z - position[2]
    if (dx * dx + dz * dz < 1.6 && Math.abs(p.y - (position[1] + 0.9)) < 1.6) {
      taken.current = true
      const st = useGame.getState()
      st.grantItem(item)
      if (secret) st.discoverSecret(secret)
    }
  })
  if (owned) return null
  return (
    <group position={[position[0], 0, position[2]]}>
      <group ref={ref} position={[0, position[1] + 1.1, 0]}>
        {children}
      </group>
      <mesh position={[0, position[1] + 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]} material={neonMaterial(color, 2)}>
        <ringGeometry args={[0.55, 0.7, 32]} />
      </mesh>
      <pointLight position={[0, position[1] + 1.2, 0]} color={color} intensity={8} distance={6} />
    </group>
  )
}
