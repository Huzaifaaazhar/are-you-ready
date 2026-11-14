import { RigidBody } from '@react-three/rapier'
import type { Material } from 'three'
import type { Vec3 } from '../../../data/content'
import { surfaceMaterial } from './materials'

interface Props {
  position: Vec3
  size: Vec3
  rotation?: Vec3
  color?: string
  material?: Material
  edge?: Material
  visible?: boolean
}

/** A static box with a matching physics collider and optional glowing top edge. */
export function Block({ position, size, rotation, color = '#141026', material, edge, visible = true }: Props) {
  return (
    <RigidBody type="fixed" colliders="cuboid" position={position} rotation={rotation} friction={0.2}>
      <mesh material={material ?? surfaceMaterial(color)} visible={visible}>
        <boxGeometry args={size} />
      </mesh>
      {edge && visible && (
        <>
          <mesh position={[0, size[1] / 2 + 0.005, size[2] / 2 - 0.03]} material={edge}>
            <boxGeometry args={[size[0], 0.04, 0.06]} />
          </mesh>
          <mesh position={[0, size[1] / 2 + 0.005, -size[2] / 2 + 0.03]} material={edge}>
            <boxGeometry args={[size[0], 0.04, 0.06]} />
          </mesh>
          <mesh position={[size[0] / 2 - 0.03, size[1] / 2 + 0.005, 0]} material={edge}>
            <boxGeometry args={[0.06, 0.04, size[2]]} />
          </mesh>
          <mesh position={[-size[0] / 2 + 0.03, size[1] / 2 + 0.005, 0]} material={edge}>
            <boxGeometry args={[0.06, 0.04, size[2]]} />
          </mesh>
        </>
      )}
    </RigidBody>
  )
}
