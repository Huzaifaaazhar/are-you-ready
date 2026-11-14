import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Group } from 'three'
import { ACHIEVEMENTS } from '../../../data/content'
import { useGame } from '../../../store/useGame'
import { AvatarModel } from '../../avatar/AvatarModel'
import { Block } from '../common/Block'
import { Kiosk } from '../common/Kiosk'
import { NeonText } from '../common/NeonText'
import { neonMaterial, surfaceMaterial } from '../common/materials'
import { HUB_POS } from './layout'
import { WORLD_ORDER, WORLDS } from '../registry'

/** Rotation that makes a station at (x,z) face the plaza centre. */
const faceCenter = (x: number, z: number) => Math.atan2(-x, -z)

export function HallOfRecords() {
  const unlocked = useGame((s) => s.progress.achievements)
  const open = useGame((s) => s.openOverlay)
  const [x, , z] = HUB_POS.records
  const rot = faceCenter(x, z)
  const cols = 5
  return (
    <group>
      <group position={[x, 0, z]} rotation={[0, rot, 0]}>
        <group position={[0, 0, -4]}>
          <Block position={[0, 3.5, 0]} size={[12, 7, 0.8]} color="#120c22" edge={neonMaterial('#ffe14d', 2)} />
        </group>
        <NeonText position={[0, 6.4, -3.5]} fontSize={0.6} color="#ffe14d" letterSpacing={0.12}>
          HALL OF RECORDS
        </NeonText>
        {ACHIEVEMENTS.map((a, i) => {
          const on = unlocked.includes(a.id)
          const cx = (i % cols) - (cols - 1) / 2
          const cy = Math.floor(i / cols)
          return (
            <group key={a.id} position={[cx * 2.2, 5 - cy * 1.6, -3.55]}>
              <mesh material={on ? neonMaterial('#ffe14d', 0.5) : surfaceMaterial('#1c1630', 0.6, 0.4)}>
                <planeGeometry args={[2, 1.4]} />
              </mesh>
              <NeonText position={[0, 0.2, 0.01]} fontSize={0.45} color={on ? '#ffe14d' : '#4a4066'} intensity={on ? 3 : 1}>
                {a.glyph}
              </NeonText>
              <NeonText position={[0, -0.38, 0.01]} fontSize={0.15} maxWidth={1.9} textAlign="center" color={on ? '#ffffff' : '#4a4066'} intensity={on ? 1.6 : 1} mono>
                {on ? a.title : 'LOCKED'}
              </NeonText>
            </group>
          )
        })}
      </group>
      <Kiosk
        id="records-kiosk"
        position={[x - Math.sin(rot) * -1.5, 0, z - Math.cos(rot) * -1.5]}
        rotationY={rot}
        title="ACHIEVEMENTS"
        subtitle={`${unlocked.length} / ${ACHIEVEMENTS.length} unlocked`}
        prompt="View achievement records"
        color="#ffe14d"
        onInteract={() => open({ type: 'achievements' })}
      />
    </group>
  )
}

export function IdentityNexus() {
  const avatar = useGame((s) => s.avatar)
  const open = useGame((s) => s.openOverlay)
  const openCreator = useGame((s) => s.openCreator)
  const statue = useRef<Group>(null)
  useFrame((_, dt) => {
    if (statue.current) statue.current.rotation.y += dt * 0.5
  })
  const [x, , z] = HUB_POS.identity
  const [fx, , fz] = HUB_POS.forge
  return (
    <group>
      <group position={[x, 0, z]}>
        <Block position={[0, 0.3, 0]} size={[3.2, 0.6, 3.2]} color="#140f2a" edge={neonMaterial('#ff2bd6', 2.5)} />
        <group ref={statue} position={[0, 0.6, 0]} scale={1.7}>
          {avatar && <AvatarModel config={avatar} showcase />}
        </group>
        <mesh position={[0, 0.62, 0]} rotation={[-Math.PI / 2, 0, 0]} material={neonMaterial('#ff2bd6', 1.5)}>
          <ringGeometry args={[1.1, 1.3, 32]} />
        </mesh>
        <NeonText position={[0, 4.6, 0]} rotation={[0, faceCenter(x, z), 0]} fontSize={0.42} color="#ff2bd6">
          {avatar ? avatar.name.toUpperCase() : 'IDENTITY NEXUS'}
        </NeonText>
        <pointLight position={[0, 3, 2]} color="#ff2bd6" intensity={20} distance={10} />
      </group>
      <Kiosk
        id="profile-kiosk"
        position={[x + 3.5, 0, z - 2]}
        rotationY={faceCenter(x + 3.5, z - 2)}
        title="IDENTITY NEXUS"
        subtitle="player profile & stats"
        prompt="View your player profile"
        color="#ff2bd6"
        onInteract={() => open({ type: 'profile' })}
      />
      {/* Avatar forge booth */}
      <group position={[fx, 0, fz]} rotation={[0, faceCenter(fx, fz), 0]}>
        {[-1.8, 1.8].map((ox) => (
          <Block key={ox} position={[ox, 2, -0.6]} size={[0.4, 4, 0.4]} color="#1a1236" edge={neonMaterial('#00f0ff', 2)} />
        ))}
        <mesh position={[0, 4.1, -0.6]} material={neonMaterial('#00f0ff', 2.5)}>
          <boxGeometry args={[4, 0.2, 0.4]} />
        </mesh>
        <NeonText position={[0, 4.7, -0.6]} fontSize={0.45} color="#00f0ff">
          AVATAR FORGE
        </NeonText>
      </group>
      <Kiosk
        id="forge-kiosk"
        position={[fx, 0, fz]}
        rotationY={faceCenter(fx, fz)}
        title="AVATAR FORGE"
        subtitle="re-forge your look"
        prompt="Edit your avatar"
        color="#00f0ff"
        onInteract={() => openCreator('world')}
      />
    </group>
  )
}

export function AtlasObservatory() {
  const open = useGame((s) => s.openOverlay)
  const visited = useGame((s) => s.progress.visited)
  const globe = useRef<Group>(null)
  useFrame((_, dt) => {
    if (globe.current) globe.current.rotation.y += dt * 0.3
  })
  const [x, , z] = HUB_POS.atlas
  return (
    <group>
      <group position={[x, 0, z]}>
        <Block position={[0, 0.5, 0]} size={[3.4, 1, 3.4]} color="#0f1430" edge={neonMaterial('#4d7cff', 2.5)} />
        <group ref={globe} position={[0, 3.4, 0]}>
          <mesh>
            <icosahedronGeometry args={[1.5, 2]} />
            <meshBasicMaterial wireframe color={[0.6, 1.0, 4.0]} toneMapped={false} />
          </mesh>
          {WORLD_ORDER.map((id, i) => {
            const a = (i / WORLD_ORDER.length) * Math.PI * 2
            const seen = visited.includes(id)
            return (
              <group key={id} position={[Math.cos(a) * 2.4, Math.sin(i * 2) * 0.4, Math.sin(a) * 2.4]}>
                <mesh material={neonMaterial(seen ? '#3dff8b' : '#ff2bd6', 3)}>
                  <sphereGeometry args={[0.18, 12, 10]} />
                </mesh>
                <NeonText position={[0, 0.45, 0]} fontSize={0.22} color={seen ? '#3dff8b' : '#ff2bd6'} mono>
                  {WORLDS[id].layout.name.toUpperCase()}
                </NeonText>
              </group>
            )
          })}
        </group>
      </group>
      <Kiosk
        id="atlas-kiosk"
        position={[x + 3, 0, z + 3]}
        rotationY={faceCenter(x + 3, z + 3)}
        title="ATLAS OBSERVATORY"
        subtitle={`${visited.length} / ${WORLD_ORDER.length} worlds charted`}
        prompt="Open the world atlas"
        color="#4d7cff"
        onInteract={() => open({ type: 'map' })}
      />
    </group>
  )
}

export function ServiceKiosks() {
  const open = useGame((s) => s.openOverlay)
  const items = useGame((s) => s.progress.items.length)
  return (
    <>
      <Kiosk
        id="locker"
        position={HUB_POS.locker}
        rotationY={faceCenter(HUB_POS.locker[0], HUB_POS.locker[2]) + Math.PI}
        title="INVENTORY LOCKER"
        subtitle={`${items} item${items === 1 ? '' : 's'} stored`}
        prompt="Open your inventory"
        color="#9d4dff"
        onInteract={() => open({ type: 'inventory' })}
      >
        {[-1.3, 1.3].map((ox) => (
          <mesh key={ox} position={[ox, 1.2, -0.6]} material={surfaceMaterial('#1d1540', 0.4, 0.6)}>
            <boxGeometry args={[1, 2.4, 0.6]} />
          </mesh>
        ))}
      </Kiosk>
      <Kiosk
        id="beacon"
        position={HUB_POS.beacon}
        rotationY={faceCenter(HUB_POS.beacon[0], HUB_POS.beacon[2]) + Math.PI}
        title="WELCOME BEACON"
        subtitle="new arrivals start here"
        prompt="Read the welcome beacon"
        color="#00f0ff"
        onInteract={() =>
          open({
            type: 'info',
            title: 'Welcome to OASIS Prime',
            accent: '#00f0ff',
            body: [
              'This plaza is the crossroads of the OASIS. Every world is a portal away.',
              'NORTH — the Arcade District portal. Cabinets, prizes, and something that will not play.',
              'WEST — the Founder’s Gate. Three locks guard the Founder’s contest.',
              'EAST — the Velocity Circuit. An on-foot time trial around the plaza.',
              'SOUTH-WEST — Identity Nexus and Avatar Forge. SOUTH-EAST — Hall of Records. NORTH-WEST — Atlas Observatory.',
              'Controls: WASD move · Mouse look · Space jump · Shift sprint · E interact · I inventory · M map · Esc pause.',
            ],
          })
        }
      />
    </>
  )
}
