import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { create } from 'zustand'
import { Group, MeshBasicMaterial } from 'three'
import { useGame } from '../../../../store/useGame'
import { useInteractable } from '../../../systems/interaction'
import { sfx } from '../../../systems/audio'
import { Block } from '../../common/Block'
import { GridFloor } from '../../common/GridFloor'
import { NeonText } from '../../common/NeonText'
import { Particles } from '../../common/Particles'
import { SkyDome } from '../../common/SkyDome'
import { glow, neonMaterial } from '../../common/materials'
import { TrialExit, useTrialHud, useTrialSetup } from '../common'
import { BOARD, GRID, cellX, cellZ, traceBeam, type Piece } from './layout'
import { MonumentModel } from '../../common/Monument'

interface FutureState {
  firing: boolean
  pieces: Record<string, Piece>
  corruptSince: number
  overloads: number
  solved: boolean
  reset: () => void
}
export const useFuture = create<FutureState>((set) => ({
  firing: false,
  pieces: {},
  corruptSince: 0,
  overloads: 0,
  solved: false,
  reset: () => set({ pieces: {}, corruptSince: 0, solved: false, firing: false }),
}))
if (typeof window !== 'undefined') (window as unknown as { __future: typeof useFuture }).__future = useFuture

const OVERLOAD_MS = 4000
const isFixed = (c: number, r: number) => [...BOARD.receivers, ...BOARD.blocks, ...BOARD.corruption].some(([a, b]) => a === c && b === r)

function counts(pieces: Record<string, Piece>) {
  const v = Object.values(pieces)
  return { mirrors: BOARD.mirrors - v.filter((p) => p !== 'S').length, splitters: BOARD.splitters - v.filter((p) => p === 'S').length }
}

function nextPiece(cur: Piece | undefined, pieces: Record<string, Piece>): Piece | undefined {
  const left = counts(pieces)
  // freeing the current piece makes it available again
  if (cur && cur !== 'S') left.mirrors++
  if (cur === 'S') left.splitters++
  const order: (Piece | undefined)[] = [undefined, '/', '\\', 'S']
  let i = order.indexOf(cur)
  for (let k = 0; k < 4; k++) {
    i = (i + 1) % order.length
    const p = order[i]
    if (p === undefined) return undefined
    if (p === 'S' ? left.splitters > 0 : left.mirrors > 0) return p
  }
  return undefined
}

function Cell({ c, r }: { c: number; r: number }) {
  const key = `${c},${r}`
  const piece = useFuture((s) => s.pieces[key])
  const solved = useFuture((s) => s.solved)
  const label = piece === undefined ? 'Place a mirror here' : piece === '/' ? 'Rotate mirror ( / → \\ )' : piece === '\\' ? 'Swap for the splitter / remove' : 'Remove the splitter'
  useInteractable({
    id: `cell-${key}`,
    position: [cellX(c), 1, cellZ(r)],
    radius: 1.5,
    enabled: !solved,
    label,
    onInteract: () => {
      const s = useFuture.getState()
      const next = nextPiece(s.pieces[key], s.pieces)
      const pieces = { ...s.pieces }
      if (next) pieces[key] = next
      else delete pieces[key]
      useFuture.setState({ pieces })
      sfx('blip')
    },
  })
  return (
    <group position={[cellX(c), 0, cellZ(r)]}>
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} material={neonMaterial('#9fe8ff', 0.25)}>
        <ringGeometry args={[1.25, 1.35, 4, 1, Math.PI / 4]} />
      </mesh>
      {piece && (
        <group>
          <mesh position={[0, 0.15, 0]} material={neonMaterial('#123040', 1)}>
            <cylinderGeometry args={[0.5, 0.6, 0.3, 12]} />
          </mesh>
          {piece === 'S' ? (
            <mesh position={[0, 1.1, 0]} rotation={[0, Math.PI / 4, 0]} material={neonMaterial('#ff2bd6', 1.6)}>
              <octahedronGeometry args={[0.6, 0]} />
            </mesh>
          ) : (
            <mesh position={[0, 1.1, 0]} rotation={[0, piece === '/' ? Math.PI / 4 : -Math.PI / 4, 0]} material={neonMaterial('#e8fbff', 1.8)}>
              <boxGeometry args={[2.0, 1.6, 0.08]} />
            </mesh>
          )}
        </group>
      )}
    </group>
  )
}

function Beam() {
  const pieces = useFuture((s) => s.pieces)
  const solved = useFuture((s) => s.solved)
  const firing = useFuture((s) => s.firing)
  const traced = useMemo(() => traceBeam(pieces), [pieces])
  const lit = firing ? traced.lit : new Set<string>()
  const corrupt = firing && traced.corrupt
  const segments = firing ? traced.segments : []
  const warn = useRef<Group>(null)
  // Overload / completion logic
  useEffect(() => {
    const s = useFuture.getState()
    if (corrupt && !s.corruptSince) useFuture.setState({ corruptSince: performance.now() })
    if (!corrupt && s.corruptSince) useFuture.setState({ corruptSince: 0 })
    if (!corrupt && lit.size === BOARD.receivers.length && !s.solved) {
      useFuture.setState({ solved: true })
      sfx('unlock')
      useGame.getState().toast({ kind: 'secret', title: 'Blueprint lit!', body: 'The forge door opens to the north' })
    }
  }, [corrupt, lit.size, firing]) // eslint-disable-line react-hooks/exhaustive-deps
  useFrame(() => {
    const s = useFuture.getState()
    const t = s.corruptSince ? performance.now() - s.corruptSince : 0
    if (warn.current) warn.current.visible = !!s.corruptSince
    if (s.corruptSince && t > OVERLOAD_MS && !s.solved) {
      sfx('hurt')
      useFuture.setState({ pieces: {}, corruptSince: 0, overloads: s.overloads + 1, firing: false })
      useGame.getState().toast({ kind: 'error', title: 'OVERLOAD', body: 'The beam fed a corruption node for too long. The board resets — try another route.' })
    }
  })
  const beamMat = useMemo(() => new MeshBasicMaterial({ color: glow(corrupt ? '#ff3040' : '#bff4ff', 3.2), toneMapped: false }), [corrupt])
  return (
    <>
      {segments.map(([c0, r0, c1, r1], i) => {
        const x0 = cellX(c0), z0 = cellZ(r0), x1 = cellX(c1), z1 = cellZ(r1)
        const len = Math.hypot(x1 - x0, z1 - z0)
        if (len < 0.01) return null
        return (
          <mesh key={i} position={[(x0 + x1) / 2, 1.1, (z0 + z1) / 2]} rotation={[0, Math.atan2(x1 - x0, z1 - z0), 0]} material={beamMat}>
            <boxGeometry args={[0.14, 0.14, len + 0.14]} />
          </mesh>
        )
      })}
      {BOARD.receivers.map(([c, r]) => {
        const on = lit.has(`${c},${r}`)
        return (
          <group key={`${c},${r}`} position={[cellX(c), 0, cellZ(r)]}>
            <Block position={[0, 0.4, 0]} size={[1.2, 0.8, 1.2]} color="#102030" edge={neonMaterial('#9fe8ff', 2)} />
            <mesh position={[0, 1.3, 0]} material={neonMaterial(on ? '#3dff8b' : '#335566', on ? 3 : 1)}>
              <icosahedronGeometry args={[0.45, 0]} />
            </mesh>
          </group>
        )
      })}
      <group ref={warn} position={[0, 7, -2]} visible={false}>
        <NeonText fontSize={1} color="#ff3040">
          ⚠ OVERLOAD IMMINENT ⚠
        </NeonText>
      </group>
      {solved && (
        <NeonText position={[0, 6, -12]} rotation={[0, 0, 0]} fontSize={0.8} color="#3dff8b">
          ALL RECEIVERS LIT
        </NeonText>
      )}
    </>
  )
}

function Forge() {
  const solved = useFuture((s) => s.solved)
  const monument = useGame((s) => s.progress.monument)
  const done = useGame((s) => s.progress.trials.includes('future'))
  const open = useGame((s) => s.openOverlay)
  useInteractable({
    id: 'monument-forge',
    position: [0, 1, -19],
    radius: 2.6,
    enabled: solved || done,
    label: done ? 'Redesign your monument' : 'Design your monument',
    onInteract: () => open({ type: 'monument' }),
  })
  return (
    <>
      <Block position={[0, -0.5, -20]} size={[10, 1, 14]} color="#0c1622" edge={neonMaterial('#9fe8ff', 1.4)} />
      {!solved && !done && <Block position={[0, 3, -13.2]} size={[10, 6, 0.4]} color="#123040" edge={neonMaterial('#ff2bd6', 2.4)} />}
      <group position={[0, 0, -22]}>
        <Block position={[0, 0.4, 0]} size={[4, 0.8, 4]} color="#132235" edge={neonMaterial('#ffe14d', 2)} />
        {monument && (
          <group position={[0, 0.8, 0]} scale={0.6}>
            <MonumentModel monument={monument} />
          </group>
        )}
      </group>
      <NeonText position={[0, 5.4, -26.5]} fontSize={0.7} color="#ffe14d">
        MONUMENT FORGE
      </NeonText>
    </>
  )
}

function Emitter() {
  const ref = useRef<Group>(null)
  const firing = useFuture((s) => s.firing)
  const solved = useFuture((s) => s.solved)
  useInteractable({
    id: 'emitter-switch',
    position: [cellX(-1) - 0.5, 1, cellZ(BOARD.emitterRow) + 3],
    radius: 2,
    enabled: !solved,
    label: firing ? 'Switch the emitter off' : 'Fire the emitter',
    onInteract: () => {
      useFuture.setState({ firing: !useFuture.getState().firing, corruptSince: 0 })
      sfx(firing ? 'blip' : 'go')
    },
  })
  useFrame((s) => {
    if (ref.current) ref.current.rotation.x = s.clock.elapsedTime
  })
  return (
    <group position={[cellX(-1) - 0.5, 0, cellZ(BOARD.emitterRow)]}>
      <Block position={[0, 0.8, 0]} size={[1.6, 1.6, 1.6]} color="#102030" edge={neonMaterial('#9fe8ff', 2.4)} />
      <group ref={ref} position={[0.9, 1.1, 0]}>
        <mesh material={neonMaterial('#e8fbff', 3)}>
          <torusGeometry args={[0.35, 0.06, 6, 20]} />
        </mesh>
      </group>
      <NeonText position={[0, 2.6, 0]} fontSize={0.35} color="#9fe8ff">
        {firing ? 'EMITTER · FIRING' : 'EMITTER · OFF'}
      </NeonText>
      <group position={[0, 0, 3]}>
        <Block position={[0, 0.6, 0]} size={[1, 1.2, 0.8]} color="#102030" edge={neonMaterial(firing ? '#3dff8b' : '#ff2bd6', 2.4)} />
        <NeonText position={[0, 1.6, 0]} fontSize={0.22} color={firing ? '#3dff8b' : '#ff2bd6'}>
          SWITCH
        </NeonText>
      </group>
    </group>
  )
}

export default function FutureWorld() {
  const pieces = useFuture((s) => s.pieces)
  const solved = useFuture((s) => s.solved)
  const overloads = useFuture((s) => s.overloads)
  const firing = useFuture((s) => s.firing)
  useTrialSetup('future', () => {
    useFuture.getState().reset()
  })
  useEffect(() => {
    useFuture.getState().reset()
    useGame.getState().addJournal('blueprint')
  }, [])
  const left = counts(pieces)
  useEffect(() => {
    useTrialHud.getState().set({
      status: [solved ? 'Design your monument in the forge (north)' : `Pieces left: ${left.mirrors} mirrors · ${left.splitters} splitter`, solved ? 'Blueprint lit' : firing ? 'Emitter firing' : 'Emitter off — fire it from the west switch', `Overloads: ${overloads}`],
    })
  }, [left.mirrors, left.splitters, overloads, solved, firing])
  const cells = []
  for (let c = 0; c < GRID.cols; c++) for (let r = 0; r < GRID.rows; r++) if (!isFixed(c, r)) cells.push([c, r])
  return (
    <group>
      <SkyDome top="#020810" horizon="#0d3a55" bottom="#020810" />
      <GridFloor size={200} fade={90} color="#0d5a7a" color2="#9fe8ff" cell={1.5} y={0.005} />
      <Block position={[0, -0.5, 4.5]} size={[34, 1, 35]} color="#071018" />
      {/* boundary rails */}
      {[[-17, 0, 2, 0.4, 30], [17, 0, 2, 0.4, 30]].map(([x, , z, w, d], i) => (
        <Block key={i} position={[x, 0.8, z]} size={[w, 1.6, d]} color="#0c1622" edge={neonMaterial('#9fe8ff', 1.5)} />
      ))}
      <Block position={[-11, 0.8, -13]} size={[12, 1.6, 0.4]} color="#0c1622" edge={neonMaterial('#9fe8ff', 1.5)} />
      <Block position={[11, 0.8, -13]} size={[12, 1.6, 0.4]} color="#0c1622" edge={neonMaterial('#9fe8ff', 1.5)} />
      {BOARD.blocks.map(([c, r]) => (
        <Block key={`b${c}${r}`} position={[cellX(c), 1.2, cellZ(r)]} size={[2.4, 2.4, 2.4]} color="#1a2a3a" edge={neonMaterial('#4d7cff', 1.6)} />
      ))}
      {BOARD.corruption.map(([c, r]) => (
        <group key={`x${c}${r}`} position={[cellX(c), 1.1, cellZ(r)]}>
          <mesh material={neonMaterial('#ff3040', 2.2)}>
            <dodecahedronGeometry args={[0.7, 0]} />
          </mesh>
          <pointLight color="#ff3040" intensity={8} distance={5} />
        </group>
      ))}
      {cells.map(([c, r]) => (
        <Cell key={`${c},${r}`} c={c} r={r} />
      ))}
      <Emitter />
      <Beam />
      <Forge />
      <NeonText position={[0, 6, 12]} rotation={[0, Math.PI, 0]} fontSize={0.6} color="#9fe8ff" maxWidth={20} textAlign="center">
        LIGHT ALL THREE RECEIVERS · AVOID THE RED NODES
      </NeonText>
      <Particles count={300} area={[40, 16, 40]} center={[0, 0, 0]} color="#9fe8ff" color2="#ffffff" size={3} rise={0.25} />
      <pointLight position={[0, 8, 0]} color="#9fe8ff" intensity={60} distance={40} />
      <TrialExit position={[0, 0, 19]} />
    </group>
  )
}
