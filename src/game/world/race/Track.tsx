import { useLayoutEffect, useMemo, useRef } from 'react'
import { CuboidCollider, RigidBody } from '@react-three/rapier'
import { BoxGeometry, Color, Euler, InstancedBufferAttribute, InstancedMesh, Object3D, Quaternion, ShaderMaterial, type Material } from 'three'
import { neonMaterial, surfaceMaterial } from '../common/materials'
import { NeonText } from '../common/NeonText'
import { PATHS, PLAZAS, type Plaza } from './layout'
import { buildSegments, type Segment } from './track'

const WALL_H = 2.2
const o = new Object3D()
o.rotation.order = 'YXZ'
const q = new Quaternion()
const eYXZ = new Euler(0, 0, 0, 'YXZ')
const eXYZ = new Euler()

function toXYZ(yaw: number, pitch: number): [number, number, number] {
  q.setFromEuler(eYXZ.set(pitch, yaw, 0))
  eXYZ.setFromQuaternion(q, 'XYZ')
  return [eXYZ.x, eXYZ.y, eXYZ.z]
}

interface Built {
  road: { seg: Segment; color: string }[]
  walls: { pos: [number, number, number]; yaw: number; pitch: number; length: number; color: string; tunnel: boolean }[]
}

function useTrack(): Built {
  return useMemo(() => {
    const road: Built['road'] = []
    const walls: Built['walls'] = []
    for (const path of PATHS) {
      for (const seg of buildSegments(path)) {
        road.push({ seg, color: path.color })
        const rx = Math.cos(seg.yaw)
        const rz = -Math.sin(seg.yaw)
        for (const side of [-1, 1]) {
          const off = side * (seg.width / 2 + 0.3)
          walls.push({ pos: [seg.pos[0] + rx * off, seg.pos[1] + WALL_H / 2, seg.pos[2] + rz * off], yaw: seg.yaw, pitch: seg.pitch, length: seg.length, color: path.color, tunnel: !!path.tunnel })
        }
      }
    }
    return { road, walls }
  }, [])
}

const roadMat = new ShaderMaterial({
  vertexShader: /* glsl */ `
    attribute vec3 aColor; varying vec2 vUv; varying vec3 vN; varying vec3 vC; varying vec3 vW;
    void main(){ vUv = uv; vC = aColor; vN = normalize(mat3(modelMatrix * instanceMatrix) * normal);
      vec4 w = modelMatrix * instanceMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
  fragmentShader: /* glsl */ `
    varying vec2 vUv; varying vec3 vN; varying vec3 vC; varying vec3 vW;
    void main(){
      vec3 c = vec3(0.025, 0.02, 0.05);
      if (vN.y > 0.5) {
        float edge = step(vUv.x, 0.025) + step(0.975, vUv.x);
        float lane = (1.0 - step(0.006, abs(vUv.x - 0.5))) * step(0.5, fract(vUv.y * 1.5));
        float lanes = (1.0 - step(0.004, abs(vUv.x - 0.25))) + (1.0 - step(0.004, abs(vUv.x - 0.75)));
        c += vC * edge * 2.2 + vec3(0.9) * lane + vC * lanes * 0.25;
        float grain = fract(sin(dot(floor(vW.xz * 2.0), vec2(12.9, 78.2))) * 43758.5);
        c += grain * 0.015;
      } else {
        c += vC * 0.08;
      }
      gl_FragColor = vec4(c, 1.0);
    }`,
})

function InstancedBoxes({ items, material, size }: { items: { pos: [number, number, number]; yaw: number; pitch: number; scale: [number, number, number]; color: string }[]; material: Material; size?: [number, number, number] }) {
  const ref = useRef<InstancedMesh>(null)
  const geo = useMemo(() => new BoxGeometry(...(size ?? [1, 1, 1])), [size])
  useLayoutEffect(() => {
    const m = ref.current
    if (!m) return
    const col = new Float32Array(items.length * 3)
    const c = new Color()
    items.forEach((it, i) => {
      o.position.set(...it.pos)
      o.rotation.set(it.pitch, it.yaw, 0)
      o.scale.set(...it.scale)
      o.updateMatrix()
      m.setMatrixAt(i, o.matrix)
      c.set(it.color)
      col.set([c.r, c.g, c.b], i * 3)
    })
    geo.setAttribute('aColor', new InstancedBufferAttribute(col, 3))
    m.instanceMatrix.needsUpdate = true
    m.computeBoundingSphere()
  }, [items, geo])
  return <instancedMesh ref={ref} args={[geo, material, items.length]} frustumCulled={false} />
}

function PlazaBlock({ p }: { p: Plaza }) {
  const w = p.maxX - p.minX
  const d = p.maxZ - p.minZ
  const cx = (p.minX + p.maxX) / 2
  const cz = (p.minZ + p.maxZ) / 2
  // Build wall pieces around the perimeter, skipping openings.
  const pieces: { pos: [number, number, number]; size: [number, number, number] }[] = []
  const sides: { side: 'n' | 's' | 'e' | 'w'; from: number; to: number; fixed: number; alongX: boolean }[] = [
    { side: 'n', from: p.minX, to: p.maxX, fixed: p.maxZ, alongX: true },
    { side: 's', from: p.minX, to: p.maxX, fixed: p.minZ, alongX: true },
    { side: 'e', from: p.minZ, to: p.maxZ, fixed: p.maxX, alongX: false },
    { side: 'w', from: p.minZ, to: p.maxZ, fixed: p.minX, alongX: false },
  ]
  for (const sd of sides) {
    const gaps = p.openings.filter((o) => o.side === sd.side).sort((a, b) => a.from - b.from)
    let cur = sd.from
    for (const g of [...gaps, { from: sd.to, to: sd.to }]) {
      if (g.from - cur > 0.5) {
        const mid = (cur + g.from) / 2
        const len = g.from - cur
        pieces.push(sd.alongX ? { pos: [mid, WALL_H / 2, sd.fixed], size: [len, WALL_H, 0.6] } : { pos: [sd.fixed, WALL_H / 2, mid], size: [0.6, WALL_H, len] })
      }
      cur = g.to
    }
  }
  const gridMat = useMemo(
    () =>
      new ShaderMaterial({
        uniforms: { uC: { value: new Color('#7a2bff') } },
        vertexShader: `varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
        fragmentShader: `varying vec3 vW; uniform vec3 uC; void main(){ vec2 g = abs(fract(vW.xz / 4.0 - 0.5) - 0.5) / fwidth(vW.xz / 4.0); float l = 1.0 - min(min(g.x, g.y), 1.0); gl_FragColor = vec4(vec3(0.02,0.015,0.045) + uC * l * 0.7, 1.0); }`,
      }),
    [],
  )
  return (
    <>
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[w / 2, 0.3, d / 2]} position={[cx, -0.3, cz]} friction={1} />
        {pieces.map((pc, i) => (
          <CuboidCollider key={i} args={[pc.size[0] / 2, pc.size[1] / 2, pc.size[2] / 2]} position={pc.pos} />
        ))}
      </RigidBody>
      <mesh position={[cx, 0.001, cz]} rotation={[-Math.PI / 2, 0, 0]} material={gridMat}>
        <planeGeometry args={[w, d]} />
      </mesh>
      <mesh position={[cx, -0.31, cz]} material={surfaceMaterial('#0b0816', 0.6, 0.3)}>
        <boxGeometry args={[w, 0.6, d]} />
      </mesh>
      {pieces.map((pc, i) => (
        <group key={i} position={pc.pos}>
          <mesh material={surfaceMaterial('#15102a', 0.5, 0.5)}>
            <boxGeometry args={pc.size} />
          </mesh>
          <mesh position={[0, WALL_H / 2 + 0.03, 0]} material={neonMaterial('#9d4dff', 2.4)}>
            <boxGeometry args={[pc.size[0] + 0.02, 0.06, pc.size[2] + 0.02]} />
          </mesh>
        </group>
      ))}
    </>
  )
}

/** All roads, walls, tunnels and plazas of Velocity City with matching static colliders. */
export function Track() {
  const { road, walls } = useTrack()
  const roadItems = useMemo(() => road.map(({ seg, color }) => ({ pos: [seg.pos[0], seg.pos[1] - 0.3, seg.pos[2]] as [number, number, number], yaw: seg.yaw, pitch: seg.pitch, scale: [seg.width, 0.6, seg.length] as [number, number, number], color })), [road])
  const wallItems = useMemo(() => walls.map((w) => ({ pos: w.pos, yaw: w.yaw, pitch: w.pitch, scale: [0.6, WALL_H, w.length] as [number, number, number], color: w.color })), [walls])
  const stripItems = useMemo(() => walls.map((w) => ({ pos: [w.pos[0], w.pos[1] + WALL_H / 2 + 0.04, w.pos[2]] as [number, number, number], yaw: w.yaw, pitch: w.pitch, scale: [0.64, 0.08, w.length] as [number, number, number], color: w.color })), [walls])
  const ceilingItems = useMemo(
    () => walls.filter((w, i) => w.tunnel && i % 2 === 0).map((w) => ({ pos: [w.pos[0], w.pos[1] + 5, w.pos[2]] as [number, number, number], yaw: w.yaw, pitch: w.pitch, scale: [0.6, 10, w.length] as [number, number, number], color: w.color })),
    [walls],
  )
  const wallMat = useMemo(() => surfaceMaterial('#1a1330', 0.45, 0.5), [])
  const stripMat = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: `attribute vec3 aColor; varying vec3 vC; void main(){ vC = aColor; gl_Position = projectionMatrix * viewMatrix * modelMatrix * instanceMatrix * vec4(position,1.0); }`,
        fragmentShader: `varying vec3 vC; void main(){ gl_FragColor = vec4(vC * 2.4, 1.0); }`,
        toneMapped: false,
      }),
    [],
  )
  const tunnelWallMat = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: `attribute vec3 aColor; varying vec3 vC; varying vec2 vUv; void main(){ vC = aColor; vUv = uv; gl_Position = projectionMatrix * viewMatrix * modelMatrix * instanceMatrix * vec4(position,1.0); }`,
        fragmentShader: `varying vec3 vC; varying vec2 vUv; void main(){ float band = step(0.92, fract(vUv.y * 3.0)); gl_FragColor = vec4(vec3(0.03,0.02,0.06) + vC * band * 1.5, 1.0); }`,
      }),
    [],
  )
  return (
    <>
      <RigidBody type="fixed" colliders={false} friction={1}>
        {road.map(({ seg }, i) => (
          <CuboidCollider key={`r${i}`} args={[seg.width / 2, 0.3, seg.length / 2]} position={[seg.pos[0], seg.pos[1] - 0.3, seg.pos[2]]} rotation={toXYZ(seg.yaw, seg.pitch)} friction={1} />
        ))}
        {walls.map((w, i) => (
          <CuboidCollider key={`w${i}`} args={[0.3, WALL_H / 2, w.length / 2]} position={w.pos} rotation={toXYZ(w.yaw, w.pitch)} friction={0.1} />
        ))}
      </RigidBody>
      <InstancedBoxes items={roadItems} material={roadMat} />
      <InstancedBoxes items={wallItems} material={wallMat} />
      <InstancedBoxes items={stripItems} material={stripMat} />
      {ceilingItems.length > 0 && <InstancedBoxes items={ceilingItems} material={tunnelWallMat} />}
      {PLAZAS.map((p) => (
        <PlazaBlock key={p.id} p={p} />
      ))}
      <NeonText position={[0, 9, -34.5]} fontSize={1.2} color="#9d4dff">
        SERVICE TUNNEL · NO RACERS
      </NeonText>
    </>
  )
}
