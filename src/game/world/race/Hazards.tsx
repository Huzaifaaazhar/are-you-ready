import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { BallCollider, CuboidCollider, RigidBody, useRapier, type RapierRigidBody } from '@react-three/rapier'
import { Euler, Quaternion, type Mesh } from 'three'
import type { Vec3 } from '../../../data/content'
import { carState, useRace } from '../../../store/useRace'
import { playerState } from '../../systems/playerState'
import { sfx } from '../../systems/audio'
import { useGame } from '../../../store/useGame'
import { neonMaterial, surfaceMaterial } from '../common/materials'

const q = new Quaternion()
const e = new Euler()

/** Race clock that only runs while racing (hazards replay identically on each attempt). */
function raceTime() {
  const r = useRace.getState()
  if (r.status === 'racing' || r.status === 'finished') return (performance.now() - r.startTime) / 1000
  return 0
}

function TrafficCar({ lane, z0, speed, weave, color, minZ, maxZ }: { lane: number; z0: number; speed: number; weave?: boolean; color: string; minZ: number; maxZ: number }) {
  const ref = useRef<RapierRigidBody>(null)
  // Dynamic, heavy cars steered back into their lane every frame: collisions push both ways.
  useFrame(() => {
    const b = ref.current
    if (!b) return
    const t = performance.now() / 1000
    const p = b.translation()
    const wantX = lane + (weave ? Math.sin(t * 0.7 + z0) * 2.25 : 0)
    if (p.z > maxZ || p.z < minZ || p.y < -5) {
      const z = speed > 0 ? minZ + 2 : maxZ - 2
      // never respawn on top of the player
      if (Math.abs(playerState.position.z - z) > 15) {
        b.setTranslation({ x: lane, y: 0.9, z }, true)
        b.setLinvel({ x: 0, y: 0, z: speed }, true)
        b.setRotation({ x: 0, y: speed < 0 ? 1 : 0, z: 0, w: speed < 0 ? 0 : 1 }, true)
      }
      return
    }
    const v = b.linvel()
    b.setLinvel({ x: v.x + ((wantX - p.x) * 2 - v.x) * 0.15, y: v.y, z: v.z + (speed - v.z) * 0.08 }, true)
    b.setAngvel({ x: 0, y: 0, z: 0 }, true)
  })
  return (
    <RigidBody ref={ref} colliders={false} position={[lane, 0.9, z0]} rotation={[0, speed < 0 ? Math.PI : 0, 0]} enabledRotations={[false, false, false]} linearDamping={0.2} canSleep={false}>
      <CuboidCollider args={[0.95, 0.6, 2.1]} mass={2600} friction={0.2} />
      <mesh material={surfaceMaterial('#22203a', 0.4, 0.6)}>
        <boxGeometry args={[1.9, 1.2, 4.2]} />
      </mesh>
      <mesh position={[0, 0.75, -0.3]} material={neonMaterial(color, 0.6)}>
        <boxGeometry args={[1.6, 0.4, 2]} />
      </mesh>
      {[-0.6, 0.6].map((x) => (
        <mesh key={x} position={[x, 0, -2.11]} material={neonMaterial('#ff2040', 3)}>
          <boxGeometry args={[0.4, 0.15, 0.03]} />
        </mesh>
      ))}
      {[-0.6, 0.6].map((x) => (
        <mesh key={`f${x}`} position={[x, 0, 2.11]} material={neonMaterial('#ffffff', 2.5)}>
          <boxGeometry args={[0.4, 0.15, 0.03]} />
        </mesh>
      ))}
    </RigidBody>
  )
}

/** Same-direction and oncoming traffic on the highway. */
export function Traffic() {
  const cars = useMemo(
    () => [
      { lane: -6.75, z0: 60, speed: 15, color: '#00f0ff' },
      { lane: -6.75, z0: 170, speed: 15, color: '#9d4dff' },
      { lane: -2.25, z0: 110, speed: 18, weave: true, color: '#ff9a4d' },
      { lane: -2.25, z0: 220, speed: 18, color: '#3dff8b' },
      { lane: 2.25, z0: 140, speed: 13, weave: true, color: '#ffe14d' },
      { lane: 6.75, z0: 90, speed: -14, color: '#ff2bd6' },
      { lane: 6.75, z0: 200, speed: -14, color: '#ff2bd6' },
    ],
    [],
  )
  return (
    <>
      {cars.map((c, i) => (
        <TrafficCar key={i} {...c} minZ={40} maxZ={258} />
      ))}
    </>
  )
}

/** Barrier that slides across the road. */
export function SlidingBarrier({ z, amplitude = 4.5, period = 3.2, width = 4, phase = 0 }: { z: number; amplitude?: number; period?: number; width?: number; phase?: number }) {
  const ref = useRef<RapierRigidBody>(null)
  useFrame(() => {
    const t = performance.now() / 1000
    ref.current?.setNextKinematicTranslation({ x: Math.sin((t / period) * Math.PI * 2 + phase) * amplitude, y: 1, z })
  })
  return (
    <RigidBody ref={ref} type="kinematicPosition" colliders={false} position={[0, 1, z]}>
      <CuboidCollider args={[width / 2, 1, 0.6]} />
      <mesh material={surfaceMaterial('#2a0f1a', 0.4, 0.6)}>
        <boxGeometry args={[width, 2, 1.2]} />
      </mesh>
      {[-1, 0, 1].map((k) => (
        <mesh key={k} position={[k * (width / 3), 0, 0.61]} rotation={[0, 0, 0.7]} material={neonMaterial(k === 0 ? '#ffe14d' : '#ff4d4d', 2.6)}>
          <boxGeometry args={[0.4, 2.2, 0.02]} />
        </mesh>
      ))}
    </RigidBody>
  )
}

/** Ceiling crusher in the tunnel. Lowered crushers wreck the car (respawn at the last checkpoint). */
export function Piston({ pos, width, period = 2.6, phase = 0 }: { pos: Vec3; width: number; period?: number; phase?: number }) {
  const ref = useRef<RapierRigidBody>(null)
  const heightAt = (t: number) => {
    const c = (((t / period + phase) % 1) + 1) % 1
    // up (6) → slam down (1.1) → hold → rise
    if (c < 0.45) return 6
    if (c < 0.52) return 6 - ((c - 0.45) / 0.07) * 4.9
    if (c < 0.72) return 1.1
    return 1.1 + ((c - 0.72) / 0.28) * 4.9
  }
  useFrame(() => {
    const t = performance.now() / 1000
    const y = heightAt(t)
    ref.current?.setNextKinematicTranslation({ x: pos[0], y: pos[1] + y, z: pos[2] })
    const p = playerState.position
    if (y < 3.3 && Math.abs(p.x - pos[0]) < width / 2 && Math.abs(p.z - pos[2]) < 2.2 && Math.abs(p.y - pos[1]) < 3 && useRace.getState().status === 'racing') {
      if (!carState.respawnRequest) {
        carState.respawnRequest = true
        sfx('hurt')
        useGame.getState().toast({ kind: 'error', title: 'Crushed!', body: 'Time the crushers — they rise again' })
      }
    }
  })
  return (
    <RigidBody ref={ref} type="kinematicPosition" colliders={false} position={[pos[0], pos[1] + 6, pos[2]]}>
      <CuboidCollider args={[width / 2, 1, 1.5]} />
      <mesh material={surfaceMaterial('#30283a', 0.3, 0.9)}>
        <boxGeometry args={[width, 2, 3]} />
      </mesh>
      <mesh position={[0, -1.01, 0]} rotation={[Math.PI / 2, 0, 0]} material={neonMaterial('#ffe14d', 2.2)}>
        <planeGeometry args={[width, 3]} />
      </mesh>
      <mesh position={[0, 6, 0]} material={surfaceMaterial('#1a1428', 0.5, 0.6)}>
        <boxGeometry args={[0.6, 10, 0.6]} />
      </mesh>
    </RigidBody>
  )
}

/** A tower that topples across the skyway when the car approaches. */
export function CollapsingTower({ base, trigger }: { base: Vec3; trigger: number }) {
  const ref = useRef<RapierRigidBody>(null)
  const st = useRef({ fallAt: -1 })
  const token = useRace((s) => s.resetToken)
  useEffect(() => {
    st.current.fallAt = -1
    const b = ref.current
    if (b) {
      q.setFromEuler(e.set(0, 0, 0))
      b.setRotation(q, true)
    }
  }, [token])
  useFrame(() => {
    const b = ref.current
    if (!b) return
    const p = playerState.position
    if (st.current.fallAt < 0 && useRace.getState().status === 'racing' && p.z > trigger && p.z < base[2] && p.x > 4) {
      st.current.fallAt = performance.now()
      sfx('explode')
      useGame.getState().toast({ kind: 'error', title: 'Structure collapsing!', body: 'Keep left!' })
    }
    const k = st.current.fallAt < 0 ? 0 : Math.min(1, (performance.now() - st.current.fallAt) / 1300)
    const ease = k * k
    q.setFromEuler(e.set(0, 0, ease * (Math.PI / 2 - 0.08)))
    b.setNextKinematicRotation(q)
  })
  return (
    <RigidBody ref={ref} type="kinematicPosition" colliders={false} position={base}>
      <CuboidCollider args={[1.5, 6.5, 2.5]} position={[0, 6.5, 0]} />
      <mesh position={[0, 6.5, 0]} material={surfaceMaterial('#1e1636', 0.6, 0.4)}>
        <boxGeometry args={[3, 13, 5]} />
      </mesh>
      {Array.from({ length: 6 }, (_, i) => (
        <mesh key={i} position={[-1.51, 1.5 + i * 2, 0]} rotation={[0, -Math.PI / 2, 0]} material={neonMaterial(i % 2 ? '#ff2bd6' : '#00f0ff', 1.2)}>
          <planeGeometry args={[4, 0.5]} />
        </mesh>
      ))}
      <mesh position={[0, 13.2, 0]} material={neonMaterial('#ff4d4d', 3)}>
        <sphereGeometry args={[0.4, 10, 8]} />
      </mesh>
    </RigidBody>
  )
}

/** Debris that drops onto the road when the car passes the trigger. */
export function FallingDebris({ area, trigger, count = 6 }: { area: { x: [number, number]; z: [number, number]; y: number }; trigger: number; count?: number }) {
  const bodies = useRef<(RapierRigidBody | null)[]>([])
  const { rapier } = useRapier()
  const st = useRef({ dropped: false })
  const token = useRace((s) => s.resetToken)
  const spots = useMemo(
    () => Array.from({ length: count }, (_, i) => [area.x[0] + ((i * 37) % 10) / 10 * (area.x[1] - area.x[0]), area.y + 18 + (i % 3) * 4, area.z[0] + (i / count) * (area.z[1] - area.z[0])] as Vec3),
    [area, count],
  )
  useEffect(() => {
    st.current.dropped = false
    bodies.current.forEach((b, i) => {
      if (!b) return
      b.setBodyType(rapier.RigidBodyType.KinematicPositionBased, true)
      b.setTranslation({ x: spots[i][0], y: spots[i][1], z: spots[i][2] }, true)
      b.setRotation({ x: 0, y: 0, z: 0, w: 1 }, true)
    })
  }, [token, rapier, spots])
  useFrame(() => {
    if (st.current.dropped || useRace.getState().status !== 'racing') return
    const p = playerState.position
    if (p.z > trigger && p.z < trigger + 40 && p.y > area.y - 3) {
      st.current.dropped = true
      sfx('explode')
      useGame.getState().toast({ kind: 'error', title: 'Falling debris!' })
      bodies.current.forEach((b) => {
        if (!b) return
        b.setBodyType(rapier.RigidBodyType.Dynamic, true)
        b.setLinvel({ x: 0, y: -8, z: 0 }, true)
        b.setAngvel({ x: Math.random() * 2, y: Math.random() * 2, z: Math.random() * 2 }, true)
      })
    }
  })
  return (
    <>
      {spots.map((s, i) => (
        <RigidBody key={i} ref={(b) => { bodies.current[i] = b }} type="kinematicPosition" colliders={false} position={s}>
          <CuboidCollider args={[1, 1, 1]} mass={120} />
          <mesh material={surfaceMaterial('#3a3048', 0.7, 0.3)}>
            <boxGeometry args={[2, 2, 2]} />
          </mesh>
          <mesh material={neonMaterial('#ff9a4d', 1.5)} scale={1.01}>
            <boxGeometry args={[2, 0.1, 2]} />
          </mesh>
        </RigidBody>
      ))}
    </>
  )
}

/** Pendulum wrecking ball swinging across the road. */
export function Hammer({ z, phase = 0, period = 2.8 }: { z: number; phase?: number; period?: number }) {
  const ref = useRef<RapierRigidBody>(null)
  const arm = useRef<Mesh>(null)
  useFrame(() => {
    const t = performance.now() / 1000
    const th = Math.sin((t / period) * Math.PI * 2 + phase) * 0.72
    const x = Math.sin(th) * 10
    const y = 13 - Math.cos(th) * 10
    ref.current?.setNextKinematicTranslation({ x, y, z })
    if (arm.current) {
      arm.current.position.set(x / 2, (13 + y) / 2, z)
      arm.current.rotation.set(0, 0, th)
    }
  })
  return (
    <>
      <RigidBody ref={ref} type="kinematicPosition" colliders={false} position={[0, 3, z]}>
        <BallCollider args={[1.8]} />
        <mesh material={surfaceMaterial('#2a2238', 0.3, 0.9)}>
          <sphereGeometry args={[1.8, 20, 14]} />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]} material={neonMaterial('#ff4d4d', 2.6)}>
          <torusGeometry args={[1.85, 0.08, 6, 30]} />
        </mesh>
      </RigidBody>
      <mesh ref={arm} material={surfaceMaterial('#5a5070', 0.4, 0.8)}>
        <boxGeometry args={[0.25, 10, 0.25]} />
      </mesh>
      <mesh position={[0, 13.5, z]} material={surfaceMaterial('#1a1428', 0.4, 0.6)}>
        <boxGeometry args={[20, 1, 1.2]} />
      </mesh>
      {[-10, 10].map((x) => (
        <mesh key={x} position={[x, 6.75, z]} material={surfaceMaterial('#1a1428', 0.4, 0.6)}>
          <boxGeometry args={[0.8, 13.5, 0.8]} />
        </mesh>
      ))}
    </>
  )
}

/** Rotating barrier arm guarding the finish. */
export function RotatingArm({ z, speed = 0.9 }: { z: number; speed?: number }) {
  const ref = useRef<RapierRigidBody>(null)
  useFrame(() => {
    const t = performance.now() / 1000
    q.setFromEuler(e.set(0, t * speed, 0))
    ref.current?.setNextKinematicRotation(q)
  })
  return (
    <RigidBody ref={ref} type="kinematicPosition" colliders={false} position={[0, 0.9, z]}>
      <CuboidCollider args={[7, 0.5, 0.4]} />
      <mesh material={surfaceMaterial('#2a1a1a', 0.4, 0.7)}>
        <boxGeometry args={[14, 1, 0.8]} />
      </mesh>
      <mesh position={[0, 0.51, 0]} material={neonMaterial('#ffe14d', 2.6)}>
        <boxGeometry args={[14, 0.05, 0.82]} />
      </mesh>
      <mesh position={[0, 0.5, 0]} material={surfaceMaterial('#111', 0.4, 0.7)}>
        <cylinderGeometry args={[0.6, 0.8, 2, 12]} />
      </mesh>
    </RigidBody>
  )
}

export { raceTime }
