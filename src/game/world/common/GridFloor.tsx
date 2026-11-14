import { useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Color, ShaderMaterial } from 'three'

interface Props {
  size?: number
  color?: string
  color2?: string
  fade?: number
  cell?: number
  y?: number
  scroll?: number
}

/** Infinite-looking neon grid floor rendered with a single shader (no textures). */
export function GridFloor({ size = 400, color = '#3a1cff', color2 = '#00f0ff', fade = 150, cell = 2, y = 0, scroll = 0 }: Props) {
  const mat = useMemo(
    () =>
      new ShaderMaterial({
        uniforms: {
          uColor: { value: new Color(color) },
          uColor2: { value: new Color(color2) },
          uTime: { value: 0 },
          uFade: { value: fade },
          uCell: { value: cell },
          uScroll: { value: 0 },
        },
        vertexShader: /* glsl */ `
          varying vec3 vWorld;
          void main() {
            vec4 w = modelMatrix * vec4(position, 1.0);
            vWorld = w.xyz;
            gl_Position = projectionMatrix * viewMatrix * w;
          }`,
        fragmentShader: /* glsl */ `
          varying vec3 vWorld;
          uniform vec3 uColor; uniform vec3 uColor2; uniform float uTime; uniform float uFade; uniform float uCell; uniform float uScroll;
          float grid(vec2 p, float s, float w) {
            vec2 q = p / s;
            vec2 g = abs(fract(q - 0.5) - 0.5) / (fwidth(q) * w);
            return 1.0 - min(min(g.x, g.y), 1.0);
          }
          void main() {
            vec2 p = vWorld.xz + vec2(0.0, uScroll);
            float d = length(vWorld.xz);
            float g1 = grid(p, uCell, 1.0);
            float g2 = grid(p, uCell * 5.0, 1.6);
            vec3 base = vec3(0.012, 0.006, 0.035);
            float pulse = pow(0.5 + 0.5 * sin(d * 0.12 - uTime * 1.6), 8.0);
            vec3 c = base + uColor * g1 * 0.45 + uColor2 * g2 * 1.2 + uColor2 * pulse * g1 * 0.8;
            float fade = 1.0 - smoothstep(uFade * 0.45, uFade, d);
            gl_FragColor = vec4(mix(base, c, fade), 1.0);
          }`,
      }),
    [color, color2, fade, cell],
  )
  useFrame((s, dt) => {
    mat.uniforms.uTime.value = s.clock.elapsedTime
    mat.uniforms.uScroll.value += dt * scroll
  })
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, y, 0]} material={mat}>
      <planeGeometry args={[size, size]} />
    </mesh>
  )
}
