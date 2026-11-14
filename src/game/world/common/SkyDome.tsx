import { useMemo } from 'react'
import { BackSide, Color, ShaderMaterial } from 'three'
import { Stars } from '@react-three/drei'

interface Props {
  top?: string
  horizon?: string
  bottom?: string
  stars?: boolean
  radius?: number
}

/** Gradient sky sphere with a glowing horizon band. */
export function SkyDome({ top = '#05010f', horizon = '#3b0f6b', bottom = '#05010f', stars = true, radius = 400 }: Props) {
  const mat = useMemo(
    () =>
      new ShaderMaterial({
        side: BackSide,
        depthWrite: false,
        fog: false,
        uniforms: { uTop: { value: new Color(top) }, uHorizon: { value: new Color(horizon) }, uBottom: { value: new Color(bottom) } },
        vertexShader: /* glsl */ `
          varying vec3 vDir;
          void main() { vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
        fragmentShader: /* glsl */ `
          varying vec3 vDir; uniform vec3 uTop; uniform vec3 uHorizon; uniform vec3 uBottom;
          void main() {
            float h = vDir.y;
            vec3 c = h > 0.0 ? mix(uHorizon, uTop, pow(smoothstep(0.0, 0.6, h), 0.6)) : mix(uHorizon, uBottom, smoothstep(0.0, 0.15, -h));
            c += uHorizon * 0.6 * exp(-abs(h) * 18.0);
            gl_FragColor = vec4(c, 1.0);
          }`,
      }),
    [top, horizon, bottom],
  )
  return (
    <>
      <mesh material={mat} renderOrder={-1}>
        <sphereGeometry args={[radius, 32, 16]} />
      </mesh>
      {stars && <Stars radius={radius * 0.7} depth={60} count={2500} factor={5} saturation={0.6} fade speed={0.6} />}
    </>
  )
}
