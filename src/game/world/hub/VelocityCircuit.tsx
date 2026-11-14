import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { CuboidCollider, RigidBody } from '@react-three/rapier'
import { Group, Mesh } from 'three'
import { useGame } from '../../../store/useGame'
import { playerState } from '../../systems/playerState'
import { sfx } from '../../systems/audio'
import { Kiosk } from '../common/Kiosk'
import { NeonText } from '../common/NeonText'
import { neonMaterial, surfaceMaterial } from '../common/materials'
import { HUB_POS, RACE_CHECKPOINTS, RACE_RADIUS } from './layout'

function Checkpoint({ index }: { index: number }) {
  const cp = RACE_CHECKPOINTS[index]
  const ref = useRef<Group>(null)
  const ring = useRef<Mesh>(null)
  const status = useGame((s) => s.race.status)
  const next = useGame((s) => s.race.next)
  const isNext = status === 'running' && next === index
  const passed = status === 'running' && index < next
  const last = index === RACE_CHECKPOINTS.length - 1
  useFrame((s) => {
    if (ring.current) {
      const k = isNext ? 1 + Math.sin(s.clock.elapsedTime * 6) * 0.06 : 1
      ring.current.scale.setScalar(k)
    }
    if (!isNext) return
    const p = playerState.position
    const dx = p.x - cp.pos[0]
    const dz = p.z - cp.pos[2]
    if (dx * dx + dz * dz < 3.4 * 3.4 && p.y < 6) useGame.getState().raceCheckpoint(index, RACE_CHECKPOINTS.length)
  })
  if (status === 'idle' || passed) return null
  const color = last ? '#ffe14d' : isNext ? '#3dff8b' : '#2a6a4a'
  return (
    <group ref={ref} position={cp.pos} rotation={[0, cp.yaw, 0]}>
      <mesh ref={ring} material={neonMaterial(color, isNext ? 3 : 1)}>
        <torusGeometry args={[2.6, 0.12, 8, 48]} />
      </mesh>
      {isNext && (
        <>
          <mesh position={[0, 10, 0]} material={neonMaterial(color, 0.8)}>
            <cylinderGeometry args={[0.08, 0.08, 16, 6]} />
          </mesh>
          <NeonText position={[0, 3.4, 0]} fontSize={0.6} color={color}>
            {last ? 'FINISH' : `${index + 1}`}
          </NeonText>
        </>
      )}
    </group>
  )
}

function CountdownWatcher() {
  const shown = useRef(-1)
  useFrame(() => {
    const r = useGame.getState().race
    if (r.status !== 'countdown') {
      shown.current = -1
      return
    }
    const left = Math.ceil((r.countdownEnd - performance.now()) / 1000)
    if (left !== shown.current && left > 0) {
      shown.current = left
      sfx('countdown')
    }
    if (performance.now() >= r.countdownEnd) {
      sfx('go')
      useGame.setState({ race: { ...r, status: 'running', startedAt: performance.now(), next: 0 } })
    }
  })
  return null
}

/** Velocity Circuit: on-foot time trial around the plaza (racing challenge access). */
export function VelocityCircuit() {
  const best = useGame((s) => s.progress.bestRace)
  const status = useGame((s) => s.race.status)
  const [ax, , az] = HUB_POS.raceArch
  const frame = surfaceMaterial('#101a2a', 0.4, 0.7)
  const start = () => {
    const g = useGame.getState()
    if (g.race.status !== 'idle') {
      g.cancelRace()
      g.toast({ kind: 'info', title: 'Race abandoned' })
      return
    }
    playerState.teleport?.([ax, 1.3, az + 5], 0)
    g.startRace()
  }
  return (
    <group>
      {/* start / finish arch, opening faces along Z */}
      <group position={[ax, 0, az]}>
        <RigidBody type="fixed" colliders={false}>
          <CuboidCollider args={[0.5, 4, 0.5]} position={[4.2, 4, 0]} />
          <CuboidCollider args={[0.5, 4, 0.5]} position={[-4.2, 4, 0]} />
        </RigidBody>
        {[4.2, -4.2].map((x) => (
          <group key={x} position={[x, 0, 0]}>
            <mesh position={[0, 4, 0]} material={frame}>
              <boxGeometry args={[1, 8, 1]} />
            </mesh>
            {Array.from({ length: 8 }, (_, i) => (
              <mesh key={i} position={[0, 0.5 + i, 0.51]} material={neonMaterial(i % 2 ? '#ffffff' : '#3dff8b', 2)}>
                <boxGeometry args={[0.9, 0.45, 0.02]} />
              </mesh>
            ))}
          </group>
        ))}
        <mesh position={[0, 8.3, 0]} material={frame}>
          <boxGeometry args={[9.4, 1, 1]} />
        </mesh>
        <NeonText position={[0, 8.3, 0.55]} fontSize={0.55} color="#3dff8b" letterSpacing={0.12}>
          VELOCITY CIRCUIT
        </NeonText>
        <NeonText position={[0, 8.3, -0.55]} rotation={[0, Math.PI, 0]} fontSize={0.55} color="#3dff8b" letterSpacing={0.12}>
          VELOCITY CIRCUIT
        </NeonText>
        {/* checkered start line */}
        {Array.from({ length: 16 }, (_, i) => (
          <mesh key={i} position={[-3.75 + (i % 8) * 1.07, 0.02, i < 8 ? -0.27 : 0.27]} rotation={[-Math.PI / 2, 0, 0]} material={neonMaterial((i + Math.floor(i / 8)) % 2 ? '#ffffff' : '#0a0a0a', (i + Math.floor(i / 8)) % 2 ? 1.6 : 1)}>
            <planeGeometry args={[1.05, 0.52]} />
          </mesh>
        ))}
      </group>
      {/* faint course guide on the floor */}
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} material={neonMaterial('#3dff8b', 0.5)}>
        <ringGeometry args={[RACE_RADIUS - 0.08, RACE_RADIUS + 0.08, 128]} />
      </mesh>
      <Kiosk
        id="race-kiosk"
        position={HUB_POS.raceKiosk}
        rotationY={-Math.PI / 2}
        title="VELOCITY CIRCUIT"
        subtitle={best ? `best ${best.toFixed(2)}s · target <45s` : 'on-foot time trial · 8 rings'}
        prompt={status === 'idle' ? 'Start the Velocity Circuit time trial' : 'Abandon the race'}
        color="#3dff8b"
        onInteract={start}
      />
      {RACE_CHECKPOINTS.map((_, i) => (
        <Checkpoint key={i} index={i} />
      ))}
      <CountdownWatcher />
    </group>
  )
}
