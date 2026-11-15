import { useEffect, useMemo, useRef, type ReactNode } from 'react'
import { useFrame } from '@react-three/fiber'
import { CuboidCollider, RigidBody, useBeforePhysicsStep, type RapierRigidBody } from '@react-three/rapier'
import { Group, Mesh } from 'three'
import type { RelicDef, Vec3, WorldId } from '../../../data/content'
import { useGame } from '../../../store/useGame'
import { launchTo, playerState } from '../../systems/playerState'
import { sfx } from '../../systems/audio'
import { NeonText } from './NeonText'
import { Portal } from './Portal'
import { neonMaterial, surfaceMaterial } from './materials'

/** Send the player back to the last checkpoint (or spawn) after a hazard. */
export function hazardHit(reason: string, spawn: Vec3) {
  const cp = playerState.checkpoint
  sfx('hurt')
  useGame.getState().toast({ kind: 'error', title: reason, body: cp ? 'Back to the last beacon' : 'Back to the start' })
  playerState.teleport?.(cp ? cp.pos : spawn, cp?.yaw)
}

/** Jump pad: step on it to be launched in an arc onto `target`. */
export function JumpPad({ position, target, apex = 3, color = '#3dff8b', label }: { position: Vec3; target: Vec3; apex?: number; color?: string; label?: string }) {
  const ring = useRef<Mesh>(null)
  const cool = useRef(0)
  useFrame((s, dt) => {
    if (ring.current) ring.current.scale.setScalar(1 + Math.sin(s.clock.elapsedTime * 6) * 0.08)
    cool.current = Math.max(0, cool.current - dt)
    const p = playerState.position
    if (cool.current <= 0 && Math.abs(p.x - position[0]) < 1.1 && Math.abs(p.z - position[2]) < 1.1 && p.y - 0.85 < position[1] + 0.4 && p.y - 0.85 > position[1] - 0.5) {
      cool.current = 1
      sfx('jump')
      launchTo(target, apex)
    }
  })
  return (
    <group position={position}>
      <mesh position={[0, 0.06, 0]} material={surfaceMaterial('#101820', 0.4, 0.6)}>
        <cylinderGeometry args={[1, 1.1, 0.12, 24]} />
      </mesh>
      <mesh ref={ring} position={[0, 0.13, 0]} rotation={[-Math.PI / 2, 0, 0]} material={neonMaterial(color, 2.8)}>
        <ringGeometry args={[0.6, 0.85, 24]} />
      </mesh>
      <mesh position={[0, 0.14, 0]} rotation={[-Math.PI / 2, 0, 0]} material={neonMaterial(color, 1.2)}>
        <circleGeometry args={[0.5, 24]} />
      </mesh>
      {label && (
        <NeonText position={[0, 1.4, 0]} fontSize={0.22} color={color} mono>
          {label}
        </NeonText>
      )}
    </group>
  )
}

/** A platform that travels between two heights on a loop (rides you up and down). */
export function Lift({ position, size = [3, 0.4, 3], height, period = 7, color = '#00f0ff' }: { position: Vec3; size?: Vec3; height: number; period?: number; color?: string }) {
  const ref = useRef<RapierRigidBody>(null)
  // Advanced per physics step (not per render frame) so the platform moves smoothly even at low frame
  // rates: a per-frame jump of a metre would tunnel through the rider instead of carrying them.
  const clock = useRef(performance.now() / 1000)
  useBeforePhysicsStep((w) => {
    clock.current += w.timestep
    const t = clock.current
    const c = (t % period) / period
    // wait at bottom, rise, wait at top, descend
    const k = c < 0.2 ? 0 : c < 0.5 ? (c - 0.2) / 0.3 : c < 0.7 ? 1 : 1 - (c - 0.7) / 0.3
    const ease = k * k * (3 - 2 * k)
    ref.current?.setNextKinematicTranslation({ x: position[0], y: position[1] + ease * height, z: position[2] })
    // Debug/test handle: 0 = resting at the bottom, 1 = at the top.
    const dbg = window as unknown as { __lifts?: Record<string, number> }
    ;(dbg.__lifts ??= {})[`${position[0]},${position[2]}`] = c < 0.2 ? 0 : ease
  })
  return (
    <RigidBody ref={ref} type="kinematicPosition" colliders={false} position={position}>
      <CuboidCollider args={[size[0] / 2, size[1] / 2, size[2] / 2]} friction={1.5} />
      <mesh material={surfaceMaterial('#121a2a', 0.4, 0.7)}>
        <boxGeometry args={size} />
      </mesh>
      <mesh position={[0, size[1] / 2 + 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]} material={neonMaterial(color, 2)}>
        <ringGeometry args={[Math.min(size[0], size[2]) * 0.3, Math.min(size[0], size[2]) * 0.38, 4, 1, Math.PI / 4]} />
      </mesh>
    </RigidBody>
  )
}

/** World collectible relics (sigils, runes, shards). */
export function Relics({ relics, color, shape }: { relics: RelicDef[]; color: string; shape: 'sigil' | 'rune' | 'shard' }) {
  const owned = useGame((s) => s.progress.relics)
  return (
    <>
      {relics.filter((r) => !owned.includes(r.id)).map((r) => (
        <Relic key={r.id} def={r} color={color} shape={shape} />
      ))}
    </>
  )
}

function Relic({ def, color, shape }: { def: RelicDef; color: string; shape: 'sigil' | 'rune' | 'shard' }) {
  const ref = useRef<Group>(null)
  const done = useRef(false)
  const mat = useMemo(() => neonMaterial(color, 2.6), [color])
  useFrame((s) => {
    const g = ref.current
    if (!g || done.current) return
    g.rotation.y = s.clock.elapsedTime * 1.8
    g.position.y = def.pos[1] + Math.sin(s.clock.elapsedTime * 2.2 + def.pos[0]) * 0.15
    const p = playerState.position
    if (Math.hypot(p.x - def.pos[0], p.z - def.pos[2]) < 1.2 && Math.abs(p.y + 0.1 - def.pos[1]) < 1.5) {
      done.current = true
      useGame.getState().collectRelic(def.id)
    }
  })
  return (
    <group ref={ref} position={def.pos}>
      {shape === 'sigil' && (
        <mesh material={mat}>
          <torusKnotGeometry args={[0.22, 0.05, 48, 6, 2, 3]} />
        </mesh>
      )}
      {shape === 'rune' && (
        <mesh material={mat} scale={[0.7, 1, 0.3]}>
          <dodecahedronGeometry args={[0.35, 0]} />
        </mesh>
      )}
      {shape === 'shard' && (
        <mesh material={mat} scale={[0.4, 1, 0.4]}>
          <octahedronGeometry args={[0.45, 0]} />
        </mesh>
      )}
      <pointLight color={color} intensity={6} distance={4} />
    </group>
  )
}

/** Checkpoint beacon: touching it sets the respawn point for hazards and falls. */
export function Beacon({ position, yaw = 0, color = '#3dff8b' }: { position: Vec3; yaw?: number; color?: string }) {
  const active = useRef(false)
  const top = useRef<Mesh>(null)
  useEffect(() => {
    active.current = false
  }, [])
  useFrame((s) => {
    const p = playerState.position
    const isCur = playerState.checkpoint?.pos[0] === position[0] && playerState.checkpoint?.pos[2] === position[2]
    if (top.current) {
      top.current.rotation.y = s.clock.elapsedTime * 2
      top.current.scale.setScalar(isCur ? 1.3 : 0.9)
    }
    if (Math.hypot(p.x - position[0], p.z - position[2]) < 1.8 && Math.abs(p.y - 0.85 - position[1]) < 2 && !isCur) {
      playerState.checkpoint = { pos: [position[0], position[1] + 1.2, position[2]], yaw }
      sfx('checkpoint')
      useGame.getState().toast({ kind: 'info', title: 'Beacon linked', body: 'You will respawn here' })
    }
  })
  return (
    <group position={position}>
      <mesh position={[0, 1, 0]} material={surfaceMaterial('#101814', 0.4, 0.6)}>
        <cylinderGeometry args={[0.12, 0.2, 2, 8]} />
      </mesh>
      <mesh ref={top} position={[0, 2.2, 0]} material={neonMaterial(color, 2.6)}>
        <octahedronGeometry args={[0.3, 0]} />
      </mesh>
      <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]} material={neonMaterial(color, 1.4)}>
        <ringGeometry args={[1.3, 1.45, 24]} />
      </mesh>
    </group>
  )
}

/** Rectangular hazard area (e.g. corruption pool). */
export function HazardZone({ min, max, spawn, reason, children }: { min: Vec3; max: Vec3; spawn: Vec3; reason: string; children?: ReactNode }) {
  const cool = useRef(0)
  useFrame((_, dt) => {
    cool.current = Math.max(0, cool.current - dt)
    const p = playerState.position
    const feet = p.y - 0.85
    if (cool.current <= 0 && p.x > min[0] && p.x < max[0] && p.z > min[2] && p.z < max[2] && feet > min[1] && feet < max[1] && !playerState.phasing) {
      cool.current = 1.2
      hazardHit(reason, spawn)
    }
  })
  return <>{children}</>
}

/** Portal home to OASIS Prime. */
export function HomePortal({ position, rotationY = Math.PI, spawnId }: { position: Vec3; rotationY?: number; spawnId: string }) {
  return <Portal id="portal-home" position={position} rotationY={rotationY} label="OASIS PRIME" sublabel="return to the central hub" color="#00f0ff" color2="#9d4dff" target="hub" spawnId={spawnId} radius={2.3} />
}

export type { WorldId }
