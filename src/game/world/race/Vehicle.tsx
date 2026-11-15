import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { CuboidCollider, RigidBody, useBeforePhysicsStep, useRapier, type RapierRigidBody } from '@react-three/rapier'
import type { DynamicRayCastVehicleController } from '@dimforge/rapier3d-compat'
import { Color, Euler, Group, MathUtils, MeshBasicMaterial, PerspectiveCamera, Quaternion, Vector3 } from 'three'
import { VEHICLES, type Vec3, type VehicleDef } from '../../../data/content'
import { useGame } from '../../../store/useGame'
import { carState, useRace } from '../../../store/useRace'
import { AvatarModel } from '../../avatar/AvatarModel'
import { consumeLook, input, isKey } from '../../systems/input'
import { playerState } from '../../systems/playerState'
import { engineSound } from '../../systems/audio'
import { neonMaterial, surfaceMaterial } from '../common/materials'
import { RACE_START } from './layout'
import { autopilotControls } from './autopilot'

interface Shape {
  half: Vec3
  wheels: Vec3[]
  radius: number
}

const SHAPES: Record<VehicleDef['id'], Shape> = {
  volt: { half: [0.95, 0.32, 2.0], radius: 0.42, wheels: [[0.9, -0.1, 1.35], [-0.9, -0.1, 1.35], [0.9, -0.1, -1.3], [-0.9, -0.1, -1.3]] },
  brick: { half: [1.08, 0.5, 2.2], radius: 0.5, wheels: [[1.0, -0.2, 1.45], [-1.0, -0.2, 1.45], [1.0, -0.2, -1.45], [-1.0, -0.2, -1.45]] },
  wisp: { half: [0.95, 0.26, 2.2], radius: 0.4, wheels: [[0.92, -0.05, 1.5], [-0.92, -0.05, 1.5], [0.92, -0.05, -1.4], [-0.92, -0.05, -1.4]] },
}

const REST = 0.42
const tmpQ = new Quaternion()
const tmpE = new Euler(0, 0, 0, 'YXZ')
const fwd = new Vector3()
const up = new Vector3()
const camPos = new Vector3()
const camTarget = new Vector3()
const look = new Vector3()

export interface ControlInput {
  throttle: number
  steer: number
  handbrake: boolean
  boost: boolean
}

function readControls(): ControlInput {
  let throttle = 0
  let steer = 0
  if (isKey('KeyW', 'ArrowUp')) throttle += 1
  if (isKey('KeyS', 'ArrowDown')) throttle -= 1
  if (isKey('KeyD', 'ArrowRight')) steer += 1
  if (isKey('KeyA', 'ArrowLeft')) steer -= 1
  throttle += input.joy.y
  steer += input.joy.x
  return {
    throttle: MathUtils.clamp(throttle, -1, 1),
    steer: MathUtils.clamp(steer, -1, 1),
    handbrake: isKey('Space') || input.touchHandbrake,
    boost: isKey('ShiftLeft', 'ShiftRight') || input.touchSprint,
  }
}

/** Procedural car body for each vehicle (original designs). */
function CarBody({ def, wheels, boostFlame }: { def: VehicleDef; wheels: React.MutableRefObject<(Group | null)[]>; boostFlame: React.MutableRefObject<Group | null> }) {
  const avatar = useGame((s) => s.avatar)
  const paintHex = useGame((s) => s.progress.paint)
  const shape = SHAPES[def.id]
  const paint = useMemo(() => surfaceMaterial(paintHex ?? def.color, 0.25, 0.75), [def.color, paintHex])
  const dark = surfaceMaterial('#0d0b18', 0.4, 0.6)
  const glass = useMemo(() => new MeshBasicMaterial({ color: new Color(def.color).multiplyScalar(0.8), transparent: true, opacity: 0.28, depthWrite: false }), [def.color])
  const glowC = neonMaterial(def.color, 2.6)
  const [hx, hy, hz] = shape.half
  return (
    <group>
      {def.id === 'volt' && (
        <>
          <mesh position={[0, 0, 0]} material={paint}>
            <boxGeometry args={[hx * 2, hy * 1.6, hz * 2]} />
          </mesh>
          <mesh position={[0, 0.12, hz * 0.85]} rotation={[0.35, 0, 0]} material={paint}>
            <boxGeometry args={[hx * 1.9, 0.2, 0.9]} />
          </mesh>
          <mesh position={[0, hy + 0.12, -0.25]} material={glass}>
            <boxGeometry args={[hx * 1.2, 0.42, 1.5]} />
          </mesh>
          <mesh position={[0, hy + 0.15, -hz + 0.15]} material={dark}>
            <boxGeometry args={[hx * 2.1, 0.08, 0.5]} />
          </mesh>
        </>
      )}
      {def.id === 'brick' && (
        <>
          <mesh material={paint}>
            <boxGeometry args={[hx * 2, hy * 2, hz * 2]} />
          </mesh>
          <mesh position={[0, hy + 0.35, 0.3]} material={glass}>
            <boxGeometry args={[hx * 1.8, 0.7, 1.6]} />
          </mesh>
          <mesh position={[0, -0.05, hz + 0.12]} material={surfaceMaterial('#555566', 0.4, 0.9)}>
            <boxGeometry args={[hx * 2.1, 0.5, 0.25]} />
          </mesh>
          {[-0.6, 0, 0.6].map((x) => (
            <mesh key={x} position={[x, hy + 0.75, 0.3]} material={glowC}>
              <boxGeometry args={[0.3, 0.08, 0.1]} />
            </mesh>
          ))}
        </>
      )}
      {def.id === 'wisp' && (
        <>
          <mesh material={paint}>
            <boxGeometry args={[hx * 2, hy * 1.4, hz * 2]} />
          </mesh>
          <mesh position={[0, 0.02, hz * 0.95]} rotation={[0.18, 0, 0]} material={paint}>
            <boxGeometry args={[hx * 1.6, 0.14, 1.2]} />
          </mesh>
          <mesh position={[0, hy + 0.08, -0.1]} material={glass}>
            <sphereGeometry args={[0.62, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
          </mesh>
          {[-1, 1].map((sx) => (
            <mesh key={sx} position={[sx * hx * 0.8, hy + 0.45, -hz + 0.35]} material={paint}>
              <boxGeometry args={[0.06, 0.7, 0.6]} />
            </mesh>
          ))}
          <mesh position={[0, hy + 0.78, -hz + 0.35]} material={glowC}>
            <boxGeometry args={[hx * 1.8, 0.06, 0.5]} />
          </mesh>
        </>
      )}
      {/* neon underglow + lights */}
      {[-1, 1].map((sx) => (
        <mesh key={`u${sx}`} position={[sx * (hx + 0.01), -hy * 0.6, 0]} material={glowC}>
          <boxGeometry args={[0.04, 0.06, hz * 1.8]} />
        </mesh>
      ))}
      {[-1, 1].map((sx) => (
        <mesh key={`h${sx}`} position={[sx * hx * 0.65, 0, hz + 0.01]} material={neonMaterial('#ffffff', 3)}>
          <boxGeometry args={[0.35, 0.1, 0.04]} />
        </mesh>
      ))}
      {[-1, 1].map((sx) => (
        <mesh key={`t${sx}`} position={[sx * hx * 0.65, 0.05, -hz - 0.01]} material={neonMaterial('#ff2040', 3)}>
          <boxGeometry args={[0.45, 0.1, 0.04]} />
        </mesh>
      ))}
      <group ref={boostFlame} position={[0, 0, -hz - 0.1]} visible={false}>
        {[-0.35, 0.35].map((x) => (
          <mesh key={x} position={[x, 0, -0.45]} rotation={[-Math.PI / 2, 0, 0]} material={neonMaterial('#4dd2ff', 3)}>
            <coneGeometry args={[0.18, 0.9, 10]} />
          </mesh>
        ))}
      </group>
      {/* the driver */}
      {avatar && (
        <group position={[0, def.id === 'brick' ? hy - 0.6 : hy - 0.5, def.id === 'brick' ? 0.3 : -0.25]} scale={0.62}>
          <AvatarModel config={avatar} />
        </group>
      )}
      {shape.wheels.map((w, i) => (
        <group key={i} ref={(g) => { wheels.current[i] = g }} position={[w[0], w[1] - REST, w[2]]}>
          <group>
            <mesh rotation={[0, 0, Math.PI / 2]} material={dark}>
              <cylinderGeometry args={[shape.radius, shape.radius, 0.34, 18]} />
            </mesh>
            <mesh rotation={[0, 0, Math.PI / 2]} position={[w[0] > 0 ? 0.175 : -0.175, 0, 0]} material={glowC}>
              <torusGeometry args={[shape.radius * 0.62, 0.035, 6, 18]} />
            </mesh>
          </group>
        </group>
      ))}
    </group>
  )
}

/** Raycast-suspension vehicle driven by Rapier's DynamicRayCastVehicleController. */
export function Vehicle() {
  const vehicleId = useGame((s) => s.progress.vehicle)
  const def = VEHICLES.find((v) => v.id === vehicleId) ?? VEHICLES[0]
  const shape = SHAPES[def.id]
  const t = def.tune
  const body = useRef<RapierRigidBody>(null)
  const controller = useRef<DynamicRayCastVehicleController | null>(null)
  const wheels = useRef<(Group | null)[]>([])
  const boostFlame = useRef<Group | null>(null)
  const { world } = useRapier()
  const camera = useThree((s) => s.camera) as PerspectiveCamera
  const resetToken = useRace((s) => s.resetToken)
  const st = useRef({ steer: 0, flipped: 0, camYawOffset: 0, camMode: 0, lastLook: 0, controls: { throttle: 0, steer: 0, handbrake: false, boost: false } as ControlInput })

  const place = (pos: Vec3, yaw: number) => {
    const b = body.current
    if (!b) return
    tmpQ.setFromEuler(tmpE.set(0, yaw, 0))
    b.setTranslation({ x: pos[0], y: pos[1], z: pos[2] }, true)
    b.setRotation({ x: tmpQ.x, y: tmpQ.y, z: tmpQ.z, w: tmpQ.w }, true)
    b.setLinvel({ x: 0, y: 0, z: 0 }, true)
    b.setAngvel({ x: 0, y: 0, z: 0 }, true)
  }

  useEffect(() => {
    const b = body.current
    if (!b) return
    const c = world.createVehicleController(b)
    c.indexUpAxis = 1
    c.setIndexForwardAxis = 2
    shape.wheels.forEach((w, i) => {
      c.addWheel({ x: w[0], y: w[1], z: w[2] }, { x: 0, y: -1, z: 0 }, { x: -1, y: 0, z: 0 }, REST, shape.radius)
      c.setWheelSuspensionStiffness(i, 28)
      c.setWheelSuspensionCompression(i, 2.6)
      c.setWheelSuspensionRelaxation(i, 3.2)
      c.setWheelMaxSuspensionTravel(i, 0.35)
      c.setWheelMaxSuspensionForce(i, t.mass * 40)
      c.setWheelFrictionSlip(i, t.frictionSlip)
      c.setWheelSideFrictionStiffness(i, t.sideFriction)
    })
    controller.current = c
    return () => {
      controller.current = null
      world.removeVehicleController(c)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [world, def.id])

  // Reset to the grid whenever a race (re)starts or the garage reopens.
  useEffect(() => {
    place(RACE_START.pos, RACE_START.yaw)
    carState.boost = 100
    st.current.camYawOffset = 0
  }, [resetToken])

  useEffect(() => {
    carState.teleport = (pos, yaw) => place(pos, yaw)
    return () => {
      carState.teleport = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    engineSound.start()
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return
      if (e.code === 'KeyR') carState.respawnRequest = true
      if (e.code === 'KeyC') st.current.camMode = (st.current.camMode + 1) % 3
    }
    window.addEventListener('keydown', onKey)
    return () => {
      engineSound.stop()
      window.removeEventListener('keydown', onKey)
    }
  }, [])

  useBeforePhysicsStep((w) => {
    const c = controller.current
    const b = body.current
    if (!c || !b) return
    const dt = w.timestep
    const race = useRace.getState()
    const g = useGame.getState()
    const frozen = race.status === 'countdown' || race.status === 'garage' || g.overlay !== null || g.transition.active
    const ctl = frozen ? { throttle: 0, steer: 0, handbrake: true, boost: false } : race.autopilot ? autopilotControls(b) : readControls()
    st.current.controls = ctl
    const speed = c.currentVehicleSpeed()
    const absSpeed = Math.abs(speed)

    // Boost energy: drains while boosting, recharges slowly and while drifting.
    let boosting = ctl.boost && carState.boost > 0 && ctl.throttle > 0
    if (boosting) carState.boost = Math.max(0, carState.boost - 28 * dt)
    else carState.boost = Math.min(100, carState.boost + 6 * dt)
    if (carState.boost <= 0) boosting = false

    const top = t.maxSpeed + (boosting ? 9 : 0)
    let engine = 0
    let brake = 0
    if (ctl.throttle > 0) {
      engine = speed < top ? (t.accel + (boosting ? t.boost : 0)) * ctl.throttle : 0
    } else if (ctl.throttle < 0) {
      if (speed > 1) brake = 18 * -ctl.throttle
      else engine = speed > -12 ? 7 * ctl.throttle : 0
    } else {
      brake = 2.5
    }
    const perWheel = (t.mass * engine) / 4
    const brakeImpulse = (t.mass * brake) / 240
    // Steering: smoothed, reduced at speed for stability.
    const steerTarget = -ctl.steer * t.steer * (1 - Math.min(0.55, absSpeed / 70))
    st.current.steer += (steerTarget - st.current.steer) * Math.min(1, dt * 10)
    const drifting = ctl.handbrake && absSpeed > 8
    for (let i = 0; i < 4; i++) {
      const front = i < 2
      c.setWheelEngineForce(i, perWheel)
      c.setWheelSteering(i, front ? st.current.steer : 0)
      const rear = !front
      c.setWheelBrake(i, rear && ctl.handbrake ? (t.mass * 10) / 240 : brakeImpulse)
      c.setWheelSideFrictionStiffness(i, rear && ctl.handbrake ? t.driftSide : t.sideFriction)
    }
    c.updateVehicle(dt)

    // Downforce + air stabilisation.
    let onGround = 0
    for (let i = 0; i < 4; i++) if (c.wheelIsInContact(i)) onGround++
    const lin = b.linvel()
    const v2 = lin.x * lin.x + lin.z * lin.z
    b.applyImpulse({ x: 0, y: -t.mass * Math.min(18, v2 * 0.012) * dt, z: 0 }, true)
    if (onGround === 0) {
      const av = b.angvel()
      b.setAngvel({ x: av.x * 0.97, y: av.y * 0.97, z: av.z * 0.97 }, true)
    }
    // Safety: contacts with moving hazards must never launch the car.
    const cap = t.maxSpeed + 16
    const sp3 = Math.hypot(lin.x, lin.y, lin.z)
    if (sp3 > cap) b.setLinvel({ x: (lin.x / sp3) * cap, y: (lin.y / sp3) * cap, z: (lin.z / sp3) * cap }, true)
    const av2 = b.angvel()
    const am = Math.hypot(av2.x, av2.y, av2.z)
    if (am > 6) b.setAngvel({ x: (av2.x / am) * 6, y: (av2.y / am) * 6, z: (av2.z / am) * 6 }, true)
    // Drifting builds boost.
    if (drifting && onGround > 1) carState.boost = Math.min(100, carState.boost + 14 * dt)

    carState.speed = speed
    carState.boosting = boosting
    carState.drifting = drifting
    carState.airborne = onGround === 0
    carState.wheelsOnGround = onGround
  })

  useFrame((_, rawDt) => {
    const b = body.current
    const c = controller.current
    if (!b || !c) return
    const dt = Math.min(rawDt, 0.1)
    const s = st.current
    const race = useRace.getState()
    const p = b.translation()
    const r = b.rotation()
    tmpQ.set(r.x, r.y, r.z, r.w)
    fwd.set(0, 0, 1).applyQuaternion(tmpQ)
    up.set(0, 1, 0).applyQuaternion(tmpQ)
    const yaw = Math.atan2(fwd.x, fwd.z)

    // Flip / fall / manual respawn
    s.flipped = up.y < 0.3 && Math.abs(carState.speed) < 3 ? s.flipped + dt : 0
    if (carState.respawnRequest || s.flipped > 1.5 || p.y < -22 || (p.y < -4 && p.z > 640 && p.z < 672)) {
      carState.respawnRequest = false
      s.flipped = 0
      const rp = race.status === 'racing' ? race.respawn : RACE_START
      place(rp.pos, rp.yaw)
      useGame.getState().toast({ kind: 'info', title: 'Respawned', body: 'Back to the last checkpoint' })
    }

    playerState.position.set(p.x, p.y, p.z)
    playerState.heading = yaw
    playerState.cameraYaw = yaw + Math.PI

    // Wheel visuals
    for (let i = 0; i < 4; i++) {
      const wg = wheels.current[i]
      if (!wg) continue
      const len = c.wheelSuspensionLength(i) ?? REST
      wg.position.y = shape.wheels[i][1] - len
      wg.rotation.y = c.wheelSteering(i) ?? 0
      const spin = wg.children[0]
      if (spin) spin.rotation.x = c.wheelRotation(i) ?? 0
    }
    if (boostFlame.current) {
      boostFlame.current.visible = carState.boosting
      boostFlame.current.scale.setScalar(0.8 + Math.random() * 0.4)
    }
    engineSound.update(Math.abs(carState.speed) / def.tune.maxSpeed, carState.boosting)

    // Camera: chase cam with optional mouse orbit that eases back behind the car.
    const l = consumeLook()
    if (Math.abs(l.dx) > 0.1) {
      s.camYawOffset -= l.dx * 0.004
      s.lastLook = performance.now()
    }
    if (performance.now() - s.lastLook > 900) s.camYawOffset *= Math.pow(0.04, dt)
    const lookBack = isKey('KeyV')
    const dists = [7.5, 11, 0.01]
    const heights = [2.6, 4.2, 1.2]
    const dist = dists[s.camMode]
    const camYaw = yaw + s.camYawOffset + (lookBack ? Math.PI : 0)
    if (s.camMode === 2) {
      camPos.set(p.x, p.y + 1.1, p.z).addScaledVector(fwd, 0.6)
      camera.position.copy(camPos)
      look.set(p.x, p.y + 1.0, p.z).addScaledVector(fwd, 20)
      camera.lookAt(look)
    } else {
      camPos.set(p.x - Math.sin(camYaw) * dist, p.y + heights[s.camMode], p.z - Math.cos(camYaw) * dist)
      camera.position.lerp(camPos, 1 - Math.exp(-dt * (race.status === 'garage' ? 3 : 9)))
      camTarget.set(p.x + Math.sin(camYaw) * 4, p.y + 1, p.z + Math.cos(camYaw) * 4)
      camera.lookAt(camTarget)
    }
    const targetFov = 62 + Math.min(1, Math.abs(carState.speed) / 45) * 18 + (carState.boosting ? 6 : 0)
    camera.fov += (targetFov - camera.fov) * Math.min(1, dt * 4)
    camera.updateProjectionMatrix()
  })

  const [hx, hy, hz] = shape.half
  return (
    <RigidBody
      ref={body}
      colliders={false}
      position={RACE_START.pos}
      linearDamping={0.08}
      angularDamping={0.9}
      canSleep={false}
      ccd
      name="car"
    >
      <CuboidCollider args={[hx, hy, hz]} mass={t.mass * 0.65} friction={0.3} restitution={0.1} />
      <CuboidCollider args={[hx * 0.6, 0.12, hz * 0.6]} position={[0, -hy + 0.12, 0]} mass={t.mass * 0.35} friction={0.3} />
      <CarBody def={def} wheels={wheels} boostFlame={boostFlame} />
    </RigidBody>
  )
}
