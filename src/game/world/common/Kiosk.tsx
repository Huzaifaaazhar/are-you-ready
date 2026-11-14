import { useRef, type ReactNode } from 'react'
import { useFrame } from '@react-three/fiber'
import { Group } from 'three'
import type { Vec3 } from '../../../data/content'
import { useInteractable } from '../../systems/interaction'
import { NeonText } from './NeonText'
import { neonMaterial, surfaceMaterial } from './materials'
import { RigidBody, CuboidCollider } from '@react-three/rapier'

interface Props {
  id: string
  position: Vec3
  rotationY?: number
  title: string
  subtitle?: string
  prompt: string
  color?: string
  radius?: number
  onInteract: () => void
  children?: ReactNode
}

/** Holographic terminal: pedestal + floating screen + label. Press E nearby to use. */
export function Kiosk({ id, position, rotationY = 0, title, subtitle, prompt, color = '#00f0ff', radius = 3, onInteract, children }: Props) {
  const screen = useRef<Group>(null)
  useInteractable({ id, position: [position[0], position[1] + 1, position[2]], radius, label: prompt, onInteract })
  useFrame((s) => {
    if (screen.current) screen.current.position.y = 2.1 + Math.sin(s.clock.elapsedTime * 1.6 + position[0]) * 0.06
  })
  const glowMat = neonMaterial(color, 2.6)
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[0.45, 0.6, 0.35]} position={[0, 0.6, 0]} />
      </RigidBody>
      <mesh position={[0, 0.55, 0]} material={surfaceMaterial('#171230', 0.4, 0.6)}>
        <boxGeometry args={[0.8, 1.1, 0.6]} />
      </mesh>
      <mesh position={[0, 1.12, 0.05]} rotation={[-0.5, 0, 0]} material={glowMat}>
        <boxGeometry args={[0.7, 0.04, 0.45]} />
      </mesh>
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} material={glowMat}>
        <ringGeometry args={[0.85, 0.95, 32]} />
      </mesh>
      <group ref={screen} position={[0, 2.1, 0]}>
        <mesh material={neonMaterial(color, 0.35)}>
          <planeGeometry args={[1.9, 0.9]} />
        </mesh>
        <mesh position={[0, 0.46, 0.001]} material={glowMat}>
          <planeGeometry args={[1.9, 0.03]} />
        </mesh>
        <mesh position={[0, -0.46, 0.001]} material={glowMat}>
          <planeGeometry args={[1.9, 0.03]} />
        </mesh>
        <NeonText position={[0, subtitle ? 0.1 : 0, 0.01]} fontSize={0.2} maxWidth={1.8} textAlign="center" color={color} intensity={3}>
          {title}
        </NeonText>
        {subtitle && (
          <NeonText position={[0, -0.2, 0.01]} fontSize={0.12} maxWidth={1.8} textAlign="center" color="#ffffff" intensity={1.4} mono>
            {subtitle}
          </NeonText>
        )}
      </group>
      {children}
    </group>
  )
}
