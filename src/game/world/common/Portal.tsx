import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { AdditiveBlending, Color, DoubleSide, Group, Matrix4, ShaderMaterial, Vector3 } from 'three'
import type { Vec3, WorldId } from '../../../data/content'
import { useGame } from '../../../store/useGame'
import { useInteractable } from '../../systems/interaction'
import { playerState } from '../../systems/playerState'
import { NeonText } from './NeonText'
import { neonMaterial, surfaceMaterial } from './materials'

interface Props {
  id: string
  position: Vec3
  rotationY?: number
  color?: string
  color2?: string
  label: string
  sublabel?: string
  target: WorldId
  spawnId?: string
  radius?: number
}

const tmp = new Vector3()
const inv = new Matrix4()

/** A glowing ring portal. Walk through it or press E nearby to travel. */
export function Portal({ id, position, rotationY = 0, color = '#00f0ff', color2 = '#ff2bd6', label, sublabel, target, spawnId, radius = 2.6 }: Props) {
  const group = useRef<Group>(null)
  const ring = useRef<Group>(null)
  const travel = useGame((s) => s.travel)
  const cy = radius + 0.4

  const disc = useMemo(
    () =>
      new ShaderMaterial({
        transparent: true,
        depthWrite: false,
        side: DoubleSide,
        blending: AdditiveBlending,
        uniforms: { uTime: { value: 0 }, uA: { value: new Color(color) }, uB: { value: new Color(color2) } },
        vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
        fragmentShader: /* glsl */ `
          varying vec2 vUv; uniform float uTime; uniform vec3 uA; uniform vec3 uB;
          void main(){
            vec2 p = vUv - 0.5; float r = length(p) * 2.0; float a = atan(p.y, p.x);
            float swirl = sin(a * 6.0 + r * 14.0 - uTime * 4.0) * 0.5 + 0.5;
            float rings = sin(r * 30.0 - uTime * 6.0) * 0.5 + 0.5;
            vec3 c = mix(uA, uB, swirl) * (0.6 + rings * 0.6);
            float core = smoothstep(0.5, 0.0, r);
            float alpha = smoothstep(1.0, 0.75, r) * (0.55 + 0.45 * swirl);
            gl_FragColor = vec4(c * 1.6 + core * 1.5, alpha);
          }`,
      }),
    [color, color2],
  )

  const go = () => travel(target, spawnId)
  const armedAt = useRef(0)
  useInteractable({ id, position: [position[0], position[1] + 1, position[2]], radius: 4.2, label: `Enter portal · ${label}`, onInteract: go })

  useFrame((s, dt) => {
    disc.uniforms.uTime.value = s.clock.elapsedTime
    if (ring.current) ring.current.rotation.z += dt * 0.4
    const g = group.current
    if (!g || useGame.getState().transition.active || useGame.getState().overlay || !playerState.teleport) return
    // Arm the walk-through trigger only after the world has settled (avoids stale transforms on spawn).
    if (armedAt.current === 0) armedAt.current = s.clock.elapsedTime + 0.75
    if (s.clock.elapsedTime < armedAt.current) return
    g.updateWorldMatrix(true, false)
    inv.copy(g.matrixWorld).invert()
    tmp.copy(playerState.position).applyMatrix4(inv)
    if (Math.abs(tmp.z) < 0.5 && Math.abs(tmp.x) < radius * 0.7 && tmp.y > -0.5 && tmp.y < cy + radius * 0.7) go()
  })

  const ringMat = neonMaterial(color, 3)
  const frameMat = surfaceMaterial('#1a1433', 0.4, 0.7)
  return (
    <group ref={group} position={position} rotation={[0, rotationY, 0]}>
      <group position={[0, cy, 0]}>
        <group ref={ring}>
          <mesh material={ringMat}>
            <torusGeometry args={[radius, 0.12, 12, 64]} />
          </mesh>
          {Array.from({ length: 8 }, (_, i) => {
            const a = (i / 8) * Math.PI * 2
            return (
              <mesh key={i} position={[Math.cos(a) * (radius + 0.35), Math.sin(a) * (radius + 0.35), 0]} rotation={[0, 0, a]} material={neonMaterial(color2, 2.6)}>
                <boxGeometry args={[0.5, 0.12, 0.12]} />
              </mesh>
            )
          })}
        </group>
        <mesh material={frameMat}>
          <torusGeometry args={[radius + 0.6, 0.25, 8, 48]} />
        </mesh>
        <mesh material={disc}>
          <circleGeometry args={[radius, 48]} />
        </mesh>
      </group>
      {/* base */}
      <mesh position={[0, 0.15, 0]} material={frameMat}>
        <cylinderGeometry args={[radius + 1, radius + 1.3, 0.3, 32]} />
      </mesh>
      <mesh position={[0, 0.31, 0]} rotation={[-Math.PI / 2, 0, 0]} material={ringMat}>
        <ringGeometry args={[radius + 0.85, radius + 1, 48]} />
      </mesh>
      <NeonText position={[0, cy * 2 + 0.9, 0]} fontSize={0.7} color={color}>
        {label}
      </NeonText>
      {sublabel && (
        <NeonText position={[0, cy * 2 + 0.2, 0]} fontSize={0.32} color={color2} mono>
          {sublabel}
        </NeonText>
      )}
      <pointLight position={[0, cy, 1.5]} color={color} intensity={20} distance={14} decay={2} />
    </group>
  )
}
