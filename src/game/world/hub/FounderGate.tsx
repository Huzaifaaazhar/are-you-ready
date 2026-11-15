import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { CuboidCollider, RigidBody, type RapierRigidBody } from '@react-three/rapier'
import { AdditiveBlending, Color, Group, MeshBasicMaterial } from 'three'
import { GLYPHS, TRIALS } from '../../../data/content'
import { useGame } from '../../../store/useGame'
import { useInteractable } from '../../systems/interaction'
import { playerState } from '../../systems/playerState'
import { sfx } from '../../systems/audio'
import { Block } from '../common/Block'
import { GlyphMark } from '../common/Glyph'
import { ItemPickup } from '../common/ItemPickup'
import { Kiosk } from '../common/Kiosk'
import { NeonText } from '../common/NeonText'
import { Portal } from '../common/Portal'
import { neonMaterial, surfaceMaterial } from '../common/materials'
import { HUB_POS, TRIAL_PORTALS } from './layout'

const LOCK_COLORS = ['#ff9a4d', '#4d7cff', '#e0e0ff']
const beamMat = new MeshBasicMaterial({ color: new Color('#ffe14d').multiplyScalar(1.4), transparent: true, opacity: 0.25, blending: AdditiveBlending, depthWrite: false, toneMapped: false })

function TrialPortals() {
  const locks = useGame((s) => s.progress.locks)
  const gp = useGame((s) => s.progress.gpFinishes)
  const done = useGame((s) => s.progress.trials)
  return (
    <>
      {TRIAL_PORTALS.map(({ trial, pos }) => {
        const t = TRIALS.find((x) => x.id === trial)!
        const open = locks >= t.lock && (trial !== 'past' || gp > 0)
        if (open)
          return (
            <Portal
              key={trial}
              id={`portal-${trial}`}
              position={pos}
              rotationY={Math.PI / 2}
              label={t.name.toUpperCase()}
              sublabel={done.includes(trial) ? 'completed · replay' : t.subtitle}
              color={t.color}
              color2="#ffe14d"
              target={trial}
              radius={2.2}
            />
          )
        // Sealed plinth: clearly not a portal, explains what opens it.
        return (
          <group key={trial} position={pos} rotation={[0, Math.PI / 2, 0]}>
            <mesh position={[0, 0.15, 0]} material={surfaceMaterial('#1a1433', 0.4, 0.7)}>
              <cylinderGeometry args={[3, 3.3, 0.3, 32]} />
            </mesh>
            <NeonText position={[0, 1.4, 0]} fontSize={0.42} color="#5a4a80" intensity={1.2}>
              {`SEALED · ${t.name.toUpperCase()}`}
            </NeonText>
            <NeonText position={[0, 0.8, 0]} fontSize={0.22} color="#7a6aa0" intensity={1} mono maxWidth={5} textAlign="center">
              {locks < t.lock ? `Opens with lock ${['I', 'II', 'III'][t.lock - 1]} of the Founder’s Gate` : 'Finish the Velocity City Grand Prix first'}
            </NeonText>
          </group>
        )
      })}
    </>
  )
}

function Vault() {
  const vaultOpen = useGame((s) => s.progress.vaultOpen)
  const hasEgg = useGame((s) => s.progress.items.includes('founder-egg'))
  const beam = useRef<Group>(null)
  useFrame((s) => {
    if (beam.current) beam.current.rotation.y = s.clock.elapsedTime * 0.6
  })
  const [px, , pz] = HUB_POS.vaultPad
  const [vx, vy, vz] = HUB_POS.vault
  useInteractable({
    id: 'vault-up',
    position: [px, 1, pz],
    radius: 2,
    enabled: vaultOpen,
    label: 'Ride the light beam to the Founder’s Vault',
    onInteract: () => {
      sfx('portal')
      playerState.teleport?.([vx, vy + 1.2, vz + 3], 0)
    },
  })
  useInteractable({
    id: 'vault-down',
    position: [vx, vy + 1, vz + 5],
    radius: 1.8,
    enabled: vaultOpen,
    label: 'Ride the light beam back down',
    onInteract: () => {
      sfx('portal')
      playerState.teleport?.([px + 2, 1.2, pz], -Math.PI / 2)
    },
  })
  if (!vaultOpen) return null
  return (
    <>
      <group position={[px, 0, pz]}>
        <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]} material={neonMaterial('#ffe14d', 2.4)}>
          <ringGeometry args={[1.2, 1.5, 32]} />
        </mesh>
        <group ref={beam}>
          <mesh position={[0, 20, 0]} material={beamMat}>
            <cylinderGeometry args={[1.2, 1.2, 40, 16, 1, true]} />
          </mesh>
        </group>
      </group>
      <group position={[vx, vy, vz]}>
        <Block position={[0, -0.4, 0]} size={[12, 0.8, 14]} color="#1a1408" edge={neonMaterial('#ffe14d', 2.6)} />
        {[[-6, 0], [6, 0]].map(([x]) => (
          <Block key={x} position={[x, 1, 0]} size={[0.4, 2, 14]} color="#1a1408" edge={neonMaterial('#ffe14d', 1.6)} />
        ))}
        <Block position={[0, 1, -7]} size={[12, 2, 0.4]} color="#1a1408" edge={neonMaterial('#ffe14d', 1.6)} />
        <NeonText position={[0, 5, -6.5]} fontSize={0.9} color="#ffe14d">
          THE FOUNDER’S VAULT
        </NeonText>
        <NeonText position={[0, 4, -6.5]} fontSize={0.3} color="#ffffff" mono maxWidth={10} textAlign="center">
          “Thank you for playing my game.”
        </NeonText>
        <mesh position={[0, 0.05, 5]} rotation={[-Math.PI / 2, 0, 0]} material={neonMaterial('#00f0ff', 2.2)}>
          <ringGeometry args={[1, 1.3, 32]} />
        </mesh>
        <pointLight position={[0, 4, 0]} color="#ffe14d" intensity={60} distance={20} />
      </group>
      {!hasEgg && (
        <ItemPickup item="founder-egg" position={[vx, vy, vz - 3]} color="#ffe14d">
          <mesh scale={[0.8, 1.05, 0.8]} material={neonMaterial('#ffe14d', 2.2)}>
            <sphereGeometry args={[0.6, 24, 18]} />
          </mesh>
        </ItemPickup>
      )}
    </>
  )
}

/** The Founder's Gate: three locks, trial portals behind it, the hidden terminal, cipher lock and vault. */
export function FounderGate() {
  const locks = useGame((s) => s.progress.locks)
  const openOverlay = useGame((s) => s.openOverlay)
  const glyphs = useGame((s) => s.progress.glyphs)
  const vaultOpen = useGame((s) => s.progress.vaultOpen)
  const opened = locks >= 1
  const doorL = useRef<Group>(null)
  const doorR = useRef<Group>(null)
  const doorBody = useRef<RapierRigidBody>(null)
  const [gx, , gz] = HUB_POS.gate

  useInteractable({
    id: 'founder-gate',
    position: [gx + 3, 0, gz],
    radius: 5,
    label: `Inspect the Founder’s Gate (${locks}/3 locks open)`,
    onInteract: () => {
      useGame.getState().addJournal('riddle')
      openOverlay({ type: 'gate' })
    },
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
  const allMarks = glyphs.length >= GLYPHS.length

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
        {/* lock slots on the lintel */}
        {[0, 1, 2].map((i) => (
          <group key={i} position={[1.25, 8.5, (i - 1) * 1.8]} rotation={[0, Math.PI / 2, 0]}>
            <mesh material={neonMaterial(LOCK_COLORS[i], locks > i ? 3 : 0.6)}>
              <ringGeometry args={[0.38, 0.5, 32]} />
            </mesh>
            <NeonText position={[0, 0, 0.01]} fontSize={0.32} color={locks > i ? LOCK_COLORS[i] : '#6a5a90'} intensity={locks > i ? 2.6 : 1}>
              {['I', 'II', 'III'][i]}
            </NeonText>
          </group>
        ))}
        <pointLight position={[3, 5, 0]} color="#ff9a4d" intensity={opened ? 60 : 25} distance={16} />
      </group>
      <TrialPortals />
      {/* hidden terminal on the far side of the gate: mark 1, later the cipher lock */}
      <Kiosk
        id="dev-terminal"
        position={HUB_POS.devTerminal}
        rotationY={Math.PI / 2}
        title={vaultOpen ? 'CIPHER ACCEPTED' : allMarks ? 'CIPHER LOCK' : 'DEV LOG'}
        subtitle={allMarks ? 'enter the six marks' : 'access: anyone curious'}
        prompt={allMarks && !vaultOpen ? 'Use the cipher lock' : 'Read the hidden terminal'}
        color="#3dff8b"
        radius={2.6}
        onInteract={() => {
          const g = useGame.getState()
          g.discoverSecret('dev-terminal')
          if (!g.progress.glyphs.includes(1)) g.findGlyph(1)
          if (g.progress.glyphs.length >= GLYPHS.length && !g.progress.vaultOpen) {
            g.openOverlay({ type: 'cipher' })
            return
          }
          g.openOverlay({
            type: 'info',
            title: 'Hidden terminal · dev log 0001',
            accent: '#3dff8b',
            body: [
              '> If you are reading this, you walked around the gate instead of through it. Good instinct.',
              '> I hid six marks across my worlds. This is the first: the Sun. Each mark tells you where the next one sleeps.',
              `> ${GLYPHS[0].next}`,
              '> Find all six and come back here. — the Founder',
            ],
          })
        }}
      >
        <group position={[0, 3.3, 0]}>
          <GlyphMark index={1} size={0.35} color="#3dff8b" />
        </group>
      </Kiosk>
      <Vault />
    </group>
  )
}

/** Mark 2: carved into the north face of the spire's plinth. */
export function PlinthGlyph() {
  const found = useGame((s) => s.progress.glyphs.includes(2))
  const [x, y, z] = HUB_POS.glyph2
  useInteractable({
    id: 'glyph-2',
    position: [x, 1, z - 1.2],
    radius: 1.9,
    label: 'Inspect the strange carving',
    onInteract: () => {
      const g = useGame.getState()
      g.findGlyph(2)
      g.openOverlay({ type: 'info', title: 'A carving on the plinth', accent: '#ffe14d', body: ['A triangle with a line through its base — the Founder’s second mark, the Gate.', GLYPHS[1].next] })
    },
  })
  return (
    <group position={[x, y, z]} rotation={[0, Math.PI, 0]}>
      <GlyphMark index={2} size={0.3} color={found ? '#6a5a90' : '#c8a040'} />
    </group>
  )
}
