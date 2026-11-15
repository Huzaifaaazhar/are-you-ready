import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Group, PerspectiveCamera } from 'three'
import { useGame } from '../../store/useGame'
import { AvatarModel } from '../avatar/AvatarModel'
import { GridFloor } from '../world/common/GridFloor'
import { Particles } from '../world/common/Particles'
import { SkyDome } from '../world/common/SkyDome'
import { MonumentModel } from '../world/common/Monument'
import { NeonText } from '../world/common/NeonText'
import { neonMaterial, surfaceMaterial } from '../world/common/materials'
import { ACHIEVEMENTS } from '../../data/content'

/** 3D backdrop of the player profile: avatar on a pedestal, earned trophies in orbit, trinkets on a shelf. */
export function ProfileScene() {
  const avatar = useGame((s) => s.avatar)
  const p = useGame((s) => s.progress)
  const orbit = useRef<Group>(null)
  const turn = useRef<Group>(null)
  const camera = useThree((s) => s.camera) as PerspectiveCamera
  const size = useThree((s) => s.size)
  useFrame((s, dt) => {
    if (orbit.current) orbit.current.rotation.y += dt * 0.25
    if (turn.current) turn.current.rotation.y += dt * 0.3
    const portrait = size.width < size.height
    camera.position.set(0, 2.2, portrait ? 9.5 : 7)
    camera.lookAt(0, portrait ? 1.2 : 1.4, 0)
    if (camera.fov !== 45) {
      camera.fov = 45
      camera.updateProjectionMatrix()
    }
    void s
  })
  const earned = ACHIEVEMENTS.filter((a) => p.achievements.includes(a.id))
  return (
    <>
      <color attach="background" args={['#05010f']} />
      <fog attach="fog" args={['#0a0420', 12, 50]} />
      <SkyDome top="#03000a" horizon="#2a0a55" bottom="#05010f" />
      <GridFloor size={120} fade={35} cell={1} />
      <Particles count={200} area={[16, 8, 16]} center={[0, 0, -2]} size={3} />
      <ambientLight intensity={0.6} color="#8a7dff" />
      <directionalLight position={[3, 5, 4]} intensity={2} />
      <pointLight position={[-3, 3, 2]} color="#ff2bd6" intensity={14} distance={10} />
      <pointLight position={[3, 3, 2]} color="#00f0ff" intensity={14} distance={10} />
      <mesh position={[0, 0.1, 0]} material={surfaceMaterial('#140e2c', 0.3, 0.8)}>
        <cylinderGeometry args={[1.3, 1.45, 0.2, 48]} />
      </mesh>
      <mesh position={[0, 0.21, 0]} rotation={[-Math.PI / 2, 0, 0]} material={neonMaterial(avatar?.accent ?? '#00f0ff', 2.4)}>
        <ringGeometry args={[1.15, 1.25, 64]} />
      </mesh>
      <group ref={turn} position={[0, 0.2, 0]}>
        {avatar && <AvatarModel config={avatar} showcase />}
      </group>
      <group ref={orbit} position={[0, 1.6, 0]}>
        {earned.map((a, i) => {
          const ang = (i / Math.max(1, earned.length)) * Math.PI * 2
          return (
            <group key={a.id} position={[Math.cos(ang) * 2.4, Math.sin(i * 1.7) * 0.6, Math.sin(ang) * 2.4]}>
              <mesh material={neonMaterial('#ffe14d', 1.8)}>
                <octahedronGeometry args={[0.12, 0]} />
              </mesh>
            </group>
          )
        })}
      </group>
      {/* trinket shelf */}
      <group position={[0, 0, -3.2]}>
        <mesh position={[0, 1, 0]} material={surfaceMaterial('#1a1236', 0.4, 0.6)}>
          <boxGeometry args={[5, 0.12, 0.8]} />
        </mesh>
        {p.items.includes('snow-globe') && (
          <group position={[-1.5, 1.35, 0]}>
            <mesh material={neonMaterial('#9fe8ff', 0.5)}>
              <sphereGeometry args={[0.28, 16, 12]} />
            </mesh>
          </group>
        )}
        {p.items.includes('pixel-pet') && (
          <mesh position={[-0.6, 1.3, 0]} material={neonMaterial('#3dff8b', 1.6)}>
            <boxGeometry args={[0.3, 0.3, 0.3]} />
          </mesh>
        )}
        {p.items.includes('founder-egg') && (
          <mesh position={[0.4, 1.4, 0]} scale={[0.8, 1.05, 0.8]} material={neonMaterial('#ffe14d', 2)}>
            <sphereGeometry args={[0.3, 16, 12]} />
          </mesh>
        )}
        {p.monument && (
          <group position={[1.6, 1.06, 0]} scale={0.12}>
            <MonumentModel monument={p.monument} />
          </group>
        )}
        <NeonText position={[0, 0.7, 0.45]} fontSize={0.14} color="#ffffff" mono>
          TROPHY SHELF
        </NeonText>
      </group>
    </>
  )
}
