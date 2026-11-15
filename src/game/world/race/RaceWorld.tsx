import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Group } from 'three'
import { useGame } from '../../../store/useGame'
import { carState, useRace } from '../../../store/useRace'
import { playerState } from '../../systems/playerState'
import { sfx } from '../../systems/audio'
import { GlyphMark } from '../common/Glyph'
import { NeonText } from '../common/NeonText'
import { Particles } from '../common/Particles'
import { Skyline } from '../common/Skyline'
import { SkyDome } from '../common/SkyDome'
import { SkyTraffic } from '../common/SkyTraffic'
import { neonMaterial, surfaceMaterial } from '../common/materials'
import { CollapsingTower, FallingDebris, Hammer, Piston, RotatingArm, SlidingBarrier, Traffic } from './Hazards'
import { BOOST_PADS, CHECKPOINTS, GLYPH5_POS, RACE_START } from './layout'
import { Track } from './Track'
import { Vehicle } from './Vehicle'
import { resetAutopilot } from './autopilot'

function inZone(p: { x: number; y: number; z: number }, z: { min: number[]; max: number[] }) {
  return p.x >= z.min[0] && p.x <= z.max[0] && p.y >= z.min[1] && p.y <= z.max[1] && p.z >= z.min[2] && p.z <= z.max[2]
}

/** Countdown, checkpoints, finish detection, hidden route discovery. */
function RaceDirector() {
  const beeps = useRef(-1)
  useFrame(() => {
    const r = useRace.getState()
    const now = performance.now()
    if (r.status === 'countdown') {
      const left = Math.ceil((r.countdownEnd - now) / 1000)
      if (left !== beeps.current && left > 0) {
        beeps.current = left
        sfx('countdown')
      }
      if (now >= r.countdownEnd) {
        sfx('go')
        beeps.current = -1
        resetAutopilot()
        useRace.setState({ status: 'racing', startTime: now })
      }
      return
    }
    const p = playerState.position
    // The hidden undercity route (glyph 5) counts any time you drive through it.
    if (Math.abs(p.x - GLYPH5_POS[0]) < 5 && Math.abs(p.z - GLYPH5_POS[2]) < 4 && p.y < -3) {
      const g = useGame.getState()
      if (!g.progress.glyphs.includes(5)) g.discoverReverse()
    }
    if (r.status !== 'racing') return
    const cp = CHECKPOINTS[r.cp]
    if (!cp) return
    const zone = cp.zones.find((z) => inZone(p, z))
    if (!zone) return
    if (r.cp < CHECKPOINTS.length - 1) {
      sfx('checkpoint')
      useRace.setState({ cp: r.cp + 1, respawn: zone.respawn })
      useGame.getState().toast({ kind: 'info', title: `Checkpoint · ${cp.label}`, body: `${((now - r.startTime) / 1000).toFixed(2)}s` })
      return
    }
    const time = (now - r.startTime) / 1000
    const result = useGame.getState().recordGrandPrix(time)
    sfx('achievement')
    useRace.setState({ status: 'finished', finishTime: time, cp: CHECKPOINTS.length, result })
    window.setTimeout(() => useGame.getState().openOverlay({ type: 'race-result' } as never), 900)
  })
  return null
}

function BoostPads() {
  const used = useRef<number[]>([])
  useFrame(() => {
    const p = playerState.position
    BOOST_PADS.forEach((b, i) => {
      const near = Math.abs(p.x - b.pos[0]) < 2.6 && Math.abs(p.z - b.pos[2]) < 2.2 && Math.abs(p.y - b.pos[1]) < 2.5
      if (near && !used.current.includes(i)) {
        used.current.push(i)
        carState.boost = Math.min(100, carState.boost + 45)
        sfx('checkpoint')
      } else if (!near && used.current.includes(i)) used.current = used.current.filter((x) => x !== i)
    })
  })
  return (
    <>
      {BOOST_PADS.map((b, i) => (
        <group key={i} position={[b.pos[0], b.pos[1] + 0.02, b.pos[2]]}>
          {[0, 1, 2].map((k) => (
            <mesh key={k} position={[0, 0, -1.2 + k * 1.2]} rotation={[-Math.PI / 2, 0, Math.PI / 4]} material={neonMaterial('#3dff8b', 2.4)}>
              <planeGeometry args={[0.35, 2.4]} />
            </mesh>
          ))}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.005, 0]} material={neonMaterial('#3dff8b', 0.4)}>
            <planeGeometry args={[5, 4.4]} />
          </mesh>
        </group>
      ))}
    </>
  )
}

function Gate({ z, label, color, y = 0 }: { z: number; label: string; color: string; y?: number }) {
  return (
    <group position={[0, y, z]}>
      {[-10, 10].map((x) => (
        <mesh key={x} position={[x, 4, 0]} material={surfaceMaterial('#15102a', 0.4, 0.6)}>
          <boxGeometry args={[1, 8, 1]} />
        </mesh>
      ))}
      <mesh position={[0, 8.3, 0]} material={surfaceMaterial('#15102a', 0.4, 0.6)}>
        <boxGeometry args={[21, 1.2, 1]} />
      </mesh>
      <NeonText position={[0, 8.3, -0.55]} rotation={[0, Math.PI, 0]} fontSize={0.8} color={color}>
        {label}
      </NeonText>
      <NeonText position={[0, 8.3, 0.55]} fontSize={0.8} color={color}>
        {label}
      </NeonText>
      {Array.from({ length: 18 }, (_, i) => (
        <mesh key={i} position={[-8.5 + i, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} material={neonMaterial(i % 2 ? '#ffffff' : '#111111', i % 2 ? 1.6 : 1)}>
          <planeGeometry args={[1, 1]} />
        </mesh>
      ))}
    </group>
  )
}

function Glyph5() {
  const found = useGame((s) => s.progress.glyphs.includes(5))
  const ref = useRef<Group>(null)
  useFrame((s) => {
    if (ref.current) ref.current.position.y = GLYPH5_POS[1] + Math.sin(s.clock.elapsedTime * 2) * 0.2
  })
  return (
    <group ref={ref} position={GLYPH5_POS}>
      <GlyphMark index={5} size={1.4} color={found ? '#6a5a90' : '#ffe14d'} spin={!found} />
      <pointLight color="#ffe14d" intensity={found ? 0 : 30} distance={14} />
    </group>
  )
}

export default function RaceWorld() {
  const quality = useGame((s) => s.settings.quality)
  useEffect(() => {
    useRace.getState().reset()
    carState.boost = 100
    playerState.position.set(...RACE_START.pos)
    useGame.getState().openOverlay({ type: 'garage' })
    return () => {
      useRace.getState().reset()
    }
  }, [])
  return (
    <group>
      <SkyDome top="#03000c" horizon="#0f3a70" bottom="#03000c" />
      <Skyline
        count={quality === 'high' ? 320 : 160}
        rects={[[-160, -70, -120, 900], [40, 140, -120, 900], [-40, 40, -180, -110], [-40, 40, 880, 980]]}
        minH={30}
        maxH={140}
        fog="#06102a"
        fogFar={420}
      />
      <SkyTraffic count={quality === 'high' ? 60 : 20} minR={120} maxR={260} minY={40} maxY={80} color="#00f0ff" />
      <Particles count={quality === 'high' ? 500 : 150} area={[120, 30, 900]} center={[0, 0, 380]} color="#00f0ff" color2="#ff2bd6" size={5} rise={0.4} />
      <Track />
      <BoostPads />
      <Gate z={20} label="START" color="#3dff8b" />
      <Gate z={809} label="FINISH" color="#ffe14d" />
      <NeonText position={[0, 14, 30]} rotation={[0, Math.PI, 0]} fontSize={3} color="#00f0ff">
        VELOCITY CITY
      </NeonText>
      {/* Highway hazards */}
      <Traffic />
      <SlidingBarrier z={130} period={3.4} />
      <SlidingBarrier z={200} period={2.8} phase={1.5} />
      <FallingDebris area={{ x: [-7, 7], z: [238, 252], y: 0 }} trigger={205} />
      {/* Skyway: collapsing tower + debris */}
      <mesh position={[31.5, 4, 400]} material={surfaceMaterial('#120c22', 0.6, 0.3)}>
        <boxGeometry args={[4, 8, 6]} />
      </mesh>
      <CollapsingTower base={[31.5, 8, 400]} trigger={345} />
      <FallingDebris area={{ x: [9, 16], z: [462, 478], y: 4 }} trigger={440} count={4} />
      {/* Tunnel crushers */}
      <Piston pos={[-19, 0, 375]} width={10} period={2.6} phase={0} />
      <Piston pos={[-19.8, 0, 410]} width={10} period={2.6} phase={0.33} />
      <Piston pos={[-15, 0, 450]} width={10} period={2.6} phase={0.66} />
      {/* Final stretch */}
      <Hammer z={725} />
      <Hammer z={755} phase={1.6} period={3.1} />
      <RotatingArm z={785} />
      <NeonText position={[0, 7, 646]} rotation={[0, Math.PI, 0]} fontSize={1.4} color="#ff4d4d">
        ▲ JUMP ▲
      </NeonText>
      <Glyph5 />
      <RaceDirector />
      <Vehicle />
    </group>
  )
}
