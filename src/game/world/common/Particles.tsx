import { useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { AdditiveBlending, BufferAttribute, BufferGeometry, Color, ShaderMaterial } from 'three'

interface Props {
  count?: number
  area?: [number, number, number]
  center?: [number, number, number]
  color?: string
  color2?: string
  size?: number
  rise?: number
}

/** GPU-animated drifting data motes. Positions are animated entirely in the vertex shader. */
export function Particles({ count = 800, area = [120, 30, 120], center = [0, 0, 0], color = '#00f0ff', color2 = '#ff2bd6', size = 6, rise = 0.6 }: Props) {
  const { geo, mat } = useMemo(() => {
    const g = new BufferGeometry()
    const pos = new Float32Array(count * 3)
    const seed = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * area[0]
      pos[i * 3 + 1] = Math.random() * area[1]
      pos[i * 3 + 2] = (Math.random() - 0.5) * area[2]
      seed[i] = Math.random()
    }
    g.setAttribute('position', new BufferAttribute(pos, 3))
    g.setAttribute('seed', new BufferAttribute(seed, 1))
    const m = new ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      uniforms: { uTime: { value: 0 }, uH: { value: area[1] }, uSize: { value: size }, uRise: { value: rise }, uA: { value: new Color(color) }, uB: { value: new Color(color2) } },
      vertexShader: /* glsl */ `
        attribute float seed; uniform float uTime; uniform float uH; uniform float uSize; uniform float uRise; varying float vSeed; varying float vFade;
        void main(){
          vec3 p = position;
          p.y = mod(p.y + uTime * uRise * (0.5 + seed), uH);
          p.x += sin(uTime * 0.3 + seed * 20.0) * 1.5;
          vSeed = seed;
          vFade = smoothstep(0.0, 0.15, p.y / uH) * (1.0 - smoothstep(0.8, 1.0, p.y / uH));
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_PointSize = uSize * (0.4 + seed) * (60.0 / -mv.z);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */ `
        uniform vec3 uA; uniform vec3 uB; varying float vSeed; varying float vFade;
        void main(){
          vec2 c = gl_PointCoord - 0.5;
          float sq = step(max(abs(c.x), abs(c.y)), 0.35);
          float d = 1.0 - smoothstep(0.0, 0.5, length(c));
          float a = mix(d, sq, step(0.7, vSeed)) * vFade;
          gl_FragColor = vec4(mix(uA, uB, step(0.5, vSeed)) * 1.8, a * 0.8);
        }`,
    })
    return { geo: g, mat: m }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count])
  useFrame((s) => {
    mat.uniforms.uTime.value = s.clock.elapsedTime
  })
  return <points geometry={geo} material={mat} position={center} frustumCulled={false} />
}
