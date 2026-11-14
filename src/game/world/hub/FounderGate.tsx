import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { CuboidCollider, RigidBody, type RapierRigidBody } from '@react-three/rapier'
import { Group } from 'three'
import { useGame } from '../../../store/useGame'
import { useInteractable } from '../../systems/interaction'
import { Kiosk } from '../common/Kiosk'
import { NeonText } from '../common/NeonText'
import { neonMaterial, surfaceMaterial } from '../common/materials'
import { HUB_POS } from './layout'

/** The Founder's Gate (hub challenge access). Three locks; the Copper Key opens the first. */
export function FounderGate() {
  const opened = useGame((s) => s.progress.gateOpened)
  const openOverlay = useGame((s) => s.openOverlay)
  const discovered = useGame((s) => s.progress.secrets.includes('dev-terminal'))
  const doorL = useRef<Group>(null)
  const doorR = useRef<Group>(null)
  const doorBody = useRef<RapierRigidBody>(null)
  const [gx, , gz] = HUB_POS.gate

  useInteractable({
    id: 'founder-gate',
    position: [gx + 3, 0, gz],
    radius: 5,
    label: opened ? 'Inspect the Founder’s Gate (1/3 locks open)' : 'Inspect the Founder’s Gate',
    onInteract: () => openOverlay({ type: 'gate' }),
  })

  useFrame((_, dt) => {
    const target = opened ? 2.9 : 0
    for (const [ref, s] of [[doorL, 1], [doorR, -1]] as const) {
      const d = ref.current
      if (d) d.position.z += (target * s + 1.6 * s - d.position.z) * Math.min(1, dt * 1.5)
    }
  })
  useEffect(() => {
    doorBody.current?.setEnabled(!opened)
  }, [opened])

  const stone = surfaceMaterial('#1b1430', 0.5, 0.5)
  const door = surfaceMaterial('#241a44', 0.3, 0.8)
  const copper = neonMaterial('#ff9a4d', opened ? 3 : 1)
  const dim = neonMaterial('#5a4a80', 1)

  return (
    <group>
      <group position={[gx, 0, gz]}>
        <RigidBody type="fixed" colliders={false}>
          <CuboidCollider args={[1, 5.5, 1]} position={[0, 5.5, 4.4]} />
          <CuboidCollider args={[1, 5.5, 1]} position={[0, 5.5, -4.4]} />
          <CuboidCollider args={[1, 0.8, 5.4]} position={[0, 10.2, 0]} />
        </RigidBody>
        <RigidBody ref={doorBody} type="fixed" colliders={false}>
          <CuboidCollider args={[0.35, 4.5, 3.4]} position={[0, 4.5, 0]} />
        </RigidBody>
        {[4.4, -4.4].map((z) => (
          <group key={z} position={[0, 0, z]}>
            <mesh position={[0, 5.5, 0]} material={stone}>
              <boxGeometry args={[2, 11, 2]} />
            </mesh>
            <mesh position={[1.02, 5.5, 0]} material={neonMaterial('#ff9a4d', 2)}>
              <boxGeometry args={[0.04, 10, 0.12]} />
            </mesh>
          </group>
        ))}
        <mesh position={[0, 10.2, 0]} material={stone}>
          <boxGeometry args={[2.4, 1.6, 10.8]} />
        </mesh>
        <NeonText position={[1.25, 10.2, 0]} rotation={[0, Math.PI / 2, 0]} fontSize={0.62} color="#ff9a4d" letterSpacing={0.1}>
          THE FOUNDER’S GATE
        </NeonText>
        {/* doors */}
        {[1, -1].map((s) => (
          <group key={s} ref={s === 1 ? doorL : doorR} position={[0, 0, 1.6 * s]}>
            <mesh position={[0, 4.5, 0]} material={door}>
              <boxGeometry args={[0.6, 9, 3.2]} />
            </mesh>
            <mesh position={[0.31, 4.5, -1.55 * s]} material={neonMaterial('#9d4dff', 2)}>
              <boxGeometry args={[0.02, 9, 0.06]} />
            </mesh>
          </group>
        ))}
        {/* lock slots (on the door seam, facing the plaza) */}
        {[0, 1, 2].map((i) => (
          <group key={i} position={[0.36, 6.2 - i * 1.6, 0]} rotation={[0, Math.PI / 2, 0]} visible={!opened}>
            <mesh material={i === 0 ? copper : dim}>
              <ringGeometry args={[0.42, 0.55, 32]} />
            </mesh>
            <NeonText position={[0, 0, 0.01]} fontSize={0.36} color={i === 0 ? '#ff9a4d' : '#7a6aa0'} intensity={i === 0 ? 2.5 : 1}>
              {['I', 'II', 'III'][i]}
            </NeonText>
          </group>
        ))}
        {opened && (
          <group position={[-1.5, 0, 0]}>
            <mesh position={[0, 4.5, 0]} rotation={[0, Math.PI / 2, 0]} material={neonMaterial('#ff9a4d', 0.6)}>
              <planeGeometry args={[5.6, 8.6]} />
            </mesh>
            <NeonText position={[0.2, 5.6, 0]} rotation={[0, Math.PI / 2, 0]} fontSize={0.5} color="#ffffff" maxWidth={5} textAlign="center">
              FIRST LOCK RELEASED
            </NeonText>
            <NeonText position={[0.2, 4.6, 0]} rotation={[0, Math.PI / 2, 0]} fontSize={0.3} color="#ffe14d" maxWidth={5} textAlign="center" mono>
              The second lock awaits a signal not yet broadcast.
            </NeonText>
          </group>
        )}
        <pointLight position={[3, 5, 0]} color="#ff9a4d" intensity={opened ? 60 : 25} distance={16} />
      </group>
      {/* hidden terminal on the far side of the gate */}
      <Kiosk
        id="dev-terminal"
        position={HUB_POS.devTerminal}
        rotationY={Math.PI / 2}
        title={discovered ? 'DEV LOG' : '???'}
        subtitle="access: anyone curious"
        prompt="Read the hidden terminal"
        color="#3dff8b"
        radius={2.6}
        onInteract={() => {
          const g = useGame.getState()
          g.discoverSecret('dev-terminal')
          g.openOverlay({
            type: 'info',
            title: 'Hidden terminal · dev log 0001',
            accent: '#3dff8b',
            body: [
              '> If you are reading this, you walked around the gate instead of through it. Good instinct.',
              '> Every world in this universe hides something. Walls have back sides, broken things have reasons, and colours have an order.',
              '> The highest platform in the plaza holds an old token. Climb the floating stones.',
              '> — the Founder',
            ],
          })
        }}
      />
    </group>
  )
}
