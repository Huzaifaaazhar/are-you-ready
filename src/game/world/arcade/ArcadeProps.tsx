import { useMemo, useRef, type ReactNode } from 'react'
import { useFrame } from '@react-three/fiber'
import { CuboidCollider, RigidBody } from '@react-three/rapier'
import {
  AdditiveBlending, BufferAttribute, BufferGeometry, CanvasTexture, Color, Mesh, MeshStandardMaterial, NearestFilter,
  RepeatWrapping, ShaderMaterial, SRGBColorSpace,
} from 'three'
import type { Vec3 } from '../../../data/content'
import { useInteractable } from '../../systems/interaction'
import { NeonText } from '../common/NeonText'
import { neonMaterial, surfaceMaterial } from '../common/materials'

export type ScreenStyle = 0 | 1 | 2 | 3 | 4

/** Animated cabinet screens: 0 serpent, 1 lancer, 2 oracle, 3 out-of-order static, 4 jukebox EQ. */
function useScreenMaterial(style: ScreenStyle, color: string) {
  const mat = useMemo(
    () =>
      new ShaderMaterial({
        toneMapped: false,
        uniforms: { uTime: { value: 0 }, uStyle: { value: style }, uColor: { value: new Color(color) } },
        vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
        fragmentShader: /* glsl */ `
          varying vec2 vUv; uniform float uTime; uniform int uStyle; uniform vec3 uColor;
          float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); }
          void main(){
            vec2 uv = vUv; vec3 c = vec3(0.0);
            float scan = 0.85 + 0.15 * sin(uv.y * 220.0);
            if (uStyle == 0) {
              vec2 g = floor(uv * vec2(16.0, 12.0));
              float t = floor(uTime * 8.0);
              float head = mod(t, 16.0);
              float body = step(abs(g.y - 6.0), 0.0) * step(g.x, head) * step(head - 5.0, g.x);
              float food = step(length(g - vec2(mod(t * 3.0, 16.0), mod(t * 1.7, 12.0))), 0.1);
              c = uColor * (body * 2.0 + food * 3.0) + vec3(0.0, 0.05, 0.02);
            } else if (uStyle == 1) {
              vec2 s = uv * vec2(30.0, 40.0); s.y += uTime * 10.0;
              float star = step(0.97, hash(floor(s)));
              vec2 ship = vec2(0.5 + sin(uTime) * 0.3, 0.15);
              float sh = step(abs(uv.x - ship.x), 0.04) * step(abs(uv.y - ship.y), 0.03);
              float inv = step(0.5, fract(uv.x * 6.0 + sin(uTime) * 0.2)) * step(0.75, uv.y) * step(uv.y, 0.82) * step(0.5, fract(uTime*2.0 + uv.x * 3.0));
              c = vec3(star) * 0.8 + uColor * (sh * 3.0 + inv * 1.5);
            } else if (uStyle == 2) {
              float r = length(uv - 0.5);
              c = uColor * (smoothstep(0.32, 0.3, r) - smoothstep(0.12, 0.1, r)) * (1.5 + sin(uTime * 2.0)) + uColor * smoothstep(0.08, 0.0, r) * 3.0;
              c += uColor * 0.15 * sin(r * 60.0 - uTime * 4.0);
            } else if (uStyle == 3) {
              float n = hash(floor(uv * vec2(80.0, 60.0)) + floor(uTime * 15.0));
              c = vec3(n) * 0.35 * step(0.5, fract(uTime * 0.7)) + vec3(0.25, 0.0, 0.0) * step(0.4, uv.y) * step(uv.y, 0.6);
            } else {
              float bars = floor(uv.x * 10.0);
              float h = 0.3 + 0.6 * abs(sin(uTime * (2.0 + bars * 0.3) + bars));
              c = mix(uColor, vec3(1.0, 0.9, 0.3), uv.y) * step(uv.y, h) * step(0.15, fract(uv.x * 10.0)) * 2.0;
            }
            gl_FragColor = vec4(c * scan, 1.0);
          }`,
      }),
    [style, color],
  )
  useFrame((s) => {
    mat.uniforms.uTime.value = s.clock.elapsedTime
  })
  return mat
}

interface CabinetProps {
  id: string
  position: Vec3
  rotationY?: number
  title: string
  color: string
  style: ScreenStyle
  prompt: string
  onInteract: () => void
  /** Use a separate collider (e.g. when the parent animates it). */
  noCollider?: boolean
  children?: ReactNode
}

/** An arcade cabinet with an animated attract-mode screen and marquee. */
export function Cabinet({ id, position, rotationY = 0, title, color, style, prompt, onInteract, noCollider, children }: CabinetProps) {
  const screen = useScreenMaterial(style, color)
  const fx = Math.sin(rotationY) * 1.3
  const fz = Math.cos(rotationY) * 1.3
  useInteractable({ id, position: [position[0] + fx, position[1] + 1, position[2] + fz], radius: 1.9, label: prompt, onInteract })
  const body = surfaceMaterial('#15102a', 0.45, 0.4)
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {!noCollider && (
        <RigidBody type="fixed" colliders={false}>
          <CuboidCollider args={[0.7, 1.2, 0.5]} position={[0, 1.2, 0]} />
        </RigidBody>
      )}
      <mesh position={[0, 1.1, 0]} material={body}>
        <boxGeometry args={[1.4, 2.2, 1]} />
      </mesh>
      {[-0.71, 0.71].map((x) => (
        <mesh key={x} position={[x, 1.2, 0.5]} material={neonMaterial(color, 2.2)}>
          <boxGeometry args={[0.04, 2.3, 0.04]} />
        </mesh>
      ))}
      {[-0.705, 0.705].map((x) => (
        <mesh key={`s${x}`} position={[x, 1.1, 0]} rotation={[0, x > 0 ? Math.PI / 2 : -Math.PI / 2, 0]} material={neonMaterial(color, 0.35)}>
          <planeGeometry args={[0.9, 2]} />
        </mesh>
      ))}
      <mesh position={[0, 1.65, 0.46]} rotation={[-0.18, 0, 0]} material={screen}>
        <planeGeometry args={[1.05, 0.8]} />
      </mesh>
      <mesh position={[0, 1.05, 0.62]} rotation={[-0.9, 0, 0]} material={body}>
        <boxGeometry args={[1.35, 0.42, 0.12]} />
      </mesh>
      {[[-0.3, '#ff4d4d'], [0.15, '#3dff8b'], [0.35, '#ffe14d']].map(([x, c]) => (
        <mesh key={x as number} position={[x as number, 1.13, 0.7]} material={neonMaterial(c as string, 2)}>
          <sphereGeometry args={[0.05, 8, 6]} />
        </mesh>
      ))}
      <mesh position={[0, 2.35, 0.28]} material={neonMaterial(color, 0.6)}>
        <boxGeometry args={[1.4, 0.4, 0.5]} />
      </mesh>
      <NeonText position={[0, 2.35, 0.54]} fontSize={0.15} maxWidth={1.35} textAlign="center" color={color} intensity={3}>
        {title}
      </NeonText>
      {children}
    </group>
  )
}

/** Neon sign that occasionally flickers. */
export function NeonSign({ position, rotationY = 0, text, color, size = 1, flicker = false, mono }: { position: Vec3; rotationY?: number; text: string; color: string; size?: number; flicker?: boolean; mono?: boolean }) {
  const ref = useRef<Mesh>(null)
  const seed = useMemo(() => Math.random() * 100, [])
  useFrame((s) => {
    if (!flicker || !ref.current) return
    const t = s.clock.elapsedTime + seed
    ref.current.visible = !(Math.sin(t * 13) > 0.97 || (Math.sin(t * 0.7) > 0.95 && Math.sin(t * 40) > 0))
  })
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <NeonText ref={ref} fontSize={size} color={color} mono={mono}>
        {text}
      </NeonText>
    </group>
  )
}

/** Retro arcade carpet: procedural canvas texture with neon shapes. */
export function useCarpetTexture() {
  return useMemo(() => {
    const c = document.createElement('canvas')
    c.width = c.height = 256
    const g = c.getContext('2d')!
    g.fillStyle = '#0c0418'
    g.fillRect(0, 0, 256, 256)
    const cols = ['#ff2bd6', '#00f0ff', '#ffe14d', '#3dff8b', '#9d4dff']
    let seed = 3
    const r = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
    g.lineWidth = 4
    for (let i = 0; i < 46; i++) {
      g.strokeStyle = cols[i % cols.length]
      const x = r() * 256
      const y = r() * 256
      const s = 8 + r() * 14
      g.beginPath()
      const kind = i % 3
      if (kind === 0) {
        g.moveTo(x, y)
        g.lineTo(x + s, y + s * 0.4)
        g.lineTo(x + s * 0.2, y + s)
        g.closePath()
      } else if (kind === 1) {
        g.arc(x, y, s * 0.5, 0, Math.PI * 1.5)
      } else {
        g.moveTo(x, y)
        for (let k = 1; k < 5; k++) g.lineTo(x + k * s * 0.4, y + (k % 2 ? s * 0.4 : 0))
      }
      g.stroke()
    }
    const t = new CanvasTexture(c)
    t.wrapS = t.wrapT = RepeatWrapping
    t.repeat.set(5, 6)
    t.magFilter = NearestFilter
    t.colorSpace = SRGBColorSpace
    return t
  }, [])
}

export function useCarpetMaterial() {
  const tex = useCarpetTexture()
  return useMemo(() => new MeshStandardMaterial({ map: tex, roughness: 0.9, metalness: 0, emissiveMap: tex, emissive: new Color('#ffffff'), emissiveIntensity: 0.18 }), [tex])
}

/** Streaking rain over the street (GPU animated line segments). */
export function Rain({ count = 1400, area = [30, 24, 90], center = [0, 0, -5] as Vec3 }: { count?: number; area?: [number, number, number]; center?: Vec3 }) {
  const { geo, mat } = useMemo(() => {
    const g = new BufferGeometry()
    const pos = new Float32Array(count * 6)
    const off = new Float32Array(count * 2)
    for (let i = 0; i < count; i++) {
      const x = (Math.random() - 0.5) * area[0]
      const y = Math.random() * area[1]
      const z = (Math.random() - 0.5) * area[2]
      pos.set([x, y, z, x, y, z], i * 6)
      off.set([0, 0.6], i * 2)
    }
    g.setAttribute('position', new BufferAttribute(pos, 3))
    g.setAttribute('aOff', new BufferAttribute(off, 1))
    const m = new ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      uniforms: { uTime: { value: 0 }, uH: { value: area[1] } },
      vertexShader: /* glsl */ `uniform float uTime; uniform float uH; attribute float aOff; varying float vA;
        void main(){ vec3 p = position; p.y = mod(p.y - uTime * 18.0, uH) + aOff; vA = 1.0 - p.y / uH;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0); }`,
      fragmentShader: /* glsl */ `varying float vA; void main(){ gl_FragColor = vec4(0.5, 0.7, 1.0, 0.25 * (0.4 + vA)); }`,
    })
    return { geo: g, mat: m }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count])
  useFrame((s) => {
    mat.uniforms.uTime.value = s.clock.elapsedTime
  })
  return <lineSegments geometry={geo} material={mat} position={center} frustumCulled={false} />
}
