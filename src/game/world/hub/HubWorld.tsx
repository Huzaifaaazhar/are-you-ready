import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { CuboidCollider, RigidBody } from '@react-three/rapier'
import { Color, Group, MeshBasicMaterial } from 'three'
import { useGame } from '../../../store/useGame'
import { Block } from '../common/Block'
import { Coins } from '../common/Coins'
import { GridFloor } from '../common/GridFloor'
import { ItemPickup } from '../common/ItemPickup'
import { NeonText } from '../common/NeonText'
import { Particles } from '../common/Particles'
import { Portal } from '../common/Portal'
import { Skyline } from '../common/Skyline'
import { SkyDome } from '../common/SkyDome'
import { SkyTraffic } from '../common/SkyTraffic'
import { neonMaterial, surfaceMaterial } from '../common/materials'
import { CentralTower } from './CentralTower'
import { FounderGate, PlinthGlyph } from './FounderGate'
import { MonumentModel } from '../common/Monument'
import { AtlasObservatory, HallOfRecords, IdentityNexus, ServiceKiosks } from './HubStations'
import { HUB_LAYOUT, HUB_POS, HUB_RADIUS, SKY_PLATFORM, STEPPING_STONES } from './layout'
import { VelocityCircuit } from './VelocityCircuit'

function Boundary() {
  const segs = 36
  return (
    <>
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[100, 0.5, 100]} position={[0, -0.5, 0]} />
        {Array.from({ length: segs }, (_, i) => {
          const a = (i / segs) * Math.PI * 2
          const w = ((Math.PI * 2 * HUB_RADIUS) / segs) * 0.55
          return <CuboidCollider key={i} args={[w, 4, 0.5]} position={[Math.cos(a) * (HUB_RADIUS + 0.5), 4, Math.sin(a) * (HUB_RADIUS + 0.5)]} rotation={[0, -a + Math.PI / 2, 0]} />
        })}
      </RigidBody>
      <mesh position={[0, 1, 0]} rotation={[Math.PI / 2, 0, 0]} material={neonMaterial('#00f0ff', 2.6)}>
        <torusGeometry args={[HUB_RADIUS, 0.06, 6, 180]} />
      </mesh>
      <mesh position={[0, 0.5, 0]} material={new MeshBasicMaterial({ color: new Color('#00f0ff'), transparent: true, opacity: 0.06, depthWrite: false })}>
        <cylinderGeometry args={[HUB_RADIUS, HUB_RADIUS, 1, 90, 1, true]} />
      </mesh>
    </>
  )
}

function FloatingIslands() {
  const ref = useRef<Group>(null)
  const islands = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const a = (i / 7) * Math.PI * 2 + 0.3
        const r = 78 + (i % 3) * 9
        return { pos: [Math.cos(a) * r, 22 + (i % 4) * 6, Math.sin(a) * r] as [number, number, number], s: 4 + (i % 3) * 2, c: ['#00f0ff', '#ff2bd6', '#9d4dff', '#3dff8b'][i % 4] }
      }),
    [],
  )
  useFrame((s) => {
    ref.current?.children.forEach((c, i) => {
      c.position.y = islands[i].pos[1] + Math.sin(s.clock.elapsedTime * 0.4 + i) * 1.5
      c.rotation.y += 0.001 * (i % 2 ? 1 : -1)
    })
  })
  const rock = surfaceMaterial('#1a1230', 0.8, 0.1)
  return (
    <group ref={ref}>
      {islands.map((isl, i) => (
        <group key={i} position={isl.pos} scale={isl.s}>
          <mesh position={[0, -1.2, 0]} rotation={[Math.PI, 0, 0]} material={rock}>
            <coneGeometry args={[1.6, 2.6, 7]} />
          </mesh>
          <mesh position={[0, 0.05, 0]} material={rock}>
            <cylinderGeometry args={[1.62, 1.6, 0.2, 7]} />
          </mesh>
          <mesh position={[0, 0.16, 0]} rotation={[-Math.PI / 2, 0, 0]} material={neonMaterial(isl.c, 2)}>
            <ringGeometry args={[1.45, 1.55, 7]} />
          </mesh>
          {[0, 1, 2].map((k) => (
            <mesh key={k} position={[Math.cos(k * 2.1) * 0.7, 0.6 + k * 0.15, Math.sin(k * 2.1) * 0.7]} material={neonMaterial(isl.c, 2.4)}>
              <octahedronGeometry args={[0.25 + k * 0.08, 0]} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  )
}

function Planet() {
  const mat = useMemo(() => new MeshBasicMaterial({ color: '#2a0f5a', fog: false }), [])
  return (
    <group position={[-220, 120, -300]}>
      <mesh material={mat}>
        <sphereGeometry args={[60, 32, 24]} />
      </mesh>
      <mesh rotation={[1.2, 0.3, 0]} material={new MeshBasicMaterial({ color: new Color('#ff2bd6').multiplyScalar(0.9), fog: false, transparent: true, opacity: 0.55, side: 2 })}>
        <ringGeometry args={[78, 100, 96]} />
      </mesh>
    </group>
  )
}

function SkyClimb() {
  const edge = neonMaterial('#ffe14d', 2.4)
  return (
    <>
      {STEPPING_STONES.map((p, i) => (
        <Block key={i} position={[p[0], p[1] - 0.25, p[2]]} size={[2.6, 0.5, 2.6]} color="#1d1438" edge={edge} />
      ))}
      <Block position={[SKY_PLATFORM[0], SKY_PLATFORM[1] - 0.3, SKY_PLATFORM[2]]} size={[6, 0.6, 6]} color="#1d1438" edge={neonMaterial('#ff2bd6', 2.6)} />
      <NeonText position={[SKY_PLATFORM[0], SKY_PLATFORM[1] + 3.2, SKY_PLATFORM[2] - 2.6]} fontSize={0.4} color="#ffe14d" mono>
        HIGHEST POINT
      </NeonText>
      <ItemPickup item="founder-quarter" secret="sky-platform" position={[SKY_PLATFORM[0] + 1, SKY_PLATFORM[1], SKY_PLATFORM[2]]} color="#ffe14d">
        <mesh rotation={[Math.PI / 2, 0, 0]} material={neonMaterial('#ffe14d', 2.2)}>
          <cylinderGeometry args={[0.38, 0.38, 0.08, 28]} />
        </mesh>
        <mesh material={neonMaterial('#ffffff', 2)}>
          <torusGeometry args={[0.3, 0.03, 6, 24]} />
        </mesh>
      </ItemPickup>
    </>
  )
}

function Billboards() {
  const signs = [
    { pos: [40, 14, -30], rot: -0.9, text: 'PLAY ONE MORE', color: '#ff2bd6' },
    { pos: [-42, 16, 32], rot: 2.3, text: 'NO LIMITS · NO LOGOUT', color: '#00f0ff' },
    { pos: [30, 18, 44], rot: 3.8, text: 'RACE · BUILD · DISCOVER', color: '#ffe14d' },
  ] as const
  return (
    <>
      {signs.map((s, i) => (
        <group key={i} position={s.pos as unknown as [number, number, number]} rotation={[0, s.rot, 0]}>
          <mesh material={neonMaterial(s.color, 0.25)}>
            <planeGeometry args={[16, 3.4]} />
          </mesh>
          <NeonText position={[0, 0, 0.05]} fontSize={1.4} color={s.color}>
            {s.text}
          </NeonText>
        </group>
      ))}
    </>
  )
}

function MonumentPlinth() {
  const monument = useGame((s) => s.progress.monument)
  const name = useGame((s) => s.avatar?.name ?? 'Player')
  const [x, , z] = HUB_POS.monument
  if (!monument) return null
  return (
    <group position={[x, 0, z]}>
      <Block position={[0, 0.3, 0]} size={[6, 0.6, 6]} color="#132235" edge={neonMaterial('#ffe14d', 2.4)} />
      <group position={[0, 0.6, 0]}>
        <MonumentModel monument={monument} />
      </group>
      <NeonText position={[0, 6.2, 0]} rotation={[0, Math.atan2(-x, -z), 0]} fontSize={0.45} color="#ffe14d">
        {`MONUMENT OF ${name.toUpperCase()}`}
      </NeonText>
    </group>
  )
}

export default function HubWorld() {
  const quality = useGame((s) => s.settings.quality)
  return (
    <group>
      <SkyDome top="#04010d" horizon="#3d0f70" bottom="#05010f" />
      <Planet />
      <GridFloor size={560} fade={240} color="#3a1cff" color2="#00f0ff" />
      <Boundary />
      <Skyline count={quality === 'high' ? 260 : 140} />
      <SkyTraffic count={quality === 'high' ? 80 : 30} />
      <FloatingIslands />
      <Billboards />
      <Particles count={quality === 'high' ? 900 : 300} area={[130, 35, 130]} />
      <CentralTower />
      <Portal
        id="portal-arcade"
        position={HUB_POS.arcadePortal}
        rotationY={0}
        label="ARCADE DISTRICT"
        sublabel="retro sector 8-B · cabinets · prizes"
        color="#ff2bd6"
        color2="#ffe14d"
        target="arcade"
      />
      <FounderGate />
      <PlinthGlyph />
      <MonumentPlinth />
      <Portal
        id="portal-race"
        position={HUB_POS.racePortal}
        rotationY={Math.PI}
        label="VELOCITY CITY"
        sublabel="grand prix · vehicles · the first challenge"
        color="#3dff8b"
        color2="#00f0ff"
        target="race"
      />
      <VelocityCircuit />
      <HallOfRecords />
      <IdentityNexus />
      <AtlasObservatory />
      <ServiceKiosks />
      <SkyClimb />
      <Coins coins={HUB_LAYOUT.coins} />
    </group>
  )
}
