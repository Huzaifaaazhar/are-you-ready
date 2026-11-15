import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { CuboidCollider, RigidBody, type RapierRigidBody } from '@react-three/rapier'
import { AdditiveBlending, Color, Group, Mesh, MeshBasicMaterial, PointLight, ShaderMaterial } from 'three'
import type { Vec3 } from '../../../data/content'
import { useGame } from '../../../store/useGame'
import { playerState } from '../../systems/playerState'
import { sfx } from '../../systems/audio'
import { Block } from '../common/Block'
import { Coins } from '../common/Coins'
import { ItemPickup } from '../common/ItemPickup'
import { NeonText } from '../common/NeonText'
import { Particles } from '../common/Particles'
import { SkyDome } from '../common/SkyDome'
import { neonMaterial, surfaceMaterial } from '../common/materials'
import { Beacon, HazardZone, HomePortal, Relics, hazardHit } from '../common/Traversal'
import { BRIDGE_TILES, CHASM, DATACENTER, GHOST_BYTE, GROUND, POOLS, SECRET_ROOM, SPAWN, STORM_SPOTS, WASTELAND_LAYOUT } from './layout'

const slab = () => surfaceMaterial('#15111a', 0.9, 0.2)

function Ground() {
  const crack = useMemo(
    () =>
      new ShaderMaterial({
        uniforms: { uTime: { value: 0 } },
        vertexShader: `varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
        fragmentShader: `uniform float uTime; varying vec3 vW;
          float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); }
          void main(){ vec2 g = vW.xz / 3.0; vec2 f = fract(g); vec2 i = floor(g);
            float edge = step(f.x, 0.03) + step(f.y, 0.03);
            float broken = step(0.82, h(i));
            float pulse = 0.5 + 0.5 * sin(uTime * 2.0 + h(i) * 6.28);
            vec3 c = vec3(0.035, 0.02, 0.03) + vec3(0.9, 0.05, 0.12) * edge * broken * pulse * 1.4 + vec3(0.05,0.0,0.02) * h(i);
            gl_FragColor = vec4(c, 1.0); }`,
      }),
    [],
  )
  useFrame((s) => {
    crack.uniforms.uTime.value = s.clock.elapsedTime
  })
  return (
    <>
      {GROUND.map(([x0, x1, z0, z1], i) => (
        <group key={i}>
          <RigidBody type="fixed" colliders={false}>
            <CuboidCollider args={[(x1 - x0) / 2, 0.5, (z1 - z0) / 2]} position={[(x0 + x1) / 2, -0.5, (z0 + z1) / 2]} />
          </RigidBody>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[(x0 + x1) / 2, 0.001, (z0 + z1) / 2]} material={crack}>
            <planeGeometry args={[x1 - x0, z1 - z0]} />
          </mesh>
          <mesh position={[(x0 + x1) / 2, -3, (z0 + z1) / 2]} material={slab()}>
            <boxGeometry args={[x1 - x0, 6, z1 - z0]} />
          </mesh>
        </group>
      ))}
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[0.5, 20, 46]} position={[-34.5, 20, -13]} />
        <CuboidCollider args={[0.5, 20, 46]} position={[34.5, 20, -13]} />
        <CuboidCollider args={[34, 20, 0.5]} position={[0, 20, -58.5]} />
        <CuboidCollider args={[34, 20, 0.5]} position={[0, 20, 32.5]} />
      </RigidBody>
      {/* chasm glow */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[(CHASM.x0 + CHASM.x1) / 2, -14, (CHASM.z0 + CHASM.z1) / 2]} material={neonMaterial('#ff2040', 0.6)}>
        <planeGeometry args={[CHASM.x1 - CHASM.x0, CHASM.z1 - CHASM.z0]} />
      </mesh>
    </>
  )
}

/** Animated corruption pool (hazard). */
function Pool({ min, max }: { min: Vec3; max: Vec3 }) {
  const mat = useMemo(
    () =>
      new ShaderMaterial({
        transparent: true,
        toneMapped: false,
        uniforms: { uTime: { value: 0 } },
        vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
        fragmentShader: `uniform float uTime; varying vec2 vUv; float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); }
          void main(){ vec2 g = floor(vUv * 24.0 + vec2(0.0, uTime * 3.0)); float n = h(g + floor(uTime * 8.0)); float e = min(min(vUv.x, 1.0 - vUv.x), min(vUv.y, 1.0 - vUv.y));
            vec3 c = mix(vec3(1.4, 0.05, 0.2), vec3(0.2, 0.0, 0.05), n) + vec3(1.5, 0.2, 0.3) * step(e, 0.04);
            gl_FragColor = vec4(c, 0.92); }`,
      }),
    [],
  )
  useFrame((s) => {
    mat.uniforms.uTime.value = s.clock.elapsedTime
  })
  return (
    <HazardZone min={min} max={max} spawn={SPAWN} reason="Corrupted!">
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[(min[0] + max[0]) / 2, 0.04, (min[2] + max[2]) / 2]} material={mat}>
        <planeGeometry args={[max[0] - min[0], max[2] - min[2]]} />
      </mesh>
    </HazardZone>
  )
}

/** Static storm: marked spots flash, then lightning strikes them. */
function Storm() {
  const marks = useRef<(Mesh | null)[]>([])
  const bolts = useRef<(Mesh | null)[]>([])
  const light = useRef<PointLight>(null)
  const st = useRef({ cycle: -1, struck: false })
  const boltMat = useMemo(() => new MeshBasicMaterial({ color: new Color('#ffd0ff').multiplyScalar(3), toneMapped: false, transparent: true, blending: AdditiveBlending }), [])
  useFrame(() => {
    const t = performance.now() / 1000
    const period = 5
    const cycle = Math.floor(t / period)
    const phase = (t % period) / period
    if (cycle !== st.current.cycle) {
      st.current.cycle = cycle
      st.current.struck = false
    }
    const active = [0, 1, 2].map((k) => STORM_SPOTS[(cycle * 3 + k) % STORM_SPOTS.length])
    marks.current.forEach((m, i) => {
      if (!m) return
      const spot = active[i]
      m.position.set(spot[0], 0.06, spot[2])
      m.visible = phase > 0.35 && phase < 0.75
      m.scale.setScalar(0.6 + Math.sin(t * 20) * 0.08 + (phase - 0.35))
    })
    const strike = phase > 0.72 && phase < 0.82
    bolts.current.forEach((b, i) => {
      if (!b) return
      b.visible = strike
      b.position.set(active[i][0], 15, active[i][2])
    })
    if (light.current) light.current.intensity = strike ? 400 : 0
    if (strike && !st.current.struck) {
      st.current.struck = true
      sfx('explode')
      const p = playerState.position
      if (active.some((s) => Math.hypot(p.x - s[0], p.z - s[2]) < 2.6) && p.y < 3 && !playerState.phasing && !useGame.getState().overlay) hazardHit('Struck by lightning!', SPAWN)
    }
  })
  return (
    <>
      {[0, 1, 2].map((i) => (
        <group key={i}>
          <mesh ref={(m) => { marks.current[i] = m }} rotation={[-Math.PI / 2, 0, 0]} material={neonMaterial('#ff2040', 1.8)} visible={false}>
            <ringGeometry args={[2.0, 2.6, 32]} />
          </mesh>
          <mesh ref={(m) => { bolts.current[i] = m }} material={boltMat} visible={false}>
            <cylinderGeometry args={[0.25, 0.6, 30, 6]} />
          </mesh>
        </group>
      ))}
      <pointLight ref={light} position={[0, 20, 4]} color="#ff9adf" intensity={0} distance={80} />
    </>
  )
}

/** Bridge tiles that fall shortly after you step on them, then reset. */
function CollapsingBridge() {
  const bodies = useRef<(RapierRigidBody | null)[]>([])
  const meshes = useRef<(Group | null)[]>([])
  const st = useRef(BRIDGE_TILES.map(() => ({ stepAt: 0, fallen: 0 })))
  useFrame(() => {
    const now = performance.now()
    const p = playerState.position
    BRIDGE_TILES.forEach((t, i) => {
      const s = st.current[i]
      const b = bodies.current[i]
      const m = meshes.current[i]
      const on = Math.abs(p.x - t[0]) < 1.3 && Math.abs(p.z - t[2]) < 1.1 && Math.abs(p.y - 0.85 - t[1]) < 0.6
      if (on && !s.stepAt && !s.fallen) s.stepAt = now
      if (s.stepAt && !s.fallen && now - s.stepAt > 650) {
        s.fallen = now
        b?.setEnabled(false)
        sfx('blip')
      }
      if (s.fallen && now - s.fallen > 4000) {
        s.fallen = 0
        s.stepAt = 0
        b?.setEnabled(true)
      }
      if (m) {
        const shake = s.stepAt && !s.fallen ? Math.sin(now / 25) * 0.04 : 0
        m.position.set(t[0] + shake, s.fallen ? t[1] - 0.25 - ((now - s.fallen) / 1000) ** 2 * 9 : t[1] - 0.25, t[2])
        m.visible = !s.fallen || now - s.fallen < 1500
      }
    })
  })
  return (
    <>
      {BRIDGE_TILES.map((t, i) => (
        <group key={i}>
          <RigidBody ref={(b) => { bodies.current[i] = b }} type="fixed" colliders={false} position={[t[0], t[1] - 0.25, t[2]]}>
            <CuboidCollider args={[1.3, 0.25, 0.95]} />
          </RigidBody>
          <group ref={(g) => { meshes.current[i] = g }} position={[t[0], t[1] - 0.25, t[2]]}>
            <mesh material={slab()}>
              <boxGeometry args={[2.6, 0.5, 1.9]} />
            </mesh>
            <mesh position={[0, 0.26, 0]} rotation={[-Math.PI / 2, 0, 0]} material={neonMaterial('#ff9a4d', 0.8)}>
              <planeGeometry args={[2.4, 1.7]} />
            </mesh>
          </group>
        </group>
      ))}
    </>
  )
}

function StaticScreen({ pos, rot, size }: { pos: Vec3; rot: Vec3; size: [number, number] }) {
  const mat = useMemo(
    () =>
      new ShaderMaterial({
        toneMapped: false,
        uniforms: { uTime: { value: 0 } },
        vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
        fragmentShader: `uniform float uTime; varying vec2 vUv; float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); }
          void main(){ float n = h(floor(vUv * vec2(120.0, 70.0)) + floor(uTime * 12.0)); float band = step(0.96, fract(vUv.y * 3.0 - uTime * 0.6));
            gl_FragColor = vec4(vec3(n * 0.35) + vec3(0.6, 0.05, 0.1) * band, 1.0); }`,
      }),
    [],
  )
  useFrame((s) => {
    mat.uniforms.uTime.value = s.clock.elapsedTime
  })
  return (
    <group position={pos} rotation={rot}>
      <mesh material={surfaceMaterial('#0c0a10', 0.6, 0.3)}>
        <boxGeometry args={[size[0] + 0.6, size[1] + 0.6, 0.5]} />
      </mesh>
      <mesh position={[0, 0, 0.26]} material={mat}>
        <planeGeometry args={size} />
      </mesh>
    </group>
  )
}

function DataCenter() {
  const passage = useRef(false)
  const glitch = useRef<Mesh>(null)
  const wall = surfaceMaterial('#1a1420', 0.8, 0.2)
  const D = DATACENTER
  useFrame((s) => {
    if (glitch.current) {
      glitch.current.visible = Math.sin(s.clock.elapsedTime * 13) > -0.6
      glitch.current.position.x = D.x1 + (Math.random() - 0.5) * 0.05
    }
    const p = playerState.position
    if (!passage.current && p.x > SECRET_ROOM.x0 && p.z > SECRET_ROOM.z0 && p.z < SECRET_ROOM.z1) {
      passage.current = true
      const g = useGame.getState()
      if (!g.progress.flags.includes('waste-passage')) {
        g.setFlag('waste-passage')
        sfx('secret')
        g.toast({ kind: 'secret', title: 'Hidden passage found', body: 'The wall was never really there' })
        g.grantXp(50)
      }
    }
  })
  const h = 5
  return (
    <group>
      {/* data center shell: doorway on the north side */}
      <Block position={[(D.x0 + D.x1) / 2, h / 2, D.z0]} size={[D.x1 - D.x0, h, 0.6]} material={wall} />
      <Block position={[D.x0 + 3, h / 2, D.z1]} size={[6, h, 0.6]} material={wall} />
      <Block position={[D.x1 - 6, h / 2, D.z1]} size={[12, h, 0.6]} material={wall} />
      <Block position={[D.x0, h / 2, (D.z0 + D.z1) / 2]} size={[0.6, h, D.z1 - D.z0]} material={wall} />
      {/* east wall with a glitched (false) section z -42..-38 */}
      <Block position={[D.x1, h / 2, -44]} size={[0.6, h, 4]} material={wall} />
      <Block position={[D.x1, h / 2, -34]} size={[0.6, h, 8]} material={wall} />
      <mesh ref={glitch} position={[D.x1, h / 2, -40]} material={neonMaterial('#3a2a40', 1)}>
        <boxGeometry args={[0.6, h, 4]} />
      </mesh>
      {/* secret room */}
      <Block position={[(SECRET_ROOM.x0 + SECRET_ROOM.x1) / 2, h / 2, SECRET_ROOM.z0]} size={[6, h, 0.6]} material={wall} />
      <Block position={[(SECRET_ROOM.x0 + SECRET_ROOM.x1) / 2, h / 2, SECRET_ROOM.z1]} size={[6, h, 0.6]} material={wall} />
      <Block position={[SECRET_ROOM.x1, h / 2, (SECRET_ROOM.z0 + SECRET_ROOM.z1) / 2]} size={[0.6, h, 8]} material={wall} />
      {/* broken server racks */}
      {[[11, -34, 0.1], [14, -34, -0.3], [21, -34, 0], [11, -44, 0.2], [22, -44, 0], [16, -40, 0.6]].map(([x, z, r], i) => (
        <group key={i} position={[x, 1.3, z]} rotation={[0, 0, r]}>
          <Block position={[0, 0, 0]} size={[1.6, 2.6, 1.2]} color="#100c16" />
          <mesh position={[0, 0.3, 0.61]} material={neonMaterial(i % 2 ? '#ff2040' : '#3dff8b', 0.9)}>
            <planeGeometry args={[1.2, 0.08]} />
          </mesh>
        </group>
      ))}
      <NeonText position={[(D.x0 + D.x1) / 2, h + 0.8, D.z1 + 0.4]} fontSize={0.6} color="#ff2040" intensity={1.6}>
        CONSORTIUM DATA CENTER · DECOMMISSIONED
      </NeonText>
      <pointLight position={[17, 3.5, -38]} color="#ff2040" intensity={25} distance={14} />
      <pointLight position={[29, 3, -40]} color="#c8c8ff" intensity={20} distance={9} />
      <ItemPickup item="ghost-byte" position={GHOST_BYTE} color="#c8c8ff">
        <mesh material={neonMaterial('#c8c8ff', 2)}>
          <torusGeometry args={[0.3, 0.08, 8, 20]} />
        </mesh>
      </ItemPickup>
    </group>
  )
}

/** Toppled server tower: debris steps up to its top. */
function ServerPile() {
  const steps: [Vec3, Vec3, number][] = [
    [[20, 0.6, 10], [3, 1.2, 3], 0.1],
    [[22, 1.8, 7], [3, 1.2, 3], -0.1],
    [[24, 3.0, 4], [3, 1.2, 3], 0.05],
    [[22.5, 4.2, 1], [3, 1.2, 3], 0],
    [[23, 5.5, -2], [3.4, 1.2, 3.4], 0],
  ]
  return (
    <group>
      {steps.map(([p, s, r], i) => (
        <Block key={i} position={[p[0], p[1] - 0.6 + s[1] / 2, p[2]]} rotation={[0, r, 0]} size={s} color="#1e1824" edge={neonMaterial('#ff2040', 1)} />
      ))}
      <Block position={[23, 6.8, -4]} size={[3, 0.4, 3]} color="#1e1824" edge={neonMaterial('#3dff8b', 1.6)} />
      <mesh position={[28, 6, -10]} rotation={[0.2, 0.3, -1.1]} material={surfaceMaterial('#1a1420', 0.6, 0.4)}>
        <boxGeometry args={[3, 16, 3]} />
      </mesh>
    </group>
  )
}

export default function WastelandWorld() {
  const quality = useGame((s) => s.settings.quality)
  const glitches = useRef<Group>(null)
  useEffect(() => {
    playerState.checkpoint = null
  }, [])
  useFrame((s) => {
    if (glitches.current) glitches.current.children.forEach((c, i) => (c.visible = Math.sin(s.clock.elapsedTime * (3 + i) + i) > 0.2))
  })
  return (
    <group>
      <SkyDome top="#020002" horizon="#3a0610" bottom="#020002" stars={false} />
      <Ground />
      {POOLS.map((p, i) => (
        <Pool key={i} {...p} />
      ))}
      <Storm />
      <CollapsingBridge />
      <DataCenter />
      <ServerPile />
      <StaticScreen pos={[-22, 6, 6]} rot={[0, 0.6, 0.15]} size={[10, 6]} />
      <StaticScreen pos={[-20, 3, -40]} rot={[-0.4, 0.3, 0]} size={[8, 4.5]} />
      <StaticScreen pos={[2, 8, -50]} rot={[0, 0, -0.08]} size={[14, 7]} />
      <group ref={glitches}>
        {[[-26, 3, 18], [26, 4, 20], [-28, 5, -48], [0, 10, -20]].map((p, i) => (
          <mesh key={i} position={p as Vec3} rotation={[i, i * 2, 0]} material={neonMaterial(i % 2 ? '#3dff8b' : '#ff2040', 1.4)}>
            <boxGeometry args={[2 + i, 0.3, 0.3]} />
          </mesh>
        ))}
      </group>
      <Beacon position={[4, 0, 18]} color="#3dff8b" />
      <Beacon position={[-13, 0, -27]} color="#3dff8b" />
      <Beacon position={[16, 0, -26]} color="#3dff8b" />
      <Relics relics={WASTELAND_LAYOUT.relics!} color="#3dff8b" shape="shard" />
      <Coins coins={WASTELAND_LAYOUT.coins} />
      <Particles count={quality === 'low' ? 150 : 450} area={[68, 20, 90]} center={[0, 0, -13]} color="#ff2040" color2="#ffffff" size={4} rise={0.5} />
      <NeonText position={[0, 6, 26]} rotation={[0, Math.PI, 0]} fontSize={0.9} color="#ff2040">
        NULL SECTOR
      </NeonText>
      <NeonText position={[0, 5, 26]} rotation={[0, Math.PI, 0]} fontSize={0.3} color="#ffffff" mono>
        RED RINGS = LIGHTNING · RED POOLS = CORRUPTION · GREEN BEACONS = CHECKPOINTS
      </NeonText>
      <HomePortal position={[0, 0, 29.8]} spawnId="fromWasteland" />
    </group>
  )
}
