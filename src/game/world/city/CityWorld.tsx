import { useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { CuboidCollider, RigidBody } from '@react-three/rapier'
import { AdditiveBlending, Color, Group, MeshBasicMaterial } from 'three'
import { useGame } from '../../../store/useGame'
import { useInteractable } from '../../systems/interaction'
import { playerState } from '../../systems/playerState'
import { sfx } from '../../systems/audio'
import { Block } from '../common/Block'
import { Coins } from '../common/Coins'
import { Kiosk } from '../common/Kiosk'
import { NeonText } from '../common/NeonText'
import { Particles } from '../common/Particles'
import { Skyline } from '../common/Skyline'
import { SkyDome } from '../common/SkyDome'
import { SkyTraffic } from '../common/SkyTraffic'
import { neonMaterial, surfaceMaterial } from '../common/materials'
import { towerMaterial } from '../common/TowerMaterial'
import { HomePortal, JumpPad, Lift, Relics } from '../common/Traversal'
import { Rain } from '../arcade/ArcadeProps'
import { CITY, CITY_LAYOUT, TOWERS } from './layout'

function Towers() {
  return (
    <>
      {TOWERS.map((t) => (
        <group key={t.id}>
          <RigidBody type="fixed" colliders={false}>
            <CuboidCollider args={[t.w / 2, t.h / 2, t.d / 2]} position={[t.x, t.h / 2, t.z]} />
          </RigidBody>
          <mesh position={[t.x, t.h / 2, t.z]} material={towerMaterial(t.color, 0.45)}>
            <boxGeometry args={[t.w, t.h, t.d]} />
          </mesh>
          {/* glowing roof edge */}
          {[
            [0, t.d / 2, t.w, 0.12],
            [0, -t.d / 2, t.w, 0.12],
          ].map(([ox, oz, w, d], i) => (
            <mesh key={i} position={[t.x + ox, t.h + 0.05, t.z + oz]} material={neonMaterial(t.color, 2.6)}>
              <boxGeometry args={[w, 0.1, d]} />
            </mesh>
          ))}
          {[-1, 1].map((sx) => (
            <mesh key={sx} position={[t.x + (sx * t.w) / 2, t.h + 0.05, t.z]} material={neonMaterial(t.color, 2.6)}>
              <boxGeometry args={[0.12, 0.1, t.d]} />
            </mesh>
          ))}
          {/* corner light strips */}
          {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sz], i) => (
            <mesh key={`c${i}`} position={[t.x + (sx * t.w) / 2, t.h / 2, t.z + (sz * t.d) / 2]} material={neonMaterial(t.color, 1.8)}>
              <boxGeometry args={[0.14, t.h, 0.14]} />
            </mesh>
          ))}
          {t.sign && (
            <NeonText position={[t.x, Math.min(t.h - 2, 6 + t.h * 0.4), t.z + t.d / 2 + 0.05]} fontSize={Math.min(2, t.w / 5)} color={t.color}>
              {t.sign}
            </NeonText>
          )}
        </group>
      ))}
    </>
  )
}

function Street() {
  const asphalt = useMemo(() => surfaceMaterial('#0b0816', 0.2, 0.7), [])
  return (
    <>
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[34, 0.5, 52]} position={[0, -0.5, -13]} />
        {/* boundary */}
        <CuboidCollider args={[0.5, 40, 52]} position={[-33, 40, -13]} />
        <CuboidCollider args={[0.5, 40, 52]} position={[33, 40, -13]} />
        <CuboidCollider args={[34, 40, 0.5]} position={[0, 40, -65]} />
        <CuboidCollider args={[34, 40, 0.5]} position={[0, 40, 38]} />
      </RigidBody>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, -13]} material={asphalt}>
        <planeGeometry args={[66, 104]} />
      </mesh>
      {Array.from({ length: 14 }, (_, i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 30 - i * 6.5]} material={neonMaterial('#ffe14d', 0.8)}>
          <planeGeometry args={[0.2, 2.6]} />
        </mesh>
      ))}
      {[-1, 1].map((s) => (
        <mesh key={s} rotation={[-Math.PI / 2, 0, 0]} position={[s * 5, 0.012, -13]} material={neonMaterial(s < 0 ? '#ff2bd6' : '#00f0ff', 1.3)}>
          <planeGeometry args={[0.1, 100]} />
        </mesh>
      ))}
      {/* outer facades so the play space feels enclosed by the city */}
      {[-1, 1].map((s) =>
        Array.from({ length: 6 }, (_, i) => (
          <mesh key={`${s}${i}`} position={[s * 36, 20, 28 - i * 17]} material={towerMaterial(i % 2 ? '#ff2bd6' : '#00f0ff', 0.35)}>
            <boxGeometry args={[6, 40 + (i % 3) * 14, 15]} />
          </mesh>
        )),
      )}
      {/* hidden alley behind the noodle stand */}
      <Block position={[-22, 1, -12]} size={[3, 2, 4]} color="#2a1420" edge={neonMaterial('#ff9a4d', 1.4)} />
      <Block position={[-22, 2.6, -14.6]} size={[3.4, 0.3, 1]} color="#ff2bd6" />
      <NeonText position={[-20.4, 2.4, -12]} rotation={[0, Math.PI / 2, 0]} fontSize={0.5} color="#ff9a4d">
        NOODLES
      </NeonText>
      <Block position={[-25, 1.5, -6]} size={[1.2, 3, 8]} color="#140c1e" />
    </>
  )
}

/** Elevated walkways / roads with railings. */
function Bridges() {
  const deck = surfaceMaterial('#141224', 0.35, 0.6)
  const bridges: { pos: [number, number, number]; size: [number, number, number]; color: string; alongX: boolean }[] = [
    { pos: [-1.5, 7.75, -2], size: [15, 0.5, 3], color: '#00f0ff', alongX: true },
    { pos: [14, 13.75, -12], size: [3, 0.5, 10], color: '#9d4dff', alongX: false },
  ]
  return (
    <>
      {/* ledges the bridges land on */}
      <Block position={[7.5, 7.75, -2]} size={[3, 0.5, 4]} material={deck} edge={neonMaterial('#00f0ff', 2)} />
      <Block position={[14, 13.75, -18.5]} size={[6, 0.5, 3]} material={deck} edge={neonMaterial('#9d4dff', 2)} />
      {bridges.map((b, i) => (
        <group key={i}>
          <Block position={b.pos} size={b.size} material={deck} />
          {[-1, 1].map((s) => (
            <group key={s}>
              <Block
                position={b.alongX ? [b.pos[0], b.pos[1] + 0.75, b.pos[2] + s * (b.size[2] / 2 - 0.05)] : [b.pos[0] + s * (b.size[0] / 2 - 0.05), b.pos[1] + 0.75, b.pos[2]]}
                size={b.alongX ? [b.size[0], 1, 0.1] : [0.1, 1, b.size[2]]}
                material={surfaceMaterial('#22203a', 0.3, 0.6)}
              />
              <mesh
                position={b.alongX ? [b.pos[0], b.pos[1] + 1.27, b.pos[2] + s * (b.size[2] / 2 - 0.05)] : [b.pos[0] + s * (b.size[0] / 2 - 0.05), b.pos[1] + 1.27, b.pos[2]]}
                material={neonMaterial(b.color, 2.4)}
              >
                <boxGeometry args={b.alongX ? [b.size[0], 0.06, 0.14] : [0.14, 0.06, b.size[2]]} />
              </mesh>
            </group>
          ))}
          {Array.from({ length: Math.floor((b.alongX ? b.size[0] : b.size[2]) / 2.5) }, (_, k) => (
            <mesh
              key={k}
              rotation={[-Math.PI / 2, 0, b.alongX ? Math.PI / 2 : 0]}
              position={b.alongX ? [b.pos[0] - b.size[0] / 2 + 1.25 + k * 2.5, b.pos[1] + 0.26, b.pos[2]] : [b.pos[0], b.pos[1] + 0.26, b.pos[2] - b.size[2] / 2 + 1.25 + k * 2.5]}
              material={neonMaterial('#ffe14d', 1)}
            >
              <planeGeometry args={[0.12, 1.2]} />
            </mesh>
          ))}
        </group>
      ))}
      <NeonText position={[-1.5, 10, -2]} fontSize={0.4} color="#00f0ff">
        SKYBRIDGE 8
      </NeonText>
    </>
  )
}

const ADS = ['DRINK NEON COLA', 'VANTA CORP · OWN THE SKY', 'LOOK BEHIND ME →', 'NO PARKING · ANY LEVEL']

function Billboard() {
  const [ad, setAd] = useState(0)
  const [x, y, z] = CITY.billboard
  return (
    <>
      <group position={[x, y, z]}>
        <Block position={[-3.6, 2.5, 0]} size={[0.3, 5, 0.3]} color="#1a1428" />
        <Block position={[3.6, 2.5, 0]} size={[0.3, 5, 0.3]} color="#1a1428" />
        <Block position={[0, 3.5, 0]} size={[8, 3.4, 0.3]} color="#120c22" />
        <mesh position={[0, 3.5, 0.16]} material={neonMaterial(ad === 2 ? '#3dff8b' : '#9d4dff', 0.6)}>
          <planeGeometry args={[7.6, 3]} />
        </mesh>
        <NeonText position={[0, 3.5, 0.2]} fontSize={0.62} color={ad === 2 ? '#3dff8b' : '#ffffff'} maxWidth={7.2} textAlign="center">
          {ADS[ad]}
        </NeonText>
      </group>
      <Kiosk
        id="billboard-switch"
        position={CITY.billboardSwitch}
        rotationY={0}
        title="AD CONTROL"
        subtitle="maintenance access"
        prompt="Cycle the billboard advert"
        color="#9d4dff"
        onInteract={() => {
          setAd((a) => (a + 1) % ADS.length)
          sfx('select')
        }}
      />
    </>
  )
}

function RadioTower() {
  const on = useGame((s) => s.progress.flags.includes('city-radio'))
  const beams = useRef<Group>(null)
  const beamMat = useMemo(() => new MeshBasicMaterial({ color: new Color('#ffe14d').multiplyScalar(1.2), transparent: true, opacity: 0.12, blending: AdditiveBlending, depthWrite: false, toneMapped: false }), [])
  useFrame((s) => {
    if (beams.current) beams.current.rotation.y = s.clock.elapsedTime * 0.4
  })
  useInteractable({
    id: 'radio-tower',
    position: [CITY.radio[0] + 2, CITY.radio[1] + 1, CITY.radio[2] + 2],
    radius: 2.4,
    label: on ? 'The broadcast tower hums' : 'Power the broadcast tower',
    enabled: !on,
    onInteract: () => {
      useGame.getState().setFlag('city-radio')
      sfx('unlock')
      useGame.getState().toast({ kind: 'secret', title: 'Broadcast tower online', body: 'Searchlights sweep the skyline' })
    },
  })
  const [x, y, z] = CITY.radio
  return (
    <group position={[x, y, z]}>
      <mesh position={[0, 5, 0]} material={surfaceMaterial('#2a2238', 0.4, 0.8)}>
        <cylinderGeometry args={[0.15, 0.5, 10, 6]} />
      </mesh>
      {[2, 4, 6, 8].map((h) => (
        <mesh key={h} position={[0, h, 0]} rotation={[Math.PI / 2, 0, 0]} material={neonMaterial(on ? '#ffe14d' : '#554466', on ? 2.6 : 1)}>
          <torusGeometry args={[0.6 - h * 0.04, 0.04, 6, 16]} />
        </mesh>
      ))}
      <mesh position={[0, 10.3, 0]} material={neonMaterial(on ? '#ff4d4d' : '#442233', on ? 3 : 1)}>
        <sphereGeometry args={[0.3, 10, 8]} />
      </mesh>
      <group ref={beams} position={[0, 10, 0]} visible={on}>
        {[0, Math.PI].map((a) => (
          <mesh key={a} rotation={[0, a, 1.1]} position={[Math.cos(a) * 14, 4, Math.sin(a) * 0]} material={beamMat}>
            <coneGeometry args={[3, 30, 16, 1, true]} />
          </mesh>
        ))}
      </group>
    </group>
  )
}

function Garden() {
  const [x, y, z] = CITY.garden
  const flagged = useRef(false)
  useFrame(() => {
    const p = playerState.position
    if (!flagged.current && p.y > y && Math.abs(p.x - x) < 6 && Math.abs(p.z - z) < 6) {
      flagged.current = true
      const g = useGame.getState()
      if (!g.progress.flags.includes('city-rooftop')) {
        g.setFlag('city-rooftop')
        sfx('secret')
        g.toast({ kind: 'secret', title: 'Skyline Garden discovered!', body: 'The highest point in Neon Heights' })
        g.grantXp(60)
      }
    }
  })
  return (
    <group>
      <mesh position={[x, y + 0.02, z]} rotation={[-Math.PI / 2, 0, 0]} material={surfaceMaterial('#123a22', 0.9, 0)}>
        <planeGeometry args={[11, 11]} />
      </mesh>
      {[[-3, -3], [3, -3], [-3, 3], [4, 2]].map(([dx, dz], i) => (
        <group key={i} position={[x + dx, y, z + dz]}>
          <mesh position={[0, 0.6, 0]} material={surfaceMaterial('#3a2416', 0.9, 0)}>
            <cylinderGeometry args={[0.12, 0.16, 1.2, 6]} />
          </mesh>
          <mesh position={[0, 1.7, 0]} material={neonMaterial(i % 2 ? '#3dff8b' : '#ff2bd6', 0.9)}>
            <icosahedronGeometry args={[0.8, 0]} />
          </mesh>
        </group>
      ))}
      <NeonText position={[x, y + 3.5, z - 5.5]} fontSize={0.6} color="#3dff8b">
        SKYLINE GARDEN
      </NeonText>
      <JumpPad position={CITY.gardenReturn} target={[0, 0, 12]} apex={2} color="#00f0ff" label="DROP TO STREET" />
    </group>
  )
}

function Vending() {
  const used = useGame((s) => s.progress.flags.includes('city-vending'))
  return (
    <Kiosk
      id="vending"
      position={CITY.vending}
      rotationY={-Math.PI / 2}
      title="NEON COLA"
      subtitle={used ? 'sold out' : 'free sample!'}
      prompt={used ? 'The machine is sold out' : 'Grab a free Neon Cola'}
      color="#ff2bd6"
      onInteract={() => {
        const g = useGame.getState()
        if (g.progress.flags.includes('city-vending')) return
        g.setFlag('city-vending')
        g.addWallet(3)
        sfx('coin')
        g.toast({ kind: 'coin', title: '+3 coins', body: 'A coupon fell out of the can' })
      }}
    />
  )
}

export default function CityWorld() {
  const quality = useGame((s) => s.settings.quality)
  const radioOn = useGame((s) => s.progress.flags.includes('city-radio'))
  return (
    <group>
      <SkyDome top="#05020f" horizon="#3a0f5a" bottom="#05020f" />
      <mesh position={[-160, 140, -260]}>
        <sphereGeometry args={[28, 24, 16]} />
        <meshBasicMaterial color="#d8d0ff" fog={false} />
      </mesh>
      <Skyline count={quality === 'low' ? 100 : 220} inner={60} outer={200} minH={40} maxH={150} seed={21} fog="#140a28" fogFar={260} />
      <SkyTraffic count={quality === 'low' ? 30 : 70} minR={45} maxR={110} minY={38} maxY={70} color="#00f0ff" />
      <Street />
      <Towers />
      <Bridges />
      <Lift position={CITY.liftA} height={8} color="#ff2bd6" />
      <JumpPad position={CITY.padT1} target={CITY.t3Roof} apex={2.5} color="#3dff8b" label="→ RADIO 8" />
      <JumpPad position={CITY.padT2Ledge} target={CITY.t2Roof} apex={2} color="#3dff8b" label="↑ NEXUS ROOF" />
      <Lift position={[CITY.liftB[0], CITY.liftB[1] + 0.2, CITY.liftB[2]]} height={12} period={8} color="#9d4dff" />
      <Billboard />
      <JumpPad position={CITY.secretPad} target={CITY.garden} apex={3} color="#ffe14d" />
      <RadioTower />
      <Garden />
      <Vending />
      <Relics relics={CITY_LAYOUT.relics!.filter((r) => r.id !== 'sigil-4' || radioOn)} color="#ff2bd6" shape="sigil" />
      <Coins coins={CITY_LAYOUT.coins} />
      {quality !== 'low' && <Rain area={[60, 40, 90]} center={[0, 0, -13]} count={1600} />}
      <Particles count={quality === 'low' ? 150 : 400} area={[60, 40, 90]} center={[0, 0, -13]} color="#ff2bd6" color2="#00f0ff" size={4} rise={0.3} />
      <pointLight position={[0, 10, 10]} color="#ff2bd6" intensity={60} distance={40} />
      <pointLight position={[10, 25, -30]} color="#00f0ff" intensity={60} distance={40} />
      <HomePortal position={[0, 0, 34]} spawnId="fromCity" />
    </group>
  )
}
