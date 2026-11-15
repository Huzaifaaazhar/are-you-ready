import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { useRapier } from '@react-three/rapier'
import { create } from 'zustand'
import { AdditiveBlending, DoubleSide, Group, Mesh, MeshBasicMaterial, Color } from 'three'
import { LIGHT_PADS, LIGHT_SEQUENCE, type Vec3 } from '../../../../data/content'
import { useGame } from '../../../../store/useGame'
import { useInteractable } from '../../../systems/interaction'
import { playerState } from '../../../systems/playerState'
import { sfx } from '../../../systems/audio'
import { Block } from '../../common/Block'
import { NeonText } from '../../common/NeonText'
import { neonMaterial, surfaceMaterial } from '../../common/materials'
import { failTrial, TrialExit, useTrialHud, useTrialSetup } from '../common'
import { CHECKPOINTS, ELEVATOR, PAD_Z, ZONES } from './layout'

type Stage = 'infiltrate' | 'decide' | 'escape' | 'done'
interface PresentState {
  stage: Stage
  checkpoint: keyof typeof CHECKPOINTS
  detections: number
  doorOpen: boolean
  camerasOffUntil: number
  escapeEnd: number
  alarmUntil: number
  reset: () => void
}
const fresh = () => ({ stage: 'infiltrate' as Stage, checkpoint: 'lobby' as const, detections: 0, doorOpen: false, camerasOffUntil: 0, escapeEnd: 0, alarmUntil: 0 })
export const usePresent = create<PresentState>((set) => ({ ...fresh(), reset: () => set(fresh()) }))
if (typeof window !== 'undefined') (window as unknown as { __present: typeof usePresent }).__present = usePresent

const ESCAPE_SECONDS = 45
const RANGE = 9
const HALF_ANGLE = 0.5

function spotted(source: string) {
  const s = usePresent.getState()
  if (performance.now() < s.alarmUntil) return
  sfx('hurt')
  usePresent.setState({ detections: s.detections + 1, alarmUntil: performance.now() + 1800 })
  useGame.getState().toast({ kind: 'error', title: 'DETECTED', body: `Spotted by a ${source}. Back to the checkpoint.` })
  window.setTimeout(() => {
    const cp = CHECKPOINTS[usePresent.getState().checkpoint]
    playerState.teleport?.(cp.pos, cp.yaw)
  }, 500)
}

/** A sentry (drone or camera) with a vision cone; walls and cover block its sight. */
function Sentry({ kind, path, pos, sweep, speed = 3 }: { kind: 'drone' | 'camera'; path?: Vec3[]; pos?: Vec3; sweep?: [number, number]; speed?: number }) {
  const group = useRef<Group>(null)
  const cone = useRef<Mesh>(null)
  const { world, rapier } = useRapier()
  const st = useRef({ seg: 0, t: 0, yaw: 0 })
  const coneMat = useMemo(() => new MeshBasicMaterial({ color: new Color('#ff3040').multiplyScalar(1.5), transparent: true, opacity: 0.18, blending: AdditiveBlending, depthWrite: false, side: DoubleSide, toneMapped: false }), [])
  useFrame((_, rawDt) => {
    const g = group.current
    if (!g) return
    const dt = Math.min(rawDt, 0.1)
    const ps = usePresent.getState()
    const off = kind === 'camera' && performance.now() < ps.camerasOffUntil
    const active = ps.stage === 'infiltrate' && !off && !useGame.getState().overlay
    if (cone.current) cone.current.visible = ps.stage === 'infiltrate' && !off
    let x: number, z: number
    if (path) {
      const a = path[st.current.seg]
      const b = path[(st.current.seg + 1) % path.length]
      const len = Math.hypot(b[0] - a[0], b[2] - a[2])
      st.current.t += (dt * speed) / len
      if (st.current.t >= 1) {
        st.current.t = 0
        st.current.seg = (st.current.seg + 1) % path.length
      }
      x = a[0] + (b[0] - a[0]) * st.current.t
      z = a[2] + (b[2] - a[2]) * st.current.t
      const want = Math.atan2(b[0] - a[0], b[2] - a[2])
      let d = want - st.current.yaw
      while (d > Math.PI) d -= Math.PI * 2
      while (d < -Math.PI) d += Math.PI * 2
      st.current.yaw += d * Math.min(1, dt * 4)
      g.position.set(x, 2.4 + Math.sin(performance.now() / 300) * 0.08, z)
    } else {
      x = pos![0]
      z = pos![2]
      const [a0, a1] = sweep!
      st.current.yaw = a0 + (a1 - a0) * (0.5 + 0.5 * Math.sin(performance.now() / 1000 * speed * 0.4))
    }
    g.rotation.y = st.current.yaw
    if (!active) return
    const p = playerState.position
    const dx = p.x - x
    const dz = p.z - z
    const dist = Math.hypot(dx, dz)
    if (dist > RANGE || dist < 0.3) return
    let ang = Math.atan2(dx, dz) - st.current.yaw
    while (ang > Math.PI) ang -= Math.PI * 2
    while (ang < -Math.PI) ang += Math.PI * 2
    if (Math.abs(ang) > HALF_ANGLE) return
    // line of sight at chest height
    const ray = new rapier.Ray({ x, y: 1.2, z }, { x: dx / dist, y: 0, z: dz / dist })
    const hit = world.castRay(ray, dist, true)
    if (hit && hit.timeOfImpact < dist - 0.6) return
    spotted(kind === 'drone' ? 'security drone' : 'camera')
  })
  const coneLen = RANGE
  return (
    <group ref={group} position={pos ?? path![0]}>
      {kind === 'drone' ? (
        <>
          <mesh material={surfaceMaterial('#c8d4e8', 0.3, 0.8)}>
            <sphereGeometry args={[0.45, 16, 12]} />
          </mesh>
          <mesh position={[0, 0, 0.42]} material={neonMaterial('#ff3040', 3)}>
            <sphereGeometry args={[0.13, 10, 8]} />
          </mesh>
          <mesh rotation={[Math.PI / 2, 0, 0]} material={neonMaterial('#4d7cff', 2)}>
            <torusGeometry args={[0.65, 0.04, 6, 24]} />
          </mesh>
        </>
      ) : (
        <mesh material={surfaceMaterial('#c8d4e8', 0.3, 0.8)}>
          <boxGeometry args={[0.5, 0.4, 0.8]} />
        </mesh>
      )}
      <mesh ref={cone} position={[0, kind === 'drone' ? -1.3 : -1.6 - (pos ? pos[1] - 4 : 0), coneLen / 2]} rotation={[-Math.PI / 2, 0, 0]} material={coneMat}>
        <coneGeometry args={[Math.tan(HALF_ANGLE) * coneLen, coneLen, 24, 1, true]} />
      </mesh>
    </group>
  )
}

function Walls() {
  const wall = surfaceMaterial('#1b2436', 0.5, 0.4)
  const floor = surfaceMaterial('#0e1420', 0.4, 0.5)
  const doorOpen = usePresent((s) => s.doorOpen)
  const L = ZONES.lobby
  return (
    <>
      <Block position={[0, -0.5, -34]} size={[24, 1, 92]} material={floor} />
      <Block position={[29, -0.5, -70]} size={[34, 1, 6]} material={floor} />
      <Block position={[-12.2, 3, -34]} size={[0.4, 6, 92]} material={wall} />
      <Block position={[12.2, 3, -27.5]} size={[0.4, 6, 79]} material={wall} />
      <Block position={[12.2, 3, -76.5]} size={[0.4, 6, 7]} material={wall} />
      <Block position={[0, 3, L.maxZ + 0.2]} size={[24, 6, 0.4]} material={wall} />
      <Block position={[0, 3, -80.2]} size={[24, 6, 0.4]} material={wall} />
      {/* lobby → hall wall with doorway */}
      <Block position={[-7, 3, -30]} size={[10, 6, 0.4]} material={wall} />
      <Block position={[7, 3, -30]} size={[10, 6, 0.4]} material={wall} />
      {/* hall → office wall with vault door */}
      <Block position={[-7, 3, -60]} size={[10, 6, 0.4]} material={wall} />
      <Block position={[7, 3, -60]} size={[10, 6, 0.4]} material={wall} />
      {!doorOpen && <Block position={[0, 3, -60]} size={[4, 6, 0.6]} color="#2a3a5a" edge={neonMaterial('#ff3040', 2.6)} />}
      {/* escape corridor */}
      <Block position={[29, 3, -67.2]} size={[34, 6, 0.4]} material={wall} />
      <Block position={[29, 3, -72.8]} size={[34, 6, 0.4]} material={wall} />
      <Block position={[46.2, 3, -70]} size={[0.4, 6, 6]} material={wall} />
      {/* cover in the lobby */}
      {[[-5, -8], [5, -8], [0, -15], [-6, -22], [6, -22]].map(([x, z]) => (
        <Block key={`${x}${z}`} position={[x, 2, z]} size={[1.6, 4, 1.6]} color="#2a3550" edge={neonMaterial('#4d7cff', 1.8)} />
      ))}
      <Block position={[0, 0.6, -3]} size={[6, 1.2, 1.4]} color="#2a3550" edge={neonMaterial('#9ec4ff', 1.5)} />
      {/* server racks in the hall */}
      {[-8, -3, 3, 8].map((x) =>
        [-38, -46].map((z) => (
          <group key={`${x}${z}`}>
            <Block position={[x, 1.4, z]} size={[2.2, 2.8, 4]} color="#121a2a" />
            {[0, 1, 2].map((k) => (
              <mesh key={k} position={[x, 0.6 + k * 0.8, z + 2.01]} material={neonMaterial(k % 2 ? '#3dff8b' : '#4d7cff', 1.6)}>
                <planeGeometry args={[1.8, 0.08]} />
              </mesh>
            ))}
          </group>
        )),
      )}
      <NeonText position={[0, 5.2, L.maxZ - 0.3]} rotation={[0, Math.PI, 0]} fontSize={0.6} color="#9ec4ff">
        CONSORTIUM · OWN EVERY DOOR
      </NeonText>
      <NeonText position={[0, 5, -59.6]} rotation={[0, Math.PI, 0]} fontSize={0.4} color="#ff3040">
        SERVER VAULT · PASSPHRASE REQUIRED
      </NeonText>
      <pointLight position={[0, 5, -10]} color="#9ec4ff" intensity={60} distance={30} />
      <pointLight position={[0, 5, -45]} color="#4d7cff" intensity={60} distance={30} />
      <pointLight position={[0, 5, -70]} color="#ffe14d" intensity={40} distance={24} />
      <pointLight position={[29, 4, -70]} color="#ff3040" intensity={40} distance={30} />
    </>
  )
}

function ColorLock() {
  const doorOpen = usePresent((s) => s.doorOpen)
  const [step, setStepState] = useState(0)
  const stepRef = useRef(0)
  const inside = useRef<string | null>(null)
  const xs = [-6, -2, 2, 6]
  useFrame(() => {
    if (doorOpen) return
    const p = playerState.position
    let on: string | null = null
    LIGHT_PADS.forEach((pad, i) => {
      if (Math.abs(p.x - xs[i]) < 1.2 && Math.abs(p.z - PAD_Z) < 1.2 && p.y < 2.2) on = pad.id
    })
    if (on === inside.current) return
    inside.current = on
    if (!on) return
    const s = stepRef.current
    if (on === LIGHT_SEQUENCE[s]) {
      const next = s + 1
      stepRef.current = next
      setStepState(next)
      sfx('select')
      if (next >= LIGHT_SEQUENCE.length) {
        usePresent.setState({ doorOpen: true, checkpoint: 'hall' })
        sfx('unlock')
        useGame.getState().toast({ kind: 'info', title: 'Passphrase accepted', body: 'The server vault opens' })
      }
    } else {
      sfx('error')
      stepRef.current = on === LIGHT_SEQUENCE[0] ? 1 : 0
      setStepState(stepRef.current)
    }
  })
  return (
    <>
      {LIGHT_PADS.map((pad, i) => {
        const lit = doorOpen || LIGHT_SEQUENCE.slice(0, step).includes(pad.id as (typeof LIGHT_SEQUENCE)[number])
        return (
          <group key={pad.id} position={[xs[i], 0, PAD_Z]}>
            <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]} material={neonMaterial(pad.color, lit ? 2.6 : 0.5)}>
              <planeGeometry args={[2, 2]} />
            </mesh>
            <NeonText position={[0, 0.06, 1.4]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.26} color={pad.color} mono>
              {pad.label}
            </NeonText>
          </group>
        )
      })}
    </>
  )
}

function Terminals() {
  const open = useGame((s) => s.openOverlay)
  useInteractable({
    id: 'cam-terminal',
    position: [-10, 1, -34],
    radius: 2.2,
    label: 'Loop the security cameras (12 s)',
    onInteract: () => {
      const s = usePresent.getState()
      if (performance.now() < s.camerasOffUntil + 8000) {
        useGame.getState().toast({ kind: 'error', title: 'Terminal cooling down' })
        return
      }
      usePresent.setState({ camerasOffUntil: performance.now() + 12000 })
      sfx('select')
      useGame.getState().toast({ kind: 'info', title: 'Cameras looped', body: '12 seconds of blind spots' })
    },
  })
  useInteractable({
    id: 'hint-terminal',
    position: [10, 1, -34],
    radius: 2.2,
    label: 'Read the security memo',
    onInteract: () =>
      open({
        type: 'info',
        title: 'Consortium security memo',
        accent: '#4d7cff',
        body: [
          '“Vault passphrase rotated. New sequence copied from a fan poster in Arcade Sector 8-B — the one titled THE LIGHTS REMEMBER. Nobody reads posters.”',
          'Step on the coloured pads in front of the vault door in that order. (If you have read the poster, the order is in your journal.)',
        ],
      }),
  })
  return (
    <>
      {[[-10, -34, '#3dff8b'], [10, -34, '#9ec4ff']].map(([x, z, c]) => (
        <group key={x as number} position={[x as number, 0, z as number]}>
          <Block position={[0, 0.6, 0]} size={[1, 1.2, 0.7]} color="#1b2436" edge={neonMaterial(c as string, 2)} />
          <mesh position={[0, 1.6, 0.36]} material={neonMaterial(c as string, 0.8)}>
            <planeGeometry args={[0.9, 0.6]} />
          </mesh>
        </group>
      ))}
    </>
  )
}

function Office() {
  const stage = usePresent((s) => s.stage)
  const holo = useRef<Group>(null)
  const greeted = useRef(false)
  useFrame((s) => {
    if (holo.current) holo.current.rotation.y = Math.sin(s.clock.elapsedTime * 0.5) * 0.3
    const p = playerState.position
    if (!greeted.current && p.z < -62 && usePresent.getState().doorOpen) {
      greeted.current = true
      usePresent.setState({ stage: 'decide', checkpoint: 'office' })
      useGame.getState().addJournal('consortium')
      useGame.getState().openOverlay({
        type: 'info',
        title: 'Director Vale (hologram)',
        accent: '#ffe14d',
        body: [
          '“Impressive. Nobody gets this far. So let’s be adults about this.”',
          '“Sign the contract on my desk and you get 1,000 coins and a lifetime VIP pass. All you hand over is the Founder’s keys. We’ll take it from there — tolls on every portal, ads on every sky.”',
          '“Or don’t. But nobody remembers the player who said no.”',
          'On the desk: the Consortium contract. In the corner: the tower’s public broadcast console.',
        ],
      })
    }
  })
  useInteractable({
    id: 'contract',
    position: [0, 1, -73],
    radius: 2,
    enabled: stage === 'decide',
    label: 'Sign the Consortium contract (1,000 coins)',
    onInteract: () => {
      sfx('hurt')
      failTrial('present', 'You sold the OASIS', [
        'The ink is still wet when the Consortium bolts tolls onto every portal. Your 1,000 coins can’t buy back a single free door.',
        'Trial II failed. The OASIS belongs to the people who play it. Try again.',
      ])
    },
  })
  useInteractable({
    id: 'broadcast',
    position: [-9, 1, -70],
    radius: 2,
    enabled: stage === 'decide',
    label: 'Broadcast the Consortium’s plan to every player',
    onInteract: () => {
      sfx('unlock')
      usePresent.setState({ stage: 'escape', escapeEnd: performance.now() + ESCAPE_SECONDS * 1000 })
      useGame.getState().toast({ kind: 'secret', title: 'Broadcast sent!', body: `Alarms! Reach the east elevator in ${ESCAPE_SECONDS}s` })
    },
  })
  return (
    <>
      <Block position={[0, 0.5, -74]} size={[4, 1, 1.6]} color="#2a2210" edge={neonMaterial('#ffe14d', 2)} />
      <mesh position={[0, 1.02, -73.6]} rotation={[-Math.PI / 2, 0, 0]} material={neonMaterial('#fff2d6', 1.2)}>
        <planeGeometry args={[0.6, 0.8]} />
      </mesh>
      <group ref={holo} position={[0, 1.2, -77]}>
        <mesh position={[0, 1.4, 0]} material={neonMaterial('#ffe14d', 0.7)}>
          <capsuleGeometry args={[0.4, 1.4, 6, 12]} />
        </mesh>
        <mesh position={[0, 2.6, 0]} material={neonMaterial('#ffe14d', 0.9)}>
          <sphereGeometry args={[0.32, 16, 12]} />
        </mesh>
      </group>
      <Block position={[-9, 0.7, -70]} size={[1.2, 1.4, 1]} color="#1b2436" edge={neonMaterial('#3dff8b', 2.2)} />
      <mesh position={[-9, 1.8, -69.48]} material={neonMaterial('#3dff8b', 0.9)}>
        <planeGeometry args={[1, 0.7]} />
      </mesh>
      <NeonText position={[-9, 2.6, -69.4]} fontSize={0.2} color="#3dff8b">
        PUBLIC BROADCAST
      </NeonText>
      <NeonText position={[0, 2.1, -73]} fontSize={0.2} color="#ffe14d">
        CONTRACT
      </NeonText>
    </>
  )
}

/** Laser gates in the escape corridor that switch on and off. */
function Lasers() {
  const stage = usePresent((s) => s.stage)
  const gates = [17, 23, 29, 35, 40]
  const refs = useRef<(Mesh | null)[]>([])
  useFrame(() => {
    if (usePresent.getState().stage !== 'escape') return
    const t = performance.now() / 1000
    const p = playerState.position
    gates.forEach((x, i) => {
      const on = Math.sin(t * 1.9 + i * 1.3) > -0.1
      const m = refs.current[i]
      if (m) m.visible = on
      if (on && Math.abs(p.x - x) < 0.5 && p.z > -73 && p.z < -67 && !useGame.getState().overlay) {
        sfx('hurt')
        usePresent.setState({ stage: 'decide' })
        failTrial('present', 'Caught in the laser grid', ['The alarm lasers pin you in place. Watch their rhythm — they blink off in turn.', 'Retry from the office.'])
      }
    })
    if (performance.now() > usePresent.getState().escapeEnd && !useGame.getState().overlay) {
      usePresent.setState({ stage: 'decide' })
      failTrial('present', 'Lockdown', ['The tower sealed before you reached the elevator.', 'Retry from the office.'])
    }
    if (Math.abs(p.x - ELEVATOR[0]) < 2.4 && Math.abs(p.z - ELEVATOR[2]) < 2.6) {
      usePresent.setState({ stage: 'done' })
      sfx('achievement')
      const g = useGame.getState()
      g.completeTrial('present')
      g.openOverlay({
        type: 'trial-result',
        trial: 'present',
        success: true,
        title: 'Trial II complete',
        body: ['Every player in the OASIS saw the Consortium’s plan. Their contract is worthless now.', 'You chose the OASIS over the offer — the only right answer.', 'Rewards: Prism Key (lock III of the Founder’s Gate), Vanguard Armour, +15 coins, +300 XP.'],
      })
    }
  })
  return (
    <>
      {gates.map((x, i) => (
        <mesh key={x} ref={(m) => { refs.current[i] = m }} position={[x, 1.5, -70]} visible={stage === 'escape'} material={neonMaterial('#ff3040', 3)}>
          <boxGeometry args={[0.08, 3, 5.6]} />
        </mesh>
      ))}
      <group position={ELEVATOR}>
        <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]} material={neonMaterial('#3dff8b', stage === 'escape' ? 2.4 : 0.6)}>
          <circleGeometry args={[2, 32]} />
        </mesh>
        <NeonText position={[0, 3, 2.7]} rotation={[0, Math.PI, 0]} fontSize={0.4} color="#3dff8b">
          ELEVATOR
        </NeonText>
      </group>
    </>
  )
}

export default function PresentWorld() {
  const stage = usePresent((s) => s.stage)
  const detections = usePresent((s) => s.detections)
  const doorOpen = usePresent((s) => s.doorOpen)
  const [, force] = useState(0)
  useTrialSetup('present', () => {
    const s = usePresent.getState()
    if (s.stage === 'decide' || s.stage === 'escape') {
      usePresent.setState({ stage: 'decide', checkpoint: 'office' })
      playerState.teleport?.(CHECKPOINTS.office.pos, CHECKPOINTS.office.yaw)
    } else {
      usePresent.getState().reset()
      playerState.teleport?.(CHECKPOINTS.lobby.pos, CHECKPOINTS.lobby.yaw)
    }
  })
  useEffect(() => {
    usePresent.getState().reset()
    const id = window.setInterval(() => force((x) => x + 1), 500)
    return () => window.clearInterval(id)
  }, [])
  // checkpoint advance when entering the hall
  useFrame(() => {
    const s = usePresent.getState()
    if (s.checkpoint === 'lobby' && playerState.position.z < -31) usePresent.setState({ checkpoint: 'hall' })
  })
  const left = Math.max(0, Math.ceil((usePresent.getState().escapeEnd - performance.now()) / 1000))
  useEffect(() => {
    useTrialHud.getState().set({
      status: [
        stage === 'infiltrate' ? (doorOpen ? 'Reach the executive office' : 'Reach the server vault unseen') : stage === 'decide' ? 'Make your choice' : stage === 'escape' ? `ESCAPE · ${left}s` : 'Trial complete',
        `Times spotted: ${detections}`,
      ],
    })
  })
  return (
    <group>
      <Walls />
      <Terminals />
      <ColorLock />
      <Office />
      <Lasers />
      <Sentry kind="drone" path={[[-9, 0, -5], [9, 0, -5]]} speed={3.2} />
      <Sentry kind="drone" path={[[9, 0, -18], [-9, 0, -26], [-9, 0, -18], [9, 0, -26]]} speed={3} />
      <Sentry kind="camera" pos={[0, 4, -42]} sweep={[-1.2, 1.2]} speed={2} />
      <Sentry kind="drone" path={[[-10, 0, -50], [10, 0, -50]]} speed={2.6} />
      <TrialExit position={[0, 0, 10.5]} />
    </group>
  )
}
