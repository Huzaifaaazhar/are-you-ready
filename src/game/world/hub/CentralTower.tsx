import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { CylinderCollider, RigidBody } from '@react-three/rapier'
import { AdditiveBlending, Group, MeshBasicMaterial, Color } from 'three'
import { NeonText } from '../common/NeonText'
import { neonMaterial, surfaceMaterial } from '../common/materials'

const beamMat = new MeshBasicMaterial({ color: new Color('#00f0ff').multiplyScalar(1.2), transparent: true, opacity: 0.18, blending: AdditiveBlending, depthWrite: false, toneMapped: false })

/** The OASIS spire at the centre of the plaza: stepped plinth (climbable), rotating rings, sky beam. */
export function CentralTower() {
  const rings = useRef<Group>(null)
  const logo = useRef<Group>(null)
  useFrame((s, dt) => {
    if (rings.current) rings.current.children.forEach((c, i) => (c.rotation.z += dt * (0.2 + i * 0.15) * (i % 2 ? -1 : 1)))
    if (logo.current) {
      logo.current.rotation.y += dt * 0.25
      logo.current.position.y = 30 + Math.sin(s.clock.elapsedTime * 0.6) * 0.6
    }
  })
  const dark = surfaceMaterial('#120c26', 0.35, 0.7)
  return (
    <group>
      <RigidBody type="fixed" colliders={false}>
        <CylinderCollider args={[0.4, 7.5]} position={[0, 0.4, 0]} />
        <CylinderCollider args={[0.7, 5.8]} position={[0, 0.7, 0]} />
        <CylinderCollider args={[12, 3.6]} position={[0, 12, 0]} />
      </RigidBody>
      <mesh position={[0, 0.4, 0]} material={dark}>
        <cylinderGeometry args={[7.5, 7.8, 0.8, 48]} />
      </mesh>
      <mesh position={[0, 0.81, 0]} rotation={[-Math.PI / 2, 0, 0]} material={neonMaterial('#00f0ff', 2.5)}>
        <ringGeometry args={[7.2, 7.45, 64]} />
      </mesh>
      <mesh position={[0, 0.7, 0]} material={dark}>
        <cylinderGeometry args={[5.8, 6, 1.4, 48]} />
      </mesh>
      <mesh position={[0, 1.41, 0]} rotation={[-Math.PI / 2, 0, 0]} material={neonMaterial('#ff2bd6', 2.5)}>
        <ringGeometry args={[5.5, 5.75, 64]} />
      </mesh>
      {/* spire core */}
      <mesh position={[0, 13, 0]} material={surfaceMaterial('#1a1036', 0.25, 0.8)}>
        <cylinderGeometry args={[2.2, 3.6, 24, 8]} />
      </mesh>
      {Array.from({ length: 8 }, (_, i) => {
        const a = (i / 8) * Math.PI * 2 + Math.PI / 8
        return (
          <mesh key={i} position={[Math.cos(a) * 2.95, 13, Math.sin(a) * 2.95]} rotation={[0, -a, 0.06]} material={neonMaterial(i % 2 ? '#00f0ff' : '#9d4dff', 2.8)}>
            <boxGeometry args={[0.12, 23, 0.12]} />
          </mesh>
        )
      })}
      <mesh position={[0, 25.5, 0]} material={neonMaterial('#ffffff', 2)}>
        <octahedronGeometry args={[1.6, 0]} />
      </mesh>
      <group ref={rings} position={[0, 18, 0]} rotation={[Math.PI / 2, 0, 0]}>
        {[6, 8.5, 11].map((r, i) => (
          <mesh key={r} position={[0, 0, -i * 3]} material={neonMaterial(['#00f0ff', '#ff2bd6', '#9d4dff'][i], 2.4)}>
            <torusGeometry args={[r, 0.08, 6, 96, Math.PI * 1.6]} />
          </mesh>
        ))}
      </group>
      <mesh position={[0, 110, 0]} material={beamMat}>
        <cylinderGeometry args={[1.2, 2.2, 170, 16, 1, true]} />
      </mesh>
      <group ref={logo} position={[0, 30, 0]}>
        <NeonText fontSize={4.2} color="#00f0ff" intensity={3} letterSpacing={0.15}>
          OASIS
        </NeonText>
        <group rotation={[0, Math.PI, 0]}>
          <NeonText fontSize={4.2} color="#ff2bd6" intensity={3} letterSpacing={0.15}>
            OASIS
          </NeonText>
        </group>
      </group>
      <pointLight position={[0, 6, 0]} color="#7a5cff" intensity={80} distance={40} decay={2} />
    </group>
  )
}
