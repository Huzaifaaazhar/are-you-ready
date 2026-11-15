import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { create } from 'zustand'
import { Group } from 'three'
import { JOURNAL } from '../../../../data/content'
import { useGame } from '../../../../store/useGame'
import { useInteractable } from '../../../systems/interaction'
import { playerState } from '../../../systems/playerState'
import { sfx } from '../../../systems/audio'
import { Block } from '../../common/Block'
import { GlyphMark } from '../../common/Glyph'
import { NeonText } from '../../common/NeonText'
import { Particles } from '../../common/Particles'
import { neonMaterial, surfaceMaterial } from '../../common/materials'
import { failTrial, TrialExit, useTrialHud, useTrialSetup } from '../common'
import { BED, FOUNDER_CHAIR, MEMORY_ORDER, MEMORY_ORIGINS, PEDESTALS, ROOK_CHAIR, ROOM, type MemoryId } from './layout'

type Where = 'origin' | 'carried' | number
type Phase = 'restore' | 'understand' | 'done'

interface PastState {
  where: Record<MemoryId, Where>
  carrying: MemoryId | 'controller' | null
  integrity: number
  phase: Phase
  controller: 'hidden' | 'carried' | 'placed'
  reset: () => void
}

const initialWhere = (): Record<MemoryId, Where> => ({ 'mem-ticket': 'origin', 'mem-map': 'origin', 'mem-cart': 'origin', 'mem-letter': 'origin' })

export const usePast = create<PastState>((set) => ({
  where: initialWhere(),
  carrying: null,
  integrity: 3,
  phase: 'restore',
  controller: 'hidden',
  reset: () => set({ where: initialWhere(), carrying: null, integrity: 3, phase: 'restore', controller: 'hidden' }),
}))
if (typeof window !== 'undefined') (window as unknown as { __past: typeof usePast }).__past = usePast

const LABEL: Record<MemoryId, string> = { 'mem-ticket': 'arcade ticket', 'mem-map': 'graph-paper level map', 'mem-cart': 'prototype cartridge', 'mem-letter': 'unanswered letter' }

function MemoryModel({ id }: { id: MemoryId | 'controller' }) {
  if (id === 'mem-ticket')
    return (
      <mesh material={neonMaterial('#ff6ac1', 1.4)}>
        <boxGeometry args={[0.5, 0.02, 0.25]} />
      </mesh>
    )
  if (id === 'mem-map')
    return (
      <group>
        <mesh material={neonMaterial('#bfe8ff', 1.2)}>
          <boxGeometry args={[0.6, 0.02, 0.45]} />
        </mesh>
        {[-0.15, 0, 0.15].map((x) => (
          <mesh key={x} position={[x, 0.012, 0]} material={neonMaterial('#4d7cff', 2)}>
            <boxGeometry args={[0.01, 0.005, 0.44]} />
          </mesh>
        ))}
      </group>
    )
  if (id === 'mem-cart')
    return (
      <group>
        <mesh material={surfaceMaterial('#5a5a6a', 0.5, 0.3)}>
          <boxGeometry args={[0.4, 0.45, 0.08]} />
        </mesh>
        <mesh position={[0, 0.05, 0.045]} material={neonMaterial('#ff9a4d', 1.6)}>
          <planeGeometry args={[0.3, 0.22]} />
        </mesh>
      </group>
    )
  if (id === 'mem-letter')
    return (
      <mesh material={neonMaterial('#fff2d6', 1.3)}>
        <boxGeometry args={[0.5, 0.03, 0.32]} />
      </mesh>
    )
  return (
    <group>
      <mesh material={surfaceMaterial('#2a2a35', 0.5, 0.3)}>
        <boxGeometry args={[0.5, 0.1, 0.25]} />
      </mesh>
      {[-0.12, 0.12].map((x) => (
        <mesh key={x} position={[x, 0.06, 0]} material={neonMaterial(x < 0 ? '#ff4d4d' : '#3dff8b', 2)}>
          <cylinderGeometry args={[0.04, 0.04, 0.03, 10]} />
        </mesh>
      ))}
    </group>
  )
}

function readMemory(id: MemoryId | 'mem-controller') {
  const g = useGame.getState()
  const first = !g.progress.journal.includes(id)
  g.addJournal(id)
  if (first) {
    const j = JOURNAL[id]
    g.openOverlay({ type: 'info', title: j.title, accent: '#ff9a4d', body: [j.text, id === 'mem-controller' ? '' : 'You carry the memory with you. Place it on a projector pedestal.'].filter(Boolean) })
  }
}

function MemoryObject({ id }: { id: MemoryId }) {
  const where = usePast((s) => s.where[id])
  const carrying = usePast((s) => s.carrying)
  const ref = useRef<Group>(null)
  const pos = MEMORY_ORIGINS[id]
  useInteractable({
    id: `mem-${id}`,
    position: [pos[0], pos[1] - 0.6, pos[2]],
    radius: 2,
    enabled: where === 'origin' && carrying === null,
    label: `Pick up the ${LABEL[id]}`,
    onInteract: () => {
      usePast.setState((s) => ({ carrying: id, where: { ...s.where, [id]: 'carried' } }))
      sfx('select')
      readMemory(id)
    },
  })
  useFrame((s) => {
    if (ref.current) ref.current.rotation.y = s.clock.elapsedTime * 0.8
  })
  if (where !== 'origin') return null
  return (
    <group position={pos}>
      <group ref={ref}>
        <MemoryModel id={id} />
      </group>
      <pointLight color="#ffb070" intensity={4} distance={3} />
    </group>
  )
}

/** The carried memory floats above the avatar. */
function Carried() {
  const carrying = usePast((s) => s.carrying)
  const ref = useRef<Group>(null)
  useFrame((s) => {
    const p = playerState.position
    ref.current?.position.set(p.x, p.y + 1.7 + Math.sin(s.clock.elapsedTime * 3) * 0.05, p.z)
    if (ref.current) ref.current.rotation.y = s.clock.elapsedTime
  })
  if (!carrying) return null
  return (
    <group ref={ref}>
      <MemoryModel id={carrying} />
    </group>
  )
}

function evaluate() {
  const s = usePast.getState()
  const placed = MEMORY_ORDER.map((_, i) => (Object.keys(s.where) as MemoryId[]).find((k) => s.where[k] === i))
  if (placed.some((p) => !p)) return
  const wrong = placed.map((p, i) => p !== MEMORY_ORDER[i])
  if (!wrong.some(Boolean)) {
    sfx('unlock')
    usePast.setState({ phase: 'understand' })
    const g = useGame.getState()
    g.openOverlay({
      type: 'info',
      title: 'The memory replays',
      accent: '#ff9a4d',
      body: [
        'The projector flickers to life. Two kids at an arcade. Graph paper and solder. A cartridge, an argument, a letter left unanswered.',
        'In the last frame the Founder sits alone in front of the television, the second chair empty beside them.',
        'The archive whispers: “Some things were kept for someone who never came back.”',
        'New objective: find what the Founder kept for Rook, and return it to Rook’s place.',
      ],
    })
    return
  }
  const integrity = s.integrity - 1
  sfx('error')
  if (integrity <= 0) {
    usePast.setState({ integrity: 0 })
    failTrial('past', 'The memory collapsed', ['Too many moments were forced out of order and the archive could not hold.', 'Read the memories again — each one says when it happened.'])
    return
  }
  // Wrong memories return to where they were found.
  const where = { ...s.where }
  placed.forEach((p, i) => {
    if (p && wrong[i]) where[p] = 'origin'
  })
  usePast.setState({ where, integrity })
  useGame.getState().toast({ kind: 'error', title: 'The memory glitches', body: `${wrong.filter(Boolean).length} out of order · integrity ${integrity}/3` })
}

function Pedestal({ index }: { index: number }) {
  const where = usePast((s) => s.where)
  const carrying = usePast((s) => s.carrying)
  const phase = usePast((s) => s.phase)
  const occupant = (Object.keys(where) as MemoryId[]).find((k) => where[k] === index)
  const pos = PEDESTALS[index]
  const label = carrying && carrying !== 'controller' ? `Place the ${LABEL[carrying]} on pedestal ${['I', 'II', 'III', 'IV'][index]}` : occupant ? `Take the ${LABEL[occupant]} back` : `Pedestal ${['I', 'II', 'III', 'IV'][index]} (empty)`
  useInteractable({
    id: `ped-${index}`,
    position: [pos[0], 1, pos[2] + 0.9],
    radius: 0.95,
    enabled: phase === 'restore' && (!!occupant || (!!carrying && carrying !== 'controller')),
    label,
    onInteract: () => {
      const s = usePast.getState()
      const w = { ...s.where }
      if (s.carrying && s.carrying !== 'controller') {
        if (occupant) w[occupant] = 'carried'
        w[s.carrying] = index
        usePast.setState({ where: w, carrying: occupant ?? null })
        sfx('select')
        evaluate()
      } else if (occupant) {
        w[occupant] = 'carried'
        usePast.setState({ where: w, carrying: occupant })
      }
    },
  })
  return (
    <group position={pos}>
      <Block position={[0, 0.5, 0]} size={[0.9, 1, 0.9]} color="#2a1a10" edge={neonMaterial(phase === 'restore' ? '#ff9a4d' : '#3dff8b', 2)} />
      <NeonText position={[0, 0.5, 0.46]} fontSize={0.28} color="#ffd8a8">
        {['I', 'II', 'III', 'IV'][index]}
      </NeonText>
      {occupant && (
        <group position={[0, 1.25, 0]}>
          <MemoryModel id={occupant} />
        </group>
      )}
    </group>
  )
}

function Furniture() {
  const wood = surfaceMaterial('#4a2c18', 0.8, 0.05)
  const fabric = surfaceMaterial('#5a2030', 0.9, 0)
  const wall = surfaceMaterial('#3a2a22', 0.95, 0)
  return (
    <>
      {/* floor + walls */}
      <Block position={[0, -0.5, 0]} size={[ROOM.maxX - ROOM.minX, 1, ROOM.maxZ - ROOM.minZ]} color="#2c1d14" />
      <Block position={[0, 3, ROOM.minZ - 0.2]} size={[24.4, 6, 0.4]} material={wall} />
      <Block position={[ROOM.minX - 0.2, 3, 0]} size={[0.4, 6, 20.4]} material={wall} />
      <Block position={[ROOM.maxX + 0.2, 3, 0]} size={[0.4, 6, 20.4]} material={wall} />
      <Block position={[-7.25, 3, ROOM.maxZ + 0.2]} size={[9.5, 6, 0.4]} material={wall} />
      <Block position={[7.25, 3, ROOM.maxZ + 0.2]} size={[9.5, 6, 0.4]} material={wall} />
      {/* memory corridor */}
      <Block position={[0, -0.5, 16]} size={[5, 1, 12]} color="#1a120c" edge={neonMaterial('#ff9a4d', 1.6)} />
      <Block position={[-2.7, 1.5, 16]} size={[0.4, 3, 12]} color="#120a06" />
      <Block position={[2.7, 1.5, 16]} size={[0.4, 3, 12]} color="#120a06" />
      <NeonText position={[0, 3.2, 10.6]} rotation={[0, Math.PI, 0]} fontSize={0.4} color="#ffd8a8" mono>
        ARCHIVE 0001 · THE BASEMENT · 1989
      </NeonText>
      {/* carpet */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]} material={surfaceMaterial('#5c3a28', 0.95, 0)}>
        <planeGeometry args={[16, 12]} />
      </mesh>
      {/* desk + CRT */}
      <Block position={[-7.5, 0.45, -8.6]} size={[3.4, 0.9, 1.4]} material={wood} />
      <mesh position={[-8.4, 1.25, -8.9]} material={surfaceMaterial('#c9c0a8', 0.6, 0.1)}>
        <boxGeometry args={[1, 0.8, 0.8]} />
      </mesh>
      <mesh position={[-8.4, 1.27, -8.49]} material={neonMaterial('#3dff8b', 0.8)}>
        <planeGeometry args={[0.7, 0.5]} />
      </mesh>
      {/* shelf */}
      <Block position={[11.2, 1.2, -4]} size={[1.2, 2.4, 3]} material={wood} />
      {/* prototype cabinet */}
      <Block position={[10.4, 1.1, 6.5]} size={[1.4, 2.2, 1.2]} color="#2a1e3a" edge={neonMaterial('#ff9a4d', 1.6)} />
      <mesh position={[9.69, 1.6, 6.5]} rotation={[0, -Math.PI / 2, 0]} material={neonMaterial('#ff9a4d', 0.5)}>
        <planeGeometry args={[0.9, 0.7]} />
      </mesh>
      {/* mailbox */}
      <mesh position={[-10, 0.5, 7.5]} material={surfaceMaterial('#7a2a2a', 0.5, 0.4)}>
        <boxGeometry args={[0.8, 1, 0.6]} />
      </mesh>
      {/* bed */}
      <Block position={[BED[0], 0.35, BED[2]]} size={[2.6, 0.7, 4]} material={wood} />
      <mesh position={[BED[0], 0.75, BED[2]]} material={surfaceMaterial('#2a3a6a', 0.9, 0)}>
        <boxGeometry args={[2.5, 0.12, 3.9]} />
      </mesh>
      {/* TV + two chairs */}
      <Block position={[4, 0.6, -9.3]} size={[2.6, 1.2, 1]} material={wood} />
      <mesh position={[4, 1.7, -9.3]} material={surfaceMaterial('#1a1a1a', 0.5, 0.2)}>
        <boxGeometry args={[1.8, 1.2, 0.9]} />
      </mesh>
      <mesh position={[4, 1.7, -8.84]} material={neonMaterial('#9fe8ff', 0.7)}>
        <planeGeometry args={[1.5, 0.9]} />
      </mesh>
      {[FOUNDER_CHAIR, ROOK_CHAIR].map((c, i) => (
        <group key={i} position={c}>
          <Block position={[0, 0.3, 0]} size={[1.4, 0.6, 1.4]} material={fabric} />
          <Block position={[0, 0.9, 0.6]} size={[1.4, 1.2, 0.3]} material={fabric} />
        </group>
      ))}
      <NeonText position={[ROOK_CHAIR[0], 1.9, ROOK_CHAIR[2] + 0.8]} fontSize={0.18} color="#ffd8a8" mono>
        ROOK
      </NeonText>
      <NeonText position={[FOUNDER_CHAIR[0], 1.9, FOUNDER_CHAIR[2] + 0.8]} fontSize={0.18} color="#ffd8a8" mono>
        ME
      </NeonText>
      {/* posters (original shapes) */}
      {[[-3, '#ff2bd6'], [0, '#00f0ff'], [-6, '#ffe14d']].map(([x, c]) => (
        <group key={x as number} position={[x as number, 3, ROOM.minZ + 0.01]}>
          <mesh material={surfaceMaterial('#1a1020', 0.9, 0)}>
            <planeGeometry args={[1.6, 2.2]} />
          </mesh>
          <mesh position={[0, 0.2, 0.01]} material={neonMaterial(c as string, 1)}>
            <circleGeometry args={[0.45, 3]} />
          </mesh>
        </group>
      ))}
      {/* projector */}
      <mesh position={[0, 3.6, 3.5]} material={neonMaterial('#ffb070', 1.4)}>
        <octahedronGeometry args={[0.5, 0]} />
      </mesh>
      <NeonText position={[0, 2.7, 4.6]} fontSize={0.26} color="#ffd8a8" maxWidth={8} textAlign="center">
        MEMORIES HOLD IN THE ORDER THEY WERE LIVED
      </NeonText>
      <pointLight position={[0, 4, 0]} color="#ffb070" intensity={40} distance={22} />
      <pointLight position={[-8, 3, -6]} color="#ff9a4d" intensity={15} distance={10} />
      <pointLight position={[8, 3, 5]} color="#ffcf8a" intensity={15} distance={10} />
    </>
  )
}

function BedSecret() {
  const phase = usePast((s) => s.phase)
  const controller = usePast((s) => s.controller)
  const carrying = usePast((s) => s.carrying)
  const glyph = useGame((s) => s.progress.glyphs.includes(6))
  useInteractable({
    id: 'under-bed',
    position: [BED[0] + 1.8, 1, BED[2]],
    radius: 1.8,
    enabled: !(glyph && (phase !== 'understand' || controller !== 'hidden')),
    label: phase === 'understand' && controller === 'hidden' ? 'Reach under the bed' : 'Look under the bed',
    onInteract: () => {
      const g = useGame.getState()
      if (!g.progress.glyphs.includes(6)) {
        g.findGlyph(6)
        g.addJournal('mem-controller')
      }
      if (usePast.getState().phase === 'understand' && usePast.getState().controller === 'hidden' && !carrying) {
        usePast.setState({ controller: 'carried', carrying: 'controller' })
        sfx('select')
        g.openOverlay({ type: 'info', title: 'Rook’s controller', accent: '#ff9a4d', body: ['Wrapped in an old blanket: the second controller, cable neatly coiled, as if waiting for a rematch.', 'Rook’s seat by the television is still empty.'] })
      } else if (usePast.getState().phase === 'restore') {
        g.openOverlay({ type: 'info', title: 'Under the bed', accent: '#ff9a4d', body: ['Something is wrapped in a blanket, but the memory around it is too faint to touch. Restore the projector first.', 'Scratched into the floorboards: a mark like a hexagon crossed twice — the Founder’s sixth mark.'] })
      }
    },
  })
  return (
    <group position={[BED[0] + 1.35, 0.15, BED[2]]} rotation={[-Math.PI / 2, 0, 0]}>
      <GlyphMark index={6} size={0.35} color={glyph ? '#6a5a90' : '#ffe14d'} />
    </group>
  )
}

function RookChair() {
  const phase = usePast((s) => s.phase)
  const controller = usePast((s) => s.controller)
  useInteractable({
    id: 'rook-chair',
    position: [ROOK_CHAIR[0], 1, ROOK_CHAIR[2] - 1.2],
    radius: 1.6,
    enabled: controller === 'carried',
    label: 'Place the controller on Rook’s chair',
    onInteract: () => {
      usePast.setState({ controller: 'placed', carrying: null, phase: 'done' })
      sfx('achievement')
      const g = useGame.getState()
      g.completeTrial('past')
      g.openOverlay({
        type: 'trial-result',
        trial: 'past',
        success: true,
        title: 'Trial I complete',
        body: ['The memory settles. Two kids, two controllers, one more game.', 'You understood what the Founder never said: the OASIS is free because Rook was right.', 'Rewards: Cobalt Key (lock II of the Founder’s Gate), Archivist Coat, +15 coins, +300 XP.'],
      })
    },
  })
  if (controller !== 'placed' && phase !== 'done') return null
  return (
    <group position={[ROOK_CHAIR[0], 0.7, ROOK_CHAIR[2]]}>
      <MemoryModel id="controller" />
    </group>
  )
}

export default function PastWorld() {
  const integrity = usePast((s) => s.integrity)
  const where = usePast((s) => s.where)
  const phase = usePast((s) => s.phase)
  const reset = usePast((s) => s.reset)
  useTrialSetup('past', () => {
    usePast.getState().reset()
    playerState.teleport?.([0, 1.2, 15], 0)
  })
  useEffect(() => {
    reset()
  }, [reset])
  const placed = Object.values(where).filter((w) => typeof w === 'number').length
  useEffect(() => {
    useTrialHud.getState().set({
      status: [
        phase === 'restore' ? `Memories placed ${placed}/4` : phase === 'understand' ? 'Find what the Founder kept for Rook' : 'Memory restored',
        `Integrity ${'■'.repeat(integrity)}${'□'.repeat(3 - integrity)}`,
      ],
    })
  }, [placed, integrity, phase])
  return (
    <group>
      <Furniture />
      {MEMORY_ORDER.map((id) => (
        <MemoryObject key={id} id={id} />
      ))}
      {PEDESTALS.map((_, i) => (
        <Pedestal key={i} index={i} />
      ))}
      <Carried />
      <BedSecret />
      <RookChair />
      <Particles count={300} area={[24, 6, 20]} center={[0, 0, 0]} color="#ffb070" color2="#fff2d6" size={3} rise={0.15} />
      <TrialExit position={[0, 0, 20.5]} />
    </group>
  )
}
