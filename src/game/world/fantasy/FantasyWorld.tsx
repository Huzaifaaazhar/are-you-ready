import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { CylinderCollider, RigidBody } from '@react-three/rapier'
import { Color, DoubleSide, Group, Mesh, ShaderMaterial } from 'three'
import { create } from 'zustand'
import type { Vec3 } from '../../../data/content'
import { useGame } from '../../../store/useGame'
import { useInteractable } from '../../systems/interaction'
import { playerState } from '../../systems/playerState'
import { sfx } from '../../systems/audio'
import { Block } from '../common/Block'
import { Coins } from '../common/Coins'
import { ItemPickup } from '../common/ItemPickup'
import { NeonText } from '../common/NeonText'
import { Particles } from '../common/Particles'
import { SkyDome } from '../common/SkyDome'
import { neonMaterial, surfaceMaterial } from '../common/materials'
import { Beacon, HomePortal, Lift, Relics } from '../common/Traversal'
import { AETHER_STEPS, FANTASY_LAYOUT, GARDEN, ISLES, OBELISK, RUNE_TILES, SECRET_PORTAL, STATUES, STONES, type Isle } from './layout'

const stone = () => surfaceMaterial('#8a8070', 0.85, 0.05)

function Island({ isle }: { isle: Isle }) {
  const [x, y, z] = isle.pos
  return (
    <group>
      <RigidBody type="fixed" colliders={false}>
        <CylinderCollider args={[1, isle.r]} position={[x, y - 1, z]} />
      </RigidBody>
      <mesh position={[x, y - 0.15, z]} material={surfaceMaterial(isle.grass, 0.95, 0)}>
        <cylinderGeometry args={[isle.r, isle.r * 0.97, 0.3, 32]} />
      </mesh>
      <mesh position={[x, y - 0.8, z]} material={surfaceMaterial('#7a5a3a', 0.95, 0)}>
        <cylinderGeometry args={[isle.r * 0.97, isle.r * 0.9, 1, 32]} />
      </mesh>
      <mesh position={[x, y - 1.3 - isle.r * 0.6, z]} rotation={[Math.PI, 0, 0]} material={surfaceMaterial('#6a5a4e', 1, 0)}>
        <coneGeometry args={[isle.r * 0.9, isle.r * 1.2, 9]} />
      </mesh>
    </group>
  )
}

function Tree({ pos, s = 1 }: { pos: Vec3; s?: number }) {
  return (
    <group position={pos} scale={s}>
      <mesh position={[0, 1, 0]} material={surfaceMaterial('#6a4428', 0.9, 0)}>
        <cylinderGeometry args={[0.15, 0.22, 2, 7]} />
      </mesh>
      <mesh position={[0, 2.6, 0]} material={surfaceMaterial('#3f8a3a', 0.9, 0)}>
        <coneGeometry args={[1.1, 2.4, 8]} />
      </mesh>
      <mesh position={[0, 3.6, 0]} material={surfaceMaterial('#4fa046', 0.9, 0)}>
        <coneGeometry args={[0.8, 1.8, 8]} />
      </mesh>
    </group>
  )
}

function CloudSea() {
  const mat = useMemo(
    () =>
      new ShaderMaterial({
        transparent: true,
        depthWrite: false,
        uniforms: { uTime: { value: 0 } },
        vertexShader: `varying vec2 vUv; varying vec3 vW; void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
        fragmentShader: `uniform float uTime; varying vec3 vW;
          float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); }
          float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f); return mix(mix(h(i), h(i+vec2(1,0)), f.x), mix(h(i+vec2(0,1)), h(i+vec2(1,1)), f.x), f.y); }
          void main(){ vec2 p = vW.xz * 0.03 + vec2(uTime * 0.02, 0.0); float c = n(p) * 0.5 + n(p * 2.3) * 0.3 + n(p * 5.1) * 0.2;
            vec3 col = mix(vec3(1.0, 0.78, 0.66), vec3(1.0, 0.95, 0.9), c); float d = length(vW.xz); gl_FragColor = vec4(col, smoothstep(0.25, 0.7, c) * 0.85 * (1.0 - smoothstep(180.0, 320.0, d))); }`,
      }),
    [],
  )
  useFrame((s) => {
    mat.uniforms.uTime.value = s.clock.elapsedTime
  })
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -14, -20]} material={mat}>
      <planeGeometry args={[700, 700]} />
    </mesh>
  )
}

function Waterfall() {
  const mat = useMemo(
    () =>
      new ShaderMaterial({
        transparent: true,
        side: DoubleSide,
        depthWrite: false,
        uniforms: { uTime: { value: 0 } },
        vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
        fragmentShader: `uniform float uTime; varying vec2 vUv; void main(){ float s = fract(vUv.y * 6.0 + uTime * 1.6 + sin(vUv.x * 20.0) * 0.1); float a = (0.45 + 0.4 * step(0.7, s)) * smoothstep(0.0, 0.15, vUv.x) * smoothstep(1.0, 0.85, vUv.x) * smoothstep(0.0, 0.3, vUv.y); gl_FragColor = vec4(mix(vec3(0.6,0.85,1.0), vec3(1.0), step(0.75, s)), a); }`,
      }),
    [],
  )
  useFrame((s) => {
    mat.uniforms.uTime.value = s.clock.elapsedTime
  })
  return (
    <mesh position={[10.6, -6, 18]} rotation={[0, Math.PI / 2, 0]} material={mat}>
      <planeGeometry args={[3.4, 18]} />
    </mesh>
  )
}

function Statue({ index }: { index: number }) {
  const def = STATUES[index]
  const solved = useGame((s) => s.progress.flags.includes('fantasy-bridge'))
  const rot = useFantasyStatues((s) => s[index])
  const ref = useRef<Group>(null)
  const target = (solved ? def.solve : rot) * (Math.PI / 2)
  useInteractable({
    id: `statue-${index}`,
    position: [def.pos[0], 1, def.pos[2]],
    radius: 2.2,
    enabled: !solved,
    label: 'Turn the guardian statue',
    onInteract: () => turnStatue(index),
  })
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y += (target - ref.current.rotation.y) * Math.min(1, dt * 6)
  })
  return (
    <group position={def.pos}>
      <Block position={[0, 0.4, 0]} size={[1.6, 0.8, 1.6]} material={stone()} />
      <group ref={ref} position={[0, 0.8, 0]}>
        <mesh position={[0, 1.2, 0]} material={stone()}>
          <capsuleGeometry args={[0.45, 1.4, 4, 10]} />
        </mesh>
        <mesh position={[0, 2.4, 0]} material={stone()}>
          <sphereGeometry args={[0.38, 12, 10]} />
        </mesh>
        <mesh position={[0, 2.45, 0.34]} material={neonMaterial(solved ? '#9fe8ff' : '#ffb070', 2.6)}>
          <boxGeometry args={[0.36, 0.08, 0.05]} />
        </mesh>
        <mesh position={[0, 1.3, 0.65]} rotation={[Math.PI / 2, 0, 0]} material={stone()}>
          <coneGeometry args={[0.18, 0.6, 6]} />
        </mesh>
      </group>
    </group>
  )
}

const useFantasyStatues = create<number[]>(() => [0, 0, 0])
const useRuneTiles = create<boolean[]>(() => [false, false, false, false])
if (typeof window !== 'undefined') (window as unknown as { __fantasy: unknown }).__fantasy = { statues: useFantasyStatues, tiles: useRuneTiles }

function turnStatue(i: number) {
  const next = [...useFantasyStatues.getState()]
  next[i] = (next[i] + 1) % 4
  useFantasyStatues.setState(next, true)
  sfx('select')
  if (next.every((r, k) => r === STATUES[k].solve)) {
    const g = useGame.getState()
    g.setFlag('fantasy-bridge')
    sfx('unlock')
    g.toast({ kind: 'secret', title: 'The guardians align', body: 'An aether bridge rises toward the castle' })
    g.grantXp(50)
  }
}

function Ruins() {
  const crystal = useRef<Mesh>(null)
  useFrame((s) => {
    if (crystal.current) {
      crystal.current.rotation.y = s.clock.elapsedTime * 0.8
      crystal.current.position.y = 3.2 + Math.sin(s.clock.elapsedTime) * 0.2
    }
  })
  return (
    <group>
      <group position={OBELISK}>
        <Block position={[0, 0.9, 0]} size={[1.4, 1.8, 1.4]} material={stone()} />
        <mesh ref={crystal} position={[0, 3.2, 0]} material={neonMaterial('#9fe8ff', 2.4)}>
          <octahedronGeometry args={[0.7, 0]} />
        </mesh>
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} material={neonMaterial('#9fe8ff', 1.2)}>
          <ringGeometry args={[2.6, 2.8, 48]} />
        </mesh>
      </group>
      {STATUES.map((_, i) => (
        <Statue key={i} index={i} />
      ))}
      {/* broken columns */}
      {[[-8, -4, 3], [8, -5, 2], [7, -19, 4], [-3, -21, 1.5]].map(([x, z, h], i) => (
        <Block key={i} position={[x, h / 2, z]} size={[1, h, 1]} material={stone()} />
      ))}
      {/* fallen arch */}
      <Block position={[-9.2, 1.5, -19]} size={[0.8, 3, 0.8]} material={stone()} />
      <Block position={[-5.8, 1.5, -19]} size={[0.8, 3, 0.8]} material={stone()} />
      <Block position={[-7.5, 3.2, -19]} size={[4.2, 0.6, 1]} material={stone()} />
      <NeonText position={[0, 5.4, -12]} fontSize={0.4} color="#ffb070">
        TURN THE GUARDIANS TO THE LIGHT
      </NeonText>
    </group>
  )
}

function AetherBridge() {
  const on = useGame((s) => s.progress.flags.includes('fantasy-bridge'))
  if (!on) return null
  return (
    <>
      {AETHER_STEPS.map((p, i) => (
        <group key={i}>
          <Block position={[p[0], p[1] - 0.2, p[2]]} size={[3, 0.4, 3]} material={neonMaterial('#9fe8ff', 0.7)} edge={neonMaterial('#ffffff', 2)} />
        </group>
      ))}
    </>
  )
}

function Castle() {
  const wall = surfaceMaterial('#a89a86', 0.85, 0.05)
  const cy = 4
  const z0 = -58
  const z1 = -38
  return (
    <group>
      {/* walls (south wall has the gate) */}
      <Block position={[0, cy + 2, z0]} size={[22, 4, 1]} material={wall} />
      <Block position={[-6.5, cy + 2, z1]} size={[9, 4, 1]} material={wall} />
      <Block position={[6.5, cy + 2, z1]} size={[9, 4, 1]} material={wall} />
      <Block position={[-10, cy + 2, -48]} size={[2, 4, 20]} material={wall} />
      <Block position={[10, cy + 2, -48]} size={[1, 4, 20]} material={wall} />
      <Block position={[0, cy + 4.6, z1]} size={[4, 1.2, 1]} material={wall} />
      {/* crenellations */}
      {Array.from({ length: 11 }, (_, i) => (
        <mesh key={i} position={[-10 + i * 2, cy + 4.4, z0]} material={wall}>
          <boxGeometry args={[1, 0.8, 1]} />
        </mesh>
      ))}
      {/* corner towers */}
      {[[-10, z0], [10, z0], [-10, z1], [10, z1]].map(([x, z], i) => (
        <group key={i}>
          <RigidBody type="fixed" colliders={false}>
            <CylinderCollider args={[i === 0 ? 5 : 4, 2.2]} position={[x, cy + (i === 0 ? 5 : 4), z]} />
          </RigidBody>
          <mesh position={[x, cy + (i === 0 ? 5 : 4), z]} material={wall}>
            <cylinderGeometry args={[2.2, 2.4, i === 0 ? 10 : 8, 14]} />
          </mesh>
          <mesh position={[x, cy + (i === 0 ? 11.2 : 9.2), z]} material={surfaceMaterial('#5a3a8a', 0.6, 0.1)}>
            <coneGeometry args={[2.6, 2.4, 14]} />
          </mesh>
        </group>
      ))}
      {/* stair up the west wall, wall-walk, lift to the NW tower top */}
      {Array.from({ length: 8 }, (_, i) => (
        <Block key={i} position={[-7.8, cy + (0.5 * (i + 1)) / 2, -40.5 - i * 1.15]} size={[1.6, 0.5 * (i + 1), 1.15]} material={wall} />
      ))}
      <Lift position={[-10, cy + 4.2, -55]} size={[2, 0.4, 2]} height={6} period={7} color="#ffb070" />
      <Block position={[-10, cy + 10.25, -58.5]} size={[4.4, 0.5, 4.4]} material={wall} edge={neonMaterial('#ffb070', 1.6)} />
      {/* banners */}
      {[-4, 4].map((x) => (
        <mesh key={x} position={[x, cy + 2.6, z1 + 0.55]} material={surfaceMaterial('#5a2a8a', 0.8, 0)}>
          <planeGeometry args={[1.4, 3]} />
        </mesh>
      ))}
      <NeonText position={[0, cy + 6, z1 + 0.6]} fontSize={0.6} color="#ffb070">
        CASTLE AETHER
      </NeonText>
    </group>
  )
}

function RuneTiles() {
  const secret = useGame((s) => s.progress.flags.includes('fantasy-secret'))
  const lit = useRuneTiles((s) => s)
  useFrame(() => {
    if (secret) return
    const p = playerState.position
    const cur = useRuneTiles.getState()
    RUNE_TILES.forEach((t, i) => {
      if (!cur[i] && Math.abs(p.x - t[0]) < 1.1 && Math.abs(p.z - t[2]) < 1.1 && p.y < t[1] + 2) {
        const next = [...cur]
        next[i] = true
        useRuneTiles.setState(next, true)
        sfx('select')
        if (next.every(Boolean)) {
          const g = useGame.getState()
          g.setFlag('fantasy-secret')
          sfx('secret')
          g.toast({ kind: 'secret', title: 'A secret portal opens', body: 'In the heart of the courtyard' })
          g.grantXp(50)
        }
      }
    })
  })
  return (
    <>
      {RUNE_TILES.map((t, i) => (
        <mesh key={i} position={[t[0], t[1] + 0.03, t[2]]} rotation={[-Math.PI / 2, 0, i]} material={neonMaterial('#c88cff', secret || lit[i] ? 2.6 : 0.5)}>
          <ringGeometry args={[0.6, 0.9, 5]} />
        </mesh>
      ))}
    </>
  )
}

/** Warp ring within the realm (courtyard ⇄ sky garden). */
function WarpRing({ at, to, label, active }: { at: Vec3; to: Vec3; label: string; active: boolean }) {
  const ref = useRef<Group>(null)
  const cool = useRef(0)
  useFrame((s, dt) => {
    if (ref.current) ref.current.rotation.y = s.clock.elapsedTime * 1.4
    cool.current = Math.max(0, cool.current - dt)
    if (!active || cool.current > 0) return
    const p = playerState.position
    if (Math.hypot(p.x - at[0], p.z - at[2]) < 1.2 && Math.abs(p.y - 0.85 - at[1]) < 1.5) {
      cool.current = 2
      sfx('portal')
      playerState.teleport?.([to[0], to[1] + 1.2, to[2]])
    }
  })
  if (!active) return null
  return (
    <group position={at}>
      <group ref={ref} position={[0, 1.4, 0]}>
        <mesh material={neonMaterial('#c88cff', 2.8)}>
          <torusGeometry args={[1.2, 0.07, 8, 40]} />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]} material={neonMaterial('#9fe8ff', 2.4)}>
          <torusGeometry args={[1.2, 0.05, 8, 40]} />
        </mesh>
      </group>
      <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]} material={neonMaterial('#c88cff', 1.4)}>
        <circleGeometry args={[1.2, 32]} />
      </mesh>
      <NeonText position={[0, 3.2, 0]} fontSize={0.3} color="#c88cff">
        {label}
      </NeonText>
    </group>
  )
}

function SkyGarden() {
  const secret = useGame((s) => s.progress.flags.includes('fantasy-secret'))
  const [x, y, z] = GARDEN
  return (
    <group>
      <Island isle={{ id: 'garden', pos: GARDEN, r: 7, grass: '#78c060' }} />
      <Tree pos={[x - 4, y, z - 2]} s={1.2} />
      <Tree pos={[x + 4, y, z + 3]} />
      {Array.from({ length: 12 }, (_, i) => (
        <mesh key={i} position={[x + Math.cos(i) * 4, y + 0.2, z + Math.sin(i * 1.3) * 4]} material={neonMaterial(i % 2 ? '#ff9adf' : '#9fe8ff', 2)}>
          <sphereGeometry args={[0.12, 6, 4]} />
        </mesh>
      ))}
      <ItemPickup item="aether-crystal" position={[x, y, z]} color="#9fe8ff">
        <mesh material={neonMaterial('#9fe8ff', 2.4)} scale={[0.6, 1.2, 0.6]}>
          <octahedronGeometry args={[0.6, 0]} />
        </mesh>
      </ItemPickup>
      <WarpRing at={[x + 3, y, z + 4]} to={[SECRET_PORTAL[0] + 2, SECRET_PORTAL[1], SECRET_PORTAL[2] + 4]} label="BACK TO THE COURTYARD" active={secret} />
      <NeonText position={[x, y + 4.5, z - 5]} fontSize={0.5} color="#9fe8ff">
        THE HIDDEN GARDEN
      </NeonText>
    </group>
  )
}

function Spire() {
  const circle = useRef<Group>(null)
  useFrame((s) => {
    if (circle.current) {
      circle.current.rotation.y = s.clock.elapsedTime * 0.5
      circle.current.children.forEach((c, i) => (c.position.y = 2.2 + Math.sin(s.clock.elapsedTime * 1.5 + i) * 0.3))
    }
  })
  const [x, y, z] = ISLES[4].pos
  return (
    <group>
      {STONES.map((p, i) => (
        <Block key={i} position={[p[0], p[1] - 0.25, p[2]]} size={[2.5, 0.5, 2.5]} material={stone()} edge={neonMaterial('#c88cff', 1.4)} />
      ))}
      <mesh position={[x, y + 0.03, z]} rotation={[-Math.PI / 2, 0, 0]} material={neonMaterial('#c88cff', 1.8)}>
        <ringGeometry args={[2.4, 2.6, 6]} />
      </mesh>
      <group ref={circle} position={[x, y, z]}>
        {Array.from({ length: 6 }, (_, i) => {
          const a = (i / 6) * Math.PI * 2
          return (
            <mesh key={i} position={[Math.cos(a) * 3, 2.2, Math.sin(a) * 3]} material={neonMaterial(i % 2 ? '#c88cff' : '#9fe8ff', 2.2)}>
              <octahedronGeometry args={[0.3, 0]} />
            </mesh>
          )
        })}
      </group>
      <mesh position={[x + 2.5, y + 3, z - 2]} material={surfaceMaterial('#5a3a8a', 0.6, 0.1)}>
        <coneGeometry args={[0.9, 6, 8]} />
      </mesh>
    </group>
  )
}

export default function FantasyWorld() {
  const quality = useGame((s) => s.settings.quality)
  const secret = useGame((s) => s.progress.flags.includes('fantasy-secret'))
  return (
    <group>
      <SkyDome top="#3a6fd8" horizon="#ffb98a" bottom="#ffd8b0" stars={false} />
      <mesh position={[120, 60, -260]}>
        <sphereGeometry args={[18, 24, 16]} />
        <meshBasicMaterial color={new Color('#fff2c0').multiplyScalar(1.6)} fog={false} toneMapped={false} />
      </mesh>
      <directionalLight position={[60, 50, -80]} intensity={1.1} color="#ffd8a0" />
      <hemisphereLight args={['#bfe0ff', '#5a8a48', 0.45]} />
      <CloudSea />
      {ISLES.map((i) => (
        <Island key={i.id} isle={i} />
      ))}
      <Block position={[0, -0.25, 3]} size={[3, 0.5, 9]} material={stone()} edge={neonMaterial('#ffb070', 1.2)} />
      <Waterfall />
      {[[-5, 0, 19], [6, 0, 20], [-6, 0, 12], [8, 0, -6], [-8, 0, -15], [9, 4, -40], [-6, 4, -42]].map((p, i) => (
        <Tree key={i} pos={p as Vec3} s={0.8 + (i % 3) * 0.2} />
      ))}
      <Ruins />
      <AetherBridge />
      <Castle />
      <RuneTiles />
      <WarpRing at={SECRET_PORTAL} to={GARDEN} label="TO THE HIDDEN GARDEN" active={secret} />
      <SkyGarden />
      <Spire />
      <Beacon position={[4, 0, -4]} color="#ffb070" />
      <Beacon position={[3, 4, -41]} color="#ffb070" />
      <Beacon position={[-27, 3, -11]} color="#ffb070" />
      <Relics relics={FANTASY_LAYOUT.relics!} color="#c88cff" shape="rune" />
      <Coins coins={FANTASY_LAYOUT.coins} />
      <Particles count={quality === 'low' ? 120 : 350} area={[80, 30, 100]} center={[0, -2, -20]} color="#ffe14d" color2="#ffb070" size={3} rise={0.2} />
      <NeonText position={[0, 4, 9]} fontSize={0.5} color="#ffb070">
        AETHER ISLES
      </NeonText>
      <HomePortal position={[6.2, 0, 21]} rotationY={-Math.PI / 2} spawnId="fromFantasy" />
    </group>
  )
}
