import { useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { CuboidCollider, RigidBody } from '@react-three/rapier'
import { Group, MeshStandardMaterial } from 'three'
import { GLYPHS, LIGHT_PADS, LIGHT_SEQUENCE, SECRETS } from '../../../data/content'
import { GlyphMark } from '../common/Glyph'
import { useGame } from '../../../store/useGame'
import { playMusic, sfx, type MusicPreset } from '../../systems/audio'
import { useInteractable } from '../../systems/interaction'
import { playerState } from '../../systems/playerState'
import { Block } from '../common/Block'
import { Coins } from '../common/Coins'
import { ItemPickup } from '../common/ItemPickup'
import { NeonText } from '../common/NeonText'
import { Particles } from '../common/Particles'
import { Portal } from '../common/Portal'
import { SkyDome } from '../common/SkyDome'
import { neonMaterial, surfaceMaterial } from '../common/materials'
import { Cabinet, NeonSign, Rain, useCarpetMaterial } from './ArcadeProps'
import { ARCADE_LAYOUT, ARCADE_POS, BACKROOM, CRATES, HALL, LEDGE, STREET } from './layout'

const WALL_H = 14

/** Street facades with colliders. Openings are left for the arcade hall and the prize shop. */
function Street() {
  const asphalt = useMemo(() => new MeshStandardMaterial({ color: '#0b0814', roughness: 0.18, metalness: 0.75 }), [])
  const facade = surfaceMaterial('#130c22', 0.7, 0.2)
  const facade2 = surfaceMaterial('#0f0a1e', 0.7, 0.2)
  const len = STREET.maxZ - STREET.minZ
  const midZ = (STREET.maxZ + STREET.minZ) / 2
  return (
    <>
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[80, 0.5, 80]} position={[0, -0.5, 0]} />
      </RigidBody>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, midZ]} material={asphalt}>
        <planeGeometry args={[STREET.maxX - STREET.minX, len]} />
      </mesh>
      {/* lane markings */}
      {Array.from({ length: 18 }, (_, i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, STREET.maxZ - 3 - i * 4.4]} material={neonMaterial('#ffe14d', 0.9)}>
          <planeGeometry args={[0.18, 2]} />
        </mesh>
      ))}
      {/* sidewalks glow edges */}
      {[-1, 1].map((s) => (
        <mesh key={s} rotation={[-Math.PI / 2, 0, 0]} position={[s * 8.5, 0.012, midZ]} material={neonMaterial(s < 0 ? '#ff2bd6' : '#00f0ff', 1.4)}>
          <planeGeometry args={[0.08, len]} />
        </mesh>
      ))}
      {/* left facade: z from maxZ to 8, and -8 to minZ */}
      <Block position={[STREET.minX - 2, WALL_H / 2, (STREET.maxZ + 8) / 2]} size={[4, WALL_H, STREET.maxZ - 8]} material={facade} />
      <Block position={[STREET.minX - 2, WALL_H / 2, (-8 + STREET.minZ) / 2]} size={[4, WALL_H, -8 - STREET.minZ]} material={facade2} />
      <Block position={[HALL.minX + (HALL.maxX - HALL.minX) / 2 - 1, WALL_H / 2 + 3, 0]} size={[HALL.maxX - HALL.minX + 2, WALL_H - 6, 16]} material={facade} visible />
      {/* right facade with shop recess z -9..-3 */}
      <Block position={[STREET.maxX + 2, WALL_H / 2, (STREET.maxZ - 3) / 2]} size={[4, WALL_H, STREET.maxZ + 3]} material={facade2} />
      <Block position={[STREET.maxX + 2, WALL_H / 2, (-9 + STREET.minZ) / 2]} size={[4, WALL_H, -9 - STREET.minZ]} material={facade} />
      <Block position={[STREET.maxX + 3.6, WALL_H / 2, -6]} size={[0.8, WALL_H, 6]} material={facade} />
      <Block position={[STREET.maxX + 1.6, 9.5, -6]} size={[3.2, 8, 6]} material={facade} />
      {/* end walls */}
      <Block position={[0, WALL_H / 2, STREET.minZ - 0.5]} size={[STREET.maxX - STREET.minX + 8, WALL_H, 1]} material={facade2} />
      <Block position={[0, WALL_H / 2, STREET.maxZ + 0.5]} size={[STREET.maxX - STREET.minX + 8, WALL_H, 1]} material={facade2} />
      {/* windows on facades */}
      {Array.from({ length: 14 }, (_, i) => {
        const z = STREET.maxZ - 4 - i * 5.6
        if (z < 10 && z > -10) return null
        return [-1, 1].map((s) => (
          <mesh key={`${i}${s}`} position={[s * (STREET.maxX - 0.01) * (s < 0 ? 1 : 1), 8 + (i % 3), z]} rotation={[0, -s * Math.PI / 2, 0]} material={neonMaterial(i % 2 ? '#ffb86b' : '#6b8cff', 0.9)}>
            <planeGeometry args={[2.2, 1.2]} />
          </mesh>
        ))
      })}
      {/* neon arches across the street */}
      {[22, 2, -18, -36].map((z, i) => (
        <group key={z} position={[0, 0, z]}>
          <mesh position={[0, 2, 0]} material={neonMaterial(['#ff2bd6', '#00f0ff', '#ffe14d', '#9d4dff'][i], 2.6)}>
            <torusGeometry args={[STREET.maxX, 0.08, 6, 48, Math.PI]} />
          </mesh>
        </group>
      ))}
    </>
  )
}

function Signs() {
  return (
    <>
      <NeonSign position={[STREET.minX + 0.05, 9, 0]} rotationY={Math.PI / 2} text="PIXEL PALACE" color="#ff2bd6" size={1.6} />
      <NeonSign position={[STREET.minX + 0.05, 7.6, 0]} rotationY={Math.PI / 2} text="ARCADE · OPEN 25 HRS" color="#ffe14d" size={0.5} mono flicker />
      <NeonSign position={[STREET.minX + 0.05, 5.5, 20]} rotationY={Math.PI / 2} text="NOODLE BAR 8-BIT" color="#3dff8b" size={0.8} flicker />
      <NeonSign position={[STREET.minX + 0.05, 6, -24]} rotationY={Math.PI / 2} text="VHS REWIND" color="#00f0ff" size={0.9} />
      <NeonSign position={[STREET.maxX - 0.05, 9.5, -6]} rotationY={-Math.PI / 2} text="PRIZE ZONE" color="#ffe14d" size={1.3} />
      <NeonSign position={[STREET.maxX - 0.05, 6.5, 14]} rotationY={-Math.PI / 2} text="CHIPTUNE CLUB" color="#9d4dff" size={0.9} flicker />
      <NeonSign position={[STREET.maxX - 0.05, 10, -36]} rotationY={-Math.PI / 2} text="INSERT COIN" color="#ff4d4d" size={1} flicker />
      <NeonSign position={[0, 10, STREET.minZ + 0.05]} text="ARCADE DISTRICT" color="#00f0ff" size={2} />
      <NeonSign position={[0, 8, STREET.minZ + 0.05]} text="RETRO SECTOR 8-B" color="#ff2bd6" size={0.7} mono />
    </>
  )
}

function Hall() {
  const carpet = useCarpetMaterial()
  const wall = surfaceMaterial('#170e2c', 0.8, 0.1)
  const discovered = useGame((s) => s.progress.secrets.includes('hidden-cabinet'))
  const w = HALL.maxX - HALL.minX
  const cx = (HALL.maxX + HALL.minX) / 2
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[cx, 0.005, 0]} material={carpet}>
        <planeGeometry args={[w, HALL.maxZ - HALL.minZ]} />
      </mesh>
      <Block position={[cx, 3, HALL.minZ - 0.2]} size={[w, 6, 0.4]} material={wall} />
      <Block position={[cx, 3, HALL.maxZ + 0.2]} size={[w, 6, 0.4]} material={wall} />
      {/* west wall with doorway z -0.8..0.8 */}
      <Block position={[HALL.minX - 0.2, 3, (HALL.minZ - 0.8) / 2]} size={[0.4, 6, -0.8 - HALL.minZ]} material={wall} />
      <Block position={[HALL.minX - 0.2, 3, (HALL.maxZ + 0.8) / 2]} size={[0.4, 6, HALL.maxZ - 0.8]} material={wall} />
      <Block position={[HALL.minX - 0.2, 4.6, 0]} size={[0.4, 2.8, 1.6]} material={wall} />
      {/* ceiling (visual) and light strips */}
      <mesh position={[cx, 6, 0]} rotation={[Math.PI / 2, 0, 0]} material={surfaceMaterial('#0a0614', 0.9, 0)}>
        <planeGeometry args={[w, HALL.maxZ - HALL.minZ]} />
      </mesh>
      {[-6, 0, 6].map((z, i) => (
        <mesh key={z} position={[cx, 5.95, z]} material={neonMaterial(['#ff2bd6', '#00f0ff', '#9d4dff'][i], 2.4)}>
          <boxGeometry args={[w - 2, 0.06, 0.18]} />
        </mesh>
      ))}
      <pointLight position={[cx, 4.5, -5]} color="#ff2bd6" intensity={40} distance={18} />
      <pointLight position={[cx, 4.5, 6]} color="#00f0ff" intensity={40} distance={18} />
      {/* back room (secret) */}
      <group visible={discovered}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[(BACKROOM.minX + BACKROOM.maxX) / 2, 0.005, 0]} material={surfaceMaterial('#1a0f08', 0.9, 0.1)}>
          <planeGeometry args={[BACKROOM.maxX - BACKROOM.minX, BACKROOM.maxZ - BACKROOM.minZ]} />
        </mesh>
        <NeonText position={[BACKROOM.minX + 0.25, 3.2, 0]} rotation={[0, Math.PI / 2, 0]} fontSize={0.5} color="#ff9a4d">
          FOUNDER’S STORAGE
        </NeonText>
        <NeonText position={[BACKROOM.minX + 0.25, 2.4, 0]} rotation={[0, Math.PI / 2, 0]} fontSize={0.22} color="#ffe14d" mono maxWidth={8} textAlign="center">
          “the best secrets are behind the things that refuse to work.”
        </NeonText>
        <pointLight position={[-36, 3.5, 0]} color="#ff9a4d" intensity={30} distance={12} />
      </group>
      <Block position={[(BACKROOM.minX + BACKROOM.maxX) / 2, 3, BACKROOM.minZ - 0.2]} size={[BACKROOM.maxX - BACKROOM.minX, 6, 0.4]} material={wall} />
      <Block position={[(BACKROOM.minX + BACKROOM.maxX) / 2, 3, BACKROOM.maxZ + 0.2]} size={[BACKROOM.maxX - BACKROOM.minX, 6, 0.4]} material={wall} />
      <Block position={[BACKROOM.minX - 0.2, 3, 0]} size={[0.4, 6, BACKROOM.maxZ - BACKROOM.minZ + 0.8]} material={wall} />
      <mesh position={[(BACKROOM.minX + BACKROOM.maxX) / 2, 6, 0]} rotation={[Math.PI / 2, 0, 0]} material={surfaceMaterial('#0a0614', 0.9, 0)}>
        <planeGeometry args={[BACKROOM.maxX - BACKROOM.minX, BACKROOM.maxZ - BACKROOM.minZ]} />
      </mesh>
    </>
  )
}

const ORACLE_LINES = [
  ...SECRETS.map((s) => s.hint),
  'The Founder’s Gate waits in OASIS Prime. Its first lock is copper-coloured.',
  'Coins are currency here. The Prize Zone across the street trades them for gear.',
  'Every cabinet hands a prize to the first player who beats its target.',
  'The Founder hid six marks across the worlds. Each one points to the next. Start behind the Founder’s Gate.',
  'In Velocity City, the racers never look behind the starting grid. They should.',
  'Glitch Hop’s core door is marked. Only those who reach it will see.',
]

function Cabinets() {
  const open = useGame((s) => s.openOverlay)
  const discovered = useGame((s) => s.progress.secrets.includes('hidden-cabinet'))
  const broken = useRef<Group>(null)
  useFrame((_, dt) => {
    if (!broken.current) return
    const target = discovered ? 2.2 : 0
    broken.current.position.z += (target - broken.current.position.z) * Math.min(1, dt * 2)
  })
  const [bx, , bz] = ARCADE_POS.broken
  return (
    <>
      <Cabinet id="cab-serpent" position={ARCADE_POS.serpent} title="NEON SERPENT" color="#3dff8b" style={0} prompt="Play NEON SERPENT" onInteract={() => open({ type: 'arcade', game: 'serpent' })} />
      <Cabinet id="cab-lancer" position={ARCADE_POS.lancer} title="STAR LANCER" color="#ff2bd6" style={1} prompt="Play STAR LANCER (space battle)" onInteract={() => open({ type: 'arcade', game: 'lancer' })} />
      <Cabinet id="cab-glitchhop" position={ARCADE_POS.glitchhop} rotationY={Math.PI} title="GLITCH HOP" color="#3dff8b" style={0} prompt="Play GLITCH HOP (platformer)" onInteract={() => open({ type: 'arcade', game: 'glitchhop' })} />
      <Cabinet id="cab-gladiator" position={ARCADE_POS.gladiator} rotationY={Math.PI} title="GRID GLADIATOR" color="#ff4d4d" style={2} prompt="Play GRID GLADIATOR (arena)" onInteract={() => open({ type: 'arcade', game: 'gladiator' })} />
      <Cabinet
        id="cab-oracle"
        position={ARCADE_POS.oracle}
        title="PIXEL ORACLE"
        color="#9d4dff"
        style={2}
        prompt="Ask the Pixel Oracle for a hint"
        onInteract={() => {
          const i = useGame.getState().nextOracle()
          sfx('select')
          open({ type: 'info', title: 'The Pixel Oracle speaks', accent: '#9d4dff', body: [ORACLE_LINES[i % ORACLE_LINES.length], `(fortune ${(i % ORACLE_LINES.length) + 1} of ${ORACLE_LINES.length} — ask again for another)`] })
        }}
      />
      {/* The machine that will not play: blocks the doorway to the back room until pushed aside. */}
      <group ref={broken} position={[0, 0, 0]}>
        <Cabinet
          id="cab-broken"
          position={[bx, 0, bz]}
          rotationY={Math.PI / 2}
          title="OUT OF ORDER"
          color="#ff4d4d"
          style={3}
          prompt={discovered ? 'Inspect the broken cabinet' : 'Inspect the out-of-order cabinet'}
          noCollider
          onInteract={() => {
            const g = useGame.getState()
            if (!g.progress.secrets.includes('hidden-cabinet')) {
              g.discoverSecret('hidden-cabinet')
              g.openOverlay({ type: 'info', title: 'OUT OF ORDER', accent: '#ff4d4d', body: ['The screen is dead, but a cold draft leaks from behind the cabinet.', 'You lean your weight into it… and it slides aside on hidden rails, revealing a doorway.'] })
            } else {
              g.openOverlay({ type: 'info', title: 'OUT OF ORDER', accent: '#ff4d4d', body: ['Still broken. Still the best machine in the building.'] })
            }
          }}
        />
      </group>
      <RigidBody key={discovered ? 'moved' : 'blocking'} type="fixed" colliders={false}>
        <CuboidCollider args={[0.5, 1.2, 0.75]} position={[bx, 1.2, bz + (discovered ? 2.2 : 0)]} />
      </RigidBody>
    </>
  )
}

const JUKEBOX: { preset: MusicPreset; name: string }[] = [
  { preset: 'arcade', name: 'Sector 8-B (house mix)' },
  { preset: 'arcade-synthwave', name: 'Midnight Drive' },
  { preset: 'arcade-chip', name: 'Chip Fever' },
]
let jukeboxIndex = 0

function Jukebox() {
  const [track, setTrack] = useState(jukeboxIndex)
  const [x, , z] = ARCADE_POS.jukebox
  useInteractable({
    id: 'jukebox',
    position: [x, 1, z - 1.2],
    radius: 2,
    label: `Change jukebox track (now: ${JUKEBOX[track].name})`,
    onInteract: () => {
      jukeboxIndex = (jukeboxIndex + 1) % JUKEBOX.length
      setTrack(jukeboxIndex)
      playMusic(JUKEBOX[jukeboxIndex].preset)
      sfx('select')
      useGame.getState().toast({ kind: 'info', title: 'Now playing', body: JUKEBOX[jukeboxIndex].name })
    },
  })
  return (
    <group position={[x, 0, z]} rotation={[0, Math.PI, 0]}>
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[0.7, 1.1, 0.4]} position={[0, 1.1, 0]} />
      </RigidBody>
      <mesh position={[0, 1, 0]} material={surfaceMaterial('#3a1020', 0.4, 0.5)}>
        <boxGeometry args={[1.4, 2, 0.8]} />
      </mesh>
      <mesh position={[0, 2, 0]} rotation={[Math.PI / 2, 0, 0]} material={neonMaterial('#ffe14d', 2)}>
        <torusGeometry args={[0.7, 0.06, 8, 24, Math.PI]} />
      </mesh>
      <mesh position={[0, 1.3, 0.41]} material={neonMaterial(['#ff2bd6', '#00f0ff', '#3dff8b'][track], 1.2)}>
        <planeGeometry args={[1.1, 0.7]} />
      </mesh>
      <NeonText position={[0, 0.7, 0.42]} fontSize={0.12} color="#ffffff" mono maxWidth={1.2} textAlign="center">
        {JUKEBOX[track].name}
      </NeonText>
      <NeonText position={[0, 2.5, 0]} fontSize={0.2} color="#ffe14d">
        JUKEBOX
      </NeonText>
    </group>
  )
}

function ScoreBoard() {
  const open = useGame((s) => s.openOverlay)
  const scores = useGame((s) => s.progress.highScores)
  const [x, , z] = ARCADE_POS.scores
  useInteractable({ id: 'scoreboard', position: [x, 1, z - 1.5], radius: 2.6, label: 'Read the high score board', onInteract: () => open({ type: 'scores' }) })
  return (
    <group position={[x, 0, z]} rotation={[0, Math.PI, 0]}>
      <mesh position={[0, 3, 0]} material={surfaceMaterial('#05030c', 0.5, 0.2)}>
        <boxGeometry args={[4.4, 2.4, 0.2]} />
      </mesh>
      <mesh position={[0, 3, 0.11]} material={neonMaterial('#ffe14d', 0.25)}>
        <planeGeometry args={[4.2, 2.2]} />
      </mesh>
      <NeonText position={[0, 3.75, 0.13]} fontSize={0.32} color="#ffe14d">
        HIGH SCORES
      </NeonText>
      {[
        ['NEON SERPENT ', scores.serpent, '#3dff8b'],
        ['STAR LANCER  ', scores.lancer, '#ff2bd6'],
        ['GLITCH HOP   ', scores.glitchhop, '#3dff8b'],
        ['GRID GLADIATR', scores.gladiator, '#ff4d4d'],
      ].map(([label, v, c], i) => (
        <NeonText key={label as string} position={[0, 3.25 - i * 0.36, 0.13]} fontSize={0.19} color={c as string} mono>
          {`${label} ${String(v ?? 0).padStart(5, '0')}`}
        </NeonText>
      ))}
    </group>
  )
}

function PrizeZone() {
  const open = useGame((s) => s.openOverlay)
  const [x, , z] = ARCADE_POS.prize
  useInteractable({ id: 'prize-counter', position: [x - 1, 1, z], radius: 2.6, label: 'Trade coins at the Prize Zone counter', onInteract: () => open({ type: 'shop' }) })
  return (
    <group position={[x, 0, z]}>
      <Block position={[0.8, 0.55, 0]} size={[0.8, 1.1, 5]} color="#2a1030" edge={neonMaterial('#ffe14d', 2.4)} />
      <mesh position={[2.2, 2.5, 0]} rotation={[0, -Math.PI / 2, 0]} material={neonMaterial('#ffe14d', 0.3)}>
        <planeGeometry args={[5.6, 3]} />
      </mesh>
      {[-1.5, 0, 1.5].map((dz, i) => (
        <mesh key={dz} position={[1.6, 2.2 + (i % 2) * 0.6, dz]} material={neonMaterial(['#00f0ff', '#ff2bd6', '#3dff8b'][i], 2.2)}>
          <octahedronGeometry args={[0.32, 0]} />
        </mesh>
      ))}
      <pointLight position={[0, 3, 0]} color="#ffe14d" intensity={25} distance={10} />
    </group>
  )
}

function Poster() {
  const [x, y, z] = ARCADE_POS.poster
  useInteractable({
    id: 'poster',
    position: [x - 1.2, 1, z],
    radius: 2.6,
    label: 'Read the faded poster',
    onInteract: () => {
      useGame.getState().addJournal('lights')
      useGame.getState().openOverlay({
        type: 'info',
        title: 'A faded tour poster',
        accent: '#ffe14d',
        body: ['“THE LIGHTS REMEMBER — LIVE AT SECTOR 8-B”', 'Three dots are printed under the title, worn but clear: first the SUN, then the SKY, then the BLOOM.', 'Somewhere on this street, the lights are waiting for someone to remember.'],
      })
    },
  })
  return (
    <group position={[x, y, z]} rotation={[0, -Math.PI / 2, 0]}>
      <mesh material={surfaceMaterial('#2a1a3a', 0.9, 0)}>
        <planeGeometry args={[1.8, 2.4]} />
      </mesh>
      <NeonText position={[0, 0.75, 0.01]} fontSize={0.16} color="#ffffff" intensity={1.3} maxWidth={1.6} textAlign="center">
        THE LIGHTS REMEMBER
      </NeonText>
      {['#ffe14d', '#00f0ff', '#ff2bd6'].map((c, i) => (
        <mesh key={c} position={[(i - 1) * 0.45, 0.05, 0.01]} material={neonMaterial(c, 1.2)}>
          <circleGeometry args={[0.16, 20]} />
        </mesh>
      ))}
      <NeonText position={[0, -0.65, 0.01]} fontSize={0.1} color="#ffe14d" intensity={1} mono>
        LIVE · SECTOR 8-B
      </NeonText>
    </group>
  )
}

function LightPads() {
  const solved = useGame((s) => s.progress.secrets.includes('light-sequence'))
  const [step, setStepState] = useState(0)
  const stepRef = useRef(0)
  const setStep = (n: number) => {
    stepRef.current = n
    setStepState(n)
  }
  const inside = useRef<string | null>(null)
  const flash = useRef(0)
  const z = ARCADE_POS.pads
  const xs = [-6, -2, 2, 6]
  useFrame((_, dt) => {
    flash.current = Math.max(0, flash.current - dt)
    if (solved) return
    const p = playerState.position
    let on: string | null = null
    LIGHT_PADS.forEach((pad, i) => {
      if (Math.abs(p.x - xs[i]) < 1.2 && Math.abs(p.z - z) < 1.2 && p.y < 2.2) on = pad.id
    })
    if (on === inside.current) return
    inside.current = on
    if (!on) return
    const step = stepRef.current
    if (on === LIGHT_SEQUENCE[step]) {
      const next = step + 1
      if (next >= LIGHT_SEQUENCE.length) {
        setStep(next)
        useGame.getState().discoverSecret('light-sequence')
      } else {
        sfx('select')
        setStep(next)
      }
    } else {
      sfx('error')
      flash.current = 0.5
      setStep(on === LIGHT_SEQUENCE[0] ? 1 : 0)
    }
  })
  return (
    <group>
      {LIGHT_PADS.map((pad, i) => {
        const lit = solved || LIGHT_SEQUENCE.slice(0, step).includes(pad.id as (typeof LIGHT_SEQUENCE)[number])
        return (
          <group key={pad.id} position={[xs[i], 0, z]}>
            <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]} material={neonMaterial(pad.color, lit ? 2.6 : 0.6)}>
              <planeGeometry args={[2, 2]} />
            </mesh>
            <mesh position={[0, 0.035, 0]} rotation={[-Math.PI / 2, 0, 0]} material={neonMaterial(pad.color, 2.4)}>
              <ringGeometry args={[1.25, 1.35, 4, 1, Math.PI / 4]} />
            </mesh>
            <NeonText position={[0, 0.06, 1.4]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.28} color={pad.color} mono>
              {pad.label}
            </NeonText>
          </group>
        )
      })}
      {solved && (
        <ItemPickup item="glitch-cube" position={ARCADE_POS.glitchCube} color="#ff2bd6">
          <mesh material={neonMaterial('#ff2bd6', 2)}>
            <boxGeometry args={[0.5, 0.5, 0.5]} />
          </mesh>
          <mesh rotation={[0.6, 0.6, 0]} material={neonMaterial('#00f0ff', 2)}>
            <boxGeometry args={[0.3, 0.3, 0.3]} />
          </mesh>
        </ItemPickup>
      )}
    </group>
  )
}

function BackroomMark() {
  const discovered = useGame((s) => s.progress.secrets.includes('hidden-cabinet'))
  const found = useGame((s) => s.progress.glyphs.includes(3))
  const [x, y, z] = ARCADE_POS.glyph3
  useInteractable({
    id: 'glyph-3',
    position: [x + 1.5, 1, z],
    radius: 2,
    enabled: discovered,
    label: 'Inspect the mark on the wall',
    onInteract: () => {
      const g = useGame.getState()
      g.findGlyph(3)
      g.openOverlay({ type: 'info', title: 'A mark in the Founder’s storage', accent: '#ffe14d', body: ['Painted in copper above an old workbench: a diamond on a stem, like a key. The third mark.', GLYPHS[2].next] })
    },
  })
  return (
    <group position={[x, y, z]} rotation={[0, Math.PI / 2, 0]} visible={discovered}>
      <GlyphMark index={3} size={0.5} color={found ? '#6a5a90' : '#ff9a4d'} />
    </group>
  )
}

function Props() {
  const crate = surfaceMaterial('#2a1f12', 0.8, 0.1)
  return (
    <>
      {CRATES.map((c, i) => (
        <Block key={i} position={[c.pos[0], c.pos[1] / 2, c.pos[2]]} size={[c.size, c.pos[1], c.size]} material={crate} edge={neonMaterial('#ff9a4d', 1.2)} />
      ))}
      <Block position={LEDGE.pos} size={LEDGE.size} color="#1c1230" edge={neonMaterial('#ff2bd6', 2.2)} />
      {/* awning stripes above the ledge */}
      {Array.from({ length: 6 }, (_, i) => (
        <mesh key={i} position={[LEDGE.pos[0] + 0.2, LEDGE.pos[1] + 2.4, LEDGE.pos[2] - 3.75 + i * 1.5]} rotation={[0, 0, -0.35]} material={neonMaterial(i % 2 ? '#ff2bd6' : '#ffffff', i % 2 ? 1.6 : 0.8)}>
          <boxGeometry args={[2.6, 0.05, 1.5]} />
        </mesh>
      ))}
      {/* vending machines (decor) */}
      {[[9.8, 0, 6], [9.8, 0, 7.6]].map((p, i) => (
        <group key={i} position={p as [number, number, number]}>
          <mesh position={[0, 1.1, 0]} material={surfaceMaterial('#101030', 0.4, 0.5)}>
            <boxGeometry args={[1, 2.2, 1.4]} />
          </mesh>
          <mesh position={[-0.51, 1.3, 0]} rotation={[0, -Math.PI / 2, 0]} material={neonMaterial(i ? '#3dff8b' : '#00f0ff', 1.1)}>
            <planeGeometry args={[1.1, 1.4]} />
          </mesh>
        </group>
      ))}
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[0.5, 1.1, 1.5]} position={[9.8, 1.1, 6.8]} />
      </RigidBody>
    </>
  )
}

export default function ArcadeWorld() {
  const quality = useGame((s) => s.settings.quality)
  return (
    <group>
      <SkyDome top="#05010d" horizon="#5a0d4a" bottom="#05010d" />
      <Street />
      <Signs />
      <Hall />
      <Cabinets />
      <Jukebox />
      <ScoreBoard />
      <PrizeZone />
      <Poster />
      <LightPads />
      <Props />
      <BackroomMark />
      <ItemPickup item="copper-key" position={ARCADE_POS.key} color="#ff9a4d">
        <group rotation={[0, 0, Math.PI / 2]}>
          <mesh position={[0, 0.25, 0]} material={neonMaterial('#ff9a4d', 2.2)}>
            <torusGeometry args={[0.16, 0.05, 8, 20]} />
          </mesh>
          <mesh position={[0, -0.12, 0]} material={neonMaterial('#ff9a4d', 2.2)}>
            <boxGeometry args={[0.07, 0.6, 0.07]} />
          </mesh>
          <mesh position={[0.08, -0.32, 0]} material={neonMaterial('#ff9a4d', 2.2)}>
            <boxGeometry args={[0.14, 0.06, 0.07]} />
          </mesh>
        </group>
      </ItemPickup>
      <Portal id="portal-hub" position={ARCADE_POS.portal} rotationY={Math.PI} label="OASIS PRIME" sublabel="return to the central hub" color="#00f0ff" color2="#9d4dff" target="hub" spawnId="fromArcade" radius={2.4} />
      {quality === 'high' && <Rain />}
      <Particles count={quality === 'high' ? 300 : 100} area={[24, 12, 80]} center={[0, 0, -5]} color="#ff2bd6" color2="#ffe14d" size={4} rise={0.3} />
      <pointLight position={[0, 6, 20]} color="#ff2bd6" intensity={50} distance={30} />
      <pointLight position={[0, 6, -10]} color="#00f0ff" intensity={50} distance={30} />
      <pointLight position={[0, 6, -34]} color="#ffe14d" intensity={40} distance={26} />
      <Coins coins={ARCADE_LAYOUT.coins} />
    </group>
  )
}
