import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { CylinderCollider, RigidBody } from '@react-three/rapier'
import { AdditiveBlending, Color, Group, Mesh, MeshBasicMaterial } from 'three'
import { LIGHT_PADS, LIGHT_SEQUENCE, type Vec3 } from '../../../data/content'
import { ENDING_CHOICES } from '../../../data/endings'
import { useGame } from '../../../store/useGame'
import { useInteractable } from '../../systems/interaction'
import { playerState } from '../../systems/playerState'
import { sfx } from '../../systems/audio'
import { Block } from '../common/Block'
import { GlyphMark } from '../common/Glyph'
import { NeonText } from '../common/NeonText'
import { Particles } from '../common/Particles'
import { SkyDome } from '../common/SkyDome'
import { GridFloor } from '../common/GridFloor'
import { neonMaterial, surfaceMaterial } from '../common/materials'
import { Beacon, HomePortal } from '../common/Traversal'
import { useTrialHud } from '../trials/common'
import { CHOICE_PEDESTALS, FIREWALLS, GLYPH_SOCKETS, LASER_BARS, LIGHT_PADS_X, MEMORY_LABELS, MEMORY_PLINTHS, PAD_Z, PLATFORMS, PYLON_ANGLES, PYLON_R, SD } from './layout'

import { STAGE_START, beginStage, fresh, maxIntegrity, retryStage, sdHit, tempo, useShowdown, type Stage } from './state'
export { beginStage, retryStage, useShowdown } from './state'

/* ---------------- Stage 2: infiltration ---------------- */

function LaserBar({ base, range, speed }: { base: number; range: number; speed: number }) {
  const ref = useRef<Mesh>(null)
  useFrame(() => {
    const t = (performance.now() / 1000) * speed * tempo()
    const z = base + Math.sin(t) * range
    if (ref.current) ref.current.position.z = z
    if (useShowdown.getState().stage !== 'infil') return
    const p = playerState.position
    if (Math.abs(p.z - z) < 0.35 && p.y - 0.85 < 0.75 && Math.abs(p.x) < 4) sdHit('Laser sweep!', true)
  })
  return (
    <mesh ref={ref} position={[0, 0.45, base]} material={neonMaterial('#ff2040', 3)}>
      <boxGeometry args={[8, 0.12, 0.12]} />
    </mesh>
  )
}

function Firewall({ z, phase }: { z: number; phase: number }) {
  const on = useRef<Mesh>(null)
  const off = useRef<Mesh>(null)
  useFrame(() => {
    const period = 2.6 / tempo()
    const c = ((performance.now() / 1000 + phase) % period) / period
    const active = c < 0.6
    if (on.current) on.current.visible = active
    if (off.current) off.current.visible = !active
    if (!active || useShowdown.getState().stage !== 'infil') return
    const p = playerState.position
    if (Math.abs(p.z - z) < 0.45 && Math.abs(p.x) < 4 && p.y < 4) sdHit('Firewall!', true)
  })
  return (
    <group position={[0, 1.5, z]}>
      <mesh ref={on} material={neonMaterial('#ff2040', 1.6)}>
        <boxGeometry args={[8, 3, 0.12]} />
      </mesh>
      <mesh ref={off} material={neonMaterial('#ff2040', 0.25)} visible={false}>
        <boxGeometry args={[8, 3, 0.04]} />
      </mesh>
    </group>
  )
}

function Infiltration() {
  const gift = useShowdown((s) => s.gift)
  const wall = surfaceMaterial('#120a16', 0.6, 0.4)
  return (
    <group>
      <Block position={[0, -0.25, -15]} size={[8, 0.5, 20]} color="#140c1a" edge={neonMaterial('#ff2040', 1.4)} />
      <Block position={[-4.2, 2, -15]} size={[0.4, 4, 20]} material={wall} />
      <Block position={[4.2, 2, -15]} size={[0.4, 4, 20]} material={wall} />
      {LASER_BARS.map(([b, r, s], i) => (
        <LaserBar key={i} base={b} range={r} speed={s} />
      ))}
      <NeonText position={[0, 3.6, -5.5]} rotation={[0, Math.PI, 0]} fontSize={0.4} color="#ff2040">
        JUMP THE LASERS
      </NeonText>
      {PLATFORMS.map((p, i) => (
        <Block key={i} position={[p[0], p[1] - 0.25, p[2]]} size={[3, 0.5, 3]} color="#1a1020" edge={neonMaterial('#c88cff', 2)} />
      ))}
      <Block position={[0, -0.25, -54]} size={[8, 0.5, 17]} color="#140c1a" edge={neonMaterial('#ff2040', 1.4)} />
      <Block position={[-4.2, 2, -54]} size={[0.4, 4, 17]} material={wall} />
      <Block position={[4.2, 2, -54]} size={[0.4, 4, 17]} material={wall} />
      {FIREWALLS.map((z, i) => (
        <Firewall key={z} z={z} phase={i * 0.8} />
      ))}
      <NeonText position={[0, 3.6, -46]} rotation={[0, Math.PI, 0]} fontSize={0.4} color="#ff2040">
        FIREWALL · WAIT FOR THE GAP (OR PHASE-DASH WITH F)
      </NeonText>
      <Beacon position={[0, 0, -7]} color="#ff2040" />
      <Beacon position={[0, 0, -47]} color="#ff2040" />
      {gift === 'beacon' && <Beacon position={[-1, 1.2, -38]} color="#9fe8ff" />}
    </group>
  )
}

/* ---------------- Stage 3: the last door ---------------- */

const lockState = () => {
  const s = useShowdown.getState()
  return {
    glyphs: s.sockets.every((v, i) => v === i + 1),
    memories: s.plinths.every((v, i) => v === i),
    lights: s.lightsDone,
  }
}

function Socket({ i }: { i: number }) {
  const v = useShowdown((s) => s.sockets[i])
  const open = useShowdown((s) => s.doorOpen)
  const pos = GLYPH_SOCKETS[i].pos
  useInteractable({
    id: `socket-${i}`,
    position: [pos[0] + 1.3, 1, pos[2]],
    radius: 1.25,
    enabled: !open,
    label: `Turn socket ${i + 1} (shows mark ${v})`,
    onInteract: () => {
      const s = [...useShowdown.getState().sockets]
      s[i] = (s[i] % 6) + 1
      useShowdown.setState({ sockets: s })
      sfx('blip')
    },
  })
  return (
    <group position={pos}>
      <Block position={[0, 0.6, 0]} size={[1, 1.2, 1]} color="#1a1428" edge={neonMaterial('#ffe14d', 1.6)} />
      <group position={[0.55, 1.9, 0]} rotation={[0, Math.PI / 2, 0]}>
        <GlyphMark index={v} size={0.38} color="#ffe14d" />
      </group>
      <NeonText position={[0.55, 1.05, 0]} rotation={[0, Math.PI / 2, 0]} fontSize={0.18} color="#ffffff" mono>
        {`SOCKET ${i + 1}`}
      </NeonText>
    </group>
  )
}

function Plinth({ i }: { i: number }) {
  const v = useShowdown((s) => s.plinths[i])
  const open = useShowdown((s) => s.doorOpen)
  const pos = MEMORY_PLINTHS[i].pos
  useInteractable({
    id: `plinth-${i}`,
    position: [pos[0] - 1.3, 1, pos[2]],
    radius: 1.5,
    enabled: !open,
    label: `Change memory ${['I', 'II', 'III', 'IV'][i]} (${MEMORY_LABELS[v]})`,
    onInteract: () => {
      const s = [...useShowdown.getState().plinths]
      s[i] = (s[i] + 1) % 4
      useShowdown.setState({ plinths: s })
      sfx('blip')
    },
  })
  return (
    <group position={pos}>
      <Block position={[0, 0.6, 0]} size={[1, 1.2, 1]} color="#2a1a10" edge={neonMaterial('#ff9a4d', 1.6)} />
      <NeonText position={[-0.55, 1.75, 0]} rotation={[0, -Math.PI / 2, 0]} fontSize={0.22} color="#ff9a4d">
        {MEMORY_LABELS[v]}
      </NeonText>
      <NeonText position={[-0.55, 1.05, 0]} rotation={[0, -Math.PI / 2, 0]} fontSize={0.26} color="#ffffff">
        {['I', 'II', 'III', 'IV'][i]}
      </NeonText>
    </group>
  )
}

function Pads() {
  const step = useShowdown((s) => s.padStep)
  const done = useShowdown((s) => s.lightsDone)
  const inside = useRef<string | null>(null)
  useFrame(() => {
    const s = useShowdown.getState()
    if (s.lightsDone || s.stage !== 'puzzle') return
    const p = playerState.position
    let on: string | null = null
    LIGHT_PADS.forEach((pad, i) => {
      if (Math.abs(p.x - LIGHT_PADS_X[i]) < 1.2 && Math.abs(p.z - PAD_Z) < 1.2 && p.y < 2.2) on = pad.id
    })
    if (on === inside.current) return
    inside.current = on
    if (!on) return
    if (on === LIGHT_SEQUENCE[s.padStep]) {
      const next = s.padStep + 1
      sfx('select')
      useShowdown.setState({ padStep: next, lightsDone: next >= LIGHT_SEQUENCE.length })
      if (next >= LIGHT_SEQUENCE.length) useGame.getState().toast({ kind: 'info', title: 'Light lock released' })
    } else {
      sfx('error')
      useShowdown.setState({ padStep: on === LIGHT_SEQUENCE[0] ? 1 : 0 })
    }
  })
  return (
    <>
      {LIGHT_PADS.map((pad, i) => {
        const lit = done || LIGHT_SEQUENCE.slice(0, step).includes(pad.id as (typeof LIGHT_SEQUENCE)[number])
        return (
          <group key={pad.id} position={[LIGHT_PADS_X[i], 0, PAD_Z]}>
            <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]} material={neonMaterial(pad.color, lit ? 2.6 : 0.5)}>
              <planeGeometry args={[2, 2]} />
            </mesh>
          </group>
        )
      })}
    </>
  )
}

function Puzzle() {
  const open = useShowdown((s) => s.doorOpen)
  const check = useShowdown((s) => s.lastCheck)
  const lights = useShowdown((s) => s.lightsDone)
  const gift = useShowdown((s) => s.gift)
  const sockets = useShowdown((s) => s.sockets)
  const plinths = useShowdown((s) => s.plinths)
  const live = gift === 'beacon' ? { glyphs: sockets.every((v, i) => v === i + 1), memories: plinths.every((v, i) => v === i) } : check
  useInteractable({
    id: 'door-lever',
    position: [SD.lever[0], 1, SD.lever[2] + 1.2],
    radius: 1.6,
    enabled: !open,
    label: 'Pull the lever',
    onInteract: () => {
      const l = lockState()
      useShowdown.setState({ lastCheck: { glyphs: l.glyphs, memories: l.memories } })
      if (l.glyphs && l.memories && l.lights) {
        useShowdown.setState({ doorOpen: true })
        const g = useGame.getState()
        g.setFlag('sd-puzzle')
        sfx('unlock')
        g.toast({ kind: 'secret', title: 'The last door opens', body: 'Something enormous waits beyond' })
        return
      }
      const wrong = [!l.glyphs && 'the marks', !l.lights && 'the lights', !l.memories && 'the memories'].filter(Boolean).join(', ')
      sdHit(`The door bites back — wrong: ${wrong}.`, false)
    },
  })
  const wall = surfaceMaterial('#120a16', 0.6, 0.4)
  const lamp = (ok: boolean | undefined) => neonMaterial(ok === undefined ? '#554466' : ok ? '#3dff8b' : '#ff2040', ok === undefined ? 1 : 2.6)
  return (
    <group>
      <Block position={[0, -0.25, -73]} size={[20, 0.5, 22]} color="#100a14" edge={neonMaterial('#ffe14d', 1)} />
      <Block position={[-10.2, 3, -73]} size={[0.4, 6, 22]} material={wall} />
      <Block position={[10.2, 3, -73]} size={[0.4, 6, 22]} material={wall} />
      <Block position={[-6.25, 3, SD.door]} size={[7.5, 6, 0.6]} material={wall} />
      <Block position={[6.25, 3, SD.door]} size={[7.5, 6, 0.6]} material={wall} />
      {!open && <Block position={[0, 3, SD.door]} size={[5, 6, 0.5]} color="#2a1a30" edge={neonMaterial('#ffe14d', 2.4)} />}
      {GLYPH_SOCKETS.map((_, i) => (
        <Socket key={i} i={i} />
      ))}
      {MEMORY_PLINTHS.map((_, i) => (
        <Plinth key={i} i={i} />
      ))}
      <Pads />
      <group position={SD.lever}>
        <Block position={[0, 0.5, 0]} size={[1.2, 1, 0.8]} color="#1a1428" edge={neonMaterial('#ffe14d', 2)} />
        <mesh position={[0, 1.4, 0]} rotation={[open ? -0.8 : 0.8, 0, 0]} material={neonMaterial('#ffe14d', 2.4)}>
          <boxGeometry args={[0.12, 1, 0.12]} />
        </mesh>
      </group>
      {/* lock lamps above the door */}
      {[
        ['MARKS', live?.glyphs],
        ['LIGHTS', lights],
        ['MEMORIES', live?.memories],
      ].map(([label, ok], i) => (
        <group key={label as string} position={[(i - 1) * 2.2, 6.6, SD.door + 0.4]}>
          <mesh material={lamp(ok as boolean | undefined)}>
            <sphereGeometry args={[0.3, 12, 8]} />
          </mesh>
          <NeonText position={[0, -0.6, 0]} fontSize={0.2} color="#ffffff" mono>
            {label as string}
          </NeonText>
        </group>
      ))}
      <NeonText position={[0, 4.2, -64.5]} rotation={[0, Math.PI, 0]} fontSize={0.34} color="#ffe14d" maxWidth={14} textAlign="center">
        THE LAST DOOR · MARKS IN ORDER · THE LIGHTS REMEMBER · MEMORIES AS LIVED
      </NeonText>
      {/* bridge to the arena */}
      <Block position={[0, -0.25, -88.5]} size={[4, 0.5, 9]} color="#140c1a" edge={neonMaterial('#ff2040', 1.4)} />
    </group>
  )
}

/* ---------------- Stage 4: the Null Titan ---------------- */

const ringMat = new MeshBasicMaterial({ color: new Color('#ff2040').multiplyScalar(2.6), toneMapped: false, transparent: true, opacity: 0.9 })
const beamMat = new MeshBasicMaterial({ color: new Color('#ff2040').multiplyScalar(2.2), toneMapped: false, transparent: true, opacity: 0.85, blending: AdditiveBlending })

function Titan() {
  const body = useRef<Group>(null)
  const ring = useRef<Mesh>(null)
  const beam = useRef<Group>(null)
  const marker = useRef<Mesh>(null)
  const bolt = useRef<Mesh>(null)
  const charges = useRef<(Mesh | null)[]>([])
  const hp = useShowdown((s) => s.titanHp)
  const spent = useShowdown((s) => s.spent)
  const stage = useShowdown((s) => s.stage)
  const st = useRef({ waveAt: 0, strikeAt: 0, strikePos: [0, 0] as [number, number], strikeLive: false, sweep: 0, last: 0 })
  const [cx, , cz] = SD.arena
  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.1)
    const s = useShowdown.getState()
    const now = performance.now()
    const p = playerState.position
    const fighting = s.stage === 'boss' && s.titanHp > 0 && !useGame.getState().overlay
    const phase = 4 - s.titanHp // 1..3
    const k = tempo()
    const stunned = now < s.stunUntil
    if (body.current) {
      const want = Math.atan2(p.x - cx, p.z - cz)
      body.current.rotation.y += (want - body.current.rotation.y) * Math.min(1, dt * 2)
      body.current.position.y = s.titanHp > 0 ? (stunned ? -0.6 : 0) : -12
    }
    // start the fight when the player steps into the arena
    if (s.stage === 'boss' && st.current.last === 0) {
      st.current.last = now
      st.current.waveAt = now + 2500
      st.current.strikeAt = now + 4000
    }
    if (!fighting) {
      if (ring.current) ring.current.visible = false
      if (marker.current) marker.current.visible = false
      if (beam.current) beam.current.visible = false
      return
    }
    // Shockwave rings: jump them.
    const waveEvery = ([0, 4600, 3800, 3100][phase] / k) | 0
    const waveDur = 2300 / k
    const wt = now - st.current.waveAt
    if (wt > waveDur) st.current.waveAt = now + (waveEvery - waveDur)
    const waveLive = wt >= 0 && wt <= waveDur && !stunned
    const r = 3 + (wt / waveDur) * (SD.arenaR - 3)
    if (ring.current) {
      ring.current.visible = waveLive
      ring.current.scale.set(r, r, 1)
    }
    const dist = Math.hypot(p.x - cx, p.z - cz)
    if (waveLive && Math.abs(dist - r) < 0.5 && p.y - 0.85 < 0.7) sdHit('Shockwave!', false)
    // Targeted strikes: move out of the red circle.
    const strikeEvery = [0, 3400, 2800, 2300][phase] / k
    const warn = 1300 / k
    if (now > st.current.strikeAt && !st.current.strikeLive) {
      st.current.strikeLive = true
      st.current.strikePos = [p.x, p.z]
      st.current.strikeAt = now + warn
    }
    if (marker.current) {
      marker.current.visible = st.current.strikeLive
      marker.current.position.set(st.current.strikePos[0], 0.05, st.current.strikePos[1])
    }
    if (bolt.current) bolt.current.visible = false
    if (st.current.strikeLive && now > st.current.strikeAt) {
      st.current.strikeLive = false
      st.current.strikeAt = now + strikeEvery
      sfx('explode')
      if (bolt.current) {
        bolt.current.visible = true
        bolt.current.position.set(st.current.strikePos[0], 8, st.current.strikePos[1])
      }
      if (Math.hypot(p.x - st.current.strikePos[0], p.z - st.current.strikePos[1]) < 2.2 && !stunned) sdHit('Direct strike!', false)
    }
    // Sweep beam from phase 2: jump it.
    if (beam.current) {
      beam.current.visible = phase >= 2 && !stunned
      st.current.sweep += dt * 0.75 * k * (phase === 3 ? 1.3 : 1)
      beam.current.rotation.y = st.current.sweep
      if (phase >= 2 && !stunned && dist > 3 && p.y - 0.85 < 0.7) {
        const a = Math.atan2(p.x - cx, p.z - cz)
        let d = a - (st.current.sweep % (Math.PI * 2))
        while (d > Math.PI) d -= Math.PI * 2
        while (d < -Math.PI) d += Math.PI * 2
        if (Math.abs(d) < 0.25 / Math.max(1, dist / 6)) sdHit('Sweep beam!', false)
      }
    }
    // Pylons: stand inside to charge.
    PYLON_ANGLES.forEach((ang, i) => {
      const px = cx + Math.sin(ang) * PYLON_R
      const pz = cz + Math.cos(ang) * PYLON_R
      const c = charges.current[i]
      if (s.spent[i]) return
      const inRange = Math.hypot(p.x - px, p.z - pz) < 2.2
      const charge = Math.max(0, Math.min(1, s.charge[i] + (inRange ? dt / 3 : -dt / 12)))
      if (c) c.scale.setScalar(0.2 + charge * 0.8)
      if (charge !== s.charge[i]) {
        const arr = [...useShowdown.getState().charge]
        arr[i] = charge
        useShowdown.setState({ charge: arr })
      }
      if (charge >= 1) {
        const sp = [...useShowdown.getState().spent]
        sp[i] = true
        const left = useShowdown.getState().titanHp - 1
        useShowdown.setState({ spent: sp, titanHp: left, stunUntil: now + 2200 })
        sfx('explode')
        const g = useGame.getState()
        if (left <= 0) {
          sfx('achievement')
          useShowdown.setState({ stage: 'choice' })
          g.setFlag('sd-boss')
          g.unlock('final')
          g.toast({ kind: 'secret', title: 'The Null Titan falls!', body: 'The way to the Core is open' })
          g.grantXp(200)
          playerState.checkpoint = { pos: SD.coreStart.pos, yaw: 0 }
        } else g.toast({ kind: 'info', title: `Pylon overloaded · ${left} left`, body: 'The Titan grows angrier' })
      }
    })
  })
  void stage
  return (
    <group>
      <RigidBody type="fixed" colliders={false}>
        <CylinderCollider args={[0.5, SD.arenaR]} position={[cx, -0.5, cz]} />
        <CylinderCollider args={[2, 3]} position={[cx, 1, cz]} />
      </RigidBody>
      <mesh position={[cx, -0.5, cz]} material={surfaceMaterial('#120a16', 0.5, 0.5)}>
        <cylinderGeometry args={[SD.arenaR, SD.arenaR - 0.5, 1, 64]} />
      </mesh>
      <mesh position={[cx, 0.02, cz]} rotation={[-Math.PI / 2, 0, 0]} material={neonMaterial('#ff2040', 1.4)}>
        <ringGeometry args={[SD.arenaR - 0.4, SD.arenaR - 0.2, 64]} />
      </mesh>
      <mesh position={[cx, 1, cz]} material={surfaceMaterial('#1a1020', 0.4, 0.7)}>
        <cylinderGeometry args={[3, 3.2, 2, 24]} />
      </mesh>
      <group ref={body} position={[cx, 0, cz]}>
        <mesh position={[0, 5.5, 0]} material={surfaceMaterial('#1a0a14', 0.3, 0.9)}>
          <boxGeometry args={[3.4, 5, 2]} />
        </mesh>
        <mesh position={[0, 9, 0]} material={surfaceMaterial('#1a0a14', 0.3, 0.9)}>
          <boxGeometry args={[2, 2, 2]} />
        </mesh>
        <mesh position={[0, 9.1, 1.02]} material={neonMaterial('#ff2040', 3.2)}>
          <boxGeometry args={[1.4, 0.25, 0.05]} />
        </mesh>
        {[-1, 1].map((s) => (
          <group key={s} position={[s * 2.6, 6.5, 0]} rotation={[0, 0, s * 0.3]}>
            <mesh material={surfaceMaterial('#1a0a14', 0.3, 0.9)}>
              <boxGeometry args={[1, 5, 1]} />
            </mesh>
            <mesh position={[0, -2.6, 0]} material={neonMaterial('#ff2040', 2)}>
              <sphereGeometry args={[0.5, 10, 8]} />
            </mesh>
          </group>
        ))}
        <mesh position={[0, 5.5, 1.02]} material={neonMaterial('#ff2040', 2)}>
          <ringGeometry args={[0.5, 0.75, 3]} />
        </mesh>
      </group>
      <mesh ref={ring} position={[cx, 0.35, cz]} rotation={[-Math.PI / 2, 0, 0]} material={ringMat} visible={false}>
        <ringGeometry args={[0.96, 1, 96]} />
      </mesh>
      <group ref={beam} position={[cx, 0.45, cz]} visible={false}>
        <mesh position={[0, 0, SD.arenaR / 2 + 1.5]} material={beamMat}>
          <boxGeometry args={[0.25, 0.25, SD.arenaR - 3]} />
        </mesh>
      </group>
      <mesh ref={marker} rotation={[-Math.PI / 2, 0, 0]} material={neonMaterial('#ff2040', 1.6)} visible={false}>
        <ringGeometry args={[1.8, 2.2, 32]} />
      </mesh>
      <mesh ref={bolt} material={beamMat} visible={false}>
        <cylinderGeometry args={[0.3, 0.8, 16, 8]} />
      </mesh>
      {PYLON_ANGLES.map((ang, i) => {
        const px = cx + Math.sin(ang) * PYLON_R
        const pz = cz + Math.cos(ang) * PYLON_R
        return (
          <group key={i} position={[px, 0, pz]}>
            <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]} material={neonMaterial(spent[i] ? '#554466' : '#3dff8b', spent[i] ? 1 : 1.8)}>
              <ringGeometry args={[2, 2.2, 32]} />
            </mesh>
            <mesh position={[0, 1.8, 0]} material={surfaceMaterial('#101820', 0.3, 0.8)}>
              <cylinderGeometry args={[0.35, 0.5, 3.6, 8]} />
            </mesh>
            <mesh ref={(m) => { charges.current[i] = m }} position={[0, 4, 0]} material={neonMaterial(spent[i] ? '#554466' : '#3dff8b', 2.6)}>
              <octahedronGeometry args={[0.6, 0]} />
            </mesh>
          </group>
        )
      })}
      {hp <= 0 && (
        <NeonText position={[cx, 4, cz]} fontSize={0.8} color="#3dff8b">
          NULL TITAN OFFLINE
        </NeonText>
      )}
    </group>
  )
}

/* ---------------- Stage 5: the Core ---------------- */

function Core() {
  const stage = useShowdown((s) => s.stage)
  const holo = useRef<Group>(null)
  useFrame((s) => {
    if (holo.current) holo.current.rotation.y = Math.sin(s.clock.elapsedTime * 0.4) * 0.3
  })
  return (
    <group>
      {stage !== 'choice' && <Block position={[0, 3, -128]} size={[6, 6, 0.4]} color="#2a0a14" edge={neonMaterial('#ff2040', 2.4)} />}
      <Block position={[0, -0.25, -129.5]} size={[4, 0.5, 5]} color="#e8f0ff" />
      <Block position={[0, -0.25, -141]} size={[20, 0.5, 18]} color="#dfe8f5" edge={neonMaterial('#ffffff', 1.6)} />
      <group ref={holo} position={[0, 0, -148]}>
        <mesh position={[0, 2.2, 0]} material={neonMaterial('#ffe14d', 0.7)}>
          <capsuleGeometry args={[0.6, 2, 6, 12]} />
        </mesh>
        <mesh position={[0, 4, 0]} material={neonMaterial('#ffe14d', 0.9)}>
          <sphereGeometry args={[0.45, 16, 12]} />
        </mesh>
      </group>
      <NeonText position={[0, 7, -149]} fontSize={0.7} color="#ffe14d">
        THE CORE
      </NeonText>
      <NeonText position={[0, 6.1, -149]} fontSize={0.26} color="#ffffff" mono maxWidth={14} textAlign="center">
        “The keys are yours. What do you want the OASIS to be?”
      </NeonText>
      {CHOICE_PEDESTALS.map((c) => (
        <ChoicePedestal key={c.id} id={c.id} pos={c.pos} />
      ))}
    </group>
  )
}

function ChoicePedestal({ id, pos }: { id: 'open' | 'caretaker' | 'rest'; pos: Vec3 }) {
  const stage = useShowdown((s) => s.stage)
  const def = ENDING_CHOICES.find((c) => c.id === id)!
  useInteractable({
    id: `choice-${id}`,
    position: [pos[0], 1, pos[2] + 1.4],
    radius: 1.8,
    enabled: stage === 'choice',
    label: `Consider: ${def.title} (${def.value})`,
    onInteract: () => useGame.getState().openOverlay({ type: 'ending', choice: id }),
  })
  return (
    <group position={pos}>
      <Block position={[0, 0.6, 0]} size={[1.6, 1.2, 1.6]} color="#cfd8e8" edge={neonMaterial(def.color, 2.4)} />
      <mesh position={[0, 2.1, 0]} material={neonMaterial(def.color, 2.4)}>
        <octahedronGeometry args={[0.45, 0]} />
      </mesh>
      <NeonText position={[0, 3.1, 0]} fontSize={0.32} color={def.color}>
        {def.title.toUpperCase()}
      </NeonText>
      <NeonText position={[0, 2.75, 0]} fontSize={0.18} color="#334455" intensity={1} mono>
        {def.value.toUpperCase()}
      </NeonText>
    </group>
  )
}

/* ---------------- Director ---------------- */

function Director() {
  useFrame(() => {
    const s = useShowdown.getState()
    const p = playerState.position
    if (useGame.getState().overlay) return
    if (p.y < -6 && s.stage !== 'prep') {
      sdHit('Fell into the void.', true)
      if (useShowdown.getState().integrity > 0) {
        const cp = playerState.checkpoint ?? STAGE_START[s.stage]
        playerState.teleport?.(cp.pos, cp.yaw)
      }
    }
    if (s.stage === 'prep' && p.z < -4.5) beginStage('infil', false)
    if (s.stage === 'infil' && p.z < -62.5) {
      useGame.getState().setFlag('sd-infil')
      useGame.getState().toast({ kind: 'info', title: 'Firewall breached', body: 'Stage 3 · the last door' })
      beginStage('puzzle', false)
    }
    if (s.stage === 'puzzle' && s.doorOpen && p.z < -93.5) {
      useGame.getState().toast({ kind: 'error', title: 'THE NULL TITAN', body: 'Jump the rings, dodge the red circles, charge the three pylons' })
      beginStage('boss', false)
    }
  })
  return null
}

function Status() {
  const s = useShowdown()
  useEffect(() => {
    const max = maxIntegrity(s.gift)
    const stageText: Record<Stage, string> = {
      prep: 'Stage 1 · Preparation',
      infil: 'Stage 2 · Infiltrate the firewall',
      puzzle: 'Stage 3 · Open the last door',
      boss: `Stage 4 · Null Titan ${'█'.repeat(Math.max(0, s.titanHp))}${'░'.repeat(3 - Math.max(0, s.titanHp))}`,
      choice: 'Stage 5 · Choose at the Core',
    }
    useTrialHud.getState().set({ status: [stageText[s.stage], `Integrity ${'■'.repeat(Math.max(0, s.integrity))}${'□'.repeat(Math.max(0, max - s.integrity))}`, s.gift ? `Gift: ${s.gift}` : 'No gift chosen'] })
  }, [s.stage, s.integrity, s.gift, s.titanHp])
  return null
}

export default function ShowdownWorld() {
  useEffect(() => {
    useShowdown.setState(fresh())
    const g = useGame.getState()
    g.setFlag('sd-entered')
    useTrialHud.getState().set({ trial: null, status: [], retry: retryStage })
    g.openOverlay({ type: 'prep' })
    return () => useTrialHud.getState().set({ trial: null, status: [], retry: null })
  }, [])
  const quality = useGame((s) => s.settings.quality)
  return (
    <group>
      <SkyDome top="#000000" horizon="#40020c" bottom="#000000" stars={false} />
      <GridFloor size={600} fade={260} color="#400010" color2="#ff2040" cell={4} y={-40} />
      {/* prep hall */}
      <Block position={[0, -0.25, 4]} size={[14, 0.5, 18]} color="#140c1a" edge={neonMaterial('#ff2040', 1.6)} />
      <NeonText position={[0, 5, -4.5]} rotation={[0, Math.PI, 0]} fontSize={0.8} color="#ff2040">
        THE NULL CITADEL
      </NeonText>
      <Infiltration />
      <Puzzle />
      <Titan />
      <Core />
      <Director />
      <Status />
      <Particles count={quality === 'low' ? 150 : 400} area={[40, 30, 170]} center={[0, -10, -70]} color="#ff2040" color2="#ffffff" size={4} rise={0.7} />
      <pointLight position={[0, 6, 0]} color="#ff2040" intensity={40} distance={30} />
      <pointLight position={[0, 6, -73]} color="#ffe14d" intensity={40} distance={30} />
      <pointLight position={[0, 12, -110]} color="#ff2040" intensity={90} distance={45} />
      <pointLight position={[0, 6, -141]} color="#ffffff" intensity={60} distance={30} />
      <HomePortal position={[0, 0, 12.4]} spawnId="fromShowdown" />
    </group>
  )
}
