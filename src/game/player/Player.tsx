import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { CapsuleCollider, RigidBody, useRapier, type RapierRigidBody } from '@react-three/rapier'
import { Group, Mesh, MeshBasicMaterial, Vector3 } from 'three'
import type { SpawnPoint } from '../../data/content'
import { getAbilities, useGame } from '../../store/useGame'
import { AvatarModel, type AvatarMotion } from '../avatar/AvatarModel'
import { consumeLook, input, isKey } from '../systems/input'
import { findNearest } from '../systems/interaction'
import { playerState } from '../systems/playerState'
import { sfx } from '../systems/audio'

const HALF_HEIGHT = 0.5
const RADIUS = 0.35
/** Distance from the capsule centre to the feet. */
const FOOT = HALF_HEIGHT + RADIUS
const WALK = 5.2
const SPRINT = 9.5
const JUMP_V = 8.4
const CAM_DIST = 6.2

const fwd = new Vector3()
const right = new Vector3()
const move = new Vector3()
const target = new Vector3()
const desired = new Vector3()
const dir = new Vector3()

const GROUND_OFFSETS = [[0, 0], [0.22, 0], [-0.22, 0], [0, 0.22], [0, -0.22]] as const

const shadowMat = new MeshBasicMaterial({ color: '#000000', transparent: true, opacity: 0.45, depthWrite: false })

function lerpAngle(a: number, b: number, t: number) {
  let d = b - a
  while (d > Math.PI) d -= Math.PI * 2
  while (d < -Math.PI) d += Math.PI * 2
  return a + d * t
}

interface Props {
  spawn: SpawnPoint
}

/**
 * Third-person character controller: dynamic Rapier capsule driven by velocity,
 * ray-cast ground detection, camera orbit with collision, and interaction scanning.
 */
export function Player({ spawn }: Props) {
  const body = useRef<RapierRigidBody>(null)
  const visual = useRef<Group>(null)
  const shadow = useRef<Mesh>(null)
  const motion = useRef<AvatarMotion>({ speed: 0, grounded: true, vy: 0 })
  const avatar = useGame((s) => s.avatar)
  const { world, rapier } = useRapier()
  const camera = useThree((s) => s.camera)
  const cam = useRef({ yaw: spawn.yaw, pitch: 0.32, dist: CAM_DIST })
  const st = useRef({ coyote: 0, jumpCooldown: 0, heading: spawn.yaw + Math.PI, energy: 100, exhausted: false, lastPromptId: '', lastPromptLabel: '', airTime: 0, lastJumpSeen: 0, airJumps: 0, dash: 0, lastDashSeen: 0, launched: false })

  useEffect(() => {
    cam.current.yaw = spawn.yaw
    playerState.cameraYaw = spawn.yaw
    playerState.position.set(spawn.pos[0], spawn.pos[1], spawn.pos[2])
    playerState.checkpoint = null
    playerState.launchUntil = 0
    playerState.teleport = (p, yaw) => {
      const b = body.current
      if (!b) return
      b.setTranslation({ x: p[0], y: p[1], z: p[2] }, true)
      b.setLinvel({ x: 0, y: 0, z: 0 }, true)
      if (yaw !== undefined) cam.current.yaw = yaw
    }
    // Snap camera behind the player on spawn.
    const c = cam.current
    camera.position.set(spawn.pos[0] + Math.sin(c.yaw) * c.dist, spawn.pos[1] + 3, spawn.pos[2] + Math.cos(c.yaw) * c.dist)
    camera.lookAt(spawn.pos[0], spawn.pos[1] + 1, spawn.pos[2])
    return () => {
      playerState.teleport = null
    }
  }, [spawn, camera])

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.25)
    const b = body.current
    if (!b) return
    const g = useGame.getState()
    const s = st.current
    const c = cam.current
    const frozen = g.overlay !== null || g.transition.active || g.race.status === 'countdown'

    // ---- Camera look input ----
    const look = consumeLook()
    const sens = 0.0024 * g.settings.sensitivity
    if (!frozen) {
      c.yaw -= look.dx * sens
      c.pitch += look.dy * sens * (g.settings.invertY ? -1 : 1)
      const keyTurn = 2.2 * dt * g.settings.sensitivity
      if (isKey('ArrowLeft', 'KeyQ')) c.yaw += keyTurn
      if (isKey('ArrowRight', 'KeyR')) c.yaw -= keyTurn
      if (isKey('PageUp')) c.pitch -= keyTurn * 0.6
      if (isKey('PageDown')) c.pitch += keyTurn * 0.6
    }
    c.pitch = Math.max(-0.25, Math.min(1.15, c.pitch))

    // ---- Movement input ----
    let ix = 0
    let iz = 0
    if (!frozen) {
      if (isKey('KeyW', 'ArrowUp')) iz += 1
      if (isKey('KeyS', 'ArrowDown')) iz -= 1
      if (isKey('KeyD')) ix += 1
      if (isKey('KeyA')) ix -= 1
      ix += input.joy.x
      iz += input.joy.y
    }
    fwd.set(-Math.sin(c.yaw), 0, -Math.cos(c.yaw))
    right.set(Math.cos(c.yaw), 0, -Math.sin(c.yaw))
    move.set(0, 0, 0).addScaledVector(fwd, iz).addScaledVector(right, ix)
    const mag = Math.min(1, move.length())
    if (mag > 0.01) move.normalize().multiplyScalar(mag)

    // ---- Sprint / energy ----
    const ab = getAbilities(g.progress)
    const wantsSprint = (isKey('ShiftLeft', 'ShiftRight') || input.touchSprint) && mag > 0.1
    if (s.energy <= 0) s.exhausted = true
    if (s.exhausted && s.energy > 25) s.exhausted = false
    const sprinting = wantsSprint && !s.exhausted && !frozen
    s.energy = Math.max(0, Math.min(100, s.energy + (sprinting ? (ab.overdrive ? -14 : -22) : 16) * dt))
    if (Math.abs(s.energy - g.energy) > 0.9 || (s.energy === 100 && g.energy !== 100)) g.setEnergy(Math.round(s.energy))

    // ---- Ground check ----
    const pos = b.translation()
    let grounded = false
    let minToi = Infinity
    for (const [ox, oz] of GROUND_OFFSETS) {
      const ray = new rapier.Ray({ x: pos.x + ox, y: pos.y, z: pos.z + oz }, { x: 0, y: -1, z: 0 })
      const hit = world.castRay(ray, FOOT + 0.12, true, undefined, undefined, undefined, b)
      if (hit) {
        grounded = true
        minToi = Math.min(minToi, hit.timeOfImpact)
      }
    }
    const groundY = grounded ? pos.y - minToi : pos.y - FOOT
    const lv = b.linvel()
    if (lv.y > 1.5 && s.jumpCooldown > 0) grounded = false
    s.coyote = grounded ? 0.12 : Math.max(0, s.coyote - dt)
    s.jumpCooldown = Math.max(0, s.jumpCooldown - dt)

    // ---- Velocity ----
    const speed = sprinting ? (ab.overdrive ? SPRINT + 1.2 : SPRINT) : WALK
    const accel = grounded ? 14 : 5
    const k = 1 - Math.exp(-accel * dt)
    const vx = lv.x + (move.x * speed - lv.x) * k
    const vz = lv.z + (move.z * speed - lv.z) * k
    let vy = lv.y
    // A fresh press is always honoured on the first frame that sees it (robust at low frame rates);
    // afterwards it stays buffered briefly so pressing just before landing still jumps.
    const freshPress = input.jumpQueuedAt !== 0 && input.jumpQueuedAt !== s.lastJumpSeen
    s.lastJumpSeen = input.jumpQueuedAt
    const jumpRecent = freshPress || (input.jumpQueuedAt !== 0 && performance.now() - input.jumpQueuedAt < 250)
    if (grounded) s.airJumps = 0
    if (!frozen && jumpRecent && s.coyote > 0 && s.jumpCooldown <= 0) {
      vy = JUMP_V
      s.coyote = 0
      s.jumpCooldown = 0.3
      input.jumpQueuedAt = 0
      sfx('jump')
    } else if (!frozen && freshPress && ab.doubleJump && !grounded && s.coyote <= 0 && s.airJumps < 1 && s.jumpCooldown <= 0.15) {
      // Double jump (Glitch Hop ability)
      vy = JUMP_V * 0.92
      s.airJumps++
      input.jumpQueuedAt = 0
      sfx('jump')
    }
    // Phase dash (Grid Gladiator ability): short burst, hazards that respect phasing let you through.
    const dashFresh = input.dashQueuedAt !== 0 && input.dashQueuedAt !== s.lastDashSeen
    s.lastDashSeen = input.dashQueuedAt
    if (!frozen && dashFresh && ab.phaseDash && performance.now() > playerState.dashCooldownUntil) {
      s.dash = 0.24
      playerState.dashCooldownUntil = performance.now() + 1300
      sfx('shoot')
    }
    s.dash = Math.max(0, s.dash - dt)
    playerState.phasing = s.dash > 0
    const launching = performance.now() < playerState.launchUntil
    if (launching && !s.launched) {
      s.launched = true
      vy = playerState.launchVel.y
      s.jumpCooldown = 0.4
    }
    if (!launching) s.launched = false
    if (frozen) {
      b.setLinvel({ x: lv.x * 0.8, y: vy, z: lv.z * 0.8 }, true)
    } else if (launching) {
      b.setLinvel({ x: playerState.launchVel.x, y: vy, z: playerState.launchVel.z }, true)
      if (grounded && lv.y <= 0.1 && s.jumpCooldown <= 0) playerState.launchUntil = 0
    } else if (s.dash > 0) {
      b.setLinvel({ x: Math.sin(s.heading) * 19, y: Math.max(vy, 0), z: Math.cos(s.heading) * 19 }, true)
    } else {
      b.setLinvel({ x: vx, y: vy, z: vz }, true)
    }

    // ---- Respawn if fallen out of the world ----
    if (pos.y < -25) {
      const cp = playerState.checkpoint
      const rp = cp ? cp.pos : spawn.pos
      b.setTranslation({ x: rp[0], y: rp[1] + 1, z: rp[2] }, true)
      b.setLinvel({ x: 0, y: 0, z: 0 }, true)
      playerState.launchUntil = 0
      g.toast({ kind: 'info', title: 'Respawned', body: cp ? 'Back to the last checkpoint.' : 'You fell out of the world.' })
    }

    // ---- Avatar facing + animation ----
    const hs = Math.hypot(vx, vz)
    if (mag > 0.1 && !frozen) s.heading = lerpAngle(s.heading, Math.atan2(move.x, move.z), 1 - Math.exp(-dt * 12))
    if (visual.current) visual.current.rotation.y = s.heading
    motion.current.speed = hs
    motion.current.grounded = grounded || s.coyote > 0.06
    motion.current.vy = vy

    // Assist mode: camera gently swings behind the direction of travel.
    if (g.settings.controlMode === 'assist' && mag > 0.1 && Math.abs(iz) > 0.2 && Math.abs(look.dx) < 0.5) {
      c.yaw = lerpAngle(c.yaw, s.heading + Math.PI, dt * 1.2 * Math.max(0, iz))
    }

    // ---- Shared state ----
    playerState.position.set(pos.x, pos.y, pos.z)
    playerState.velocity.set(vx, vy, vz)
    playerState.grounded = grounded
    playerState.heading = s.heading
    playerState.cameraYaw = c.yaw

    // Blob shadow
    if (shadow.current) {
      const ray = new rapier.Ray({ x: pos.x, y: pos.y, z: pos.z }, { x: 0, y: -1, z: 0 })
      const hit = world.castRay(ray, 30, true, undefined, undefined, undefined, b)
      if (hit) {
        const h = hit.timeOfImpact - FOOT
        shadow.current.visible = true
        shadow.current.position.set(pos.x, pos.y - hit.timeOfImpact + 0.03, pos.z)
        const sc = Math.max(0.3, 1 - h * 0.08)
        shadow.current.scale.set(sc, sc, sc)
      } else shadow.current.visible = false
    }

    // ---- Camera follow with collision ----
    target.set(pos.x, pos.y + 1.05, pos.z)
    dir.set(Math.sin(c.yaw) * Math.cos(c.pitch), Math.sin(c.pitch), Math.cos(c.yaw) * Math.cos(c.pitch))
    let dist = c.dist
    const camRay = new rapier.Ray({ x: target.x, y: target.y, z: target.z }, { x: dir.x, y: dir.y, z: dir.z })
    const camHit = world.castRay(camRay, c.dist, true, undefined, undefined, undefined, b)
    if (camHit) dist = Math.max(1.2, camHit.timeOfImpact - 0.35)
    desired.copy(target).addScaledVector(dir, dist)
    if (desired.y < groundY + 0.3) desired.y = groundY + 0.3
    camera.position.lerp(desired, 1 - Math.exp(-dt * 14))
    camera.lookAt(target)

    // ---- Interaction prompt ----
    const near = frozen ? null : findNearest(playerState.position)
    const id = near?.id ?? ''
    const label = near?.label ?? ''
    if (id !== s.lastPromptId || label !== s.lastPromptLabel) {
      s.lastPromptId = id
      s.lastPromptLabel = label
      g.setPrompt(near ? { id, label } : null)
    }
  })

  if (!avatar) return null
  return (
    <>
      <RigidBody
        ref={body}
        colliders={false}
        position={spawn.pos}
        enabledRotations={[false, false, false]}
        friction={0}
        linearDamping={0}
        ccd
        canSleep={false}
        name="player"
      >
        <CapsuleCollider args={[HALF_HEIGHT, RADIUS]} friction={0} />
        <group ref={visual} position={[0, -FOOT, 0]}>
          <AvatarModel config={avatar} motion={motion} />
        </group>
      </RigidBody>
      <mesh ref={shadow} rotation={[-Math.PI / 2, 0, 0]} material={shadowMat} renderOrder={1}>
        <circleGeometry args={[0.45, 20]} />
      </mesh>
    </>
  )
}
