import { useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { BoxGeometry, Color, InstancedBufferAttribute, InstancedMesh, Object3D, ShaderMaterial } from 'three'

interface Props {
  count?: number
  inner?: number
  outer?: number
  minH?: number
  maxH?: number
  palette?: string[]
  fog?: string
  fogFar?: number
  seed?: number
}

function rng(seed: number) {
  let s = seed
  return () => {
    s = (s * 16807) % 2147483647
    return (s - 1) / 2147483646
  }
}

/**
 * Instanced procedural city: one draw call for hundreds of towers.
 * Windows, roof trims and distance fade are computed in the shader from world position.
 */
export function Skyline({ count = 240, inner = 75, outer = 200, minH = 20, maxH = 110, palette = ['#00f0ff', '#ff2bd6', '#9d4dff', '#4d7cff'], fog = '#0a0420', fogFar = 260, seed = 7 }: Props) {
  const ref = useRef<InstancedMesh>(null)
  const geo = useMemo(() => {
    const g = new BoxGeometry(1, 1, 1)
    g.translate(0, 0.5, 0)
    return g
  }, [])
  const mat = useMemo(
    () =>
      new ShaderMaterial({
        uniforms: { uTime: { value: 0 }, uFog: { value: new Color(fog) }, uFar: { value: fogFar } },
        vertexShader: /* glsl */ `
          attribute vec3 aTint; attribute float aSeed; attribute float aHeight;
          varying vec3 vWorld; varying vec3 vNormalW; varying vec3 vTint; varying float vSeed; varying float vH; varying float vLocalY;
          void main(){
            vec4 w = modelMatrix * instanceMatrix * vec4(position, 1.0);
            vWorld = w.xyz; vTint = aTint; vSeed = aSeed; vH = aHeight; vLocalY = position.y;
            vNormalW = normalize(mat3(modelMatrix * instanceMatrix) * normal);
            gl_Position = projectionMatrix * viewMatrix * w;
          }`,
        fragmentShader: /* glsl */ `
          uniform float uTime; uniform vec3 uFog; uniform float uFar;
          varying vec3 vWorld; varying vec3 vNormalW; varying vec3 vTint; varying float vSeed; varying float vH; varying float vLocalY;
          float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
          void main(){
            vec3 base = vec3(0.02, 0.012, 0.05) + vTint * 0.03;
            vec3 c = base;
            if (abs(vNormalW.y) < 0.5) {
              float u = abs(vNormalW.x) > 0.5 ? vWorld.z : vWorld.x;
              vec2 cell = floor(vec2(u / 1.8, vWorld.y / 2.4));
              vec2 f = fract(vec2(u / 1.8, vWorld.y / 2.4));
              float win = step(0.2, f.x) * step(f.x, 0.8) * step(0.25, f.y) * step(f.y, 0.75);
              float lit = step(0.62, hash(cell + vSeed * 91.0));
              float flick = 0.75 + 0.25 * sin(uTime * (0.5 + hash(cell) * 2.0) + hash(cell.yx) * 6.28);
              c += win * lit * flick * mix(vec3(1.0, 0.85, 0.6), vTint, 0.55) * 0.9;
              // occasional neon vertical trim
              c += vTint * step(0.985, fract(u * 0.05 + vSeed)) * 2.5;
              // roof band
              c += vTint * smoothstep(0.985, 1.0, vLocalY) * 3.0;
            } else {
              c = base + vTint * 0.15;
            }
            float d = length(vWorld.xz - cameraPosition.xz);
            float fogF = smoothstep(uFar * 0.25, uFar, d);
            gl_FragColor = vec4(mix(c, uFog, fogF * 0.85), 1.0);
          }`,
      }),
    [fog, fogFar],
  )

  useLayoutEffect(() => {
    const m = ref.current
    if (!m) return
    const r = rng(seed)
    const o = new Object3D()
    const tint = new Float32Array(count * 3)
    const seeds = new Float32Array(count)
    const heights = new Float32Array(count)
    const col = new Color()
    for (let i = 0; i < count; i++) {
      const a = r() * Math.PI * 2
      const d = inner + Math.pow(r(), 0.7) * (outer - inner)
      const h = minH + Math.pow(r(), 1.6) * (maxH - minH) * (1 - (d - inner) / (outer - inner) * 0.3)
      const w = 6 + r() * 10
      o.position.set(Math.cos(a) * d, 0, Math.sin(a) * d)
      o.rotation.y = r() * Math.PI
      o.scale.set(w, h, 6 + r() * 10)
      o.updateMatrix()
      m.setMatrixAt(i, o.matrix)
      col.set(palette[Math.floor(r() * palette.length)])
      tint[i * 3] = col.r
      tint[i * 3 + 1] = col.g
      tint[i * 3 + 2] = col.b
      seeds[i] = r()
      heights[i] = h
    }
    geo.setAttribute('aTint', new InstancedBufferAttribute(tint, 3))
    geo.setAttribute('aSeed', new InstancedBufferAttribute(seeds, 1))
    geo.setAttribute('aHeight', new InstancedBufferAttribute(heights, 1))
    m.instanceMatrix.needsUpdate = true
    m.computeBoundingSphere()
  }, [count, inner, outer, minH, maxH, palette, seed, geo])

  useFrame((s) => {
    mat.uniforms.uTime.value = s.clock.elapsedTime
  })

  return <instancedMesh ref={ref} args={[geo, mat, count]} frustumCulled={false} />
}
