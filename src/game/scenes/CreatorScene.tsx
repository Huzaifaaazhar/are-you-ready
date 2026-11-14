import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Group, PerspectiveCamera } from 'three'
import type { AvatarConfig } from '../../data/avatar'
import { AvatarModel } from '../avatar/AvatarModel'
import { GridFloor } from '../world/common/GridFloor'
import { Particles } from '../world/common/Particles'
import { SkyDome } from '../world/common/SkyDome'
import { neonMaterial, surfaceMaterial } from '../world/common/materials'

/** Shared with the creator UI so dragging the preview rotates the avatar. */
export const creatorView = { rotY: 0.4, velocity: 0, dragging: false, zoom: 1 }

export function CreatorScene({ draft }: { draft: AvatarConfig }) {
  const avatar = useRef<Group>(null)
  const ring = useRef<Group>(null)
  const camera = useThree((s) => s.camera) as PerspectiveCamera
  const size = useThree((s) => s.size)
  useFrame((s, dt) => {
    if (!creatorView.dragging) creatorView.rotY += dt * 0.35 + creatorView.velocity
    creatorView.velocity *= 0.92
    if (avatar.current) avatar.current.rotation.y = creatorView.rotY
    if (ring.current) ring.current.rotation.z += dt * 0.5
    const portrait = size.width < size.height * 0.9
    const z = (portrait ? 6.2 : 4.6) / creatorView.zoom
    // Offset the avatar so it sits beside the UI panel on wide screens and above it on portrait.
    const offX = portrait ? 0 : 1.05
    const lookY = portrait ? 0.35 : 1.0
    camera.position.set(offX, 1.3 + Math.sin(s.clock.elapsedTime * 0.5) * 0.03, z)
    camera.lookAt(offX, lookY, 0)
    if (camera.fov !== 45) {
      camera.fov = 45
      camera.updateProjectionMatrix()
    }
  })
  return (
    <>
      <color attach="background" args={['#05010f']} />
      <fog attach="fog" args={['#0a0420', 12, 60]} />
      <SkyDome top="#03000a" horizon="#2a0a55" bottom="#05010f" stars />
      <GridFloor size={120} fade={40} cell={1} />
      <Particles count={250} area={[20, 8, 20]} center={[0, 0, -4]} size={3} />
      <ambientLight intensity={0.6} color="#8a7dff" />
      <directionalLight position={[3, 5, 4]} intensity={2.2} color="#ffffff" />
      <pointLight position={[-2.5, 2.5, 1]} color="#ff2bd6" intensity={14} distance={8} />
      <pointLight position={[2.5, 2, -1]} color="#00f0ff" intensity={14} distance={8} />
      <mesh position={[0, 0.06, 0]} material={surfaceMaterial('#140e2c', 0.3, 0.8)}>
        <cylinderGeometry args={[1.1, 1.25, 0.12, 48]} />
      </mesh>
      <group ref={ring} position={[0, 0.13, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <mesh material={neonMaterial('#00f0ff', 2.6)}>
          <ringGeometry args={[1.0, 1.06, 64, 1, 0, Math.PI * 1.5]} />
        </mesh>
        <mesh material={neonMaterial('#ff2bd6', 2.6)}>
          <ringGeometry args={[1.14, 1.18, 64, 1, Math.PI, Math.PI * 0.8]} />
        </mesh>
      </group>
      <group ref={avatar} position={[0, 0.12, 0]}>
        <AvatarModel config={draft} showcase />
      </group>
    </>
  )
}
